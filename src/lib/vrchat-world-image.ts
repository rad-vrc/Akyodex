const DEFAULT_VRCHAT_IMAGE_WIDTH = 512;
const MIN_VRCHAT_IMAGE_WIDTH = 32;
const MAX_VRCHAT_IMAGE_WIDTH = 4096;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMetaContent(html: string, name: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const contentMatch = tag.match(/\bcontent=(["'])(.*?)\1/i);
    if (!contentMatch?.[2]) {
      continue;
    }

    if (new RegExp(`\\b(?:name|property)=(["'])${escapeRegExp(name)}\\1`, 'i').test(tag)) {
      return contentMatch[2];
    }
  }

  return '';
}

export function normalizeVRChatImageWidth(value: string | number | null | undefined): number {
  const parsedWidth =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsedWidth)) {
    return DEFAULT_VRCHAT_IMAGE_WIDTH;
  }

  return Math.max(MIN_VRCHAT_IMAGE_WIDTH, Math.min(MAX_VRCHAT_IMAGE_WIDTH, parsedWidth));
}

export function getSizedVRChatWorldImageUrl(imageUrl: string, width: number): string {
  const normalizedWidth = normalizeVRChatImageWidth(width);

  const apiImageMatch = imageUrl.match(
    /^https?:\/\/api\.vrchat\.cloud\/api\/1\/image\/(file_[A-Za-z0-9-]+)\/1\/\d+$/i
  );
  if (apiImageMatch?.[1]) {
    return `https://api.vrchat.cloud/api/1/image/${apiImageMatch[1]}/1/${normalizedWidth}`;
  }

  const apiFileMatch = imageUrl.match(
    /^https?:\/\/api\.vrchat\.cloud\/api\/1\/file\/(file_[A-Za-z0-9-]+)\/\d+\/file$/i
  );
  if (apiFileMatch?.[1]) {
    return `https://api.vrchat.cloud/api/1/image/${apiFileMatch[1]}/1/${normalizedWidth}`;
  }

  const filesThumbnailMatch = imageUrl.match(
    /^https?:\/\/files\.vrchat\.cloud\/thumbnails\/(file_[A-Za-z0-9-]+)[^"'\s]*$/i
  );
  if (filesThumbnailMatch?.[1]) {
    return `https://api.vrchat.cloud/api/1/image/${filesThumbnailMatch[1]}/1/${normalizedWidth}`;
  }

  return imageUrl;
}

export function getVRChatWorldImageRequestParams(requestUrl: string): {
  wrld: string | null;
  width: number;
} {
  const { searchParams } = new URL(requestUrl);
  return {
    wrld: searchParams.get('wrld'),
    width: normalizeVRChatImageWidth(searchParams.get('w')),
  };
}

export function resolveVRChatWorldImageUrlFromHtml(html: string, width: number): string {
  const ogImage = extractMetaContent(html, 'og:image');
  if (!ogImage) {
    return '';
  }

  const candidate = ogImage.startsWith('/') ? `https://vrchat.com${ogImage}` : ogImage;
  const sizedCandidate = getSizedVRChatWorldImageUrl(candidate, width);
  if (isAllowedImageUrl(sizedCandidate)) {
    return sizedCandidate;
  }

  return isAllowedImageUrl(candidate) ? candidate : '';
}
