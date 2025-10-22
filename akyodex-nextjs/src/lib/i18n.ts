/**
 * Internationalization (i18n) utilities
 * 
 * Features:
 * - Auto-detect language from headers
 * - Manual language switching
 * - localStorage persistence
 */

export type SupportedLanguage = 'ja' | 'en';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ja', 'en'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ja';

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ja: '日本語',
  en: 'English',
};

/**
 * Language toggle labels
 */
export const LANGUAGE_TOGGLE_LABELS: Record<SupportedLanguage, string> = {
  ja: 'EN', // Shows "EN" when current is Japanese
  en: 'JP', // Shows "JP" when current is English
};

/**
 * Detect language from Accept-Language header
 * 
 * Priority:
 * 1. Exact match (ja, en)
 * 2. Language prefix (ja-JP -> ja, en-US -> en)
 * 3. Default (ja)
 */
export function detectLanguageFromHeader(acceptLanguage: string | null): SupportedLanguage {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  // Parse Accept-Language header
  // Format: "en-US,en;q=0.9,ja;q=0.8"
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.split(';');
      const q = qValue ? parseFloat(qValue.replace('q=', '')) : 1.0;
      return { code: code.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q); // Sort by quality value (highest first)

  // Find first supported language
  for (const { code } of languages) {
    // Exact match
    if (SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)) {
      return code as SupportedLanguage;
    }
    
    // Prefix match (en-US -> en)
    const prefix = code.split('-')[0] as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.includes(prefix)) {
      return prefix;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Get language from country code
 * 
 * This uses Cloudflare's cf.country header
 */
export function getLanguageFromCountry(countryCode: string | null): SupportedLanguage {
  if (!countryCode) return DEFAULT_LANGUAGE;

  const country = countryCode.toUpperCase();

  // English-speaking countries
  const englishCountries = [
    'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 
    'SG', 'IN', 'PH', 'MY', 'ZA'
  ];

  if (englishCountries.includes(country)) {
    return 'en';
  }

  // Japan
  if (country === 'JP') {
    return 'ja';
  }

  // Default to Japanese for other countries
  return DEFAULT_LANGUAGE;
}

/**
 * Validate language code
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Get next language in cycle (for toggle button)
 */
export function getNextLanguage(current: SupportedLanguage): SupportedLanguage {
  const currentIndex = SUPPORTED_LANGUAGES.indexOf(current);
  const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
  return SUPPORTED_LANGUAGES[nextIndex];
}
