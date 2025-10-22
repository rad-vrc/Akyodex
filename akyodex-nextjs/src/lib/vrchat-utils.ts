/**
 * VRChat Utilities
 * Helper functions for VRChat avatar operations
 */

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
