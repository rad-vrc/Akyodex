# Playwright Tests for Akyodex

This directory contains automated tests for the Akyodex application using Playwright.

## Test Coverage

### Admin Authentication (`authentication.spec.ts`)

Tests the admin authentication system including:

1. **Owner Login Test** - Verifies that:
   - Owner password (`RadAkyo`) successfully authenticates
   - Session cookie is set with secure attributes (HttpOnly, SameSite=Strict)
   - Admin panel becomes accessible after login

2. **Admin Login Test** - Verifies that:
   - Admin password (`Akyo`) successfully authenticates
   - Session cookie is properly created
   - Admin controls are visible after login

3. **Invalid Password Test** - Verifies that:
   - Wrong passwords are rejected with appropriate error message
   - No session cookie is set for failed login attempts

4. **Logout Test** - Verifies that:
   - Logout button successfully clears the session
   - User is redirected back to login screen
   - Session cookie is removed

5. **Session Verification Test** - Verifies that:
   - Valid sessions return authenticated status with correct role
   - Invalid/missing sessions return unauthenticated status
   - Session persists across page reloads

6. **API Direct Tests** - Verifies that:
   - Login API returns correct response format (`{ success, role, message }`)
   - Failed login returns proper error format (`{ success: false, error }`)
   - Owner and admin roles are correctly distinguished
   - Session cookies have proper security attributes

### Dify Cloud Chatbot Integration (`dify-chatbot.spec.ts`)

Tests the integration of the Dify Cloud chatbot on the Zukan (図鑑) page:

1. **Script Loading Test** - Verifies that:
   - The Dify cloud script (`https://udify.app/embed.min.js`) is loaded
   - The script has the correct token ID (set via `NEXT_PUBLIC_DIFY_CHATBOT_TOKEN`)
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
