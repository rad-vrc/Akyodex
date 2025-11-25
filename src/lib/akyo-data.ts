/**
 * Unified Data Loading Module for Akyoずかん
 * 
 * Phase 4: R2 JSON Data Cache
 * Phase 5a: On-demand ISR Revalidation
 * Phase 5b: Cloudflare KV Edge Cache
 * 
 * This module provides a unified interface for data loading with
 * automatic fallback chain: KV → JSON → CSV
 * 
 * Data Source Priority:
 * 1. Cloudflare KV (fastest, ~5ms, edge-side)
 * 2. R2 JSON files (fast, ~20ms, CDN cached)
 * 3. CSV files (fallback, ~200ms)
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_USE_KV_DATA=true   → Try KV first (default in production)
 * - NEXT_PUBLIC_USE_JSON_DATA=true → Use JSON files (fallback)
 * - Both false → Use CSV files (legacy)
 * 
 * Performance Comparison:
 * - KV:   ~5ms (edge-side, no network hop)
 * - JSON: ~20ms (fetch only, no parsing needed)
 * - CSV:  ~200ms (fetch + parse)
 */

import { cache } from 'react';
import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData } from '@/types/akyo';

/**
 * Check which data source should be used
 */
const USE_KV_DATA = process.env.NEXT_PUBLIC_USE_KV_DATA !== 'false';
const USE_JSON_DATA = process.env.NEXT_PUBLIC_USE_JSON_DATA !== 'false';

/**
 * Get Akyo data with automatic data source selection and fallback
 * 
 * Fallback chain: KV → JSON → CSV
 * 
 * Wrapped with React cache() for automatic deduplication within a single request
 * 
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data
 */
export const getAkyoData = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> => {
    // Try KV first (Phase 5b)
    if (USE_KV_DATA) {
      try {
        console.log('[getAkyoData] Trying KV data source');
        const { getAkyoDataFromKV } = await import('./akyo-data-kv');
        const data = await getAkyoDataFromKV(lang);
        if (data && data.length > 0) {
          console.log(`[getAkyoData] KV success: ${data.length} avatars`);
          return data;
        }
      } catch (error) {
        console.log('[getAkyoData] KV failed, trying JSON fallback:', error);
      }
    }
    
    // Try JSON (Phase 4)
    if (USE_JSON_DATA) {
      try {
        console.log('[getAkyoData] Using JSON data source');
        const { getAkyoDataFromJSON } = await import('./akyo-data-json');
        return getAkyoDataFromJSON(lang);
      } catch (error) {
        console.log('[getAkyoData] JSON failed, trying CSV fallback:', error);
      }
    }
    
    // Fallback to CSV (legacy)
    console.log('[getAkyoData] Using CSV data source (fallback)');
    const { getAkyoData: getFromCSV } = await import('./akyo-data-server');
    return getFromCSV(lang);
  }
);

/**
 * Get single Akyo by ID
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param id - 4-digit ID (e.g., "0001")
 * @param lang - Language code
 * @returns Single Akyo data or null if not found
 */
export const getAkyoById = cache(
  async (id: string, lang: SupportedLanguage = 'ja'): Promise<AkyoData | null> => {
    // Try KV first (Phase 5b)
    if (USE_KV_DATA) {
      try {
        const { getAkyoByIdFromKV } = await import('./akyo-data-kv');
        const data = await getAkyoByIdFromKV(id, lang);
        if (data) return data;
      } catch {
        // Fall through to JSON
      }
    }
    
    // Try JSON (Phase 4)
    if (USE_JSON_DATA) {
      try {
        const { getAkyoByIdFromJSON } = await import('./akyo-data-json');
        return getAkyoByIdFromJSON(id, lang);
      } catch {
        // Fall through to CSV
      }
    }
    
    // Fallback to CSV
    const { getAkyoById: getFromCSV } = await import('./akyo-data-server');
    return getFromCSV(id, lang);
  }
);

/**
 * Get all unique categories (attributes) from the dataset
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param lang - Language code
 * @returns Array of unique categories
 */
export const getAllCategories = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    // Try KV first (Phase 5b)
    if (USE_KV_DATA) {
      try {
        const { getAllCategoriesFromKV } = await import('./akyo-data-kv');
        const categories = await getAllCategoriesFromKV(lang);
        if (categories && categories.length > 0) return categories;
      } catch {
        // Fall through to JSON
      }
    }
    
    // Try JSON (Phase 4)
    if (USE_JSON_DATA) {
      try {
        const { getAllCategoriesFromJSON } = await import('./akyo-data-json');
        return getAllCategoriesFromJSON(lang);
      } catch {
        // Fall through to CSV
      }
    }
    
    // Fallback to CSV
    const { getAllCategories: getFromCSV } = await import('./akyo-data-server');
    return getFromCSV(lang);
  }
);

/**
 * Get all unique authors (creators) from the dataset
 * Wrapped with React cache() for automatic deduplication
 * 
 * @param lang - Language code
 * @returns Array of unique authors
 */
export const getAllAuthors = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    // Try KV first (Phase 5b)
    if (USE_KV_DATA) {
      try {
        const { getAllAuthorsFromKV } = await import('./akyo-data-kv');
        const authors = await getAllAuthorsFromKV(lang);
        if (authors && authors.length > 0) return authors;
      } catch {
        // Fall through to JSON
      }
    }
    
    // Try JSON (Phase 4)
    if (USE_JSON_DATA) {
      try {
        const { getAllAuthorsFromJSON } = await import('./akyo-data-json');
        return getAllAuthorsFromJSON(lang);
      } catch {
        // Fall through to CSV
      }
    }
    
    // Fallback to CSV
    const { getAllAuthors: getFromCSV } = await import('./akyo-data-server');
    return getFromCSV(lang);
  }
);

/**
 * @deprecated Use getAllCategories instead
 */
export async function getAllAttributes(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  return getAllCategories(lang);
}

/**
 * @deprecated Use getAllAuthors instead
 */
export async function getAllCreators(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  return getAllAuthors(lang);
}

/**
 * Get information about current data source configuration
 * Useful for debugging and monitoring
 */
export function getDataSourceInfo(): {
  kvEnabled: boolean;
  jsonEnabled: boolean;
  priority: ('kv' | 'json' | 'csv')[];
  description: string;
} {
  const priority: ('kv' | 'json' | 'csv')[] = [];
  
  if (USE_KV_DATA) priority.push('kv');
  if (USE_JSON_DATA) priority.push('json');
  priority.push('csv'); // CSV is always the final fallback
  
  return {
    kvEnabled: USE_KV_DATA,
    jsonEnabled: USE_JSON_DATA,
    priority,
    description: `Data source priority: ${priority.join(' → ')}`,
  };
}

/**
 * Check KV cache status (Phase 5b)
 * Returns information about KV availability and data
 */
export async function getKVStatus(): Promise<{
  available: boolean;
  hasData: boolean;
  metadata: { lastUpdated: string; countJa: number; countEn: number; version: string } | null;
} | null> {
  if (!USE_KV_DATA) {
    return null;
  }
  
  try {
    const { checkKVStatus } = await import('./akyo-data-kv');
    return checkKVStatus();
  } catch {
    return null;
  }
}
