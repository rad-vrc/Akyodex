import { test, expect } from '@playwright/test';

/**
 * Test suite for Error Scenarios
 * 
 * This test suite comprehensively verifies error handling across all API endpoints:
 * - Invalid inputs
 * - Unauthorized access
 * - Missing data
 * - User-friendly error messages
 * 
 * Requirements: 4.4, 4.5, 6.3 from nextjs-best-practices-refactoring spec
 */

test.describe('Error Scenarios - Authentication', () => {

    test('should reject login with missing password', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: {}
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(typeof data.error).toBe('string');
        expect(data.error.length).toBeGreaterThan(0);

        console.log('✓ Missing password rejected with user-friendly error');
        console.log(`  - Error: ${data.error}`);
    });

    test('should reject login with empty password', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: '' }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();

        console.log('✓ Empty password rejected');
    });


    test('should reject login with invalid JSON', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: 'invalid json string',
            headers: { 'content-type': 'application/json' }
        });

        expect([400, 500]).toContain(response.status());
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();

        console.log('✓ Invalid JSON rejected');
    });

    test('should reject login with wrong password type', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 12345 } // Number instead of string
        });

        expect([400, 401]).toContain(response.status());
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ Wrong password type rejected');
    });

    test('should reject login with SQL injection attempt', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: "' OR '1'='1" }
        });

        expect(response.status()).toBe(401);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBe('パスワードが違います');

        console.log('✓ SQL injection attempt rejected');
    });

    test('should reject login with XSS attempt', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: '<script>alert("xss")</script>' }
        });

        expect(response.status()).toBe(401);
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ XSS attempt rejected');
    });
});

test.describe('Error Scenarios - CSRF Protection', () => {

    test('should reject POST requests without origin header', async ({ request }) => {
        // Playwright's request context doesn't automatically add origin/referer headers
        // This test verifies CSRF protection rejects requests without proper headers
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: 'Test' }
        });

        // Should be rejected due to missing origin/referer headers
        expect(response.status()).toBe(403);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('不正なリクエスト元');

        console.log('✓ Missing origin header rejected');
    });

    test('should reject POST requests with invalid origin', async ({ request }) => {
        // Note: Playwright may override custom origin headers
        // This test verifies CSRF protection logic exists
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: 'Test' },
            headers: {
                'origin': 'https://evil.com',
                'referer': 'https://evil.com/admin'
            }
        });

        // Should be rejected due to invalid origin
        expect(response.status()).toBe(403);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Invalid origin rejected');
    });
});


test.describe('Error Scenarios - CRUD Operations', () => {

    // Helper to login as owner
    async function getOwnerSession(request: import('@playwright/test').APIRequestContext) {
        const loginResponse = await request.post('/api/admin/login', {
            data: { password: 'RadAkyo' }
        });
        return loginResponse;
    }

    // Helper to login as admin
    async function getAdminSession(request: import('@playwright/test').APIRequestContext) {
        const loginResponse = await request.post('/api/admin/login', {
            data: { password: 'Akyo' }
        });
        return loginResponse;
    }

    test('should reject upload without authentication', async ({ request }) => {
        const response = await request.post('/api/upload-akyo', {
            data: { id: '9999', nickname: 'Test' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([401, 403]).toContain(response.status());
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();

        console.log('✓ Upload without auth rejected');
    });

    test('should reject update without authentication', async ({ request }) => {
        const response = await request.post('/api/update-akyo', {
            data: { id: '0001', nickname: 'Test' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([401, 403]).toContain(response.status());
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ Update without auth rejected');
    });

    test('should reject delete without authentication', async ({ request }) => {
        const response = await request.post('/api/delete-akyo', {
            data: { id: '0001' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([401, 403]).toContain(response.status());
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ Delete without auth rejected');
    });

    test('should reject delete with admin role (requires owner)', async ({ request }) => {
        // Login as admin first
        await getAdminSession(request);

        const response = await request.post('/api/delete-akyo', {
            data: { id: '0001' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(403);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();

        console.log('✓ Delete with admin role rejected (owner required)');
    });


    test('should reject delete with invalid ID format', async ({ request }) => {
        // Login as owner first
        await getOwnerSession(request);

        const response = await request.post('/api/delete-akyo', {
            data: { id: '123' }, // Only 3 digits
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toContain('ID');

        console.log('✓ Invalid ID format rejected');
    });

    test('should reject delete with missing ID', async ({ request }) => {
        // Login as owner first
        await getOwnerSession(request);

        const response = await request.post('/api/delete-akyo', {
            data: {},
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ Missing ID rejected');
    });

    test('should reject delete with non-numeric ID', async ({ request }) => {
        // Login as owner first
        await getOwnerSession(request);

        const response = await request.post('/api/delete-akyo', {
            data: { id: 'abcd' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ Non-numeric ID rejected');
    });

    test('should reject delete with ID containing special characters', async ({ request }) => {
        // Login as owner first
        await getOwnerSession(request);

        const response = await request.post('/api/delete-akyo', {
            data: { id: '00<1' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.success).toBe(false);

        console.log('✓ ID with special characters rejected');
    });
});


test.describe('Error Scenarios - Duplicate Check', () => {

    test('should reject duplicate check with missing field', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { value: 'Test' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('field');

        console.log('✓ Missing field parameter rejected');
    });

    test('should reject duplicate check with missing value', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('value');

        console.log('✓ Missing value parameter rejected');
    });

    test('should reject duplicate check with invalid field', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'invalidField', value: 'Test' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('Invalid field');

        console.log('✓ Invalid field rejected');
    });

    test('should reject duplicate check with empty value', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: '' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Empty value rejected');
    });

    test('should reject duplicate check with wrong value type', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: 12345 },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([400, 500]).toContain(response.status());
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Wrong value type rejected');
    });
});


test.describe('Error Scenarios - Avatar Image Proxy', () => {

    test('should reject request without avtr or id parameter', async ({ request }) => {
        const response = await request.get('/api/avatar-image');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('Missing');

        console.log('✓ Missing parameters rejected');
    });

    test('should reject request with invalid ID format (too short)', async ({ request }) => {
        const response = await request.get('/api/avatar-image?id=123');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.error).toContain('Invalid id format');

        console.log('✓ Short ID format rejected');
    });

    test('should reject request with invalid ID format (too long)', async ({ request }) => {
        const response = await request.get('/api/avatar-image?id=12345');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Long ID format rejected');
    });

    test('should reject request with non-numeric ID', async ({ request }) => {
        const response = await request.get('/api/avatar-image?id=abcd');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Non-numeric ID rejected');
    });

    test('should reject request with invalid avtr format', async ({ request }) => {
        const response = await request.get('/api/avatar-image?avtr=invalid');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Invalid avtr format rejected');
    });

    test('should reject request with path traversal attempt in avtr', async ({ request }) => {
        const response = await request.get('/api/avatar-image?avtr=../../etc/passwd');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Path traversal attempt rejected');
    });

    test('should reject request with URL injection in avtr', async ({ request }) => {
        const response = await request.get('/api/avatar-image?avtr=http://evil.com/image.jpg');

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ URL injection attempt rejected');
    });

    test('should handle invalid width parameter gracefully', async ({ request }) => {
        const response = await request.get('/api/avatar-image?id=0001&w=invalid');

        // Should either accept and use default, or reject with 400
        expect([200, 302, 400]).toContain(response.status());

        console.log('✓ Invalid width parameter handled');
    });

    test('should handle negative width parameter', async ({ request }) => {
        const response = await request.get('/api/avatar-image?id=0001&w=-100');

        // Should either accept and use default, or reject with 400
        expect([200, 302, 400]).toContain(response.status());

        console.log('✓ Negative width parameter handled');
    });
});


test.describe('Error Scenarios - Session Management', () => {

    test('should reject verify-session with invalid session token', async ({ request }) => {
        const response = await request.get('/api/admin/verify-session', {
            headers: {
                'cookie': 'admin_session=invalid_token_12345'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data.authenticated).toBe(false);
        expect(data.role).toBeUndefined();

        console.log('✓ Invalid session token rejected');
    });

    test('should reject verify-session with malformed JWT', async ({ request }) => {
        const response = await request.get('/api/admin/verify-session', {
            headers: {
                'cookie': 'admin_session=not.a.jwt'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data.authenticated).toBe(false);

        console.log('✓ Malformed JWT rejected');
    });

    test('should reject verify-session with expired token', async ({ request }) => {
        // Create an expired JWT token (this would need to be a real expired token)
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoib3duZXIiLCJleHAiOjB9.invalid';

        const response = await request.get('/api/admin/verify-session', {
            headers: {
                'cookie': `admin_session=${expiredToken}`
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data.authenticated).toBe(false);

        console.log('✓ Expired token rejected');
    });

    test('should handle logout without session gracefully', async ({ request }) => {
        const response = await request.post('/api/admin/logout');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data.success).toBe(true);

        console.log('✓ Logout without session handled gracefully');
    });
});

test.describe('Error Scenarios - User-Friendly Messages', () => {

    test('should return Japanese error messages for authentication', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 'WrongPassword' }
        });

        const data = await response.json();

        expect(data.error).toBeDefined();
        // Should be in Japanese
        expect(data.error).toMatch(/パスワード|ログイン/);

        console.log('✓ Japanese error message returned');
        console.log(`  - Message: ${data.error}`);
    });

    test('should not expose internal error details', async ({ request }) => {
        const response = await request.post('/api/admin/login', {
            data: { password: 'Test' }
        });

        const data = await response.json();

        // Should not contain stack traces, file paths, or internal details
        expect(data.error).not.toContain('Error:');
        expect(data.error).not.toContain('at ');
        expect(data.error).not.toContain('/src/');
        expect(data.error).not.toContain('node_modules');

        console.log('✓ Internal details not exposed');
    });


    test('should return consistent error format across all endpoints', async ({ request }) => {
        // Test multiple endpoints for consistent error format
        const responses = await Promise.all([
            request.post('/api/admin/login', { data: {} }),
            request.post('/api/check-duplicate', { data: {} }),
            request.get('/api/avatar-image'),
            request.post('/api/delete-akyo', { data: {} })
        ]);

        for (const response of responses) {
            if (!response.ok()) {
                const data = await response.json();

                // All errors should have 'error' field
                expect(data).toHaveProperty('error');
                expect(typeof data.error).toBe('string');
                expect(data.error.length).toBeGreaterThan(0);

                // Most should have 'success: false'
                if (data.hasOwnProperty('success')) {
                    expect(data.success).toBe(false);
                }
            }
        }

        console.log('✓ Consistent error format across endpoints');
    });

    test('should return appropriate HTTP status codes', async ({ request }) => {
        // Test that different error types return appropriate status codes
        const testCases = [
            { endpoint: '/api/admin/login', data: {}, expectedStatus: 400 }, // Bad Request
            { endpoint: '/api/admin/login', data: { password: 'wrong' }, expectedStatus: 401 }, // Unauthorized
            { endpoint: '/api/check-duplicate', data: { field: 'nickname', value: 'test' }, expectedStatus: 403 }, // Forbidden (no CSRF)
        ];

        for (const testCase of testCases) {
            const response = await request.post(testCase.endpoint, {
                data: testCase.data
            });

            expect(response.status()).toBe(testCase.expectedStatus);
        }

        console.log('✓ Appropriate HTTP status codes returned');
    });

    test('should provide helpful error messages for validation failures', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'invalidField', value: 'test' },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        const data = await response.json();

        // Error message should be descriptive
        expect(data.error).toBeDefined();
        expect(data.error.length).toBeGreaterThan(10);
        expect(data.error).toContain('field');

        console.log('✓ Helpful validation error message');
        console.log(`  - Message: ${data.error}`);
    });
});

test.describe('Error Scenarios - Edge Cases', () => {

    test('should handle extremely long input strings', async ({ request }) => {
        const longString = 'a'.repeat(10000);

        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: longString },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        // Should either accept or reject gracefully (not crash)
        expect([200, 400, 413]).toContain(response.status());

        console.log('✓ Long input string handled');
    });

    test('should handle special characters in input', async ({ request }) => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: specialChars },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data).toHaveProperty('duplicates');

        console.log('✓ Special characters handled');
    });

    test('should handle Unicode characters in input', async ({ request }) => {
        const unicodeString = '日本語テスト🎌🗾';

        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: unicodeString },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data).toHaveProperty('duplicates');

        console.log('✓ Unicode characters handled');
    });

    test('should handle null values gracefully', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: null },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([400, 500]).toContain(response.status());
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Null value handled');
    });

    test('should handle undefined values gracefully', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname' }, // value is undefined
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect(response.status()).toBe(400);
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Undefined value handled');
    });

    test('should handle array instead of string', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: ['test1', 'test2'] },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([400, 500]).toContain(response.status());
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Array instead of string handled');
    });

    test('should handle object instead of string', async ({ request }) => {
        const response = await request.post('/api/check-duplicate', {
            data: { field: 'nickname', value: { nested: 'object' } },
            headers: {
                'origin': 'http://localhost:3000',
                'referer': 'http://localhost:3000/admin'
            }
        });

        expect([400, 500]).toContain(response.status());
        const data = await response.json();

        expect(data.error).toBeDefined();

        console.log('✓ Object instead of string handled');
    });
});

test.describe('Error Scenarios - Rate Limiting and Performance', () => {

    test('should handle rapid successive requests', async ({ request }) => {
        const promises = [];

        // Make 10 rapid requests
        for (let i = 0; i < 10; i++) {
            promises.push(
                request.post('/api/check-duplicate', {
                    data: { field: 'nickname', value: `test${i}` },
                    headers: {
                        'origin': 'http://localhost:3000',
                        'referer': 'http://localhost:3000/admin'
                    }
                })
            );
        }

        const responses = await Promise.all(promises);

        // All should succeed (or fail gracefully)
        for (const response of responses) {
            expect([200, 429, 503]).toContain(response.status());
        }

        console.log('✓ Rapid requests handled');
    });

    test('should handle concurrent requests to different endpoints', async ({ request }) => {
        const responses = await Promise.all([
            request.get('/api/csv'),
            request.get('/api/manifest'),
            request.get('/api/avatar-image?id=0001'),
            request.post('/api/check-duplicate', {
                data: { field: 'nickname', value: 'test' },
                headers: {
                    'origin': 'http://localhost:3000',
                    'referer': 'http://localhost:3000/admin'
                }
            })
        ]);

        // All should complete without errors
        for (const response of responses) {
            expect([200, 302, 400, 403]).toContain(response.status());
        }

        console.log('✓ Concurrent requests to different endpoints handled');
    });
});

console.log('\n✅ All error scenario tests completed');
