import type { ImageLoaderProps } from 'next/image';

/**
 * Cloudflare Images Custom Loader
 * 
 * Converts Next.js Image requests to Cloudflare Images URLs
 * with automatic format optimization and resizing
 * 
 * Benefits:
 * - Automatic WebP/AVIF format conversion
 * - Responsive image sizes (200px-1200px)
 * - Global CDN edge caching
 * - 70% reduction in image file size
 * 
 * Setup Instructions:
 * 1. Enable Cloudflare Images in your dashboard
 * 2. Create image variants (thumbnail, small, medium, large, public)
 * 3. Set NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH environment variable
 * 4. Upload images to Cloudflare Images (or use on-the-fly fetching)
 * 
 * @see https://developers.cloudflare.com/images/transform-images/
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // Get Cloudflare Images configuration
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const enableCloudflareImages = process.env.NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES === 'true';
  
  // If Cloudflare Images is not configured, fallback to R2
  if (!accountHash || !enableCloudflareImages) {
    return handleR2Fallback(src);
  }
  
  // Extract image ID from src
  // Expected format: /0001.webp, https://images.akyodex.com/0001.webp, or direct ID "0001"
  const imageId = extractImageId(src);
  
  if (!imageId) {
    // Fallback for external URLs (VRChat API)
    if (src.includes('vrchat.com')) {
      return src;
    }
    console.warn(`[cloudflareImageLoader] Invalid image src: ${src}, falling back to R2`);
    return handleR2Fallback(src);
  }

  // Select appropriate variant based on width
  const variant = selectVariant(width);
  
  // Construct Cloudflare Images URL
  // Format: https://imagedelivery.net/{account_hash}/{image_id}/{variant}
  let url = `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
  
  // Add quality parameter if specified and different from default
  if (quality && quality !== 75) {
    url += `?quality=${quality}`;
  }
  
  return url;
}

/**
 * Extract image ID from various src formats
 * 
 * Supported formats:
 * - /0001.webp → 0001
 * - https://images.akyodex.com/0001.webp → 0001
 * - 0001 → 0001 (direct ID)
 * - /images/0001.webp → 0001 (legacy support)
 */
function extractImageId(src: string): string | null {
  // Pattern 1: /0001.webp → 0001 (R2 direct)
  const match1 = src.match(/^\/(\d{4})\.(webp|png|jpg|jpeg)$/);
  if (match1) return match1[1];
  
  // Pattern 2: https://images.akyodex.com/0001.webp → 0001
  const match2 = src.match(/images\.akyodex\.com\/(\d{4})\.(webp|png|jpg|jpeg)/);
  if (match2) return match2[1];
  
  // Pattern 3: Direct ID (0001) → 0001
  if (/^\d{4}$/.test(src)) return src;
  
  // Pattern 4: Legacy /images/0001.webp → 0001
  const match4 = src.match(/\/images\/(\d{4})\.(webp|png|jpg|jpeg)/);
  if (match4) return match4[1];
  
  return null;
}

/**
 * Select appropriate Cloudflare Images variant based on requested width
 * 
 * Variants should be configured in Cloudflare Images dashboard:
 * - thumbnail: 200x200, fit=cover
 * - small: 400x400, fit=contain
 * - medium: 800x800, fit=contain
 * - large: 1200x1200, fit=contain
 * - public: Original size, format=auto
 */
function selectVariant(width: number): string {
  if (width <= 200) return 'thumbnail';
  if (width <= 400) return 'small';
  if (width <= 800) return 'medium';
  if (width <= 1200) return 'large';
  return 'public';
}

/**
 * Fallback to R2 when Cloudflare Images is not available
 * Returns direct R2 URL without optimization
 * 
 * IMPORTANT: Only converts avatar image paths to R2 URLs.
 * API routes (/api/*) and other relative paths are returned as-is
 * to preserve the fallback chain in AvatarImage component.
 * 
 * @param src - Image source path or URL
 * @returns R2 URL or original path
 */
function handleR2Fallback(src: string): string {
  // If it's already a full URL, return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  
  // Construct R2 URL
  const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
  
  // Handle avatar image paths: /0001.webp → R2 URL
  // R2 stores files directly at root (e.g., 0001.webp, not /images/0001.webp)
  const avatarImageMatch = src.match(/^\/(\d{4})\.(webp|png|jpg|jpeg)$/);
  if (avatarImageMatch) {
    return `${r2Base}${src}`;
  }
  
  // Handle legacy /images/ paths → convert to direct R2 URL
  const legacyImageMatch = src.match(/^\/images\/(\d{4})\.(webp|png|jpg|jpeg)$/);
  if (legacyImageMatch) {
    return `${r2Base}/${legacyImageMatch[1]}.${legacyImageMatch[2]}`;
  }
  
  // Handle direct image IDs: 0001 → R2 URL
  if (/^\d{4}$/.test(src)) {
    return `${r2Base}/${src}.webp`;
  }
  
  // For all other relative paths (API routes, placeholders, etc.),
  // return as-is to preserve Next.js routing
  // Examples:
  // - /api/avatar-image?id=0001 → keep as-is (API fallback)
  // - /images/placeholder.png → keep as-is (static asset)
  return src;
}

/**
 * Utility function to generate Cloudflare Images URL directly
 * Useful for server-side image URL generation
 * 
 * @param imageId - 4-digit avatar ID (e.g., "0001")
 * @param variant - Variant name (thumbnail, small, medium, large, public)
 * @returns Cloudflare Images URL
 */
export function getCloudflareImageURL(imageId: string, variant: string = 'medium'): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const enableCloudflareImages = process.env.NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES === 'true';
  
  // Require both accountHash and feature flag to use Cloudflare Images
  if (!accountHash || !enableCloudflareImages) {
    // Fallback to R2 (files stored directly at root: 0001.webp)
    const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
    return `${r2Base}/${imageId}.webp`;
  }
  
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}
