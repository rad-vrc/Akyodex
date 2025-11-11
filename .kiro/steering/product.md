# Product Overview

**Akyodex (Akyoずかん)** is a VRChat avatar encyclopedia featuring 639+ "Akyo" avatars - mysterious creatures from the VRChat community.

## Core Purpose
- Browse and search VRChat avatars by name, creator, and attributes
- Dify-powered chatbot for avatar queries
- Admin panel for managing avatar database
- Multi-language support (Japanese/English)

## Key Features
- **Avatar Gallery**: 639 avatars with 4-digit IDs (0001-0639)
- **Dify Chatbot**: Embedded Dify chatbot widget for avatar queries
- **Admin Panel**: JWT-authenticated CRUD operations with image cropping
- **PWA**: Offline support with 6 caching strategies
- **i18n**: Japanese (default) and English with automatic detection

## Target Users
- VRChat community members
- Avatar creators and enthusiasts
- Japanese and English speakers

## Deployment
- **Platform**: Cloudflare Pages (Edge Runtime)
- **Storage**: R2 (images/CSV), KV (sessions)
- **Domain**: akyodex.com
- **Chatbot**: Dify embedded widget

## Project Structure
- **Root**: Legacy static site (HTML/CSS/JS)
- **akyodex-nextjs**: Next.js 15 migration (primary development)
