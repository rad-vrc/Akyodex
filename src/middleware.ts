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

import { detectLanguageFromHeader, getLanguageFromCountry, isValidLanguage } from '@/lib/i18n';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

  // Generate nonce for CSP (Edge Runtime compatible)
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...randomBytes));

  // Content Security Policy
  // Note: 'unsafe-inline' and 'unsafe-eval' are required for Dify chatbot to function properly
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' *.dify.dev *.dify.ai *.udify.app udify.app js.sentry-cdn.com browser.sentry-cdn.com *.sentry.io https://analytics.google.com googletagmanager.com *.googletagmanager.com https://www.google-analytics.com https://api.github.com https://paulrosen.github.io https://cdn-cookieyes.com fonts.googleapis.com;
    style-src 'self' 'unsafe-inline' udify.app *.udify.app fonts.googleapis.com;
    img-src 'self' data: blob: https: *.akyodex.com *.vrchat.com *.r2.cloudflarestorage.com udify.app *.udify.app;
    font-src 'self' data: udify.app *.udify.app fonts.gstatic.com;
    connect-src 'self' *.dify.dev *.dify.ai *.udify.app udify.app *.r2.cloudflarestorage.com *.sentry.io browser.sentry-cdn.com https://analytics.google.com https://images.akyodex.com;
    frame-src 'self' udify.app *.udify.app;
    worker-src 'self' blob:;
    media-src 'self' data: mediastream: blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Allow /admin routes to load (client component handles auth UI)
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // Language detection for all other routes
  // 1. Check cookie (user preference)
  const cookieLang = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (cookieLang && isValidLanguage(cookieLang)) {
    const response = NextResponse.next();
    response.headers.set('x-akyo-lang', cookieLang);
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // 2. Check Cloudflare country header (most accurate)
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry) {
    const langFromCountry = getLanguageFromCountry(cfCountry);
    const response = NextResponse.next();
    response.headers.set('x-akyo-lang', langFromCountry);
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
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
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);
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
