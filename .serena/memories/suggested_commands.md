# Suggested Commands

## Development
```bash
# Start Next.js dev server (with Turbopack)
npm run dev

# Start local Cloudflare Pages dev server
npm run pages:dev
```

## Build & Deploy
```bash
# Build for Vercel (standard Next.js)
npm run build

# Build for Cloudflare Pages
npm run pages:build

# Deploy to Cloudflare Pages
npm run pages:deploy
```

## Testing
```bash
# Run unit tests (Vitest)
npm test

# Run E2E tests (Playwright)
npm run test:playwright

# Run Playwright with UI
npm run test:ui

# Run Playwright in headed mode
npm run test:headed
```

## Code Quality
```bash
# Run ESLint
npm run lint

# Detect unused code (knip)
npm run knip

# Type check (no emit)
npx tsc --noEmit
```

## Data Management
```bash
# Generate Vectorize embeddings (NDJSON)
node scripts/prepare-vectorize-data.mjs

# Upload embeddings to Vectorize
node scripts/upload-to-vectorize.mjs

# Migrate CSV to 4-digit IDs
node scripts/migrate-csv-to-4digit.mjs
```

## Windows System Commands
```powershell
# List files
dir
Get-ChildItem

# Find files
Get-ChildItem -Recurse -Filter "*.tsx"

# Search in files
Select-String -Path "*.ts" -Pattern "pattern"

# Git operations
git status
git log --oneline
git diff
```

## Local Testing URLs
- Gallery: http://localhost:3000/zukan
- Admin: http://localhost:3000/admin
- API: http://localhost:3000/api/*
