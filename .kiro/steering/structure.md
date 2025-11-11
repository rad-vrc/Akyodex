# Project Structure & Organization

## Repository Layout

```
Akyodex/
├── akyodex-nextjs/          # Next.js 15 application (primary)
├── data/                    # CSV data files
├── functions/               # Cloudflare Pages Functions (legacy)
├── js/                      # Legacy JavaScript files
├── css/                     # Legacy CSS files
├── images/                  # Static images
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── *.html                   # Legacy HTML pages
```

## Next.js Application (`akyodex-nextjs/`)

### Directory Structure

```
akyodex-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout (i18n, PWA)
│   │   ├── page.tsx         # Landing page
│   │   ├── admin/           # Admin panel
│   │   ├── zukan/           # Avatar gallery
│   │   │   ├── page.tsx     # Gallery (SSG + ISR)
│   │   │   └── detail/[id]/ # Detail pages (SSG)
│   │   └── api/             # API Routes (Edge Runtime)
│   │       ├── admin/       # Admin APIs
│   │       └── *.ts         # Other APIs
│   ├── components/          # React Components
│   │   ├── akyo-*.tsx       # Avatar components
│   │   ├── admin/           # Admin components
│   │   └── *.tsx            # Shared components
│   ├── lib/                 # Utility Libraries
│   │   ├── csv-*.ts         # CSV processing
│   │   ├── api-helpers.ts   # API utilities
│   │   ├── session.ts       # JWT session
│   │   └── *.ts             # Other utilities
│   ├── types/
│   │   └── akyo.ts          # TypeScript types
│   └── middleware.ts        # Edge middleware (i18n)
├── public/
│   ├── sw.js                # Service Worker
│   ├── manifest.json        # PWA manifest
│   └── icons/               # PWA icons
├── scripts/                 # Data processing scripts
├── next.config.ts           # Next.js config
├── wrangler.toml            # Cloudflare bindings
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## Key Directories

### `/src/app` - App Router Pages
- **Convention**: File-based routing
- **Layout**: Shared layout with i18n detection, Dify chatbot integration
- **Pages**: Server Components by default
- **API Routes**: Edge Runtime functions

### `/src/components` - React Components
- **Naming**: kebab-case (e.g., `akyo-card.tsx`)
- **Organization**: Group by feature (admin/, shared)
- **Client Components**: Use `'use client'` directive
- **Server Components**: Default (no directive)

### `/src/lib` - Utility Libraries
- **Naming**: kebab-case (e.g., `csv-parser.ts`)
- **Purpose**: Shared logic, helpers, utilities
- **Server-only**: Mark with `import 'server-only'` if needed

### `/src/types` - TypeScript Types
- **Convention**: Centralized type definitions
- **Main file**: `akyo.ts` (AkyoData, AkyoCsvRow, etc.)

## Data Flow

### CSV Data
```
data/akyo-data.csv (Japanese)
data/akyo-data-US.csv (English)
    ↓
R2 Bucket (akyo-data/)
    ↓
API: /api/csv (fetch)
    ↓
lib/csv-parser.ts (parse)
    ↓
AkyoData[] (TypeScript)
```

### Image Data
```
images/*.webp (local)
    ↓
R2 Bucket (images/)
    ↓
CDN: images.akyodex.com
    ↓
API: /api/avatar-image (proxy)
    ↓
<img> tags (lazy loading)
```

### Dify Chatbot
```
User Query
    ↓
Dify Embedded Widget
    ↓
Dify API (external service)
    ↓
Response displayed in widget
```

## File Naming Conventions

### TypeScript/React
- **Components**: kebab-case (e.g., `akyo-card.tsx`)
- **Utilities**: kebab-case (e.g., `csv-parser.ts`)
- **Types**: kebab-case (e.g., `akyo.ts`)
- **API Routes**: kebab-case (e.g., `upload-akyo/route.ts`)

### Legacy Files
- **JavaScript**: kebab-case (e.g., `main.js`, `admin.js`)
- **CSS**: kebab-case (e.g., `kid-friendly.css`)
- **HTML**: kebab-case (e.g., `index.html`, `admin.html`)

## Code Organization Patterns

### Component Structure
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

### API Route Structure
```typescript
// 1. Imports
import { NextRequest, NextResponse } from 'next/server';
import type { AkyoData } from '@/types/akyo';

// 2. Types
interface RequestBody {
  id: string;
  nickname: string;
}

// 3. Handler
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const body: RequestBody = await request.json();
    
    // 2. Validate
    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    // 3. Process
    const result = await processData(body);
    
    // 4. Return
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Import Path Aliases

### Configured Aliases
- `@/*` → `./src/*` (Next.js app)
- Example: `import { AkyoCard } from '@/components/akyo-card'`

### Import Order (Recommended)
1. External packages (react, next, etc.)
2. Internal aliases (@/components, @/lib, @/types)
3. Relative imports (./utils, ../types)
4. CSS/styles

## State Management

### Client State
- **React useState**: Component-local state
- **React Context**: Shared state (language, theme)
- **localStorage**: Persistent state (favorites, language)
- **sessionStorage**: Session state (admin auth)

### Server State
- **Cloudflare KV**: Session tokens
- **R2 Bucket**: CSV data, images

## Error Handling

### API Routes
```typescript
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
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

## Testing Locations

### Development URLs
- Gallery: http://localhost:3000/zukan
- Admin: http://localhost:3000/admin
- API: http://localhost:3000/api/*

### Production URLs
- Gallery: https://akyodex.com/zukan
- Admin: https://akyodex.com/admin
- API: https://akyodex.com/api/*

## Migration Notes

### Legacy → Next.js
- **Status**: In progress (Next.js 15 migration complete)
- **Legacy files**: Root directory (HTML/CSS/JS)
- **New files**: akyodex-nextjs/ directory
- **Coexistence**: Both versions deployed separately
- **Future**: Gradual migration to Next.js only
