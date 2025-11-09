'use client';

import { useEffect } from 'react';

// Delay in milliseconds to wait for Dify chatbot to load before initializing observers
const DIFY_LOAD_DELAY_MS = 1000;

/**
 * Dify Chatbot Handler Component
 * 
 * Monitors the Dify chatbot window state and removes rotation animation
 * from the button when the chat window is open.
 */
export function DifyChatbotHandler() {
  useEffect(() => {
    // Function to check if chat window is visible
    const checkWindowState = () => {
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      const chatButton = document.getElementById('dify-chatbot-bubble-button');
      
      if (chatWindow && chatButton) {
        const isVisible = chatWindow.style.display !== 'none' && 
                         window.getComputedStyle(chatWindow).display !== 'none';
        
        // Add or remove class based on window visibility
        if (isVisible) {
          chatButton.classList.add('chat-window-open');
        } else {
          chatButton.classList.remove('chat-window-open');
        }
      }
    };

    // Check initial state after a delay to ensure Dify has loaded
    const initialCheckTimer = setTimeout(checkWindowState, DIFY_LOAD_DELAY_MS);

    // Create a MutationObserver to watch for changes to the chat window
    const observer = new MutationObserver(() => {
      checkWindowState();
    });

    // Start observing after Dify has had time to load
    const observerTimer = setTimeout(() => {
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      if (chatWindow) {
        observer.observe(chatWindow, {
          attributes: true,
          attributeFilter: ['style'],
        });
      }
      
      // Also observe the parent container in case elements are added/removed
      const container = document.getElementById('dify-chatbot-container');
      if (container) {
        observer.observe(container, {
          childList: true,
          subtree: true,
        });
      }
    }, DIFY_LOAD_DELAY_MS);

    // Cleanup
    return () => {
      clearTimeout(initialCheckTimer);
      clearTimeout(observerTimer);
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
}
