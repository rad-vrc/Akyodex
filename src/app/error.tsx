'use client';

/**
 * Root Error Boundary
 *
 * Catches uncaught exceptions in route segments (pages, layouts except root).
 * Must be a Client Component ('use client').
 * Next.js automatically wraps route segments with this error boundary.
 */

import { useEffect } from 'react';
import { captureExceptionSafely } from '@/lib/sentry-browser';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureExceptionSafely(error, {
      level: 'error',
      tags: {
        boundary: 'route',
        has_digest: String(Boolean(error.digest)),
      },
      extra: {
        digest: error.digest,
      },
    });
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
        {/* Error Icon */}
        <div className="text-8xl mb-6">
          <span role="img" aria-label="crying face">😢</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          エラーが発生しました
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          申し訳ありません。予期しないエラーが発生しました。<br />
          もう一度お試しください。
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            もう一度試す
          </button>
          <a
            href="/zukan"
            className="block w-full bg-white text-gray-700 font-medium py-3 px-6 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors"
          >
            図鑑に戻る
          </a>
        </div>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-left">
            <p className="text-xs text-gray-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 font-mono mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
