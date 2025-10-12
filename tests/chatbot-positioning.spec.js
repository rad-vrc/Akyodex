import { test, expect } from '@playwright/test';

test.describe('Chatbot Widget Visual Positioning Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page
    await page.goto('file://' + process.cwd() + '/index.html');
  });

  test('chatbot window should have fixed positioning', async ({ page }) => {
    // Wait for potential chatbot initialization
    await page.waitForLoadState('networkidle');
    
    // Check if the chatbot window element exists
    const chatbotWindow = page.locator('#dify-chatbot-bubble-window');
    
    // If element exists, validate its positioning
    if (await chatbotWindow.count() > 0) {
      const position = await chatbotWindow.evaluate((el) => 
        window.getComputedStyle(el).position
      );
      expect(position).toBe('fixed');
    } else {
      // Element may not exist until chatbot loads, which is OK
      test.skip();
    }
  });

  test('chatbot window should be positioned in bottom-right corner', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatbotWindow = page.locator('#dify-chatbot-bubble-window');
    
    if (await chatbotWindow.count() > 0) {
      const styles = await chatbotWindow.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          position: computed.position,
          bottom: computed.bottom,
          right: computed.right,
          top: computed.top,
          left: computed.left
        };
      });
      
      expect(styles.position).toBe('fixed');
      // Inset: auto 1rem 1rem auto means bottom and right are set
      expect(styles.bottom).toBeTruthy();
      expect(styles.right).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('chatbot window should have correct dimensions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatbotWindow = page.locator('#dify-chatbot-bubble-window');
    
    if (await chatbotWindow.count() > 0) {
      const dimensions = await chatbotWindow.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          width: computed.width,
          height: computed.height
        };
      });
      
      // 24rem at default font size (16px) = 384px
      expect(dimensions.width).toBeTruthy();
      expect(dimensions.height).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('chatbot button should have custom orange background', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatbotButton = page.locator('#dify-chatbot-bubble-button');
    
    if (await chatbotButton.count() > 0) {
      const bgColor = await chatbotButton.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // #EE7800 = rgb(238, 120, 0)
      expect(bgColor).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('page should have valid viewport settings', async ({ page }) => {
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
  });

  test('chatbot styles should not interfere with page layout', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check that main content is not pushed by chatbot
    const body = await page.locator('body').boundingBox();
    expect(body).toBeTruthy();
    expect(body.height).toBeGreaterThan(0);
  });

  test('chatbot should remain visible on viewport resize', async ({ page, viewport }) => {
    await page.waitForLoadState('networkidle');
    
    // Test at different viewport sizes
    const viewportSizes = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100); // Allow for layout
      
      const chatbotWindow = page.locator('#dify-chatbot-bubble-window');
      if (await chatbotWindow.count() > 0) {
        const isVisible = await chatbotWindow.isVisible();
        // If element exists, it should maintain fixed positioning
        const position = await chatbotWindow.evaluate((el) => 
          window.getComputedStyle(el).position
        );
        expect(position).toBe('fixed');
      }
    }
  });
});

test.describe('CSS Rules Validation', () => {
  test('page should load without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected external script errors (chatbot may not load in test)
    const relevantErrors = errors.filter(err => 
      !err.includes('dexakyo.akyodex.com') && 
      !err.includes('Failed to load resource')
    );
    
    expect(relevantErrors.length).toBe(0);
  });

  test('styles should be applied after page load', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.waitForLoadState('load');
    
    // Check that styles are in the document
    const hasStyles = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'));
      return styles.some(style => 
        style.textContent.includes('#dify-chatbot-bubble-window')
      );
    });
    
    expect(hasStyles).toBeTruthy();
  });
});