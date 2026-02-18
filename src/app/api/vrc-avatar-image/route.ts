/**
 * VRChat Avatar Image API
 * VRChatのアバターページから画像を取得（高解像度）
 */

import { connection } from 'next/server';
import { fetchVRChatPage } from '@/lib/vrchat-utils';

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const avtr = searchParams.get('avtr');
  const widthParam = searchParams.get('w') || '512';
  const parsedWidth = parseInt(widthParam, 10);
  const width = Number.isFinite(parsedWidth) ? Math.max(32, Math.min(4096, parsedWidth)) : 512;

  if (!avtr) {
    return Response.json(
      { error: 'avtr parameter is required' },
      { status: 400 }
    );
  }

  // Validate avtr format (strict: full match, length cap)
  const avtrMatch = avtr.match(/^avtr_[A-Za-z0-9-]{1,50}$/);
  if (!avtrMatch) {
    return Response.json(
      { error: 'Invalid avtr format' },
      { status: 400 }
    );
  }

  const cleanAvtr = avtrMatch[0];

  try {
    // Fetch VRChat page using shared utility
    const html = await fetchVRChatPage(cleanAvtr);

    // Extract image URL from OGP or API with domain validation
    let imageUrl = '';

    // Helper: allowlist + HTTPS enforcement
    const allowedDomains = new Set(['api.vrchat.cloud', 'files.vrchat.cloud', 'images.vrchat.cloud']);
    const isAllowedImageUrl = (url: string) => {
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && allowedDomains.has(u.hostname);
      } catch {
        return false;
      }
    };

    // 1. Try OGP image (with domain validation)
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

    // Final validation (defense in depth)
    if (!isAllowedImageUrl(imageUrl)) {
      // All strategies exhausted → treat as not found
      return Response.json({ error: 'Valid image not found' }, { status: 404 });
    }

    // Fetch the image with timeout
    const imageController = new AbortController();
    const imageTimeoutId = setTimeout(() => imageController.abort(), 30000);

    let imageResponse: Response;
    try {
      imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/png,image/*,*/*',
        },
        signal: imageController.signal,
        next: { revalidate: 3600 }, // Cache image for 1 hour
      } as RequestInit);

      clearTimeout(imageTimeoutId);

      if (!imageResponse.ok) {
        return Response.json(
          { error: `Image fetch returned ${imageResponse.status}` },
          { status: imageResponse.status }
        );
      }
    } catch (imageFetchError) {
      clearTimeout(imageTimeoutId);
      if (imageFetchError instanceof Error && imageFetchError.name === 'AbortError') {
        return Response.json(
          { error: 'Image fetch timeout (30 seconds)' },
          { status: 504 }
        );
      }
      throw imageFetchError;
    }

    // Return the image with proper headers
    const imageData = await imageResponse.arrayBuffer();
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/webp',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Image-Source': 'vrchat-direct',
      },
    });

  } catch (error) {
    console.error('[vrc-avatar-image] Error:', error);
    return Response.json(
      { error: 'Failed to fetch VRChat avatar image' },
      { status: 500 }
    );
  }
}
