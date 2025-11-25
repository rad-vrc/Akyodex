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

import { NextRequest } from 'next/server';

// Note: OpenNext/Cloudflare requires nodejs runtime for API routes
export const runtime = 'nodejs';

/**
 * KV Namespace binding interface
 */
interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  get<T>(key: string, options: { type: 'json' }): Promise<T | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; metadata?: Record<string, unknown> }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

function getKVNamespace(): KVNamespace | null {
  try {
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const context = getRequestContext();
    
    if (context?.env?.AKYO_KV) {
      return context.env.AKYO_KV as KVNamespace;
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
      return Response.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[kv-migrate] Invalid or missing secret');
      return Response.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
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
      const body = await request.json() as MigrateRequest;
      if (body.cleanupOld !== undefined) cleanupOld = body.cleanupOld;
      if (body.initializeNew !== undefined) initializeNew = body.initializeNew;
    } catch {
      // Use defaults
    }

    const result: {
      deletedKeys: string[];
      newKeysCreated: string[];
      dataCount: { ja: number; en: number };
      errors: string[];
    } = {
      deletedKeys: [],
      newKeysCreated: [],
      dataCount: { ja: 0, en: 0 },
      errors: [],
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
        const { getAkyoDataFromJSON } = await import('@/lib/akyo-data-json');
        const { updateKVCacheBoth } = await import('@/lib/akyo-data-kv');
        
        // Fetch fresh data from JSON
        const [dataJa, dataEn] = await Promise.all([
          getAkyoDataFromJSON('ja'),
          getAkyoDataFromJSON('en'),
        ]);
        
        result.dataCount.ja = dataJa.length;
        result.dataCount.en = dataEn.length;
        
        // Update KV atomically to avoid metadata race condition
        const kvResult = await updateKVCacheBoth(dataJa, dataEn);
        
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
        
        if (kvResult.metadata) {
          result.newKeysCreated.push('akyo-data-meta');
        } else if (kvResult.ja || kvResult.en) {
          // Data was written but metadata failed
          const errMsg = 'Data written but metadata update failed';
          console.error(`[kv-migrate] ${errMsg}`);
          result.errors.push(errMsg);
        }
        
        console.log(`[kv-migrate] Initialization complete: ja=${kvResult.ja}, en=${kvResult.en}, meta=${kvResult.metadata}`);
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
      status: success ? 200 : 500 
    });
    
  } catch (error) {
    console.error('[kv-migrate] Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Status endpoint - requires authentication
export async function GET(request: NextRequest): Promise<Response> {
  // Verify secret - same authentication as POST
  const secret = request.headers.get('x-revalidate-secret');
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (!expectedSecret) {
    console.error('[kv-migrate] REVALIDATE_SECRET is not configured');
    return Response.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!secret || secret !== expectedSecret) {
    console.warn('[kv-migrate] GET: Invalid or missing secret');
    return Response.json(
      { error: 'Invalid secret' },
      { status: 401 }
    );
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
    
    // Check old format keys
    const oldList = await kv.list({ prefix: 'akyo:', limit: 100 });
    oldKeys.push(...oldList.keys.map(k => k.name));
    
    // Check new format keys
    const newFormats = ['akyo-data-ja', 'akyo-data-en', 'akyo-data-meta'];
    for (const key of newFormats) {
      const value = await kv.get(key, { type: 'text' });
      if (value) newKeys.push(key);
    }
    
    return Response.json({
      status: 'ok',
      kvAvailable: true,
      oldFormatKeys: oldKeys,
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
