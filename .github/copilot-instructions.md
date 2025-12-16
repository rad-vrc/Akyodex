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
- **`next.config.ts`**: Resolve type errors and linting errors to remove `ignoreBuildErrors` and `ignoreDuringBuilds`. `ignoreBuildErrors` and `ignoreDuringBuilds` have been removed. The build process now includes type checking and ESLint validation.
- **Unused Variables**: Remove all unused variables identified by ESLint warnings. All identified unused variables have been removed.
- **Data Module Duplication**: Refactor data modules (`akyo-data.ts`, `akyo-data-server.ts`, `akyo-data-json.ts`, `akyo-data-kv.ts`) to reduce redundant logic, especially for functions like `getAllCategories` and `getAllAuthors`. This refactoring has been completed by creating a `akyo-data-helpers.ts` file and removing duplicate code from the data modules.
- **Backward Compatibility Fields**: Remove redundant backward compatibility fields after migration is complete. (e.g., `attribute: category` when `category` is the new field).
- **`knip.json`**: Remove `tailwindcss` from `ignoreDependencies` in `knip.json`. This has been completed. Additionally, dynamically imported modules have been added to the ignore list in `knip.json`.
- **`add-tab.tsx`**: Replace direct DOM manipulation with React state management.
- **Security: CORS Fallback**: Ensure `NEXT_PUBLIC_APP_URL` is set in production to mitigate host header injection risks in `src/lib/api-helpers.ts`.
- **Blur Placeholders**: Implement blur placeholders in `AkyoCard` and `AkyoList` components using `generateBlurDataURL` for improved user experience during image loading.
- **`findAkyoById` Optimization**: While functionally correct, the linear search in `findAkyoById` (in `src/lib/akyo-data-helpers.ts`) should be optimized for large datasets by using a `Map<string, AkyoData>` for constant-time lookups. This optimization should be considered if the dataset size increases significantly in the future.
- **.github/copilot-instructions.md**: Ensure files end with a single newline character.
- **`use-language.ts` Cookie Handling**:
    - Use robust parsing that handles cookies with or without spaces after semicolons.
    - Adds `Secure` flag to cookies when running on HTTPS (production).

## DATA CATEGORIZATION RULES

- When categorizing akyos, prioritize accuracy and consistency.
- If a character could belong to multiple categories, assign all relevant categories.
- Create hierarchical categories where appropriate (e.g., "Animal/Dog" instead of just "Dog").
- Maintain consistent naming conventions across all categories.
- When adding new categories, consider their impact on existing categorization logic.
- Ensure that all data is properly validated and sanitized.
- To ensure accurate language translations, the English keyword definitions and processing logic should largely duplicate the Japanese script. This should occur in separate files.
- To prevent data loss, ensure all categories are updated when refactoring. For example, when merging categories, ensure that any specific configurations associated with a term are transferred to the new category.
- In cases where a language-specific action is required, such as adding a Secure flag to cookies in HTTPS environments, ensure that the code checks the environment to apply the change appropriately.
- The English categorizer adds fictional tags based on substring matches. Because FICTIONAL_KEYWORDS contains the term "Oni", any nickname containing "Onion" now matches and is labeled as Yokai (e.g., IDs 0427 and 0428 "Grocer/Farmer Green Onion Akyo"). Restrict matching to whole words or adjust the keyword list so "Oni" does not hit "Onion."
- The `/zukan` server component should use `searchParams` to support language switching.
- In `scripts/fix-categories.js`, guard against null/undefined/empty `oldCategory` to prevent TypeError. Use `(oldCategory || '').replace(...)` or check if `oldCategory` is truthy before calling replace.
- In `scripts/fix-categories-en.js`, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift.
- キウイはフルーツ、キーウィは鳥として分類する。

## APPLIES TO RULES

The following rules apply to specific file patterns:

### Data Modules (`**/akyo-data{,-server,-json,-kv}.ts`)
- Refactor data modules to reduce redundant logic, especially for functions like `getAllCategories` and `getAllAuthors`.

### Backward Compatibility (`**/akyo-data*.ts`)
- Remove redundant backward compatibility fields after migration is complete (e.g., `attribute: category` when `category` is the new field).

### Upload/Update Handlers (`**/+({upload,update})-akyo*`)
- Refactor `upload-akyo` and `update-akyo` to use a common handler to reduce code duplication.

### TypeScript/JavaScript Files (`**/*.{ts,tsx,js,mjs}`)
- Remove unused exports or add them to the `ignore` list in `knip.json` if planned for future use.
- Convert `require()` statements to ES module format (`import`) in scripts and other files.
- Remove all unused variables identified by ESLint warnings.

### ESLint Configuration (`eslint.config.mjs`)
- Exclude script files using `require()` from ESLint.

### Next.js Configuration (`next.config.ts`)
- Resolve type errors and linting errors to remove `ignoreBuildErrors` and `ignoreDuringBuilds` flags.

## SCRIPT REFACTORING RULES

- In `scripts/update-categories-en-v3.js` and `scripts/update-categories-v3.js`:
    - Extract language-specific keyword objects into separate modules (`scripts/category-definitions-en.js`, `scripts/category-definitions-ja.js`).
    - Move shared `processCategories` logic into a common module (`scripts/update-categories-common.js`).
    - Remove unnecessary `async` keyword from `main()` functions if no `await` is used.
    - Either remove `relax_quotes` and `relax_column_count` options to enforce strict CSV parsing, or add comments explaining why they are needed and implement post-parse validation.

## SPECIFIC DATA FIXES

- Remove the single categories for "揚げ物", "きゅうり", and "ナスビ" (use hierarchical versions instead).
- Designate "ヒョウモントカゲモドキ" as "Animal/Dog".
- Designate "DDT" as "パロディ/どんどん亭".
- In cases where a category is hierarchical, create the individual categories also.
