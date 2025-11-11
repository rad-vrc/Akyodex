/**
 * API Route: Admin Logout
 * POST /api/admin/logout
 * Returns: { success: boolean }
 * 
 * Clears the admin session cookie.
 */

import { clearSessionCookie } from '@/lib/api-helpers';

export const runtime = 'edge';

export async function POST() {
  try {
    await clearSessionCookie();

    return Response.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json(
      { success: false, message: 'ログアウトエラーが発生しました' },
      { status: 500 }
    );
  }
}
