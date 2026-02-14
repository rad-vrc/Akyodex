'use client';

import { IconDownload, IconTools } from '@/components/icons';
import type { SupportedLanguage } from '@/lib/i18n';

/**
 * Tools Tab Component
 * ツールタブ
 */
export function ToolsTab() {
  const handleDownloadCsv = async (lang: SupportedLanguage) => {
    try {
      const response = await fetch(`/api/csv?lang=${lang}`);
      if (!response.ok) {
        throw new Error('CSVの取得に失敗しました');
      }
      const csvContent = await response.text();

      // ダウンロード用のBlobを作成
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // ダウンロードリンクを作成してクリック
      const link = document.createElement('a');
      link.href = url;
      link.download = `akyo-data-${lang}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV download error:', error);
      alert('CSVのダウンロードに失敗しました');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        <IconTools size="w-5 h-5" className="text-red-500 mr-2" /> 管理ツール
      </h2>

      <div className="space-y-6">
        {/* CSVエクスポート */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            <IconDownload size="w-4 h-4" className="mr-2" /> CSVエクスポート
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            現在のデータをCSVファイルとしてダウンロードします。バックアップにも使用できます。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownloadCsv('ja')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <IconDownload size="w-4 h-4" className="mr-2" /> 日本語版
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCsv('en')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <IconDownload size="w-4 h-4" className="mr-2" /> English
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCsv('ko')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <IconDownload size="w-4 h-4" className="mr-2" /> 한국어
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
