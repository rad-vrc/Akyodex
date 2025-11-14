# Project Structure

## Repository Layout

```
Akyodex/
├── akyodex-nextjs/          # Next.js 15 application (MAIN)
├── data/                    # CSV data files
├── functions/               # Cloudflare Pages Functions (legacy)
├── js/                      # Legacy JavaScript files
├── css/                     # Legacy CSS files
├── images/                  # Static images
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── *.html                   # Legacy HTML pages
```

## Next.js Application Structure

```
akyodex-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout (i18n, PWA)
│   │   ├── page.tsx         # Landing page
│   │   ├── admin/           # Admin panel pages
│   │   │   ├── page.tsx     # Admin dashboard
│   │   │   └── admin-client.tsx
│   │   ├── zukan/           # Avatar gallery
│   │   │   ├── page.tsx     # Gallery (SSG + ISR)
│   │   │   └── detail/[id]/ # Detail pages (SSG)
│   │   └── api/             # API Routes (Edge Runtime)
│   │       ├── admin/       # Admin API
│   │       │   ├── login/
│   │       │   ├── logout/
│   │       │   ├── verify-session/
│   │       │   └── next-id/
│   │       ├── upload-akyo/
│   │       ├── update-akyo/
│   │       ├── delete-akyo/
│   │       ├── check-duplicate/
│   │       ├── avatar-image/
│   │       ├── vrc-avatar-info/
│   │       └── vrc-avatar-image/
│   │
│   ├── components/          # React Components
│   │   ├── akyo-card.tsx
│   │   ├── akyo-list.tsx
│   │   ├── akyo-detail-modal.tsx
│   │   ├── mini-akyo-bg.tsx
│   │   ├── service-worker-register.tsx
│   │   ├── language-selector.tsx
│   │   └── admin/           # Admin components
│   │       ├── admin-header.tsx
│   │       ├── admin-login.tsx
│   │       ├── admin-tabs.tsx
│   │       ├── attribute-modal.tsx
│   │       ├── edit-modal.tsx
│   │       └── tabs/
│   │           ├── add-tab.tsx
│   │           ├── edit-tab.tsx
│   │           └── tools-tab.tsx
│   │
│   ├── lib/                 # Utility Libraries
│   │   ├── akyo-data-server.ts    # Server-side data loading
│   │   ├── akyo-crud-helpers.ts   # CRUD operations
│   │   ├── api-helpers.ts         # API utilities
│   │   ├── csv-utils.ts           # CSV utilities
│   │   ├── github-utils.ts        # GitHub API
│   │   ├── html-utils.ts          # HTML sanitization
│   │   ├── i18n.ts                # i18n utilities
│   │   ├── r2-utils.ts            # R2 utilities
│   │   ├── session.ts             # JWT session
│   │   └── vrchat-utils.ts        # VRChat API
│   │
│   ├── types/
│   │   └── akyo.ts          # TypeScript types
│   │
│   └── middleware.ts        # Edge middleware (i18n)
│
├── public/
│   ├── sw.js                # Service Worker
│   ├── manifest.json        # PWA manifest
│   └── icons/               # PWA icons
│
├── tests/                   # Playwright E2E tests
│   ├── authentication.spec.ts
│   ├── crud-operations.spec.ts
│   ├── dify-chatbot.spec.ts
│   ├── error-scenarios.spec.ts
│   ├── utility-endpoints.spec.ts
│   └── visual-verification.spec.ts
│
├── scripts/                 # Data processing scripts
│   ├── migrate-csv-to-4digit.mjs
│   ├── prepare-cloudflare-pages.js
│   └── test-csv-quality.js
│
├── data/                    # CSV data
│   ├── akyo-data.csv        # Japanese (639 entries)
│   └── akyo-data-US.csv     # English
│
├── .kiro/                   # Kiro IDE configuration
│   └── steering/            # Steering rules
│       ├── tech.md
│       ├── structure.md
│       ├── nextjs-best-practices.md
│       ├── file-deletion-rules.md
│       └── context7-documents.md
│
├── next.config.ts           # Next.js configuration
├── open-next.config.ts      # OpenNext Cloudflare adapter
├── wrangler.toml            # Cloudflare bindings
├── tsconfig.json            # TypeScript configuration
├── eslint.config.mjs        # ESLint configuration
├── playwright.config.ts     # Playwright configuration
├── package.json             # Dependencies
├── README.md                # Main documentation
├── DEPLOYMENT.md            # Deployment guide
└── AGENTS.md                # Repository guidelines
```

## Key Directories

### `/src/app` - App Router Pages
- **Convention**: File-based routing
- **Layouts**: Shared layout with i18n, Dify chatbot
- **Pages**: Server Components by default
- **API Routes**: Edge Runtime functions

### `/src/components` - React Components
- **Naming**: kebab-case (e.g., `akyo-card.tsx`)
- **Organization**: Grouped by feature (admin/, shared)
- **Client Components**: Use `'use client'` directive
- **Server Components**: Default (no directive)

### `/src/lib` - Utility Libraries
- **Naming**: kebab-case (e.g., `csv-parser.ts`)
- **Purpose**: Shared logic, helpers, utilities
- **Server-only**: Mark with `import 'server-only'` if needed

### `/src/types` - TypeScript Types
- **Convention**: Centralized type definitions
- **Main File**: `akyo.ts` (AkyoData, AkyoCsvRow, etc.)

### `/tests` - E2E Tests
- **Framework**: Playwright
- **Naming**: `*.spec.ts`
- **Coverage**: Authentication, CRUD, chatbot, errors, utilities, visual

### `/scripts` - Automation Scripts
- **CSV Migration**: 4-digit ID migration
- **Cloudflare Prep**: Post-build processing
- **CSV Quality**: Data integrity checks

### `/data` - CSV Data
- **Japanese**: `akyo-data.csv` (639 entries)
- **English**: `akyo-data-US.csv`
- **Format**: 4-digit IDs (0001-0640)

## Data Flow

### CSV Data Flow
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

### Image Data Flow
```
images/*.webp (local)
    ↓
R2 Bucket (images/)
    ↓
CDN: images.akyodex.com
    ↓
API: /api/avatar-image (proxy)
    ↓
<img> tag (lazy loading)
```

### VRChat Fallback Flow
```
1. Try R2 Bucket (images.akyodex.com)
    ↓ (if fails)
2. Try VRChat API (fetch from CSV avtr ID)
    ↓ (if fails)
3. Show placeholder image
```

### Dify Chatbot Flow
```
User Query
    ↓
Dify Embedded Widget
    ↓
Dify API (external service)
    ↓
Display response in widget
```

## File Naming Conventions

### TypeScript/React
- **Components**: kebab-case (e.g., `akyo-card.tsx`)
- **Utilities**: kebab-case (e.g., `csv-parser.ts`)
- **Types**: kebab-case (e.g., `akyo.ts`)
- **API Routes**: kebab-case (e.g., `upload-akyo/route.ts`)

### Legacy Files
- **JavaScript**: kebab-case (e.g., `main.js`)
- **CSS**: kebab-case (e.g., `kid-friendly.css`)
- **HTML**: kebab-case (e.g., `index.html`)

## Import Path Aliases

- `@/*` → `./src/*`
- Example: `import { AkyoCard } from '@/components/akyo-card'`

## State Management

### Client State
- **React useState**: Component-local state
- **React Context**: Shared state (language, theme)
- **localStorage**: Persistent state (favorites, language)
- **sessionStorage**: Session state (admin auth)

### Server State
- **Cloudflare KV**: Session tokens
- **R2 Bucket**: CSV data, images

## Configuration Files

### Next.js (`next.config.ts`)
- Image optimization: `unoptimized: true` (Cloudflare R2)
- Security headers: HSTS, CSP, X-Frame-Options
- Remote patterns: images.akyodex.com, *.vrchat.com

### Cloudflare (`wrangler.toml`)
- KV binding: `AKYO_KV`
- R2 binding: `AKYO_BUCKET`

### TypeScript (`tsconfig.json`)
- Target: ES2017
- Module: esnext (bundler resolution)
- Path alias: `@/*` → `./src/*`
- Strict mode: enabled

### ESLint (`eslint.config.mjs`)
- Extends: next/core-web-vitals, next/typescript
- Ignores: node_modules, .next, .open-next, build artifacts

### Playwright (`playwright.config.ts`)
- Test directory: `./tests`
- Base URL: http://localhost:3000
- Browser: Chromium (Desktop Chrome)
- Web server: `npm run dev`

## Build Output

### Development
- `.next/` - Next.js dev build cache

### Production (Cloudflare Pages)
- `.open-next/` - OpenNext Cloudflare build output
- `.vercel/output/static/` - Static assets for deployment

## Migration Status

### Legacy → Next.js
- **Status**: In progress (Next.js 15 migration complete)
- **Legacy Files**: Root directory (HTML/CSS/JS)
- **New Files**: akyodex-nextjs/ directory
- **Coexistence**: Both versions deployed separately
- **Future**: Gradual migration to Next.js only
