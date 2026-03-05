/**
 * VRChat World Info API
 * VRChat のワールドページからワールド名と作者名を取得
 */

import { connection } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-helpers';
import { VRCHAT_WORLD_ID_PATTERN } from '@/lib/akyo-entry';
import { decodeHTMLEntities, stripHTMLTags } from '@/lib/html-utils';
import { fetchVRChatWorldPage } from '@/lib/vrchat-utils';

export const runtime = 'edge';

interface VRChatWorldInfo {
  worldName: string;
  creatorName: string;
  description: string;
  fullTitle: string;
  wrld: string;
}

function sanitize(value: string): string {
  return stripHTMLTags(decodeHTMLEntities(value)).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMetaContent(html: string, names: string[]): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const contentMatch = tag.match(/\bcontent=["']([^"']+)["']/i);
    if (!contentMatch?.[1]) {
      continue;
    }

    const matchesName = names.some((name) =>
      new RegExp(`\\b(?:name|property)=["']${escapeRegExp(name)}["']`, 'i').test(tag)
    );

    if (matchesName) {
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

  const cleanWrld = wrld.trim();
  if (!VRCHAT_WORLD_ID_PATTERN.test(cleanWrld)) {
    return jsonError('Invalid wrld format (must be wrld_[A-Za-z0-9-]{1,64})', 400);
  }

  try {
    const html = await fetchVRChatWorldPage(cleanWrld);

    let fullTitle = '';
    let worldName = '';
    let creatorName = '';
    let description = '';

    const ogTitle = extractMetaContent(html, ['og:title']);
    if (ogTitle) {
      fullTitle = ogTitle.replace(/\s*-\s*VRChat\s*$/i, '').trim();
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
      return jsonError('Could not extract world name from page', 404);
    }

    const byIndex = fullTitle.lastIndexOf(' by ');
    if (byIndex !== -1) {
      worldName = fullTitle.substring(0, byIndex).trim();
      creatorName = fullTitle.substring(byIndex + 4).trim();
    } else {
      worldName = fullTitle;
    }

    const ogDescription = extractMetaContent(html, [
      'description',
      'og:description',
      'twitter:description',
    ]);
    if (ogDescription) {
      description = ogDescription.trim();
    }

    const payload: VRChatWorldInfo = {
      worldName: sanitize(worldName),
      creatorName: sanitize(creatorName),
      description: sanitize(description),
      fullTitle: sanitize(fullTitle),
      wrld: cleanWrld,
    };

    return jsonSuccess({ ...payload });
  } catch (error) {
    console.error('[vrc-world-info] Error:', error);
    return getErrorResponse(error, 'Failed to fetch VRChat world info');
  }
}
