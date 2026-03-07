# Akyodex - Next.js 16 + Cloudflare Pages

**VRChat Avatar & World Encyclopedia**

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Glossary](#glossary)
4. [Architecture](#architecture)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Development Setup](#development-setup)
8. [Deployment Guide](#deployment-guide)
9. [Deployment Verification](#deployment-verification)
10. [Environment Variables](#environment-variables)
11. [Features](#features)
12. [API Endpoints](#api-endpoints)
13. [Security](#security)
14. [Troubleshooting](#troubleshooting)
15. [Migration History](#migration-history)
16. [Contributing](#contributing)

---

## ⚡ Quick Start

**Get Akyodex running locally in 5 minutes!**

### Prerequisites Check
```bash
# Check Node.js version (need 20.x or later)
node --version

# Check npm version (need 10.x or later)
npm --version
```

### Step 1: Clone and Install (2 minutes)
```bash
# Clone repository
git clone https://github.com/rad-vrc/Akyodex.git
cd Akyodex

# Install dependencies
npm install
```

### Step 2: Set Up Environment (1 minute)
```bash
# Create .env.local file with default credentials
cat > .env.local << 'EOF'
# Admin Authentication (simple access codes)
# Owner password (full access): RadAkyo
# Admin password (limited access): Akyo
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo

# Session Secret (Development only)
SESSION_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# R2 Base URL (for image fetching)
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com

# App Origin (for CSRF protection)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

### Step 3: Run Development Server (30 seconds)
```bash
# Start dev server
npm run dev
```

### Step 4: Open in Browser
```
✅ Gallery:     http://localhost:3000/zukan
✅ Admin Panel: http://localhost:3000/admin
```

**Default Admin Credentials:**
- Owner Password: `RadAkyo` (full access)
- Admin Password: `Akyo` (limited access)

---

## 📖 Project Overview

**Akyodex** は、VRChatのオリジナルアバター「Akyo」シリーズと関連ワールドを網羅したオンライン図鑑です。

### Key Features
- 🎨 **アバター＋ワールドデータベース** - 4桁ID管理システム（日本語/英語/韓国語 CSV + JSON データ、avatar/world 二種別）
- 🔐 **Admin Panel** - HMAC署名セッション認証、画像クロッピング、VRChat連携
- 📱 **PWA対応** - 6種類のキャッシング戦略
- 🌍 **多言語対応** - 日本語/英語/韓国語（自動検出 + 手動切替）
- ⚡ **Edge Runtime** - Cloudflare Pages + R2 + KV
- 🤖 **Difyチャットボット** - AI搭載のアバター検索アシスタント
- 📊 **多段データロード** - KV → JSON → CSV 自動フォールバック
- 🔍 **Sentry 監視** - エラー追跡 + パフォーマンスモニタリング

### Project Status
- ✅ **Next.js 16.1.6 + Cloudflare Pages** (OpenNext adapter)
- ✅ **Avatar + World Support** (Dual entry types with separate display IDs)
- ✅ **Security Hardening** (Timing attack, XSS prevention, Input validation)
- ✅ **PWA Implementation** (Service Worker with 6 caching strategies)
- ✅ **VRChat Image Fallback** (3-tier fallback: R2 → VRChat page/API → Placeholder)
- ✅ **Sentry Observability** (Error tracking + performance monitoring)
- ✅ **Dify AI Chatbot Integration** (Natural language avatar search)
- ✅ **Dual Admin System** (Owner/Admin role separation)
- ✅ **On-demand ISR** (Revalidation API + KV Edge Cache)

---

## 📖 Glossary

**Key terms used in this documentation:**

### General Terms
- **SSG (Static Site Generation)**: Pre-rendering pages at build time for faster performance
- **ISR (Incremental Static Regeneration)**: Updating static pages periodically without rebuilding the entire site
- **PWA (Progressive Web App)**: Web application with native app-like features (offline support, installable)
- **Edge Runtime**: Code execution at CDN edge locations (closer to users) for lower latency
- **HMAC (Hash-based Message Authentication Code)**: Cryptographic signature for verifying data integrity and authenticity

### Cloudflare Services
- **Cloudflare Pages**: Static site hosting with automatic deployment from Git
- **R2 Bucket**: Object storage (like AWS S3) for files (CSV, images)
- **KV (Key-Value) Store**: Fast distributed database for simple key-value pairs (used for sessions and data cache)

### VRChat Terms
- **Avatar**: 3D character model used in VRChat
- **Akyo (あきょ)**: Japanese VRChat avatar series created by the community
- **VRChat ID**: Unique identifier for avatars (format: `avtr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Technical Terms
- **XSS (Cross-Site Scripting)**: Security vulnerability where attackers inject malicious scripts
- **CSRF (Cross-Site Request Forgery)**: Attack forcing users to execute unwanted actions
- **ReDoS (Regular Expression Denial of Service)**: Attack exploiting inefficient regex patterns
- **Timing Attack**: Exploiting time differences in operations to extract sensitive information
- **HTTP-only Cookie**: Cookie inaccessible to JavaScript (prevents XSS attacks)
- **SameSite Cookie**: Cookie security attribute preventing CSRF attacks

---

## 🏗️ Architecture

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Next.js 16 App (OpenNext Adapter)            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   SSG Pages │  │ API Routes   │  │ Middleware  │  │  │
│  │  │   (Static)  │  │ (Edge/Node)  │  │  (i18n+CSP) │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│           │                │                │                │
│           ├────────────────┼────────────────┤                │
│           ▼                ▼                ▼                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │  R2 Bucket │  │  KV Store   │  │   GitHub     │         │
│  │  (Images + │  │  (Session + │  │   (CSV Sync) │         │
│  │   CSV/JSON)│  │   Data Cache)│  └──────────────┘         │
│  └────────────┘  └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘

Data Source Priority: KV (~5ms) → JSON (~20ms) → CSV (~200ms)
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.4 (Server/Client Components)
- **Styling**: Tailwind CSS 4 (PostCSS plugin)
- **Fonts**: Google Fonts (M PLUS Rounded 1c, Kosugi Maru, Noto Sans JP)
- **PWA**: Custom Service Worker with 6 caching strategies

### Backend
- **Runtime**: Cloudflare Pages (Edge + Node.js Runtime)
- **Adapter**: @opennextjs/cloudflare ^1.16.5
- **Authentication**: HMAC-signed sessions (Web Crypto API)
- **Session Storage**: Cloudflare KV
- **File Storage**: Cloudflare R2
- **CSV Processing**: csv-parse / csv-stringify
- **Data Sync**: GitHub API (CSV commit on CRUD operations)

### Observability
- **Error Tracking**: Sentry (@sentry/nextjs ^10.39.0) — runtime errors + performance monitoring
- **Instrumentation**: Server-side (`instrumentation.ts`) + client-side (`instrumentation-client.ts`)

### Security
- **HTML Sanitization**: sanitize-html ^2.17.0
- **Timing Attack Prevention**: Node.js `crypto.timingSafeEqual`
- **Input Validation**: Length-limited regex patterns
- **XSS Prevention**: HTML entity decoding + tag stripping
- **CSRF Protection**: Origin/Referer header validation
- **CSP**: Nonce-based Content Security Policy via middleware

### DevOps
- **Package Manager**: npm 10.x
- **Node Version**: 20.x
- **TypeScript**: 5.9.3 (Strict mode)
- **Linting**: ESLint 9 with Next.js config
- **Testing**: Playwright (E2E), node:test + assert (unit tests)
- **Dead Code Analysis**: Knip
- **Git Workflow**: Feature branches → PR → main
- **CI/CD**: Cloudflare Pages automatic deployment

---

## 📁 Project Structure

```
Akyodex/
├── README.md                        # This file
├── package.json                     # Dependencies and scripts
├── next.config.ts                   # Next.js + Cloudflare config
├── open-next.config.ts              # OpenNext Cloudflare adapter config
├── wrangler.toml                    # Cloudflare Pages / R2 / KV bindings
├── tsconfig.json                    # TypeScript config
├── eslint.config.mjs                # ESLint flat config
├── knip.json                        # Dead code analysis config
├── postcss.config.mjs               # PostCSS config (Tailwind CSS 4)
├── playwright.config.ts             # E2E test config
│
├── public/
│   ├── sw.js                        # Service Worker (6 caching strategies)
│   └── images/                      # PWA icons, logos, placeholder
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (fonts, Dify chatbot, Sentry)
│   │   ├── page.tsx                 # Landing page (redirects to /zukan)
│   │   ├── globals.css              # Global styles (Tailwind CSS 4)
│   │   ├── manifest.ts              # PWA manifest (dynamic)
│   │   ├── sitemap.ts               # Dynamic sitemap
│   │   ├── robots.ts                # robots.txt
│   │   ├── not-found.tsx            # 404 page
│   │   ├── error.tsx                # Error boundary
│   │   ├── global-error.tsx         # Global error boundary
│   │   ├── offline/                 # PWA offline page
│   │   ├── admin/                   # Admin panel
│   │   │   ├── page.tsx             # Admin server component
│   │   │   └── admin-client.tsx     # Admin client logic
│   │   ├── zukan/                   # Entry gallery
│   │   │   ├── page.tsx             # Gallery page (SSG + ISR)
│   │   │   ├── loading.tsx          # Loading skeleton
│   │   │   └── zukan-client.tsx     # Gallery client component
│   │   └── api/                     # API Routes
│   │       ├── admin/               # Auth APIs
│   │       │   ├── login/           # POST - Login
│   │       │   ├── logout/          # POST - Logout
│   │       │   ├── verify-session/  # GET - Session verification
│   │       │   └── next-id/         # GET - Next available ID
│   │       ├── akyo-data/           # GET - Data retrieval API (Node.js runtime)
│   │       ├── upload-akyo/         # POST - Entry registration
│   │       ├── update-akyo/         # POST - Entry update
│   │       ├── delete-akyo/         # POST - Entry deletion
│   │       ├── check-duplicate/     # POST - Duplicate check
│   │       ├── avatar-image/        # GET - Image proxy (R2 → VRChat page/API → Placeholder)
│   │       ├── vrc-avatar-info/     # GET - VRChat avatar info fetch
│   │       ├── vrc-avatar-image/    # GET - VRChat avatar image fetch
│   │       ├── vrc-world-info/      # GET - VRChat world info fetch (Node.js runtime)
│   │       ├── vrc-world-image/     # GET - VRChat world image fetch (Node.js runtime)
│   │       ├── csv/                 # GET - CSV data endpoint
│   │       ├── download-reference/  # GET - Reference image download (R2)
│   │       ├── revalidate/          # POST - On-demand ISR revalidation
│   │       ├── kv-migrate/          # POST - KV data migration
│   │       └── manifest/            # GET - Dynamic manifest
│   │
│   ├── components/                  # React Components
│   │   ├── akyo-card.tsx            # Entry card (grid view)
│   │   ├── akyo-list.tsx            # Entry list (list view)
│   │   ├── akyo-detail-modal.tsx    # Detail modal
│   │   ├── filter-panel.tsx         # Category/author filter
│   │   ├── search-bar.tsx           # Search input
│   │   ├── language-toggle.tsx      # Language switcher
│   │   ├── loading-spinner.tsx      # Loading indicator
│   │   ├── mini-akyo-bg.tsx         # Animated background
│   │   ├── icons.tsx                # SVG icon components
│   │   ├── dify-chatbot.tsx         # Dify chatbot loader/state handler
│   │   ├── structured-data.tsx      # JSON-LD structured data
│   │   ├── web-vitals.tsx           # Web Vitals reporting
│   │   ├── service-worker-register.tsx  # SW registration
│   │   └── admin/                   # Admin components
│   │       ├── admin-header.tsx
│   │       ├── admin-login.tsx
│   │       ├── admin-tabs.tsx
│   │       ├── attribute-modal.tsx  # Category management
│   │       ├── edit-modal.tsx       # Edit modal
│   │       └── tabs/
│   │           ├── add-tab.tsx      # Add entry tab
│   │           ├── edit-tab.tsx     # Edit entry tab
│   │           └── tools-tab.tsx    # Tools tab
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── use-akyo-data.ts         # Data loading + language refetch
│   │   └── use-language.ts          # Language detection + cookie
│   │
│   ├── lib/                         # Utility Libraries
│   │   ├── akyo-data.ts             # Unified data module (KV → JSON → CSV)
│   │   ├── akyo-data-json.ts        # JSON data source
│   │   ├── akyo-data-kv.ts          # KV data source
│   │   ├── akyo-data-server.ts      # Server-side CSV data loading
│   │   ├── akyo-data-helpers.ts     # Shared helpers (extractCategories, etc.)
│   │   ├── akyo-crud-helpers.ts     # CRUD operation helpers
│   │   ├── akyo-entry.ts            # Entry normalization (hydrateAkyoDataset)
│   │   ├── api-helpers.ts           # API helpers (jsonError, getApiErrorResponse, CSRF, session)
│   │   ├── csv-utils.ts             # CSV parsing/stringify + GitHub sync
│   │   ├── github-utils.ts          # GitHub API operations
│   │   ├── r2-utils.ts              # R2 storage operations
│   │   ├── html-utils.ts            # HTML sanitization
│   │   ├── i18n.ts                  # i18n utilities
│   │   ├── next-id-state.ts         # Next ID allocation state
│   │   ├── session.ts               # HMAC session management
│   │   ├── sentry-browser.ts        # Sentry browser configuration
│   │   ├── vrchat-utils.ts          # VRChat avatar/world utilities
│   │   ├── vrchat-world-image.ts    # VRChat world image fetch
│   │   ├── vrchat-world-info.ts     # VRChat world info fetch
│   │   ├── world-registration.ts    # World entry registration helpers
│   │   ├── blur-data-url.ts         # Blur placeholder generation
│   │   └── cloudflare-image-loader.ts # Cloudflare Images loader
│   │
│   ├── types/
│   │   ├── akyo.ts                  # Core types (AkyoData, AkyoEntryType, etc.)
│   │   ├── kv.ts                    # KV binding types
│   │   ├── env.d.ts                 # Environment variable types
│   │   ├── cloudflare-workers.d.ts  # Cloudflare Workers type declarations
│   │   ├── css.d.ts                 # CSS module types
│   │   └── sanitize-html.d.ts       # sanitize-html type augmentation
│   │
│   └── middleware.ts                # Edge middleware (i18n + CSP + nonce)
│
├── instrumentation.ts               # Sentry server-side initialization
├── instrumentation-client.ts        # Sentry client-side initialization
│
├── scripts/                         # Utility scripts (ESLint excluded)
│   ├── csv-to-json.ts               # CSV → JSON conversion
│   ├── fix-categories.js            # Japanese category fixes
│   ├── fix-categories-en.js         # English category fixes
│   ├── category-definitions-ja.js   # Japanese category keywords
│   ├── category-definitions-en.js   # English category keywords
│   ├── category-definitions-ko.js   # Korean category keywords
│   ├── category-ja-en-map.js        # Category translation map
│   ├── generate-ko-data.js          # Generate KO data from JA source
│   ├── nickname-map-ko.js           # KO nickname translation map
│   ├── update-categories-v3.js      # Japanese category updater
│   ├── update-categories-en-v3.js   # English category updater
│   ├── update-categories-common.js  # Shared category logic
│   ├── sync-akyo-data-en-from-ja.js # Sync EN data from JA
│   ├── convert-akyo-data.js         # Data conversion utility
│   ├── generate-vectorize-payload.js # Vectorize payload generator
│   ├── prepare-cloudflare-pages.js  # Cloudflare Pages build prep
│   └── test-csv-quality.js          # CSV data quality tests
│
└── data/
    ├── akyo-data-ja.csv             # Japanese avatar data
    ├── akyo-data-en.csv             # English avatar data
    ├── akyo-data-ko.csv             # Korean avatar data
    ├── akyo-data-ja.json            # Japanese data (JSON cache)
    ├── akyo-data-en.json            # English data (JSON cache)
    └── akyo-data-ko.json            # Korean data (JSON cache)
```

---

## 🚀 Development Setup

### Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Git**: Latest version
- **Cloudflare Account**: For deployment

### Installation

```bash
# Clone repository
git clone https://github.com/rad-vrc/Akyodex.git
cd Akyodex

# Install dependencies
npm install

# Create .env.local file for local development
cat > .env.local << 'EOF'
# Admin Authentication (simple access codes)
# Owner password (full access): RadAkyo
# Admin password (limited access): Akyo
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo

# Session Secret (Development only)
SESSION_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# R2 Base URL (for image fetching)
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com

# App Origin (for CSRF protection)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Run development server
npm run dev
```

### Admin Password Setup

**Simple Access Codes** (same for development and production):
- **Owner Password**: `RadAkyo` (full access - can delete avatars)
- **Admin Password**: `Akyo` (limited access - can add/edit only)

These are simple, easy-to-share access codes for community contributors.

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack (localhost:3000)
npm run build            # Build for Cloudflare Pages (OpenNext + prepare script)
npm run next:build       # Next.js build only
npm run start            # Start production server (local)

# Quality
npm run lint             # Run ESLint
npm run knip             # Dead code analysis

# Testing
npm run test             # Run Playwright E2E tests
npm run test:playwright  # Run Playwright tests (alias)
npm run test:ui          # Run Playwright with UI mode
npm run test:headed      # Run Playwright with headed browser
npm run test:csv         # CSV data quality checks

# Data
npm run data:convert     # Convert CSV to JSON (npx tsx scripts/csv-to-json.ts)
```

---

## 🚀 Deployment Guide

### Cloudflare Pages Setup

#### 1. Create Cloudflare Pages Project

Via Cloudflare Dashboard:
1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect to GitHub repository: `rad-vrc/Akyodex`

#### 2. Build Configuration

```yaml
Framework preset: None
Build command: npm ci && npm run build
Build output directory: .open-next
Root directory: /  (repository root)
```

#### 3. Environment Variables

Go to **Settings** → **Environment variables** and add:

```bash
# Admin Authentication (plaintext - compared server-side)
ADMIN_PASSWORD_OWNER=your_owner_password
ADMIN_PASSWORD_ADMIN=your_admin_password

# Session Secret (generate with: openssl rand -hex 64)
SESSION_SECRET=your_128_char_hex_secret

# App URL
NEXT_PUBLIC_APP_URL=https://akyodex.com
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com

# GitHub integration (for CSV sync)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO_OWNER=rad-vrc
GITHUB_REPO_NAME=Akyodex
GITHUB_BRANCH=main
GITHUB_CSV_PATH_JA=data/akyo-data-ja.csv
```

#### 4. Cloudflare Bindings

Bindings are defined in `wrangler.toml` and configured in **Settings** → **Functions**:

```toml
# R2 Bucket Binding
[[r2_buckets]]
binding = "AKYO_BUCKET"
bucket_name = "akyo-images"

# KV Namespace Binding
[[kv_namespaces]]
binding = "AKYO_KV"
id = "your_kv_namespace_id"
```

#### 5. Create R2 Bucket

```bash
# Create R2 bucket
npx wrangler r2 bucket create akyo-images

# Upload CSV files
npx wrangler r2 object put akyo-images/data/akyo-data-ja.csv --file=data/akyo-data-ja.csv
npx wrangler r2 object put akyo-images/data/akyo-data-en.csv --file=data/akyo-data-en.csv
```

#### 6. Create KV Namespace

```bash
# Create KV namespace for sessions and data cache
npx wrangler kv:namespace create "AKYO_KV"

# Copy the ID and update wrangler.toml
```

#### 7. Deploy

Push to `main` branch for automatic deployment.

---

## ✅ Deployment Verification

**After successful deployment, verify everything is working correctly:**

### 1. Build Success Check

```bash
# In Cloudflare Pages Dashboard
✅ Build status: Success
✅ Deployment URL: https://your-project.pages.dev
✅ No build errors in logs
```

### 2. Basic Functionality Test

| Feature | URL | Expected Result |
|---------|-----|----------------|
| **Landing Page** | `https://your-project.pages.dev/` | Redirects to /zukan |
| **Avatar Gallery** | `https://your-project.pages.dev/zukan` | Shows avatars |
| **Admin Login** | `https://your-project.pages.dev/admin` | Login page loads |
| **Language Switch** | Click language toggle | Switches between 日本語/English |
| **PWA Manifest** | `https://your-project.pages.dev/manifest.webmanifest` | JSON file loads |
| **Service Worker** | `https://your-project.pages.dev/sw.js` | JavaScript file loads |

### 3. Cloudflare Bindings Check

```bash
# Check R2 bucket
npx wrangler r2 bucket list
# Should show: akyo-images

npx wrangler r2 object list akyo-images
# Should show: data/akyo-data-ja.csv, data/akyo-data-en.csv, images/

# Check KV namespace
npx wrangler kv:namespace list
# Should show: AKYO_KV with ID
```

### 4. Admin Panel Test

| Tab | Action | Expected Result |
|-----|--------|----------------|
| **Add** | Fetch next ID | Shows next available 4-digit ID |
| **Add** | VRChat fetch | Retrieves avatar/world info from VRChat URL |
| **Edit** | Search entry | Finds existing entry |
| **Edit** | Update field | Saves changes to CSV (synced to GitHub) |
| **Tools** | View categories | Shows all category tags |

### 5. PWA Installation Test

```bash
# Desktop (Chrome/Edge):
# 1. Visit site in browser
# 2. Look for install icon in address bar
# 3. Click "Install" → Should install as desktop app

# Mobile (Android/iOS):
# 1. Visit site in browser
# 2. Menu → "Add to Home Screen"
# 3. Should add app icon to home screen
```

### 6. Performance Check

```bash
# Run Lighthouse audit (Chrome DevTools)
# Expected scores:
```

- **Performance**: 90+ (green)
- **Accessibility**: 95+ (green)
- **Best Practices**: 90+ (green)
- **SEO**: 90+ (green)
- **PWA**: ✅ Installable

### 7. Error Monitoring

```bash
# Check Cloudflare Pages Dashboard:
✅ Functions → No errors in last 24h
✅ Analytics → Requests succeeding
✅ Logs → No 5xx errors
```

### Troubleshooting Failed Checks

If any check fails, see [Troubleshooting](#troubleshooting) section for detailed solutions.

**Quick fixes:**
- Build fails → Check Root directory setting
- 404 errors → Check Build output directory
- API errors → Check Environment variables
- Bindings not working → Check Settings → Functions

### Cloudflare Pages Preview Gate limitation (fork PRs)

The workflow `.github/workflows/cloudflare-pages-preview-gate.yml` has two steps:
- `Validate required secrets`
- `Skip gate for forked PRs`

For forked PRs, `CF_API_TOKEN` and `CF_ACCOUNT_ID` are unavailable by design, so the preview verification is skipped.
If you need strict verification for forked PRs as well, do not rely only on this workflow as a required status check.
Use an alternative trusted-branch approach (for example, a secrets-dependent job that runs after maintainers push to a protected branch).

---

## 🔑 Environment Variables

### Required Variables

#### Local Development (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD_OWNER` | Owner access code（平文） | `RadAkyo` |
| `ADMIN_PASSWORD_ADMIN` | Admin access code（平文） | `Akyo` |
| `SESSION_SECRET` | Secret key for HMAC signing | `629de6ec...` (128 chars) |
| `NEXT_PUBLIC_APP_URL` | App origin for CSRF allowlist | `http://localhost:3000` |
| `NEXT_PUBLIC_R2_BASE` | R2 bucket base URL | `https://images.akyodex.com` |
| `NEXT_PUBLIC_DIFY_CHATBOT_TOKEN` | Udify cloud token | *(optional, chatbot disabled if unset)* |
| `CSRF_DEV_ALLOWLIST` (任意) | Playwright などで localhost を許可する場合 `true` | `true` |

#### Production (Cloudflare Pages)

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD_OWNER` | Owner access code（平文、Secrets経由） | *(secret)* |
| `ADMIN_PASSWORD_ADMIN` | Admin access code（平文、Secrets経由） | *(secret)* |
| `SESSION_SECRET` | HMAC signing key、必ず 128 文字以上 | `629de6ec...` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://akyodex.com` |
| `NEXT_PUBLIC_R2_BASE` | CDN base | `https://images.akyodex.com` |
| `NEXT_PUBLIC_DIFY_CHATBOT_TOKEN` | Udify token | *(optional)* |
| `GITHUB_TOKEN` | CSV 更新用 PAT（`repo` scope） | `ghp_xxx` |
| `GITHUB_REPO_OWNER` | GitHub org/user | `rad-vrc` |
| `GITHUB_REPO_NAME` | Repo name | `Akyodex` |
| `GITHUB_BRANCH` | Tracking branch | `main` |
| `GITHUB_CSV_PATH_JA` | Japanese CSV path in repo | `data/akyo-data-ja.csv` |
| `REVALIDATE_SECRET` | ISR revalidation API key | *(secret)* |

### Cloudflare Bindings (wrangler.toml)

| Binding | Type | Purpose |
|---------|------|---------|
| `AKYO_BUCKET` | R2 Bucket | Avatar images and data files |
| `AKYO_KV` | KV Namespace | Admin session storage + data cache |
| `NEXT_TAG_CACHE_KV` | KV Namespace | OpenNext tag revalidation cache |

`AKYO_KV` と `NEXT_TAG_CACHE_KV` を同じ namespace に割り当てる場合は、キー体系が重ならないことを確認してください。
- App data cache keys: `akyo-data:ja`, `akyo-data:en` (pattern: `akyo-data:<locale>`)
- OpenNext tag cache keys: `<NEXT_BUILD_ID>/<tag>`

### How to Generate Session Secret

```bash
# Session Secret (128 hex characters)
openssl rand -hex 64

# Or use Node.js
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(64).toString('hex'));"
```

### About Access Codes

The admin passwords are **simple access codes** designed to be easily shared with community contributors:
- **RadAkyo**: Full access (owner role)
- **Akyo**: Limited access (admin role)

These are not meant to be highly secure passwords, but rather easy-to-remember codes for trusted community members.

---

## ✨ Features

### 1. Avatar Gallery

- **Avatars**: Complete database with 4-digit IDs, JP/EN/KO data
- **Search**: By nickname, avatar name, category, author
- **Filtering**: Multi-select categories (OR/AND) + multi-select authors
- **Keyboard A11y**: Arrow/Home/End/Enter support in filter lists
- **View Modes**: Grid view and list view
- **Detail View**: Modal with full information
- **SSG + ISR**: Static generation with 1-hour revalidation
- **Responsive**: Mobile-first design
- **Image Fallback**: R2 → VRChat page/API → Placeholder (3-tier fallback system)
- **Favorites**: localStorage-based favorite system

### 2. Admin Panel

**Access**: `/admin` (requires authentication)

#### Features:
- ✅ **HMAC Authentication**: Secure session management (Web Crypto API)
- ✅ **Add Entry**: 
  - Auto ID numbering (fetches next available ID)
  - Image upload to R2
  - VRChat integration (fetch avatar/world info from VRChat)
  - Duplicate checking (nickname, avatar name)
- ✅ **Edit Entry**:
  - Update all fields (category, comment, author, etc.)
  - Re-upload images
  - Delete entries (owner only)
- ✅ **Category Management**:
  - Add new categories
  - Edit existing categories
  - Unicode normalization (NFC) for duplicate checking
- ✅ **Tools**:
  - CSV export
  - Data management

#### Security:
- 🔒 Timing-safe password comparison (prevents timing attacks)
- 🔒 HTTP-only cookies for session tokens
- 🔒 Session expiration (24 hours)
- 🔒 CSRF protection (Origin/Referer validation)
- 🔒 Role-based access control (Owner/Admin)
- 🔒 CSP with nonce (Content Security Policy)

### 3. PWA (Progressive Web App)

#### Service Worker Caching Strategies:

1. **Cache First** (Fonts, Icons)
   - Check cache → Network fallback
   - 30-day cache duration

2. **Network First** (HTML, API)
   - Network first → Cache fallback
   - 5-minute cache duration

3. **Cache Only** (Offline page)
   - Always serve from cache

4. **Network Only** (Admin, Auth)
   - Never cache sensitive data

5. **Stale While Revalidate** (Images, CSS, JS)
   - Serve from cache immediately
   - Fetch fresh copy in background
   - 7-day cache duration

6. **Offline Fallback**
   - Custom offline page
   - Shows cached avatars

#### PWA Features:
- ✅ Installable (Add to Home Screen)
- ✅ Offline support
- ✅ Background sync
- ✅ Push notifications (future)
- ✅ App-like experience

### 4. Internationalization (i18n)

#### Supported Languages:
- 🇯🇵 Japanese (ja) - Default
- 🇺🇸 English (en)
- 🇰🇷 Korean (ko)

#### Detection Priority:
1. **Cookie** (`AKYO_LANG=ja` / `en` / `ko`)
2. **Cloudflare Header** (`cf-ipcountry`)
3. **Accept-Language Header**
4. **Default**: Japanese

#### Implementation:
- Edge Middleware for language detection
- Client-side language toggle
- Separate data files (akyo-data-ja/en/ko.csv + .json)
- Dynamic content loading with language refetch

### 5. Dify AI Chatbot

#### Features:
- 🤖 **AI-Powered Search**: Natural language avatar queries
- 💬 **Embedded Widget**: Right-bottom corner chat button
- 🎨 **Custom Styling**: Orange theme (#EE7800) matching site design
- 📱 **Responsive**: Works on desktop and mobile

#### Configuration:
- **Token**: `NEXT_PUBLIC_DIFY_CHATBOT_TOKEN` から読み込み（必須・未設定ならチャットボットを読み込まない）
- **Provider**: Udify.app（`https://udify.app/embed.min.js`）
- **Position**: Fixed bottom-right
- **Size**: 24rem × 40rem

#### Usage:
Users can ask questions like:
- "チョコミント類のAkyoを見せて"
- "Show me fox-type Akyos"
- "ugaiさんが作ったアバターは？"

---

## 🔌 API Endpoints

### Public APIs

#### `GET /api/avatar-image`
**Avatar image proxy with VRChat fallback**

**Query Parameters**:
- `id` (string): Avatar ID (e.g., "0001")
- `avtr` (string, optional): VRChat avatar ID (e.g., "avtr_abc123...")
- `w` (number, optional): Image width (default: 512, max: 4096)

**Fallback Priority**:
1. R2 Bucket (`https://images.akyodex.com/images/{id}.webp`)
2. VRChat API (if `avtr` provided or found in CSV)
3. Placeholder image

**Response**: Image binary (WebP/PNG/JPEG)

#### `GET /api/vrc-avatar-info`
**Fetch VRChat avatar info**

**Query Parameters**:
- `avtr` (string): VRChat avatar ID (e.g., "avtr_abc123...")

**Response**:
```json
{
  "avatarName": "Avatar Name",
  "creatorName": "Creator Name",
  "description": "Description...",
  "fullTitle": "Full OGP Title",
  "avtr": "avtr_abc123..."
}
```

#### `GET /api/vrc-avatar-image`
**Fetch VRChat avatar image**

**Query Parameters**:
- `avtr` (string): VRChat avatar ID

**Response**: Image binary

#### `GET /api/vrc-world-info`
**Fetch VRChat world info (Node.js runtime)**

**Query Parameters**:
- `wrld` (string): VRChat world ID (e.g., "wrld_abc123...")

**Response**:
```json
{
  "success": true,
  "data": {
    "worldName": "World Name",
    "creatorName": "Creator Name",
    "description": "Description...",
    "wrld": "wrld_abc123..."
  }
}
```

#### `GET /api/vrc-world-image`
**Fetch VRChat world image (Node.js runtime)**

**Query Parameters**:
- `wrld` (string): VRChat world ID

**Response**: Image binary

#### `GET /api/akyo-data`
**Fetch Akyo data by language (Node.js runtime)**

**Query Parameters**:
- `lang` (string): Language code (`ja`, `en`, `ko`)

**Response**:
```json
{
  "success": true,
  "data": [/* AkyoData[] */]
}
```

### Admin APIs (Authentication Required)

#### `POST /api/admin/login`
**Admin login**

**Body**:
```json
{
  "password": "YourPassword"
}
```

**Response**:
```json
{
  "success": true,
  "role": "admin",
  "message": "ログインしました"
}
```

**Sets HTTP-only cookie**: `admin_session` (HMAC-signed token, 24h expiry)

#### `POST /api/admin/logout`
**Admin logout**

**Response**:
```json
{
  "success": true
}
```

#### `GET /api/admin/verify-session`
**Verify admin session**

**Response**:
```json
{
  "valid": true,
  "role": "admin"
}
```

#### `GET /api/admin/next-id`
**Get next available avatar ID**

**Response**:
```json
{
  "nextId": "0640"
}
```

#### `POST /api/upload-akyo`
**Register new avatar**

**Body** (FormData):
- `id`: Avatar ID (4-digit)
- `nickname`: Nickname
- `avatarName`: Avatar name
- `category`: Categories (comma-separated)
- `comment`: Notes/comments
- `author`: Author name
- `avatarUrl`: VRChat avatar URL
- `imageData`: Base64 image data (optional)

#### `POST /api/update-akyo`
**Update existing entry**

**Body** (FormData): Same as upload-akyo

#### `POST /api/delete-akyo`
**Delete entry**

**Body**:
```json
{
  "id": "0001"
}
```

#### `POST /api/check-duplicate`
**Check for duplicates**

**Body**:
```json
{
  "field": "nickname" | "avatarName",
  "value": "value to check",
  "excludeId": "0001" (optional)
}
```

---

## 🔒 Security

### Implemented Security Measures

#### 1. Timing Attack Prevention
**File**: `src/app/api/admin/login/route.ts`

```typescript
function timingSafeCompare(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

// Always check both passwords to prevent role detection
const isOwner = timingSafeCompare(password, ownerPassword);
const isAdmin = timingSafeCompare(password, adminPassword);
```

#### 2. XSS Prevention
**File**: `src/lib/html-utils.ts`

```typescript
import sanitizeHtml from 'sanitize-html';

// Strip all HTML tags safely
export function stripHTMLTags(html: string): string {
  if (!html) return html;
  return sanitizeHtml(html, { 
    allowedTags: [], 
    allowedAttributes: {} 
  });
}
```

#### 3. Input Validation
**File**: `src/app/api/vrc-avatar-info/route.ts`

```typescript
import { VRCHAT_AVATAR_ID_PATTERN } from '@/lib/akyo-entry';
import { jsonError } from '@/lib/api-helpers';

// Length-limited regex via shared pattern (prevents ReDoS)
if (!VRCHAT_AVATAR_ID_PATTERN.test(avtr)) {
  return jsonError('Invalid avtr format (must be avtr_[A-Za-z0-9-]{1,64})', 400);
}
```

#### 4. Session Management
**File**: `src/lib/session.ts`

```typescript
// HMAC-signed sessions with Web Crypto API
export async function createSessionToken(
  username: string,
  role: AdminRole,
  durationMs: number = 24 * 60 * 60 * 1000
): Promise<string> {
  // Signs session data with HMAC SHA-256
  // Returns base64url-encoded signed token
}
```

**File**: `src/lib/api-helpers.ts`

```typescript
// Secure cookie configuration
export async function setSessionCookie(token: string, maxAge: number) {
  cookieStore.set('admin_session', token, {
    httpOnly: true,                              // Prevent XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',                          // CSRF protection
    maxAge,
    path: '/',
  });
}
```

#### 5. Content Security Policy
**File**: `src/middleware.ts`

```typescript
// Nonce-based CSP generated per request
const randomBytes = crypto.getRandomValues(new Uint8Array(16));
const nonce = btoa(String.fromCharCode(...randomBytes));
const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' ...`;
```

### Security Best Practices

✅ **Passwords**: Server-side comparison, never exposed to client
✅ **Sessions**: HMAC-signed with HTTP-only cookies (24h expiry)
✅ **API Keys**: Environment variables only (never in code)
✅ **Input**: Validated with length-limited regex
✅ **HTML**: Sanitized with `sanitize-html` library
✅ **Timing Attacks**: Constant-time comparison for passwords
✅ **CSRF**: Origin/Referer validation + SameSite=Strict cookies
✅ **XSS**: HTML entity decoding + tag stripping + CSP
✅ **CSP**: Nonce-based Content Security Policy per request

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails on Cloudflare Pages

**Error**: `Build failed`

**Solution**: Ensure the build command and output directory are correct:

```yaml
Build command: npm ci && npm run build
Build output directory: .open-next
```

#### 2. Admin Login Fails

**Possible Causes**:
1. Wrong password
2. Missing SESSION_SECRET
3. Cookie not set (check browser)

**Solution**:
```bash
# Check environment variables are set
# ADMIN_PASSWORD_OWNER and ADMIN_PASSWORD_ADMIN must be set

# Regenerate session secret
openssl rand -hex 64
```

#### 3. Images Not Loading

**Possible Causes**:
1. R2 bucket not created
2. Binding name mismatch (should be `AKYO_BUCKET`)
3. NEXT_PUBLIC_R2_BASE not set

**Solution**:
```bash
# Check R2 bucket
npx wrangler r2 bucket list

# Re-upload images
npx wrangler r2 object put akyo-images/images/0001.webp --file=path/to/image.webp
```

#### 4. PWA Not Installing

**Possible Causes**:
1. Service Worker not registered
2. HTTPS not enabled (required for PWA)
3. Manifest issues

**Solution**:
1. Check browser console for SW errors
2. Ensure HTTPS is enabled (Cloudflare Pages auto-enables)
3. Verify manifest is accessible at `/manifest.webmanifest`

#### 5. API Route Type Errors After Refactoring

**Error**: `Type 'NextRequest' is not assignable to type 'Request'`

**Solution**: Use standard Web API types:

```typescript
// ❌ Old pattern
import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
}

// ✅ New pattern
export async function POST(request: Request) {
  return Response.json({ success: true });
}
```

**When to use NextRequest**: Only if you need Next.js-specific features like `request.nextUrl`. Document the reason in a comment.

#### 6. Error Response Format Issues

**Solution**: Use the `jsonError()` helper for all error responses:

```typescript
import { jsonError } from '@/lib/api-helpers';

// ✅ Correct pattern
return jsonError('Invalid input', 400);
// Returns: { success: false, error: 'Invalid input' }
```

#### 7. Cookie Management Issues

**Solution**: Use the cookie helper functions:

```typescript
import { setSessionCookie, clearSessionCookie } from '@/lib/api-helpers';

// ✅ Set session cookie
await setSessionCookie(token);

// ✅ Clear session cookie
await clearSessionCookie();
```

#### 8. Runtime Configuration Errors

**Error**: Route using Node.js APIs fails on Edge Runtime

**Solution**: Add the runtime export:

```typescript
// For routes using csv-parse/sync, GitHub API, or Buffer
export const runtime = 'nodejs';
```

---

## 📜 Migration History

### Phase 1: Initial Next.js Setup (Completed 2025-01-15)
- ✅ Next.js project setup
- ✅ Tailwind CSS configuration
- ✅ Basic routing structure

### Phase 2: Static Site Generation (Completed 2025-01-20)
- ✅ SSG implementation for avatar gallery
- ✅ ISR (Incremental Static Regeneration) with 1-hour revalidation
- ✅ CSV data parsing and loading
- ✅ Detail pages with dynamic routes

### Phase 3: Internationalization (Completed 2025-01-25)
- ✅ i18n middleware implementation
- ✅ Language detection (Cookie → cf-ipcountry → Accept-Language)
- ✅ English CSV support
- ✅ Language toggle component

### Phase 4: Admin Panel (Completed 2025-02-01)
- ✅ Authentication system
- ✅ Admin dashboard with tabs
- ✅ CRUD operations for avatars
- ✅ VRChat integration

### Phase 5: PWA (Completed 2025-02-15)
- ✅ Service Worker with 6 caching strategies
- ✅ Offline support
- ✅ PWA manifest
- ✅ Install prompt

### Phase 6: Security Hardening (Completed 2025-10-22)
- ✅ Timing attack prevention
- ✅ XSS prevention with sanitize-html
- ✅ Input validation improvements
- ✅ HTML entity decoding
- ✅ Session management hardening

### Phase 7: Best Practices Refactoring (Completed)
- ✅ Migrated API routes to standard `Request`/`Response` types
- ✅ Created helper functions (`jsonError`, `jsonSuccess`, `setSessionCookie`)
- ✅ Added runtime declarations (Edge/Node.js) to all routes
- ✅ Centralized CSRF validation and admin authentication

### Phase 8: Data Architecture Modernization (Completed)
- ✅ CSV → JSON data conversion pipeline
- ✅ Multi-tier data loading (KV → JSON → CSV fallback)
- ✅ On-demand ISR revalidation API
- ✅ KV Edge Cache for data
- ✅ GitHub API integration for CSV sync on CRUD operations
- ✅ Data module refactoring (shared helpers, DRY)

### Phase 9: Schema Migration (Completed)
- ✅ `attribute` → `category`, `notes` → `comment`, `creator` → `author`
- ✅ `akyo-data.csv` → `akyo-data-ja.csv`, `akyo-data-US.csv` → `akyo-data-en.csv`
- ✅ Category definition scripts (JA/EN keyword matching)
- ✅ HMAC-signed sessions (replacing JWT)
- ✅ Nonce-based CSP via middleware

### Phase 10: Next.js 16 + World Support (Completed)
- ✅ Next.js 15 → 16 upgrade (React 19.2.4, @opennextjs/cloudflare ^1.16.5)
- ✅ World entry type support (avatar + world dual entries)
- ✅ Entry normalization (`hydrateAkyoDataset` — type inference, display serial allocation)
- ✅ VRChat World APIs (`vrc-world-info`, `vrc-world-image`)
- ✅ Extended CSV schema (`SourceURL`, `EntryType`, `DisplaySerial` columns)
- ✅ Korean language data support (`akyo-data-ko.csv`)
- ✅ Sentry integration (error tracking + performance monitoring)
- ✅ Korean data generation script (`generate-ko-data.js`)

---

## 🤝 Contributing

### Git Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: description of changes"

# 3. Push to remote
git push origin feature/your-feature-name

# 4. Create Pull Request on GitHub
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint 9 with Next.js config
- **Components**: Functional components with TypeScript
- **Naming**: PascalCase for components, camelCase for functions
- **`any` type prohibited**: Use precise type definitions

### Before PR

1. ✅ Run `npm run lint`
2. ✅ Run `npm run build` (includes type checking)
3. ✅ Test locally with `npm run dev`
4. ✅ Write descriptive PR description

---

## 📞 Support

For questions or issues:
1. Check this README
2. Check existing issues: https://github.com/rad-vrc/Akyodex/issues
3. Create new issue with detailed description

---

## 📄 License

[MIT License](./LICENSE) - See LICENSE file for details

---

## 🎉 Acknowledgments

- **Next.js Team**: For the amazing framework
- **Cloudflare**: For Pages platform, R2, and KV services
- **OpenNext**: For the Cloudflare Pages adapter
- **VRChat**: For avatar data and API
- **Akyo Community**: For the avatar designs and support

---

**Last Updated**: 2026-02-13  
**Status**: ✅ Production Ready

