# Performance Notes (`/zukan`)

## Current Snapshot (2026-02-22)
- Baseline restored after regression.
- Mobile PageSpeed: **87** (target 85+ achieved)
- Desktop PageSpeed: **90+** (recovered from temporary drop)

Reference run:
- `https://pagespeed.web.dev/analysis/https-a04a5961-akyodex-pages-dev-zukan/k3mexfy5v3?hl=ja&form_factor=mobile`

## Included Changes

### 1) LCP render delay fix (critical)
- File: `src/app/zukan/page.tsx`
- Removed `Suspense` wrapper around `ZukanClient` and direct-returned the component.
- Reason: fallback-first rendering delayed real LCP element paint (logo/content), causing major score drop.

### 2) Mobile logo payload optimization
- Files:
  - `public/images/logo-mobile.webp`
  - `public/images/logo-US-mobile.webp`
  - `public/images/logo-KO-mobile.webp`
  - `src/app/zukan/zukan-client.tsx`
- Switched header logo to lighter mobile assets and corrected `Image` dimensions/sizes.

### 3) Global CSS trimming
- File: `src/app/globals.css`
- Removed unused legacy animation/style blocks to reduce CSS parse and style work.

### 4) Runtime font loading simplification
- File: `src/app/layout.tsx`
- Removed `next/font/google` runtime usage for `M_PLUS_Rounded_1c` in layout path.
- Kept CSS fallback font variables for consistent rendering.

### 5) `_next/image` cache header
- File: `next.config.ts`
- Added cache policy for `/_next/image` route:
  - `public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`

## Regression Trigger To Avoid
- Do **not** wrap the entire `/zukan` main content in `Suspense` fallback that renders a full skeleton before real content.
- This can inflate `Element render delay` and heavily hurt LCP even if network metrics are good.

## Quick Validation Checklist
1. Confirm deployed commit hash matches branch head before evaluating.
2. Measure both desktop and mobile on `/zukan`.
3. Check LCP element in report:
   - Should be real header/logo content, not delayed by fallback transitions.
4. If score drops unexpectedly, first inspect recent changes around:
   - `src/app/zukan/page.tsx`
   - `src/app/zukan/zukan-client.tsx`
   - `src/app/globals.css`

## Safe Rollback Points
- `44634ba`: remove suspense fallback to reduce LCP render delay
- `9b6b147`: mobile logo + CSS/font/cache optimization bundle

