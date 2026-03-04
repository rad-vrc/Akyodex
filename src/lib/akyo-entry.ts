import type { AkyoData, AkyoEntryType } from '@/types/akyo';

const WORLD_CATEGORY_MARKERS = new Set(['ワールド', 'world', '월드']);
const MULTI_VALUE_SPLIT_PATTERN = /[、,]/;

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

  if (/https?:\/\/vrchat\.com\/home\/avatar\/avtr_[A-Za-z0-9-]+/i.test(trimmedUrl)) {
    return 'avatar';
  }

  if (/https?:\/\/vrchat\.com\/home\/world\/wrld_[A-Za-z0-9-]+/i.test(trimmedUrl)) {
    return 'world';
  }

  return null;
}

export function extractVRChatAvatarIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/avtr_[A-Za-z0-9-]+/);
  return match ? match[0] : null;
}

export function extractVRChatWorldIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/wrld_[A-Za-z0-9-]+/);
  return match ? match[0] : null;
}
