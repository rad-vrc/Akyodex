'use client';

/**
 * Tools Tab Component
 * ツールタブ
 */
export function ToolsTab() {
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
          <button
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <i className="fas fa-download mr-2"></i> CSVをダウンロード
          </button>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-600">
        <i className="fas fa-info-circle mr-1"></i>
        ツール機能は実装中です
      </p>
    </div>
  );
}
