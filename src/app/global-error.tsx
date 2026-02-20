'use client';

/**
 * Global Error Boundary
 *
 * Catches errors in the root layout itself.
 * Unlike error.tsx, this MUST render its own <html> and <body> tags
 * because it replaces the root layout when an error occurs.
 *
 * This is rarely triggered in practice — only when the root layout throws.
 */

import { useEffect } from 'react';
import { captureExceptionSafely } from '@/lib/sentry-browser';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureExceptionSafely(error, {
      level: 'fatal',
      tags: {
        boundary: 'global',
        has_digest: String(Boolean(error.digest)),
      },
      extra: {
        digest: error.digest,
      },
    });
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fff7ed, #fef2f2, #fdf2f8)',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>
              <span role="img" aria-label="warning">&#x26A0;&#xFE0F;</span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              重大なエラーが発生しました
            </h1>

            {/* Description */}
            <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: 1.6 }}>
              申し訳ありません。アプリケーションの読み込みに失敗しました。
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  color: 'white',
                  fontWeight: 500,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                もう一度試す
              </button>
              <a
                href="/zukan"
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'white',
                  color: '#374151',
                  fontWeight: 500,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #d1d5db',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              >
                図鑑に戻る
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
