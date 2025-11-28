'use client';

/**
 * Tools Tab Component
 * ツールタブ
 */
export function ToolsTab() {
  const handleDownloadCsv = async (lang: 'ja' | 'en') => {
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
        <i className="fas fa-tools text-red-500 mr-2"></i> 管理ツール
      </h2>

      <div className="space-y-6">
        {/* CSVエクスポート */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            <i className="fas fa-download mr-2"></i> CSVエクスポート
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
              <i className="fas fa-download mr-2"></i> 日本語版
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCsv('en')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <i className="fas fa-download mr-2"></i> English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
