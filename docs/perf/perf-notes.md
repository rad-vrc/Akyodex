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

---

## Update (2026-03-03) — PR #315 / #316

### Mobile Performance & UI Optimizations

#### 1) Unified responsive layout hook

- File: `src/app/zukan/zukan-client.tsx`
- Consolidated window resize listeners into `useResponsiveLayout` with debounce.
- Computes `isMobile` and `gridCols` in one pass; `renderLimit` is updated by a separate `useEffect` that resets on filter/device changes.
- SSR: initializes `renderLimit` to desktop value to avoid CLS.

#### 2) Mobile animation disabling

- File: `src/app/zukan/zukan-client.tsx`
- Heavy mini-akyo background animations are now skipped on mobile.
- Reduces TBT and overall main-thread work.

#### 3) Card button restyling (mobile)

- File: `src/components/akyo-card.tsx`
- VRChat and reference sheet buttons rescaled and repositioned for mobile.
- Reference button uses photo icon with "DL" label on mobile.
- Avatar ID now displayed above nickname near the card title.

#### 4) Non-critical CSS deferral

- File: `src/app/globals.css`
- Admin and chatbot styles deferred from zukan critical path.
- Reduces initial CSS parsing cost on mobile.

#### 5) Content-visibility restoration (desktop)

- Desktop cards use `content-visibility: auto` to reduce off-screen rendering.
- Mobile cards do not use `content-visibility` (dropped after testing showed no benefit).

### Regression Notes
- Do **not** re-add `content-visibility` to mobile cards — it showed no improvement.
- Keep SSR `renderLimit` initialized to desktop limit to prevent CLS.
