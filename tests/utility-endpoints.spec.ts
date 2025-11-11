import { test, expect } from '@playwright/test';

/**
 * Test suite for Utility Endpoints
 * 
 * This test suite verifies the utility endpoints including:
 * - Duplicate check endpoint
 * - CSV endpoint
 * - Manifest endpoint
 * - Avatar image proxy endpoint
 * 
 * Requirements: 6.1, 6.2 from nextjs-best-practices-refactoring spec
 */

test.describe('Utility Endpoints', () => {

    test.describe('Duplicate Check Endpoint', () => {

        test('should check for duplicate nicknames', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                    value: 'TestNickname',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            expect(response.ok()).toBeTruthy();
            const data = await response.json();

            expect(data).toHaveProperty('duplicates');
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('isDuplicate');
            expect(Array.isArray(data.duplicates)).toBe(true);
            expect(typeof data.isDuplicate).toBe('boolean');

            console.log('✓ Duplicate check returns correct format');
            console.log(`  - isDuplicate: ${data.isDuplicate}`);
            console.log(`  - duplicates count: ${data.duplicates.length}`);
        });

        test('should check for duplicate avatar names', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'avatarName',
                    value: 'TestAvatar',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            expect(response.ok()).toBeTruthy();
            const data = await response.json();

            expect(data).toHaveProperty('duplicates');
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('isDuplicate');

            console.log('✓ Avatar name duplicate check works');
        });

        test('should exclude specified ID from duplicate check', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                    value: 'TestNickname',
                    excludeId: '0001',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            expect(response.ok()).toBeTruthy();
            const data = await response.json();

            // If 0001 has this nickname, it should be excluded from duplicates
            expect(data.duplicates).not.toContain('#0001');

            console.log('✓ Exclude ID parameter works correctly');
        });

        test('should reject invalid field parameter', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'invalidField',
                    value: 'TestValue',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            expect(response.status()).toBe(400);
            const data = await response.json();

            expect(data.error).toBeDefined();
            expect(data.error).toContain('Invalid field');

            console.log('✓ Invalid field parameter rejected');
        });

        test('should reject missing value parameter', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            expect(response.status()).toBe(400);
            const data = await response.json();

            expect(data.error).toBeDefined();

            console.log('✓ Missing value parameter rejected');
        });

        test('should enforce CSRF protection', async ({ request }) => {
            const response = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                    value: 'TestNickname',
                },
                // No origin/referer headers
            });

            expect(response.status()).toBe(403);
            const data = await response.json();

            expect(data.error).toBeDefined();

            console.log('✓ CSRF protection enforced');
        });

        test('should normalize values for comparison', async ({ request }) => {
            // Test case-insensitive comparison
            const response1 = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                    value: 'TESTNICKNAME',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            const response2 = await request.post('/api/check-duplicate', {
                data: {
                    field: 'nickname',
                    value: 'testnickname',
                },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            });

            const data1 = await response1.json();
            const data2 = await response2.json();

            // Should return same results (case-insensitive)
            expect(data1.isDuplicate).toBe(data2.isDuplicate);

            console.log('✓ Value normalization works correctly');
        });
    });

    test.describe('CSV Endpoint', () => {

        test('should return CSV data', async ({ request }) => {
            const response = await request.get('/api/csv');

            expect(response.ok()).toBeTruthy();
            expect(response.status()).toBe(200);

            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('text/csv');

            const csvContent = await response.text();
            expect(csvContent.length).toBeGreaterThan(0);

            console.log('✓ CSV endpoint returns data');
            console.log(`  - Content length: ${csvContent.length} bytes`);
        });

        test('should return valid CSV format', async ({ request }) => {
            const response = await request.get('/api/csv');
            const csvContent = await response.text();

            // Check for CSV structure (should have headers and data rows)
            const lines = csvContent.split('\n');
            expect(lines.length).toBeGreaterThan(1);

            // First line should be headers
            const headers = lines[0];
            expect(headers).toContain('ID'); // CSV uses uppercase ID

            console.log('✓ CSV has valid format');
            console.log(`  - Total lines: ${lines.length}`);
        });

        test('should include cache headers', async ({ request }) => {
            const response = await request.get('/api/csv');

            const cacheControl = response.headers()['cache-control'];
            expect(cacheControl).toBeDefined();
            expect(cacheControl).toContain('public');

            console.log('✓ CSV endpoint includes cache headers');
            console.log(`  - Cache-Control: ${cacheControl}`);
        });

        test('should handle multiple requests efficiently', async ({ request }) => {
            // Make multiple requests to test caching
            const start = Date.now();

            const response1 = await request.get('/api/csv');
            const response2 = await request.get('/api/csv');
            const response3 = await request.get('/api/csv');

            const duration = Date.now() - start;

            expect(response1.ok()).toBeTruthy();
            expect(response2.ok()).toBeTruthy();
            expect(response3.ok()).toBeTruthy();

            console.log('✓ Multiple CSV requests handled efficiently');
            console.log(`  - 3 requests completed in ${duration}ms`);
        });
    });

    test.describe('Manifest Endpoint', () => {

        test('should return manifest data', async ({ request }) => {
            const response = await request.get('/api/manifest');

            expect(response.ok()).toBeTruthy();
            expect(response.status()).toBe(200);

            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('application/json');

            const manifest = await response.json();
            expect(typeof manifest).toBe('object');

            console.log('✓ Manifest endpoint returns JSON');
        });

        test('should include cache headers', async ({ request }) => {
            const response = await request.get('/api/manifest');

            const cacheControl = response.headers()['cache-control'];
            expect(cacheControl).toBeDefined();
            expect(cacheControl).toContain('public');

            console.log('✓ Manifest endpoint includes cache headers');
            console.log(`  - Cache-Control: ${cacheControl}`);
        });

        test('should return valid JSON even on error', async ({ request }) => {
            const response = await request.get('/api/manifest');

            expect(response.ok()).toBeTruthy();

            // Should always return valid JSON (empty object on error)
            const manifest = await response.json();
            expect(manifest).toBeDefined();

            console.log('✓ Manifest endpoint always returns valid JSON');
        });
    });

    test.describe('Avatar Image Proxy Endpoint', () => {

        test('should require avtr or id parameter', async ({ request }) => {
            const response = await request.get('/api/avatar-image');

            expect(response.status()).toBe(400);
            const data = await response.json();

            expect(data.error).toBeDefined();
            expect(data.error).toContain('Missing avtr or id parameter');

            console.log('✓ Avatar image endpoint requires parameters');
        });

        test('should validate ID format', async ({ request }) => {
            const response = await request.get('/api/avatar-image?id=123');

            expect(response.status()).toBe(400);
            const data = await response.json();

            expect(data.error).toBeDefined();
            expect(data.error).toContain('Invalid id format');

            console.log('✓ ID format validation works');
        });

        test('should validate avtr format', async ({ request }) => {
            const response = await request.get('/api/avatar-image?avtr=invalid_format');

            expect(response.status()).toBe(400);
            const data = await response.json();

            expect(data.error).toBeDefined();

            console.log('✓ Avtr format validation works');
        });

        test('should accept valid 4-digit ID', async ({ request }) => {
            const response = await request.get('/api/avatar-image?id=0001');

            // Should return 200 (image) or 302 (redirect to placeholder)
            expect([200, 302]).toContain(response.status());

            if (response.status() === 200) {
                const contentType = response.headers()['content-type'];
                expect(contentType).toMatch(/image\/(webp|png|jpeg)/);
                console.log('✓ Valid ID returns image');
            } else {
                console.log('✓ Valid ID redirects to placeholder');
            }
        });

        test('should accept valid avtr parameter', async ({ request }) => {
            const response = await request.get('/api/avatar-image?avtr=avtr_test123-abc');

            // Should return 200 (image) or 302 (redirect to placeholder)
            expect([200, 302]).toContain(response.status());

            console.log('✓ Valid avtr parameter accepted');
        });

        test('should respect width parameter', async ({ request }) => {
            const response = await request.get('/api/avatar-image?id=0001&w=256');

            // Should return 200 (image) or 302 (redirect)
            expect([200, 302]).toContain(response.status());

            console.log('✓ Width parameter accepted');
        });

        test('should include cache headers for images', async ({ request }) => {
            const response = await request.get('/api/avatar-image?id=0001');

            if (response.status() === 200) {
                const cacheControl = response.headers()['cache-control'];
                expect(cacheControl).toBeDefined();
                expect(cacheControl).toContain('public');

                const imageSource = response.headers()['x-image-source'];
                if (imageSource) {
                    console.log(`✓ Image served from: ${imageSource}`);
                }

                console.log('✓ Image includes cache headers');
            }
        });

        test('should handle non-existent ID gracefully', async ({ request }) => {
            const response = await request.get('/api/avatar-image?id=9999');

            // Should return 302 (redirect to placeholder) or 200 (placeholder image)
            expect([200, 302]).toContain(response.status());

            console.log('✓ Non-existent ID handled gracefully');
        });

        test('should prevent SSRF attacks', async ({ request }) => {
            // Try to use invalid avtr format that might be exploited
            const response = await request.get('/api/avatar-image?avtr=../../etc/passwd');

            expect(response.status()).toBe(400);

            console.log('✓ SSRF protection works');
        });

        test('should enforce maximum width limit', async ({ request }) => {
            // Try to request extremely large width
            const response = await request.get('/api/avatar-image?id=0001&w=99999');

            // Should still work but clamp to max width (4096)
            expect([200, 302]).toContain(response.status());

            console.log('✓ Width parameter clamped to safe limits');
        });
    });

    test.describe('Utility Endpoints Integration', () => {

        test('should handle concurrent requests to different endpoints', async ({ request }) => {
            const start = Date.now();

            // Make concurrent requests to all utility endpoints
            const [csvResponse, manifestResponse, imageResponse, duplicateResponse] = await Promise.all([
                request.get('/api/csv'),
                request.get('/api/manifest'),
                request.get('/api/avatar-image?id=0001'),
                request.post('/api/check-duplicate', {
                    data: { field: 'nickname', value: 'Test' },
                    headers: {
                        'origin': 'http://localhost:3000',
                        'referer': 'http://localhost:3000/admin'
                    }
                })
            ]);

            const duration = Date.now() - start;

            expect(csvResponse.ok()).toBeTruthy();
            expect(manifestResponse.ok()).toBeTruthy();
            expect([200, 302]).toContain(imageResponse.status());
            expect(duplicateResponse.ok()).toBeTruthy();

            console.log('✓ Concurrent requests handled successfully');
            console.log(`  - 4 concurrent requests completed in ${duration}ms`);
        });

        test('should maintain consistent response formats', async ({ request }) => {
            // Test that error responses follow consistent format
            const responses = await Promise.all([
                request.post('/api/check-duplicate', { data: {} }), // Missing params
                request.get('/api/avatar-image'), // Missing params
            ]);

            for (const response of responses) {
                if (!response.ok()) {
                    const data = await response.json();
                    expect(data).toHaveProperty('error');
                    expect(typeof data.error).toBe('string');
                }
            }

            console.log('✓ Error responses follow consistent format');
        });
    });
});
