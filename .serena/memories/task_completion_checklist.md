# Task Completion Checklist

## Before Committing Code

### 1. Code Quality Checks

```bash
# Run ESLint
npm run lint

# TypeScript type check
npx tsc --noEmit

# Dead code detection
npm run knip
```

**Expected Results**:
- ✅ No ESLint errors
- ✅ No TypeScript errors
- ✅ No unused exports/dependencies

### 2. Local Testing

```bash
# Test development build
npm run dev
# Verify changes at http://localhost:3000

# Test production build
npm run build
npm start
```

**Manual Testing Checklist**:
- ✅ Gallery page loads (`/zukan`)
- ✅ Detail pages work (`/zukan/detail/0001`)
- ✅ Admin panel accessible (`/admin`)
- ✅ No console errors in browser DevTools
- ✅ Responsive design works (mobile/desktop)

### 3. Run Tests

```bash
# Run all Playwright tests
npm run test:playwright

# Run CSV quality check
npm run test:csv
```

**Expected Results**:
- ✅ All E2E tests pass
- ✅ CSV data integrity verified

### 4. Cloudflare Pages Build Test

```bash
# Test Cloudflare Pages build
npm run build

# Verify output directory exists
dir .open-next
```

**Expected Results**:
- ✅ Build completes without errors
- ✅ `.open-next` directory created
- ✅ No missing dependencies

## Git Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Make Changes and Commit

```bash
git add .
git commit -m "feat: description of changes"
```

**Commit Message Convention**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation update
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `test:` - Add/update tests
- `chore:` - Dependencies/config update

### 3. Push to Remote

```bash
git push origin feature/your-feature-name
```

### 4. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your feature branch
4. Fill in PR description:
   - **Purpose**: What does this PR do?
   - **Testing**: What tests were run?
   - **Screenshots**: For UI changes
   - **Environment**: Any new env vars or bindings?
   - **CSV Changes**: If avatar data changed

### 5. Before Merge

```bash
# Squash commits into one comprehensive commit
git reset --soft HEAD~N  # N = number of commits
git commit -m "feat: comprehensive commit message"
git push -f origin feature/your-feature-name
```

## Deployment Checklist

### Cloudflare Pages Configuration

**Verify Settings** → **Builds & deployments**:
- ✅ Framework preset: None
- ✅ Build command: `npm run build`
- ✅ Build output directory: `.open-next`
- ✅ Root directory: `/` (or empty)

### Environment Variables

**Verify Settings** → **Environment variables**:
- ✅ `SESSION_SECRET` (128 hex chars)
- ✅ `ADMIN_PASSWORD_OWNER` (access code)
- ✅ `ADMIN_PASSWORD_ADMIN` (access code)
- ✅ `GITHUB_TOKEN` (if using GitHub integration)
- ✅ `GITHUB_REPO_OWNER` (if using GitHub integration)
- ✅ `GITHUB_REPO_NAME` (if using GitHub integration)

### Cloudflare Bindings

**Verify Settings** → **Functions** → **Bindings**:
- ✅ R2 Bucket: `AKYO_BUCKET` → `akyo-data`
- ✅ KV Namespace: `AKYO_KV` → (your KV namespace)

### Post-Deployment Verification

1. **Build Success**:
   - ✅ Deployment status: Success
   - ✅ No build errors in logs

2. **Functionality Test**:
   - ✅ Landing page loads
   - ✅ Gallery page shows avatars
   - ✅ Detail pages work
   - ✅ Admin login works
   - ✅ Language switcher works
   - ✅ PWA manifest accessible
   - ✅ Service Worker loads

3. **API Test**:
   - ✅ `/api/health` returns 200
   - ✅ Image proxy works
   - ✅ VRChat integration works
   - ✅ Admin CRUD operations work

4. **Performance Check**:
   - ✅ Lighthouse score: 90+ (Performance)
   - ✅ No 5xx errors in logs
   - ✅ Fast page load times

## Security Checklist

### Code Review

- ✅ No hardcoded secrets or passwords
- ✅ Input validation on all user inputs
- ✅ HTML sanitization for user-generated content
- ✅ CSRF protection on state-changing operations
- ✅ Timing-safe comparisons for authentication
- ✅ HTTP-only cookies for sessions
- ✅ Proper error handling (no sensitive info leaks)

### Environment Variables

- ✅ All secrets in environment variables
- ✅ No secrets in `.env.local` committed to Git
- ✅ `.env.local` in `.gitignore`
- ✅ Production secrets different from development

## Documentation Updates

### When to Update Documentation

- ✅ New API endpoint added → Update README API section
- ✅ New environment variable → Update README & DEPLOYMENT.md
- ✅ New Cloudflare binding → Update DEPLOYMENT.md
- ✅ Breaking changes → Update README & create migration guide
- ✅ New feature → Update README Features section
- ✅ Security changes → Update README Security section

### Documentation Files to Check

- `README.md` - Main documentation
- `DEPLOYMENT.md` - Deployment guide
- `AGENTS.md` - Repository guidelines
- `.kiro/steering/*.md` - Steering rules (if applicable)

## Common Issues to Check

### Build Issues

- ✅ All dependencies installed (`npm install`)
- ✅ No TypeScript errors (`npx tsc --noEmit`)
- ✅ No ESLint errors (`npm run lint`)
- ✅ Build output directory correct (`.open-next`)

### Runtime Issues

- ✅ Environment variables set correctly
- ✅ Cloudflare bindings configured
- ✅ R2 bucket exists and accessible
- ✅ KV namespace exists and accessible
- ✅ CSV files uploaded to R2

### Test Issues

- ✅ Dev server running (`npm run dev`)
- ✅ Correct base URL in playwright.config.ts
- ✅ Admin credentials correct in tests
- ✅ Test data available

## Final Checklist

Before marking task as complete:

- [ ] Code quality checks passed
- [ ] Local testing completed
- [ ] All tests passed
- [ ] Cloudflare Pages build tested
- [ ] Git workflow followed
- [ ] PR created with proper description
- [ ] Documentation updated (if needed)
- [ ] Security checklist reviewed
- [ ] Deployment verified (if merged)
