/**
 * KV Migration API
 *
 * Phase 5b: Migrate old KV data format to new format
 *
 * Old format: akyo:613, akyo:614, ... (individual records)
 * New format: akyo-data-ja, akyo-data-en (full data arrays)
 *
 * This endpoint:
 * 1. Cleans up old KV entries (akyo:* format)
 * 2. Initializes new KV cache with fresh data from JSON
 *
 * Security:
 * - Requires REVALIDATE_SECRET header for authentication
 * - One-time migration operation
 *
 * Usage:
 * POST /api/kv-migrate
 * Headers:
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 * Body (optional):
 *   { "cleanupOld": true, "initializeNew": true }
 */

import type { KVNamespace } from '@/types/kv';
import { NextRequest } from 'next/server';

// Note: OpenNext/Cloudflare requires nodejs runtime for API routes
export const runtime = 'nodejs';

function getKVNamespace(): KVNamespace | null {
  try {
    // Use OpenNext.js Cloudflare helper to get context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();

    if (env?.AKYO_KV) {
      return env.AKYO_KV as KVNamespace;
    }
    return null;
  } catch {
    return null;
  }
}

interface MigrateRequest {
  cleanupOld?: boolean;
  initializeNew?: boolean;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify secret
    const secret = request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret) {
      console.error('[kv-migrate] REVALIDATE_SECRET is not configured');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[kv-migrate] Invalid or missing secret');
      return Response.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const kv = getKVNamespace();
    if (!kv) {
      return Response.json(
        { error: 'KV namespace not available (not in Cloudflare environment)' },
        { status: 503 }
      );
    }

    // Parse request body
    let cleanupOld = true;
    let initializeNew = true;

    try {
      const body = (await request.json()) as MigrateRequest;
      if (body.cleanupOld !== undefined) cleanupOld = body.cleanupOld;
      if (body.initializeNew !== undefined) initializeNew = body.initializeNew;
    } catch {
      // Use defaults
    }

    const result: {
      deletedKeys: string[];
      newKeysCreated: string[];
      dataCount: { ja: number; en: number; ko: number };
      errors: string[];
      warnings: string[];
    } = {
      deletedKeys: [],
      newKeysCreated: [],
      dataCount: { ja: 0, en: 0, ko: 0 },
      errors: [],
      warnings: [],
    };

    // Step 1: Clean up old format keys (akyo:*)
    if (cleanupOld) {
      console.log('[kv-migrate] Cleaning up old KV entries...');
      try {
        // List all keys with old format prefix
        let cursor: string | undefined;
        do {
          const listResult = await kv.list({ prefix: 'akyo:', cursor, limit: 100 });

          for (const key of listResult.keys) {
            try {
              await kv.delete(key.name);
              result.deletedKeys.push(key.name);
              console.log(`[kv-migrate] Deleted: ${key.name}`);
            } catch (error) {
              const errMsg = `Failed to delete ${key.name}: ${error}`;
              console.error(`[kv-migrate] ${errMsg}`);
              result.errors.push(errMsg);
            }
          }

          cursor = listResult.list_complete ? undefined : listResult.cursor;
        } while (cursor);

        console.log(`[kv-migrate] Cleanup complete: ${result.deletedKeys.length} keys deleted`);
      } catch (error) {
        const errMsg = `Cleanup failed: ${error}`;
        console.error(`[kv-migrate] ${errMsg}`);
        result.errors.push(errMsg);
      }
    }

    // Step 2: Initialize new format with fresh data
    if (initializeNew) {
      console.log('[kv-migrate] Initializing new KV format...');
      try {
        const { getAkyoDataFromJSON, getAkyoDataFromJSONIfExists } =
          await import('@/lib/akyo-data-json');
        const { updateKVCacheAll } = await import('@/lib/akyo-data-kv');

        // Fetch fresh data from JSON (ja/en required, ko optional)
        const [dataJa, dataEn, dataKo] = await Promise.all([
          getAkyoDataFromJSON('ja'),
          getAkyoDataFromJSON('en'),
          getAkyoDataFromJSONIfExists('ko'),
        ]);

        result.dataCount.ja = dataJa.length;
        result.dataCount.en = dataEn.length;
        result.dataCount.ko = dataKo?.length ?? 0;

        if (!dataKo) {
          const warnMsg = 'Korean JSON data not available on CDN, skipping KV update for ko';
          console.warn(`[kv-migrate] ${warnMsg}`);
          result.warnings.push(warnMsg);
        }

        // Update KV atomically to avoid metadata race condition
        const kvResult = await updateKVCacheAll(dataJa, dataEn, dataKo ?? undefined);

        // Track successful updates
        if (kvResult.ja) {
          result.newKeysCreated.push('akyo-data-ja');
        } else {
          const errMsg = 'Failed to update KV cache for Japanese data';
          console.error(`[kv-migrate] ${errMsg}`);
          result.errors.push(errMsg);
        }

        if (kvResult.en) {
          result.newKeysCreated.push('akyo-data-en');
        } else {
          const errMsg = 'Failed to update KV cache for English data';
          console.error(`[kv-migrate] ${errMsg}`);
          result.errors.push(errMsg);
        }

        if (kvResult.ko) {
          result.newKeysCreated.push('akyo-data-ko');
        } else if (dataKo) {
          // Only treat as error if Korean data was actually available but KV write failed
          const errMsg = 'Failed to update KV cache for Korean data';
          console.error(`[kv-migrate] ${errMsg}`);
          result.errors.push(errMsg);
        }

        if (kvResult.metadata) {
          result.newKeysCreated.push('akyo-data-meta');
        } else if (kvResult.ja || kvResult.en || kvResult.ko) {
          // Data was written but metadata failed
          const errMsg = 'Data written but metadata update failed';
          console.error(`[kv-migrate] ${errMsg}`);
          result.errors.push(errMsg);
        }

        console.log(
          `[kv-migrate] Initialization complete: ja=${kvResult.ja}, en=${kvResult.en}, ko=${kvResult.ko}, meta=${kvResult.metadata}`
        );
      } catch (error) {
        const errMsg = `Initialization failed: ${error}`;
        console.error(`[kv-migrate] ${errMsg}`);
        result.errors.push(errMsg);
      }
    }

    const success = result.errors.length === 0;
    const responseData = {
      success,
      timestamp: new Date().toISOString(),
      ...result,
    };

    // Return 500 status if any errors occurred
    return Response.json(responseData, {
      status: success ? 200 : 500,
    });
  } catch (error) {
    console.error('[kv-migrate] Unexpected error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Status endpoint - requires authentication
export async function GET(request: NextRequest): Promise<Response> {
  // Verify secret - same authentication as POST
  const secret = request.headers.get('x-revalidate-secret');
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (!expectedSecret) {
    console.error('[kv-migrate] REVALIDATE_SECRET is not configured');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn('[kv-migrate] GET: Invalid or missing secret');
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const kv = getKVNamespace();

  if (!kv) {
    return Response.json({
      status: 'unavailable',
      message: 'KV namespace not available (not in Cloudflare environment)',
    });
  }

  try {
    // List all keys to check current state
    const oldKeys: string[] = [];
    const newKeys: string[] = [];

    // Check old format keys with pagination (fetch all, not just first 100)
    let cursor: string | undefined;
    do {
      const oldList = await kv.list({ prefix: 'akyo:', limit: 100, cursor });
      oldKeys.push(...oldList.keys.map((k) => k.name));
      cursor = oldList.list_complete ? undefined : oldList.cursor;
    } while (cursor);

    // Check new format keys
    const newFormats = ['akyo-data-ja', 'akyo-data-en', 'akyo-data-ko', 'akyo-data-meta'];
    for (const key of newFormats) {
      const value = await kv.get(key, { type: 'text' });
      if (value) newKeys.push(key);
    }

    return Response.json({
      status: 'ok',
      kvAvailable: true,
      oldFormatKeys: oldKeys,
      oldFormatKeysCount: oldKeys.length,
      newFormatKeys: newKeys,
      needsMigration: oldKeys.length > 0 || newKeys.length === 0,
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      message: `${error}`,
    });
  }
}
