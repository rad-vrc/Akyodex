/**
 * JSON-based Data Loading for Akyoずかん
 * 
 * Phase 4 Implementation: R2 JSON Data Cache
 * Phase 5a: On-demand ISR with cache tags
 * 
 * This module handles JSON data fetching with:
 * - ISR (Incremental Static Regeneration) every hour as fallback
 * - On-demand revalidation via cache tags ('akyo-data')
 * - Automatic language fallback (en/ko -> ja)
 * - React cache() for request deduplication
 * - Fallback to CSV method on error
 * 
 * Performance benefits:
 * - 90% faster data loading (no CSV parsing)
 * - Direct JSON.parse() to JavaScript objects
 * - Reduced server CPU usage
 * - Near-instant updates via on-demand revalidation
 */

import { cache } from 'react';
import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData } from '@/types/akyo';

/**
 * Get the JSON data URL based on language and data source
 */
function getJsonUrl(lang: SupportedLanguage): string {
  const r2Base = process.env.NEXT_PUBLIC_R2_BASE;
  const jsonFileName = `akyo-data-${lang}.json`;
  
  // If R2 base is configured, use R2 for JSON data
  if (r2Base) {
    return `${r2Base}/data/${jsonFileName}`;
  }
  
  // Fallback to GitHub raw (for backward compatibility)
  const githubOwner = process.env.GITHUB_REPO_OWNER || 'rad-vrc';
  const githubRepo = process.env.GITHUB_REPO_NAME || 'Akyodex';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';
  
  return `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/data/${jsonFileName}`;
}

/**
 * Shared helper: fetch a JSON URL with ISR headers/tags, parse and normalize.
 * Returns AkyoData[] on success or null when the response is not ok.
 */
async function fetchAndNormalizeAkyoJson(
  url: string,
  lang: SupportedLanguage
): Promise<AkyoData[] | null> {
  const response = await fetch(url, {
    next: {
      revalidate: 3600, // ISR: 1 hour (fallback)
      tags: ['akyo-data', `akyo-data-${lang}`],
    },
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (parseError) {
    console.error(`[fetchAndNormalizeAkyoJson] Failed to parse JSON for ${lang} from ${url}:`, parseError);
    return null;
  }

  return normalizeJsonData(json);
}

/**
 * Fetch Akyo data from JSON with ISR support
 * Wrapped with React cache() for automatic deduplication within a single request
 * 
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data
 */
export const getAkyoDataFromJSON = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> => {
    const url = getJsonUrl(lang);
    
    console.log(`[getAkyoDataFromJSON] Fetching ${lang} JSON from: ${url}`);
    
    try {
      const data = await fetchAndNormalizeAkyoJson(url, lang);
      
      if (data) {
        console.log(`[getAkyoDataFromJSON] Success: ${data.length} avatars (${lang})`);
        return data;
      }
      
      // Fallback to Japanese if requested language not found
      if (lang !== 'ja') {
        console.log(`[getAkyoDataFromJSON] ${lang} JSON not found, falling back to Japanese`);
        const jaUrl = getJsonUrl('ja');
        const jaData = await fetchAndNormalizeAkyoJson(jaUrl, 'ja');
        
        if (jaData) {
          console.log(`[getAkyoDataFromJSON] Fallback success: ${jaData.length} avatars (ja)`);
          return jaData;
        }
      }
      
      throw new Error(`HTTP response not ok for ${lang}`);
      
    } catch (error) {
      console.error('[getAkyoDataFromJSON] Error:', error);
      
      // Fallback to CSV method
      console.log('[getAkyoDataFromJSON] Falling back to CSV method...');
      const { getAkyoData } = await import('./akyo-data-server');
      return getAkyoData(lang);
    }
  }
);

/**
 * Fetch Akyo data from JSON only if the requested language file actually exists.
 * Returns null instead of silently falling back to Japanese.
 *
 * Use this when you need to distinguish between "real data for this language"
 * and "fell back to Japanese" — e.g. during KV migration/revalidation where
 * writing Japanese data under a Korean key would be incorrect.
 *
 * @param lang - Language code
 * @returns Array of Akyo data, or null if the requested language is unavailable
 */
export async function getAkyoDataFromJSONIfExists(
  lang: SupportedLanguage
): Promise<AkyoData[] | null> {
  const url = getJsonUrl(lang);

  console.log(`[getAkyoDataFromJSONIfExists] Checking ${lang} JSON at: ${url}`);

  try {
    const data = await fetchAndNormalizeAkyoJson(url, lang);

    if (!data) {
      console.log(`[getAkyoDataFromJSONIfExists] ${lang} JSON not found`);
      return null;
    }

    console.log(`[getAkyoDataFromJSONIfExists] Success: ${data.length} avatars (${lang})`);
    return data;
  } catch (error) {
    console.warn(`[getAkyoDataFromJSONIfExists] Error fetching ${lang}:`, error);
    return null;
  }
}

/**
 * Normalize JSON data to ensure consistent AkyoData structure
 * Handles both array format and wrapped format with metadata
 */
function normalizeJsonData(json: unknown): AkyoData[] {
  // If it's an array, use directly
  if (Array.isArray(json)) {
    return json.map(normalizeAkyoItem);
  }
  
  // If it's an object with data array
  if (json && typeof json === 'object' && 'data' in json) {
    const wrapped = json as { data: unknown[] };
    if (Array.isArray(wrapped.data)) {
      return wrapped.data.map(normalizeAkyoItem);
    }
  }
  
  console.warn('[normalizeJsonData] Unexpected JSON format:', typeof json);
  return [];
}

/**
 * Normalize a single Akyo item to ensure all required fields exist
 */
function normalizeAkyoItem(item: unknown): AkyoData {
  const raw = item as Record<string, unknown>;
  
  const category = String(raw.category || raw.attribute || '');
  const comment = String(raw.comment || raw.notes || '');
  const author = String(raw.author || raw.creator || '');
  
  return {
    id: String(raw.id || ''),
    appearance: '', // Deprecated field
    nickname: String(raw.nickname || ''),
    avatarName: String(raw.avatarName || ''),
    
    // Standardized fields
    category,
    comment,
    author,
    
    // Backward compatibility fields
    attribute: category,
    notes: comment,
    creator: author,
    
    avatarUrl: String(raw.avatarUrl || ''),
  };
}
