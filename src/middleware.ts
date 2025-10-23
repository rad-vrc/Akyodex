/**
 * Next.js Middleware
 * 
 * Handles:
 * 1. Language detection (Cloudflare country, Accept-Language, Cookie)
 * 2. Admin route access (client component handles auth UI)
 * 
 * NOTE: Middleware runs in Edge Runtime (Node.js APIs not available).
 * Security is maintained through:
 * - API routes validate HMAC-signed sessions (verify-session, login, CRUD)
 * - CSRF protection on all POST endpoints
 * - Client-side authentication checks in admin-client.tsx
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { type SupportedLanguage, isValidLanguage, detectLanguageFromHeader } from '@/lib/i18n';

const LANGUAGE_COOKIE = 'AKYO_LANG';

/**
 * Get language from country code (Cloudflare cf-ipcountry header)
 */
function getLanguageFromCountry(country: string): SupportedLanguage {
  // English-speaking countries
  const englishCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'SG', 'IN', 'PH'];
  return englishCountries.includes(country.toUpperCase()) ? 'en' : 'ja';
}

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

  // Allow /admin routes to load (client component handles auth UI)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Language detection for all other routes
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

export const config = {
  matcher: [
    // Match all routes except static files and API routes
    '/((?!_next|api|images|.*\\.).*)',
  ],
};
