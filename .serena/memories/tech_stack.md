# Tech Stack

## Frontend
- **Framework**: Next.js 15.5.2 (App Router, React 19.1.0)
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript 5.9.3
- **Runtime**: Cloudflare Pages (Edge Runtime)

## Backend
- **Adapter**: @opennextjs/cloudflare 1.11.0
- **Authentication**: JWT (jsonwebtoken)
- **Security**: sanitize-html 2.17.0, crypto.timingSafeEqual()
- **CSV Processing**: csv-parse 6.1.0, csv-stringify 6.6.0

## Infrastructure
- **Hosting**: Cloudflare Pages
- **Storage**: R2 (images/CSV), KV (sessions), Vectorize (embeddings)
- **CDN**: Cloudflare Edge Network

## Development Tools
- **Package Manager**: npm 10.x
- **Node.js**: 20.x
- **Testing**: Vitest 2.1.1 (unit), Playwright 1.56.1 (E2E)
- **Code Quality**: ESLint, knip 5.66.4 (unused code detection)
- **Build Tool**: Turbopack (Next.js)

## Key Dependencies
- react: 19.1.0
- react-dom: 19.1.0
- next: 15.5.2
- sanitize-html: 2.17.0
- csv-parse: 6.1.0
- csv-stringify: 6.6.0
