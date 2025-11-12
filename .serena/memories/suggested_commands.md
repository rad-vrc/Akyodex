# Suggested Commands for Akyodex Development

## Development Commands

### Start Development Server
```bash
npm run dev
# Starts Next.js dev server with Turbopack at localhost:3000
# Hot reload enabled
```

### Build Commands
```bash
# Standard Next.js build (for Vercel)
npm run next:build

# Cloudflare Pages build (production)
npm run build
# Runs: opennextjs-cloudflare build + prepare-cloudflare-pages.js

# Start production server locally
npm start
```

### Cloudflare Pages Commands
```bash
# Local Cloudflare Pages dev server
npm run pages:dev

# Deploy to Cloudflare Pages
npm run pages:deploy
```

## Testing Commands

### Run All Tests
```bash
# Run Playwright E2E tests
npm run test
# or
npm run test:playwright

# Run with UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# CSV quality check
npm run test:csv
```

## Code Quality Commands

### Linting & Type Checking
```bash
# Run ESLint
npm run lint

# TypeScript type check (no output)
npx tsc --noEmit

# Dead code detection
npm run knip
```

## Data Management Commands

### CSV Migration
```bash
# Migrate CSV to 4-digit IDs
node scripts/migrate-csv-to-4digit.mjs
```

## Windows-Specific Commands

### File Operations
```cmd
# List files
dir

# Remove file
del file.txt

# Remove directory
rmdir /s /q dirname

# Copy file
copy source.txt destination.txt

# Create directory
mkdir dirname

# View file content
type file.txt

# Command separator (use & instead of &&)
command1 & command2
```

### Git Commands
```bash
# Check current branch
git branch --show-current

# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: description"

# Push to remote
git push origin feature/your-feature-name
```

## Cloudflare Wrangler Commands

### R2 Bucket Management
```bash
# List buckets
npx wrangler r2 bucket list

# Create bucket
npx wrangler r2 bucket create akyo-data

# Upload file to R2
npx wrangler r2 object put akyo-data/data/akyo-data.csv --file=data/akyo-data.csv

# List objects in bucket
npx wrangler r2 object list akyo-data
```

### KV Namespace Management
```bash
# List KV namespaces
npx wrangler kv:namespace list

# Create KV namespace
npx wrangler kv:namespace create "AKYO_KV"
```

## Useful URLs

### Local Development
- Gallery: http://localhost:3000/zukan
- Admin Panel: http://localhost:3000/admin
- API Health: http://localhost:3000/api/health

### Production
- Gallery: https://akyodex.com/zukan
- Admin Panel: https://akyodex.com/admin

## Quick Troubleshooting

### Build Fails
```bash
# Clean install
del /s /q node_modules
del package-lock.json
npm install
npm run build
```

### Type Errors
```bash
# Check TypeScript errors
npx tsc --noEmit
```

### Test Failures
```bash
# Run specific test file
npx playwright test tests/authentication.spec.ts

# Debug mode
npx playwright test --debug
```
