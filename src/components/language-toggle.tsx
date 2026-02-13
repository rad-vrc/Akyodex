'use client';

/**
 * Language Toggle Button Component
 *
 * Features:
 * - Floating button (like original site)
 * - Cycle through Japanese, English, and Korean
 * - Toggle order: ja → en → ko → ja
 * - Persistent via cookie
 * - Smooth transition
 */

import {
    DEFAULT_LANGUAGE,
    getNextLanguage,
    LANGUAGE_NAMES,
    LANGUAGE_TOGGLE_LABELS,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
} from '@/lib/i18n';
import { useEffect, useState } from 'react';

interface LanguageToggleProps {
  initialLang?: SupportedLanguage;
  className?: string;
}

export function LanguageToggle({ initialLang = DEFAULT_LANGUAGE, className = '' }: LanguageToggleProps) {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(initialLang);
  const [isChanging, setIsChanging] = useState(false);

  const nextLanguage = getNextLanguage(currentLang);
  const nextLanguageLabel = LANGUAGE_NAMES[nextLanguage];

  // Read language from cookie on mount (client-side only)
  useEffect(() => {
    // ロバストなパース: セミコロン後のスペース有無に関わらず対応
    const cookieLang = document.cookie
      .split(';')
      .find(row => row.trim().startsWith('AKYO_LANG='))
      ?.split('=')[1]
      ?.trim() as SupportedLanguage | undefined;

    if (cookieLang && SUPPORTED_LANGUAGES.includes(cookieLang as SupportedLanguage)) {
      setCurrentLang(cookieLang as SupportedLanguage);
    }
  }, []);

  const handleToggle = async () => {
    if (isChanging) return;

    setIsChanging(true);
    try {
      // Set cookie with immediate effect (Secure flag on HTTPS)
      const isSecure = window.location.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';
      document.cookie = `AKYO_LANG=${nextLanguage}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secureFlag}`;

      // Update state immediately
      setCurrentLang(nextLanguage);

      // Hard reload for instant language change (faster than router.refresh())
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
      setIsChanging(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isChanging}
      className={`
        language-toggle-btn
        ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
    `}
      aria-label={`Switch to ${nextLanguageLabel}`}
      title={`Switch to ${nextLanguageLabel}`}
    >
      <span className="text-lg font-bold">
        {LANGUAGE_TOGGLE_LABELS[currentLang]}
      </span>
    </button>
  );
}
