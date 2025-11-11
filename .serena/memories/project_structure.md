# Project Structure

## Root Directory
```
Akyodex/
├── src/                     # Next.js application source
├── public/                  # Static assets (SW, manifest, icons)
├── scripts/                 # Utility scripts
├── tests/                   # Playwright E2E tests
├── data/                    # CSV data files
├── .github/                 # GitHub workflows
├── .kiro/                   # Kiro IDE settings
├── next.config.ts           # Next.js configuration
├── wrangler.toml            # Cloudflare bindings
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## Source Directory (`src/`)
```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout (i18n, PWA)
│   ├── page.tsx             # Landing page
│   ├── admin/               # Admin panel pages
│   ├── zukan/               # Avatar gallery
│   │   ├── page.tsx         # Gallery (SSG + ISR)
│   │   └── detail/[id]/     # Detail pages (SSG)
│   └── api/                 # API Routes (Edge Runtime)
│       ├── admin/           # Admin APIs
│       ├── chat/            # AI Chatbot (removed)
│       └── *.ts             # Other APIs
├── components/              # React Components
│   ├── akyo-*.tsx           # Avatar components
│   ├── admin/               # Admin components
│   └── *.tsx                # Shared components
├── hooks/                   # React Hooks
│   └── use-akyo-data.ts     # Avatar data management
├── lib/                     # Utility Libraries
│   ├── csv-*.ts             # CSV processing
│   ├── api-helpers.ts       # API utilities
│   ├── session.ts           # JWT session
│   └── *.ts                 # Other utilities
├── types/                   # TypeScript Types
│   └── akyo.ts              # Main type definitions
└── middleware.ts            # Edge middleware (i18n)
```

## Key Directories

### `/src/app` - App Router Pages
- File-based routing
- Server Components by default
- API Routes use Edge Runtime

### `/src/components` - React Components
- Organized by feature (admin/, shared)
- Client Components use `'use client'`
- Server Components have no directive

### `/src/lib` - Utility Libraries
- Shared logic and helpers
- Server-only marked with `import 'server-only'`

### `/src/types` - TypeScript Types
- Centralized type definitions
- Main file: `akyo.ts`

## Data Flow

### CSV Data
```
data/akyo-data.csv (Japanese)
data/akyo-data-US.csv (English)
    ↓
R2 Bucket (akyo-data/)
    ↓
API: /api/csv
    ↓
lib/csv-parser.ts
    ↓
AkyoData[]
```

### Image Data
```
images/*.webp (local)
    ↓
R2 Bucket (images/)
    ↓
CDN: images.akyodex.com
    ↓
API: /api/avatar-image
    ↓
<img> tags
```

## Important Files
- `src/app/layout.tsx` - Root layout with Dify chatbot
- `src/app/zukan/zukan-client.tsx` - Main gallery client component
- `src/lib/csv-utils.ts` - CSV parsing and manipulation
- `src/types/akyo.ts` - Core type definitions
- `wrangler.toml` - Cloudflare bindings (KV, R2, Vectorize)
