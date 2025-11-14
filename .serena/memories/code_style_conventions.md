# Code Style & Conventions

## Language & Framework

- **TypeScript**: Strict mode enabled (tsconfig.json)
- **React**: 19.1.0 with App Router
- **Next.js**: 15.5.2 (App Router mandatory)
- **Styling**: Tailwind CSS 4.x (utility-first, no inline styles unless dynamic)

## Component Patterns

### Server Components (Default)
```typescript
// No directive needed - Server Component by default
export default async function Page() {
  const data = await fetchData(); // Can fetch directly
  return <div>{data}</div>;
}
```

### Client Components
```typescript
'use client' // MUST be at top, above imports

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Rule**: Prefer Server Components unless client-side hooks are needed (useState, useEffect, onClick, etc.)

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `AkyoCard.tsx`, `MiniAkyoBg.tsx`)
- **Utilities**: kebab-case (e.g., `csv-utils.ts`, `api-helpers.ts`)
- **Types**: kebab-case (e.g., `akyo.ts`)
- **API Routes**: kebab-case (e.g., `upload-akyo/route.ts`)

### Code
- **Components**: PascalCase (e.g., `AkyoCard`, `AdminHeader`)
- **Functions**: camelCase (e.g., `fetchAvatarData`, `validateOrigin`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SESSION_DURATION`, `MAX_FILE_SIZE`)
- **Interfaces/Types**: PascalCase (e.g., `AkyoData`, `SessionPayload`)

## API Route Patterns

### Standard Request/Response (Preferred)
```typescript
export const runtime = 'edge'; // or 'nodejs' with documentation

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ success: true, data: result });
  } catch (error) {
    return jsonError('Error message', 500);
  }
}
```

### Helper Functions
```typescript
import { jsonError, setSessionCookie, ensureAdminRequest } from '@/lib/api-helpers';

// Error responses
return jsonError('Invalid input', 400);
// Returns: { success: false, error: 'Invalid input' }

// Cookie management
await setSessionCookie(token);
await clearSessionCookie();

// Authentication
const result = await ensureAdminRequest(request, { requireOwner: true });
if ('response' in result) return result.response;
```

### Runtime Declaration
```typescript
// Edge-compatible routes
export const runtime = 'edge';

// Node.js-required routes (document why)
export const runtime = 'nodejs';
/**
 * This route requires Node.js runtime because:
 * - Uses csv-parse/sync for synchronous CSV parsing
 * - Uses GitHub API with complex Node.js dependencies
 * - Uses Buffer for R2 binary operations
 */
```

## Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import type { AkyoData } from '@/types/akyo';

// 2. Types/Interfaces
interface AkyoCardProps {
  akyo: AkyoData;
  onFavorite?: (id: string) => void;
}

// 3. Component
export function AkyoCard({ akyo, onFavorite }: AkyoCardProps) {
  // State
  const [isHovered, setIsHovered] = useState(false);
  
  // Handlers
  const handleClick = () => { /* ... */ };
  
  // Render
  return <div>...</div>;
}
```

## Import Order

1. External packages (react, next, etc.)
2. Internal aliases (@/components, @/lib, @/types)
3. Relative imports (./utils, ../types)
4. CSS/styles

```typescript
// ✅ Good
import { useState } from 'react';
import { AkyoCard } from '@/components/akyo-card';
import { fetchData } from '@/lib/api-helpers';
import type { AkyoData } from '@/types/akyo';
import './styles.css';
```

## Path Aliases

- `@/*` → `./src/*`
- Example: `import { AkyoCard } from '@/components/akyo-card'`

## TypeScript Best Practices

### Explicit Types
```typescript
interface AkyoCardProps {
  akyo: AkyoData;
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

export function AkyoCard({ akyo, onToggleFavorite, onShowDetail }: AkyoCardProps) {
  // Implementation
}
```

### Async Components (Next.js 15+)
```typescript
interface PageProps {
  params: Promise<{ id: string }>; // Next.js 15+ - params is a Promise
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params; // Must await
  const data = await fetchData(id);
  return <div>{data}</div>;
}
```

## Tailwind CSS Usage

### Use className, not styled-jsx
```typescript
// ✅ Good
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold">Title</h1>
</div>

// ❌ Bad - styled-jsx conflicts with Tailwind
<div>
  <style jsx>{`
    div { padding: 1rem; }
  `}</style>
</div>
```

### Responsive Design
```typescript
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4 
  xl:grid-cols-5 
  gap-4
">
  {/* Cards */}
</div>
```

## CSV Data Handling

### CSV Headers (Stable)
- Use 4-digit IDs (0001-0640)
- Normalize strings with HTML utility helpers before writing
- Maintain header order consistency

### Unicode Normalization
```typescript
import { decodeHTMLEntities, stripHTMLTags } from '@/lib/html-utils';

// Normalize before comparison
const normalized = decodeHTMLEntities(stripHTMLTags(value));
```

## Security Practices

### Input Validation
```typescript
// Length-limited regex (prevents ReDoS)
const avtrMatch = avtr.match(/^avtr_[A-Za-z0-9-]{1,50}$/);
if (!avtrMatch) {
  return Response.json({ error: 'Invalid avtr format' }, { status: 400 });
}
```

### HTML Sanitization
```typescript
import { stripHTMLTags, decodeHTMLEntities } from '@/lib/html-utils';

// Strip all HTML tags safely
const clean = stripHTMLTags(userInput);

// Decode HTML entities
const decoded = decodeHTMLEntities(text);
```

### Timing-Safe Comparison
```typescript
import { timingSafeEqual } from 'crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  return timingSafeEqual(paddedA, paddedB);
}
```

## Error Handling

### API Routes
```typescript
try {
  // Operation
} catch (error) {
  console.error('[route-name] Error:', error);
  return jsonError('Operation failed', 500);
}
```

### Components
```typescript
try {
  // Operation
} catch (error) {
  console.error('Component error:', error);
  setError('Something went wrong');
}
```

## Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (except JSX attributes)
- **Semicolons**: Required
- **Trailing commas**: Yes (multiline)
- **Line length**: 100 characters (soft limit)

## ESLint Configuration

- Extends: `next/core-web-vitals`, `next/typescript`
- Ignores: node_modules, .next, .open-next, build artifacts, Service Worker

## Comments & Documentation

### JSDoc for Functions
```typescript
/**
 * Validates the origin header for CSRF protection
 * @param request - The incoming request
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(request: Request): boolean {
  // Implementation
}
```

### Inline Comments
```typescript
// Use for complex logic explanation
const result = complexCalculation(); // Brief explanation if needed
```

### TODO Comments
```typescript
// TODO: Implement caching for better performance
// FIXME: Handle edge case when user is null
```
