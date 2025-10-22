# Akyodex - Next.js 15 + Cloudflare Pages

**VRChat Avatar Encyclopedia with AI-Powered Chatbot**

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Development Setup](#development-setup)
6. [Deployment Guide](#deployment-guide)
7. [Environment Variables](#environment-variables)
8. [Features](#features)
9. [API Endpoints](#api-endpoints)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)
12. [Migration History](#migration-history)
13. [Known Issues](#known-issues)
14. [Contributing](#contributing)

---

## 📖 Project Overview

**Akyodex** は、VRChatのオリジナルアバター「暁」シリーズを網羅したオンライン図鑑です。

### Key Features
- 🎨 **639体のアバターデータベース** - 4桁ID管理システム
- 🤖 **AI Chatbot (RAG)** - Cloudflare Workers AI + Vectorize + Gemini 2.5 Flash
- 🔐 **Admin Panel** - JWT認証、画像クロッピング、VRChat連携
- 📱 **PWA対応** - 6種類のキャッシング戦略
- 🌍 **多言語対応** - 日本語/英語（自動検出）
- ⚡ **Edge Runtime** - Cloudflare Pages + R2 + KV + Vectorize

### Project Status
- ✅ **Next.js 15.5.6 Migration Complete** (PR #113 - 2025-10-22)
- ✅ **Security Hardening** (Timing attack, XSS prevention, Input validation)
- ✅ **PWA Implementation** (Service Worker with 6 caching strategies)
- ✅ **AI Chatbot** (BGE-M3 embeddings → Vectorize → Cohere rerank → Gemini)
- 📝 **Code Quality Improvements** (Issue #115 - 8 refactoring tasks)

---

## 🏗️ Architecture

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js 15 App (Edge Runtime)            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   SSG Pages │  │ API Routes   │  │ Middleware  │  │  │
│  │  │   (Static)  │  │ (Edge Funcs) │  │  (i18n)     │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│           │                │                │                │
│           ├────────────────┼────────────────┤                │
│           ▼                ▼                ▼                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │  R2 Bucket │  │  KV Store   │  │  Vectorize   │         │
│  │   (CSV +   │  │  (Session)  │  │ (Embeddings) │         │
│  │   Images)  │  └─────────────┘  └──────────────┘         │
│  └────────────┘                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  External AI Services  │
              │  ・Workers AI (BGE-M3) │
              │  ・Cohere (Rerank v3)  │
              │  ・Gemini 2.5 Flash    │
              └────────────────────────┘
```

### AI Chatbot Flow (RAG)

```
User Query
    │
    ▼
┌──────────────────────────────────────────┐
│ 1. Embedding Generation                  │
│    Workers AI: @cf/baai/bge-m3          │
│    Input: User question (Japanese/EN)    │
│    Output: 1024-dim vector               │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ 2. Vector Search                         │
│    Cloudflare Vectorize                  │
│    - Cosine similarity search            │
│    - Top 20 results                      │
│    - Metadata: ID, appearance, nickname  │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ 3. Reranking                             │
│    Cohere Rerank v3                      │
│    - Relevance scoring                   │
│    - Top 5 results                       │
│    - 30s timeout with AbortController    │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ 4. Context Retrieval                     │
│    R2 Bucket (CSV)                       │
│    - Fetch full avatar data              │
│    - Format context for LLM              │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ 5. Response Generation                   │
│    Gemini 2.5 Flash                      │
│    - Streaming response                  │
│    - System prompt in Japanese           │
│    - Citation with source IDs            │
└──────────────────────────────────────────┘
    │
    ▼
Response with Sources
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **React**: 19.1.0 (Server/Client Components)
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI (Dialog, Dropdown, Tabs)
- **Icons**: Lucide React
- **Image Processing**: react-image-crop 11.0.7
- **PWA**: Custom Service Worker with 6 caching strategies

### Backend
- **Runtime**: Cloudflare Pages (Edge Runtime)
- **Adapter**: @opennextjs/cloudflare 1.3.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: crypto.createHash('sha256')
- **Session Storage**: Cloudflare KV
- **File Storage**: Cloudflare R2

### AI Services
- **Embeddings**: Cloudflare Workers AI (@cf/baai/bge-m3)
- **Vector DB**: Cloudflare Vectorize (1024 dimensions, cosine similarity)
- **Reranking**: Cohere Rerank v3 API
- **LLM**: Google Gemini 2.5 Flash API (gemini-2.0-flash-exp)

### Security
- **HTML Sanitization**: sanitize-html 2.17.0
- **Timing Attack Prevention**: crypto.timingSafeEqual()
- **Input Validation**: Length-limited regex patterns
- **XSS Prevention**: HTML entity decoding + tag stripping

### DevOps
- **Package Manager**: npm 10.x
- **Node Version**: 20.x
- **Git Workflow**: Feature branches → PR → main
- **CI/CD**: Cloudflare Pages automatic deployment

---

## 📁 Project Structure

```
akyodex-nextjs/
├── README.md                        # This file
├── DEPLOYMENT.md                    # Cloudflare Pages deployment guide
├── CHATBOT_SETUP.md                 # AI chatbot setup instructions
├── MIGRATION_COMPARISON.md          # Migration history and comparison
│
├── package.json                     # Dependencies and scripts
├── package-lock.json
├── next.config.ts                   # Next.js + Cloudflare config
├── tailwind.config.ts               # Tailwind CSS config
├── tsconfig.json                    # TypeScript config
├── wrangler.toml                    # Cloudflare bindings config
│
├── public/
│   ├── sw.js                        # Service Worker (6 caching strategies)
│   ├── manifest.json                # PWA manifest
│   ├── icons/                       # PWA icons
│   └── fonts/                       # M PLUS Rounded 1c
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (i18n, PWA, chatbot)
│   │   ├── page.tsx                 # Landing page
│   │   ├── offline/                 # PWA offline page
│   │   ├── admin/                   # Admin panel pages
│   │   │   ├── page.tsx             # Admin dashboard
│   │   │   └── admin-client.tsx     # Client-side admin logic
│   │   ├── zukan/                   # Avatar gallery
│   │   │   ├── page.tsx             # Gallery page (SSG + ISR)
│   │   │   ├── loading.tsx          # Loading skeleton
│   │   │   └── detail/[id]/         # Detail page (SSG)
│   │   │       ├── page.tsx
│   │   │       └── loading.tsx
│   │   └── api/                     # API Routes (Edge Runtime)
│   │       ├── chat/                # AI Chatbot endpoint
│   │       ├── admin/               # Admin API
│   │       │   ├── login/
│   │       │   ├── logout/
│   │       │   ├── verify-session/
│   │       │   └── next-id/         # Auto ID numbering
│   │       ├── upload-akyo/         # Avatar registration
│   │       ├── update-akyo/         # Avatar update
│   │       ├── delete-akyo/         # Avatar deletion
│   │       ├── check-duplicate/     # Duplicate check
│   │       ├── avatar-image/        # Image proxy
│   │       ├── vrc-avatar-info/     # VRChat avatar info fetch
│   │       └── vrc-avatar-image/    # VRChat avatar image fetch
│   │
│   ├── components/                  # React Components
│   │   ├── akyo-card.tsx            # Avatar card component
│   │   ├── akyo-list.tsx            # Avatar list component
│   │   ├── akyo-detail-modal.tsx    # Detail modal
│   │   ├── akyo-chatbot.tsx         # AI Chatbot UI
│   │   ├── mini-akyo-bg.tsx         # Animated background
│   │   ├── service-worker-register.tsx  # SW registration
│   │   ├── language-selector.tsx    # Language switcher
│   │   └── admin/                   # Admin components
│   │       ├── admin-header.tsx
│   │       ├── admin-login.tsx
│   │       ├── admin-tabs.tsx
│   │       ├── attribute-modal.tsx  # Attribute management
│   │       ├── edit-modal.tsx       # Edit modal with image crop
│   │       └── tabs/
│   │           ├── add-tab.tsx      # Add avatar tab
│   │           ├── edit-tab.tsx     # Edit avatar tab
│   │           └── tools-tab.tsx    # Tools tab
│   │
│   ├── lib/                         # Utility Libraries
│   │   ├── akyo-data-server.ts      # Server-side data loading
│   │   ├── api-helpers.ts           # API helper functions
│   │   ├── csv-parser.ts            # CSV parser
│   │   ├── csv-utils.ts             # CSV utilities (createAkyoRecord)
│   │   ├── html-utils.ts            # HTML sanitization (NEW)
│   │   ├── i18n.ts                  # i18n utilities
│   │   ├── session.ts               # JWT session management
│   │   └── vrchat-utils.ts          # VRChat API utilities
│   │
│   ├── types/
│   │   └── akyo.ts                  # TypeScript types
│   │
│   └── middleware.ts                # Edge middleware (i18n detection)
│
├── scripts/
│   ├── prepare-vectorize-data.mjs   # Generate NDJSON for Vectorize
│   ├── upload-to-vectorize.mjs      # Upload embeddings to Vectorize
│   └── migrate-csv-to-4digit.mjs    # Migrate CSV to 4-digit IDs
│
└── data/
    ├── akyo-data.csv                # Main avatar data (639 entries)
    └── akyo-data-US.csv             # English avatar data

```

---

## 🚀 Development Setup

### Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Git**: Latest version
- **Cloudflare Account**: For deployment
- **API Keys**:
  - Google Gemini API Key
  - Cohere API Key

### Installation

```bash
# Clone repository
git clone https://github.com/rad-vrc/Akyodex.git
cd Akyodex/akyodex-nextjs

# Install dependencies
npm install

# Create .dev.vars file for local development
cat > .dev.vars << 'EOF'
# Admin Authentication
ADMIN_PASSWORD_HASH=e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313
OWNER_PASSWORD_HASH=your_owner_password_hash_here

# JWT Secret
JWT_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
EOF

# Run development server
npm run dev
```

### Admin Password Generation

```bash
# Generate password hash
node -e "const crypto = require('crypto'); const password = 'YourSecurePassword123'; console.log('Password:', password); console.log('Hash:', crypto.createHash('sha256').update(password).digest('hex'));"
```

**Default Admin Credentials** (for development only):
- **Password**: `Akyo-Admin-95cea4f6a6e348da5cec1fc31ef23ba2`
- **Hash**: `e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313`

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production (Vercel)
npm run pages:build      # Build for Cloudflare Pages
npm run pages:deploy     # Deploy to Cloudflare Pages
npm run pages:dev        # Local Cloudflare Pages dev server

# Linting & Type Check
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript compiler check

# Vectorize Data Preparation
node scripts/prepare-vectorize-data.mjs    # Generate NDJSON
node scripts/upload-to-vectorize.mjs       # Upload to Vectorize

# CSV Migration
node scripts/migrate-csv-to-4digit.mjs     # Migrate to 4-digit IDs
```

---

## 🚀 Deployment Guide

### Cloudflare Pages Setup

#### 1. Create Cloudflare Pages Project

```bash
cd akyodex-nextjs
npm run pages:deploy
```

Or manually via dashboard:
1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect to GitHub repository: `rad-vrc/Akyodex`

#### 2. Build Configuration

**IMPORTANT**: Set the correct root directory!

```yaml
Framework preset: None (or Next.js)
Build command: npm ci && npm run pages:build
Build output directory: .vercel/output/static
Root directory (advanced): akyodex-nextjs  ← CRITICAL!
```

#### 3. Environment Variables

Go to **Settings** → **Environment variables** and add:

```bash
# Admin Authentication
ADMIN_PASSWORD_HASH=e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313
OWNER_PASSWORD_HASH=your_owner_password_hash_here

# JWT Secret (generate with: openssl rand -hex 64)
JWT_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
```

#### 4. Cloudflare Bindings

Add these bindings in **Settings** → **Functions**:

```toml
# R2 Bucket Binding
[[r2_buckets]]
binding = "AKYO_BUCKET"
bucket_name = "akyo-data"

# KV Namespace Binding
[[kv_namespaces]]
binding = "AKYO_KV"
id = "your_kv_namespace_id"

# Vectorize Index Binding
[[vectorize]]
binding = "AKYO_VECTORIZE"
index_name = "akyo-encyclopedia"
```

#### 5. Create R2 Bucket

```bash
# Create R2 bucket
npx wrangler r2 bucket create akyo-data

# Upload CSV files
npx wrangler r2 object put akyo-data/data/akyo-data.csv --file=../data/akyo-data.csv
npx wrangler r2 object put akyo-data/data/akyo-data-US.csv --file=../data/akyo-data-US.csv
```

#### 6. Create KV Namespace

```bash
# Create KV namespace for sessions
npx wrangler kv:namespace create "AKYO_KV"

# Copy the ID and add to Cloudflare Pages bindings
```

#### 7. Create Vectorize Index

```bash
# Create Vectorize index
npx wrangler vectorize create akyo-encyclopedia --dimensions=1024 --metric=cosine

# Prepare and upload embeddings
node scripts/prepare-vectorize-data.mjs
node scripts/upload-to-vectorize.mjs
```

#### 8. Deploy

```bash
npm run pages:deploy
```

Or push to `main` branch for automatic deployment.

---

## 🔑 Environment Variables

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `ADMIN_PASSWORD_HASH` | SHA-256 hash of admin password | `e5df0cec...` | ✅ Yes |
| `OWNER_PASSWORD_HASH` | SHA-256 hash of owner password | `a1b2c3d4...` | ✅ Yes |
| `JWT_SECRET` | Secret key for JWT signing | `629de6ec...` (128 chars) | ✅ Yes |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` | ✅ Yes (for chatbot) |
| `COHERE_API_KEY` | Cohere API key | `abc123...` | ✅ Yes (for chatbot) |

### Cloudflare Bindings (Auto-configured)

| Binding | Type | Purpose |
|---------|------|---------|
| `AKYO_BUCKET` | R2 Bucket | CSV files and avatar images |
| `AKYO_KV` | KV Namespace | Admin session storage |
| `AKYO_VECTORIZE` | Vectorize Index | Avatar embeddings for RAG |

### How to Generate Secrets

```bash
# Admin Password Hash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('YourPassword').digest('hex'));"

# JWT Secret (128 hex characters)
openssl rand -hex 64
```

---

## ✨ Features

### 1. Avatar Gallery

- **639 Avatars**: Complete database with 4-digit IDs (0001-0639)
- **Search**: By nickname, avatar name, attributes
- **Filtering**: By attributes (e.g., アンドロイド, ケモ, etc.)
- **Detail View**: Modal with full information
- **SSG + ISR**: Static generation with 1-hour revalidation
- **Responsive**: Mobile-first design

### 2. AI Chatbot (RAG)

- **Natural Language Queries**: Ask questions in Japanese or English
- **Vector Search**: BGE-M3 embeddings (1024 dimensions)
- **Reranking**: Cohere Rerank v3 for relevance scoring
- **Streaming Response**: Gemini 2.5 Flash with streaming
- **Source Citations**: Shows which avatars were referenced
- **Context-Aware**: Uses retrieved avatar data for accurate answers

Example queries:
- "アンドロイドっぽい暁を教えて"
- "Tell me about kemono avatars"
- "ピンク色の暁はありますか？"

### 3. Admin Panel

**Access**: `/admin` (requires authentication)

#### Features:
- ✅ **JWT Authentication**: Secure session management
- ✅ **Add Avatar**: 
  - Auto ID numbering (fetches next available ID)
  - Image cropping (400x400px)
  - VRChat integration (fetch avatar info from VRChat)
  - Duplicate checking (nickname, avatar name)
- ✅ **Edit Avatar**:
  - Update all fields
  - Re-crop images
  - Delete avatars
- ✅ **Attribute Management**:
  - Add new attributes
  - Edit existing attributes
  - Unicode normalization (NFC) for duplicate checking
- ✅ **Tools**:
  - CSV export
  - Data migration
  - Bulk operations

#### Security:
- 🔒 Timing-safe password comparison (prevents timing attacks)
- 🔒 HTTP-only cookies for session tokens
- 🔒 JWT expiration (7 days)
- 🔒 CSRF protection
- 🔒 Role-based access control (Owner/Admin)

### 4. PWA (Progressive Web App)

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

### 5. Internationalization (i18n)

#### Supported Languages:
- 🇯🇵 Japanese (ja) - Default
- 🇺🇸 English (en)

#### Detection Priority:
1. **Cookie** (`lang=ja` or `lang=en`)
2. **Cloudflare Header** (`cf-ipcountry`)
3. **Accept-Language Header**
4. **Default**: Japanese

#### Implementation:
- Edge Middleware for language detection
- Client-side language switcher
- Separate CSV files (akyo-data.csv, akyo-data-US.csv)
- Dynamic content loading

---

## 🔌 API Endpoints

### Public APIs

#### `GET /api/chat`
**AI Chatbot endpoint** (Streaming)

**Query Parameters**:
- `message` (string): User query

**Response**: Server-Sent Events (SSE) stream

```typescript
// Example
const response = await fetch('/api/chat?message=アンドロイドの暁を教えて');
const reader = response.body.getReader();
```

#### `GET /api/avatar-image`
**Avatar image proxy**

**Query Parameters**:
- `id` (string): Avatar ID (e.g., "0001")

**Response**: Image binary

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

### Admin APIs (Authentication Required)

#### `POST /api/admin/login`
**Admin login**

**Body**:
```json
{
  "password": "YourPassword",
  "role": "admin" | "owner"
}
```

**Response**:
```json
{
  "success": true,
  "role": "admin"
}
```

**Sets HTTP-only cookie**: `admin_session`

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
- `id`: Avatar ID
- `appearance`: Appearance date
- `nickname`: Nickname
- `avatarName`: Avatar name
- `attributes`: Comma-separated attributes
- `notes`: Notes
- `creator`: Creator name
- `avatarUrl`: VRChat avatar URL
- `image`: Image file (optional)

#### `POST /api/update-akyo`
**Update existing avatar**

**Body** (FormData): Same as upload-akyo

#### `POST /api/delete-akyo`
**Delete avatar**

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

// Decode HTML entities
export function decodeHTMLEntities(text: string): string {
  // Handles &amp;, &lt;, &gt;, &quot;, &#39;, numeric entities
  // ...
}
```

#### 3. Input Validation
**File**: `src/app/api/vrc-avatar-info/route.ts`

```typescript
// Length-limited regex (prevents ReDoS)
const avtrMatch = avtr.match(/^avtr_[A-Za-z0-9-]{1,50}$/);
if (!avtrMatch) {
  return Response.json({ error: 'Invalid avtr format' }, { status: 400 });
}
```

#### 4. Path Traversal Prevention
**File**: `src/components/akyo-chatbot.tsx`

```typescript
// Strict source ID validation
const sourceIdMatch = sourceId.match(/^akyo-\d{4}$/);
if (!sourceIdMatch) {
  console.warn(`Invalid source ID: ${sourceId}`);
  return null;
}
```

#### 5. Session Management
**File**: `src/lib/session.ts`

```typescript
// JWT with HTTP-only cookies
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set('admin_session', token, {
    httpOnly: true,      // Prevent XSS
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}
```

### Security Best Practices

✅ **Passwords**: SHA-256 hashed, never stored in plaintext
✅ **Sessions**: JWT with HTTP-only cookies
✅ **API Keys**: Environment variables only (never in code)
✅ **Input**: Validated with length-limited regex
✅ **HTML**: Sanitized with `sanitize-html` library
✅ **Timing Attacks**: Constant-time comparison for passwords
✅ **CSRF**: SameSite=Strict cookies
✅ **XSS**: HTML entity decoding + tag stripping

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails on Cloudflare Pages

**Error**: `npm error enoent Could not read package.json`

**Solution**: Set **Root directory** to `akyodex-nextjs` in build settings.

```yaml
Root directory (advanced): akyodex-nextjs
```

#### 2. Vectorize Upload Fails

**Error**: `Worker exceeded CPU time limit`

**Solution**: Split NDJSON file into smaller batches (< 100 vectors per batch).

```bash
# Edit scripts/upload-to-vectorize.mjs
const BATCH_SIZE = 50; // Reduce from 100
```

#### 3. Chatbot Returns Empty Response

**Possible Causes**:
1. Missing API keys (GEMINI_API_KEY, COHERE_API_KEY)
2. Vectorize index not created
3. No embeddings uploaded

**Solution**:
```bash
# Check Vectorize index
npx wrangler vectorize list

# Re-upload embeddings
node scripts/prepare-vectorize-data.mjs
node scripts/upload-to-vectorize.mjs
```

#### 4. Admin Login Fails

**Possible Causes**:
1. Wrong password hash
2. Missing JWT_SECRET
3. Cookie not set (check browser)

**Solution**:
```bash
# Regenerate password hash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('YourPassword').digest('hex'));"

# Check environment variables in Cloudflare Pages
```

#### 5. Images Not Loading

**Possible Causes**:
1. R2 bucket not created
2. Binding name mismatch
3. CSV file path incorrect

**Solution**:
```bash
# Check R2 bucket
npx wrangler r2 bucket list

# Re-upload CSV files
npx wrangler r2 object put akyo-data/data/akyo-data.csv --file=../data/akyo-data.csv
```

#### 6. PWA Not Installing

**Possible Causes**:
1. Service Worker not registered
2. HTTPS not enabled (required for PWA)
3. Manifest.json issues

**Solution**:
1. Check browser console for SW errors
2. Ensure HTTPS is enabled (Cloudflare Pages auto-enables)
3. Verify manifest.json is accessible at `/manifest.json`

---

## 📜 Migration History

### Phase 1: Initial Next.js Setup (Completed 2025-01-15)
- ✅ Next.js 15.5.6 project setup
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
- ✅ Language switcher component

### Phase 4: Admin Panel (Completed 2025-02-01)
- ✅ JWT authentication
- ✅ Admin dashboard with tabs
- ✅ CRUD operations for avatars
- ✅ Image cropping functionality
- ✅ VRChat integration

### Phase 5: AI Chatbot (Completed 2025-02-10)
- ✅ RAG implementation (BGE-M3 + Vectorize + Cohere + Gemini)
- ✅ Streaming responses
- ✅ Source citations
- ✅ Error handling and timeouts

### Phase 6: PWA (Completed 2025-02-15)
- ✅ Service Worker with 6 caching strategies
- ✅ Offline support
- ✅ PWA manifest
- ✅ Install prompt

### Phase 7: Security Hardening (Completed 2025-10-22)
- ✅ Timing attack prevention (PR #113)
- ✅ XSS prevention with sanitize-html (PR #113)
- ✅ Input validation improvements (PR #113)
- ✅ HTML entity decoding (PR #113)
- ✅ Session management hardening (PR #113)

### Phase 8: Code Quality (In Progress)
- 📝 Issue #115 created (8 refactoring tasks)
- ⏳ VRChat page fetch logic extraction
- ⏳ CSV header validation improvement
- ⏳ Unicode normalization for attributes
- ⏳ Code duplication removal

---

## ⚠️ Known Issues

### Open Issues

#### Issue #115: Code Quality Improvements
**Priority**: Medium  
**Status**: Open  
**Created**: 2025-10-22

8 refactoring tasks from CodeRabbit review:

1. **High Priority** (Code Duplication):
   - [ ] Extract VRChat page fetch logic to common utility
   - [ ] Refactor duplicate code in add-tab.tsx
   - [ ] Remove duplication in middleware.ts

2. **Medium Priority** (Data Integrity):
   - [ ] Fix CSV header validation in migrate-csv-to-4digit.mjs
   - [ ] Add Unicode normalization to attribute-modal.tsx
   - [ ] Remove "- VRChat" suffix in vrc-avatar-info.ts

3. **Low Priority** (Logging & Grammar):
   - [ ] Add logging to migration script
   - [ ] Fix grammar in DEPLOYMENT.md line 15

**Link**: https://github.com/rad-vrc/Akyodex/issues/115

### Closed Issues

#### PR #113: Complete Migration ✅
**Status**: Merged (2025-10-22)  
**Link**: https://github.com/rad-vrc/Akyodex/pull/113

- ✅ Next.js 15 migration
- ✅ PWA implementation
- ✅ AI Chatbot
- ✅ Security hardening
- ✅ Language detection
- ✅ Admin panel
- ✅ All CodeRabbit/Copilot/CodeQL critical issues resolved

#### PR #114: Duplicate PR ❌
**Status**: Should be closed  
**Link**: https://github.com/rad-vrc/Akyodex/pull/114

- ⚠️ Contains same changes as PR #113
- ⚠️ Has merge conflicts
- ⚠️ Should be closed to avoid confusion

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

# 5. After PR review, squash commits before merge
git reset --soft HEAD~N  # N = number of commits
git commit -m "feat: comprehensive commit message"
git push -f origin feature/your-feature-name
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
- **Formatting**: Prettier (2-space indent)
- **Linting**: ESLint with Next.js config
- **Components**: Functional components with TypeScript
- **Naming**: PascalCase for components, camelCase for functions

### Before PR

1. ✅ Run `npm run lint`
2. ✅ Run `npm run type-check`
3. ✅ Test locally with `npm run dev`
4. ✅ Test Cloudflare build with `npm run pages:build`
5. ✅ Squash commits into one comprehensive commit
6. ✅ Write descriptive PR description

---

## 📚 Additional Documentation

- **Deployment Guide**: See `DEPLOYMENT.md`
- **Chatbot Setup**: See `CHATBOT_SETUP.md`
- **Migration Comparison**: See `MIGRATION_COMPARISON.md`

---

## 📞 Support

For questions or issues:
1. Check this README
2. Check existing issues: https://github.com/rad-vrc/Akyodex/issues
3. Create new issue with detailed description

---

## 📄 License

[MIT License](../LICENSE) - See LICENSE file for details

---

## 🎉 Acknowledgments

- **Next.js Team**: For the amazing framework
- **Cloudflare**: For Workers AI, Vectorize, and Pages platform
- **Google**: For Gemini 2.5 Flash API
- **Cohere**: For Rerank v3 API
- **VRChat**: For avatar data and API
- **暁 Community**: For the avatar designs and support

---

**Last Updated**: 2025-10-22  
**Version**: 1.0.0 (Next.js 15 Migration Complete)  
**Status**: ✅ Production Ready

---

## 🚨 CRITICAL NOTES FOR NEXT SESSION

### Cloudflare Pages Build Configuration

**⚠️ IMPORTANT**: The build is currently failing because the root directory is not set correctly.

**Current Error**:
```
npm error path /opt/buildhome/repo/package.json
npm error errno -2
npm error enoent Could not read package.json
```

**Root Cause**: Cloudflare Pages is looking for `package.json` in the repository root (`/opt/buildhome/repo/`), but it's actually in `/opt/buildhome/repo/akyodex-nextjs/`.

**FIX REQUIRED**:
1. Go to Cloudflare Pages Dashboard
2. Select the Akyodex project
3. Go to **Settings** → **Builds & deployments**
4. Click **Configure Production deployments**
5. Set the following:

```yaml
Framework preset: None (or Next.js)
Build command: npm ci && npm run pages:build
Build output directory: .vercel/output/static
Root directory (advanced): akyodex-nextjs  ← THIS IS CRITICAL!
```

6. **Save** and retry deployment

### Environment Variables Checklist

Ensure these are set in Cloudflare Pages:

```bash
# Admin Authentication
ADMIN_PASSWORD_HASH=e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313
OWNER_PASSWORD_HASH=(set this to your owner password hash)

# JWT Secret
JWT_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# AI API Keys
GEMINI_API_KEY=(set this to your Gemini API key)
COHERE_API_KEY=(set this to your Cohere API key)
```

### Cloudflare Bindings Checklist

Ensure these are configured in **Settings** → **Functions**:

1. **R2 Bucket**: `AKYO_BUCKET` → `akyo-data`
2. **KV Namespace**: `AKYO_KV` → (your KV namespace ID)
3. **Vectorize Index**: `AKYO_VECTORIZE` → `akyo-encyclopedia`

### Current Branch Status

- **main**: ✅ Up to date with PR #113 merged
- **genspark_ai_developer**: ✅ Already merged into main
- **feature/chatbot** (PR #114): ⚠️ Should be closed (duplicate of PR #113)

### Pending Tasks

1. **URGENT**: Fix Cloudflare Pages build configuration (set root directory)
2. **HIGH**: Close PR #114 (duplicate)
3. **MEDIUM**: Address Issue #115 (8 refactoring tasks) - can be done later
4. **LOW**: Test deployment after build fix

### Quick Start Commands for Next Session

```bash
# Navigate to project
cd /home/user/webapp/akyodex-nextjs

# Check current branch
git branch --show-current

# Pull latest changes
git checkout main
git pull origin main

# Check build locally
npm run pages:build

# Deploy (after fixing Cloudflare Pages settings)
npm run pages:deploy
```

### Admin Credentials (Development Only)

**DO NOT USE IN PRODUCTION**

- **Password**: `Akyo-Admin-95cea4f6a6e348da5cec1fc31ef23ba2`
- **Hash**: `e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313`

Generate new production password with:
```bash
node -e "const crypto = require('crypto'); const password = 'YourSecurePassword'; console.log('Password:', password); console.log('Hash:', crypto.createHash('sha256').update(password).digest('hex'));"
```

---

**END OF README** - All information documented for seamless session recovery 🎯
