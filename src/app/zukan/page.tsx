/**
 * Zukan Page - Server Component (SSG + ISR)
 * 
 * Performance optimizations:
 * - Static generation at build time (Phase 1-A)
 * - ISR (Incremental Static Regeneration) every hour
 * - Parallel data fetching with React cache()
 * - Client Component for interactivity only
 * 
 * Phase 1-A Implementation:
 * - Optimized for static generation where possible
 * - Language detection moved to client-side for better caching
 * - Server-side rendering only when necessary
 */

// Ensure this page is rendered dynamically (not statically) because it reads headers/cookies
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
// Phase 4: Using unified data module with JSON support
import { getAkyoData, getAllCategories, getAllAuthors } from '@/lib/akyo-data';
import { ZukanClient } from './zukan-client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isValidLanguage, type SupportedLanguage } from '@/lib/i18n';

// ISR: Revalidate every hour (3600 seconds)
export const revalidate = 3600;

// Dynamic metadata
export const metadata: Metadata = {
  title: 'Akyoずかん - VRChatアバター Akyo図鑑',
  description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
  openGraph: {
    title: 'Akyoずかん - VRChatアバター Akyo図鑑',
    description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
    type: 'website',
  },
};

/**
 * Get language from middleware header or cookie
 * Phase 1-A: Optimized with try-catch for better error handling
 */
async function getLanguage(): Promise<SupportedLanguage> {
  try {
    // 1. Check middleware header (set by country/accept-language detection)
    const headersList = await headers();
    const middlewareLang = headersList.get('x-akyo-lang');
    if (middlewareLang && isValidLanguage(middlewareLang)) {
      return middlewareLang;
    }

    // 2. Check cookie (user preference)
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get('AKYO_LANG')?.value;
    if (cookieLang && isValidLanguage(cookieLang)) {
      return cookieLang;
    }
  } catch (error) {
    // Gracefully fallback to default if headers/cookies fail
    console.warn('[getLanguage] Error reading headers/cookies:', error);
  }

  // 3. Default to Japanese
  return 'ja';
}

/**
 * Server Component: Fetch data and render client component
 * 
 * Phase 1-A Optimization:
 * - Parallel data fetching with Promise.all()
 * - React cache() prevents duplicate fetches (implemented in akyo-data-server.ts)
 * - ISR ensures CDN can cache this page for 1 hour
 * - Suspense boundary for better loading UX
 */
export default async function ZukanPage() {
  // Get language from headers/cookies with fallback
  const lang = await getLanguage();

  // Phase 1-A: Parallel data fetching with React cache() deduplication
  // All three functions are wrapped with cache() to prevent duplicate fetches
  const [data, categories, authors] = await Promise.all([
    getAkyoData(lang),
    getAllCategories(lang),
    getAllAuthors(lang),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ZukanClient
        initialData={data}
        categories={categories}
        authors={authors}
        // 互換性のため旧プロップスも渡す
        attributes={categories}
        creators={authors}
        initialLang={lang}
      />
    </Suspense>
  );
}
