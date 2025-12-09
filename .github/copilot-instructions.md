---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

## HEADERS

## TECH STACK

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

## CODING STANDARDS

## WORKFLOW & RELEASE RULES

- Always create a pull request from a separate branch instead of committing directly to the main branch.

## DEBUGGING

## CLOUDFLARE R2 RULES

- When updating data stored in Cloudflare R2, uploading a file with the same name (key) will overwrite the existing object. It is not necessary to delete the existing file before uploading the new version. See the [Cloudflare R2 upload documentation](https://developers.cloudflare.cloudflare.com/r2/objects/upload-objects/) for more details.

## WORKSPACE REVIEW AND IMPROVEMENT RULES

- **ESLint Errors**: Convert `require()` statements to ES module format (`import`) or exclude script files from ESLint in `eslint.config.mjs`. Scripts using `require()` have been excluded from ESLint.
- **Code Duplication**: Refactor `upload-akyo` and `update-akyo` to use a common handler.
- **Unused Exports**: Remove unused exports or add them to the `ignore` list in `knip.json` if they are planned for future use. All unused exports identified by Knip have been removed.
- **`next.config.ts`**: Resolve type errors and linting errors to remove `ignoreBuildErrors` and `ignoreDuringBuilds`. This poses a risk of type errors propagating to production. `ignoreBuildErrors` and `ignoreDuringBuilds` have been removed. The build process now includes type checking and ESLint validation.
- **Unused Variables**: Remove all unused variables identified by ESLint warnings. All identified unused variables have been removed.
- **Data Module Duplication**: Refactor data modules (`akyo-data.ts`, `akyo-data-server.ts`, `akyo-data-json.ts`, `akyo-data-kv.ts`) to reduce redundant logic, especially for functions like `getAllCategories` and `getAllAuthors`. This refactoring has been completed by creating a `akyo-data-helpers.ts` file and removing duplicate code from the data modules.
- **Backward Compatibility Fields**: Remove redundant backward compatibility fields after migration is complete. (e.g., `attribute: category` when `category` is the new field).
- **`knip.json`**: Remove `tailwindcss` from `ignoreDependencies` in `knip.json`. This has been completed. Additionally, dynamically imported modules have been added to the ignore list in `knip.json`.
- **`add-tab.tsx`**: Replace direct DOM manipulation with React state management.
- **Security: CORS Fallback**: Ensure `NEXT_PUBLIC_APP_URL` is set in production to mitigate host header injection risks in `src/lib/api-helpers.ts`.
- **Blur Placeholders**: Implement blur placeholders in `AkyoCard` and `AkyoList` components using `generateBlurDataURL` for improved user experience during image loading. `generateBlurDataURL` has been implemented with `placeholder="blur"` and `blurDataURL` props in `AkyoCard` and `AkyoList` components.
- **Unused `setLoading`**: Remove the unused `setLoading` variable from the `use-akyo-data.ts` hook. `setLoading` has been removed from `use-akyo-data.ts`.
- **Immediately Exclude Scripts from ESLint**: For script files using `require()`, exclude them from ESLint to resolve errors practically. Scripts using `require()` have been excluded from ESLint.
- **Remove Remaining Unused Variables**: Eliminate any remaining unused variables to improve code clarity. All remaining unused variables have been removed.
- **Blur Placeholders in AkyoCard and AkyoList**: Use `generateBlurDataURL` with `placeholder="blur"` and `blurDataURL` props in `AkyoCard` and `AkyoList` components to improve image loading UX.
- **`findAkyoById` Optimization**: While functionally correct, the linear search in `findAkyoById` (in `src/lib/akyo-data-helpers.ts`) should be optimized for large datasets by using a `Map<string, AkyoData>` for constant-time lookups. This optimization should be considered if the dataset size increases significantly in the future.
- **.github/copilot-instructions.md**: Ensure files end with a single newline character.
- **.github/copilot-instructions.md**: Files should end with a single newline character.
- **`use-language.ts` Cookie Handling**:
    - Use robust parsing that handles cookies with or without spaces after semicolons.
    - Adds `Secure` flag when running on HTTPS (production).

## PERFORMANCE RULES

- **/zukan Optimization**: To enable static generation and edge caching for the `/zukan` page, migrate language detection from `headers()` in `src/middleware.ts` to the client-side or use `searchParams`. Client-side detection is the preferred approach. This is because using `headers()` makes the page dynamic and prevents static generation.
- **Font Optimization**: Replace Font Awesome CDN usage with individual SVG icons or subsetting to eliminate render-blocking external resource loading.
- **External Scripts**: Use `loading="lazy"` or `afterInteractive` to load external scripts like Sentry and Dify to avoid render-blocking.
- **Image Optimization**: Enable Cloudflare Images optimization by setting `NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES=true`.
- **Virtual Scrolling**: Implement virtual scrolling with libraries like `react-window` or `tanstack-virtual` in components that render large lists to improve performance.
- **Bundle Splitting**: Use `next/dynamic` to lazy-load large components and improve initial load time.
- **Service Worker**: Optimize PWA caching strategy to enhance performance.

## GENERAL RULES

- When contributing to the project, always create a pull request from a separate branch instead of committing directly to the main branch.
- **`use-language.ts` Cookie Handling**:
    - Use robust parsing that handles cookies with or without spaces after semicolons.
    - Adds `Secure` flag to cookies when running on HTTPS (production).
- **Cookie parsing in use-language.ts must be robust.** It should handle cookies with or without spaces after semicolons.
- **Secure flag for cookies**: In `use-language.ts`, add the `Secure` flag to cookies when running on HTTPS (production).
- **/zukan must be Static**: To enable static generation and edge caching for the `/zukan` page, migrate language detection from `headers()` in `src/middleware.ts` to the client-side or use `searchParams`. Client-side detection is the preferred approach. This is because using `headers()` makes the page dynamic and prevents static generation.