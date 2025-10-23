/**
 * API Route: Verify Admin Session
 * GET /api/admin/verify-session
 * Returns: { authenticated: boolean, role?: 'owner' | 'admin' }
 * 
 * Validates the admin session cookie and returns authentication status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateSessionToken } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    // Validate session token with signature verification
    const sessionData = await validateSessionToken(sessionCookie.value);

    if (!sessionData) {
      // Invalid or expired session - clear cookie via response
      const response = NextResponse.json({
        authenticated: false,
      });
      response.cookies.delete('admin_session');
      return response;
    }

    // Valid session
    return NextResponse.json({
      authenticated: true,
      role: sessionData.role,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
