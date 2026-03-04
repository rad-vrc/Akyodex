import type { AkyoData, AkyoEntryType } from '@/types/akyo';

export const WORLD_CATEGORY_MARKERS = new Set(['ワールド', 'world', '월드']);
const MULTI_VALUE_SPLIT_PATTERN = /[、,]/;
export const VRCHAT_AVATAR_ID_PATTERN = /^avtr_[A-Za-z0-9-]+$/;
export const VRCHAT_WORLD_ID_PATTERN = /^wrld_[A-Za-z0-9-]+$/;

function getCategoryTokens(akyo: AkyoData): string[] {
  const rawCategory = akyo.category || akyo.attribute || '';
  if (!rawCategory) {
    return [];
  }

  return rawCategory
    .split(MULTI_VALUE_SPLIT_PATTERN)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveEntryType(akyo: AkyoData): AkyoEntryType {
  if (akyo.entryType === 'avatar' || akyo.entryType === 'world') {
    return akyo.entryType;
  }

  const hasWorldCategory = getCategoryTokens(akyo).some((token) =>
    WORLD_CATEGORY_MARKERS.has(token)
  );

  return hasWorldCategory ? 'world' : 'avatar';
}

export function getDisplaySerial(akyo: AkyoData): string {
  return akyo.displaySerial?.trim() || akyo.id;
}

export function getAkyoSourceUrl(akyo: Pick<AkyoData, 'sourceUrl' | 'avatarUrl'>): string {
  return (akyo.sourceUrl || akyo.avatarUrl || '').trim();
}

export function formatDisplayId(akyo: AkyoData): string {
  const prefix = resolveEntryType(akyo) === 'world' ? 'World' : 'Avatar';
  return `#${prefix}${getDisplaySerial(akyo)}`;
}

export function hydrateAkyoDataset(entries: AkyoData[]): AkyoData[] {
  let worldFallbackSerial = 0;

  return entries.map((entry) => {
    const entryType = resolveEntryType(entry);
    const sourceUrl = getAkyoSourceUrl(entry);

    if (entryType === 'world') {
      worldFallbackSerial += 1;
    }

    return {
      ...entry,
      entryType,
      sourceUrl,
      displaySerial:
        entry.displaySerial?.trim() ||
        (entryType === 'world'
          ? String(worldFallbackSerial).padStart(4, '0')
          : entry.id),
    };
  });
}

export function detectVrcEntryTypeFromUrl(url: string): AkyoEntryType | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const normalizedHost = parsedUrl.hostname.toLowerCase();
    const normalizedPath = parsedUrl.pathname.toLowerCase();

    if (
      (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') &&
      normalizedHost === 'vrchat.com'
    ) {
      if (/^\/home\/avatar\/avtr_[a-z0-9-]{1,64}\/?$/i.test(normalizedPath)) {
        return 'avatar';
      }

      if (/^\/home\/world\/wrld_[a-z0-9-]{1,64}\/?$/i.test(normalizedPath)) {
        return 'world';
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function extractVRChatAvatarIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/\bavtr_[A-Za-z0-9-]{1,64}\b/);
  return match ? match[0] : null;
}

export function extractVRChatWorldIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/\bwrld_[A-Za-z0-9-]{1,64}\b/);
  return match ? match[0] : null;
}

export function isValidVRChatEntityId(
  entryType: AkyoEntryType,
  id: string | undefined
): id is string {
  if (!id) {
    return false;
  }

  const trimmedId = id.trim();
  const pattern =
    entryType === 'avatar' ? VRCHAT_AVATAR_ID_PATTERN : VRCHAT_WORLD_ID_PATTERN;

  return pattern.test(trimmedId);
}
