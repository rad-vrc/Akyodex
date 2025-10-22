/**
 * API Route Helpers
 * 
 * Common utilities for API routes including session validation and CSRF protection.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { validateSession as validateSessionToken, SessionData } from './session';

/**
 * Validate session from request cookies
 * 
 * @param request - NextRequest object
 * @returns SessionData if valid, null otherwise
 */
export async function validateSession(request: NextRequest): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    return validateSessionToken(sessionToken);
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Validate CSRF protection via Origin/Referer headers
 * 
 * @param request - NextRequest object
 * @returns true if valid origin, false otherwise
 */
export function validateOrigin(request: NextRequest): boolean {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_ORIGIN;
  
  if (!allowedOrigin) {
    // In development, allow any origin if not configured
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ CSRF protection disabled - set NEXT_PUBLIC_APP_URL or APP_ORIGIN');
      return true;
    }
    console.error('CSRF protection: APP_ORIGIN not configured');
    return false;
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Parse allowed origin to get canonical form
  const allowedOriginCanonical = (() => {
    try {
      return new URL(allowedOrigin).origin;
    } catch {
      return allowedOrigin;
    }
  })();
  
  // Check Origin header (preferred) - strict comparison
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.origin === allowedOriginCanonical) {
        return true;
      }
    } catch (error) {
      console.error(`CSRF protection: Malformed origin ${origin}`);
    }
    console.error(`CSRF protection: Invalid origin ${origin}`);
    return false;
  }
  
  // Fallback to Referer header - strict comparison
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === allowedOriginCanonical) {
        return true;
      }
    } catch (error) {
      console.error(`CSRF protection: Malformed referer ${referer}`);
    }
    console.error(`CSRF protection: Invalid referer ${referer}`);
    return false;
  }
  
  // No origin or referer header (suspicious)
  console.error('CSRF protection: Missing origin and referer headers');
  return false;
}

/**
 * Validate ID format (4-digit numeric for Akyo IDs: 0001-9999)
 * 
 * @param id - ID string to validate
 * @returns true if valid, false otherwise
 */
export function validateAkyoId(id: string): boolean {
  return /^\d{4}$/.test(id);
}
