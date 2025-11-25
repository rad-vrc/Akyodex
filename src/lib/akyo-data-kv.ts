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

/**
 * KV key constants
 */
const KV_KEYS = {
  DATA_JA: 'akyo-data-ja',
  DATA_EN: 'akyo-data-en',
  META: 'akyo-data-meta',
} as const;

/**
 * Metadata structure for KV cache
 */
interface KVMetadata {
  lastUpdated: string;
  countJa: number;
  countEn: number;
  version: string;
}

/**
 * Get KV namespace from Cloudflare context
 * Returns null if not in Cloudflare environment
 */
function getKVNamespace(): KVNamespace | null {
  try {
    // Try to get from Cloudflare's context
    // This is available in Cloudflare Pages Functions
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const context = getRequestContext();
    
    if (context?.env?.AKYO_KV) {
      return context.env.AKYO_KV as KVNamespace;
    }
    
    console.log('[KV] AKYO_KV binding not available');
    return null;
  } catch (error) {
    // Not in Cloudflare environment or binding not available
    console.log('[KV] Not in Cloudflare environment or getRequestContext failed');
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
  source: 'kv' | 'kv-ja-fallback' | 'json-fallback' | 'error-fallback';
}

/**
 * Fetch Akyo data from KV only (no internal fallback)
 * Throws or returns null if KV is unavailable or empty
 * 
 * This is the "pure" KV fetch that doesn't hide the data source.
 * Use getAkyoDataFromKVWithSource for explicit source tracking.
 * 
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data, or null if KV unavailable/empty
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
      
      // KV is empty or data not found, try fallback to Japanese within KV
      if (lang !== 'ja') {
        console.log(`[KV] ${lang} data not found, trying Japanese in KV`);
        const jaData = await kv.get<AkyoData[]>(KV_KEYS.DATA_JA, { type: 'json' });
        
        if (jaData && Array.isArray(jaData) && jaData.length > 0) {
          console.log(`[KV] Japanese fallback success: ${jaData.length} avatars`);
          return jaData;
        }
      }
      
      // KV is completely empty
      console.log('[KV] No data in KV');
      return null;
      
    } catch (error) {
      console.error('[KV] Error fetching from KV:', error);
      throw error;
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
      
      // KV is empty or data not found, try fallback to Japanese within KV
      if (lang !== 'ja') {
        console.log(`[KV] ${lang} data not found, trying Japanese in KV`);
        const jaData = await kv.get<AkyoData[]>(KV_KEYS.DATA_JA, { type: 'json' });
        
        if (jaData && Array.isArray(jaData) && jaData.length > 0) {
          console.log(`[KV] Japanese KV fallback success: ${jaData.length} avatars`);
          return { data: jaData, source: 'kv-ja-fallback' };
        }
      }
      
      // KV is completely empty, fall back to JSON
      console.log('[KV] No data in KV, falling back to JSON');
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
 * Fetch Akyo data from KV with fallback to JSON
 * Wrapped with React cache() for automatic deduplication within a single request
 * 
 * @deprecated Use getAkyoDataFromKVOnly or getAkyoDataFromKVWithSource for clearer semantics
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data
 */
export const getAkyoDataFromKV = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> => {
    const result = await getAkyoDataFromKVWithSource(lang);
    return result.data;
  }
);

/**
 * Get single Akyo by ID from KV data
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param id - 4-digit ID (e.g., "0001")
 * @param lang - Language code
 * @returns Single Akyo data or null if not found
 */
export const getAkyoByIdFromKV = cache(
  async (id: string, lang: SupportedLanguage = 'ja'): Promise<AkyoData | null> => {
    const data = await getAkyoDataFromKV(lang);
    return data.find((akyo) => akyo.id === id) || null;
  }
);

/**
 * Get all unique categories from KV data
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param lang - Language code
 * @returns Array of unique categories
 */
export const getAllCategoriesFromKV = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    const data = await getAkyoDataFromKV(lang);
    const categoriesSet = new Set<string>();
    
    data.forEach((akyo) => {
      const catStr = akyo.category || akyo.attribute || '';
      const cats = catStr.split(/[、,]/).map((c) => c.trim()).filter(Boolean);
      cats.forEach((cat) => categoriesSet.add(cat));
    });
    
    return Array.from(categoriesSet).sort();
  }
);

/**
 * Get all unique authors from KV data
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param lang - Language code
 * @returns Array of unique authors
 */
export const getAllAuthorsFromKV = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    const data = await getAkyoDataFromKV(lang);
    const authorsSet = new Set<string>();
    
    data.forEach((akyo) => {
      const authorStr = akyo.author || akyo.creator || '';
      const authors = authorStr.split(/[、,]/).map((a) => a.trim()).filter(Boolean);
      authors.forEach((author) => authorsSet.add(author));
    });
    
    return Array.from(authorsSet).sort();
  }
);

/**
 * Update KV cache with new data
 * Called after data changes (CSV update, etc.)
 * 
 * @param data - Array of Akyo data
 * @param lang - Language code
 * @returns true if successful, false otherwise
 */
export async function updateKVCache(
  data: AkyoData[],
  lang: SupportedLanguage = 'ja'
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
    
    // Update metadata with proper merging
    // First, read existing metadata to preserve other language counts
    let existingMeta: KVMetadata | null = null;
    try {
      existingMeta = await kv.get<KVMetadata>(KV_KEYS.META, { type: 'json' });
    } catch (metaReadError) {
      console.warn('[KV] Failed to read existing metadata, will create new:', metaReadError);
    }
    
    // Build new metadata, preserving existing counts for other language
    const meta: KVMetadata = {
      lastUpdated: new Date().toISOString(),
      countJa: lang === 'ja' ? data.length : (existingMeta?.countJa ?? 0),
      countEn: lang === 'en' ? data.length : (existingMeta?.countEn ?? 0),
      version: '5b',
    };
    
    // Write metadata
    try {
      await kv.put(KV_KEYS.META, JSON.stringify(meta));
      console.log(`[KV] Updated metadata: ja=${meta.countJa}, en=${meta.countEn}`);
    } catch (metaWriteError) {
      // Log error but don't fail the whole operation since data was written successfully
      console.error('[KV] Failed to update metadata:', metaWriteError);
      // Note: Data is still valid, just metadata may be stale
    }
    
    return true;
  } catch (error) {
    console.error('[KV] Error updating KV cache:', error);
    return false;
  }
}

/**
 * Clear all KV cache data
 * Use with caution - removes all cached data
 * 
 * @returns true if successful, false otherwise
 */
export async function clearKVCache(): Promise<boolean> {
  const kv = getKVNamespace();
  
  if (!kv) {
    console.warn('[KV] Cannot clear KV: namespace not available');
    return false;
  }
  
  try {
    await Promise.all([
      kv.delete(KV_KEYS.DATA_JA),
      kv.delete(KV_KEYS.DATA_EN),
      kv.delete(KV_KEYS.META),
    ]);
    console.log('[KV] Cache cleared');
    return true;
  } catch (error) {
    console.error('[KV] Error clearing KV cache:', error);
    return false;
  }
}

/**
 * Get KV cache metadata
 * Useful for debugging and monitoring
 * 
 * @returns Metadata or null if not available
 */
export async function getKVMetadata(): Promise<KVMetadata | null> {
  const kv = getKVNamespace();
  
  if (!kv) {
    return null;
  }
  
  try {
    return await kv.get<KVMetadata>(KV_KEYS.META, { type: 'json' });
  } catch {
    return null;
  }
}

/**
 * Check if KV cache is available and has data
 * 
 * @returns Object with availability status
 */
export async function checkKVStatus(): Promise<{
  available: boolean;
  hasData: boolean;
  metadata: KVMetadata | null;
}> {
  const kv = getKVNamespace();
  
  if (!kv) {
    return { available: false, hasData: false, metadata: null };
  }
  
  try {
    const metadata = await kv.get<KVMetadata>(KV_KEYS.META, { type: 'json' });
    const hasData = metadata !== null && (metadata.countJa > 0 || metadata.countEn > 0);
    
    return {
      available: true,
      hasData,
      metadata,
    };
  } catch {
    return { available: true, hasData: false, metadata: null };
  }
}
