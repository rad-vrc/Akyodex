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
- **Unused Exports**: Remove unused exports or add them to the `ignore` list in `knip.json` if they are planned for future use.
- **`next.config.ts`**: Resolve type errors and linting errors to remove `ignoreBuildErrors` and `ignoreDuringBuilds`. This poses a risk of type errors propagating to production. `ignoreBuildErrors` and `ignoreDuringBuilds` have been removed. The build process now includes type checking and ESLint validation.
- **Unused Variables**: Remove all unused variables identified by ESLint warnings. All identified unused variables have been removed.
- **Data Module Duplication**: Refactor data modules (`akyo-data.ts`, `akyo-data-server.ts`, `akyo-data-json.ts`, `akyo-data-kv.ts`) to reduce redundant logic, especially for functions like `getAllCategories` and `getAllAuthors`.
- **Backward Compatibility Fields**: Remove redundant backward compatibility fields after migration is complete. (e.g., `attribute: category` when `category` is the new field).
- **`knip.json`**: Remove `tailwindcss` from `ignoreDependencies` in `knip.json`.
- **`add-tab.tsx`**: Replace direct DOM manipulation with React state management.
- **Security: CORS Fallback**: Ensure `NEXT_PUBLIC_APP_URL` is set in production to mitigate host header injection risks in `src/lib/api-helpers.ts`.
- **Blur Placeholders**: Implement blur placeholders in `AkyoCard` and `AkyoList` components using `generateBlurDataURL` for improved user experience during image loading. `generateBlurDataURL` has been implemented with `placeholder="blur"` and `blurDataURL` props in `AkyoCard` and `AkyoList` components.
- **Unused `setLoading`**: Remove the unused `setLoading` variable from the `use-akyo-data.ts` hook. `setLoading` has been removed from `use-akyo-data.ts`.
- **Immediately Exclude Scripts from ESLint**: For script files using `require()`, exclude them from ESLint to resolve errors practically. Scripts using `require()` have been excluded from ESLint.
- **Remove Remaining Unused Variables**: Eliminate any remaining unused variables to improve code clarity.
- **Blur Placeholders in AkyoCard and AkyoList**: Use `generateBlurDataURL` with `placeholder="blur"` and `blurDataURL` props in `AkyoCard` and `AkyoList` components to improve image loading UX.