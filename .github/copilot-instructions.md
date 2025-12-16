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
- **Blur Placeholders**: Implement blur placeholders in &#96;AkyoCard&#96; and &#96;AkyoList&#96; components using &#96;generateBlurDataURL&#96; for improved user experience during image loading. &#96;generateBlurDataURL&#96; has been implemented with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props in &#96;AkyoCard&#96; and &#96;AkyoList&#96; components.
- **Unused `setLoading`**: Remove the unused &#96;setLoading&#96; variable from the &#96;use-akyo-data.ts&#96; hook. &#96;setLoading&#96; has been removed from &#96;use-akyo-data.ts&#96;.
- **Immediately Exclude Scripts from ESLint**: For script files using &#96;require()&#96;, exclude them from ESLint to resolve errors practically. Scripts using &#96;require()&#96; have been excluded from ESLint.
- **Remove Remaining Unused Variables**: Eliminate any remaining unused variables to improve code clarity. All remaining unused variables have been removed.
- **Blur Placeholders in AkyoCard and AkyoList**: Use &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props in &#96;AkyoCard&#96; and &#96;AkyoList&#96; components to improve image loading UX.
- **&#96;findAkyoById&#96; Optimization**: While functionally correct, the linear search in &#96;findAkyoById&#96; (in &#96;src/lib/akyo-data-helpers.ts&#96;) should be optimized for large datasets by using a &#96;Map<string, AkyoData>&#96; for constant-time lookups. This optimization should be considered if the dataset size increases significantly in the future.
- **.github/copilot-instructions.md**: Ensure files end with a single newline character.
- **&#96;use-language.ts&#96; Cookie Handling**:
    - Use robust parsing that handles cookies with or without spaces after semicolons.
    - Adds &#96;Secure&#96; flag when running on HTTPS (production).

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
- 0427 and 0428 (“Grocer/Farmer Green Onion Akyo”) are tagged as Yokai despite being vegetables. This misclassifies non-fictional items whenever “Onion” appears. Restrict matching to whole words or adjust the keyword list so “Oni” does not hit “Onion.”
- When fix-categories-en.js splits Costume & Occupation, it pushes Clothing・Costume and Occupation・Status, but the taxonomy updated in this commit defines the costume/occupation buckets as Clothing/Costume and Occupation/Family (see the new costumeCategory/occupationCategory in category-definitions-en.js). Running this script therefore strips the old combined tag and replaces it with categories that the rest of the pipeline never recognizes, leaving the row without any usable costume/occupation classification once update-categories-common runs. The mismatch is independent of input data and happens whenever this script is used to normalize the English CSV.
- The new merge mapping now rewrites any existing 衣装・職業 category to an empty string without adding either of the replacement buckets. For rows whose nickname lacks any of the costume or occupation keywords (e.g., older data where the category was set manually), update-categories-common will now return only 未分類, losing the original classification entirely instead of migrating it to 衣類・衣装 or 職業・家柄. This regression triggers whenever the updater is run on data that still contains the combined category.
- The &#96;/zukan&#96; server component now hardcodes &#96;lang = DEFAULT_LANGUAGE&#96; and always builds the page with the Japanese dataset, so requests with &#96;AKYO_LANG=en&#96; or &#96;Accept-Language: en&#96; no longer fetch the English data that &#96;getAkyoData&#96; supports; the client-side &#96;useLanguage&#96; hook only logs mismatches and never refetches or reloads data. This means English users (or anyone who toggles the language cookie) will always receive Japanese content despite the cookie/header, a regression from the previous implementation that read cookies/headers and fetched the matching dataset.
- In &#96;scripts/fix-categories.js&#96; around lines 40 to 46, the code calls &#96;oldCategory.replace(...)&#96; which throws if &#96;oldCategory&#96; is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if &#96;oldCategory&#96; is truthy before calling replace, and set &#96;categories = []&#96; (or use &#96;(oldCategory || '').replace(...)&#96;) so empty-category rows do not cause a TypeError and are handled safely.
- From 2025-12-16 07:26Z:
    - Remove the single categories for "揚げ物", "きゅうり", and "ナスビ"
    - Designate "ヒョウモントカゲモドキ" as "Animal/Dog"
    - Designate "DDT" as "パロディ/どんどん亭"
    - In cases where a category is hierarchical create the individual categories also
- From 2025-12-16 07:57Z: The following rules apply for data categorization:
    - In &#96;src/app/zukan/page.tsx&#96;
        - The code is meant to use &#96;searchParams&#96;
- The English categorizer adds fictional tags based on substring matches (keywords.some(k => nickname.includes(k))). Because FICTIONAL_KEYWORDS contains the term Oni, any nickname containing “Onion” now matches and is labeled Fictional Being/...—e.g., IDs 0427 and 0428 (“Grocer/Farmer Green Onion Akyo”) are tagged as Yokai despite being vegetables. This misclassifies non-fictional items whenever “Onion” appears. Restrict matching to whole words or adjust the keyword list so “Oni” does not hit “Onion.”
- From 2025-12-10 09:13Z: In &#96;scripts/fix-categories.js&#96; around lines 40 to 46, the code calls &#96;oldCategory.replace(...)&#96; which throws if &#96;oldCategory.replace(...)&#96; which throws if &#96;oldCategory&#96; is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if &#96;oldCategory&#96; is truthy before calling replace, and set &#96;categories = []&#96; (or use &#96;(oldCategory || '').replace(...)&#96;) so empty-category rows do not cause a TypeError and are handled safely.
- In &#96;scripts/fix-categories-en.js&#96; around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift: read definitions.CONFIG.costumeCategory and definitions.CONFIG.occupationCategory into local constants, use those constants when filtering out the original combined category and when pushing the new categories (instead of 'Clothing/Costume' and 'Occupation/Family'), and keep the same hasCostume/hasOccupation logic but push the CONFIG-backed names; also update the initial filter to remove the combined category using definitions.CONFIG.combinedCategory (or the appropriate CONFIG entry) if one exists.
- In scripts/fix-categories.js around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying those missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In scripts/fix-categories.js around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and
- From 2025-12-16 07:26Z:
    - Remove the single categories for "揚げ物", "きゅうり", and "ナスビ"
    - Designate "ヒョウモントカゲモドキ" as "Animal/Dog"
    - Designate "DDT" as "パロディ/どんどん亭"
    - In cases where a category is hierarchical create the individual categories also
- In &#96;src/app/zukan/page.tsx&#96;
    - The code is meant to use &#96;searchParams&#96;
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props for improved user experience during image loading
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules (&#96;akyo-data.ts&#96;, &#96;akyo-data-server.ts&#96;, &#96;akyo-data-json.ts&#96;, &#96;akyo-data-kv.ts&#96;) to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to knip.json : Remove &#96;tailwindcss&#96; from &#96;ignoreDependencies&#96; in &#96;knip.json&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Remove unused exports or add them to the &#96;ignore&#96; list in &#96;knip.json&#96; if planned for future use
- Applies to next.config.ts : Resolve type errors and linting errors in &#96;next.config.ts&#96; to remove &#96;ignoreBuildErrors&#96; and &#96;ignoreDuringBuilds&#96; flags
- Applies to eslint.config.mjs : Exclude script files using &#96;require()&#96; from ESLint in &#96;eslint.config.mjs&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Convert &#96;require()&#96; statements to ES module format (&#96;import&#96;) in scripts and other files
- Applies to **/*.{ts,tsx,js,mjs} : Remove all unused variables identified by ESLint warnings
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- From 2025-12-03_15-1
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props for improved user experience during image loading
- From 2025-12-05 04:43Z: Always create a pull request from a separate branch instead of committing directly to the main branch.
- In &#96;src/hooks/use-language.ts&#96;, use robust parsing that handles cookies with or without spaces after semicolons
- In &#96;src/hooks/use-language.ts&#96;, add the &#96;Secure&#96; flag to cookies when running on HTTPS (production)
- In scripts/fix-categories.js around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so do not cause a TypeError and are handled safely.
- In scripts/update-categories-en-v3.js around lines 12 to 75, the English keyword definitions and processing logic should largely duplicate the Japanese script; refactor by extracting language-specific keyword objects into a new module (e.g., scripts/category-definitions-en.js) and move the shared processCategories logic into a common module (e.g., scripts/update-categories-common.js); then convert this file into a thin entrypoint that imports the common processor and the English definitions and invokes the processor, and create a corresponding Japanese entrypoint that imports the same common processor with the Japanese definitions, updating any require/import paths and tests accordingly.
- In scripts/update-categories-en-v3.js around line 268, the main() function is declared with the async keyword but contains no await usage; remove the unnecessary async modifier by changing the function declaration to a plain function (function main() { ... }) and ensure there are no await expressions inside—if any asynchronous calls are intended, either add appropriate await/Promise handling or keep async, otherwise simply drop async to avoid misleading callers and linter warnings.
- In scripts/update-categories-v3.js around lines 12-75 there are large keyword/category constant blocks duplicated from scripts/update-categories-ja.js; extract these shared constants into a new module scripts/category-definitions-ja.js that exports the keyword arrays/objects, replace the duplicated blocks in both update scripts with imports/requires from that new file, update any variable names to use the imported identifiers, delete the duplicated definitions, and run lint/tests to ensure no reference breakage (use module.exports or ES module exports consistent with the rest of the codebase).
- In scripts/update-categories-v3.js around line 278, the main() function is declared async but contains no await and only uses synchronous fs APIs; remove the async keyword from the function declaration (change "async function main()" to "function main()") so the signature matches its synchronous implementation, and adjust any call sites that relied on main() returning a Promise (e.g., drop .then/.catch or await usage) or alternatively convert file I/O to async/fs.promises if you intended an async function.
- In scripts/update-categories-v3.js around lines 282 to 287, the CSV parser is configured with relax_quotes and relax_column_count which permit malformed CSVs; either remove these options to enforce strict parsing or, if they are required for known bad input, add a concise inline comment explaining why each option is used and add post-parse validation (e.g., expected column count and quote checks) so data integrity is enforced. Ensure the comment documents the specific CSV issues being tolerated and implement simple validation logic after parse to reject or log unexpected rows.
- In scripts/fix-categories-en.js around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift: read definitions.CONFIG.costumeCategory and definitions.CONFIG.occupationCategory into local constants, use those constants when filtering out the original combined category and when pushing the new categories (instead of 'Clothing/Costume' and 'Occupation/Family'), and keep the same hasCostume/hasOccupation logic but push the CONFIG-backed names; also update the initial filter to remove the combined category using definitions.CONFIG.combinedCategory (or the appropriate CONFIG entry) if one exists.
- In scripts/fix-categories.js around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying those missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In scripts/fix-categories.js around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and are handled safely.
- From 2025-12-16 07:26Z:
    - Remove the single categories for "揚げ物", "きゅうり", and "ナスビ"
    - Designate "ヒョウモントカゲモドキ" as "Animal/Dog"
    - Designate "DDT" as "パロディ/どんどん亭"
    - In cases where a category is hierarchical create the individual categories also
- In &#96;src/app/zukan/page.tsx&#96;
    - The code is meant to use &#96;searchParams&#96;
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props for improved user experience during image loading
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules (&#96;akyo-data.ts&#96;, &#96;akyo-data-server.ts&#96;, &#96;akyo-data-json.ts&#96;, &#96;akyo-data-kv.ts&#96;) to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to knip.json : Remove &#96;tailwindcss&#96; from &#96;ignoreDependencies&#96; in &#96;knip.json&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Remove unused exports or add them to the &#96;ignore&#96; list in &#96;knip.json&#96; if planned for future use
- Applies to next.config.ts : Resolve type errors and linting errors in &#96;next.config.ts&#96; to remove &#96;ignoreBuildErrors&#96; and &#96;ignoreDuringBuilds&#96; flags
- Applies to eslint.config.mjs : Exclude script files using &#96;require()&#96; from ESLint in &#96;eslint.config.mjs&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Convert &#96;require()&#96; statements to ES module format (&#96;import&#96;) in scripts and other files
- Applies to **/*.{ts,tsx,js,mjs} : Remove all unused variables identified by ESLint warnings
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- From 2025-12-03_15-1
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props for improved user experience during image loading
- From 2025-12-05 04:43Z: Always create a pull request from a separate branch instead of committing directly to the main branch.
- In &#96;src/hooks/use-language.ts&#96;, use robust parsing that handles cookies with or without spaces after semicolons
- In &#96;src/hooks/use-language.ts&#96;, add the &#96;Secure&#96; flag to cookies when running on HTTPS (production)
- In scripts/fix-categories.js around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so do not cause a TypeError and are handled safely.
- In scripts/update-categories-en-v3.js around lines 12 to 75, the English keyword definitions and processing logic should largely duplicate the Japanese script; refactor by extracting language-specific keyword objects into a new module (e.g., scripts/category-definitions-en.js) and move the shared processCategories logic into a common module (e.g., scripts/update-categories-common.js); then convert this file into a thin entrypoint that imports the common processor and the English definitions and invokes the processor, and create a corresponding Japanese entrypoint that imports the same common processor with the Japanese definitions, updating any require/import paths and tests accordingly.
- In scripts/update-categories-en-v3.js around line 268, the main() function is declared with the async keyword but contains no await usage; remove the unnecessary async modifier by changing the function declaration to a plain function (function main() { ... }) and ensure there are no await expressions inside—if any asynchronous calls are intended, either add appropriate await/Promise handling or keep async, otherwise simply drop async to avoid misleading callers and linter warnings.
- In scripts/update-categories-v3.js around lines 12-75 there are large keyword/category constant blocks duplicated from scripts/update-categories-ja.js; extract these shared constants into a new module scripts/category-definitions-ja.js that exports the keyword arrays/objects, replace the duplicated blocks in both update scripts with imports/requires from that new file, update any variable names to use the imported identifiers, delete the duplicated definitions, and run lint/tests to ensure no reference breakage (use module.exports or ES module exports consistent with the rest of the codebase).
- In scripts/update-categories-v3.js around line 278, the main() function is declared async but contains no await and only uses synchronous fs APIs; remove the async keyword from the function declaration (change "async function main()" to "function main()") so the signature matches its synchronous implementation, and adjust any call sites that relied on main() returning a Promise (e.g., drop .then/.catch or await usage) or alternatively convert file I/O to async/fs.promises if you intended an async function.
- In scripts/update-categories-v3.js around lines 282 to 287, the CSV parser is configured with relax_quotes and relax_column_count which permit malformed CSVs; either remove these options to enforce strict parsing or, if they are required for known bad input, add a concise inline comment explaining why each option is used and add post-parse validation (e.g., expected column count and quote checks) so data integrity is enforced. Ensure the comment documents the specific CSV issues being tolerated and implement simple validation logic after parse to reject or log unexpected rows.
- In scripts/fix-categories-en.js around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift: read definitions.CONFIG.costumeCategory and definitions.CONFIG.occupationCategory into local constants, use those constants when filtering out the original combined category and when pushing the new categories (instead of 'Clothing/Costume' and 'Occupation/Family'), and keep the same hasCostume/hasOccupation logic but push the CONFIG-backed names; also update the initial filter to remove the combined category using definitions.CONFIG.combinedCategory (or the appropriate CONFIG entry) if one exists.
- In scripts/fix-categories.js around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying those missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In scripts/fix-categories.js around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and are handled safely.
- From 2025-12-16 07:26Z:
    - Remove the single categories for "揚げ物", "きゅうり", and "ナスビ"
    - Designate "ヒョウモントカゲモドキ" as "Animal/Dog"
    - Designate "DDT" as "パロディ/どんどん亭"
    - In cases where a category is hierarchical create the individual categories also
- In &#96;src/app/zukan/page.tsx&#96;
    - The code is meant to use &#96;searchParams&#96;
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL&#96; with &#96;placeholder=\\\"blur\\\"&#96; and &#96;blurDataURL&#96; props for improved user experience during image loading
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules (&#96;akyo-data.ts&#96;, &#96;akyo-data-server.ts&#96;, &#96;akyo-data-json.ts&#96;, &#96;akyo-data-kv.ts&#96;) to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to knip.json : Remove &#96;tailwindcss&#96; from &#96;ignoreDependencies&#96; in &#96;knip.json&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Remove unused exports or add them to the &#96;ignore&#96; list in &#96;knip.json&#96; if planned for future use
- Applies to next.config.ts : Resolve type errors and linting errors in &#96;next.config.ts&#96; to remove &#96;ignoreBuildErrors&#96; and &#96;ignoreDuringBuilds&#96; flags
- Applies to eslint.config.mjs : Exclude script files using &#96;require()&#96; from ESLint in &#96;eslint.config.mjs&#96;
- Applies to **/*.{ts,tsx,js,mjs} : Convert &#96;require()&#96; statements to ES module format (&#96;import&#96;) in scripts and other files
- Applies to **/*.{ts,tsx,js,mjs} : Remove all unused variables identified by ESLint warnings
- Applies to **/+({upload,update})-akyo* : Refactor &#96;upload-akyo&#96; and &#96;update-akyo&#96; to use a common handler to reduce code duplication
- Applies to **/akyo-data{,-server,-json,-kv}.ts : Refactor data modules to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;
- Applies to **/akyo-data*.ts : Remove redundant backward compatibility fields after migration is complete (e.g., &#96;attribute: category&#96; when &#96;category&#96; is the new field)
- From 2025-12-03_15-1
- Implement blur placeholders in AkyoCard and AkyoList components using &#96;generateBlurDataURL