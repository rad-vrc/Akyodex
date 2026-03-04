/**
 * VRChat World Info API
 * VRChat のワールドページからワールド名と作者名を取得
 */

import { connection } from 'next/server';
import { decodeHTMLEntities, stripHTMLTags } from '@/lib/html-utils';
import { fetchVRChatWorldPage } from '@/lib/vrchat-utils';

interface VRChatWorldInfo {
  worldName: string;
  creatorName: string;
  description: string;
  fullTitle: string;
  wrld: string;
}

function sanitize(value: string): string {
  return decodeHTMLEntities(stripHTMLTags(value));
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
    return Response.json(
      { error: 'Invalid wrld format (must be wrld_[A-Za-z0-9-]{1,50})' },
      { status: 400 }
    );
  }

  const cleanWrld = wrldMatch[0];

  try {
    const html = await fetchVRChatWorldPage(cleanWrld);

    let fullTitle = '';
    let worldName = '';
    let creatorName = '';
    let description = '';

    const ogTitleMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    if (ogTitleMatch?.[1]) {
      fullTitle = ogTitleMatch[1].replace(/\s*-\s*VRChat\s*$/i, '').trim();
    }

    if (!fullTitle) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        fullTitle = titleMatch[1].replace(/\s*-\s*VRChat\s*$/i, '').trim();
      }
    }

    if (!fullTitle) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match?.[1]) {
        fullTitle = h1Match[1].trim();
      }
    }

    if (!fullTitle) {
      return Response.json({ error: 'Could not extract world name from page' }, { status: 404 });
    }

    const byIndex = fullTitle.lastIndexOf(' by ');
    if (byIndex !== -1) {
      worldName = fullTitle.substring(0, byIndex).trim();
      creatorName = fullTitle.substring(byIndex + 4).trim();
    } else {
      worldName = fullTitle;
    }

    const descMatch = html.match(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']+)["']/i
    );
    if (descMatch?.[1]) {
      description = descMatch[1].trim();
    }

    const payload: VRChatWorldInfo = {
      worldName: sanitize(worldName),
      creatorName: sanitize(creatorName),
      description: sanitize(description),
      fullTitle: sanitize(fullTitle),
      wrld: cleanWrld,
    };

    return Response.json(payload);
  } catch (error) {
    console.error('[vrc-world-info] Error:', error);
    return Response.json({ error: 'Failed to fetch VRChat world info' }, { status: 500 });
  }
}
