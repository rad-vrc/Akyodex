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
import { getAkyoData, getAllAttributes, getAllCreators } from '@/lib/akyo-data-server';
import { ZukanClient } from './zukan-client';
import { LoadingSpinner } from '@/components/loading-spinner';

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
 * Server Component: Fetch data and render client component
 */
export default async function ZukanPage() {
  // Server-side data fetching with ISR
  const [data, attributes, creators] = await Promise.all([
    getAkyoData('ja'),
    getAllAttributes('ja'),
    getAllCreators('ja'),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ZukanClient
        initialData={data}
        attributes={attributes}
        creators={creators}
      />
    </Suspense>
  );
}
