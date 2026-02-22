import './admin.css';
import { AdminClient } from './admin-client';
// Phase 4: Using unified data module with JSON support
import { getAllCategories, getAllAuthors, getAkyoData } from '@/lib/akyo-data';

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
  const [categories, authors, akyoData] = await Promise.all([
    getAllCategories('ja'),
    getAllAuthors('ja'),
    getAkyoData('ja'),
  ]);

  return (
    <AdminClient 
      categories={categories} 
      authors={authors} 
      // 互換性のため旧プロップスも渡す
      attributes={categories} 
      creators={authors} 
      akyoData={akyoData} 
    />
  );
}
