/**
 * VRChat Utilities
 * Helper functions for VRChat avatar operations
 */

/**
 * Fetch VRChat avatar page with security validation and timeout
 * @param avtr - The VRChat avatar ID (e.g., avtr_xxx)
 * @returns The HTML content of the avatar page
 * @throws Error if the request fails or times out
 */
export async function fetchVRChatPage(avtr: string): Promise<string> {
  // Security: Explicitly construct VRChat URL to prevent SSRF
  // Only allow vrchat.com domain
  const vrchatPageUrl = `https://vrchat.com/home/avatar/${avtr}`;
  
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
 * Extract VRChat avatar ID (avtr_xxx) from avatar URL
 * @param avatarUrl - The VRChat avatar URL (e.g., https://vrchat.com/home/avatar/avtr_xxx)
 * @returns The avatar ID (e.g., avtr_xxx) or null if not found
 */
export function extractVRChatAvatarId(avatarUrl: string | undefined): string | null {
  if (!avatarUrl) {
    return null;
  }

  // Match avtr_ followed by alphanumeric characters and hyphens
  const match = avatarUrl.match(/avtr_[A-Za-z0-9-]+/);
  return match ? match[0] : null;
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
  avatarUrl: string | undefined,
  width: number = 512
): string {
  const avtrId = extractVRChatAvatarId(avatarUrl);
  
  if (avtrId) {
    return `/api/avatar-image?id=${id}&avtr=${avtrId}&w=${width}`;
  }
  
  return `/api/avatar-image?id=${id}&w=${width}`;
}
