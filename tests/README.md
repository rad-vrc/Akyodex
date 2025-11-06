# Playwright Tests for Akyodex

This directory contains automated tests for the Akyodex application using Playwright.

## Test Coverage

### Dify Cloud Chatbot Integration (`dify-chatbot.spec.ts`)

Tests the integration of the Dify Cloud chatbot on the Zukan (図鑑) page:

1. **Script Loading Test** - Verifies that:
   - The Dify cloud script (`https://udify.app/embed.min.js`) is loaded
   - The script has the correct token ID (`ITAESZx7R09Y05jy`)
   - The chatbot button appears in the bottom right corner
   - The button has the correct orange color (#EE7800)

2. **Chatbot Interaction Test** - Verifies that:
   - Clicking the chatbot button opens the chat window
   - The chat window appears with correct dimensions (24rem × 40rem)
   - The window is positioned correctly in the bottom right
   - Screenshots are captured before and after clicking

3. **Configuration Test** - Verifies that:
   - `window.difyChatbotConfig` is properly initialized
   - The configuration contains the correct cloud token
   - All required configuration properties are present

## Running Tests

```bash
# Run all tests
npm test

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed
```

## Test Results

All tests should pass, confirming that the Dify cloud chatbot is properly integrated and functional after the Next.js migration.

### Expected Behavior

- ✅ Chatbot button appears in the bottom right corner with orange color (#EE7800)
- ✅ Button is clickable and opens the chat window
- ✅ Chat window displays correctly with proper dimensions
- ✅ Cloud version token is properly configured

## Screenshots

Test screenshots are automatically saved to `tests/screenshots/`:
- `before-click.png` - Shows the page with the chatbot button
- `after-click.png` - Shows the page with the open chatbot window

**Note:** The screenshots directory is gitignored to avoid committing test artifacts.
