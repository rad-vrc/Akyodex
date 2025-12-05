/**
 * Generate blur data URL for image placeholders
 * 
 * This creates a tiny 10x10 pixel image as a base64-encoded
 * data URL for use as a blur placeholder while the real image loads.
 * 
 * Benefits:
 * - Faster perceived load time
 * - No layout shift (CLS improvement)
 * - Smooth image loading experience
 * 
 * For production, you can:
 * 1. Generate at build time from actual images
 * 2. Use Cloudflare Images' blur variant
 * 3. Use algorithmic patterns based on avatar ID (current implementation)
 */

/**
 * Generate a simple blur placeholder based on avatar ID
 * Uses deterministic color generation for consistent placeholders
 * 
 * @param avatarId - 4-digit avatar ID (e.g., "0001")
 * @returns Base64-encoded data URL for blur placeholder
 */
export function generateBlurDataURL(avatarId: string): string {
  // Parse ID to number (e.g., "0001" → 1, "0640" → 640)
  const parsed = parseInt(avatarId, 10);
  // Fallback to 0 if parsing fails (non-numeric input)
  const idNum = Number.isNaN(parsed) ? 0 : parsed;
  
  // Generate deterministic color from ID using golden angle for distribution
  const hue = (idNum * 137.5) % 360;
  const saturation = 70;
  const lightness = 80;
  
  // Create 10x10 SVG with gradient
  // This creates a smooth gradient that looks good as a blur effect
  const svg = `
    <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue},${saturation}%,${lightness}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${(hue + 30) % 360},${saturation}%,${lightness - 10}%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="10" height="10" fill="url(#grad)" />
    </svg>
  `.trim().replace(/\s+/g, ' ');
  
  // Encode to base64
  // Note: In browser environment, use btoa()
  // In Node.js environment (SSR), use Buffer
  if (typeof window === 'undefined') {
    // Server-side (Node.js)
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } else {
    // Client-side (browser)
    const base64 = btoa(svg);
    return `data:image/svg+xml;base64,${base64}`;
  }
}

/**
 * Alternative: Use Cloudflare Images blur variant
 * Requires pre-configured "blur" variant in Cloudflare Images dashboard
 * 
 * @param avatarId - 4-digit avatar ID (e.g., "0001")
 * @returns Cloudflare Images URL for blur variant
 */
export function getCloudflareBlurURL(avatarId: string): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
  
  if (!accountHash) {
    console.warn('[getCloudflareBlurURL] NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH not set');
    return generateBlurDataURL(avatarId);
  }
  
  // Cloudflare Images URL format: https://imagedelivery.net/{account_hash}/{image_id}/{variant}
  return `https://imagedelivery.net/${accountHash}/${avatarId}/blur`;
}

/**
 * Generate a simple solid color placeholder
 * Useful for faster generation when gradient is not needed
 * 
 * @param avatarId - 4-digit avatar ID (e.g., "0001")
 * @returns Base64-encoded data URL for solid color placeholder
 */
export function generateSolidColorDataURL(avatarId: string): string {
  const parsed = parseInt(avatarId, 10);
  // Fallback to 0 if parsing fails (non-numeric input)
  const idNum = Number.isNaN(parsed) ? 0 : parsed;
  const hue = (idNum * 137.5) % 360;
  const saturation = 70;
  const lightness = 85;
  
  const svg = `<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="hsl(${hue},${saturation}%,${lightness}%)"/></svg>`;
  
  if (typeof window === 'undefined') {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } else {
    const base64 = btoa(svg);
    return `data:image/svg+xml;base64,${base64}`;
  }
}

/**
 * For build-time placeholder generation (advanced)
 * This would require reading actual images during build
 * 
 * TODO: Implement using sharp or similar image processing library
 * 1. Load image from R2 or local filesystem
 * 2. Resize to 10x10
 * 3. Apply blur filter
 * 4. Convert to base64
 * 5. Store in static JSON file for build-time access
 * 
 * @param _imagePath - Path to source image (prefixed with _ as unused)
 * @returns Promise resolving to base64 data URL
 */
export async function generatePlaceholderFromImage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _imagePath: string
): Promise<string> {
  throw new Error('Not implemented - requires build-time image processing with sharp or similar');
}
