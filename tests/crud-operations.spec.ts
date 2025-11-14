import { test, expect, type Page } from '@playwright/test';

/**
 * Test suite for CRUD Operations
 * 
 * This test suite verifies the CRUD operations for Akyo avatars including:
 * - Adding new Akyo
 * - Updating existing Akyo
 * - Deleting Akyo (owner only)
 * 
 * Requirements: 6.1, 6.2 from nextjs-best-practices-refactoring spec
 * 
 * Note: These tests verify the admin panel UI structure and API endpoints.
 * The actual form submission with file uploads requires more complex setup
 * and is tested separately in integration tests.
 */

test.describe('CRUD Operations', () => {

    async function fetchSession(page: Page) {
        return page.evaluate(async () => {
            const response = await fetch('/api/admin/verify-session', {
                credentials: 'include',
            });
            return response.json();
        });
    }

    // Helper function to login as owner
    async function loginAsOwner(page: Page) {
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('RadAkyo');

        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait longer for page to load after login
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        const ownerSession = await fetchSession(page);
        expect(ownerSession.authenticated).toBe(true);
        expect(ownerSession.role).toBe('owner');
    }

    async function postDeleteAkyo(page: Page, payload: Record<string, unknown>) {
        return page.evaluate(async (body) => {
            const response = await fetch('/api/delete-akyo', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const text = await response.text();
            let json: unknown;
            try {
                json = JSON.parse(text);
            } catch {
                json = text;
            }
            return { status: response.status, json };
        }, payload);
    }

    // Helper function to login as admin
    async function loginAsAdmin(page: Page) {
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('Akyo');

        const loginButton = page.locator('button:has-text("ログイン")');
        await loginButton.click();

        // Wait longer for page to load after login
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        const adminSession = await fetchSession(page);
        expect(adminSession.authenticated).toBe(true);
        expect(adminSession.role).toBe('admin');
    }

    test.describe('Add New Akyo - UI Tests', () => {

        test.beforeEach(async ({ page }) => {
            await loginAsOwner(page);

            // Navigate to the "新規登録" (Add) tab
            const addTab = page.locator('button:has-text("新規登録")');
            await addTab.click();
            await page.waitForTimeout(1000);
        });

        test('should display add form in the add tab', async ({ page }) => {
            // Verify the add tab is active
            const addTab = page.locator('button:has-text("新規登録")');
            await expect(addTab).toHaveClass(/border-red-500/);

            console.log('✓ Add tab is active and displayed');
        });

        test('should have form fields for adding Akyo', async ({ page }) => {
            // Check for file input (image upload)
            const fileInput = page.locator('input[type="file"]');

            // Ensure the add tab finished rendering before asserting on hidden inputs
            await expect(page.locator('button:has-text("新規登録")')).toHaveClass(/border-red-500/, {
                timeout: 10_000,
            });
            await expect(fileInput.first()).toBeAttached({ timeout: 10_000 });

            expect(await fileInput.count()).toBeGreaterThan(0);

            console.log('✓ Add form has required input fields');
        });
    });

    test.describe('Update Existing Akyo - UI Tests', () => {

        test.beforeEach(async ({ page }) => {
            await loginAsOwner(page);

            // Navigate to the "編集・削除" (Edit/Delete) tab
            const editTab = page.locator('button:has-text("編集・削除")');
            await editTab.click();
            await page.waitForTimeout(1500);
        });

        test('should display edit/delete tab with Akyo list', async ({ page }) => {
            // Verify the edit tab is active
            const editTab = page.locator('button:has-text("編集・削除")');
            await expect(editTab).toHaveClass(/border-red-500/);

            console.log('✓ Edit/Delete tab displayed correctly');
        });

        test('should show Akyo entries in edit tab', async ({ page }) => {
            // Wait for Akyo data to load
            await page.waitForTimeout(2000);

            // Check if there are any Akyo entries displayed
            const akyoEntries = page.locator('[class*="akyo"]').or(page.locator('img[alt*="Akyo"]')).or(page.locator('text=/0\\d{3}/'));

            const count = await akyoEntries.count();
            expect(count).toBeGreaterThan(0);

            console.log(`✓ Found ${count} Akyo entries in edit tab`);
        });
    });

    test.describe('Delete Akyo - Role-Based Access', () => {

        test('should allow admin to view edit tab', async ({ page }) => {
            // Login as admin (not owner)
            await loginAsAdmin(page);

            // Navigate to edit tab
            const editTab = page.locator('button:has-text("編集・削除")');
            await editTab.click();
            await page.waitForTimeout(1000);

            // Verify tab is accessible
            await expect(editTab).toHaveClass(/border-red-500/);

            console.log('✓ Admin can access edit tab');
        });

        test('should allow owner to view edit tab', async ({ page }) => {
            // Login as owner
            await loginAsOwner(page);

            // Navigate to edit tab
            const editTab = page.locator('button:has-text("編集・削除")');
            await editTab.click();
            await page.waitForTimeout(1000);

            // Verify tab is accessible
            await expect(editTab).toHaveClass(/border-red-500/);

            console.log('✓ Owner can access edit tab');
        });

        test('should prevent deletion via API without owner role', async ({ page }) => {
            // Login as admin first to get session cookie
            await loginAsAdmin(page);

            // Try to delete via API with proper CSRF headers
            const response = await postDeleteAkyo(page, { id: '0001' });

            // Should return 403 Forbidden (admin cannot delete)
            expect(response.status).toBe(403);

            const data = response.json as { success?: boolean; error?: string };
            expect(data?.success).toBe(false);
            expect(data?.error).toBeDefined();

            console.log('✓ API correctly prevents deletion for non-owner');
        });
    });

    test.describe('CRUD API Direct Tests', () => {

        test('should require authentication for CRUD operations', async ({ request }) => {
            // Try to add without authentication
            const response = await request.post('/api/upload-akyo', {
                multipart: {
                    id: '9999',
                    nickname: 'Test'
                }
            });

            // Should return 401 (Unauthorized) or 403 (Forbidden)
            expect([401, 403]).toContain(response.status());

            console.log('✓ CRUD APIs require authentication');
        });

        test('should validate ID format in delete API', async ({ page }) => {
            // Login first
            await loginAsOwner(page);

            // Try to delete with invalid ID
            const response = await postDeleteAkyo(page, { id: '123' });

            expect(response.status).toBe(400);
            const data = response.json as { success?: boolean; error?: string };

            expect(data?.success).toBe(false);
            expect(data?.error).toBeDefined();

            console.log('✓ Delete API validates ID format');
        });

        test('should return correct error format for validation failures', async ({ page }) => {
            // Login first
            await loginAsOwner(page);

            // Try to delete with missing ID
            const response = await postDeleteAkyo(page, {});

            expect(response.status).toBe(400);
            const data = response.json as { success?: boolean; error?: string };

            expect(data?.success).toBe(false);
            expect(data?.error).toBeDefined();

            console.log('✓ CRUD APIs return consistent error format');
        });
    });
});
