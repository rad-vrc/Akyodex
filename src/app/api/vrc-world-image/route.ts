/**
 * VRChat World Image API
 * VRChat のワールドページから OGP 画像を取得
 */

import { connection } from 'next/server';
import { jsonError } from '@/lib/api-helpers';
import { fetchVRChatWorldPage } from '@/lib/vrchat-utils';

export const runtime = 'edge';

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

function extractMetaContent(html: string, name: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const contentMatch = tag.match(/\bcontent=["']([^"']+)["']/i);
    if (!contentMatch?.[1]) {
      continue;
    }

    if (new RegExp(`\\b(?:name|property)=["']${name.replace(':', '\\:')}["']`, 'i').test(tag)) {
      return contentMatch[1];
    }
  }

  return '';
}

function getErrorResponse(error: unknown, fallbackMessage: string): Response {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (error instanceof Error) {
    const statusMatch = error.message.match(/returned (\d{3})/);
    if (statusMatch) {
      return jsonError(error.message, Number.parseInt(statusMatch[1], 10));
    }

    if (/timeout/i.test(error.message)) {
      return jsonError(error.message, 504);
    }
  }

  return jsonError(message, 500);
}

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const wrld = searchParams.get('wrld');

  if (!wrld) {
    return jsonError('wrld parameter is required', 400);
  }

  const wrldMatch = wrld.match(/^wrld_[A-Za-z0-9-]{1,50}$/);
  if (!wrldMatch) {
    return jsonError('Invalid wrld format', 400);
  }

  const cleanWrld = wrldMatch[0];

  try {
    const html = await fetchVRChatWorldPage(cleanWrld);
    let imageUrl = '';

    const ogImage = extractMetaContent(html, 'og:image');
    if (ogImage) {
      const candidate = ogImage.startsWith('/') ? `https://vrchat.com${ogImage}` : ogImage;
      if (isAllowedImageUrl(candidate)) {
        imageUrl = candidate;
      }
    }

    if (!isAllowedImageUrl(imageUrl)) {
      return jsonError('Valid image not found', 404);
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
        return jsonError(`Image fetch returned ${imageResponse.status}`, imageResponse.status);
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
        return jsonError('Image fetch timeout (30 seconds)', 504);
      }
      throw imageFetchError;
    }
  } catch (error) {
    console.error('[vrc-world-image] Error:', error);
    return getErrorResponse(error, 'Failed to fetch VRChat world image');
  }
}
