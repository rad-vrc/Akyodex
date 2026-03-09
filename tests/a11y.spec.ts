import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Checks', () => {
  // Ensure we're testing with a light theme
  test.use({ colorScheme: 'light' });

  test('Zukan homepage should not have severe accessibility violations', async ({ page }) => {
    // Navigate to the main application page
    await page.goto('/zukan');

    // Wait for cards to ensure data is loaded and rendered
    await page.waitForSelector('.akyo-card', { state: 'attached' });

    // Run axe-core accessibility scan
    // We specifically target WCAG 2.1 AA which is the standard goal
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Exclude third party elements that we don't control
      .exclude('#dify-chatbot-container')
      // Disable color-contrast rule if needed depending on environment, though we fixed it.
      .analyze();

    // Attach results to the report for easier debugging (Playwright 1.x reporter handles this)
    if (accessibilityScanResults.violations.length > 0) {
      console.error(JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    // Expect empty array for violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Detail Modal should be accessible', async ({ page }) => {
    // Navigate and wait for content
    await page.goto('/zukan');
    await page.waitForSelector('.akyo-card', { state: 'attached' });

    // Open the first card's modal using the dedicated trigger button
    // (We recently added data-card-trigger to the specific overlay button)
    await page.click('button[data-card-trigger="true"]');
    
    // Wait for the modal dialog to appear
    await page.waitForSelector('div[role="dialog"]');

    // Run scan, limited to the modal to avoid background interference
    // Axe can scan specific includes if needed
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('div[role="dialog"]')
      .exclude('#dify-chatbot-container')
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.error(JSON.stringify(accessibilityScanResults.violations, null, 2));
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
