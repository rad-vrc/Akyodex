# Implementation Plan - OpenNext Branch Refactoring

## Task Overview

This implementation plan breaks down the refactoring into discrete, manageable coding tasks. Each task builds incrementally on previous tasks and references specific requirements from the requirements document.

## Phase 0: Infrastructure and Security Foundation

- [ ] 0.1 Cloudflare Workers/Edge compatibility audit
  - Create ESLint rule to detect Node.js-specific APIs (no-nodejs-modules-in-edge)
  - Audit all dependencies for Cloudflare Workers compatibility
  - Replace cheerio with node-html-parser for HTML parsing
  - Replace sharp with Squoosh WASM or Cloudflare Images for image processing
  - Document edge-compatible alternatives for common Node.js APIs
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 0.2 Environment variable schema and validation
  - Create `src/lib/env.ts` with Zod schemas for all environment variables
  - Implement runtime validation on application startup
  - Define required, optional, and default values
  - Add type-safe environment variable access
  - Document environment setup in GitHub Actions and Wrangler
  - _Requirements: 10.1, 12.2_

- [ ] 0.3 Security baseline - HTTP headers and middleware
  - Create `src/middleware/security.ts` for security headers
  - Implement CSP (Content Security Policy) headers
  - Add X-Frame-Options, Referrer-Policy, Permissions-Policy headers
  - Add X-Content-Type-Options: nosniff
  - Configure CORS policy
  - Set Cookie attributes (HttpOnly, SameSite=Strict, Secure)
  - _Requirements: 13.1, 13.5_

- [ ] 0.4 Authentication hardening
  - Implement rate limiting for admin login (IP + fingerprint based)
  - Integrate Cloudflare Turnstile for bot protection
  - Replace SHA-256 with bcryptjs or argon2-wasm for password hashing
  - Implement CSRF protection (Double Submit Cookie or SameSite + token)
  - Add session timeout and refresh mechanism
  - _Requirements: 13.2, 13.3, 13.4, 13.6_

- [ ] 0.5 R2 concurrent write protection
  - Implement ETag-based optimistic locking in CSVProcessor
  - Add If-Match header support for R2 PUT operations
  - Return 409 (Conflict) status on ETag mismatch
  - Implement retry logic with exponential backoff
  - Document Durable Objects alternative for exclusive locking if needed
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 0.6 Cache policy and strategy documentation
  - Create ADR (Architecture Decision Record) for caching strategy
  - Define Cache-Control headers for API responses
  - Implement ETag generation for cacheable resources
  - Configure stale-while-revalidate for appropriate endpoints
  - Define VRChat scraping cache TTL and key design
  - Document PWA Service Worker and Cloudflare cache interaction
  - _Requirements: 10.1, 12.2_

- [ ] 0.7 Architecture Decision Records (ADRs)
  - Create ADR for HTML scraping approach (VRChat API limitations)
  - Create ADR for CSV vs D1 database decision
  - Create ADR for image processing execution (Client vs Cloudflare Images)
  - Create ADR for authentication strategy (JWT + bcryptjs)
  - Create ADR for concurrent update protection (ETag vs Durable Objects)
  - Store ADRs in `docs/adr/` directory
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 0.8 Error tracking and observability setup
  - Create `src/lib/error-tracking.ts` with errorId generation
  - Implement structured logging with requestId, route, status, stack
  - Add Sentry SDK integration (or OpenTelemetry)
  - Create error categorization (VRChatAPIError, ValidationError, etc.)
  - Implement errorId-based log correlation
  - Add performance monitoring hooks
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

## Phase 1: Foundation - Shared Utilities

- [ ] 1. Create VRChat API utility module
  - Create `src/lib/vrchat-api.ts` with centralized VRChat API logic
  - Use node-html-parser (not cheerio) for HTML parsing
  - Implement `fetchVRChatAvatarInfo()` with timeout (AbortController), exponential backoff, and rate limiting
  - Add Accept-Language header固定 to prevent response variation
  - Implement caching using caches.default API
  - Implement `fetchVRChatAvatarImage()` with proper error handling
  - Implement `validateVRChatId()` with strict regex: `^avtr_[a-f0-9-]{36}$`
  - Create `VRChatAPIError` custom error class with errorId
  - Add selector change detection and unit tests for parser robustness
  - _Requirements: 1.1, 2.2, 2.3, 10.2, 10.6, 12.1_

- [ ] 2. Create CSV processor module
  - Create `src/lib/csv-processor.ts` with unified CSV processing logic
  - Implement `CSVProcessor` class with ETag-based optimistic locking
  - Implement `parseCSV()` with UTF-8 BOM/CRLF/Shift_JIS detection and UTF-8 normalization
  - Implement header validation with alias table for multi-language support
  - Implement `generateCSV()` with consistent formatting
  - Implement `normalizeUnicode()` with NFC normalization
  - Create separate `foldUnicode()` for NFKC-equivalent comparison
  - Add duplicate detection with normalization + trim + full-width/half-width conversion
  - Implement R2 read/write with If-Match header for concurrent protection
  - _Requirements: 1.2, 4.2, 11.1, 11.2, 11.3, 11.4_

- [ ] 3. Create image utilities module
  - Create `src/lib/image-utils.ts` with client-side and server-side functions
  - Implement `useImageLoader()` hook for loading state management (client-side)
  - Implement `validateImageFile()` for file type and size validation (server-side)
  - Implement `optimizeImageClient()` using Canvas API or Squoosh WASM (client-side)
  - Add EXIF orientation correction in `optimizeImageClient()`
  - Add transparency preservation for PNG format
  - Add WebP/AVIF format support with quality presets
  - Implement `cropImageClient()` using Canvas API (client-side)
  - Implement `generateCloudflareImageUrl()` for Cloudflare Images integration (server-side)
  - Implement `validateImageMetadata()` for server-side validation (server-side)
  - _Requirements: 1.3, 4.4, 10.3_

- [ ] 4. Create API response standardization module
  - Create `src/types/api.ts` with response type definitions
  - Define `APISuccessResponse<T>` with version, etag, traceId fields
  - Define `APIErrorResponse` with errorId, code, details fields
  - Define `HTTP_STATUS` constants object
  - Create `src/lib/api-response.ts` with helper functions
  - Implement `createSuccessResponse()` with automatic version/etag/traceId generation
  - Implement `createErrorResponse()` with errorId generation
  - Implement `handleAPIError()` with error categorization (VRChatAPIError, ValidationError, ConflictError, NotFoundError)
  - Add structured logging with requestId, route, status, stack, errorId
  - Integrate with error tracking service (Sentry/OpenTelemetry)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 12.1, 12.2, 12.3, 12.4_

- [ ] 5. Create validation schemas module
  - Create `src/lib/validation.ts` with Zod schemas
  - Implement `uploadAkyoSchema` with strict VRChat ID validation (`^avtr_[a-f0-9-]{36}$`)
  - Add field length limits and NFC/NFKC normalization requirements
  - Implement `updateAkyoSchema` for avatar update validation
  - Implement `deleteAkyoSchema` for avatar deletion validation
  - Implement `checkDuplicateSchema` for duplicate checking validation
  - Add zod-i18n or custom dictionary for Japanese/English error messages
  - Include path, issue code, and limit in validation errors for frontend highlighting
  - Use branded types (DateString, UrlString) for type safety
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

## Phase 2: API Route Refactoring

- [ ] 6. Refactor VRChat avatar info API route
  - Update `src/app/api/vrc-avatar-info/route.ts` to use `vrchat-api.ts` utility
  - Add `export const runtime = 'edge'` for Cloudflare Workers compatibility
  - Replace inline VRChat fetching logic with `fetchVRChatAvatarInfo()`
  - Update response format to use `createSuccessResponse()` with version/etag/traceId
  - Add proper HTTP status codes (200, 400, 500)
  - Add Cache-Control, ETag headers
  - Generate requestId for logging
  - Update error handling to use `handleAPIError()` with errorId
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.8, 10.1, 12.1, 12.2_

- [ ] 7. Refactor VRChat avatar image API route
  - Update `src/app/api/vrc-avatar-image/route.ts` to use `vrchat-api.ts` utility
  - Add `export const runtime = 'edge'`
  - Replace inline image fetching logic with `fetchVRChatAvatarImage()`
  - Add Cache-Control headers for image caching
  - Add proper error handling and status codes
  - _Requirements: 1.1, 2.2, 2.3, 10.1_

- [ ] 8. Refactor upload avatar API route
  - Update `src/app/api/upload-akyo/route.ts` to use standardized responses
  - Add `export const runtime = 'edge'`
  - Add Zod validation using `uploadAkyoSchema` with detailed error messages
  - Update response format to use `createSuccessResponse()` with status 201
  - Add duplicate checking with status 409 for conflicts
  - Use `CSVProcessor` with ETag-based optimistic locking
  - Handle 409 conflicts with retry guidance
  - Add requestId and errorId to all responses
  - _Requirements: 1.2, 2.1, 2.4, 2.6, 2.8, 4.2, 11.1, 11.2, 11.3, 12.1_

- [ ] 9. Refactor update avatar API route
  - Update `src/app/api/update-akyo/route.ts` to use standardized responses
  - Add `export const runtime = 'edge'`
  - Add Zod validation using `updateAkyoSchema`
  - Update response format to use `createSuccessResponse()`
  - Update error responses with proper status codes (400, 404, 409, 500)
  - Use `CSVProcessor` with ETag-based optimistic locking
  - Handle concurrent update conflicts
  - _Requirements: 1.2, 2.1, 2.2, 2.5, 2.8, 4.2, 11.1, 11.2, 11.3_

- [ ] 10. Refactor delete avatar API route
  - Update `src/app/api/delete-akyo/route.ts` to use standardized responses
  - Add `export const runtime = 'edge'`
  - Add Zod validation using `deleteAkyoSchema`
  - Update response format to use `createSuccessResponse()`
  - Add 404 status for not found avatars
  - Use `CSVProcessor` with ETag-based optimistic locking
  - _Requirements: 1.2, 2.1, 2.2, 2.5, 2.8, 4.2, 11.1, 11.2_

- [ ] 11. Refactor check duplicate API route
  - Update `src/app/api/check-duplicate/route.ts` to use standardized responses
  - Add `export const runtime = 'edge'`
  - Add Zod validation using `checkDuplicateSchema`
  - Update response format to use `createSuccessResponse()`
  - Use `CSVProcessor` with Unicode normalization and folding
  - Implement shared duplicate detection function (normalize + trim + full-width/half-width)
  - _Requirements: 1.2, 2.1, 2.2, 2.8, 4.2_

- [ ] 12. Refactor admin API routes
  - Update `src/app/api/admin/login/route.ts` with rate limiting and Turnstile
  - Add `export const runtime = 'edge'` to all admin routes
  - Implement bcryptjs or argon2-wasm password verification
  - Add CSRF token generation and validation
  - Update `src/app/api/admin/logout/route.ts` to use standardized responses
  - Update `src/app/api/admin/verify-session/route.ts` with session refresh
  - Update `src/app/api/admin/next-id/route.ts` to use standardized responses
  - Add proper status codes (200, 401, 429, 500)
  - Add requestId to all responses
  - _Requirements: 2.1, 2.2, 2.7, 2.8, 10.1, 13.2, 13.3, 13.4, 13.6_

## Phase 3: Component Architecture Refactoring

- [ ] 13. Decompose ZukanClient component
  - Create `src/components/zukan/zukan-filters.tsx` as Client Component
  - Extract search and filter logic from ZukanClient
  - Implement filter state management with useState
  - Add debounced search input with useDeferredValue
  - Create `src/components/zukan/zukan-grid.tsx` as Client Component
  - Extract grid rendering logic from ZukanClient
  - Implement virtual scrolling using react-virtuoso or TanStack Virtual
  - Create `src/components/zukan/zukan-header.tsx` as Server Component
  - Extract static header content
  - Update `src/app/zukan/page.tsx` (Server Component) to pass serializable data to ZukanClient
  - Update `src/app/zukan/zukan-client.tsx` to compose new components
  - Ensure Server → Client one-way data flow with only serializable props
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 14. Optimize Server/Client component usage
  - Review all components and identify Server vs Client needs
  - Remove unnecessary 'use client' directives from static components
  - Add 'use client' directive to interactive components
  - Ensure proper component composition (Server → Client direction only)
  - Pass only serializable data (no Date/URL objects) from Server to Client
  - Use branded string types (DateString, UrlString) for RSC boundary
  - _Requirements: 3.1, 3.2, 3.4, 4.3, 4.5_

- [ ] 15. Implement dynamic imports for heavy components
  - Add dynamic import for ImageCropper component in admin panel
  - Add loading state component for ImageCropper
  - Add dynamic import for AdminPanel components
  - Add loading state for admin components
  - Configure `ssr: false` for client-only components
  - Ensure image processing happens on client-side using Canvas/Squoosh
  - _Requirements: 3.5, 3.6, 6.1, 10.3_

- [ ] 16. Refactor admin components to use shared utilities
  - Update `src/components/admin/tabs/add-tab.tsx` to use `vrchat-api.ts`
  - Remove duplicate VRChat fetching logic
  - Add AbortController for cancellable VRChat requests
  - Update to use `image-utils.ts` client-side functions for image handling
  - Implement image processing in browser (Canvas/Squoosh WASM)
  - Update `src/components/admin/tabs/edit-tab.tsx` to use shared utilities
  - Update `src/components/admin/tabs/tools-tab.tsx` to use `csv-processor.ts`
  - Add proper error handling with errorId display
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.3, 12.1_

## Phase 4: Type Safety Enhancements

- [ ] 17. Enhance TypeScript types
  - Update `src/types/akyo.ts` with readonly properties for immutable data
  - Change `appearance` field to DateString branded type (ISO 8601 string)
  - Change `attributes` field to readonly array
  - Change `avatarUrl` field to UrlString branded type
  - Create DeepReadonly utility type for domain models
  - Create separate mutable form types for editing
  - Update all components and utilities to use enhanced types
  - Ensure no Date/URL objects cross RSC/JSON boundaries
  - _Requirements: 4.1, 4.3, 4.5_

- [ ] 18. Add runtime validation to all API routes
  - Ensure all API routes use Zod schemas for validation
  - Add validation error handling with path, issue code, and limit details
  - Return 400 status code for validation failures
  - Include validation details in error responses for frontend highlighting
  - Add zod-i18n or custom dictionary for Japanese/English messages
  - Implement strict VRChat ID validation with `^avtr_[a-f0-9-]{36}$`
  - Add field length limits and normalization requirements
  - _Requirements: 4.2, 4.4_

## Phase 5: Testing Implementation

- [ ] 19. Set up testing infrastructure
  - Configure Vitest for unit and integration tests
  - Configure Miniflare 3 for Workers-compatible integration tests
  - Configure Playwright for E2E tests
  - Set up test fixtures and mock data
  - Create test utilities and helpers
  - Configure test coverage reporting
  - Add type-coverage tool for TypeScript coverage measurement (target: zero `any`)
  - _Requirements: 6.5, 10.1_

- [ ] 20. Write unit tests for shared utilities
  - Create `tests/unit/vrchat-api.test.ts` with tests for all functions
  - Create `tests/unit/csv-processor.test.ts` with tests for CSVProcessor class
  - Create `tests/unit/image-utils.test.ts` with tests for image functions
  - Create `tests/unit/api-response.test.ts` with tests for response helpers
  - Create `tests/unit/validation.test.ts` with tests for Zod schemas
  - Achieve 80%+ code coverage for utilities
  - _Requirements: 6.1, 6.5_

- [ ] 20.1 Write unit tests for VRChat API utility
  - Test successful avatar info fetching
  - Test invalid avatar ID handling
  - Test network error handling
  - Test HTML parsing and sanitization
  - _Requirements: 6.1_

- [ ] 20.2 Write unit tests for CSV processor
  - Test CSV parsing with valid data
  - Test CSV parsing with malformed data
  - Test header validation
  - Test Unicode normalization
  - Test CSV generation
  - _Requirements: 6.1_

- [ ] 20.3 Write unit tests for image utilities
  - Test image file validation
  - Test image optimization
  - Test image cropping
  - Test error handling for invalid files
  - _Requirements: 6.1_

- [ ] 21. Write integration tests for API routes
  - Create `tests/integration/api/upload-akyo.test.ts`
  - Test successful avatar creation with status 201
  - Test duplicate detection with status 409
  - Test validation errors with status 400
  - Create `tests/integration/api/update-akyo.test.ts`
  - Test successful update with status 200
  - Test not found with status 404
  - Create `tests/integration/api/delete-akyo.test.ts`
  - Test successful deletion
  - Test not found handling
  - _Requirements: 6.1, 6.5_

- [ ] 21.1 Write integration tests for admin API routes
  - Test login with valid credentials
  - Test login with invalid credentials (401)
  - Test session verification
  - Test logout functionality
  - _Requirements: 6.1_

- [ ] 22. Write E2E tests for gallery functionality
  - Create `tests/e2e/gallery.spec.ts`
  - Test gallery page loading and avatar display
  - Test virtual scrolling functionality
  - Test search functionality with debouncing
  - Test filter by attributes
  - Test avatar detail modal opening and closing
  - Test language switching
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 23. Write E2E tests for admin panel
  - Create `tests/e2e/admin.spec.ts`
  - Test admin login and logout flow
  - Test adding new avatar with all fields
  - Test VRChat URL fetch functionality
  - Test editing existing avatar
  - Test deleting avatar
  - Test attribute management (add, edit, delete)
  - _Requirements: 6.2, 6.5_

- [ ] 24. Write E2E tests for PWA functionality
  - Create `tests/e2e/pwa.spec.ts`
  - Test service worker registration
  - Test offline support with cached pages
  - Test cache strategies (cache-first, network-first, etc.)
  - Test PWA installability
  - Test manifest.json accessibility
  - _Requirements: 6.3, 6.5_

- [ ] 25. Write cross-browser compatibility tests
  - Create `tests/e2e/cross-browser.spec.ts`
  - Test on Chrome, Firefox, Safari, and Edge
  - Test responsive design on mobile viewports (iPhone, Android)
  - Test responsive design on tablet viewports (iPad)
  - Test touch interactions on mobile devices
  - _Requirements: 6.4, 6.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 26. Write performance tests
  - Create `tests/performance/lighthouse.spec.ts`
  - Test Lighthouse scores (Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥90, PWA ≥90)
  - Create `tests/performance/core-web-vitals.spec.ts`
  - Test LCP <2.5s, FID <100ms, CLS <0.1
  - Create `tests/performance/bundle-analysis.spec.ts`
  - Test main bundle size <250KB
  - Test proper code splitting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 7.1, 7.2, 7.3, 7.4_

- [ ] 27. Write security tests
  - Create `tests/security/auth.spec.ts`
  - Test unauthorized access prevention
  - Test invalid login attempts
  - Test session timeout
  - Create `tests/security/input-validation.spec.ts`
  - Test XSS payload rejection
  - Test file upload validation
  - Test field length validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 6: Performance Optimization

- [ ] 28. Optimize image loading
  - Update all image components to use Next.js Image component
  - Configure custom loader for Cloudflare compatibility
  - Add proper width and height attributes
  - Add loading="lazy" for below-fold images
  - Add priority for LCP images
  - Configure responsive images with sizes attribute
  - Use Cloudflare Images or resize URLs for VRChat images
  - _Requirements: 5.5, 6.1, 10.3_

- [ ] 29. Implement bundle size optimization
  - Analyze current bundle size with webpack-bundle-analyzer
  - Identify large dependencies and optimize imports
  - Implement tree shaking for unused code
  - Use named imports instead of default imports where possible
  - Remove unused dependencies from package.json
  - _Requirements: 3.6, 6.1_

- [ ] 30. Optimize caching strategy
  - Review and optimize service worker caching strategies
  - Implement proper cache-control headers for static assets
  - Configure ISR revalidation times appropriately
  - Optimize KV store usage for sessions
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Phase 7: Deployment and Verification

- [ ] 31. Set up CI/CD pipeline
  - Create GitHub Actions workflow for automated testing
  - Add matrix strategy for Node 18/20 and Chrome/Firefox
  - Add dependency caching for faster builds
  - Add lint check step
  - Add type check step (including type-coverage)
  - Add unit test step
  - Add E2E test step
  - Add performance test step
  - Configure test result reporting and artifact upload on failure
  - Add Conventional Commits validation
  - Create PR template with checklist (types, tests, runtime, Edge compatibility, locking)
  - _Requirements: 6.5, 10.1, 14.1_

- [ ] 32. Deploy to staging environment
  - Build application with production configuration
  - Deploy to Cloudflare Pages staging environment
  - Verify environment variables are set correctly using env.ts validation
  - Verify Cloudflare bindings (R2, KV) are configured
  - Test preview environment bindings
  - Run smoke tests on staging
  - Verify PWA Service Worker and Cloudflare cache interaction
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 14.2, 14.3_

- [ ] 33. Perform deployment verification
  - Test all critical pages return HTTP 200
  - Test admin authentication and CRUD operations
  - Test PWA installation on staging
  - Verify service worker registration
  - Test cross-browser compatibility on staging
  - Run full E2E test suite against staging
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 34. Production deployment
  - Deploy to production with feature flags (10% rollout)
  - Implement sticky percentage rollout using cookies
  - Monitor error rates and performance metrics with Sentry/OpenTelemetry
  - Monitor errorId-based log correlation
  - Increase rollout to 50% if metrics are good
  - Monitor for 24 hours
  - Increase rollout to 100%
  - Verify all functionality in production
  - Verify Cloudflare bindings in production
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.4, 12.5, 14.1, 14.2, 14.3_

## Success Criteria

### Code Quality
- ✅ Zero code duplication exceeding 10 lines
- ✅ Zero `any` types (measured by type-coverage)
- ✅ All ESLint rules passing (including no-nodejs-modules-in-edge)
- ✅ 80%+ unit test coverage
- ✅ All dependencies Cloudflare Workers compatible

### Performance
- ✅ Lighthouse Performance score ≥90
- ✅ LCP <2.5 seconds
- ✅ FID <100 milliseconds
- ✅ CLS <0.1
- ✅ Main bundle <250KB

### Functionality
- ✅ 100% E2E test pass rate
- ✅ All features working in production
- ✅ Cross-browser compatibility verified
- ✅ Mobile responsiveness verified
- ✅ PWA and Cloudflare cache working harmoniously

### Security
- ✅ All security tests passing
- ✅ No XSS vulnerabilities
- ✅ Rate limiting and Turnstile working
- ✅ bcryptjs/argon2-wasm password hashing
- ✅ CSRF protection implemented
- ✅ Security headers configured

### Observability
- ✅ errorId generation and tracking
- ✅ Structured logging with requestId
- ✅ Sentry/OpenTelemetry integration
- ✅ Error categorization working

### Data Integrity
- ✅ ETag-based optimistic locking working
- ✅ No lost updates in concurrent scenarios
- ✅ Proper conflict handling (409 status)

## Notes

- All tasks are required for comprehensive refactoring and testing
- Each task should be completed and verified before moving to the next
- All code changes should be committed with Conventional Commits format
- Run linting and type checking after each task
- Update documentation as needed during implementation
- Testing tasks ensure production-ready quality from the start
- Use PR template checklist for all pull requests

## Fallback Checklist (避けるべき落とし穴)

Before merging, verify:
- [ ] No cheerio/sharp or other Node-specific dependencies
- [ ] Image optimization is client-side (Canvas/Squoosh) or Cloudflare Images
- [ ] CSV/R2 updates use ETag optimistic locking
- [ ] No Date/URL objects cross RSC/JSON boundaries
- [ ] PWA Service Worker and Cloudflare cache policies don't conflict
- [ ] Admin login has rate limiting, CSRF, and Turnstile
- [ ] Monitoring (Sentry/OTel) and errorId are wired up
- [ ] All API routes have `export const runtime = 'edge'`
