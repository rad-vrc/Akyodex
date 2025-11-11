# Requirements Document - OpenNext Branch Refactoring

## Introduction

This specification defines the requirements for refactoring the Akyodex Next.js application on the opennext branch to comply with DRY (Don't Repeat Yourself) principles, REST API best practices, and Next.js 15+ best practices as of 2025. The refactoring will improve code maintainability, performance, and developer experience while ensuring all existing functionality remains intact and properly tested.

## Glossary

- **System**: The Akyodex Next.js application
- **DRY Principle**: Don't Repeat Yourself - eliminating code duplication
- **REST API**: Representational State Transfer API with proper HTTP methods and status codes
- **Server Component**: Next.js component that renders on the server (default in Next.js 15+)
- **Client Component**: Next.js component marked with 'use client' directive for interactivity
- **Edge Runtime**: Cloudflare Pages execution environment
- **VRChat API**: External API for fetching avatar information
- **CSV Processor**: Utility for parsing and generating CSV data
- **JWT Session**: JSON Web Token-based authentication system
- **PWA**: Progressive Web App with offline capabilities
- **E2E Testing**: End-to-end testing with Playwright
- **Performance Testing**: Chrome DevTools-based performance audits
- **Core Web Vitals**: LCP, FID, CLS performance metrics

## Requirements

### Requirement 1: Code Duplication Elimination

**User Story:** As a developer, I want to eliminate code duplication across the codebase, so that maintenance is easier and bugs are reduced.

#### Acceptance Criteria

1. WHEN VRChat API logic is needed, THE System SHALL use a centralized utility function from `src/lib/vrchat-api.ts`
2. WHEN CSV processing is required, THE System SHALL use a unified CSVProcessor class from `src/lib/csv-processor.ts`
3. WHEN image handling is needed, THE System SHALL use shared utilities from `src/lib/image-utils.ts`
4. WHERE duplicate code exists in multiple components, THE System SHALL extract common logic into reusable utilities
5. WHEN searching for code duplication, THE System SHALL have zero instances of identical logic blocks exceeding 10 lines

### Requirement 2: REST API Standardization

**User Story:** As an API consumer, I want consistent API responses and proper HTTP status codes, so that I can handle responses predictably.

#### Acceptance Criteria

1. WHEN an API request succeeds, THE System SHALL return a response with status 200-299 and format `{ success: true, data: T }`
2. WHEN an API request fails due to client error, THE System SHALL return status 400-499 and format `{ success: false, error: string, code?: string }`
3. WHEN an API request fails due to server error, THE System SHALL return status 500-599 and format `{ success: false, error: string }`
4. WHEN creating a new resource, THE System SHALL return HTTP status 201 (Created)
5. WHEN a resource is not found, THE System SHALL return HTTP status 404 (Not Found)
6. WHEN a duplicate resource is detected, THE System SHALL return HTTP status 409 (Conflict)
7. WHEN authentication fails, THE System SHALL return HTTP status 401 (Unauthorized)
8. WHERE API errors occur, THE System SHALL use standardized error handling functions from `src/lib/api-response.ts`

### Requirement 3: Component Architecture Optimization

**User Story:** As a developer, I want properly structured Server and Client Components, so that bundle size is minimized and performance is optimized.

#### Acceptance Criteria

1. WHEN a component requires interactivity (state, events, hooks), THE System SHALL mark it as a Client Component with 'use client' directive
2. WHEN a component only renders static content or fetches data, THE System SHALL implement it as a Server Component without 'use client' directive
3. WHERE the ZukanClient component exists, THE System SHALL decompose it into focused components with single responsibilities
4. WHEN composing components, THE System SHALL follow the Server → Client one-way direction, passing only serializable data from Server to Client Components
5. WHERE heavy components exist (ImageCropper, AdminPanel), THE System SHALL implement dynamic imports with loading states
6. WHEN measuring bundle size, THE System SHALL ensure the main bundle is less than 250KB

### Requirement 4: Type Safety Enhancement

**User Story:** As a developer, I want comprehensive TypeScript types and validation, so that runtime errors are prevented.

#### Acceptance Criteria

1. WHEN defining data structures, THE System SHALL use readonly properties for immutable data
2. WHEN accepting API requests, THE System SHALL validate input using Zod schemas
3. WHERE dates are used, THE System SHALL use ISO 8601 string format with branded types for type safety
4. WHEN defining component props, THE System SHALL use explicit TypeScript interfaces
5. WHERE URLs are handled, THE System SHALL use branded string types (UrlString) instead of URL objects to ensure RSC/JSON boundary compatibility

### Requirement 5: Performance Optimization

**User Story:** As a user, I want fast page loads and smooth interactions, so that my experience is optimal.

#### Acceptance Criteria

1. WHEN measuring Lighthouse performance score, THE System SHALL achieve a score of 90 or higher
2. WHEN measuring Largest Contentful Paint (LCP), THE System SHALL complete within 2.5 seconds
3. WHEN measuring First Input Delay (FID), THE System SHALL respond within 100 milliseconds
4. WHEN measuring Cumulative Layout Shift (CLS), THE System SHALL maintain a score below 0.1
5. WHERE images are displayed, THE System SHALL use Next.js Image component with proper width, height, and loading attributes
6. WHEN loading heavy components, THE System SHALL implement code splitting with dynamic imports

### Requirement 6: Comprehensive E2E Testing

**User Story:** As a QA engineer, I want comprehensive end-to-end tests, so that all user flows are verified automatically.

#### Acceptance Criteria

1. WHEN testing the gallery, THE System SHALL verify avatar loading, virtual scrolling, search functionality, and detail modal opening
2. WHEN testing the admin panel, THE System SHALL verify login, avatar creation, editing, deletion, and attribute management
3. WHEN testing PWA functionality, THE System SHALL verify service worker registration, offline support, and installability
4. WHERE user interactions occur, THE System SHALL test across Chrome, Firefox, Safari, and Edge browsers
5. WHEN running E2E tests, THE System SHALL achieve 100% pass rate for critical user flows
6. WHERE mobile devices are targeted, THE System SHALL test responsive behavior on iPhone, Android, and iPad viewports

### Requirement 7: Performance Testing

**User Story:** As a performance engineer, I want automated performance testing, so that regressions are caught early.

#### Acceptance Criteria

1. WHEN running Lighthouse audits, THE System SHALL meet thresholds: Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥90, PWA ≥90
2. WHEN measuring Core Web Vitals, THE System SHALL verify LCP <2.5s, FID <100ms, CLS <0.1
3. WHERE bundle analysis is performed, THE System SHALL verify main bundle <250KB and proper code splitting
4. WHEN testing page load times, THE System SHALL complete initial render within 1.5 seconds on 3G networks
5. WHERE images are loaded, THE System SHALL verify lazy loading and proper optimization

### Requirement 8: Security Testing

**User Story:** As a security engineer, I want automated security tests, so that vulnerabilities are prevented.

#### Acceptance Criteria

1. WHEN testing authentication, THE System SHALL prevent unauthorized access to admin endpoints
2. WHEN testing input validation, THE System SHALL reject XSS payloads and malicious file uploads
3. WHERE passwords are compared, THE System SHALL use timing-safe comparison to prevent timing attacks
4. WHEN testing session management, THE System SHALL verify HTTP-only cookies and proper expiration
5. WHERE user input is displayed, THE System SHALL verify HTML sanitization and entity encoding

### Requirement 9: Cross-Browser Compatibility

**User Story:** As a user, I want the application to work consistently across all major browsers, so that my experience is reliable.

#### Acceptance Criteria

1. WHEN testing on Chrome, Firefox, Safari, and Edge, THE System SHALL render correctly and function identically
2. WHERE touch interactions are used, THE System SHALL work properly on mobile devices
3. WHEN testing responsive design, THE System SHALL adapt to screen sizes from 320px to 3840px width
4. WHERE browser-specific features are used, THE System SHALL provide appropriate fallbacks

### Requirement 10: Cloudflare Edge Runtime Compatibility

**User Story:** As a developer, I want all dependencies to be compatible with Cloudflare Workers/Pages, so that the application runs reliably on the edge.

#### Acceptance Criteria

1. WHEN adding dependencies, THE System SHALL verify compatibility with Cloudflare Workers runtime
2. WHERE Node.js-specific APIs are needed, THE System SHALL use edge-compatible alternatives (node-html-parser instead of cheerio, linkedom for DOM)
3. WHEN processing images, THE System SHALL use browser-based solutions (Canvas/Squoosh WASM) or Cloudflare Images API
4. WHERE Buffer operations are needed, THE System SHALL use Web APIs (Uint8Array, TextEncoder/TextDecoder)
5. WHEN using file system operations, THE System SHALL use R2 bucket instead of fs module
6. WHERE HTML parsing is required, THE System SHALL use node-html-parser or linkedom instead of cheerio

### Requirement 11: Concurrent Update Protection

**User Story:** As a developer, I want CSV updates to be protected from concurrent modifications, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN updating CSV data in R2, THE System SHALL use ETag-based optimistic locking with If-Match header
2. WHERE concurrent updates are detected, THE System SHALL return HTTP status 409 (Conflict)
3. WHEN a conflict occurs, THE System SHALL provide retry guidance in the error response
4. WHERE multiple write operations exist, THE System SHALL use a shared locking mechanism
5. IF optimistic locking is insufficient, THE System SHALL consider Durable Objects for exclusive control

### Requirement 12: Observability and Error Tracking

**User Story:** As a developer, I want comprehensive error tracking and logging, so that issues can be diagnosed quickly.

#### Acceptance Criteria

1. WHEN an error occurs, THE System SHALL generate a unique errorId and include it in the response
2. WHERE errors are logged, THE System SHALL include structured data (requestId, route, status, stack, timestamp)
3. WHEN API errors occur, THE System SHALL categorize them by type (VRChatAPIError, ValidationError, ConflictError, NotFoundError)
4. WHERE production errors occur, THE System SHALL send them to an external monitoring service (Sentry/OpenTelemetry)
5. WHEN debugging issues, THE System SHALL provide errorId-based log correlation

### Requirement 13: Security Hardening

**User Story:** As a security engineer, I want comprehensive security measures, so that the application is protected from common attacks.

#### Acceptance Criteria

1. WHEN setting HTTP headers, THE System SHALL include CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options
2. WHERE admin login is attempted, THE System SHALL implement rate limiting by IP and fingerprint
3. WHEN storing passwords, THE System SHALL use bcryptjs or argon2-wasm instead of SHA-256
4. WHERE CSRF protection is needed, THE System SHALL implement Double Submit Cookie or SameSite + CSRF token
5. WHEN handling cookies, THE System SHALL set HttpOnly, SameSite=Strict, and Secure attributes
6. WHERE Cloudflare Turnstile is available, THE System SHALL integrate it for bot protection

### Requirement 14: Deployment Verification

**User Story:** As a DevOps engineer, I want automated deployment verification, so that production issues are caught immediately.

#### Acceptance Criteria

1. WHEN deployment completes, THE System SHALL verify all critical pages return HTTP 200 status
2. WHERE Cloudflare bindings are used, THE System SHALL verify R2 bucket and KV namespace connectivity
3. WHEN testing admin functionality, THE System SHALL verify authentication and CRUD operations work in production
4. WHERE environment variables are required, THE System SHALL verify all required variables are set
5. WHEN testing PWA installation, THE System SHALL verify manifest.json and service worker are accessible
