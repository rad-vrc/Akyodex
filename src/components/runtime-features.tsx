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
const DIFY_ACTIVATION_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
];

interface RuntimeFeaturesProps {
  difyToken?: string;
}

export function RuntimeFeatures({ difyToken }: RuntimeFeaturesProps) {
  const [enabled, setEnabled] = useState(false);
  const [difyActivated, setDifyActivated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEnabled(true);
    }, RUNTIME_FEATURES_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!difyToken || difyActivated) return;

    const activateDify = () => {
      setDifyActivated(true);
    };

    DIFY_ACTIVATION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, activateDify, { once: true, passive: true });
    });

    return () => {
      DIFY_ACTIVATION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, activateDify);
      });
    };
  }, [difyToken, difyActivated]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <DeferredWebVitals />
      <DeferredServiceWorkerRegister />
      {difyToken && difyActivated ? <DeferredDifyChatbot token={difyToken} /> : null}
    </>
  );
}
