/**
 * VRChat Avatar Info API
 * VRChatのアバターページからアバター名を取得
 */

import { decodeHTMLEntities } from '@/lib/html-utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const avtr = searchParams.get('avtr');

  if (!avtr) {
    return Response.json(
      { error: 'avtr parameter is required' },
      { status: 400 }
    );
  }

  // Validate avtr format with length limit (防止 ReDoS and DoS攻撃)
  const avtrMatch = avtr.match(/^avtr_[A-Za-z0-9-]{1,50}$/);
  if (!avtrMatch) {
    return Response.json(
      { error: 'Invalid avtr format (must be avtr_[A-Za-z0-9-]{1,50})' },
      { status: 400 }
    );
  }

  const cleanAvtr = avtrMatch[0];

  try {
    // Security: Explicitly construct VRChat URL to prevent SSRF
    // Only allow vrchat.com domain
    const vrchatPageUrl = `https://vrchat.com/home/avatar/${cleanAvtr}`;
    
    // Validate URL is actually vrchat.com (defense in depth)
    const parsedUrl = new URL(vrchatPageUrl);
    if (parsedUrl.hostname !== 'vrchat.com') {
      return Response.json(
        { error: 'Invalid domain' },
        { status: 400 }
      );
    }
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
        next: { revalidate: 21600 }, // Cache for 6 hours
      });

      clearTimeout(timeoutId);

      if (!pageResponse.ok) {
        return Response.json(
          { error: `VRChat page returned ${pageResponse.status}` },
          { status: pageResponse.status }
        );
      }

      html = await pageResponse.text();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return Response.json(
          { error: 'Request timeout (30 seconds)' },
          { status: 504 }
        );
      }
      throw fetchError;
    }

    // Extract avatar name AND creator name from OGP title or page title
    // Format: "Avatar Name by Creator Name"
    let avatarName = '';
    let creatorName = '';
    let description = '';

    // 1. Try OGP title (most reliable)
    const ogTitleMatch = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitleMatch?.[1]) {
      avatarName = ogTitleMatch[1].trim();
    }

    // 2. Try page title as fallback
    if (!avatarName) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        avatarName = titleMatch[1].replace(/\s*-\s*VRChat\s*/i, '').trim();
      }
    }

    // 3. Try h1 as last resort
    if (!avatarName) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match?.[1]) {
        avatarName = h1Match[1].trim();
      }
    }

    if (!avatarName) {
      return Response.json(
        { error: 'Could not extract avatar name from page' },
        { status: 404 }
      );
    }

    // Parse "Avatar Name by Creator Name" format
    const fullTitle = avatarName;
    const byIndex = fullTitle.indexOf(' by ');
    if (byIndex !== -1) {
      avatarName = fullTitle.substring(0, byIndex).trim();
      creatorName = fullTitle.substring(byIndex + 4).trim();
    }

    // Try to extract description from meta tags
    const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']+)["']/i);
    if (descMatch?.[1]) {
      description = descMatch[1].trim();
    }

    return Response.json({
      avatarName: decodeHTMLEntities(avatarName),
      creatorName: decodeHTMLEntities(creatorName),
      description: decodeHTMLEntities(description),
      fullTitle: decodeHTMLEntities(fullTitle),
      avtr: cleanAvtr,
    });

  } catch (error) {
    console.error('[vrc-avatar-info] Error:', error);
    return Response.json(
      { error: 'Failed to fetch VRChat avatar info' },
      { status: 500 }
    );
  }
}
