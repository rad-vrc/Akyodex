'use client';

/**
 * Language Toggle Button Component
 * 
 * Features:
 * - Floating button (like original site)
 * - Toggle between Japanese and English
 * - Persistent via cookie
 * - Smooth transition
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getNextLanguage, LANGUAGE_TOGGLE_LABELS, type SupportedLanguage } from '@/lib/i18n';

interface LanguageToggleProps {
  initialLang?: SupportedLanguage;
  className?: string;
}

export function LanguageToggle({ initialLang = 'ja', className = '' }: LanguageToggleProps) {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(initialLang);
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();

  // Read language from cookie on mount (client-side only)
  useEffect(() => {
    const cookieLang = document.cookie
      .split('; ')
      .find(row => row.startsWith('AKYO_LANG='))
      ?.split('=')[1] as SupportedLanguage | undefined;
    
    if (cookieLang && (cookieLang === 'ja' || cookieLang === 'en')) {
      setCurrentLang(cookieLang);
    }
  }, []);

  const handleToggle = async () => {
    if (isChanging) return;

    setIsChanging(true);
    const nextLang = getNextLanguage(currentLang);

    try {
      // Set cookie
      document.cookie = `AKYO_LANG=${nextLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
      
      // Update state
      setCurrentLang(nextLang);

      // Trigger page refresh to load new language data
      // Use router.refresh() to preserve client state
      router.refresh();

      // Show success feedback
      setTimeout(() => {
        setIsChanging(false);
      }, 300);
    } catch (error) {
      console.error('Failed to change language:', error);
      setIsChanging(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isChanging}
      className={`
        language-toggle-btn
        ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      aria-label={`Switch to ${currentLang === 'ja' ? 'English' : 'Japanese'}`}
      title={`Switch to ${currentLang === 'ja' ? 'English' : 'Japanese'}`}
    >
      <span className="text-lg font-bold">
        {LANGUAGE_TOGGLE_LABELS[currentLang]}
      </span>
    </button>
  );
}
