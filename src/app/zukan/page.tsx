/**
 * Zukan Page - Server Component (Static Generation)
 * 
 * Performance optimizations:
 * - Static generation at build time
 * - ISR (Incremental Static Regeneration) every hour
 * - Parallel data fetching with React cache()
 * - Language detection moved to client-side for static caching
 * 
 * Data is pre-rendered with Japanese (default language).
 * Client component handles language detection and refetching if needed.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
// Phase 4: Using unified data module with JSON support
import { getAkyoData, getAllCategories, getAllAuthors } from '@/lib/akyo-data';
import { ZukanClient } from './zukan-client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { DEFAULT_LANGUAGE } from '@/lib/i18n';

// Dynamic rendering to ensure CSP nonce consistency
// middleware.ts generates a new nonce per request → layout.tsx reads it via headers()
// Static/ISR would freeze the nonce in cached HTML, causing mismatch (Issue #270)
export const dynamic = 'force-dynamic';

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
 * Server Component: Fetch data and render client component
 * 
 * Static Generation Optimization:
 * - Pre-renders with default language (Japanese)
 * - Parallel data fetching with Promise.all()
 * - React cache() prevents duplicate fetches
 * - ISR ensures CDN can cache this page for 1 hour
 * - Client handles language detection and refetching if needed
 */
export default async function ZukanPage() {
  // Use default language for static generation
  // Client component will detect user's language and refetch if needed
  const lang = DEFAULT_LANGUAGE;

  // Parallel data fetching with React cache() deduplication
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
        serverLang={lang}
      />
    </Suspense>
  );
}
