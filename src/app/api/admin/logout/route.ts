/**
 * API Route: Admin Logout
 * POST /api/admin/logout
 * Returns: { success: boolean }
 * 
 * Clears the admin session cookie.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    return NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'ログアウトエラーが発生しました' },
      { status: 500 }
    );
  }
}
