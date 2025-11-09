import { test } from '@playwright/test';

/**
 * Visual verification test for Dify chatbot rotation fix
 * This test captures screenshots to demonstrate the fix working
 */

test('Visual verification: Chatbot rotation behavior', async ({ page }) => {
  // Navigate to the Zukan page
  await page.goto('http://localhost:3000/zukan');
  
  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');
  
  // Wait for the chatbot button to appear
  await page.waitForSelector('#dify-chatbot-bubble-button', { timeout: 15000 });
  
  // Wait for Dify to be fully loaded and initialized
  await page.waitForFunction(() => {
    const button = document.getElementById('dify-chatbot-bubble-button');
    return button !== null;
  }, { timeout: 5000 });
  
  // Take screenshot 1: Initial state with rotation
  console.log('📸 Taking screenshot 1: Button with rotation animation (before opening)');
  await page.screenshot({ 
    path: 'tests/screenshots/visual-1-button-rotating.png', 
    fullPage: false 
  });
  
  // Click the chatbot button to open the window
  await page.click('#dify-chatbot-bubble-button');
  
  // Wait for the 'chat-window-open' class to be added
  await page.waitForFunction(() => {
    const button = document.getElementById('dify-chatbot-bubble-button');
    return button?.classList.contains('chat-window-open');
  }, { timeout: 5000 });
  
  // Take screenshot 2: Window open, rotation stopped
  console.log('📸 Taking screenshot 2: Window open, rotation stopped');
  await page.screenshot({ 
    path: 'tests/screenshots/visual-2-window-open-no-rotation.png', 
    fullPage: false 
  });
  
  // Verify the class was added
  const hasClass = await page.evaluate(() => {
    const button = document.getElementById('dify-chatbot-bubble-button');
    return button?.classList.contains('chat-window-open');
  });
  console.log(`✅ Button has 'chat-window-open' class: ${hasClass}`);
  
  // Close the window by clicking the button again
  await page.click('#dify-chatbot-bubble-button');
  
  // Wait for the 'chat-window-open' class to be removed
  await page.waitForFunction(() => {
    const button = document.getElementById('dify-chatbot-bubble-button');
    return !button?.classList.contains('chat-window-open');
  }, { timeout: 5000 });
  
  // Take screenshot 3: Window closed, rotation restored
  console.log('📸 Taking screenshot 3: Window closed, rotation restored');
  await page.screenshot({ 
    path: 'tests/screenshots/visual-3-button-rotating-again.png', 
    fullPage: false 
  });
  
  // Verify the class was removed
  const hasClassAfter = await page.evaluate(() => {
    const button = document.getElementById('dify-chatbot-bubble-button');
    return button?.classList.contains('chat-window-open');
  });
  console.log(`✅ Button 'chat-window-open' class removed: ${!hasClassAfter}`);
  
  console.log('✨ Visual verification complete! Check screenshots in tests/screenshots/');
});
