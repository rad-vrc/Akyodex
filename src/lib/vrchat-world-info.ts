import { decodeHTMLEntities, stripHTMLTags } from '@/lib/html-utils';

export interface VRChatWorldInfo {
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

export function extractMetaContent(html: string, names: string[]): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const contentMatch = tag.match(/\bcontent=(["'])(.*?)\1/i);
    if (!contentMatch?.[2]) {
      continue;
    }

    const matchesName = names.some((name) =>
      new RegExp(`\\b(?:name|property)=(["'])${escapeRegExp(name)}\\1`, 'i').test(tag)
    );

    if (matchesName) {
      return contentMatch[2];
    }
  }

  return '';
}

export function parseVRChatWorldInfoHtml(html: string, wrld: string): VRChatWorldInfo | null {
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
    return null;
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

  return {
    worldName: sanitize(worldName),
    creatorName: sanitize(creatorName),
    description: sanitize(description),
    fullTitle: sanitize(fullTitle),
    wrld,
  };
}
