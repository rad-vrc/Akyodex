# Authentication Tests Documentation

## Overview

This document describes the authentication test suite created for task 17.1 of the Next.js best practices refactoring spec. The tests verify all authentication flows including login, logout, and session verification.

## Test File

**Location**: `tests/authentication.spec.ts`

## Test Coverage

### 1. Owner Login Flow
- **Test**: `should login successfully with owner password`
- **Password**: `RadAkyo`
- **Verifies**:
  - Password input field is visible
  - Login button works correctly
  - Admin panel becomes accessible after login
  - Session cookie is set with secure attributes:
    - `httpOnly: true`
    - `sameSite: 'Strict'`
    - Cookie name: `admin_session`

### 2. Admin Login Flow
- **Test**: `should login successfully with admin password`
- **Password**: `Akyo`
- **Verifies**:
  - Admin password authenticates successfully
  - Admin controls become visible
  - Session cookie is properly created

### 3. Invalid Password Handling
- **Test**: `should reject invalid password`
- **Verifies**:
  - Wrong passwords are rejected
  - Error message "パスワードが違います" is displayed
  - No session cookie is set for failed attempts

### 4. Logout Flow
- **Test**: `should logout successfully and clear session`
- **Verifies**:
  - User can login first
  - Logout button is accessible
  - Logout redirects to login screen
  - Session cookie is cleared after logout

### 5. Session Verification
- **Test**: `should verify session correctly after login`
- **Verifies**:
  - `/api/admin/verify-session` returns correct data
  - Authenticated sessions return `{ authenticated: true, role: 'owner' }`
  - Role is correctly identified

### 6. Unauthenticated Session
- **Test**: `should fail session verification without login`
- **Verifies**:
  - Unauthenticated requests return `{ authenticated: false }`
  - No role is returned for unauthenticated sessions

### 7. Session Persistence
- **Test**: `should maintain session across page reloads`
- **Verifies**:
  - Session persists after page reload
  - Admin controls remain visible
  - Session verification API still returns authenticated

### 8. Empty Password Handling
- **Test**: `should handle empty password submission`
- **Verifies**:
  - Empty password submission shows error
  - Error message "パスワードを入力してください" is displayed

## API Direct Tests

### 1. Successful Login Response Format
- **Test**: `should return correct response format for successful login`
- **Verifies**:
  - Response structure: `{ success: true, role: 'owner', message: 'ログインしました' }`
  - HTTP status: 200

### 2. Failed Login Response Format
- **Test**: `should return correct response format for failed login`
- **Verifies**:
  - Response structure: `{ success: false, error: 'パスワードが違います' }`
  - HTTP status: 401

### 3. Role Distinction
- **Test**: `should distinguish between owner and admin roles`
- **Verifies**:
  - Owner password returns `role: 'owner'`
  - Admin password returns `role: 'admin'`

### 4. Cookie Security Attributes
- **Test**: `should set secure cookie attributes`
- **Verifies**:
  - `Set-Cookie` header contains:
    - `HttpOnly`
    - `SameSite=Strict`
    - `Path=/`

## Running the Tests

```bash
# Run all tests
npm test

# Run only authentication tests
npx playwright test authentication.spec.ts

# Run in UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run with specific reporter
npx playwright test authentication.spec.ts --reporter=list
```

## Test Environment

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (Desktop Chrome)
- **Dev Server**: Automatically started by Playwright
- **Timeout**: 120 seconds for server startup

## Requirements Satisfied

This test suite satisfies the following requirements from the spec:

- **Requirement 6.1**: Maintain backward compatibility - All authentication flows work as expected
- **Requirement 6.2**: Preserve existing validation logic - Password validation, session management, and error handling all function correctly

## Test Credentials

From `.env.local`:
- **Owner Password**: `RadAkyo`
- **Admin Password**: `Akyo`
- **Session Secret**: Configured in environment

## Notes

1. **Security**: Tests verify that session cookies have proper security attributes (HttpOnly, SameSite=Strict)
2. **Error Messages**: All error messages are in Japanese to match the application's default language
3. **Session Duration**: Tests verify session persistence but do not test expiration (24-hour duration)
4. **CSRF Protection**: Not explicitly tested in these flows (covered by API helper tests)

## Future Enhancements

Potential additions to the test suite:
- Session expiration testing (requires time manipulation)
- CSRF token validation
- Concurrent session handling
- Rate limiting tests
- Password brute-force protection

## Troubleshooting

If tests fail:

1. **Dev server not starting**: Check that port 3000 is available
2. **Element not found**: Verify admin page UI hasn't changed
3. **Cookie not set**: Check that session creation logic is working
4. **API errors**: Verify environment variables are set correctly

## Related Files

- **API Routes**:
  - `src/app/api/admin/login/route.ts`
  - `src/app/api/admin/logout/route.ts`
  - `src/app/api/admin/verify-session/route.ts`
- **Helper Functions**:
  - `src/lib/api-helpers.ts` (jsonError, setSessionCookie, clearSessionCookie)
  - `src/lib/session.ts` (createSessionToken, validateSessionToken)
- **Admin Page**:
  - `src/app/admin/page.tsx`
