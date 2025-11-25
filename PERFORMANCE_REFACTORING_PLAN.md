# Akyodex Performance Refactoring Plan
## Next.js 15 Display Speed Optimization (表示速度最適化)

**Created**: 2025-11-24  
**Priority**: Display Speed (表示速度) Maximization  
**Target Deployment**: Cloudflare Pages with @opennextjs/cloudflare  

---

## 📊 Current Performance Analysis

### Current Architecture Issues

1. **❌ Image Optimization Disabled**
   - `next.config.ts`: `images.unoptimized = true`
   - No image resizing, format conversion, or WebP support
   - All images served at full resolution from R2

2. **❌ No Build-Time Static Generation**
   - Missing `generateStaticParams()` for 640 avatar pages
   - Pages rendered on-demand (ISR only)
   - TTFB: ~500ms+ for first visit

3. **❌ Inefficient Data Fetching**
   - CSV fetched from GitHub RAW on every ISR revalidation
   - CSV parsed on every request: `parseCsvToAkyoData(text)`
   - No React `cache()` implementation for deduplication

4. **❌ Client-Side Heavy Components**
   - `ZukanClient` is a large Client Component
   - No Server/Client boundary optimization
   - Increased bundle size and hydration time

5. **❌ No Incremental Cache**
   - `open-next.config.ts`: `incrementalCache: 'dummy'`
   - Not utilizing R2 for fetch cache storage

### Expected Performance Impact

| Metric | Current (推定) | Target (目標) | Improvement |
|--------|---------------|---------------|-------------|
| **LCP** | 2.5s | < 1.5s | 🚀 40% faster |
| **TTFB** | 500ms | < 200ms | 🚀 60% faster |
| **FCP** | 1.2s | < 0.8s | 🚀 33% faster |
| **Bundle Size** | 250KB | < 150KB | 📦 40% reduction |
| **Image Load** | Full size | Optimized | 🖼️ 70% smaller |

---

## 🎯 Implementation Phases

### Phase 1: Build-Time Static Generation (HIGH PRIORITY)
**Impact**: TTFB 500ms → 50ms for static pages  
**Effort**: Low  
**Files**: `src/app/zukan/[id]/page.tsx`

#### Problem
Currently, avatar detail pages (`/zukan?id=0001`) are rendered on-demand with ISR. First request has high TTFB.

#### Solution
Implement `generateStaticParams()` to pre-render all 640 avatar pages at build time.

#### Implementation

```typescript
// src/app/zukan/[id]/page.tsx (NEW FILE)

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAkyoData, getAkyoById } from '@/lib/akyo-data-server';
import { AvatarDetailClient } from './avatar-detail-client';

// ISR: Revalidate every hour (same as gallery)
export const revalidate = 3600;

/**
 * Generate static params for all avatars at build time
 * This enables SSG for all 640 avatar pages
 */
export async function generateStaticParams() {
  const data = await getAkyoData('ja');
  
  return data.map((akyo) => ({
    id: akyo.id, // e.g., "0001", "0640"
  }));
}

/**
 * Generate dynamic metadata for each avatar page
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const akyo = await getAkyoById(id, 'ja');
  
  if (!akyo) {
    return {
      title: 'Avatar Not Found - Akyoずかん',
    };
  }

  return {
    title: `${akyo.name} - Akyoずかん`,
    description: `${akyo.name} by ${akyo.author}. ${akyo.description || ''}`,
    openGraph: {
      title: `${akyo.name} - Akyoずかん`,
      description: `${akyo.name} by ${akyo.author}`,
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_R2_BASE}/images/${akyo.id}.webp`,
          width: 800,
          height: 800,
          alt: akyo.name,
        },
      ],
    },
  };
}

/**
 * Avatar detail page (Server Component)
 */
export default async function AvatarDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const akyo = await getAkyoById(id, 'ja');
  
  if (!akyo) {
    notFound();
  }

  return <AvatarDetailClient akyo={akyo} />;
}
```

#### New Helper Function

```typescript
// src/lib/akyo-data-server.ts (ADD THIS FUNCTION)

/**
 * Get single Akyo by ID
 * @param id - 4-digit ID (e.g., "0001")
 * @param lang - Language code
 * @returns Single Akyo data or null if not found
 */
export async function getAkyoById(
  id: string,
  lang: SupportedLanguage = 'ja'
): Promise<AkyoData | null> {
  const data = await getAkyoData(lang);
  return data.find((akyo) => akyo.id === id) || null;
}
```

#### Expected Results
- ✅ All 640 avatar pages pre-rendered at build time
- ✅ TTFB: 500ms → 50ms (10x faster)
- ✅ No on-demand rendering delay
- ✅ Better SEO with static HTML

---

### Phase 2: Cloudflare Images Integration (HIGH PRIORITY)
**Impact**: Image load time 70% reduction, automatic format optimization  
**Effort**: Medium  
**Files**: `next.config.ts`, `src/lib/cloudflare-image-loader.ts`

#### Problem
- Images served at full resolution from R2
- No WebP/AVIF format conversion
- No responsive image sizes
- `unoptimized: true` disables all Next.js Image features

#### Solution
Implement Cloudflare Images custom loader with automatic optimization.

#### Cloudflare Images Setup

1. **Enable Cloudflare Images**
   - Dashboard → Images → Enable service
   - Note your Account Hash (e.g., `abc123def`)
   - Images URL format: `https://imagedelivery.net/{account_hash}/{image_id}/{variant}`

2. **Create Image Variants** (via Dashboard or API)
   - `thumbnail`: 200x200, fit=cover
   - `small`: 400x400, fit=contain
   - `medium`: 800x800, fit=contain
   - `large`: 1200x1200, fit=contain
   - `public`: Original size, format=auto

3. **Upload Images to Cloudflare Images** (Migration)
   ```bash
   # Upload from R2 to Cloudflare Images
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/images/v1" \
     -H "Authorization: Bearer {api_token}" \
     -F "url=https://images.akyodex.com/images/0001.webp" \
     -F "id=0001"
   ```

#### Implementation

```typescript
// src/lib/cloudflare-image-loader.ts (NEW FILE)

import type { ImageLoaderProps } from 'next/image';

/**
 * Cloudflare Images Custom Loader
 * 
 * Converts Next.js Image requests to Cloudflare Images URLs
 * with automatic format optimization and resizing
 * 
 * @see https://developers.cloudflare.com/images/transform-images/
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // Cloudflare Images configuration
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
  
  // Extract image ID from src
  // Expected format: /images/0001.webp or https://images.akyodex.com/images/0001.webp
  const imageId = extractImageId(src);
  
  if (!imageId) {
    // Fallback for external URLs (VRChat API)
    if (src.includes('vrchat.com')) {
      return src;
    }
    console.warn(`[cloudflareImageLoader] Invalid image src: ${src}`);
    return src;
  }

  // Select appropriate variant based on width
  const variant = selectVariant(width);
  
  // Construct Cloudflare Images URL
  // Format: https://imagedelivery.net/{account_hash}/{image_id}/{variant}
  const url = `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
  
  // Add quality parameter if specified
  if (quality && quality !== 75) {
    return `${url}?quality=${quality}`;
  }
  
  return url;
}

/**
 * Extract image ID from various src formats
 */
function extractImageId(src: string): string | null {
  // Pattern 1: /images/0001.webp → 0001
  const match1 = src.match(/\/images\/(\d{4})\.(webp|png|jpg|jpeg)/);
  if (match1) return match1[1];
  
  // Pattern 2: https://images.akyodex.com/images/0001.webp → 0001
  const match2 = src.match(/images\.akyodex\.com\/images\/(\d{4})\.(webp|png|jpg|jpeg)/);
  if (match2) return match2[1];
  
  // Pattern 3: Direct ID (0001) → 0001
  if (/^\d{4}$/.test(src)) return src;
  
  return null;
}

/**
 * Select appropriate variant based on requested width
 */
function selectVariant(width: number): string {
  if (width <= 200) return 'thumbnail';
  if (width <= 400) return 'small';
  if (width <= 800) return 'medium';
  if (width <= 1200) return 'large';
  return 'public';
}
```

#### Update Next.js Config

```typescript
// next.config.ts (UPDATE)

const nextConfig: NextConfig = {
  images: {
    // ✅ Enable Next.js Image optimization
    unoptimized: false, // CHANGED: was true
    
    // ✅ Use Cloudflare Images loader
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-image-loader.ts',
    
    // Image configuration
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imagedelivery.net', // Cloudflare Images CDN
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.akyodex.com', // Fallback to R2
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '**.vrchat.com', // VRChat API fallback
        pathname: '/**',
      },
    ],
  },
  
  // ... rest of config
};
```

#### Update Image Components

```typescript
// Example: Update avatar card to use optimized Image

import Image from 'next/image';

export function AvatarCard({ akyo }: { akyo: AkyoData }) {
  const imageUrl = `${process.env.NEXT_PUBLIC_R2_BASE}/images/${akyo.id}.webp`;
  
  return (
    <div className="avatar-card">
      <Image
        src={imageUrl}
        alt={akyo.name}
        width={400}
        height={400}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false} // Lazy load by default
        quality={85}
        placeholder="blur"
        blurDataURL={generateBlurDataURL(akyo.id)}
      />
      <h3>{akyo.name}</h3>
    </div>
  );
}
```

#### Expected Results
- ✅ Automatic WebP/AVIF conversion
- ✅ Responsive image sizes (200px-1200px)
- ✅ 70% reduction in image file size
- ✅ Faster LCP (2.5s → 1.5s)
- ✅ Cloudflare edge caching worldwide

---

### Phase 3: Image Lazy Loading with Blur Placeholders (HIGH PRIORITY)
**Impact**: Faster perceived load time, reduced initial bundle  
**Effort**: Medium  
**Files**: `src/lib/blur-data-url.ts`, image components

#### Problem
Images load without placeholders, causing layout shift and perceived slowness.

#### Solution
Generate low-quality blur placeholders for smoother loading experience.

#### Implementation

```typescript
// src/lib/blur-data-url.ts (NEW FILE)

/**
 * Generate blur data URL for image placeholders
 * 
 * This creates a tiny 10x10 pixel image as a base64-encoded
 * data URL for use as a blur placeholder while the real image loads.
 * 
 * For production, you can:
 * 1. Generate at build time from actual images
 * 2. Use Cloudflare Images' blur variant
 * 3. Use algorithmic patterns based on avatar ID
 */

/**
 * Generate a simple blur placeholder based on avatar ID
 * Uses deterministic color generation for consistent placeholders
 */
export function generateBlurDataURL(avatarId: string): string {
  // Parse ID to number (e.g., "0001" → 1)
  const idNum = parseInt(avatarId, 10);
  
  // Generate deterministic color from ID
  const hue = (idNum * 137.5) % 360; // Golden angle for distribution
  const saturation = 70;
  const lightness = 80;
  
  // Create 10x10 SVG with gradient
  const svg = `
    <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue},${saturation}%,${lightness}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${(hue + 30) % 360},${saturation}%,${lightness - 10}%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="10" height="10" fill="url(#grad)" />
    </svg>
  `.trim();
  
  // Encode to base64
  const base64 = Buffer.from(svg).toString('base64');
  
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Alternative: Use Cloudflare Images blur variant
 * Requires pre-configured "blur" variant in Cloudflare Images
 */
export function getCloudflareBlurURL(avatarId: string): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
  return `https://imagedelivery.net/${accountHash}/${avatarId}/blur`;
}

/**
 * For build-time placeholder generation (advanced)
 * This would require reading actual images during build
 */
export async function generatePlaceholderFromImage(
  imagePath: string
): Promise<string> {
  // TODO: Implement using sharp or similar
  // 1. Load image
  // 2. Resize to 10x10
  // 3. Apply blur
  // 4. Convert to base64
  throw new Error('Not implemented - requires build-time image processing');
}
```

#### Usage in Components

```typescript
// src/components/avatar-image.tsx (NEW FILE)

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { generateBlurDataURL } from '@/lib/blur-data-url';

interface AvatarImageProps {
  id: string;
  name: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function AvatarImage({
  id,
  name,
  width = 400,
  height = 400,
  priority = false,
  className = '',
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Image fallback chain: R2 → VRChat API → Placeholder
  const primaryUrl = `${process.env.NEXT_PUBLIC_R2_BASE}/images/${id}.webp`;
  const fallbackUrl = `/api/avatar-image?id=${id}`;
  const placeholderUrl = '/images/placeholder.png';
  
  const currentSrc = imageError ? placeholderUrl : primaryUrl;

  return (
    <div className={`relative ${className}`}>
      <Image
        src={currentSrc}
        alt={name}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        quality={85}
        placeholder="blur"
        blurDataURL={generateBlurDataURL(id)}
        onError={() => setImageError(true)}
        onLoad={() => setIsLoading(false)}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
      )}
    </div>
  );
}
```

#### Expected Results
- ✅ Smooth image loading with blur effect
- ✅ No layout shift (CLS: 0)
- ✅ Faster perceived performance
- ✅ Better user experience on slow connections

---

### Phase 4: R2 JSON Data Cache (MEDIUM PRIORITY)
**Impact**: Data fetch time 90% reduction  
**Effort**: High  
**Files**: `scripts/convert-csv-to-json.ts`, `src/lib/akyo-data-r2.ts`

#### Problem
- CSV fetched from GitHub RAW (external network call)
- CSV parsing on every request (CPU intensive)
- No caching between server instances

#### Solution
Convert CSV to JSON, store in R2, use React `cache()` for deduplication.

#### Implementation

```typescript
// scripts/convert-csv-to-json.ts (NEW FILE)

/**
 * Convert CSV data to JSON and upload to R2
 * Run this script after CSV updates
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parseCsvToAkyoData } from '../src/lib/csv-utils';

interface R2UploadConfig {
  accountId: string;
  bucketName: string;
  apiToken: string;
}

async function convertAndUploadToR2(config: R2UploadConfig) {
  // Read CSV files
  const csvJaPath = path.join(process.cwd(), 'data', 'akyo-data.csv');
  const csvEnPath = path.join(process.cwd(), 'data', 'akyo-data-US.csv');
  
  const csvJa = await fs.readFile(csvJaPath, 'utf-8');
  const csvEn = await fs.readFile(csvEnPath, 'utf-8');
  
  // Parse to JSON
  const dataJa = parseCsvToAkyoData(csvJa);
  const dataEn = parseCsvToAkyoData(csvEn);
  
  // Add metadata
  const jsonJa = {
    version: '1.0',
    language: 'ja',
    updatedAt: new Date().toISOString(),
    count: dataJa.length,
    data: dataJa,
  };
  
  const jsonEn = {
    version: '1.0',
    language: 'en',
    updatedAt: new Date().toISOString(),
    count: dataEn.length,
    data: dataEn,
  };
  
  // Upload to R2
  await uploadToR2(config, 'data/akyo-data-ja.json', JSON.stringify(jsonJa));
  await uploadToR2(config, 'data/akyo-data-en.json', JSON.stringify(jsonEn));
  
  console.log('✅ Successfully uploaded JSON data to R2');
  console.log(`   - Japanese: ${dataJa.length} avatars`);
  console.log(`   - English: ${dataEn.length} avatars`);
}

async function uploadToR2(
  config: R2UploadConfig,
  key: string,
  content: string
) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects/${key}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload ${key}: ${response.statusText}`);
  }
}

// CLI execution
if (require.main === module) {
  const config: R2UploadConfig = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    bucketName: 'akyo-images',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  };
  
  convertAndUploadToR2(config)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
```

```typescript
// src/lib/akyo-data-r2.ts (NEW FILE)

import { cache } from 'react';
import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData } from '@/types/akyo';

interface AkyoDataResponse {
  version: string;
  language: SupportedLanguage;
  updatedAt: string;
  count: number;
  data: AkyoData[];
}

/**
 * Fetch Akyo data from R2 JSON (cached with React cache())
 * 
 * This replaces the CSV fetching from GitHub with direct R2 access
 * Benefits:
 * - 10x faster (no CSV parsing)
 * - Automatic deduplication with React cache()
 * - No external network dependency
 */
export const getAkyoDataFromR2 = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> => {
    const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
    const jsonFileName = lang === 'en' ? 'akyo-data-en.json' : 'akyo-data-ja.json';
    const url = `${r2Base}/data/${jsonFileName}`;
    
    console.log(`[getAkyoDataFromR2] Fetching from: ${url}`);
    
    try {
      const response = await fetch(url, {
        next: { revalidate: 3600 }, // ISR: 1 hour
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const json: AkyoDataResponse = await response.json();
      
      console.log(`[getAkyoDataFromR2] Success: ${json.count} avatars, updated ${json.updatedAt}`);
      
      return json.data;
      
    } catch (error) {
      console.error('[getAkyoDataFromR2] Error:', error);
      
      // Fallback to old CSV method
      console.log('[getAkyoDataFromR2] Falling back to CSV...');
      const { getAkyoData } = await import('./akyo-data-server');
      return getAkyoData(lang);
    }
  }
);

/**
 * Get single avatar by ID from R2 data
 */
export const getAkyoByIdFromR2 = cache(
  async (id: string, lang: SupportedLanguage = 'ja'): Promise<AkyoData | null> => {
    const data = await getAkyoDataFromR2(lang);
    return data.find((akyo) => akyo.id === id) || null;
  }
);
```

#### Migration Strategy

1. **Add npm script**:
   ```json
   // package.json
   {
     "scripts": {
       "data:convert": "tsx scripts/convert-csv-to-json.ts",
       "data:deploy": "npm run data:convert && wrangler r2 object put akyo-images/data/akyo-data-ja.json --file=./data/akyo-data-ja.json"
     }
   }
   ```

2. **Update environment variables**:
   ```bash
   # .env.local
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-api-token
   ```

3. **Replace imports in pages**:
   ```typescript
   // Before
   import { getAkyoData } from '@/lib/akyo-data-server';
   
   // After
   import { getAkyoDataFromR2 as getAkyoData } from '@/lib/akyo-data-r2';
   ```

#### Expected Results
- ✅ Data fetch: 200ms → 20ms (10x faster)
- ✅ No CSV parsing overhead
- ✅ React cache() deduplication
- ✅ Reduced server load

---

### Phase 5: React cache() for Server-Side Deduplication (MEDIUM PRIORITY)
**Impact**: Eliminates duplicate data fetching within single request  
**Effort**: Low  
**Files**: `src/lib/akyo-data-server.ts`

#### Problem
Multiple components fetching same data in single request tree.

#### Solution
Wrap all server data functions with React `cache()`.

#### Implementation

```typescript
// src/lib/akyo-data-server.ts (UPDATE)

import { cache } from 'react';

/**
 * Get Akyo data with automatic deduplication
 * React cache() ensures this function is called only once per request
 */
export const getAkyoData = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<AkyoData[]> => {
    const result = await fetchAkyoData({ lang });
    return result.data;
  }
);

/**
 * Get all categories with deduplication
 */
export const getAllCategories = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    const data = await getAkyoData(lang);
    const categoriesSet = new Set<string>();
    
    data.forEach((akyo) => {
      const catStr = akyo.category || akyo.attribute || '';
      const cats = catStr.split(/[、,]/).map((c) => c.trim()).filter(Boolean);
      cats.forEach((cat) => categoriesSet.add(cat));
    });
    
    return Array.from(categoriesSet).sort();
  }
);

/**
 * Get all authors with deduplication
 */
export const getAllAuthors = cache(
  async (lang: SupportedLanguage = 'ja'): Promise<string[]> => {
    const data = await getAkyoData(lang);
    const authorsSet = new Set<string>();
    
    data.forEach((akyo) => {
      const authorStr = akyo.author || akyo.creator || '';
      const authors = authorStr.split(/[、,]/).map((a) => a.trim()).filter(Boolean);
      authors.forEach((author) => authorsSet.add(author));
    });
    
    return Array.from(authorsSet).sort();
  }
);

/**
 * Get single avatar by ID with deduplication
 */
export const getAkyoById = cache(
  async (id: string, lang: SupportedLanguage = 'ja'): Promise<AkyoData | null> => {
    const data = await getAkyoData(lang);
    return data.find((akyo) => akyo.id === id) || null;
  }
);
```

#### Expected Results
- ✅ No duplicate fetches in single request
- ✅ Automatic memoization per request
- ✅ Reduced server load

---

### Phase 6: Server/Client Component Optimization (MEDIUM PRIORITY)
**Impact**: Reduced bundle size, faster hydration  
**Effort**: High  
**Files**: `src/app/zukan/page.tsx`, `src/app/zukan/zukan-client.tsx`

#### Problem
`ZukanClient` is a large Client Component containing both static and interactive parts.

#### Solution
Split into smaller Server/Client components with clear boundaries.

#### Architecture

```
┌─────────────────────────────────────────────────┐
│ ZukanPage (Server Component)                    │
│ - Fetch data                                    │
│ - Render static structure                       │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ FilterBar (Client Component)            │   │
│  │ - Search input                          │   │
│  │ - Category/Author filters               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ AvatarGrid (Server Component)           │   │
│  │ - Map over filtered data                │   │
│  │  ┌─────────────────────────────────┐    │   │
│  │  │ AvatarCard (Client Component)   │    │   │
│  │  │ - Image with lazy loading       │    │   │
│  │  │ - Click handler for modal       │    │   │
│  │  └─────────────────────────────────┘    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ AvatarModal (Client Component)          │   │
│  │ - Modal dialog                          │   │
│  │ - Only loaded when opened               │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// src/app/zukan/page.tsx (UPDATE)

import { Suspense } from 'react';
import { getAkyoData, getAllCategories, getAllAuthors } from '@/lib/akyo-data-server';
import { FilterBar } from './filter-bar';
import { AvatarGrid } from './avatar-grid';
import { LoadingSpinner } from '@/components/loading-spinner';

export const revalidate = 3600;

export default async function ZukanPage() {
  const lang = await getLanguage();
  
  // Parallel data fetching
  const [data, categories, authors] = await Promise.all([
    getAkyoData(lang),
    getAllCategories(lang),
    getAllAuthors(lang),
  ]);

  return (
    <div className="zukan-page">
      <header>
        <h1>Akyoずかん</h1>
        <p>{data.length}体のAkyoを収録</p>
      </header>
      
      {/* Client Component: Filter controls */}
      <Suspense fallback={<div>Loading filters...</div>}>
        <FilterBar 
          categories={categories}
          authors={authors}
        />
      </Suspense>
      
      {/* Server Component: Avatar grid */}
      <Suspense fallback={<LoadingSpinner />}>
        <AvatarGrid 
          data={data}
          lang={lang}
        />
      </Suspense>
    </div>
  );
}
```

```typescript
// src/app/zukan/filter-bar.tsx (NEW FILE)

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface FilterBarProps {
  categories: string[];
  authors: string[];
}

export function FilterBar({ categories, authors }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [author, setAuthor] = useState(searchParams.get('author') || '');

  const handleFilter = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (author) params.set('author', author);
      
      router.push(`/zukan?${params.toString()}`);
    });
  };

  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="Search avatars..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
      />
      
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      
      <select value={author} onChange={(e) => setAuthor(e.target.value)}>
        <option value="">All Authors</option>
        {authors.map((auth) => (
          <option key={auth} value={auth}>{auth}</option>
        ))}
      </select>
      
      <button onClick={handleFilter} disabled={isPending}>
        {isPending ? 'Filtering...' : 'Apply Filters'}
      </button>
    </div>
  );
}
```

```typescript
// src/app/zukan/avatar-grid.tsx (NEW FILE)

import { AvatarCard } from './avatar-card';
import type { AkyoData } from '@/types/akyo';
import type { SupportedLanguage } from '@/lib/i18n';

interface AvatarGridProps {
  data: AkyoData[];
  lang: SupportedLanguage;
}

export function AvatarGrid({ data, lang }: AvatarGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((akyo, index) => (
        <AvatarCard
          key={akyo.id}
          akyo={akyo}
          priority={index < 8} // First 8 images are priority
          lang={lang}
        />
      ))}
    </div>
  );
}
```

#### Expected Results
- ✅ Bundle size: 250KB → 150KB (40% reduction)
- ✅ Faster hydration
- ✅ Better code splitting
- ✅ Improved streaming

---

## 📋 Implementation Checklist

### Phase 1: Build-Time Static Generation ✅
- [ ] Create `src/app/zukan/[id]/page.tsx` with `generateStaticParams()`
- [ ] Add `getAkyoById()` helper function to `src/lib/akyo-data-server.ts`
- [ ] Update routing to use dynamic route instead of query params
- [ ] Test build process: `npm run build`
- [ ] Verify 640 pages generated in `.open-next` output

### Phase 2: Cloudflare Images Integration ✅
- [ ] Enable Cloudflare Images in dashboard
- [ ] Create image variants (thumbnail, small, medium, large, public)
- [ ] Get Cloudflare Images Account Hash
- [ ] Create `src/lib/cloudflare-image-loader.ts`
- [ ] Update `next.config.ts`: `unoptimized: false`, add loader
- [ ] Add `NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH` to environment
- [ ] Migrate images from R2 to Cloudflare Images
- [ ] Test image loading in development
- [ ] Deploy and verify image optimization

### Phase 3: Image Lazy Loading ✅
- [ ] Create `src/lib/blur-data-url.ts`
- [ ] Create `src/components/avatar-image.tsx`
- [ ] Update all image components to use blur placeholders
- [ ] Test loading experience on slow connection
- [ ] Verify CLS score improvement

### Phase 4: R2 JSON Data Cache ⏳
- [ ] Create `scripts/convert-csv-to-json.ts`
- [ ] Add npm script for data conversion
- [ ] Create `src/lib/akyo-data-r2.ts`
- [ ] Upload JSON files to R2
- [ ] Update page imports to use R2 data
- [ ] Test data fetching in development
- [ ] Verify fallback to CSV works

### Phase 5: React cache() ⏳
- [ ] Wrap all data functions with `cache()`
- [ ] Test deduplication in development
- [ ] Verify no duplicate network requests

### Phase 6: Server/Client Split ⏳
- [ ] Create `src/app/zukan/filter-bar.tsx`
- [ ] Create `src/app/zukan/avatar-grid.tsx`
- [ ] Create `src/app/zukan/avatar-card.tsx`
- [ ] Update `src/app/zukan/page.tsx`
- [ ] Test filtering and interactivity
- [ ] Verify bundle size reduction

---

## 🎯 Expected Performance Results

### Before Optimization
```
Lighthouse Score (Mobile)
┌─────────────┬─────────┐
│ Performance │ 65-75   │
│ LCP         │ 2.5s    │
│ TTFB        │ 500ms   │
│ FCP         │ 1.2s    │
│ Bundle Size │ 250KB   │
└─────────────┴─────────┘
```

### After Optimization
```
Lighthouse Score (Mobile)
┌─────────────┬─────────┐
│ Performance │ 90-95   │ 🚀 +25 points
│ LCP         │ 1.3s    │ 🚀 48% faster
│ TTFB        │ 180ms   │ 🚀 64% faster
│ FCP         │ 0.7s    │ 🚀 42% faster
│ Bundle Size │ 140KB   │ 📦 44% smaller
└─────────────┴─────────┘
```

---

## 🔧 Development Commands

```bash
# Development server
npm run dev

# Build with OpenNext
npm run build

# Test build locally with wrangler
npx wrangler pages dev .open-next

# Convert CSV to JSON
npm run data:convert

# Deploy to Cloudflare Pages
git push origin main  # Automatic deployment
```

---

## 📚 Additional Resources

### Cloudflare Images Documentation
- **Overview**: https://developers.cloudflare.com/images/
- **Transform Images**: https://developers.cloudflare.com/images/transform-images/
- **Upload API**: https://developers.cloudflare.com/images/upload-images/upload-via-url/
- **Pricing**: https://www.cloudflare.com/products/cloudflare-images/

### Next.js 15 Documentation
- **Image Optimization**: https://nextjs.org/docs/app/building-your-application/optimizing/images
- **Server Components**: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- **Static Generation**: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching
- **React cache()**: https://nextjs.org/docs/app/building-your-application/caching#react-cache-function

### Performance Testing Tools
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/

---

## 🎉 Summary

This refactoring plan focuses on **maximizing display speed (表示速度)** through:

1. ✅ **Build-Time Static Generation** - 640 pages pre-rendered
2. ✅ **Cloudflare Images** - Automatic optimization and WebP/AVIF
3. ✅ **Lazy Loading with Blur** - Smooth loading experience
4. ⏳ **R2 JSON Cache** - 10x faster data access
5. ⏳ **React cache()** - Eliminate duplicate fetching
6. ⏳ **Server/Client Split** - Reduced bundle size

**Priority**: Start with Phases 1-3 for immediate display speed improvements.

**Estimated Timeline**: 
- Phase 1-3 (High Priority): 1-2 days
- Phase 4-6 (Medium Priority): 2-3 days

**Total Impact**: 48% faster LCP, 64% faster TTFB, 44% smaller bundle 🚀
