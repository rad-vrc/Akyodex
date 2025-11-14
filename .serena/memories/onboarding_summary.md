# Onboarding Summary

## Project: Akyodex - VRChat Avatar Encyclopedia

**Last Updated**: 2025-01-22  
**Status**: ✅ Onboarding Complete

## Quick Overview

Akyodex is a Next.js 15 application deployed on Cloudflare Pages that serves as a comprehensive database for 640+ VRChat "Akyo" avatars. It features a public gallery, admin panel with JWT authentication, PWA support, multilingual capabilities (Japanese/English), and AI-powered search via Dify chatbot.

## Tech Stack Summary

- **Frontend**: Next.js 15.5.2, React 19.1.0, Tailwind CSS 4.x, TypeScript 5.9.3
- **Backend**: Cloudflare Pages (Edge Runtime), @opennextjs/cloudflare 1.11.0
- **Storage**: Cloudflare R2 (images/CSV), KV (sessions)
- **Testing**: Playwright 1.56.1
- **Development**: Windows (cmd shell), Node.js 20.x, npm 10.x

## Essential Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Build for Cloudflare Pages
npm run test:playwright        # Run E2E tests

# Code Quality
npm run lint                   # ESLint
npx tsc --noEmit              # Type check
npm run knip                   # Dead code detection

# Deployment
npm run pages:deploy           # Deploy to Cloudflare Pages
```

## Project Structure

```
akyodex-nextjs/
├── src/
│   ├── app/           # Next.js App Router (pages, API routes)
│   ├── components/    # React components
│   ├── lib/           # Utility libraries
│   ├── types/         # TypeScript types
│   └── middleware.ts  # i18n middleware
├── tests/             # Playwright E2E tests
├── data/              # CSV data files
├── public/            # Static assets (PWA)
└── scripts/           # Automation scripts
```

## Key Conventions

### Naming
- **Components**: PascalCase (e.g., `AkyoCard`)
- **Files**: kebab-case (e.g., `akyo-card.tsx`)
- **Functions**: camelCase (e.g., `fetchAvatarData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SESSION_DURATION`)

### Component Patterns
- **Default**: Server Components (no directive)
- **Client**: Use `'use client'` directive when interactivity needed
- **API Routes**: Prefer standard `Request`/`Response` over `NextRequest`/`NextResponse`

### Code Style
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS (utility-first, no inline styles)
- **Imports**: External → Internal (@/) → Relative
- **Formatting**: 2-space indent, single quotes, semicolons required

## Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/name`
2. **Make Changes**: Follow code style conventions
3. **Test Locally**: `npm run dev`, `npm run test:playwright`
4. **Code Quality**: `npm run lint`, `npx tsc --noEmit`
5. **Commit**: `git commit -m "feat: description"`
6. **Push**: `git push origin feature/name`
7. **Create PR**: Include purpose, testing, screenshots
8. **Squash Commits**: Before merge

## Security Best Practices

- ✅ Timing-safe password comparison
- ✅ HTML sanitization for user input
- ✅ Input validation with length-limited regex
- ✅ HTTP-only cookies for sessions
- ✅ CSRF protection on state-changing operations
- ✅ No secrets in code (use environment variables)

## Windows-Specific Notes

- **Shell**: cmd (use `&` for command chaining, not `&&`)
- **Paths**: Use backslash `\` or forward slash `/` (both work)
- **File Operations**: `dir`, `type`, `copy`, `del`, `mkdir`, `rmdir /s /q`

## Important URLs

### Local Development
- Gallery: http://localhost:3000/zukan
- Admin: http://localhost:3000/admin

### Production
- Gallery: https://akyodex.com/zukan
- Admin: https://akyodex.com/admin

## Admin Credentials (Development)

- **Owner**: `RadAkyo` (full access)
- **Admin**: `Akyo` (limited access)

## Memory Files Created

1. **project_overview.md** - Project purpose, tech stack, architecture
2. **suggested_commands.md** - Development, testing, deployment commands
3. **code_style_conventions.md** - Naming, patterns, TypeScript, Tailwind
4. **task_completion_checklist.md** - Pre-commit, testing, deployment checks
5. **project_structure.md** - Directory layout, data flow, file organization
6. **windows_system_commands.md** - CMD/PowerShell commands for Windows
7. **design_patterns_guidelines.md** - Component, API, security patterns
8. **onboarding_summary.md** - This file (quick reference)

## Next Steps

You're now ready to start developing! Key things to remember:

1. **Always run tests** before committing (`npm run test:playwright`)
2. **Follow code style** (check `code_style_conventions.md`)
3. **Use helper functions** from `@/lib/api-helpers` for consistency
4. **Document runtime requirements** for Node.js routes
5. **Check Windows commands** if you need system operations

## Getting Help

- **Documentation**: Check README.md, DEPLOYMENT.md, AGENTS.md
- **Memory Files**: Refer to `.serena/memories/` for detailed guides
- **Steering Rules**: Check `.kiro/steering/` for project-specific rules
- **Issues**: https://github.com/rad-vrc/Akyodex/issues

## Current Status

- ✅ Next.js 15 migration complete
- ✅ Security hardening implemented
- ✅ PWA with 6 caching strategies
- ✅ VRChat image fallback system
- ✅ Dify AI chatbot integration
- ✅ Dual admin system (Owner/Admin)
- ✅ Production ready (v1.1.0)

## Known Issues

- Issue #115: 8 refactoring tasks (medium priority)
- PR #114: Should be closed (duplicate of PR #113)

---

**Welcome to Akyodex development! 🎉**

For detailed information on any topic, refer to the specific memory files listed above.
