'use client';

import { useReportWebVitals } from 'next/web-vitals';

// グローバルのSentry型定義
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, options?: {
        level?: string;
        tags?: Record<string, string>;
        extra?: Record<string, unknown>;
      }) => void;
    };
  }
}

/**
 * Web Vitals監視コンポーネント
 * CLS, FID, FCP, LCP, TTFBなどのパフォーマンス指標を測定
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // 本番環境でのみログ出力またはアナリティクスに送信
    if (process.env.NODE_ENV === 'production') {
      // Sentryに送信する場合
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureMessage(
          `Web Vitals: ${metric.name}`,
          {
            level: 'info',
            tags: {
              web_vital: metric.name,
            },
            extra: {
              value: metric.value,
              rating: metric.rating,
            },
          }
        );
      }

      // コンソールにログ出力（開発用）
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      });
    }
  });

  return null;
}
