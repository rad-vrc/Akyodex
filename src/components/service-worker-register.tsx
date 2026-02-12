'use client';

import { useEffect, useState } from 'react';

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker and provides update notifications
 */
export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service Workers not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        console.log('[SW] Registering Service Worker...');
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        console.log('[SW] Service Worker registered:', reg.scope);

        // Check for updates on initial load
        reg.update();

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[SW] New version available!');
              setUpdateAvailable(true);
            }
          });
        });

        // Check for updates every hour
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        // Log detailed error information
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SW] Registration failed:', errorMessage);
        
        // Don't report to Sentry for expected failures (e.g., private browsing, unsupported)
        const isExpectedError = 
          errorMessage.includes('Service Workers are not supported') ||
          errorMessage.includes('The operation is insecure') ||
          errorMessage.includes('Failed to register a ServiceWorker');
        
        if (!isExpectedError && typeof window !== 'undefined' && 'Sentry' in window) {
          // Only report unexpected errors to Sentry
          console.warn('[SW] Unexpected registration error, may be reported to Sentry');
        }
      }
    };

    // Register on load
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
      return () => window.removeEventListener('load', registerServiceWorker);
    }
  }, []);

  // Handle update click
  const handleUpdate = () => {
    if (!registration || !registration.waiting) return;

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload the page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  };

  // Update notification UI
  if (!updateAvailable) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-[9999] max-w-sm bg-white rounded-lg shadow-2xl border-2 border-orange-500 p-4 animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            新しいバージョンが利用可能です
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            最新の機能と改善を利用するには、更新してください。
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              今すぐ更新
            </button>
            <button
              type="button"
              onClick={() => setUpdateAvailable(false)}
              className="px-3 text-gray-500 hover:text-gray-700 transition-colors text-sm"
              aria-label="閉じる"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
