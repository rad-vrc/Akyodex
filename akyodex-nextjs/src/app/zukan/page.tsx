/**
 * Zukan Page - Server Component (SSG + ISR)
 * 
 * This page uses:
 * - Server Components for data fetching
 * - ISR (Incremental Static Regeneration) every hour
 * - Client Component for interactivity
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
import { getAkyoData, getAllAttributes, getAllCreators } from '@/lib/akyo-data-server';
import { ZukanClient } from './zukan-client';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isValidLanguage, type SupportedLanguage } from '@/lib/i18n';

// ISR: Revalidate every hour (3600 seconds)
export const revalidate = 3600;

// Dynamic metadata
export const metadata: Metadata = {
  title: 'Akyoずかん - VRChatアバター図鑑',
  description: '500体以上のVRChatアバター「Akyo」を検索・閲覧できる図鑑。属性、作者、お気に入り機能付き。',
  openGraph: {
    title: 'Akyoずかん - VRChatアバター図鑑',
    description: '500体以上のVRChatアバター「Akyo」を検索・閲覧できる図鑑',
    type: 'website',
  },
};

/**
 * Get language from middleware header or cookie
 */
async function getLanguage(): Promise<SupportedLanguage> {
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

  // 3. Default to Japanese
  return 'ja';
}

/**
 * Server Component: Fetch data and render client component
 */
export default async function ZukanPage() {
  // Get language from headers/cookies
  const lang = await getLanguage();

  // Server-side data fetching with ISR (language-specific)
  const [data, attributes, creators] = await Promise.all([
    getAkyoData(lang),
    getAllAttributes(lang),
    getAllCreators(lang),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ZukanClient
        initialData={data}
        attributes={attributes}
        creators={creators}
        initialLang={lang}
      />
    </Suspense>
  );
}
