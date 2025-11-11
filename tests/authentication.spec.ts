import { test, expect } from '@playwright/test';

/**
 * Test suite for Admin Authentication Flows
 * 
 * This test suite verifies the authentication system including:
 * - Login with owner password
 * - Login with admin password
 * - Logout functionality
 * - Session verification
 * 
 * Requirements: 6.1, 6.2 from nextjs-best-practices-refactoring spec
 */

test.describe('Admin Authentication', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to admin page before each test
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
    });

    test('should login successfully with owner password', async ({ page }) => {
        // Find the password input field
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Enter owner password
        await passwordInput.fill('RadAkyo');

        // Find and click the login button
        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for navigation/state change after login
        await page.waitForLoadState('networkidle');

        // Verify successful login by checking for admin panel elements
        // After successful login, the page should show admin controls
        // Look for the "新規登録" button which is the tab button
        const adminControls = page.locator('button:has-text("新規登録")');
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Verify the session cookie is set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie?.httpOnly).toBe(true);
        expect(sessionCookie?.sameSite).toBe('Strict');

        console.log('✓ Owner login successful');
        console.log('✓ Session cookie set with secure attributes');
    });

    test('should login successfully with admin password', async ({ page }) => {
        // Find the password input field
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Enter admin password
        await passwordInput.fill('Akyo');

        // Find and click the login button
        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for navigation/state change after login
        await page.waitForLoadState('networkidle');

        // Verify successful login by checking for admin panel elements
        const adminControls = page.locator('button:has-text("新規登録")');
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Verify the session cookie is set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeDefined();

        console.log('✓ Admin login successful');
    });

    test('should reject invalid password', async ({ page }) => {
        // Find the password input field
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Enter invalid password
        await passwordInput.fill('WrongPassword123');

        // Find and click the login button
        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for error message to appear
        const errorMessage = page.locator('text=Akyoワードが正しくありません');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });

        // Verify no session cookie is set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeUndefined();

        console.log('✓ Invalid password rejected correctly');
    });

    test('should logout successfully and clear session', async ({ page }) => {
        // First, login with owner password
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('RadAkyo');

        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for navigation/state change after login
        await page.waitForLoadState('networkidle');

        // Verify we're logged in
        const adminControls = page.locator('button:has-text("新規登録")');
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Find and click the logout button
        const logoutButton = page.locator('button:has-text("ログアウト")');
        await expect(logoutButton).toBeVisible();
        await logoutButton.click();

        // Wait for logout to complete
        await page.waitForTimeout(1000);

        // Verify we're back to the login screen
        const passwordInputAfterLogout = page.locator('input[type="password"]');
        await expect(passwordInputAfterLogout).toBeVisible({ timeout: 5000 });

        // Verify the session cookie is cleared
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeUndefined();

        console.log('✓ Logout successful');
        console.log('✓ Session cookie cleared');
    });

    test('should verify session correctly after login', async ({ page }) => {
        // Login first
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('RadAkyo');

        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for navigation/state change after login
        await page.waitForLoadState('networkidle');

        // Verify we're logged in by checking UI
        const adminControls = page.locator('text=新しいAkyoを登録');
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Verify session cookie is set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie?.httpOnly).toBe(true);

        console.log('✓ Session verification successful');
        console.log('✓ Session cookie is properly set');
    });

    test('should fail session verification without login', async ({ page }) => {
        // Verify we're on the login page (not logged in)
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Verify no session cookie is set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'admin_session');
        expect(sessionCookie).toBeUndefined();

        // Verify login form is displayed (not admin panel)
        const loginButton = page.locator('button:has-text("ログイン")');
        await expect(loginButton).toBeVisible();

        console.log('✓ Session verification correctly returns unauthenticated');
    });

    test('should maintain session across page reloads', async ({ page }) => {
        // Login first
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('RadAkyo');

        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait for navigation/state change after login
        await page.waitForLoadState('networkidle');

        // Verify we're logged in
        const adminControls = page.locator('button:has-text("新規登録")');
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify we're still logged in after reload
        await expect(adminControls).toBeVisible({ timeout: 10000 });

        // Verify session is still valid via API
        const response = await page.request.get('/api/admin/verify-session');
        const data = await response.json();
        expect(data.authenticated).toBe(true);

        console.log('✓ Session persists across page reloads');
    });

    test('should handle empty password submission', async ({ page }) => {
        // Find the password input field
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Verify the input has required attribute (browser validation)
        const isRequired = await passwordInput.getAttribute('required');
        expect(isRequired).not.toBeNull();

        // Try to click login button without entering password
        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Browser validation should prevent form submission
        // Verify we're still on the login page (not logged in)
        await page.waitForTimeout(500);
        await expect(passwordInput).toBeVisible();

        console.log('✓ Empty password handled correctly by browser validation');
    });
});

test.describe('Authentication API Direct Tests', () => {

    test('should return correct response format for successful login', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 'RadAkyo' }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.role).toBe('owner');
        expect(data.message).toBe('ログインしました');

        console.log('✓ Login API returns correct response format');
    });

    test('should return correct response format for failed login', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 'WrongPassword' }
        });

        expect(response.status()).toBe(401);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBe('パスワードが違います');

        console.log('✓ Failed login API returns correct error format');
    });

    test('should distinguish between owner and admin roles', async ({ request }) => {
        // Test owner login
        const ownerResponse = await request.post('/api/admin/login', {
            data: { password: 'RadAkyo' }
        });
        const ownerData = await ownerResponse.json();
        expect(ownerData.role).toBe('owner');

        // Test admin login (need new context to avoid cookie conflicts)
        const adminResponse = await request.post('/api/admin/login', {
            data: { password: 'Akyo' }
        });
        const adminData = await adminResponse.json();
        expect(adminData.role).toBe('admin');

        console.log('✓ Owner and admin roles correctly distinguished');
    });

    test('should set secure cookie attributes', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 'RadAkyo' }
        });

        const setCookieHeader = response.headers()['set-cookie'];
        expect(setCookieHeader).toBeDefined();

        // Verify cookie attributes
        expect(setCookieHeader).toContain('HttpOnly');
        expect(setCookieHeader).toContain('SameSite=Strict');
        expect(setCookieHeader).toContain('Path=/');

        console.log('✓ Session cookie has correct security attributes');
    });
});
