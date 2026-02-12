/**
 * Cloudflare KV Namespace type definitions
 * 
 * Shared interface for KV operations used across the application.
 * This matches the Cloudflare Workers KV API.
 */

/**
 * KV Namespace binding interface
 * @see https://developers.cloudflare.com/kv/api/
 */
export interface KVNamespace {
  /**
   * Get a value from KV
   * @param key - The key to get
   * @param options - Optional type specification
   */
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  get<T>(key: string, options: { type: 'json' }): Promise<T | null>;
  
  /**
   * Put a value into KV
   * @param key - The key to set
   * @param value - The value to store
   * @param options - Optional expiration and metadata
   */
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expirationTtl?: number; metadata?: Record<string, unknown> }
  ): Promise<void>;
  
  /**
   * Delete a key from KV
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;
  
  /**
   * List keys in KV
   * @param options - Optional prefix, limit, and cursor for pagination
   */
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

/**
 * Metadata structure for KV cache
 */
export interface KVMetadata {
  lastUpdated: string;
  countJa: number;
  countEn: number;
  countKo: number;
  version: string;
}

/**
 * KV key constants
 */
export const KV_KEYS = {
  DATA_JA: 'akyo-data-ja',
  DATA_EN: 'akyo-data-en',
  DATA_KO: 'akyo-data-ko',
  META: 'akyo-data-meta',
} as const;
