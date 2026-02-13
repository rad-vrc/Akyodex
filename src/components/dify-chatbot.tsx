'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

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

    const observerTimer = setTimeout(() => {
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      if (chatWindow) {
        observer.observe(chatWindow, {
          attributes: true,
          attributeFilter: ['style'],
        });
      }

      const container = document.getElementById('dify-chatbot-container');
      if (container) {
        observer.observe(container, {
          childList: true,
          subtree: true,
        });
      }
    }, DIFY_LOAD_DELAY_MS);

    return () => {
      clearTimeout(initialCheckTimer);
      clearTimeout(observerTimer);
      observer.disconnect();
      const existingScript = document.getElementById('dify-chatbot-embed');
      if (existingScript) existingScript.remove();
      delete window.difyChatbotConfig;
    };
  }, [token]);

  return null;
}
