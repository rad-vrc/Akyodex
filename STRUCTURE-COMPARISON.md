# Directory Structure Comparison

## ❌ CURRENT Structure (Messy)

```
/home/user/webapp/
├── 📁 akyodex-nextjs/          ← Next.js app (2.0 GB)
│   ├── src/
│   ├── public/
│   │   └── images/             ← Missing: logo-US.webp, profileIcon.webp, manifest.json
│   ├── data/
│   ├── scripts/
│   ├── package.json
│   ├── next.config.ts
│   ├── open-next.config.ts
│   ├── wrangler.toml
│   └── ... (Next.js files)
│
├── 🗑️ OLD STATIC SITE (Unused):
│   ├── index.html              ← DELETE
│   ├── admin.html              ← DELETE
│   ├── finder.html             ← DELETE
│   ├── css/                    ← DELETE (28 KB)
│   ├── js/                     ← DELETE (340 KB)
│   ├── functions/              ← DELETE (84 KB, replaced by Next.js API)
│   └── images/                 ← DELETE after copying missing files
│
├── 📦 ARCHIVE (Keep for reference):
│   ├── scripts/                ← Old migration scripts (12 KB)
│   ├── tools/                  ← Old build tools (16 KB)
│   └── data/
│       ├── akyo-avatar-map.js
│       └── *.backup files
│
└── 📚 DOCUMENTATION (Keep):
    ├── CLAUDE.md
    ├── README.md
    └── docs/
        ├── cloudflare-tunnel-dify.md
        └── seo-analysis.md
```

**Problems**:
- ❌ Nested structure requires "Root directory: akyodex-nextjs" in Cloudflare Pages
- ❌ Confusing mix of old and new code
- ❌ Missing images in Next.js public/
- ❌ Documentation paths become invalid after merge

---

## ✅ TARGET Structure (Clean)

```
/home/user/webapp/
├── 🚀 NEXT.JS APP (Root level):
│   ├── src/
│   ├── public/
│   │   ├── images/             ← ✅ All images present
│   │   │   ├── logo-US.webp    ← ✅ Copied from old site
│   │   │   ├── profileIcon.webp← ✅ Copied from old site
│   │   │   └── ... (all images)
│   │   └── manifest.json       ← ✅ Copied from old site
│   ├── data/
│   │   ├── akyo-data.csv
│   │   └── akyo-data-US.csv
│   ├── scripts/
│   │   └── prepare-cloudflare-pages.js
│   ├── package.json
│   ├── next.config.ts
│   ├── open-next.config.ts
│   ├── wrangler.toml
│   └── ... (all Next.js files)
│
├── 📦 ARCHIVE (Preserved for reference):
│   └── old-site/
│       ├── scripts/
│       ├── tools/
│       └── data/
│           ├── akyo-avatar-map.js
│           └── *.backup files
│
└── 📚 DOCUMENTATION (Preserved, paths updated):
    ├── CLAUDE.md               ← ✅ Updated paths
    ├── README.md               ← ✅ Updated if needed
    ├── MIGRATION-PLAN.md       ← ✅ This file
    ├── STRUCTURE-COMPARISON.md ← ✅ This file
    └── docs/
        ├── cloudflare-tunnel-dify.md
        └── seo-analysis.md
```

**Benefits**:
- ✅ Clean root structure
- ✅ **Cloudflare Pages "Root directory: (empty)"** ← Goal achieved!
- ✅ All images present
- ✅ Old code removed
- ✅ Documentation preserved with updated paths

---

## File Movement Summary

### ➡️ COPY (Phase 1)
```bash
/images/logo-US.webp       → /public/images/logo-US.webp
/images/profileIcon.webp   → /public/images/profileIcon.webp
/images/manifest.json      → /public/manifest.json
```

### 📦 ARCHIVE (Phase 2)
```bash
/scripts/                  → /archive/old-site/scripts/
/tools/                    → /archive/old-site/tools/
/data/akyo-avatar-map.js   → /archive/old-site/data/akyo-avatar-map.js
/data/*.backup             → /archive/old-site/data/*.backup
```

### 🗑️ DELETE (Phase 3)
```bash
/index.html
/admin.html
/finder.html
/css/
/js/
/functions/
/images/          ← After copying missing files
```

### 🚀 MOVE (Phase 4)
```bash
/akyodex-nextjs/*          → /  (root level)
/akyodex-nextjs/.*         → /  (hidden files)
```

---

## Code Reference Changes

### Before Migration:
```typescript
// In Next.js code, paths work fine because public/ is root
<img src="/images/logo.webp" />  // → /akyodex-nextjs/public/images/logo.webp

// But Cloudflare Pages needs:
// Root directory: akyodex-nextjs
```

### After Migration:
```typescript
// Same code, but simpler Cloudflare config
<img src="/images/logo.webp" />  // → /public/images/logo.webp

// Cloudflare Pages config:
// Root directory: (empty)  ✅
```

**No code changes needed!** Only Cloudflare Pages configuration simplifies.

---

## Verification Steps After Migration

1. **Check all files moved**:
```bash
cd /home/user/webapp
ls -la  # Should show Next.js files at root
ls -la public/images/  # Should include logo-US.webp, profileIcon.webp
ls -la archive/old-site/  # Should contain archived files
```

2. **Test build**:
```bash
cd /home/user/webapp
npm run build
# Should complete without errors
```

3. **Verify paths in code**:
```bash
grep -r "/images/" src/  # All paths should still work
grep -r "akyodex-nextjs" .  # Should find nothing (except docs)
```

4. **Update Cloudflare Pages**:
- Build command: `npm run build`
- Build output directory: `.open-next`
- Root directory: **(delete "akyodex-nextjs", leave empty)**
- Environment variables: Set ADMIN_PASSWORD_OWNER, ADMIN_PASSWORD_ADMIN

5. **Deploy and test**:
- Deploy to cloudflare-opennext-test branch
- Test all functionality
- If successful, merge to main

---

## Risk Mitigation

### Commits Strategy:
```bash
# Checkpoint 1: After Phase 2 (archive created)
git add archive/ akyodex-nextjs/public/images/
git commit -m "chore: archive old site files and copy missing images"

# Checkpoint 2: After Phase 3 (old files deleted)
git add -A
git commit -m "chore: remove old static site files"

# Checkpoint 3: After Phase 4 (migration complete)
git add -A
git commit -m "feat: migrate Next.js app to root directory

- Move all files from akyodex-nextjs/ to root
- Update documentation paths
- Simplify Cloudflare Pages configuration
- Remove nested directory structure"

# If anything breaks:
git revert HEAD    # Revert last commit
git revert HEAD~2  # Revert last 2 commits
```

### Rollback Commands:
```bash
# If migration fails, restore from git
git reset --hard HEAD~1  # Undo last commit
git reset --hard origin/cloudflare-opennext-test  # Reset to remote state
```

---

## Success Criteria

Migration is successful when:
- ✅ `npm run build` completes without errors
- ✅ All images load correctly (including logo-US.webp, profileIcon.webp)
- ✅ Cloudflare Pages deploys with "Root directory: (empty)"
- ✅ Admin login works with environment variables
- ✅ All API routes functional
- ✅ Dify chatbot appears and works
- ✅ Virtual scrolling performs well
- ✅ Language switching instant
- ✅ Documentation updated with correct paths

**Ready to proceed?** 🚀
