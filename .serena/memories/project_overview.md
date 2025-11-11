# Akyodex Project Overview

## Purpose
Akyodex (Akyoずかん) is a VRChat avatar encyclopedia featuring 639+ "Akyo" avatars - mysterious creatures from the VRChat community. It provides a searchable database with AI-powered chatbot for natural language queries.

## Key Features
- **Avatar Gallery**: 639 avatars with 4-digit IDs (0001-0639)
- **Admin Panel**: JWT-authenticated CRUD operations with image cropping
- **PWA**: Offline support with 6 caching strategies
- **i18n**: Japanese (default) and English with automatic detection
- **Edge Runtime**: Deployed on Cloudflare Pages

## Target Users
- VRChat community members
- Avatar creators and enthusiasts
- Japanese and English speakers

## Deployment
- **Platform**: Cloudflare Pages (Edge Runtime)
- **Storage**: R2 (images/CSV), KV (sessions), Vectorize (embeddings)
- **Domain**: akyodex.com
- **URLs**:
  - Gallery: https://akyodex.com/zukan
  - Admin: https://akyodex.com/admin

## Project Status
- ✅ Next.js 15.5.6 migration complete
- ✅ Security hardening implemented
- ✅ PWA with Service Worker
- 📝 Ongoing code quality improvements
