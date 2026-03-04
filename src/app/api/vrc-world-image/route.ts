/**
 * VRChat World Image API
 * VRChat のワールドページから OGP 画像を取得
 */

import { connection } from 'next/server';
import { fetchVRChatWorldPage } from '@/lib/vrchat-utils';

const ALLOWED_IMAGE_HOSTS = new Set([
  'api.vrchat.cloud',
  'files.vrchat.cloud',
  'images.vrchat.cloud',
  'vrchat.com',
]);

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const wrld = searchParams.get('wrld');

  if (!wrld) {
    return Response.json({ error: 'wrld parameter is required' }, { status: 400 });
  }

  const wrldMatch = wrld.match(/^wrld_[A-Za-z0-9-]{1,50}$/);
  if (!wrldMatch) {
    return Response.json({ error: 'Invalid wrld format' }, { status: 400 });
  }

  const cleanWrld = wrldMatch[0];

  try {
    const html = await fetchVRChatWorldPage(cleanWrld);
    let imageUrl = '';

    const ogMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (ogMatch?.[1]) {
      const candidate = ogMatch[1].startsWith('/') ? `https://vrchat.com${ogMatch[1]}` : ogMatch[1];
      if (isAllowedImageUrl(candidate)) {
        imageUrl = candidate;
      }
    }

    if (!isAllowedImageUrl(imageUrl)) {
      return Response.json({ error: 'Valid image not found' }, { status: 404 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'image/webp,image/png,image/*,*/*',
        },
        signal: controller.signal,
        next: { revalidate: 3600 },
      } as RequestInit);

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        return Response.json(
          { error: `Image fetch returned ${imageResponse.status}` },
          { status: imageResponse.status }
        );
      }

      const imageData = await imageResponse.arrayBuffer();
      return new Response(imageData, {
        status: 200,
        headers: {
          'Content-Type': imageResponse.headers.get('Content-Type') || 'image/webp',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Image-Source': 'vrchat-world-ogp',
        },
      });
    } catch (imageFetchError) {
      clearTimeout(timeoutId);
      if (imageFetchError instanceof Error && imageFetchError.name === 'AbortError') {
        return Response.json({ error: 'Image fetch timeout (30 seconds)' }, { status: 504 });
      }
      throw imageFetchError;
    }
  } catch (error) {
    console.error('[vrc-world-image] Error:', error);
    return Response.json({ error: 'Failed to fetch VRChat world image' }, { status: 500 });
  }
}
