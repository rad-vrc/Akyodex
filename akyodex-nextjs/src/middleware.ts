/**
 * Next.js Middleware
 * 
 * NOTE: Middleware runs in Edge Runtime (Node.js APIs not available).
 * Session validation is handled by client-side /api/admin/verify-session calls
 * and server-side API route authentication. This middleware simply allows
 * /admin pages to load, where the client component handles login UI.
 * 
 * Security is maintained through:
 * - API routes validate HMAC-signed sessions (verify-session, login, CRUD)
 * - CSRF protection on all POST endpoints
 * - Client-side authentication checks in admin-client.tsx
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /admin routes to load (client component handles auth UI)
  // API routes have their own server-side HMAC signature validation
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
