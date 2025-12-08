/**
 * Client-side Language Detection Hook
 * 
 * Detects user's preferred language from:
 * 1. Cookie (user preference)
 * 2. Navigator language (browser setting)
 * 
 * This enables static generation of pages while still
 * supporting language switching on the client side.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  DEFAULT_LANGUAGE, 
  SUPPORTED_LANGUAGES,
  type SupportedLanguage 
} from '@/lib/i18n';

const LANGUAGE_COOKIE = 'AKYO_LANG';

/**
 * Get language from cookie
 * Uses robust parsing that handles cookies with or without spaces after semicolons
 */
function getLanguageFromCookie(): SupportedLanguage | null {
  if (typeof document === 'undefined') return null;
  
  const cookieLang = document.cookie
    .split(';')
    .find(row => row.trim().startsWith(`${LANGUAGE_COOKIE}=`))
    ?.split('=')[1]
    ?.trim();

  if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang as SupportedLanguage)) {
    return cookieLang as SupportedLanguage;
  }
  
  return null;
}

/**
 * Detect language from navigator (browser setting)
 */
function detectLanguageFromNavigator(): SupportedLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  
  const browserLang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || '';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  if (SUPPORTED_LANGUAGES.includes(langCode as SupportedLanguage)) {
    return langCode as SupportedLanguage;
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Set language cookie
 * Adds Secure flag when running on HTTPS (production)
 */
function setLanguageCookie(lang: SupportedLanguage): void {
  if (typeof document === 'undefined') return;
  
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secureFlag}`;
}

interface UseLanguageResult {
  /** Current language */
  lang: SupportedLanguage;
  /** Whether the language has been detected */
  isReady: boolean;
  /** Whether the detected language differs from the server-rendered language */
  needsRefetch: boolean;
  /** Change language and reload */
  setLanguage: (lang: SupportedLanguage) => void;
}

/**
 * Hook for client-side language detection
 * 
 * @param serverLang - Language used for server-side rendering (default: 'ja')
 * @returns Language state and utilities
 */
export function useLanguage(serverLang: SupportedLanguage = DEFAULT_LANGUAGE): UseLanguageResult {
  const [lang, setLang] = useState<SupportedLanguage>(serverLang);
  const [isReady, setIsReady] = useState(false);
  const [needsRefetch, setNeedsRefetch] = useState(false);

  // Detect language on mount (client-side only)
  useEffect(() => {
    // Priority: Cookie > Navigator
    const cookieLang = getLanguageFromCookie();
    const detectedLang = cookieLang || detectLanguageFromNavigator();
    
    // If no cookie, save the detected language
    if (!cookieLang) {
      setLanguageCookie(detectedLang);
    }
    
    setLang(detectedLang);
    setNeedsRefetch(detectedLang !== serverLang);
    setIsReady(true);
  }, [serverLang]);

  const handleSetLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageCookie(newLang);
    setLang(newLang);
    // Reload to apply the new language
    window.location.reload();
  }, []);

  return {
    lang,
    isReady,
    needsRefetch,
    setLanguage: handleSetLanguage,
  };
}
