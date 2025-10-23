/**
 * Session Management with HMAC Signature (Edge Runtime Compatible)
 * 
 * Provides secure session token generation and validation using Web Crypto API.
 * Protects against session tampering and role escalation attacks.
 * Compatible with Cloudflare Workers Edge Runtime.
 */

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
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sign session data with HMAC SHA256 using Web Crypto API
 */
async function signSessionData(data: SessionData): Promise<string> {
  const secretKey = getSecretKey();
  const payload = JSON.stringify(data);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return uint8ArrayToHex(new Uint8Array(signature));
}

/**
 * Timing-safe comparison for two Uint8Arrays
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Verify session signature
 */
async function verifySignature(data: SessionData, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await signSessionData(data);
    
    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = hexToUint8Array(expectedSignature);
    const actualBuffer = hexToUint8Array(signature);
    
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
export async function createSessionToken(
  username: string,
  role: 'owner' | 'admin',
  durationMs: number = 24 * 60 * 60 * 1000
): Promise<string> {
  const sessionData: SessionData = {
    username,
    role,
    expires: Date.now() + durationMs,
  };
  
  const signature = await signSessionData(sessionData);
  
  const signedSession: SignedSession = {
    data: sessionData,
    signature,
  };
  
  // Encode the entire signed session as base64url (cross-runtime compatible)
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(JSON.stringify(signedSession));
  
  // Cross-runtime base64url encoding (works in both Node.js and Edge)
  function toBase64Url(bytes: Uint8Array): string {
    // Node.js: Use Buffer if available (Node 18+ supports base64url)
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return Buffer.from(bytes).toString('base64url');
    }
    // Edge: Use btoa and convert to URL-safe format
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  return toBase64Url(jsonBytes);
}

/**
 * Validate a session token and return session data
 * 
 * @param token - Base64-encoded signed session token
 * @returns SessionData if valid, null otherwise
 */
export async function validateSessionToken(token: string): Promise<SessionData | null> {
  try {
    // Cross-runtime base64url decoding
    function fromBase64Url(str: string): Uint8Array {
      // Convert URL-safe base64 back to standard base64
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padding = (4 - (base64.length % 4)) % 4;
      const padded = base64 + '='.repeat(padding);
      
      // Node.js: Use Buffer if available
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        return new Uint8Array(Buffer.from(padded, 'base64'));
      }
      // Edge: Use atob
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    
    const jsonBytes = fromBase64Url(token);
    const decoder = new TextDecoder();
    const decodedJson = decoder.decode(jsonBytes);
    
    const signedSession: SignedSession = JSON.parse(decodedJson);
    
    // Validate structure
    if (!signedSession.data || !signedSession.signature) {
      console.error('Invalid session structure: missing data or signature');
      return null;
    }
    
    const { data, signature } = signedSession;
    
    // Verify signature
    if (!(await verifySignature(data, signature))) {
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
export async function validateSession(cookieValue: string | undefined): Promise<SessionData | null> {
  if (!cookieValue) {
    return null;
  }
  
  return await validateSessionToken(cookieValue);
}
