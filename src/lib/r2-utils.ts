/**
 * Cloudflare R2 Storage Utilities
 *
 * Common utilities for R2 bucket operations (image upload/delete).
 * Centralizes R2 logic and error handling following DRY principles.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface R2UploadOptions {
  contentType?: string;
  maxSizeBytes?: number;
}

export interface R2UploadResult {
  success: boolean;
  key?: string;
  error?: string;
}

/**
 * R2 Bucket interface (minimal typing for Cloudflare R2)
 */
interface R2Bucket {
  put: (key: string, value: Buffer, options?: { httpMetadata?: { contentType: string } }) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

/**
 * Get R2 bucket from Cloudflare context
 *
 * @returns R2 bucket object or null if not available
 */
function getR2Bucket(): R2Bucket | null {
  try {
    const context = getCloudflareContext();
    
    // Debug logging
    if (context?.env) {
      console.log('[R2] Available bindings:', Object.keys(context.env));
    } else {
      console.warn('[R2] No Cloudflare context or env found');
    }

    const bucket = context?.env?.AKYO_BUCKET as R2Bucket | undefined;

    if (bucket && typeof bucket === 'object' && typeof bucket.put === 'function') {
      return bucket;
    }

    console.warn('[R2] Bucket binding not available (AKYO_BUCKET)');
    return null;
  } catch (error) {
    console.warn('[R2] Failed to get Cloudflare context:', error);
    return null;
  }
}

/**
 * Upload image to R2 bucket
 *
 * @param id - Akyo ID (used as filename)
 * @param imageData - Base64 data URL (e.g., "data:image/webp;base64,...")
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadImageToR2(
  id: string,
  imageData: string,
  options: R2UploadOptions = {}
): Promise<R2UploadResult> {
  const {
    contentType = 'image/webp',
    maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  } = options;

  try {
    // Validate image format
    const dataUrlMatch = imageData.match(/^data:(image\/\w+);base64,/);
    if (!dataUrlMatch) {
      return {
        success: false,
        error: 'Invalid data URL format',
      };
    }

    // Extract and validate content type
    const actualContentType = dataUrlMatch[1];
    if (actualContentType !== contentType) {
      return {
        success: false,
        error: `Invalid content type: expected ${contentType}, got ${actualContentType}`,
      };
    }

    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      return {
        success: false,
        error: 'Missing base64 data',
      };
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size
    if (buffer.byteLength > maxSizeBytes) {
      return {
        success: false,
        error: `Image too large (max ${maxSizeBytes / 1024 / 1024}MB)`,
      };
    }

    // Get R2 bucket
    const bucket = getR2Bucket();
    if (!bucket) {
      return {
        success: false,
        error: 'R2 bucket not available',
      };
    }

    // Upload to R2 (store in images/ subdirectory to match fetch path)
    const imageKey = `images/${id}.webp`;
    await bucket.put(imageKey, buffer, {
      httpMetadata: {
        contentType,
      },
    });

    console.log(`[R2] Image uploaded successfully: ${imageKey}`);

    return {
      success: true,
      key: imageKey,
    };
  } catch (error) {
    console.error('[R2] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Delete image from R2 bucket
 *
 * @param id - Akyo ID (used as filename)
 * @returns Deletion result
 */
export async function deleteImageFromR2(id: string): Promise<R2UploadResult> {
  try {
    // Get R2 bucket
    const bucket = getR2Bucket();
    if (!bucket) {
      return {
        success: false,
        error: 'R2 bucket not available',
      };
    }

    // Delete from R2 (images/ subdirectory)
    const imageKey = `images/${id}.webp`;

    if (typeof bucket.delete !== 'function') {
      return {
        success: false,
        error: 'R2 bucket delete method not available',
      };
    }

    await bucket.delete(imageKey);

    console.log(`[R2] Image deleted successfully: ${imageKey}`);

    return {
      success: true,
      key: imageKey,
    };
  } catch (error) {
    console.error('[R2] Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error',
    };
  }
}
