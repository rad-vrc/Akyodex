# Design Patterns & Guidelines

## Architecture Patterns

### Server-First Architecture
- **Default**: Server Components for data fetching and rendering
- **Client Components**: Only when interactivity is needed
- **Rationale**: Reduces JavaScript bundle size, improves performance

### Edge-First API Design
- **Prefer**: Edge Runtime for API routes when possible
- **Node.js Runtime**: Only when necessary (document why)
- **Benefits**: Lower latency, global distribution

### Static Site Generation (SSG) + ISR
- **Gallery Pages**: Pre-rendered at build time
- **Revalidation**: 1-hour ISR for fresh data
- **Benefits**: Fast page loads, SEO-friendly

## Component Patterns

### Server Component Pattern
```typescript
// Default - no directive needed
export default async function AvatarGallery() {
  // Fetch data directly in component
  const avatars = await fetchAvatars();
  
  return (
    <div>
      {avatars.map(avatar => (
        <AvatarCard key={avatar.id} avatar={avatar} />
      ))}
    </div>
  );
}
```

### Client Component Pattern
```typescript
'use client' // Required at top

import { useState } from 'react';

export function InteractiveCard({ avatar }: Props) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  return (
    <div onClick={() => setIsFavorite(!isFavorite)}>
      {/* Interactive UI */}
    </div>
  );
}
```

### Composition Pattern (Server + Client)
```typescript
// Server Component (parent)
export default function Page() {
  return (
    <ClientWrapper>
      <ServerContent /> {/* Server Component as children */}
    </ClientWrapper>
  );
}

// Client Component (wrapper)
'use client'
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

## API Route Patterns

### Standard Request/Response Pattern
```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    // 1. Parse request
    const body = await request.json();
    
    // 2. Validate input
    if (!body.id) {
      return jsonError('ID required', 400);
    }
    
    // 3. Process
    const result = await processData(body);
    
    // 4. Return response
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('[route-name] Error:', error);
    return jsonError('Internal error', 500);
  }
}
```

### Authentication Pattern
```typescript
export async function POST(request: Request) {
  // Validate authentication
  const result = await ensureAdminRequest(request, {
    requireOrigin: true,  // CSRF protection
    requireOwner: false,  // Allow both owner and admin
  });
  
  if ('response' in result) {
    return result.response; // Returns error response
  }
  
  const { session } = result;
  // session.role is 'owner' or 'admin'
  
  // Continue with authenticated logic
}
```

### CSRF Protection Pattern
```typescript
export async function POST(request: Request) {
  // Validate origin for state-changing operations
  if (!validateOrigin(request)) {
    return jsonError('Invalid origin', 403);
  }
  
  // Continue with request
}
```

## Data Fetching Patterns

### Server-Side Data Fetching
```typescript
// In Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // ISR: 1 hour
  });
  
  return <div>{/* Render data */}</div>;
}
```

### Client-Side Data Fetching
```typescript
'use client'

import { useState, useEffect } from 'react';

export function ClientData() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{/* Render data */}</div>;
}
```

### Cloudflare R2 Pattern
```typescript
// In API route
export async function GET(request: Request, { env }: { env: Env }) {
  const object = await env.AKYO_BUCKET.get('path/to/file');
  
  if (!object) {
    return jsonError('Not found', 404);
  }
  
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
```

### Cloudflare KV Pattern
```typescript
// In API route
export async function GET(request: Request, { env }: { env: Env }) {
  const value = await env.AKYO_KV.get('key');
  
  if (!value) {
    return jsonError('Not found', 404);
  }
  
  return Response.json({ value });
}

export async function POST(request: Request, { env }: { env: Env }) {
  const { key, value } = await request.json();
  
  await env.AKYO_KV.put(key, value, {
    expirationTtl: 86400, // 24 hours
  });
  
  return Response.json({ success: true });
}
```

## Error Handling Patterns

### API Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('[route-name] Error:', error);
  
  // Use helper for consistent error format
  return jsonError('Operation failed', 500);
}
```

### Component Error Handling
```typescript
'use client'

import { useState } from 'react';

export function Component() {
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async () => {
    try {
      await performAction();
    } catch (err) {
      console.error('Action failed:', err);
      setError('Something went wrong');
    }
  };
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleAction}>Action</button>
    </div>
  );
}
```

### Fallback Pattern (VRChat Images)
```typescript
// 3-tier fallback system
async function getAvatarImage(id: string, avtr?: string) {
  // 1. Try R2 bucket
  try {
    const r2Image = await fetchFromR2(id);
    if (r2Image) return r2Image;
  } catch (error) {
    console.error('R2 fetch failed:', error);
  }
  
  // 2. Try VRChat API
  if (avtr) {
    try {
      const vrchatImage = await fetchFromVRChat(avtr);
      if (vrchatImage) return vrchatImage;
    } catch (error) {
      console.error('VRChat fetch failed:', error);
    }
  }
  
  // 3. Return placeholder
  return getPlaceholderImage();
}
```

## Security Patterns

### Input Validation Pattern
```typescript
// Length-limited regex (prevents ReDoS)
const ID_PATTERN = /^[0-9]{4}$/; // Exactly 4 digits
const AVTR_PATTERN = /^avtr_[A-Za-z0-9-]{1,50}$/; // Limited length

function validateId(id: string): boolean {
  return ID_PATTERN.test(id);
}

function validateAvtr(avtr: string): boolean {
  return AVTR_PATTERN.test(avtr);
}
```

### HTML Sanitization Pattern
```typescript
import { stripHTMLTags, decodeHTMLEntities } from '@/lib/html-utils';

// Clean user input
function sanitizeInput(input: string): string {
  // 1. Decode HTML entities
  const decoded = decodeHTMLEntities(input);
  
  // 2. Strip HTML tags
  const clean = stripHTMLTags(decoded);
  
  return clean;
}
```

### Timing-Safe Comparison Pattern
```typescript
import { timingSafeEqual } from 'crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  
  // Pad to same length
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  
  return timingSafeEqual(paddedA, paddedB);
}
```

### Session Management Pattern
```typescript
// Set session cookie
await setSessionCookie(token);

// Clear session cookie
await clearSessionCookie();

// Verify session
const session = await verifySession(request);
if (!session) {
  return jsonError('Unauthorized', 401);
}
```

## CSV Data Patterns

### CSV Parsing Pattern
```typescript
import { parse } from 'csv-parse/sync';

function parseCSV(csvContent: string): AkyoData[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  return records.map(record => ({
    id: record.id,
    nickname: record.nickname,
    // ... other fields
  }));
}
```

### CSV Writing Pattern
```typescript
import { stringify } from 'csv-stringify/sync';

function writeCSV(data: AkyoData[]): string {
  return stringify(data, {
    header: true,
    columns: ['id', 'nickname', 'avatarName', /* ... */],
    quoted: true, // Quote all fields
  });
}
```

### CSV Update Pattern
```typescript
async function updateAvatarInCSV(id: string, updates: Partial<AkyoData>) {
  // 1. Fetch current CSV
  const csvContent = await fetchCSVFromR2();
  
  // 2. Parse CSV
  const avatars = parseCSV(csvContent);
  
  // 3. Find and update avatar
  const index = avatars.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Avatar not found');
  }
  avatars[index] = { ...avatars[index], ...updates };
  
  // 4. Write back to CSV
  const newCSV = writeCSV(avatars);
  await uploadCSVToR2(newCSV);
  
  // 5. Commit to GitHub (if enabled)
  await commitToGitHub(newCSV);
}
```

## Internationalization (i18n) Patterns

### Language Detection Pattern
```typescript
// In middleware.ts
export function middleware(request: NextRequest) {
  // 1. Check cookie
  const cookieLang = request.cookies.get('lang')?.value;
  if (cookieLang) return cookieLang;
  
  // 2. Check Cloudflare header
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry === 'JP') return 'ja';
  if (cfCountry === 'US') return 'en';
  
  // 3. Check Accept-Language
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang?.includes('ja')) return 'ja';
  if (acceptLang?.includes('en')) return 'en';
  
  // 4. Default
  return 'ja';
}
```

### Language Switcher Pattern
```typescript
'use client'

export function LanguageSelector() {
  const [lang, setLang] = useState('ja');
  
  const switchLanguage = (newLang: string) => {
    // Set cookie
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
    
    // Reload page
    window.location.reload();
  };
  
  return (
    <select value={lang} onChange={(e) => switchLanguage(e.target.value)}>
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}
```

## PWA Patterns

### Service Worker Registration Pattern
```typescript
'use client'

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.error('SW registration failed:', err));
    }
  }, []);
  
  return null;
}
```

### Caching Strategy Pattern (in sw.js)
```javascript
// Cache First (fonts, icons)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/fonts/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Network First (HTML, API)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});

// Stale While Revalidate (images, CSS, JS)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/images/')) {
    event.respondWith(
      caches.open('images').then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
  }
});
```

## Testing Patterns

### E2E Test Pattern
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    await page.goto('/');
  });
  
  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/page');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Common Anti-Patterns to Avoid

### ❌ Don't: Use NextRequest When Not Needed
```typescript
// ❌ Bad
import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
}

// ✅ Good
export async function POST(request: Request) {
  return Response.json({ success: true });
}
```

### ❌ Don't: Duplicate Cookie Configuration
```typescript
// ❌ Bad
const cookieStore = await cookies();
cookieStore.set('admin_session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 604800,
  path: '/',
});

// ✅ Good
await setSessionCookie(token);
```

### ❌ Don't: Inline Error Responses
```typescript
// ❌ Bad
return Response.json({ error: 'Error' }, { status: 400 });

// ✅ Good
return jsonError('Error', 400);
```

### ❌ Don't: Use Client Components Unnecessarily
```typescript
// ❌ Bad - No interactivity needed
'use client'
export function StaticCard({ data }: Props) {
  return <div>{data.title}</div>;
}

// ✅ Good - Server Component
export function StaticCard({ data }: Props) {
  return <div>{data.title}</div>;
}
```

### ❌ Don't: Forget to Await params in Next.js 15+
```typescript
// ❌ Bad
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const data = await fetchData(params.id); // Error: params is a Promise
}

// ✅ Good
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Await first
  const data = await fetchData(id);
}
```
