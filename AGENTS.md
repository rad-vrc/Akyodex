# Repository Guidelines

## Project Structure & Module Organization
- `src/app` houses the Next.js App Router (pages, edge APIs, middleware) and is split into feature directories such as `admin`, `zukan`, and `api/*`.
- Shared UI and logic live under `src/components`, `src/lib`, and `src/types`; keep new UI elements in `components` and server-only helpers in `lib`.
- Static assets (`public/sw.js`, `public/manifest.json`, icons, fonts) support the PWA; CSV data and English copies live in `data/`.
- Automation lives in `scripts/` (CSV migration, Cloudflare prep) and regression assets in `tests/` (Vitest + Playwright suites).

## Build, Test, and Development Commands
- `npm run dev` – start the Turbopack dev server at `localhost:3000` with hot reload.
- `npm run next:build` – produce a standard Next.js build (useful for Vercel-style previews).
- `npm run build` – run the OpenNext Cloudflare build and post-process assets for Pages.
- `npm run test` / `npm run test:csv` – run Vitest unit suites and CSV quality checks.
- `npm run test:playwright`, `test:ui`, or `test:headed` – execute E2E flows defined in `tests/e2e`.
- `npm run lint` and `npm run knip` – enforce ESLint rules and dead-code detection prior to PRs.

## Coding Style & Naming Conventions
- TypeScript + React 19 with the App Router is mandatory; prefer Server Components unless client-side hooks force `"use client"`.
- Follow the ESLint config (`eslint.config.mjs`) and Tailwind utility-first styling; no inline styles unless dynamic.
- Use PascalCase for components (`MiniAkyoBg`), camelCase for helpers, and kebab-case for file names except React components.
- Keep CSV headers stable (4-digit IDs) and normalize strings with the HTML utility helpers before writing.

## Testing Guidelines
- Place unit-level tests beside source or in `tests/unit`; name files `*.spec.ts`.
- End-to-end specs live under `tests/e2e` and should mirror user journeys (login, avatar CRUD, PWA install).
- Run `npm run test` and `npm run test:playwright` before opening a PR; CI expects both to pass.

## Commit & Pull Request Guidelines
- Commits should be scoped (`admin: add VRChat validation`) and reference issues like `#115` when relevant.
- PRs must describe purpose, testing evidence (command output or screenshots for UI), and list any environment or data migrations.
- Include deployment considerations (Cloudflare bindings, R2/KV changes) and confirm CSV diffs when avatar data changes.

## Security & Configuration Tips
- Never commit real access codes; rely on `.env.local` and document new env vars in README/DEPLOYMENT.
- Any admin/auth changes must mention timing-safe comparisons, JWT cookie scope, and Cloudflare KV usage so reviewers can focus on regressions.