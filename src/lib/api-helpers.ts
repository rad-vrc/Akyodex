/**
 * API Route Helpers
 *
 * Common utilities for API routes including session validation and CSRF protection.
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SessionData, validateSession as validateSessionToken } from './session';

/**
 * Validate session from request cookies
 *
 * @param request - NextRequest object
 * @returns SessionData if valid, null otherwise
 */
export async function validateSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return null;
    }

    return await validateSessionToken(sessionToken);
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export function jsonError(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export async function ensureAdminRequest(
  request: NextRequest,
  options: {
    requireOrigin?: boolean;
    requireOwner?: boolean;
    ownerErrorMessage?: string;
  } = {}
): Promise<{ session: SessionData } | { response: NextResponse }> {
  const {
    requireOrigin = true,
    requireOwner = false,
    ownerErrorMessage = 'この操作は所有者のみが可能です',
  } = options;

  if (requireOrigin && !validateOrigin(request)) {
    return {
      response: jsonError('不正なリクエスト元です', 403),
    };
  }

  const session = await validateSession();
  if (!session) {
    return {
      response: jsonError('認証が必要です', 401),
    };
  }

  if (requireOwner && session.role !== 'owner') {
    return {
      response: jsonError(ownerErrorMessage, 403),
    };
  }

  return { session };
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
      console.error(`CSRF protection: Malformed origin ${origin}`, error);
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
      console.error(`CSRF protection: Malformed referer ${referer}`, error);
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

export interface AkyoFormData {
  id: string;
  nickname: string;
  avatarName: string;
  attributes: string;
  creator: string;
  avatarUrl: string;
  notes: string;
  imageData?: string;
}

export type AkyoFormParseResult =
  | { success: true; data: AkyoFormData }
  | { success: false; status: number; error: string };

export function parseAkyoFormData(formData: FormData): AkyoFormParseResult {
  const readField = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };

  const id = readField('id');
  const avatarName = readField('avatarName');
  const creator = readField('creator');

  if (!id || !avatarName || !creator) {
    return {
      success: false,
      status: 400,
      error: '必須フィールドが不足しています',
    };
  }

  if (!validateAkyoId(id)) {
    return {
      success: false,
      status: 400,
      error: '有効な4桁ID（0001-9999）が必要です',
    };
  }

  const imageValue = formData.get('imageData');
  const imageData = typeof imageValue === 'string' && imageValue.trim().length > 0
    ? imageValue.trim()
    : undefined;

  return {
    success: true,
    data: {
      id,
      avatarName,
      creator,
      nickname: readField('nickname'),
      attributes: readField('attributes'),
      avatarUrl: readField('avatarUrl'),
      notes: readField('notes'),
      imageData,
    },
  };
}
