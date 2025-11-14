import { AdminClient } from './admin-client';
import { getAllAttributes, getAllCreators, getAkyoData } from '@/lib/akyo-data-server';

export const metadata = {
  title: 'Akyoずかん - ファインダーモード',
  description: '管理者用ファインダーモード',
  robots: 'noindex, nofollow',
};

/**
 * Admin Page (Server Component)
 * 管理画面のメインページ - 属性と作者のリストをサーバーで取得
 */
export default async function AdminPage() {
  // サーバーサイドで属性、作者、全データを取得
  const [attributes, creators, akyoData] = await Promise.all([
    getAllAttributes('ja'),
    getAllCreators('ja'),
    getAkyoData('ja'),
  ]);

  return <AdminClient attributes={attributes} creators={creators} akyoData={akyoData} />;
}
