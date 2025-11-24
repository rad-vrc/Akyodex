/**
 * Server-Side Data Loading for Akyoずかん
 *
 * This module handles CSV data fetching from GitHub with:
 * - ISR (Incremental Static Regeneration) every hour
 * - Automatic language fallback (en -> ja)
 * - Type-safe data parsing
 * - Error handling with retry logic
 */

import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData } from '@/types/akyo';
import { parseCsvToAkyoData } from './csv-utils';
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER || 'rad-vrc';
const GITHUB_REPO = process.env.GITHUB_REPO_NAME || 'Akyodex';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

interface FetchAkyoDataOptions {
  lang?: SupportedLanguage;
  bustCache?: boolean;
}

interface FetchResult {
  data: AkyoData[];
  metadata: {
    rowCount: number;
    language: SupportedLanguage;
    usedFallback: boolean;
    sourceUrl: string;
    fetchedAt: string;
  };
}

/**
 * Fetch Akyo CSV data from GitHub with ISR support
 *
 * @param options - Configuration options
 * @returns Parsed Akyo data with metadata
 */
async function fetchAkyoData(
  options: FetchAkyoDataOptions = {}
): Promise<FetchResult> {
  const { lang = 'ja', bustCache = false } = options;

  // Determine CSV filename based on language
  // English uses akyo-data-US.csv (original format)
  const csvFileName = lang === 'en' ? 'akyo-data-US.csv' : 'akyo-data.csv';
  const baseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data`;

  let url = `${baseUrl}/${csvFileName}`;
  let usedFallback = false;
  let actualLang = lang;

  console.log(`[fetchAkyoData] Fetching ${lang} CSV from: ${url}`);

  try {
    // First attempt: requested language
    let response = await fetch(url, {
      next: bustCache ? { revalidate: 0 } : { revalidate: 3600 }, // ISR: 1 hour
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    // Fallback to Japanese if requested language not found
    if (!response.ok && lang !== 'ja') {
      console.log(`[fetchAkyoData] ${lang} CSV not found (${response.status}), falling back to Japanese`);
      usedFallback = true;
      actualLang = 'ja';
      url = `${baseUrl}/akyo-data.csv`;

      response = await fetch(url, {
        next: bustCache ? { revalidate: 0 } : { revalidate: 3600 },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    // Parse CSV data
    const data = parseCsvToAkyoData(text);

    // Count rows (lines starting with 4 digits, with or without quotes)
    // Handles both 0001, and "0001",
    const rowCount = (text.match(/^"?\d{4}"?,/gm) || []).length;

    const result: FetchResult = {
      data,
      metadata: {
        rowCount,
        language: actualLang,
        usedFallback,
        sourceUrl: url,
        fetchedAt: new Date().toISOString(),
      },
    };

    console.log(`[fetchAkyoData] Success: ${rowCount} rows, lang=${actualLang}, fallback=${usedFallback}`);

    return result;

  } catch (error) {
    console.error('[fetchAkyoData] Error:', error);
    throw new Error(
      `Failed to fetch Akyo data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Akyo data with default options (for most common use case)
 *
 * @param lang - Language code (default: 'ja')
 * @returns Array of Akyo data
 */
export async function getAkyoData(lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> {
  const result = await fetchAkyoData({ lang });
  return result.data;
}

/**
 * Get all unique categories (formerly attributes) from the dataset
 *
 * @param lang - Language code
 * @returns Array of unique categories
 */
export async function getAllCategories(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  const data = await getAkyoData(lang);
  const categoriesSet = new Set<string>();

  data.forEach((akyo) => {
    const cats = akyo.category.split(/[、,]/).map((c) => c.trim()).filter(Boolean);
    cats.forEach((cat) => categoriesSet.add(cat));
  });

  return Array.from(categoriesSet).sort();
}

/**
 * @deprecated Use getAllCategories instead
 */
export async function getAllAttributes(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  return getAllCategories(lang);
}

/**
 * Get all unique authors (formerly creators) from the dataset
 *
 * @param lang - Language code
 * @returns Array of unique authors
 */
export async function getAllAuthors(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  const data = await getAkyoData(lang);
  const authorsSet = new Set<string>();

  data.forEach((akyo) => {
    const authors = akyo.author.split(/[、,]/).map((a) => a.trim()).filter(Boolean);
    authors.forEach((author) => authorsSet.add(author));
  });

  return Array.from(authorsSet).sort();
}

/**
 * @deprecated Use getAllAuthors instead
 */
export async function getAllCreators(lang: SupportedLanguage = 'ja'): Promise<string[]> {
  return getAllAuthors(lang);
}
