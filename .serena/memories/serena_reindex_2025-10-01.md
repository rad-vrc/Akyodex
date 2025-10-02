Reindexed Akyodex project on 2025-10-01.

## Project Structure Update
- Enhanced with gallery subdomain functionality
- Added _redirects and _headers configuration files
- Updated service worker with new cache versioning
- Added favicon generation tools and manifest files
- Integrated TypeScript API functions with proper type definitions

## Core Components
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), TypeScript (Functions)
- **Backend**: Cloudflare Pages Functions with R2/KV storage
- **Styling**: Tailwind CSS + custom kid-friendly themes
- **Images**: R2 bucket delivery via images.akyodex.com
- **Data**: CSV format with automatic manifest generation

## Key Features
- Akyo creature index with 639+ entries
- Grid/list view toggle
- Advanced search and filtering
- Favorites system with localStorage
- Admin panel with CRUD operations
- Responsive design for all devices
- PWA capabilities with manifest
- Multi-language support (Japanese primary)

## File Structure
- HTML: index.html (main), admin.html, gallery.html, finder.html, share.html
- JavaScript: main.js (core), admin.js, storage-manager.js, image-loader.js
- TypeScript: functions/_utils.ts, functions/api/*.ts
- CSS: kid-friendly.css, gallery.css
- Assets: images/*, data/akyo-data.csv
- Config: manifest.webmanifest, _redirects, _headers

## Development Commands
- Local: npx serve . or python -m http.server 8000
- Deploy: npx wrangler pages deploy . --project-name akyogallery
- API: Bearer token authentication with role-based access
- Debug: ?reloadBg=1, ?bgdensity=NN parameters

## Recent Updates
- Added gallery subdomain with Twitter timeline integration
- Enhanced mobile responsiveness for list view
- Improved filtering logic with favorites/random modes
- Fixed TypeScript errors in API functions
- Added comprehensive favicon set

Index ready for enhanced symbol navigation and code analysis.