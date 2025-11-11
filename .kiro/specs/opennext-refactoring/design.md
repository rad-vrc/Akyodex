# Design Document - OpenNext Branch Refactoring

## Overview

This design document outlines the architectural approach for refactoring the Akyodex Next.js application to eliminate code duplication, standardize REST APIs, optimize component architecture, and implement comprehensive testing. The refactoring will be performed incrementally to minimize risk while maintaining full functionality.

### Design Principles

1. **DRY (Don't Repeat Yourself)** - Extract common logic into reusable utilities
2. **Single Responsibility** - Each component/function has one clear purpose
3. **Server-First** - Use Server Components by default, Client Components only when needed
4. **Type Safety** - Comprehensive TypeScript with runtime validation
5. **Performance** - Optimize bundle size, lazy loading, and Core Web Vitals
6. **Testability** - Design for easy unit, integration, and E2E testing

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 Application                    │
├─────────────────────────────────────────────────────────────┤
│  App Router (Server Components)                             │
│  ├── /zukan (Gallery - SSG + ISR)                           │
│  ├── /admin (Admin Panel - Client Components)              │
│  └── /api (Edge Runtime API Routes)                        │
├─────────────────────────────────────────────────────────────┤
│  Shared Libraries                                           │
│  ├── vrchat-api.ts (VRChat integration)                    │
│  ├── csv-processor.ts (CSV operations)                     │
│  ├── image-utils.ts (Image handling)                       │
│  ├── api-response.ts (Standardized responses)              │
│  └── validation.ts (Zod schemas)                           │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare Edge Runtime                                    │
│  ├── R2 Bucket (Images, CSV)                               │
│  └── KV Store (Sessions)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App Layout (Server)
├── Landing Page (Server)
├── Gallery (Server)
│   ├── ZukanHeader (Server)
│   ├── ZukanFilters (Client)
│   └── ZukanGrid (Client)
│       └── AkyoCard (Client)
└── Admin (Client)
    ├── AdminHeader (Client)
    ├── AdminLogin (Client)
    └── AdminTabs (Client)
        ├── AddTab (Client)
        ├── EditTab (Client)
        └── ToolsTab (Client)
```

## Components and Interfaces

### 1. Shared Utilities Layer


#### VRChat API Utility (`src/lib/vrchat-api.ts`)

**Purpose**: Centralize all VRChat API interactions

**Interface**:
```typescript
export interface VRChatAvatarInfo {
  avatarName: string;
  creatorName: string;
  description: string;
  fullTitle: string;
  avtr: string;
  imageUrl?: string;
}

export class VRChatAPIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'VRChatAPIError';
  }
}

export async function fetchVRChatAvatarInfo(avtrId: string): Promise<VRChatAvatarInfo>
export async function fetchVRChatAvatarImage(avtrId: string): Promise<Blob>
export function validateVRChatId(avtrId: string): boolean
```

**Key Features**:
- Input validation with length-limited regex
- Error handling with custom error types
- Rate limiting protection
- Caching support
- HTML parsing and sanitization

#### CSV Processor (`src/lib/csv-processor.ts`)

**Purpose**: Unified CSV parsing and generation

**Interface**:
```typescript
export interface CSVProcessorOptions {
  language: 'ja' | 'en';
  validateHeaders?: boolean;
  normalizeUnicode?: boolean;
}

export class CSVProcessor {
  constructor(options: CSVProcessorOptions);
  
  async parseCSV(csvContent: string): Promise<AkyoData[]>;
  async generateCSV(data: AkyoData[]): Promise<string>;
  validateHeaders(headers: string[]): boolean;
  normalizeUnicode(text: string): string;
}
```

**Key Features**:
- Header validation
- Unicode normalization (NFC)
- Error handling with detailed messages
- Support for both Japanese and English formats
- Consistent date parsing

#### Image Utilities (`src/lib/image-utils.ts`)

**Purpose**: Centralize image handling logic (client-side execution)

**Interface**:
```typescript
export interface ImageLoadState {
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'avif' | 'png';
  preserveTransparency: boolean;
  correctExifOrientation: boolean;
}

// Client-side only (browser execution)
export function useImageLoader(src: string): ImageLoadState;
export async function optimizeImageClient(file: File, options: ImageOptimizationOptions): Promise<Blob>;
export function validateImageFile(file: File): boolean;
export async function cropImageClient(file: File, crop: Crop): Promise<Blob>;

// Server-side (validation and URL generation only)
export function generateCloudflareImageUrl(imageId: string, options: { width?: number; height?: number; format?: string }): string;
export function validateImageMetadata(file: File): Promise<{ width: number; height: number; format: string }>;
```

**Key Features**:
- Client-side image processing using Canvas API or Squoosh WASM
- EXIF orientation correction
- Transparency preservation for PNG
- WebP/AVIF format support
- Server-side validation and Cloudflare Images URL generation
- Error handling

### 2. API Response Standardization

#### API Response Types (`src/types/api.ts`)

**Interface**:
```typescript
export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface APIErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;
```

#### API Response Helpers (`src/lib/api-response.ts`)

**Interface**:
```typescript
export function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  status?: number
): Response;

export function createErrorResponse(
  error: string,
  statusCode?: number,
  code?: string,
  details?: any
): Response;

export function handleAPIError(error: unknown): Response;
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T;
```

**Key Features**:
- Consistent response format
- Proper HTTP status codes
- Error type detection and handling
- Zod schema validation integration

### 3. Component Architecture Refactoring

#### Gallery Components

**ZukanGallery (Server Component)**
```typescript
// src/app/zukan/page.tsx
export default async function ZukanPage() {
  const data = await loadAkyoData('ja');
  const attributes = extractAttributes(data);
  const creators = extractCreators(data);
  
  return (
    <div>
      <ZukanHeader />
      <ZukanClient 
        initialData={data}
        attributes={attributes}
        creators={creators}
      />
    </div>
  );
}
```

**ZukanClient (Client Component Wrapper)**
```typescript
// src/app/zukan/zukan-client.tsx
'use client'

export function ZukanClient({ initialData, attributes, creators }: Props) {
  return (
    <>
      <ZukanFilters 
        attributes={attributes}
        creators={creators}
        onFilter={handleFilter}
      />
      <ZukanGrid 
        data={filteredData}
        onShowDetail={handleShowDetail}
      />
      <AkyoDetailModal 
        akyo={selectedAkyo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
```

**ZukanFilters (Client Component)**
```typescript
// src/components/zukan/zukan-filters.tsx
'use client'

interface ZukanFiltersProps {
  attributes: string[];
  creators: string[];
  onFilter: (filters: FilterState) => void;
}

export function ZukanFilters({ attributes, creators, onFilter }: ZukanFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  
  // Filter logic
  useEffect(() => {
    onFilter({ searchTerm, selectedAttributes, selectedCreator });
  }, [searchTerm, selectedAttributes, selectedCreator]);
  
  return (/* Filter UI */);
}
```

**ZukanGrid (Client Component)**
```typescript
// src/components/zukan/zukan-grid.tsx
'use client'

interface ZukanGridProps {
  data: AkyoData[];
  onShowDetail: (akyo: AkyoData) => void;
}

export function ZukanGrid({ data, onShowDetail }: ZukanGridProps) {
  // Virtual scrolling logic
  const { visibleItems, containerRef } = useVirtualScroll(data, {
    itemHeight: 400,
    overscan: 5,
  });
  
  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {visibleItems.map(akyo => (
        <AkyoCard 
          key={akyo.id}
          akyo={akyo}
          onClick={() => onShowDetail(akyo)}
        />
      ))}
    </div>
  );
}
```

#### Admin Components

**AdminPanel (Client Component)**
```typescript
// src/app/admin/admin-client.tsx
'use client'

export function AdminClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'edit' | 'tools'>('add');
  
  if (!session) {
    return <AdminLogin onLogin={handleLogin} />;
  }
  
  return (
    <>
      <AdminHeader session={session} onLogout={handleLogout} />
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'add' && <AddTab session={session} />}
        {activeTab === 'edit' && <EditTab session={session} />}
        {activeTab === 'tools' && <ToolsTab session={session} />}
      </AdminTabs>
    </>
  );
}
```

### 4. Type Safety Enhancements

#### Enhanced Data Types (`src/types/akyo.ts`)

```typescript
// Branded types for type safety across RSC/JSON boundaries
export type DateString = string & { readonly __brand: 'DateString' }; // ISO 8601 format
export type UrlString = string & { readonly __brand: 'UrlString' };

export interface AkyoData {
  readonly id: string;
  appearance: DateString; // ISO 8601 string (YYYY-MM-DD)
  nickname: string;
  avatarName: string;
  attributes: readonly string[];
  notes?: string;
  creator: string;
  avatarUrl?: UrlString;
}

// Domain type (immutable)
export type AkyoDataDomain = DeepReadonly<AkyoData>;

// Form type (mutable for editing)
export interface AkyoDataForm {
  id: string;
  appearance: string;
  nickname: string;
  avatarName: string;
  attributes: string[];
  notes?: string;
  creator: string;
  avatarUrl?: string;
}

export interface AkyoCsvRow {
  ID: string;
  出現日: string;
  通称: string;
  アバター名: string;
  属性: string;
  備考?: string;
  制作者: string;
  アバターURL?: string;
}
```

#### Validation Schemas (`src/lib/validation.ts`)

```typescript
import { z } from 'zod';

export const uploadAkyoSchema = z.object({
  id: z.string().regex(/^\d{4}$/, 'ID must be 4 digits'),
  appearance: z.string().datetime(),
  nickname: z.string().min(1).max(100),
  avatarName: z.string().min(1).max(200),
  attributes: z.string(),
  notes: z.string().max(1000).optional(),
  creator: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
});

export const updateAkyoSchema = uploadAkyoSchema.extend({
  id: z.string().regex(/^\d{4}$/),
});

export const deleteAkyoSchema = z.object({
  id: z.string().regex(/^\d{4}$/),
});

export const checkDuplicateSchema = z.object({
  field: z.enum(['nickname', 'avatarName']),
  value: z.string().min(1),
  excludeId: z.string().regex(/^\d{4}$/).optional(),
});
```

## Data Models

### AkyoData Model

```typescript
interface AkyoData {
  readonly id: string;          // 4-digit ID (0001-0639)
  appearance: Date;             // First appearance date
  nickname: string;             // Japanese nickname
  avatarName: string;           // Full avatar name
  attributes: readonly string[]; // Tags (ケモ, アンドロイド, etc.)
  notes?: string;               // Optional notes
  creator: string;              // Creator name
  avatarUrl?: URL;              // VRChat avatar URL
}
```

### Session Model

```typescript
interface Session {
  token: string;
  role: 'admin' | 'owner';
  expiresAt: Date;
}

interface JWTPayload {
  role: 'admin' | 'owner';
  iat: number;
  exp: number;
}
```

### Filter State Model

```typescript
interface FilterState {
  searchTerm: string;
  selectedAttributes: string[];
  selectedCreator: string;
  sortBy: 'id' | 'appearance' | 'nickname';
  sortOrder: 'asc' | 'desc';
}
```

## Rate Limiting Strategy

### Storage and Configuration

**Storage**: Cloudflare KV Namespace (`AKYO_KV`)

**Key Design**:
```typescript
// Key format: rate_limit:{ip}:{endpoint}
// Example: rate_limit:192.168.1.1:admin_login
const key = `rate_limit:${ip}:${endpoint}`;
```

**Rate Limit Configuration**:
- **Admin Login**: 5 attempts per 15 minutes per IP
- **API Endpoints**: 100 requests per minute per IP
- **TTL**: 900 seconds (15 minutes) for login, 60 seconds for API

**Implementation**:
```typescript
interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  admin_login: { maxAttempts: 5, windowSeconds: 900 },
  api_general: { maxAttempts: 100, windowSeconds: 60 },
};

async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${ip}:${endpoint}`;
  const config = RATE_LIMITS[endpoint];
  
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= config.maxAttempts) {
    const ttl = await kv.getWithMetadata(key);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + (ttl.metadata?.ttl || 0) * 1000,
    };
  }
  
  await kv.put(key, String(count + 1), {
    expirationTtl: config.windowSeconds,
  });
  
  return {
    allowed: true,
    remaining: config.maxAttempts - count - 1,
    resetAt: Date.now() + config.windowSeconds * 1000,
  };
}
```

## Password Hashing Strategy

### Runtime Performance Considerations

**Primary Choice**: bcryptjs (proven Edge compatibility)
**Fallback**: PBKDF2 with WebCrypto API (if bcryptjs performance is insufficient)

**Performance Target**: p95 < 200-300ms per request

**Implementation Strategy**:
1. Start with bcryptjs (rounds: 10)
2. Load test with realistic traffic patterns
3. If p95 > 300ms, consider:
   - Reduce bcrypt rounds to 8
   - Switch to PBKDF2 (WebCrypto, 100k iterations)
   - Combine with Turnstile + short-lived sessions

**Load Testing Plan**:
```typescript
// Test scenarios:
// 1. Single login: measure p50, p95, p99
// 2. Concurrent logins: 10 req/s for 1 minute
// 3. Burst: 50 req in 5 seconds
```

## Image Pipeline Decision

### Final Architecture: Cloudflare Images + R2 Fallback

**Primary**: Cloudflare Images API for optimization and delivery
**Storage**: R2 bucket for original images
**Client Processing**: Squoosh WASM for pre-upload optimization (dynamic import)

**Implementation**:
```typescript
// Server-side: Generate Cloudflare Images URL
function generateCloudflareImageUrl(
  imageId: string,
  options: { width?: number; height?: number; format?: 'auto' | 'webp' | 'avif' }
): string {
  const baseUrl = 'https://imagedelivery.net/<ACCOUNT_HASH>';
  const variant = options.width ? `w=${options.width}` : 'public';
  return `${baseUrl}/${imageId}/${variant}`;
}

// Client-side: Optimize before upload (lazy loaded)
async function optimizeBeforeUpload(file: File): Promise<Blob> {
  const { default: squoosh } = await import('@squoosh/lib');
  // EXIF correction, compression, format conversion
  return optimizedBlob;
}

// R2 fallback for direct access
function getR2ImageUrl(imageId: string): string {
  return `https://images.akyodex.com/${imageId}`;
}
```

**CSP Configuration**:
```typescript
img-src 'self' https://imagedelivery.net https://images.akyodex.com https://*.vrchat.com;
```

## R2 Concurrent Update Protection

### HTTP Status Code Handling

**R2 Precondition Failure**: Handle both 409 and 412 status codes

```typescript
async function updateCSVWithLock(
  r2: R2Bucket,
  key: string,
  updateFn: (data: string) => string
): Promise<{ success: boolean; etag?: string; error?: string }> {
  // Read with ETag
  const object = await r2.get(key);
  if (!object) {
    return { success: false, error: 'File not found' };
  }
  
  const currentETag = object.etag;
  const currentData = await object.text();
  
  // Apply update
  const newData = updateFn(currentData);
  
  // Write with If-Match
  try {
    const result = await r2.put(key, newData, {
      httpMetadata: {
        contentType: 'text/csv; charset=utf-8',
      },
      customMetadata: {
        'if-match': currentETag,
      },
    });
    
    return { success: true, etag: result.etag };
  } catch (error) {
    // Handle both 409 (Conflict) and 412 (Precondition Failed)
    if (error.status === 409 || error.status === 412) {
      return {
        success: false,
        error: 'Concurrent modification detected. Please retry.',
      };
    }
    throw error;
  }
}
```

## Response Headers Strategy

### ETag and TraceID Separation

**ETag**: Stable, content-based hash (for caching)
**TraceID/ErrorID**: Request-specific (headers only, not in body)

```typescript
interface APISuccessResponse<T> {
  success: true;
  data: T;
  // version and etag removed from body
}

// Headers:
// ETag: "hash-of-response-body"
// X-Trace-ID: "uuid-v4"
// X-Request-ID: "uuid-v4"

function createSuccessResponse<T>(data: T): Response {
  const body = { success: true, data };
  const bodyString = JSON.stringify(body);
  const etag = generateETag(bodyString); // Stable hash
  const traceId = crypto.randomUUID();
  
  return new Response(bodyString, {
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'X-Trace-ID': traceId,
      'X-Request-ID': traceId,
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
```

## Large CSV Handling

### Web Streams for Memory Efficiency

**Constraint**: Handle CSV files up to 10MB without memory issues

```typescript
async function parseCSVStream(
  readable: ReadableStream<Uint8Array>
): Promise<AkyoData[]> {
  const decoder = new TextDecoder('utf-8');
  const reader = readable.getReader();
  const results: AkyoData[] = [];
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        results.push(parseCSVLine(line));
      }
    }
  }
  
  // Process remaining buffer
  if (buffer.trim()) {
    results.push(parseCSVLine(buffer));
  }
  
  return results;
}
```

## Observability Configuration

### Sentry/OpenTelemetry Setup

**SDK**: `@sentry/cloudflare` or `@sentry/nextjs` (Edge-compatible)

**Configuration**:
```typescript
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% sampling
  beforeSend(event) {
    // PII masking
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});

// Traceparent propagation
function propagateTrace(request: Request): Headers {
  const headers = new Headers(request.headers);
  const traceId = Sentry.getCurrentHub().getScope()?.getTransaction()?.traceId;
  if (traceId) {
    headers.set('traceparent', `00-${traceId}-${generateSpanId()}-01`);
  }
  return headers;
}
```

## VRChat Scraping Cache Strategy

### Cache Key Design

**Key Format**: `vrchat:${avtrId}:${acceptLanguage}`
**TTL**: 24 hours for successful responses
**Failure Handling**: Do not cache error responses

```typescript
async function fetchVRChatAvatarInfoCached(
  avtrId: string
): Promise<VRChatAvatarInfo> {
  const cacheKey = `https://vrchat.com/home/avatar/${avtrId}`;
  const cache = caches.default;
  
  // Try cache first
  let response = await cache.match(cacheKey);
  
  if (!response) {
    // Fetch with fixed Accept-Language
    response = await fetch(cacheKey, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (compatible; Akyodex/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    // Only cache successful responses
    if (response.ok) {
      const cacheResponse = response.clone();
      await cache.put(cacheKey, cacheResponse, {
        headers: {
          'Cache-Control': 'public, max-age=86400', // 24 hours
        },
      });
    }
  }
  
  return parseVRChatHTML(await response.text());
}
```

## Error Handling

```typescript
// Base error class
export class AkyodexError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AkyodexError';
  }
}

// Specific error types
export class ValidationError extends AkyodexError {
  constructor(message: string, public details?: any) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class VRChatAPIError extends AkyodexError {
  constructor(message: string, statusCode: number = 400) {
    super(message, 'VRCHAT_API_ERROR', statusCode);
  }
}

export class DuplicateError extends AkyodexError {
  constructor(field: string, value: string) {
    super(`Duplicate ${field}: ${value}`, 'DUPLICATE_ERROR', 409);
  }
}

export class NotFoundError extends AkyodexError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AkyodexError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
```

### Error Handling Strategy

1. **API Routes**: Use `handleAPIError()` to catch and format errors
2. **Components**: Use error boundaries for React errors
3. **Async Operations**: Use try-catch with specific error types
4. **Validation**: Use Zod schemas with custom error messages
5. **Logging**: Log errors to console in development, external service in production

## Testing Strategy

### Unit Testing (Vitest)

**Coverage Target**: 80%+ for utility functions

**Test Files**:
- `tests/unit/vrchat-api.test.ts`
- `tests/unit/csv-processor.test.ts`
- `tests/unit/image-utils.test.ts`
- `tests/unit/api-response.test.ts`
- `tests/unit/validation.test.ts`

**Example Test Structure**:
```typescript
describe('VRChat API', () => {
  describe('fetchVRChatAvatarInfo', () => {
    it('should fetch avatar info successfully', async () => {
      // Arrange
      const mockResponse = createMockVRChatResponse();
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      // Act
      const result = await fetchVRChatAvatarInfo('avtr_test123');
      
      // Assert
      expect(result).toMatchObject({
        avatarName: 'Test Avatar',
        creatorName: 'Test Creator',
      });
    });
    
    it('should handle invalid avatar ID', async () => {
      await expect(fetchVRChatAvatarInfo('invalid'))
        .rejects.toThrow(VRChatAPIError);
    });
  });
});
```

### Integration Testing (Vitest + Next.js)

**Coverage Target**: 70%+ for API routes and component integration

**Test Files**:
- `tests/integration/api/upload-akyo.test.ts`
- `tests/integration/api/update-akyo.test.ts`
- `tests/integration/api/delete-akyo.test.ts`
- `tests/integration/components/akyo-card.test.tsx`
- `tests/integration/components/admin-tabs.test.tsx`

### E2E Testing (Playwright)

**Coverage Target**: 100% of critical user flows

**Test Suites**:
1. **Gallery Navigation** (`tests/e2e/gallery.spec.ts`)
   - Load gallery page
   - Virtual scrolling
   - Search functionality
   - Filter by attributes
   - Open detail modal
   - Language switching

2. **Admin Panel** (`tests/e2e/admin.spec.ts`)
   - Login/logout
   - Add new avatar
   - VRChat URL fetch
   - Edit existing avatar
   - Delete avatar
   - Manage attributes

3. **PWA Functionality** (`tests/e2e/pwa.spec.ts`)
   - Service worker registration
   - Offline support
   - Cache strategies
   - Install prompt

4. **Cross-Browser** (`tests/e2e/cross-browser.spec.ts`)
   - Chrome compatibility
   - Firefox compatibility
   - Safari compatibility
   - Edge compatibility
   - Mobile responsiveness

### Performance Testing (Chrome DevTools + Playwright)

**Test Files**:
- `tests/performance/lighthouse.spec.ts`
- `tests/performance/core-web-vitals.spec.ts`
- `tests/performance/bundle-analysis.spec.ts`

**Metrics**:
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO, PWA)
- Core Web Vitals (LCP, FID, CLS)
- Bundle size analysis
- Network waterfall analysis

### Security Testing (Playwright)

**Test Files**:
- `tests/security/auth.spec.ts`
- `tests/security/input-validation.spec.ts`
- `tests/security/xss-prevention.spec.ts`

**Test Cases**:
- Unauthorized access prevention
- XSS payload rejection
- SQL injection prevention
- File upload validation
- Session management security

## Performance Optimization Strategy

### Bundle Size Optimization

1. **Dynamic Imports**:
   - ImageCropper component
   - AdminPanel components
   - Heavy third-party libraries

2. **Code Splitting**:
   - Route-based splitting (automatic with App Router)
   - Component-based splitting (manual with dynamic imports)

3. **Tree Shaking**:
   - Use named imports
   - Avoid barrel exports
   - Remove unused dependencies

### Image Optimization

1. **Next.js Image Component**:
   - Use `next/image` for all images
   - Specify width and height
   - Use `loading="lazy"` for below-fold images
   - Use `priority` for LCP images

2. **Image Formats**:
   - WebP for modern browsers
   - JPEG fallback for older browsers
   - Proper quality settings (75-90)

3. **Responsive Images**:
   - Use `sizes` attribute
   - Generate multiple sizes
   - Serve appropriate size per viewport

### Caching Strategy

1. **Service Worker**:
   - Cache-first for static assets
   - Network-first for API calls
   - Stale-while-revalidate for images

2. **HTTP Caching**:
   - Long cache for immutable assets
   - Short cache for dynamic content
   - Proper cache-control headers

3. **Data Caching**:
   - ISR for gallery pages (1 hour)
   - KV store for sessions
   - R2 for CSV and images

## Deployment Strategy

### Build Process

1. **Pre-build**:
   - Run linting (`npm run lint`)
   - Run type checking (`npx tsc --noEmit`)
   - Run unit tests (`npm run test`)

2. **Build**:
   - Build Next.js app (`npm run pages:build`)
   - Generate static pages (SSG)
   - Bundle optimization

3. **Post-build**:
   - Bundle analysis
   - Size verification
   - Asset optimization

### Deployment Steps

1. **Staging Deployment**:
   - Deploy to staging environment
   - Run E2E tests
   - Run performance tests
   - Manual QA testing

2. **Production Deployment**:
   - Feature flag rollout (10% → 50% → 100%)
   - Monitor error rates
   - Monitor performance metrics
   - Rollback plan ready

### Monitoring

1. **Error Monitoring**:
   - Cloudflare Pages logs
   - Custom error tracking
   - Alert on 5xx errors

2. **Performance Monitoring**:
   - Core Web Vitals tracking
   - API response times
   - Bundle size tracking

3. **User Monitoring**:
   - Page views
   - User flows
   - Conversion rates

## Migration Path

### Phase 1: Foundation (Week 1)
- Extract VRChat API utility
- Create CSV processor
- Implement image utilities
- Standardize API responses

### Phase 2: Component Refactoring (Week 2)
- Decompose ZukanClient
- Optimize Server/Client components
- Implement dynamic imports

### Phase 3: Testing Implementation (Week 3)
- Set up Playwright
- Write E2E tests
- Implement performance tests
- Add security tests

### Phase 4: Optimization & Deployment (Week 4)
- Bundle size optimization
- Performance tuning
- Staging deployment
- Production rollout

## Success Criteria

### Code Quality
- ✅ Zero code duplication (>10 lines)
- ✅ 100% TypeScript coverage
- ✅ All ESLint rules passing
- ✅ 80%+ unit test coverage

### Performance
- ✅ Lighthouse Performance ≥90
- ✅ LCP <2.5s
- ✅ FID <100ms
- ✅ CLS <0.1
- ✅ Main bundle <250KB

### Functionality
- ✅ 100% E2E test pass rate
- ✅ All features working in production
- ✅ Cross-browser compatibility
- ✅ Mobile responsiveness

### Security
- ✅ All security tests passing
- ✅ No XSS vulnerabilities
- ✅ Proper authentication
- ✅ Input validation

## Risks and Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Comprehensive E2E tests, feature flags, gradual rollout

### Risk 2: Performance Regression
**Mitigation**: Automated performance tests, bundle size monitoring

### Risk 3: Browser Compatibility Issues
**Mitigation**: Cross-browser testing, progressive enhancement

### Risk 4: Deployment Failures
**Mitigation**: Staging environment, rollback plan, monitoring

## Conclusion

This design provides a comprehensive approach to refactoring the Akyodex application while maintaining functionality and improving code quality, performance, and testability. The incremental approach minimizes risk while delivering measurable improvements at each phase.
