/**
 * Zukan Page - Server Component (Dynamic Rendering)
 * 
 * Rendering strategy:
 * - Dynamic rendering per request (force-dynamic) to ensure CSP nonce consistency
 * - Parallel data fetching with React cache() + KV cache for performance
 * - Language detection moved to client-side
 * 
 * Data is fetched with Japanese (default language).
 * Client component handles language detection and refetching if needed.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
// Phase 4: Using unified data module with JSON support
import { getAkyoData, getAllCategories, getAllAuthors } from '@/lib/akyo-data';
import { ZukanClient } from './zukan-client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { DEFAULT_LANGUAGE } from '@/lib/i18n';

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
 * Dynamic Rendering:
 * - Pre-renders with default language (Japanese)
 * - Parallel data fetching with Promise.all()
 * - React cache() prevents duplicate fetches
 * - Client handles language detection and refetching if needed
 */
export default async function ZukanPage() {
  // Use default language for initial render
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
