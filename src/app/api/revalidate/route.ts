import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

/**
 * On-demand ISR Revalidation API
 * 
 * Phase 5a: ISR cache invalidation
 * Phase 5b: KV cache update
 * 
 * This endpoint allows external services (like GitHub Actions) to trigger
 * cache invalidation after data updates, enabling near-instant updates
 * instead of waiting for the ISR revalidation period (1 hour).
 * 
 * Security:
 * - Requires REVALIDATE_SECRET header for authentication
 * - Should only be called from trusted sources (GitHub Actions webhook)
 * 
 * Usage:
 * POST /api/revalidate
 * Headers:
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 * Body (optional):
 *   { 
 *     "paths": ["/", "/en"], 
 *     "tags": ["akyo-data"],
 *     "updateKV": true  // Phase 5b: Also update KV cache
 *   }
 * 
 * If no body is provided, revalidates all main pages by default.
 * 
 * Environment Variables:
 * - REVALIDATE_SECRET: Secret token for authentication (required)
 */

// Note: OpenNext/Cloudflare requires nodejs runtime for API routes
export const runtime = 'nodejs';

interface RevalidateRequest {
  paths?: string[];
  tags?: string[];
  updateKV?: boolean; // Phase 5b: Also update KV cache with fresh data
}

// Default paths to revalidate when no specific paths are provided
const DEFAULT_PATHS = [
  '/',      // Japanese home
  '/en',    // English home
];

// Default tags to revalidate
const DEFAULT_TAGS = [
  'akyo-data',
];

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify secret
    const secret = request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret) {
      console.error('[revalidate] REVALIDATE_SECRET is not configured');
      return Response.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[revalidate] Invalid or missing secret');
      return Response.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Parse request body (optional)
    let paths = DEFAULT_PATHS;
    let tags = DEFAULT_TAGS;
    let updateKV = false;

    try {
      const body = await request.json() as RevalidateRequest;
      if (body.paths && Array.isArray(body.paths) && body.paths.length > 0) {
        paths = body.paths;
      }
      if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
        tags = body.tags;
      }
      if (body.updateKV === true) {
        updateKV = true;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Revalidate paths
    const revalidatedPaths: string[] = [];
    for (const path of paths) {
      try {
        revalidatePath(path);
        revalidatedPaths.push(path);
        console.log(`[revalidate] Revalidated path: ${path}`);
      } catch (error) {
        console.error(`[revalidate] Failed to revalidate path ${path}:`, error);
      }
    }

    // Revalidate tags
    const revalidatedTags: string[] = [];
    for (const tag of tags) {
      try {
        revalidateTag(tag);
        revalidatedTags.push(tag);
        console.log(`[revalidate] Revalidated tag: ${tag}`);
      } catch (error) {
        console.error(`[revalidate] Failed to revalidate tag ${tag}:`, error);
      }
    }

    // Phase 5b: Update KV cache if requested
    let kvUpdated = false;
    let kvUpdateDetails: { ja: boolean; en: boolean; ko: boolean; metadata: boolean } | null = null;
    let kvError: string | null = null;
    
    if (updateKV) {
      try {
        console.log('[revalidate] Updating KV cache...');
        const { getAkyoDataFromJSON } = await import('@/lib/akyo-data-json');
        const { getAkyoDataFromJSONIfExists } = await import('@/lib/akyo-data-json');
        const { updateKVCacheAll } = await import('@/lib/akyo-data-kv');
        
        // Fetch fresh data from JSON for all languages (ko is optional)
        const [dataJa, dataEn, dataKo] = await Promise.all([
          getAkyoDataFromJSON('ja'),
          getAkyoDataFromJSON('en'),
          getAkyoDataFromJSONIfExists('ko'),
        ]);
        
        if (!dataKo) {
          console.warn('[revalidate] Korean JSON data not available on CDN, skipping ko KV update');
        }
        
        // Update all languages atomically to avoid metadata race condition
        kvUpdateDetails = await updateKVCacheAll(dataJa, dataEn, dataKo ?? undefined);
        // ko is non-fatal: only ja, en, and metadata are required for success
        kvUpdated = kvUpdateDetails.ja && kvUpdateDetails.en && kvUpdateDetails.metadata;
        
        if (!kvUpdated) {
          kvError = `KV update incomplete: ja=${kvUpdateDetails.ja}, en=${kvUpdateDetails.en}, ko=${kvUpdateDetails.ko}, meta=${kvUpdateDetails.metadata}`;
          console.error(`[revalidate] ${kvError}`);
        } else if (!kvUpdateDetails.ko) {
          // Log ko failure as warning, not error
          console.warn(`[revalidate] KV cache update partial: ja=${kvUpdateDetails.ja}, en=${kvUpdateDetails.en}, ko=${kvUpdateDetails.ko} (non-fatal), meta=${kvUpdateDetails.metadata}`);
        } else {
          console.log(`[revalidate] KV cache update successful: ja=${kvUpdateDetails.ja}, en=${kvUpdateDetails.en}, ko=${kvUpdateDetails.ko}, meta=${kvUpdateDetails.metadata}`);
        }
      } catch (error) {
        kvError = `KV update failed: ${error}`;
        console.error('[revalidate] Failed to update KV cache:', error);
      }
    }

    const result = {
      revalidated: true,
      timestamp: new Date().toISOString(),
      paths: revalidatedPaths,
      tags: revalidatedTags,
      kvUpdated,
      kvUpdateDetails,
      kvError,
    };

    console.log('[revalidate] Revalidation complete:', result);

    // If updateKV was requested but failed, return 500 to signal data inconsistency
    // This ensures calling workflows (e.g., GitHub Actions) detect the failure
    // and can retry or alert, preventing stale KV data from being served
    if (updateKV && !kvUpdated) {
      return Response.json(result, { status: 500 });
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('[revalidate] Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    endpoint: '/api/revalidate',
    method: 'POST',
    description: 'On-demand ISR revalidation endpoint',
  });
}
