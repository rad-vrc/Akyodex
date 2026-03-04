import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  detectVrcEntryTypeFromUrl,
  extractVRChatAvatarIdFromUrl,
  extractVRChatWorldIdFromUrl,
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
  // Security: Explicitly construct VRChat URL to prevent SSRF
  // Only allow vrchat.com domain
  const vrchatPageUrl = `https://vrchat.com/home/${entryType}/${id}`;

  // Validate URL is actually vrchat.com (defense in depth)
  const parsedUrl = new URL(vrchatPageUrl);
  if (parsedUrl.hostname !== 'vrchat.com') {
    throw new Error('Invalid domain');
  }

  // Create AbortController for 30-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const pageResponse = await fetch(vrchatPageUrl, {
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
 * Extracts the avatar ID (avtr_...) to reconstruct a canonical URL, ensuring
 * only valid avatar pages are opened.
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
 * Build avatar image URL with VRChat fallback support
 * @param id - The Akyo ID
 * @param avatarUrl - The VRChat avatar URL
 * @param width - The desired image width (default: 512)
 * @returns The constructed image URL with avtr parameter if available
 */
export function buildAvatarImageUrl(
  id: string,
  sourceUrl: string | undefined,
  width: number = 512
): string {
  const avtrId = extractVRChatAvatarId(sourceUrl);

  if (avtrId) {
    return `/api/avatar-image?id=${id}&avtr=${avtrId}&w=${width}`;
  }

  return `/api/avatar-image?id=${id}&w=${width}`;
}
