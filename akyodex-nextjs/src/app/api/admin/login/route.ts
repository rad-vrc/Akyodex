/**
 * API Route: Admin Login
 * POST /api/admin/login
 * Body: { password: string }
 * Returns: { success: boolean, role?: 'owner' | 'admin', message?: string }
 * 
 * Server-side authentication endpoint to prevent client-side password exposure.
 * Creates a secure session cookie on successful authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionToken } from '@/lib/session';
import { timingSafeEqual } from 'crypto';

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Timing-safe password comparison
 * Prevents timing attacks by ensuring constant-time comparison
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    // Convert strings to buffers of equal length
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    
    // If lengths differ, pad the shorter one to prevent length-based timing
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    
    bufA.copy(paddedA);
    bufB.copy(paddedB);
    
    return timingSafeEqual(paddedA, paddedB);
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
    let role: 'owner' | 'admin' | null = null;
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
    const sessionToken = createSessionToken(username, role, SESSION_DURATION);

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
