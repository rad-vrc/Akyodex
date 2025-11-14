/**
 * API Route: Verify Admin Session
 * GET /api/admin/verify-session
 * Returns: { authenticated: boolean, role?: 'owner' | 'admin' }
 *
 * Validates the admin session cookie and returns authentication status.
 */

import { validateSessionToken } from '@/lib/session';
import { cookies } from 'next/headers';
import { jsonError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return Response.json({
        authenticated: false,
      });
    }

    // Validate session token with signature verification
    const sessionData = await validateSessionToken(sessionCookie.value);

    if (!sessionData) {
      // Invalid or expired session - clear cookie
      cookieStore.delete('admin_session');
      return Response.json({
        authenticated: false,
      });
    }

    // Valid session
    return Response.json({
      authenticated: true,
      role: sessionData.role,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return jsonError('Session verification failed', 500, { authenticated: false });
  }
}
