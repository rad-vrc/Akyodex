# Issue 286 Mobile Lighthouse Notes

## Goal
- Keep current features and visual identity.
- Reach Lighthouse mobile performance >= 90 on `/zukan`.
- Avoid regressions in search/filter/detail/favorite/chat features.

## Implemented on 2026-02-20
1. Deferred Dify embed until first real user interaction.
   - File: `src/components/runtime-features.tsx`
   - Activation events: `pointerdown`, `keydown`, `touchstart`, `scroll`.
   - Intent: remove heavy `udify.app` JS/CSS from initial critical path while preserving chat functionality.
2. Reduced initial list render pressure.
   - File: `src/app/zukan/zukan-client.tsx`
   - `INITIAL_RENDER_COUNT`: `60 -> 30`
   - `RENDER_CHUNK`: `60 -> 40`
3. Deferred mini background animation mount.
   - File: `src/app/zukan/zukan-client.tsx`
   - Mount delay: `2500ms`.
4. Stabilized primary avatar image path when Cloudflare Images is disabled.
   - File: `src/components/akyo-card.tsx`
   - Primary source now starts from direct R2 URL instead of API URL.
5. Allowed direct R2 root paths in Next image remote patterns.
   - File: `next.config.ts`
   - `images.akyodex.com` pathname changed to `/**`.

## Measurement Protocol (must keep constant)
1. Production build and deploy.
2. Lighthouse mobile, slow 4G, Moto G Power emulation.
3. Run 5 times and use median.
4. Record:
   - Performance score
   - FCP / LCP / SI
   - LCP element URL
   - Third-party transfer size (`udify.app`)

## Rollback Triggers
- Any break in Dify chatbot availability after user interaction.
- Any major visual regression in card list or header.
- LCP gets worse by >10% on 5-run median.

## Next Candidates (only if needed)
1. Tighten avatar API fallback logic by route-level telemetry to identify heavy IDs.
2. Isolate above-the-fold CSS from non-critical global rules.
3. Fine-tune logo asset variant for mobile without changing appearance.
