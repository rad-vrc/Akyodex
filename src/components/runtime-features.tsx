'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const DeferredWebVitals = dynamic(
  () => import('@/components/web-vitals').then((mod) => mod.WebVitals),
  { ssr: false }
);
const DeferredServiceWorkerRegister = dynamic(
  () =>
    import('@/components/service-worker-register').then((mod) => mod.ServiceWorkerRegister),
  { ssr: false }
);
const DeferredDifyChatbot = dynamic(
  () => import('@/components/dify-chatbot').then((mod) => mod.DifyChatbot),
  { ssr: false }
);

const RUNTIME_FEATURES_DELAY_MS = 3000;

interface RuntimeFeaturesProps {
  difyToken?: string;
}

export function RuntimeFeatures({ difyToken }: RuntimeFeaturesProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEnabled(true);
    }, RUNTIME_FEATURES_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <DeferredWebVitals />
      <DeferredServiceWorkerRegister />
      {difyToken ? <DeferredDifyChatbot token={difyToken} /> : null}
    </>
  );
}
