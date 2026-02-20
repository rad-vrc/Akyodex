'use client';

import { captureMessageSafely } from '@/lib/sentry-browser';
import { useReportWebVitals } from 'next/web-vitals';

/**
 * WebVitals Component
 * Monitors core web vitals (CLS, FID, FCP, LCP, TTFB) and reports them
 * to Sentry in production environments.
 * 
 * @returns null (behavior-only component)
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      });
      return;
    }

    // ノイズ削減: 悪化(poor)のみをSentryに送る
    if (metric.rating !== 'poor') {
      return;
    }

    captureMessageSafely(`Web Vitals degraded: ${metric.name}`, {
      level: 'warning',
      tags: {
        web_vital: metric.name,
        rating: metric.rating,
      },
      fingerprint: ['web-vitals', metric.name, metric.rating],
      extra: {
        value: metric.value,
        navigationType: metric.navigationType,
      },
    });
  });

  return null;
}
