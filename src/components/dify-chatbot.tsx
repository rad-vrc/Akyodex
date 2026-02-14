'use client';

import { useEffect, useRef, useState } from 'react';

// Delay in milliseconds to wait for Dify chatbot to load before initializing observers
const DIFY_LOAD_DELAY_MS = 2000;

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
  const initialized = useRef(false);
  const [loadState, setLoadState] = useState<'idle' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setLoadState('idle');

    // Set config — dynamicScript: true ensures embed.min.js calls embedChatbot()
    // immediately in the IIFE, instead of setting document.body.onload (which
    // has already fired by the time afterInteractive scripts load).
    window.difyChatbotConfig = { token, dynamicScript: true };

    // Dynamically load embed.min.js — loads from udify.app which is permitted
    // by the CSP script-src allowlist, no nonce needed for external scripts
    // matching a domain pattern.
    const script = document.createElement('script');
    script.id = 'dify-chatbot-embed';
    script.src = 'https://udify.app/embed.min.js';
    script.async = true;
    script.onload = () => {
      setLoadState('loaded');
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
          console.warn('[DifyChatbot] Chatbot DOM targets not found after delay', {
            delayMs: DIFY_LOAD_DELAY_MS,
          });
        }
      }, DIFY_LOAD_DELAY_MS);
    }

    return () => {
      clearTimeout(initialCheckTimer);
      if (observerTimer) clearTimeout(observerTimer);
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
    // token is expected to be immutable for this mounted instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
