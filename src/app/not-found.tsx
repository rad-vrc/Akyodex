/**
 * Custom 404 Not Found Page
 *
 * Displayed when a user navigates to a non-existent route.
 * Next.js automatically returns a 404 status code.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
        {/* 404 Icon */}
        <div className="text-8xl mb-6">
          <span role="img" aria-label="confused face">😵</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          404
        </h1>
        <h2 className="text-xl font-bold text-gray-600 mb-4">
          ページが見つかりません
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          お探しのページは存在しないか、<br />
          移動した可能性があります。
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/zukan"
            className="block w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            Akyoずかんに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
