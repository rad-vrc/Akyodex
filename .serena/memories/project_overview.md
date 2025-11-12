# Akyodex Project Overview

## Project Purpose

**Akyodex** is a VRChat Avatar Encyclopedia - a comprehensive online database for the "Akyo" series of original VRChat avatars. It serves as a community-driven catalog with 640+ avatar entries, featuring:

- **Avatar Gallery**: Searchable database with 4-digit ID system (0001-0640)
- **Admin Panel**: JWT-authenticated management interface for community contributors
- **PWA Support**: Progressive Web App with offline capabilities
- **Multilingual**: Japanese (primary) and English support with automatic detection
- **AI Chatbot**: Dify-powered natural language avatar search assistant

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.2 (App Router, React 19.1.0)
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript 5.9.3
- **UI Components**: Radix UI, Lucide React
- **Image Processing**: react-image-crop

### Backend & Runtime
- **Deployment**: Cloudflare Pages (Edge Runtime)
- **Adapter**: @opennextjs/cloudflare 1.11.0
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Storage**: Cloudflare R2 (images/CSV), KV (sessions)
- **Security**: sanitize-html, crypto.timingSafeEqual()

### Data Processing
- **CSV**: csv-parse 6.1.0, csv-stringify 6.6.0
- **VRChat Integration**: Custom API utilities

### Testing
- **E2E**: Playwright 1.56.1
- **Linting**: ESLint 9.x with Next.js config
- **Dead Code**: Knip 5.66.4

## Project Status

✅ **Production Ready** (v1.1.0)
- Next.js 15 migration complete
- Security hardening implemented
- PWA with 6 caching strategies
- VRChat image fallback system
- Dify AI chatbot integration
- Dual admin system (Owner/Admin roles)

## Key Features

1. **640 Avatar Database**: Complete catalog with 4-digit IDs
2. **Admin Panel**: Add/Edit/Delete with image cropping and VRChat integration
3. **PWA**: Installable app with offline support
4. **i18n**: Japanese/English with automatic detection
5. **AI Search**: Natural language queries via Dify chatbot
6. **Security**: Timing-safe auth, XSS prevention, CSRF protection

## Architecture

```
Cloudflare Pages (Edge Runtime)
├── Next.js 15 App (SSG + ISR)
│   ├── Gallery Pages (Static)
│   ├── API Routes (Edge Functions)
│   └── Middleware (i18n)
├── R2 Bucket (CSV + Images)
└── KV Store (Sessions)
```

## Development Environment

- **OS**: Windows (cmd shell)
- **Node.js**: 20.x
- **Package Manager**: npm 10.x
- **Repository**: https://github.com/rad-vrc/Akyodex
