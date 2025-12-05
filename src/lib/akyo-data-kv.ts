/**
 * KV-based Data Loading for Akyoずかん
 * 
 * Phase 5b Implementation: Cloudflare KV Edge Cache
 * 
 * This module handles data fetching from Cloudflare KV for ultra-fast
 * edge-side data access with automatic fallback to JSON/CSV.
 * 
 * KV Data Structure:
 * - Key: "akyo-data-{lang}" (e.g., "akyo-data-ja", "akyo-data-en")
 * - Value: JSON stringified array of AkyoData
 * - Key: "akyo-data-meta" - Metadata (lastUpdated, count, etc.)
 * 
 * Performance benefits:
 * - Edge-side data access (~5ms latency)
 * - No cold start overhead
 * - Global distribution via Cloudflare's edge network
 * - Automatic fallback to JSON if KV unavailable
 * 
 * Cache Invalidation:
 * - Updated via /api/revalidate endpoint
 * - Or directly via KV update after CSV changes
 */

import { cache } from 'react';
import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData } from '@/types/akyo';
import type { KVNamespace, KVMetadata } from '@/types/kv';
import { KV_KEYS } from '@/types/kv';

/**
 * Get KV namespace from Cloudflare context
 * Returns null if not in Cloudflare environment
 * 
 * Uses @opennextjs/cloudflare's getCloudflareContext helper
 * which provides access to KV, R2, and other bindings defined in wrangler.toml
 */
function getKVNamespace(): KVNamespace | null {
  try {
    // Use OpenNext.js Cloudflare helper to get context
    // This is the correct way to access bindings in @opennextjs/cloudflare
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    
    if (env?.AKYO_KV) {
      return env.AKYO_KV as KVNamespace;
    }
    
    console.log('[KV] AKYO_KV binding not available in env');
    return null;
  } catch {
    // Not in Cloudflare environment or getCloudflareContext failed
    // This is expected during local development or build time
    console.log('[KV] Not in Cloudflare environment or getCloudflareContext failed');
    return null;
  }
}

/**
 * Get the KV key for a specific language
 */
function getKVKey(lang: SupportedLanguage): string {
  return lang === 'en' ? KV_KEYS.DATA_EN : KV_KEYS.DATA_JA;
}

/**
 * Result type for KV data fetching
 * Indicates the actual source of the data for accurate logging
 */
export interface KVFetchResult {
  data: AkyoData[];
  source: 'kv' | 'json-fallback' | 'error-fallback';
}

/**
 * Fetch Akyo data from KV only (no internal fallback)
 * Returns null if KV is unavailable or the requested language data is empty
 * 
 * This is the "pure" KV fetch that doesn't hide the data source.
 * It does NOT fall back to Japanese data when English is missing,
 * allowing the caller to properly fall back to JSON/CSV which may
 * have the correct language data.
 * 
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data, or null if KV unavailable/empty for requested language
 */
export const getAkyoDataFromKVOnly = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[] | null> => {
    const kv = getKVNamespace();
    
    if (!kv) {
      console.log('[KV] KV namespace not available');
      return null;
    }
    
    const key = getKVKey(lang);
    console.log(`[KV] Fetching ${lang} data from KV key: ${key}`);
    
    try {
      const data = await kv.get<AkyoData[]>(key, { type: 'json' });
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`[KV] Success: ${data.length} avatars (${lang})`);
        return data;
      }
      
      // KV data not found for requested language
      // Do NOT fall back to Japanese here - let the caller handle fallback
      // to JSON/CSV which may have proper English data
      console.log(`[KV] No ${lang} data in KV, returning null for proper fallback`);
      return null;
      
    } catch (error) {
      // Return null on error to match docstring contract
      // This allows callers to properly fall back to JSON/CSV
      console.error('[KV] Error fetching from KV:', error);
      return null;
    }
  }
);

/**
 * Fetch Akyo data from KV with explicit source tracking
 * Returns both data and the actual source for accurate logging
 * 
 * @param lang - Language code (default: 'ja')
 * @returns Object with data array and source indicator
 */
export const getAkyoDataFromKVWithSource = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<KVFetchResult> => {
    const kv = getKVNamespace();
    
    if (!kv) {
      console.log('[KV] Falling back to JSON data source (KV unavailable)');
      const { getAkyoDataFromJSON } = await import('./akyo-data-json');
      return { data: await getAkyoDataFromJSON(lang), source: 'json-fallback' };
    }
    
    const key = getKVKey(lang);
    console.log(`[KV] Fetching ${lang} data from KV key: ${key}`);
    
    try {
      const data = await kv.get<AkyoData[]>(key, { type: 'json' });
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`[KV] Success: ${data.length} avatars (${lang})`);
        return { data, source: 'kv' };
      }
      
      // KV data not found for requested language
      // Fall back to JSON with the SAME language to preserve language correctness
      // Do NOT use Japanese KV data for English requests
      console.log(`[KV] No ${lang} data in KV, falling back to JSON with same language`);
      const { getAkyoDataFromJSON } = await import('./akyo-data-json');
      return { data: await getAkyoDataFromJSON(lang), source: 'json-fallback' };
      
    } catch (error) {
      console.error('[KV] Error fetching from KV:', error);
      // Fallback to JSON on error
      const { getAkyoDataFromJSON } = await import('./akyo-data-json');
      return { data: await getAkyoDataFromJSON(lang), source: 'error-fallback' };
    }
  }
);

/**
 * Update KV cache with new data for a single language
 * 
 * WARNING: When updating both languages, use updateKVCacheBoth() instead
 * to avoid race conditions with metadata updates.
 * 
 * @param data - Array of Akyo data
 * @param lang - Language code
 * @param skipMetadata - If true, skip metadata update (used internally by updateKVCacheBoth)
 * @returns true if successful, false otherwise
 */
export async function updateKVCache(
  data: AkyoData[],
  lang: SupportedLanguage = 'ja',
  skipMetadata = false
): Promise<boolean> {
  const kv = getKVNamespace();
  
  if (!kv) {
    console.warn('[KV] Cannot update KV: namespace not available');
    return false;
  }
  
  const key = getKVKey(lang);
  
  try {
    // Store data as JSON string
    await kv.put(key, JSON.stringify(data));
    console.log(`[KV] Updated ${key} with ${data.length} avatars`);
    
    // Skip metadata update if called from updateKVCacheBoth
    if (skipMetadata) {
      return true;
    }
    
    // Update metadata - only safe when updating single language
    // For parallel updates, use updateKVCacheBoth() instead
    let existingMeta: KVMetadata | null = null;
    try {
      existingMeta = await kv.get<KVMetadata>(KV_KEYS.META, { type: 'json' });
    } catch (metaReadError) {
      console.warn('[KV] Failed to read existing metadata, will create new:', metaReadError);
    }
    
    const meta: KVMetadata = {
      lastUpdated: new Date().toISOString(),
      countJa: lang === 'ja' ? data.length : (existingMeta?.countJa ?? 0),
      countEn: lang === 'en' ? data.length : (existingMeta?.countEn ?? 0),
      version: '5b',
    };
    
    try {
      await kv.put(KV_KEYS.META, JSON.stringify(meta));
      console.log(`[KV] Updated metadata: ja=${meta.countJa}, en=${meta.countEn}`);
    } catch (metaWriteError) {
      console.error('[KV] Failed to update metadata:', metaWriteError);
    }
    
    return true;
  } catch (error) {
    console.error('[KV] Error updating KV cache:', error);
    return false;
  }
}

/**
 * Update KV cache for both languages atomically
 * 
 * This function updates both Japanese and English data, then writes
 * metadata once with both counts. This avoids race conditions that
 * occur when calling updateKVCache() in parallel.
 * 
 * @param dataJa - Japanese Akyo data array
 * @param dataEn - English Akyo data array
 * @returns Object with success status for each language
 */
export async function updateKVCacheBoth(
  dataJa: AkyoData[],
  dataEn: AkyoData[]
): Promise<{ ja: boolean; en: boolean; metadata: boolean }> {
  const kv = getKVNamespace();
  
  if (!kv) {
    console.warn('[KV] Cannot update KV: namespace not available');
    return { ja: false, en: false, metadata: false };
  }
  
  const result = { ja: false, en: false, metadata: false };
  
  try {
    // Update both data stores in parallel (without metadata)
    const [jaResult, enResult] = await Promise.all([
      updateKVCache(dataJa, 'ja', true),  // skipMetadata = true
      updateKVCache(dataEn, 'en', true),  // skipMetadata = true
    ]);
    
    result.ja = jaResult;
    result.en = enResult;
    
    // Update metadata once with both counts
    // Read existing metadata first to preserve counts for failed updates
    if (jaResult || enResult) {
      let existingMeta: KVMetadata | null = null;
      try {
        existingMeta = await kv.get<KVMetadata>(KV_KEYS.META, { type: 'json' });
      } catch (metaReadError) {
        console.warn('[KV] Failed to read existing metadata:', metaReadError);
      }
      
      // Build metadata preserving previous counts for failed updates
      const meta: KVMetadata = {
        lastUpdated: new Date().toISOString(),
        countJa: jaResult ? dataJa.length : (existingMeta?.countJa ?? 0),
        countEn: enResult ? dataEn.length : (existingMeta?.countEn ?? 0),
        version: '5b',
      };
      
      try {
        await kv.put(KV_KEYS.META, JSON.stringify(meta));
        console.log(`[KV] Updated metadata atomically: ja=${meta.countJa}, en=${meta.countEn}`);
        result.metadata = true;
      } catch (metaWriteError) {
        console.error('[KV] Failed to update metadata:', metaWriteError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('[KV] Error in updateKVCacheBoth:', error);
    return result;
  }
}
