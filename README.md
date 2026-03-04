# Akyodex - Next.js 16 + Cloudflare Pages

**VRChat Avatar Encyclopedia**

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

**Akyodex** は、VRChatのオリジナルアバター「Akyo」シリーズを網羅したオンライン図鑑です。

### Key Features
- 🎨 **アバターデータベース** - 4桁ID管理システム（日本語/英語/韓国語 CSV + JSON データ）
- 🔐 **Admin Panel** - HMAC署名セッション認証、画像クロッピング、VRChat連携
- 📱 **PWA対応** - 6種類のキャッシング戦略
- 🌍 **多言語対応** - 日本語/英語/韓国語（自動検出 + 手動切替）
- ⚡ **Edge Runtime** - Cloudflare Pages + R2 + KV
- 🤖 **Difyチャットボット** - AI搭載のアバター検索アシスタント
- 📊 **多段データロード** - KV → JSON → CSV 自動フォールバック

### Project Status
- ✅ **Next.js 16.1.6 + Cloudflare Pages** (OpenNext adapter)
- ✅ **Security Hardening** (Timing attack, XSS prevention, Input validation)
- ✅ **PWA Implementation** (Service Worker with 6 caching strategies)
- ✅ **VRChat Image Fallback** (3-tier fallback: R2 → VRChat API → Placeholder)
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

### Security
- **HTML Sanitization**: sanitize-html 2.17.0
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
- **Testing**: Playwright (E2E tests)
- **Dead Code Analysis**: Knip
- **Git Workflow**: Feature branches → PR → main
- **CI/CD**: Cloudflare Pages automatic deployment + PR conflict detection

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
│   │   ├── opengraph-image.tsx      # OG image generation
│   │   ├── not-found.tsx            # 404 page
│   │   ├── error.tsx                # Error boundary
│   │   ├── global-error.tsx         # Global error boundary
│   │   ├── offline/                 # PWA offline page
│   │   ├── admin/                   # Admin panel
│   │   │   ├── page.tsx             # Admin server component
│   │   │   └── admin-client.tsx     # Admin client logic
│   │   ├── zukan/                   # Avatar gallery
│   │   │   ├── page.tsx             # Gallery page (SSG + ISR)
│   │   │   ├── loading.tsx          # Loading skeleton
│   │   │   └── zukan-client.tsx     # Gallery client component
│   │   └── api/                     # API Routes
│   │       ├── admin/               # Auth APIs
│   │       │   ├── login/           # POST - Login
│   │       │   ├── logout/          # POST - Logout
│   │       │   ├── verify-session/  # GET - Session verification
│   │       │   └── next-id/         # GET - Next available ID
│   │       ├── upload-akyo/         # POST - Avatar registration
│   │       ├── update-akyo/         # POST - Avatar update
│   │       ├── delete-akyo/         # POST - Avatar deletion
│   │       ├── check-duplicate/     # POST - Duplicate check
│   │       ├── avatar-image/        # GET - Image proxy (R2/VRChat fallback)
│   │       ├── vrc-avatar-info/     # GET - VRChat avatar info fetch
│   │       ├── vrc-avatar-image/    # GET - VRChat avatar image fetch
│   │       ├── csv/                 # GET - CSV data endpoint
│   │       ├── download-reference/  # GET - Reference image download
│   │       ├── revalidate/          # POST - On-demand ISR revalidation
│   │       ├── kv-migrate/          # POST - KV data migration
│   │       └── manifest/            # GET - Dynamic manifest
│   │
│   ├── components/                  # React Components
│   │   ├── akyo-card.tsx            # Avatar card (grid view)
│   │   ├── akyo-list.tsx            # Avatar list (list view)
│   │   ├── akyo-detail-modal.tsx    # Detail modal
│   │   ├── filter-panel.tsx         # Category/author filter
│   │   ├── search-bar.tsx           # Search input
│   │   ├── language-toggle.tsx      # Language switcher
│   │   ├── mini-akyo-bg.tsx         # Animated background
│   │   ├── icons.tsx                # SVG icon components
│   │   ├── dify-chatbot.tsx         # Dify chatbot loader/state handler
│   │   ├── dify-chatbot.module.css  # Dify chatbot CSS module
│   │   ├── runtime-features.tsx     # Deferred runtime features (Dify, etc.)
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
│   │           ├── add-tab.tsx      # Add avatar tab
│   │           ├── edit-tab.tsx     # Edit avatar tab
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
│   │   ├── api-helpers.ts           # API helpers (jsonError, CSRF, session)
│   │   ├── csv-utils.ts             # CSV parsing/stringify + GitHub sync
│   │   ├── github-utils.ts          # GitHub API operations
│   │   ├── r2-utils.ts              # R2 storage operations
│   │   ├── html-utils.ts            # HTML sanitization
│   │   ├── i18n.ts                  # i18n utilities
│   │   ├── session.ts               # HMAC session management
│   │   ├── vrchat-utils.ts          # VRChat API utilities
│   │   ├── blur-data-url.ts         # Blur placeholder generation
│   │   └── cloudflare-image-loader.ts # Cloudflare Images loader
│   │
│   ├── types/
│   │   ├── akyo.ts                  # Core types (AkyoData, etc.)
│   │   ├── kv.ts                    # KV binding types
│   │   ├── env.d.ts                 # Environment variable types
│   │   ├── css.d.ts                 # CSS module types
│   │   └── sanitize-html.d.ts       # sanitize-html type augmentation
│   │
│   └── middleware.ts                # Edge middleware (i18n + CSP + nonce)
│
├── scripts/                         # Utility scripts (ESLint excluded)
│   ├── push-and-check-pr-conflicts.js # Push + PR merge conflict checker
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

# Git — push & check PR merge conflicts
npm run push:check-pr -- [git push args]  # Portable wrapper; --skip-push to check only; exit 2 = conflicts
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

Bindings are defined in `wrangler.toml` and