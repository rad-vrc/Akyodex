/**
 * Avatar Image Proxy API
 * 
 * Priority:
 * 1. R2 bucket (direct URL or binding)
 * 2. VRChat API (scrape)
 * 3. Placeholder image
 * 
 * Features:
 * - Image caching (1 hour via Cache-Control headers)
 * - Size optimization (w parameter)
 * - Fallback chain
 */

// Using Node.js runtime for now (edge runtime has fetch caching issues)
export const runtime = 'nodejs';

interface AvatarImageParams {
  avtr?: string;  // VRChat avatar ID (avtr_xxx)
  id?: string;    // Akyo ID (0001, 0002, etc. - 4 digits)
  w?: string;     // Width (default: 512)
}

/**
 * GET /api/avatar-image?avtr=avtr_xxx&w=512
 * GET /api/avatar-image?id=0001&w=512
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const avtr = searchParams.get('avtr');
  const id = searchParams.get('id');
  const widthParam = searchParams.get('w') || '512';
  const width = Math.max(32, Math.min(4096, parseInt(widthParam, 10) || 512));

  // Need either avtr or id
  if (!avtr && !id) {
    return new Response('Missing avtr or id parameter', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Strengthen input validation for security
  if (avtr) {
    // Strict validation: must start with avtr_, followed by alphanumeric and hyphens, max 50 chars
    const avtrRegex = /^avtr_[A-Za-z0-9-]{1,50}$/;
    if (!avtrRegex.test(avtr)) {
      return new Response('Invalid avtr format', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  if (id) {
    // Validate ID format: exactly 4 digits (0001-9999)
    const idRegex = /^\d{4}$/;
    if (!idRegex.test(id)) {
      return new Response('Invalid id format: must be 4 digits (e.g., 0001)', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  try {
    // Step 1: Try R2 via direct URL
    if (id) {
      const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
      const r2Url = `${r2BaseUrl}/images/${id}.webp`;
      
      try {
        // Create AbortController for 30-second timeout
        const r2Controller = new AbortController();
        const r2TimeoutId = setTimeout(() => r2Controller.abort(), 30000);

        try {
          const r2Response = await fetch(r2Url, {
            signal: r2Controller.signal,
            next: { revalidate: 3600 }, // Cache for 1 hour
          });
          
          clearTimeout(r2TimeoutId);

          if (r2Response.ok) {
            // Stream the image through
            const imageData = await r2Response.arrayBuffer();
            return new Response(imageData, {
              status: 200,
              headers: {
                'Content-Type': r2Response.headers.get('Content-Type') || 'image/webp',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                'X-Image-Source': 'r2',
              },
            });
          }
        } catch (fetchError) {
          clearTimeout(r2TimeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.warn(`[avatar-image] R2 fetch timeout for ${id}`);
          } else {
            throw fetchError;
          }
        }
      } catch (error) {
        console.warn(`[avatar-image] R2 fetch failed for ${id}:`, error);
      }
    }

    // Step 2: Try VRChat API if avtr is provided
    if (avtr) {
      // Validate avtr format
      const avtrMatch = avtr.match(/avtr_[A-Za-z0-9-]+/);
      if (!avtrMatch) {
        return new Response('Invalid avtr format', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      const cleanAvtr = avtrMatch[0];
      
      // Security: Explicitly construct VRChat URL to prevent SSRF
      // Only allow vrchat.com domain
      const vrchatPageUrl = `https://vrchat.com/home/avatar/${cleanAvtr}`;
      
      // Validate URL is actually vrchat.com (defense in depth)
      const parsedUrl = new URL(vrchatPageUrl);
      if (parsedUrl.hostname !== 'vrchat.com') {
        return new Response('Invalid domain', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      
      try {
        // Create AbortController for 30-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let html: string;
        try {
          const pageResponse = await fetch(vrchatPageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            signal: controller.signal,
            next: { revalidate: 21600 }, // Cache page for 6 hours
          });

          clearTimeout(timeoutId);

          if (!pageResponse.ok) {
            throw new Error(`VRChat page returned ${pageResponse.status}`);
          }

          html = await pageResponse.text();
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('VRChat page fetch timeout (30 seconds)');
          }
          throw fetchError;
        }

        // Extract image URL from OGP or API (validate domain during candidate selection)
        let imageUrl = '';

        // Helper: allowlist + HTTPS enforcement
        const allowed = new Set(['api.vrchat.cloud', 'files.vrchat.cloud', 'images.vrchat.cloud']);
        const isAllowedImageUrl = (url: string) => {
          try {
            const u = new URL(url);
            return u.protocol === 'https:' && allowed.has(u.hostname);
          } catch {
            return false;
          }
        };

        // 1. Try OGP image (with relative URL resolution and domain validation)
        const ogMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogMatch?.[1]) {
          const candidate = ogMatch[1].startsWith('/')
            ? `https://vrchat.com${ogMatch[1]}`
            : ogMatch[1];
          if (isAllowedImageUrl(candidate)) {
            imageUrl = candidate;
          }
        }

        // 2. Try VRChat API URL (higher quality)
        if (!imageUrl) {
          const fileMatch = html.match(/https?:\/\/api\.vrchat\.cloud\/api\/1\/file\/(file_[A-Za-z0-9-]+)\/(\d+)\/file/i);
          if (fileMatch) {
            const fileId = fileMatch[1];
            imageUrl = `https://api.vrchat.cloud/api/1/image/${fileId}/1/${width}`;
          }
        }

        // 3. Try VRChat Files URL
        if (!imageUrl) {
          const filesMatch = html.match(/https?:\/\/files\.vrchat\.cloud\/thumbnails\/(file_[A-Za-z0-9-]+)[^"'\s]+\.thumbnail-\d+\.(png|jpg|webp)/i);
          if (filesMatch) {
            const fileId = filesMatch[1];
            imageUrl = `https://api.vrchat.cloud/api/1/image/${fileId}/1/${width}`;
          }
        }

        // Final lightweight guard (defense in depth)
        if (imageUrl && !isAllowedImageUrl(imageUrl)) {
          imageUrl = '';
        }

        if (imageUrl) {
          // Proxy the image with timeout
          const imageController = new AbortController();
          const imageTimeoutId = setTimeout(() => imageController.abort(), 30000);

          try {
            const imageResponse = await fetch(imageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/png,image/*,*/*',
              },
              signal: imageController.signal,
              next: { revalidate: 3600 }, // Cache image for 1 hour
            });

            clearTimeout(imageTimeoutId);

            if (imageResponse.ok) {
              const imageData = await imageResponse.arrayBuffer();
              return new Response(imageData, {
                status: 200,
                headers: {
                  'Content-Type': imageResponse.headers.get('Content-Type') || 'image/webp',
                  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                  'X-Image-Source': 'vrchat',
                },
              });
            }
          } catch (imageFetchError) {
            clearTimeout(imageTimeoutId);
            if (imageFetchError instanceof Error && imageFetchError.name === 'AbortError') {
              console.warn(`[avatar-image] VRChat image fetch timeout for ${avtr}`);
            } else {
              throw imageFetchError;
            }
          }
        }
      } catch (error) {
        console.warn(`[avatar-image] VRChat fetch failed for ${avtr}:`, error);
      }
    }

    // Step 3: Return placeholder (need absolute URL for edge runtime)
    const url = new URL(request.url);
    const placeholderUrl = `${url.protocol}//${url.host}/images/placeholder.webp`;
    return Response.redirect(placeholderUrl, 302);

  } catch (error) {
    console.error('[avatar-image] Unexpected error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
