/**
 * Next.js Middleware for i18n
 * 
 * Handles:
 * - Auto-detect language from Accept-Language header
 * - Country-based language detection (Cloudflare cf.country)
 * - Cookie-based language persistence
 * - Redirect to language-specific route
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectLanguageFromHeader, getLanguageFromCountry, isValidLanguage, DEFAULT_LANGUAGE } from '@/lib/i18n';

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (images, etc)
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
};

const LANGUAGE_COOKIE = 'AKYO_LANG';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 1. Check cookie (user preference)
  const cookieLang = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (cookieLang && isValidLanguage(cookieLang)) {
    const response = NextResponse.next();
    response.headers.set('x-akyo-lang', cookieLang);
    return response;
  }

  // 2. Check Cloudflare country header (most accurate)
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry) {
    const langFromCountry = getLanguageFromCountry(cfCountry);
    const response = NextResponse.next();
    response.headers.set('x-akyo-lang', langFromCountry);
    response.cookies.set(LANGUAGE_COOKIE, langFromCountry, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    return response;
  }

  // 3. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  const detectedLang = detectLanguageFromHeader(acceptLanguage);
  
  const response = NextResponse.next();
  response.headers.set('x-akyo-lang', detectedLang);
  response.cookies.set(LANGUAGE_COOKIE, detectedLang, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  return response;
}
