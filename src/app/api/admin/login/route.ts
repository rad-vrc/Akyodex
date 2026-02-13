/**
 * API Route: Admin Login
 * POST /api/admin/login
 * Body: { password: string }
 * Returns: { success: boolean, role?: 'owner' | 'admin', message?: string }
 *
 * Server-side authentication endpoint to prevent client-side password exposure.
 * Creates a secure session cookie on successful authentication.
 */

// Node.js runtime required for cookie operations via next/headers
export const runtime = 'nodejs';

import { jsonError, jsonSuccess, setSessionCookie } from '@/lib/api-helpers';
import { createSessionToken } from '@/lib/session';
import type { AdminRole } from '@/types/akyo';

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Timing-safe password comparison (Web Crypto API)
 * Prevents timing attacks by ensuring constant-time comparison
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);

    // Pad to equal length to prevent length-based timing
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = new Uint8Array(maxLen);
    const paddedB = new Uint8Array(maxLen);

    paddedA.set(bufA);
    paddedB.set(bufB);

    // Timing-safe comparison
    let result = 0;
    for (let i = 0; i < maxLen; i++) {
      result |= paddedA[i] ^ paddedB[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return jsonError('パスワードを入力してください', 400, {
        message: 'パスワードを入力してください',
      });
    }

    // Get passwords from environment variables (server-side only - NOT NEXT_PUBLIC)
    const ownerPassword = process.env.ADMIN_PASSWORD_OWNER;
    const adminPassword = process.env.ADMIN_PASSWORD_ADMIN;

    // Validate that passwords are configured
    if (!ownerPassword || !adminPassword) {
      console.error('Admin passwords not configured in environment variables');
      return jsonError('認証設定エラーです', 500, { message: '認証設定エラーです' });
    }

    // Check password and determine role using timing-safe comparison
    // Initialize role to null. Both password checks are performed before assigning a role to prevent timing-based role detection.
    let role: AdminRole | null = null;
    let username = '';

    // Always check both passwords to prevent timing-based role detection
    const isOwner = timingSafeCompare(password, ownerPassword);
    const isAdmin = timingSafeCompare(password, adminPassword);

    if (isOwner) {
      role = 'owner';
      username = 'rado'; // Owner username
    } else if (isAdmin) {
      role = 'admin';
      username = 'admin'; // Admin username
    }

    if (!role) {
      return jsonError('パスワードが違います', 401, { message: 'パスワードが違います' });
    }

    // Create cryptographically signed session token
    const sessionToken = await createSessionToken(username, role, SESSION_DURATION);

    // Set secure HTTP-only cookie using helper
    await setSessionCookie(sessionToken, SESSION_DURATION / 1000);

    return jsonSuccess({
      role,
      message: 'ログインしました',
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonError('ログインエラーが発生しました', 500, {
      message: 'ログインエラーが発生しました',
    });
  }
}
