/**
 * API Route: Admin Login
 * POST /api/admin/login
 * Body: { password: string }
 * Returns: { success: boolean, role?: 'owner' | 'admin', message?: string }
 *
 * Server-side authentication endpoint to prevent client-side password exposure.
 * Creates a secure session cookie on successful authentication.
 */

// Use Node.js runtime for session management (Web Crypto API and Buffer compatibility)
export const runtime = 'nodejs';

import { createSessionToken } from '@/lib/session';
import type { AdminRole } from '@/types/akyo';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Timing-safe password comparison (Edge Runtime Compatible)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'パスワードを入力してください' },
        { status: 400 }
      );
    }

    // Get passwords from environment variables (server-side only - NOT NEXT_PUBLIC)
    const ownerPassword = process.env.ADMIN_PASSWORD_OWNER;
    const adminPassword = process.env.ADMIN_PASSWORD_ADMIN;

    // Validate that passwords are configured
    if (!ownerPassword || !adminPassword) {
      console.error('Admin passwords not configured in environment variables');
      return NextResponse.json(
        { success: false, message: '認証設定エラーです' },
        { status: 500 }
      );
    }

    // Check password and determine role using timing-safe comparison
    // `role` is initialized to `null` to indicate no role assigned yet.
    // This is important for timing-safe authentication: both password checks are performed
    // before assigning a role, preventing early exit and timing-based role detection.
    // Keep this null until both comparisons run to avoid timing-based role inference.
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
      return NextResponse.json(
        { success: false, message: 'パスワードが違います' },
        { status: 401 }
      );
    }

    // Create cryptographically signed session token
    const sessionToken = await createSessionToken(username, role, SESSION_DURATION);

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000, // seconds
      path: '/',
    });

    return NextResponse.json({
      success: true,
      role,
      message: 'ログインしました',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'ログインエラーが発生しました' },
      { status: 500 }
    );
  }
}
