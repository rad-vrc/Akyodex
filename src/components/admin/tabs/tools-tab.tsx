'use client';

import { useRef } from 'react';

/**
 * Tools Tab Component
 * ツールタブ（完全再現）
 */
export function ToolsTab() {
  // Ref for file input (better than document.getElementById)
  const csvInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        <i className="fas fa-tools text-red-500 mr-2"></i> 管理ツール
      </h2>

      <div className="space-y-6">
        {/* ID再採番ツール */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            <i className="fas fa-sort-numeric-down mr-2"></i> ID再採番
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            すべてのAkyoのIDを連番に振り直します。削除などで欠番がある場合に使用します。
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <i className="fas fa-redo mr-2"></i> ID再採番を実行
          </button>
        </div>

        {/* CSVインポート */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            <i className="fas fa-file-csv mr-2"></i> CSVインポート
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            CSVファイルから一括でデータをインポートします。既存データは上書きされます。
          </p>

          {/* ドロップゾーン */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <i className="fas fa-file-upload text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-600">CSVファイルをドラッグ&ドロップ または</p>
            <input
              type="file"
              ref={csvInputRef}
              accept=".csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ファイルを選択
            </button>
          </div>
        </div>

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

        {/* 画像管理 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            <i className="fas fa-images mr-2"></i> 画像管理
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            未使用画像の削除や画像の一括アップロードなどの画像管理機能です。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <i className="fas fa-sync mr-2"></i> 画像リストを更新
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <i className="fas fa-trash mr-2"></i> 未使用画像を削除
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-600">
        <i className="fas fa-info-circle mr-1"></i>
        ツール機能は実装中です
      </p>
    </div>
  );
}
