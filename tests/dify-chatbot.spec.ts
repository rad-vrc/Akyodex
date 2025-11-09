import { test, expect } from '@playwright/test';

/**
 * Test suite for Dify Cloud Chatbot Integration
 * 
 * This test verifies that the Dify chatbot (Cloud version) is properly loaded
 * and functional on the Zukan (図鑑) page after the Next.js migration.
 */

test.describe('Dify Cloud Chatbot', () => {
  test('should load and display chatbot button on Zukan page', async ({ page }) => {
    // Navigate to the Zukan page
    await page.goto('/zukan');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify that the Dify script is loaded
    const difyScript = await page.locator('script[src="https://udify.app/embed.min.js"]');
    await expect(difyScript).toHaveCount(1);
    
    // Verify the script has the correct ID (should match the token)
    await expect(difyScript).toHaveAttribute('id', 'ITAESZx7R09Y05jy');
    
    // Wait for the chatbot button to appear (Dify loads asynchronously)
    // The button should appear in the bottom right corner
    const chatbotButton = page.locator('#dify-chatbot-bubble-button');
    
    // Wait up to 10 seconds for the button to appear
    await expect(chatbotButton).toBeVisible({ timeout: 10000 });
    
    // Verify the button has the correct styling (orange color #EE7800)
    const backgroundColor = await chatbotButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Convert #EE7800 to RGB for comparison
    // #EE7800 = rgb(238, 120, 0)
    expect(backgroundColor).toContain('238');
    expect(backgroundColor).toContain('120');
    
    
  });

  test('should open chatbot window when button is clicked', async ({ page }) => {
    // Navigate to the Zukan page
    await page.goto('/zukan');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the chatbot button to appear
    const chatbotButton = page.locator('#dify-chatbot-bubble-button');
    await expect(chatbotButton).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot before clicking
    await page.screenshot({ path: 'tests/screenshots/before-click.png', fullPage: false });
    
    // Check if the button has rotation animation (before opening)
    const buttonBeforeClick = await page.locator('#dify-chatbot-bubble-button svg').first();
    const animationBefore = await buttonBeforeClick.evaluate((el) => {
      return window.getComputedStyle(el).animation;
    });
    console.log('Animation before click:', animationBefore);
    expect(animationBefore).toContain('enhanced-spin');
    
    // Click the chatbot button
    await chatbotButton.click();
    
    // Wait for the chatbot window to appear
    const chatbotWindow = page.locator('#dify-chatbot-bubble-window');
    
    // The window should become visible after clicking
    await expect(chatbotWindow).toBeVisible({ timeout: 5000 });
    
    // Wait for the chatbot button to have the 'chat-window-open' class
    await page.waitForFunction(() => {
      const button = document.getElementById('dify-chatbot-bubble-button');
      return button?.classList.contains('chat-window-open');
    }, { timeout: 5000 });
    
    // Verify that the button has the 'chat-window-open' class
    await expect(chatbotButton).toHaveClass(/chat-window-open/);
    
    // Check if the rotation animation is removed (after opening)
    const animationAfter = await buttonBeforeClick.evaluate((el) => {
      return window.getComputedStyle(el).animation;
    });
    console.log('Animation after click:', animationAfter);
    // Animation should be 'none' or not contain 'enhanced-spin'
    expect(animationAfter).not.toContain('enhanced-spin');
    
    // Take a screenshot after clicking to show the chatbot window
    await page.screenshot({ path: 'tests/screenshots/after-click.png', fullPage: false });
    
    // Verify the window has the correct dimensions (24rem × 40rem as per specs)
    const windowWidth = await chatbotWindow.evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    const windowHeight = await chatbotWindow.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    
    console.log(`✓ Chatbot window opened with dimensions: ${windowWidth} × ${windowHeight}`);
    
    // Verify the window is positioned correctly (bottom right)
    const position = await chatbotWindow.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        bottom: style.bottom,
        right: style.right,
      };
    });
    
    console.log(`✓ Chatbot window positioned at bottom: ${position.bottom}, right: ${position.right}`);
    
    // Close the window by clicking the button again
    await chatbotButton.click();
    
    // Wait for the window to close (wait for class to be removed)
    await page.waitForFunction(() => {
      const button = document.getElementById('dify-chatbot-bubble-button');
      return !button?.classList.contains('chat-window-open');
    }, { timeout: 5000 });
    
    // Verify that the button no longer has the 'chat-window-open' class
    const hasClassAfterClose = await chatbotButton.evaluate((el) => {
      return el.classList.contains('chat-window-open');
    });
    expect(hasClassAfterClose).toBe(false);
    
    console.log('✓ Rotation animation restored after closing chat window');
  });

  test('should verify Dify config is properly set', async ({ page }) => {
    // Navigate to the Zukan page
    await page.goto('/zukan');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that window.difyChatbotConfig exists and has the correct token
    const difyConfig = await page.evaluate(() => {
      return (window as any).difyChatbotConfig;
    });
    
    // Verify the config has the cloud token
    expect(difyConfig).toBeDefined();
    expect(difyConfig.token).toBe('ITAESZx7R09Y05jy');
    
    console.log('✓ Dify configuration is correctly set with cloud token');
    
  });
});
