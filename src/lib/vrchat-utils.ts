import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  detectVrcEntryTypeFromUrl,
  extractVRChatAvatarIdFromUrl,
  extractVRChatWorldIdFromUrl,
  isValidVRChatEntityId,
} from './akyo-entry';

/**
 * VRChat Utilities
 * Helper functions for VRChat entity operations
 */

/**
 * Fetch VRChat entity page with security validation and timeout
 * @param entryType - The VRChat entity type
 * @param id - The VRChat ID (e.g., avtr_xxx / wrld_xxx)
 * @returns The HTML content of the entity page
 * @throws Error if the request fails or times out
 */
export async function fetchVRChatEntityPage(
  entryType: 'avatar' | 'world',
  id: string
): Promise<string> {
  const trimmedId = id.trim();
  if (!isValidVRChatEntityId(entryType, trimmedId)) {
    throw new Error('Invalid VRChat entity ID');
  }

  // Security: construct the request from fixed host + fixed path prefixes only.
  const parsedUrl = new URL('https://vrchat.com');
  parsedUrl.pathname =
    entryType === 'avatar'
      ? `/home/avatar/${encodeURIComponent(trimmedId)}`
      : `/home/world/${encodeURIComponent(trimmedId)}`;

  if (parsedUrl.hostname !== 'vrchat.com' || parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid domain');
  }

  // Create AbortController for 30-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const pageResponse = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      next: { revalidate: 21600 }, // Cache for 6 hours
    } as RequestInit);

    clearTimeout(timeoutId);

    if (!pageResponse.ok) {
      throw new Error(`VRChat page returned ${pageResponse.status}`);
    }

    return await pageResponse.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout (30 seconds)');
    }
    throw error;
  }
}

/**
 * Fetch VRChat avatar page with security validation and timeout
 * @param avtr - The VRChat avatar ID (e.g., avtr_xxx)
 * @returns The HTML content of the avatar page
 * @throws Error if the request fails or times out
 */
export async function fetchVRChatPage(avtr: string): Promise<string> {
  return fetchVRChatEntityPage('avatar', avtr);
}

export async function fetchVRChatWorldPage(wrld: string): Promise<string> {
  return fetchVRChatEntityPage('world', wrld);
}

/**
 * Extract VRChat avatar ID (avtr_xxx) from avatar URL
 * @param avatarUrl - The VRChat avatar URL (e.g., https://vrchat.com/home/avatar/avtr_xxx)
 * @returns The avatar ID (e.g., avtr_xxx) or null if not found
 */
export function extractVRChatAvatarId(avatarUrl: string | undefined): string | null {
  return extractVRChatAvatarIdFromUrl(avatarUrl);
}

export function extractVRChatWorldId(worldUrl: string | undefined): string | null {
  return extractVRChatWorldIdFromUrl(worldUrl);
}

/**
 * Validates and opens a VRChat URL safely in a new tab.
 * Reconstructs a canonical avatar/world URL when a valid entity ID is present,
 * and otherwise falls back to a strictly validated vrchat.com URL only.
 *
 * @param e - React or Native click event to stop propagation
 * @param url - The source URL to validate
 */
export function safeOpenVRChatLink(e: ReactMouseEvent | MouseEvent, url: string | undefined): void {
  e.stopPropagation();

  if (!url) return;

  const entryType = detectVrcEntryTypeFromUrl(url);

  if (entryType === 'avatar') {
    const avtrId = extractVRChatAvatarId(url);
    if (avtrId) {
      const canonicalUrl = `https://vrchat.com/home/avatar/${avtrId}`;
      window.open(canonicalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  if (entryType === 'world') {
    const wrldId = extractVRChatWorldId(url);
    if (wrldId) {
      const canonicalUrl = `https://vrchat.com/home/world/${wrldId}`;
      window.open(canonicalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // Fallback: Strict domain validation if no canonical entity URL can be reconstructed
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && parsed.hostname === 'vrchat.com') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[vrchat-utils] Blocked non-VRChat URL:', url);
    }
  } catch {
    console.warn('[vrchat-utils] Invalid URL format:', url);
  }
}

/**
 * Build the catalog image URL using the source VRChat URL when an avatar ID is available.
 * @param id - The Akyo ID
 * @param sourceUrl - The source VRChat URL (avatar/world)
 * @param width - The desired image width (default: 512)
 * @returns The constructed image URL with avtr parameter when the source URL is an avatar
 */
export function buildAvatarImageUrl(
  id: string,
  sourceUrl: string | undefined,
  width: number = 512
): string {
  const wrldId = extractVRChatWorldId(sourceUrl);
  if (wrldId) {
    return `/api/vrc-world-image?wrld=${wrldId}&w=${width}`;
  }

  const avtrId = extractVRChatAvatarId(sourceUrl);

  if (avtrId) {
    return `/api/avatar-image?id=${id}&avtr=${avtrId}&w=${width}`;
  }

  return `/api/avatar-image?id=${id}&w=${width}`;
}
