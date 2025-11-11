# Tech Stack & Build System

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router, React 19.1.0)
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript 5.x
- **Runtime**: Cloudflare Pages (Edge Runtime)

### Backend
- **Adapter**: @opennextjs/cloudflare 1.11.0
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Security**: sanitize-html 2.17.0, crypto.timingSafeEqual()
- **CSV Processing**: csv-parse 6.1.0, csv-stringify 6.6.0

### External Services
- **Chatbot**: Dify embedded chatbot widget

### Infrastructure
- **Hosting**: Cloudflare Pages
- **Storage**: R2 (images/CSV), KV (sessions)
- **CDN**: Cloudflare Edge Network

## Build System

### Package Manager
- **npm** 10.x (required)
- **Node.js** 20.x (required)

### Common Commands

#### Development
```bash
# Start Next.js dev server (akyodex-nextjs/)
npm run dev

# Start with Turbopack (faster)
npm run dev --turbopack

# Local Cloudflare Pages dev server
npm run pages:dev
```

#### Build & Deploy
```bash
# Build for Vercel (standard Next.js)
npm run build

# Build for Cloudflare Pages
npm run pages:build

# Deploy to Cloudflare Pages
npm run pages:deploy
```

#### Code Quality
```bash
# Run ESLint
npm run lint

# Type check (no emit)
npx tsc --noEmit
```

#### Data Management
```bash
# Migrate CSV to 4-digit IDs
node scripts/migrate-csv-to-4digit.mjs
```

## Configuration Files

### Next.js Config (`next.config.ts`)
- Image optimization: `unoptimized: true` (Cloudflare R2)
- Security headers: HSTS, CSP, X-Frame-Options
- Remote patterns: images.akyodex.com, *.vrchat.com

### Cloudflare Config (`wrangler.toml`)
- KV binding: `AKYO_KV`
- R2 binding: `AKYO_BUCKET`

### TypeScript Config (`tsconfig.json`)
- Target: ES2017
- Module: esnext (bundler resolution)
- Path alias: `@/*` → `./src/*`
- Strict mode enabled

## Environment Variables

### Required (Production)
```bash
ADMIN_PASSWORD_HASH=<sha256_hash>
OWNER_PASSWORD_HASH=<sha256_hash>
JWT_SECRET=<128_hex_chars>
```

### Development (`.dev.vars`)
```bash
# Default admin password: Akyo-Admin-95cea4f6a6e348da5cec1fc31ef23ba2
ADMIN_PASSWORD_HASH=e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313
OWNER_PASSWORD_HASH=e5df0cec59ac2279226f7ea28c1ded885b61c3afe1177fcd282f211965bd3313
JWT_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf
```

## Testing & Verification

### Local Testing
```bash
# Test Next.js build
npm run build && npm start

# Test Cloudflare Pages build
npm run pages:build
npx wrangler pages dev .vercel/output/static
```

### Production Verification
- Gallery: https://akyodex.com/zukan
- Admin: https://akyodex.com/admin
- API Health: https://akyodex.com/api/health

## Performance Optimization

### Build Optimization
- Turbopack enabled for faster dev builds
- Static generation (SSG) for gallery pages
- Incremental Static Regeneration (ISR): 1 hour

### Runtime Optimization
- Edge Runtime for low latency
- Service Worker with 6 caching strategies
- Image lazy loading with IntersectionObserver
- Virtual scrolling for large lists

## Security Practices

### Authentication
- SHA-256 password hashing
- Timing-safe comparison (crypto.timingSafeEqual)
- HTTP-only cookies for JWT
- 7-day session expiration

### Input Validation
- HTML sanitization (sanitize-html)
- URL validation (URL constructor)
- CSV parsing with error handling
- Length-limited regex patterns

### Headers
- HSTS: max-age=63072000
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy: origin-when-cross-origin
