/**
 * Session Management with HMAC Signature
 * 
 * Provides secure session token generation and validation using HMAC SHA256.
 * Protects against session tampering and role escalation attacks.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface SessionData {
  username: string;
  role: 'owner' | 'admin';
  expires: number;
}

interface SignedSession {
  data: SessionData;
  signature: string;
}

/**
 * Get secret key from environment
 * Falls back to a default key in development (NOT SECURE for production)
 */
function getSecretKey(): string {
  const key = process.env.SESSION_SECRET;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    // Development fallback - NOT SECURE
    console.warn('⚠️ Using default SESSION_SECRET - DO NOT USE IN PRODUCTION');
    return 'dev-secret-key-change-in-production-12345678901234567890';
  }
  
  return key;
}

/**
 * Sign session data with HMAC SHA256
 */
function signSessionData(data: SessionData): string {
  const secretKey = getSecretKey();
  const payload = JSON.stringify(data);
  const hmac = createHmac('sha256', secretKey);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify session signature
 */
function verifySignature(data: SessionData, signature: string): boolean {
  try {
    const expectedSignature = signSessionData(data);
    
    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');
    
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a signed session token
 * 
 * @param username - Username
 * @param role - User role (owner or admin)
 * @param durationMs - Session duration in milliseconds (default: 24 hours)
 * @returns Base64-encoded signed session token
 */
export function createSessionToken(
  username: string,
  role: 'owner' | 'admin',
  durationMs: number = 24 * 60 * 60 * 1000
): string {
  const sessionData: SessionData = {
    username,
    role,
    expires: Date.now() + durationMs,
  };
  
  const signature = signSessionData(sessionData);
  
  const signedSession: SignedSession = {
    data: sessionData,
    signature,
  };
  
  // Encode the entire signed session as base64
  return Buffer.from(JSON.stringify(signedSession)).toString('base64');
}

/**
 * Validate a session token and return session data
 * 
 * @param token - Base64-encoded signed session token
 * @returns SessionData if valid, null otherwise
 */
export function validateSessionToken(token: string): SessionData | null {
  try {
    // Decode base64 token
    const decodedJson = Buffer.from(token, 'base64').toString('utf-8');
    const signedSession: SignedSession = JSON.parse(decodedJson);
    
    // Validate structure
    if (!signedSession.data || !signedSession.signature) {
      console.error('Invalid session structure: missing data or signature');
      return null;
    }
    
    const { data, signature } = signedSession;
    
    // Verify signature
    if (!verifySignature(data, signature)) {
      console.error('Invalid session signature: signature mismatch');
      return null;
    }
    
    // Check expiration
    if (data.expires < Date.now()) {
      console.error('Session expired');
      return null;
    }
    
    // Validate role
    if (data.role !== 'owner' && data.role !== 'admin') {
      console.error('Invalid session role:', data.role);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Validate session from request cookies
 * 
 * @param cookieValue - admin_session cookie value
 * @returns SessionData if valid, null otherwise
 */
export function validateSession(cookieValue: string | undefined): SessionData | null {
  if (!cookieValue) {
    return null;
  }
  
  return validateSessionToken(cookieValue);
}
