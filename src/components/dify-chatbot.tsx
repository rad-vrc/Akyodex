'use client';

import { useEffect, useState } from 'react';

// Delay in milliseconds to wait for Dify chatbot to load before initializing observers
const DIFY_LOAD_DELAY_MS = 2000;
// Maximum wait for Dify DOM to appear after script onload
const DIFY_MOUNT_TIMEOUT_MS = 8000;
const DIFY_MOUNT_POLL_INTERVAL_MS = 250;

declare global {
  interface Window {
    difyChatbotConfig?: { token: string; dynamicScript?: boolean };
  }
}

interface DifyChatbotProps {
  token: string;
}

/**
 * Dify Chatbot Component
 *
 * Initializes the Dify chatbot by setting window.difyChatbotConfig and
 * dynamically loading the embed script. This approach avoids CSP nonce
 * issues with inline <Script> tags in Next.js App Router.
 *
 * Also monitors the chatbot window state and removes rotation animation
 * from the button when the chat window is open.
 */
export function DifyChatbot({ token }: DifyChatbotProps) {
  const [loadState, setLoadState] = useState<'idle' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    setLoadState('idle');
    let isDisposed = false;
    let mountPollTimer: ReturnType<typeof setInterval> | null = null;

    const hasMountedChatbotDom = () =>
      Boolean(
        document.getElementById('dify-chatbot-bubble-button') &&
          document.getElementById('dify-chatbot-bubble-window')
      );

    const markLoadedIfMounted = () => {
      if (!hasMountedChatbotDom()) return false;
      if (!isDisposed) {
        setLoadState((current) => (current === 'error' ? current : 'loaded'));
      }
      return true;
    };

    // Set config — dynamicScript: true ensures embed.min.js calls embedChatbot()
    // immediately in the IIFE, instead of setting document.body.onload (which
    // has already fired by the time afterInteractive scripts load).
    window.difyChatbotConfig = { token, dynamicScript: true };

    // Dynamically load embed.min.js — loads from udify.app which is permitted
    // by the CSP script-src allowlist, no nonce needed for external scripts
    // matching a domain pattern.
    const existingScript = document.getElementById('dify-chatbot-embed');
    if (existingScript) {
      existingScript.remove();
    }
    const script = document.createElement('script');
    script.id = 'dify-chatbot-embed';
    script.src = 'https://udify.app/embed.min.js';
    script.async = true;
    script.onload = () => {
      if (markLoadedIfMounted()) return;

      const mountDeadline = Date.now() + DIFY_MOUNT_TIMEOUT_MS;
      mountPollTimer = setInterval(() => {
        if (isDisposed) return;
        if (markLoadedIfMounted()) {
          if (mountPollTimer) {
            clearInterval(mountPollTimer);
            mountPollTimer = null;
          }
          return;
        }
        if (Date.now() < mountDeadline) return;

        if (mountPollTimer) {
          clearInterval(mountPollTimer);
          mountPollTimer = null;
        }
        console.error(
          '[DifyChatbot] embed.min.js loaded but chatbot DOM did not mount in time. This may indicate CSP blocked inline bootstrap code.',
          { timeoutMs: DIFY_MOUNT_TIMEOUT_MS }
        );
        setLoadState('error');
      }, DIFY_MOUNT_POLL_INTERVAL_MS);
    };
    script.onerror = (event) => {
      console.error('[DifyChatbot] Failed to load embed script:', {
        src: script.src,
        event,
      });
      setLoadState('error');
    };
    document.body.appendChild(script);

    // --- Window state observer ---
    // Monitors Dify chatbot window visibility and toggles the
    // 'chat-window-open' class on the bubble button to control
    // the rotation animation.
    const checkWindowState = () => {
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      const chatButton = document.getElementById('dify-chatbot-bubble-button');

      if (chatWindow && chatButton) {
        const isVisible =
          chatWindow.style.display !== 'none' &&
          window.getComputedStyle(chatWindow).display !== 'none';

        if (isVisible) {
          chatButton.classList.add('chat-window-open');
        } else {
          chatButton.classList.remove('chat-window-open');
        }
      }
    };

    const initialCheckTimer = setTimeout(checkWindowState, DIFY_LOAD_DELAY_MS);

    const observer = new MutationObserver(() => {
      checkWindowState();
    });

    let hasWindowObserver = false;
    let hasContainerObserver = false;
    let observerTimer: ReturnType<typeof setTimeout> | null = null;
    let bodyObserver: MutationObserver | null = null;

    const attachTargetObservers = () => {
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      if (chatWindow && !hasWindowObserver) {
        observer.observe(chatWindow, {
          attributes: true,
          attributeFilter: ['style'],
        });
        hasWindowObserver = true;
      }

      const container = document.getElementById('dify-chatbot-container');
      if (container && !hasContainerObserver) {
        observer.observe(container, {
          childList: true,
          subtree: true,
        });
        hasContainerObserver = true;
      }

      if (hasWindowObserver || hasContainerObserver) {
        checkWindowState();
      }

      markLoadedIfMounted();

      if (hasWindowObserver && hasContainerObserver) {
        if (observerTimer) {
          clearTimeout(observerTimer);
          observerTimer = null;
        }
        bodyObserver?.disconnect();
        return true;
      }
      return false;
    };

    bodyObserver = new MutationObserver(() => {
      attachTargetObservers();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    if (!attachTargetObservers()) {
      observerTimer = setTimeout(() => {
        if (!attachTargetObservers()) {
          console.error(
            '[DifyChatbot] Chatbot DOM targets not found after delay. This may indicate CSP blocked inline bootstrap code.',
            {
              delayMs: DIFY_LOAD_DELAY_MS,
            }
          );
          if (!isDisposed) {
            setLoadState('error');
          }
          bodyObserver?.disconnect();
          bodyObserver = null;
        }
      }, DIFY_LOAD_DELAY_MS);
    }

    return () => {
      isDisposed = true;
      clearTimeout(initialCheckTimer);
      if (observerTimer) clearTimeout(observerTimer);
      if (mountPollTimer) {
        clearInterval(mountPollTimer);
        mountPollTimer = null;
      }
      bodyObserver?.disconnect();
      observer.disconnect();
      const existingScript = document.getElementById('dify-chatbot-embed');
      if (existingScript) existingScript.remove();
      const container = document.getElementById('dify-chatbot-container');
      if (container) {
        container.classList.remove('dify-chatbot-load-failed');
        container.removeAttribute('data-dify-load-state');
      }
      delete window.difyChatbotConfig;
    };
  }, [token]);

  // This useEffect updates the externally rendered '#dify-chatbot-container'
  // element, which is mounted in zukan-client.tsx. The early return is required
  // because this component may run before that container exists.
  useEffect(() => {
    const container = document.getElementById('dify-chatbot-container');
    if (!container) return;

    if (loadState === 'error') {
      container.classList.add('dify-chatbot-load-failed');
      container.setAttribute('data-dify-load-state', 'error');
      return;
    }

    container.classList.remove('dify-chatbot-load-failed');
    container.setAttribute('data-dify-load-state', loadState);
  }, [loadState]);

  return null;
}
