# Complete Migration Plan: Next.js App to Root Directory

## Current Situation
- **Old static site** in `/home/user/webapp/` (3.7 MB excluding Next.js)
- **New Next.js app** in `/home/user/webapp/akyodex-nextjs/` (2.0 GB with node_modules)
- **Goal**: Move Next.js app to root, preserve documentation/backups, remove old site

## Dependency Analysis Results

### ✅ No Code Dependencies
- Old HTML files (index.html, admin.html, finder.html) are **NOT referenced** by Next.js code
- Only found in **comments** - safe to delete
- Old `functions/` API routes replaced by Next.js API routes in `src/app/api/`

### 📁 Files That Need Action

#### 1. **Missing Images** (Need to copy to Next.js)
```
/images/logo-US.webp          → Copy to public/images/
/images/profileIcon.webp      → Copy to public/images/
/images/manifest.json         → Copy to public/ (root)
/images/akyogallery.webp      → Archive (not referenced)
```

#### 2. **Documentation to Preserve**
```
/CLAUDE.md                    → Keep (update paths after migration)
/README.md                    → Keep (update if needed)
/docs/                        → Keep entire directory (20 KB)
  - cloudflare-tunnel-dify.md
  - seo-analysis.md
```

#### 3. **Data Backups to Preserve**
```
/data/akyo-avatar-map.js                         → Archive
/data/akyo-data.csv.backup-2025-10-22T07-15-47   → Archive
/data/akyo-data-US.csv.backup-2025-10-22T07-15-48 → Archive
```
**Note**: Current CSVs already exist in `akyodex-nextjs/data/`

#### 4. **Development Tools to Archive**
```
/scripts/                     → Archive (12 KB)
  - migrate-csv-to-4digit.mjs
/tools/                       → Archive (16 KB)
  - bump-kid-friendly-version.mjs
  - generate-avatar-map.mjs
  - make-favicons.ps1
```
**Note**: Next.js has its own `/scripts/` with `prepare-cloudflare-pages.js`

#### 5. **Old Site Files to DELETE**
```
/index.html, /admin.html, /finder.html  → DELETE
/css/                                    → DELETE (28 KB old styles)
/js/                                     → DELETE (340 KB old scripts)
/functions/                              → DELETE (84 KB old Cloudflare Functions)
```

### 📊 Size Impact
- **Total to delete**: ~452 KB (css + js + functions + HTML)
- **Total to archive**: ~48 KB (scripts + tools)
- **Total to preserve**: ~444 KB (docs + data backups)
- **Net result**: Cleaner root with only Next.js app

---

## Migration Strategy

### Phase 1: Pre-Migration Preparation ✅ SAFE
1. **Create archive directory** for old files
2. **Copy missing images** to Next.js public/
3. **Verify** all images load correctly in Next.js

### Phase 2: Archive & Preserve 🔐 SAFE
4. **Create `/home/user/webapp/archive/`** directory
5. **Move to archive**:
   - scripts/
   - tools/
   - data/akyo-avatar-map.js
   - data/*.backup files
6. **Keep at root** (will move after Next.js migration):
   - CLAUDE.md
   - README.md
   - docs/

### Phase 3: Delete Old Site 🗑️ DESTRUCTIVE
7. **Delete old static site**:
   - index.html, admin.html, finder.html
   - css/
   - js/
   - functions/
   - images/ (after copying missing files)

### Phase 4: Move Next.js to Root 🚀 MAJOR CHANGE
8. **Move all files** from `akyodex-nextjs/*` to `/home/user/webapp/`
9. **Remove empty** `akyodex-nextjs/` directory
10. **Update paths** in documentation (CLAUDE.md)

### Phase 5: Verification ✅ CRITICAL
11. **Test build**: `npm run build` in new root location
12. **Verify deployment**: Check all paths work correctly
13. **Test functionality**: Admin login, image loading, API routes

---

## Detailed File Operations

### Step-by-Step Commands

#### Phase 1: Copy Missing Images
```bash
cd /home/user/webapp
cp images/logo-US.webp akyodex-nextjs/public/images/
cp images/profileIcon.webp akyodex-nextjs/public/images/
cp images/manifest.json akyodex-nextjs/public/
```

#### Phase 2: Create Archive
```bash
cd /home/user/webapp
mkdir -p archive/old-site
mv scripts/ archive/old-site/
mv tools/ archive/old-site/
mv data/akyo-avatar-map.js archive/old-site/
mv data/*.backup-* archive/old-site/
```

#### Phase 3: Delete Old Site
```bash
cd /home/user/webapp
rm -f index.html admin.html finder.html
rm -rf css/ js/ functions/ images/
```

#### Phase 4: Move Next.js to Root
```bash
cd /home/user/webapp
# Move all files from akyodex-nextjs to root
shopt -s dotglob  # Include hidden files
mv akyodex-nextjs/* .
mv akyodex-nextjs/.* . 2>/dev/null || true
rmdir akyodex-nextjs/
```

#### Phase 5: Update Documentation
Update CLAUDE.md to reflect new structure:
- Remove references to `/akyodex-nextjs/` paths
- Update build commands
- Update deployment instructions

---

## Risk Assessment

### 🟢 Low Risk (Phase 1-2)
- Copying images: **Reversible**
- Creating archive: **Reversible**
- No files deleted yet

### 🟡 Medium Risk (Phase 3)
- Deleting old site: **Irreversible** but files are unused
- Recommendation: Test Phase 1-2 first, then commit before Phase 3

### 🔴 High Risk (Phase 4)
- Moving Next.js to root: **Major change**
- Recommendation: Commit after Phase 3, test thoroughly after Phase 4

---

## Rollback Plan

### If Migration Fails:
1. **Before Phase 3**: Just delete copied images and archive folder
2. **After Phase 3**: Restore from git: `git checkout HEAD -- css/ js/ functions/ images/`
3. **After Phase 4**: Recreate `akyodex-nextjs/` and move files back

### Git Strategy:
```bash
# After Phase 2
git add -A
git commit -m "chore: archive old site files before migration"

# After Phase 3
git add -A
git commit -m "chore: remove old static site files"

# After Phase 4
git add -A
git commit -m "feat: migrate Next.js app to root directory"

# If rollback needed
git revert HEAD    # or HEAD~2 to revert multiple commits
```

---

## Post-Migration Checklist

### Files to Update:
- [ ] `/CLAUDE.md` - Update all paths
- [ ] `/README.md` - Update project structure section
- [ ] `/wrangler.toml` - Verify `pages_build_output_dir` is still correct
- [ ] `.github/workflows/*` - Update any CI/CD paths

### Cloudflare Pages Configuration:
- [ ] Build command: `npm run build`
- [ ] Build output directory: `.open-next`
- [ ] Root directory: **(leave empty)** ✅ This is the goal!
- [ ] Environment variables:
  - `ADMIN_PASSWORD_OWNER = RadAkyo`
  - `ADMIN_PASSWORD_ADMIN = Akyo`

### Testing:
- [ ] Local build: `npm run build`
- [ ] Deploy to test branch first
- [ ] Test admin login with environment variables
- [ ] Test image loading from R2
- [ ] Test all API routes
- [ ] Test language switching
- [ ] Test Dify chatbot
- [ ] Verify virtual scrolling performance

---

## Estimated Timeline

1. **Phase 1**: 5 minutes (copy images, verify)
2. **Phase 2**: 5 minutes (create archive)
3. **Commit & Test**: 10 minutes
4. **Phase 3**: 2 minutes (delete old files)
5. **Commit**: 2 minutes
6. **Phase 4**: 5 minutes (move Next.js to root)
7. **Update docs**: 10 minutes
8. **Phase 5**: 20 minutes (test build & verify)
9. **Final commit**: 5 minutes

**Total**: ~65 minutes

---

## Next Steps

**Recommendation**: Execute phases incrementally with commits between each major step.

**Question for User**: 
1. Should we proceed with Phase 1-2 (safe operations)?
2. Or execute all phases at once after review?
3. Any specific files you want to keep that aren't listed?

**Current Branch**: `cloudflare-opennext-test`
**After successful migration**: Merge to `main`
