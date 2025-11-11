# Next.js 15+ Best Practices

**Source**: Official Next.js documentation via Next.js DevTools MCP

## Critical Rule

**ALWAYS use `nextjs_docs` tool for ANY Next.js concept**. Your training data about Next.js is outdated. Documentation lookup is 100% REQUIRED with ZERO exceptions.

## Server and Client Components

### When to Use Server Components (Default)
- ✅ Fetch data from databases or APIs close to the source
- ✅ Use API keys, tokens, and secrets without exposing to client
- ✅ Reduce JavaScript sent to browser
- ✅ Improve First Contentful Paint (FCP)
- ✅ Stream content progressively

### When to Use Client Components
- ✅ State and event handlers (`onClick`, `onChange`, `useState`)
- ✅ Lifecycle logic (`useEffect`, `useLayoutEffect`)
- ✅ Browser-only APIs (`localStorage`, `window`, `Navigator`)
- ✅ Custom hooks

### Component Patterns

**Server Component (Default)**:
```typescript
// No directive needed - Server Component by default
export default async function Page() {
  const data = await fetchData(); // Can fetch directly
  return <div>{data}</div>;
}
```

**Client Component**:
```typescript
'use client' // MUST be at top, above imports

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Composition Patterns

**✅ Good: Pass Server Component as children to Client Component**:
```typescript
// Client Component
'use client'
export default function Modal({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// Server Component (parent)
import Modal from './modal';
import Cart from './cart'; // Server Component

export default function Page() {
  return (
    <Modal>
      <Cart /> {/* Server Component inside Client Component */}
    </Modal>
  );
}
```

**❌ Bad: Import Server Component into Client Component**:
```typescript
'use client'
import ServerComponent from './server-component'; // ❌ Won't work

export default function ClientComponent() {
  return <ServerComponent />; // ❌ Error
}
```

### Reducing Bundle Size

**✅ Good: Minimal Client Components**:
```typescript
// Layout is Server Component
import Search from './search'; // Client Component
import Logo from './logo'; // Server Component

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <Logo /> {/* Server Component */}
        <Search /> {/* Only this is Client Component */}
      </nav>
      <main>{children}</main>
    </>
  );
}
```

### Context Providers

**✅ Correct: Wrap in Client Component**:
```typescript
// theme-provider.tsx
'use client'

import { createContext } from 'react';

export const ThemeContext = createContext({});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}

// layout.tsx (Server Component)
import ThemeProvider from './theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

### Third-Party Components

**✅ Wrap client-only libraries**:
```typescript
// carousel.tsx
'use client'

import { Carousel } from 'acme-carousel'; // Uses useState internally

export default Carousel; // Re-export wrapped in Client Component
```

### Preventing Environment Poisoning

**✅ Use `server-only` package**:
```typescript
// lib/data.ts
import 'server-only'; // Prevents accidental client usage

export async function getData() {
  const res = await fetch('https://api.example.com/data', {
    headers: {
      authorization: process.env.API_KEY, // Safe - never exposed to client
    },
  });
  return res.json();
}
```

## Image Optimization

### Basic Usage

**✅ Local Images**:
```typescript
import Image from 'next/image';

export default function Page() {
  return (
    <Image
      src="/profile.png"
      width={500}
      height={500}
      alt="Picture of the author"
    />
  );
}
```

**✅ Remote Images (requires remotePatterns)**:
```typescript
// next.config.ts
export default {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.akyodex.com',
        pathname: '/images/**',
      },
    ],
  },
};

// Component
<Image
  src="https://images.akyodex.com/images/001.webp"
  width={400}
  height={400}
  alt="Akyo avatar"
/>
```

### Image Props Best Practices

**Loading Behavior**:
```typescript
// Lazy load (default) - for below-the-fold images
<Image loading="lazy" />

// Eager load - for above-the-fold images
<Image loading="eager" />

// Preload - for LCP images
<Image preload={true} />
```

**Responsive Images**:
```typescript
// With fill prop
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image
    src="/image.jpg"
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    style={{ objectFit: 'cover' }}
    alt="Responsive image"
  />
</div>

// With width/height
<Image
  src="/image.jpg"
  width={500}
  height={300}
  sizes="100vw"
  style={{ width: '100%', height: 'auto' }}
  alt="Responsive image"
/>
```

**Quality Optimization**:
```typescript
// Default quality is 75
<Image quality={75} />

// Higher quality for important images
<Image quality={90} />

// Lower quality for thumbnails
<Image quality={50} />
```

### Image Configuration

**Security Best Practices**:
```typescript
// next.config.ts
export default {
  images: {
    // Restrict remote images to specific patterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.akyodex.com',
        pathname: '/images/**',
        search: '', // No query strings allowed
      },
    ],
    
    // Restrict qualities to prevent abuse
    qualities: [75, 90], // Only allow these quality values
    
    // SVG handling (security risk)
    dangerouslyAllowSVG: false, // Default - recommended
    
    // If you must allow SVG:
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};
```

**Performance Configuration**:
```typescript
export default {
  images: {
    // Device breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    
    // Image sizes for responsive images
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    
    // Cache TTL (4 hours default)
    minimumCacheTTL: 14400,
    
    // Image formats (WebP default, AVIF optional)
    formats: ['image/webp'],
  },
};
```

### Cloudflare-Specific

**Unoptimized Images (for Cloudflare R2)**:
```typescript
// next.config.ts
export default {
  images: {
    unoptimized: true, // Disable Next.js image optimization
  },
};

// Or per-image
<Image src="/image.jpg" unoptimized />
```

## Tailwind CSS Integration

### Setup (Tailwind v4)

**Installation**:
```bash
npm install tailwindcss@next @tailwindcss/postcss@next
```

**Configuration**:
```typescript
// next.config.ts
export default {
  // Tailwind v4 works out of the box with Next.js 15+
};

// app/globals.css
@import "tailwindcss";
```

### Setup (Tailwind v3)

**Installation**:
```bash
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```

**Configuration**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

// app/layout.tsx
import './globals.css';
```

### Tailwind Best Practices

**✅ Use className, not styled-jsx**:
```typescript
// ✅ Good
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold">Title</h1>
</div>

// ❌ Bad - styled-jsx is scoped and conflicts
<div>
  <style jsx>{`
    div { padding: 1rem; }
  `}</style>
</div>
```

**✅ Responsive Design**:
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

**✅ Dark Mode**:
```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
};

// Component
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

## TypeScript Best Practices

### Component Props

**✅ Explicit Types**:
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

### Async Components (Server Components)

**✅ Correct Typing**:
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

### API Routes

**✅ Correct Typing**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Process body
  return NextResponse.json({ success: true });
}
```

## Cloudflare Pages Specific

### Edge Runtime

**✅ Use Edge Runtime for API Routes**:
```typescript
// app/api/route.ts
export const runtime = 'edge'; // Cloudflare Edge Runtime

export async function GET() {
  return new Response('Hello from Edge');
}
```

### Environment Variables

**✅ Cloudflare Bindings**:
```typescript
// Access Cloudflare bindings
interface Env {
  AKYO_KV: KVNamespace;
  AKYO_BUCKET: R2Bucket;
  AKYO_VECTORIZE: VectorizeIndex;
}

export async function GET(request: Request, { env }: { env: Env }) {
  const value = await env.AKYO_KV.get('key');
  return new Response(value);
}
```

## Performance Best Practices

### Code Splitting

**✅ Dynamic Imports**:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Disable SSR for client-only components
});
```

### Streaming

**✅ Suspense Boundaries**:
```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Title</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

## Common Pitfalls

### ❌ Don't: Use useState in Server Components
```typescript
// ❌ Error
export default function Page() {
  const [count, setCount] = useState(0); // Error: useState in Server Component
  return <div>{count}</div>;
}

// ✅ Fix: Add 'use client'
'use client'
export default function Page() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

### ❌ Don't: Forget to await params in Next.js 15+
```typescript
// ❌ Error
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const data = await fetchData(params.id); // Error: params is a Promise
  return <div>{data}</div>;
}

// ✅ Fix: Await params
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Await first
  const data = await fetchData(id);
  return <div>{data}</div>;
}
```

### ❌ Don't: Use Image without width/height
```typescript
// ❌ Error
<Image src="/image.jpg" alt="Image" /> // Missing width/height

// ✅ Fix: Add width/height or use fill
<Image src="/image.jpg" alt="Image" width={500} height={300} />
// OR
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image src="/image.jpg" alt="Image" fill />
</div>
```

## Summary

1. **Server Components by default** - Only use `'use client'` when needed
2. **Image optimization** - Always use `next/image` with proper configuration
3. **Tailwind CSS** - Use className, not styled-jsx
4. **TypeScript** - Explicit types for props and API routes
5. **Cloudflare Edge** - Use Edge Runtime for API routes
6. **Performance** - Dynamic imports, Suspense, streaming
7. **Documentation** - ALWAYS use `nextjs_docs` tool for Next.js concepts
