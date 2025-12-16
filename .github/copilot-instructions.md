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
- **`next.config.ts`**: Resolve type errors and linting errors to remove `ignoreBuildErrors` and `ignoreDuringBuilds` flags. `ignoreBuildErrors` and `ignoreDuringBuilds` have been removed. The build process now includes type checking and ESLint validation.
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
- **/zukan now static**
- Convert &#96;require()&#96; statements to ES module format (&#96;import&#96;) or exclude script files from ESLint in &#96;eslint.config.mjs&#96;. Scripts using &#96;require()&#96; have been excluded from ESLint.
- Remove unused exports or add them to the &#96;ignore&#96; list in &#96;knip.json&#96; if planned for future use.
- Remove all unused variables identified by ESLint warnings.
- Resolve type errors and linting errors to remove &#96;ignoreBuildErrors&#96; and &#96;ignoreDuringBuilds&#96; flags.
- Refactor data modules (&#96;akyo-data.ts&#96;, &#96;akyo-data-server.ts&#96;, &#96;akyo-data-json.ts&#96;, &#96;akyo-data-kv.ts&#96;) to reduce redundant logic, especially for functions like &#96;getAllCategories&#96; and &#96;getAllAuthors&#96;.

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
- To prevent the English categorizer from adding fictional tags based on substring matches for "Oni," use a regular expression to restrict matching to whole words or adjust the keyword list so "Oni" does not hit "Onion."
- The `/zukan` server component should use `searchParams` to support language switching.
- In `scripts/fix-categories.js`, guard against null/undefined/empty `oldCategory` to prevent TypeError. Use `(oldCategory || '').replace(...)` or check if `oldCategory` is truthy before calling replace.
- In `scripts/fix-categories-en.js`, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift.
- キウイはフルーツ、キーウィは鳥として分類する。
- Ensure the `needsRefetch` flag is leveraged to fully support multi-language data, and if a language mismatch is detected, data should be re-fetched client-side.
- Store CDN URLs as environment variables for flexibility.
- For view toggle buttons, always include the `type="button"` attribute to avoid accidental form submissions.
- In `scripts/fix-categories-en.js` around lines 66 to 78, the local costumeKeywords and occupationKeywords arrays are out of sync with the canonical lists in category-definitions-en.js; replace the hardcoded arrays with the canonical definitions (or import/require the arrays from category-definitions-en.js) and correct typos (e.g., change "John" to "Jong"/"John" per canonical, normalize "Kids" → "Kid", add missing entries like "Muffler" and the 22+ missing occupation keywords such as Athlete, Baseball, Soccer, Model, Actor, Painter, Writer, Mangaka, Engineer, Programmer, Cabin Attendant, Waitress, Diver, etc., and remove/replace extras like "Mail", "Postal", "Foot Soldier", "Miko", "Shrine" with the canonical forms "Station Staff" and "Shrine Maiden"); ensure comparisons use normalized lowercase forms and consider centralizing the keyword lists so future changes occur in one place.
- In `scripts/fix-categories.js` around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying the missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In `scripts/fix-categories.js` around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and are handled safely.
- In scripts/fix-categories-en.js around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift and ensure that the code correctly handles the Costume & Occupation categories, and also include the same fix in  `scripts/fix-categories.js`.
- In `scripts/fix-categories.js` around lines 33 to 40, move the vegetables array into `category-definitions-ja.js` as a named export (e.g., vegetables or vegetableKeywords), update `category-definitions-ja.js` to export it, then replace the hardcoded array in `scripts/fix-categories.js` with an import of that named export and remove the local declaration. Ensure the import path is correct and run tests/lint to verify no unused variables or import errors.
- Fix a bug in the English categorizer that causes fictional tags to be added based on substring matches. Because FICTIONAL_KEYWORDS contains the term "Oni", any nickname containing "Oni", any nickname containing "Onion" now matches and is labeled as Yokai (e.g., IDs 0427 and 0428 "Grocer/Farmer Green Onion Akyo"). Restrict matching to whole words or adjust the keyword list so "Oni" does not hit "Onion."
- In `scripts/update-categories-en-v3.js` and `scripts/update-categories-v3.js`:
    - Extract language-specific keyword objects into separate modules (`scripts/category-definitions-en.js`, `scripts/category-definitions-ja.js`).
    - Move shared `processCategories` logic into a common module (`scripts/update-categories-common.js`).
    - Remove unnecessary `async` keyword from `main()` functions if no `await` is used.
    - Either remove `relax_quotes` and `relax_column_count` options to enforce strict CSV parsing, or add comments explaining why they are needed and implement post-parse validation.
- In `scripts/fix-categories.js` around lines 59 to 61, the current findAkyoById uses a linear search which is functionally correct but can be optimized for large datasets; to fix, change the data structure to a Map<string, AkyoData> (or maintain a cached Map alongside the array) and update callers to use map.get(id) returning null when undefined, or implement a small helper that builds and caches the Map on first lookup to provide O(1) lookups for larger datasets.
- In `scripts/category-definitions-en.js` and `scripts/category-definitions-ja.js` ensure that the learnings from the CodeRabbit tool are incorporated in the code.
- In `scripts/fix-categories.js` and `scripts/fix-categories-en.js` ensure that all high priority issues are addressed.
- In `src/app/zukan/page.tsx` use `searchParams` to support language switching.
- Remove duplicate entries from Dish array in category-definitions-en.js
- Refactor category update scripts and fix Onion bug:
    - Create akyo-data-helpers.ts with common extractCategories, extractAuthors, findAkyoById

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
- Designate \"ヒョウモントカゲモドキ\" as \"Animal/Dog\".
- Designate \"DDT\" as \"パロディ/どんどん亭\".
- In cases where a category is hierarchical, create the individual categories also.
- Ensure files end with a single newline character.
- If oldCategory is null/undefined/empty, guard against that in `scripts/fix-categories.js`. Use `(oldCategory || '').replace(...)` or check if `oldCategory` is truthy before calling replace.
- In `scripts/fix-categories-en.js`, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift.
- キウイはフルーツ、キーウィは鳥として分類する。
- Ensure the `needsRefetch` flag is leveraged to fully support multi-language data, and if a language mismatch is detected, data should be re-fetched client-side.
- Store CDN URLs as environment variables for flexibility.
- For view toggle buttons, always include the `type="button"` attribute to avoid accidental form submissions.
- In `scripts/fix-categories-en.js` around lines 66 to 78, the local costumeKeywords and occupationKeywords arrays are out of sync with the canonical lists in category-definitions-en.js; replace the hardcoded arrays with the canonical definitions (or import/require the arrays from category-definitions-en.js) and correct typos (e.g., change "John" to "Jong"/"John" per canonical, normalize "Kids" → "Kid", add missing entries like "Muffler" and the 22+ missing occupation keywords such as Athlete, Baseball, Soccer, Model, Actor, Painter, Writer, Mangaka, Engineer, Programmer, Cabin Attendant, Waitress, Diver, etc., and remove/replace extras like "Mail", "Postal", "Foot Soldier", "Miko", "Shrine" with the canonical forms "Station Staff" and "Shrine Maiden"); ensure comparisons use normalized lowercase forms and consider centralizing the keyword lists so future changes occur in one place.
- In `scripts/fix-categories.js` around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying the missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In `scripts/fix-categories.js` around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and are handled safely.
- In scripts/fix-categories-en.js around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift and ensure that the code correctly handles the Costume & Occupation categories, and also include the same fix in  `scripts/fix-categories.js`.
- In `scripts/fix-categories.js` around lines 33 to 40, move the vegetables array into `category-definitions-ja.js` as a named export (e.g., vegetables or vegetableKeywords), update `category-definitions-ja.js` to export it, then replace the hardcoded array in `scripts/fix-categories.js` with an import of that named export and remove the local declaration. Ensure the import path is correct and run tests/lint to verify no unused variables or import errors.
- Fix a bug in the English categorizer that causes fictional tags to be added based on substring matches. Because FICTIONAL_KEYWORDS contains the term "Oni", any nickname containing "Oni", any nickname containing "Onion" now matches and is labeled as Yokai (e.g., IDs 0427 and 0428 "Grocer/Farmer Green Onion Akyo"). Restrict matching to whole words or adjust the keyword list so "Oni" does not hit "Onion."
- In `scripts/update-categories-en-v3.js` and `scripts/update-categories-v3.js`:
    - Extract language-specific keyword objects into separate modules (`scripts/category-definitions-en.js`, `scripts/category-definitions-ja.js`).
    - Move shared `processCategories` logic into a common module (`scripts/update-categories-common.js`).
    - Remove unnecessary `async` keyword from `main()` functions if no `await` is used.
    - Either remove `relax_quotes` and `relax_column_count` options to enforce strict CSV parsing, or add comments explaining why they are needed and implement post-parse validation.
- In `scripts/fix-categories.js` around lines 59 to 61, the current findAkyoById uses a linear search which is functionally correct but can be optimized for large datasets; to fix, change the data structure to a Map<string, AkyoData> (or maintain a cached Map alongside the array) and update callers to use map.get(id) returning null when undefined, or implement a small helper that builds and caches the Map on first lookup to provide O(1) lookups for larger datasets.
- In `scripts/category-definitions-en.js` and `scripts/category-definitions-ja.js` ensure that the learnings from the CodeRabbit tool are incorporated in the code.
- In `scripts/fix-categories.js` and `scripts/fix-categories-en.js` ensure that all high priority issues are addressed.
- In `src/app/zukan/page.tsx` use `searchParams` to support language switching.
- Remove duplicate entries from Dish array in category-definitions-en.js
- Refactor category update scripts and fix Onion bug:
    - Create akyo-data-helpers.ts with common extractCategories, extractAuthors, findAkyoById
- The following data categorization fixes have been applied:
    - 複数のカテゴリ修正
        -  ないとどらごんAkyo: 職業・家柄、武器・軍事を追加
        -  振袖どらごんAkyo: 季節・行事を追加
        -  カフェどらごんAkyo: 職業・家柄を追加
        -  風船きつねAkyo: 自然を削除
    - fix(data): 食べ物/寿司 → 食べ物/お寿司に変更
    - fix(data): レッサーパンダを動物カテゴリに修正
        -   誤って食べ物/料理に分類されていたため、正しく動物/レッサーパンダに修正
    - fix(data): カテゴリ修正 - なりきり・仮装統合、個別修正
        - データヘルパーの統合、未使用エクスポートの整理
    - fix(data): カテゴリ修正 - ラー神の誤検出を修正
        - マフラー、エラー、ラーメン等が「ラー」（太陽神）にマッチして架空の存在に分類されていたバグを修正
        - 除外パターン（マフラー、エラー、ラーメン、カラー、ドラー、コーラ）を追加
    - fix(data): 複数のAkyoカテゴリを修正
        - キュウリ → 食べ物/野菜/きゅうり
        - ナスビ → 食べ物/野菜/ナス
        - 揚げ物 → 食べ物/料理/揚げ物
    - fix(data): 硬い・柔らかいを階層型カテゴリに変換
        - 硬い → 素材・材質・生地, 素材・材質・生地/硬い
        - 硬い → 素材・材質・生地/硬い
    - fix(data): サウAkyoをパロディ/人物に修正
    - fix(data): 複数のAkyoカテゴリを修正
        - ハウスネイルAkyo: パロディ/ジャム・ザ・ハウスネイルを追加
        - まめひなたAkyo: 自然を削除
        - 胴長パグAkyo: 動物/いぬを追加
        - エプリAkyo: パロディ/VRChatを追加

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
- Designate \"ヒョウモントカゲモドキ\" as \"Animal/Dog\".
- Designate \"DDT\" as \"パロディ/どんどん亭\".
- In cases where a category is hierarchical, create the individual categories also.
- Ensure files end with a single newline character.
- If oldCategory is null/undefined/empty, guard against that in `scripts/fix-categories.js`. Use `(oldCategory || '').replace(...)` or check if `oldCategory` is truthy before calling replace.
- In `scripts/fix-categories-en.js`, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift.
- キウイはフルーツ、キーウィは鳥として分類する。
- Ensure the `needsRefetch` flag is leveraged to fully support multi-language data, and if a language mismatch is detected, data should be re-fetched client-side.
- Store CDN URLs as environment variables for flexibility.
- For view toggle buttons, always include the `type="button"` attribute to avoid accidental form submissions.
- In `scripts/fix-categories-en.js` around lines 66 to 78, the local costumeKeywords and occupationKeywords arrays are out of sync with the canonical lists in category-definitions-en.js; replace the hardcoded arrays with the canonical definitions (or import/require the arrays from category-definitions-en.js) and correct typos (e.g., change "John" to "Jong"/"John" per canonical, normalize "Kids" → "Kid", add missing entries like "Muffler" and the 22+ missing occupation keywords such as Athlete, Baseball, Soccer, Model, Actor, Painter, Writer, Mangaka, Engineer, Programmer, Cabin Attendant, Waitress, Diver, etc., and remove/replace extras like "Mail", "Postal", "Foot Soldier", "Miko", "Shrine" with the canonical forms "Station Staff" and "Shrine Maiden"); ensure comparisons use normalized lowercase forms and consider centralizing the keyword lists so future changes occur in one place.
- In `scripts/fix-categories.js` around lines 56-57, the local costumeKeywords and occupationKeywords arrays are out of sync with scripts/category-definitions-ja.js causing missing replacements; update them to match the canonical COSTUME_KEYWORDS and OCCUPATION_KEYWORDS by either importing those arrays from scripts/category-definitions-ja.js or copying the missing entries into this file — specifically add 'ゆかた' and 'スク水' to costumeKeywords and add '職業', 'キャビンアテンダント', 'ウェイトレス', 'モデル', '俳優', '声優', '画家', '作家', '漫画家', 'エンジニア', 'プログラマー', 'スポーツ選手', '野球', 'サッカー', 'テニス', 'バスケ', 'バレー', '水泳', '陸上', '柔道', '剣道', '弓道', '相撲', 'ボクシング', 'プロレス' to occupationKeywords (prefer importing to avoid future drift).
- In `scripts/fix-categories.js` around lines 40 to 46, the code calls oldCategory.replace(...) which throws if oldCategory is null/undefined/empty; guard against that by treating missing category as an empty string or skipping the row: check if oldCategory is truthy before calling replace, and set categories = [] (or use (oldCategory || '').replace(...)) so empty-category rows do not cause a TypeError and are handled safely.
- In scripts/fix-categories-en.js around lines 67 to 80, replace hard-coded split-category string literals with the canonical names from the definitions CONFIG to avoid drift and ensure that the code correctly handles the Costume & Occupation categories, and also include the same fix in  `scripts/fix-categories.js`.
- In `scripts/fix-categories.js` around lines 33 to 40, move the vegetables array into `category-definitions-ja.js` as a named export (e.g., vegetables or vegetableKeywords), update `category-definitions-ja.js` to export it, then replace the hardcoded array in `scripts/fix-categories.js` with an import of that named export and remove the local declaration. Ensure the import path is correct and run tests/lint to verify no unused variables or import errors.
- Fix a bug in the English categorizer that causes fictional tags to be added based on substring matches. Because FICTIONAL_KEYWORDS contains the term "Oni", any nickname containing "Oni", any nickname containing "Onion" now matches and is labeled as Yokai (e.g., IDs 0427 and 0428 "Grocer/Farmer Green Onion Akyo"). Restrict matching to whole words or adjust the keyword list so "Oni" does not hit "Onion."
- In `scripts/update-categories-en-v3.js` and `scripts/update-categories-v3.js`:
    - Extract language-specific keyword objects into separate modules (`scripts/category-definitions-en.js`, `scripts/category-definitions-ja.js`).
    - Move shared `processCategories` logic into a common module (`scripts/update-categories-common.js`).
    - Remove unnecessary `async` keyword from `main()` functions if no `await` is used.
    - Either remove `relax_quotes` and `relax_column_count` options to enforce strict CSV parsing, or add comments explaining why they are needed and implement post-parse validation.
- In `scripts/fix-categories.js` around lines 59 to 61, the current findAkyoById uses a linear search which is functionally correct but can be optimized for large datasets; to fix, change the data structure to a Map<string, AkyoData> (or maintain a cached Map alongside the array) and update callers to use map.get(id) returning null when undefined, or implement a small helper that builds and caches the Map on first lookup to provide O(1) lookups for larger datasets.
- In `scripts/category-definitions-en.js` and `scripts/category-definitions-ja.js` ensure that the learnings from the CodeRabbit tool are incorporated in the code.
- In `scripts/fix-categories.js` and `scripts/fix-categories-en.js` ensure that all high priority issues are addressed.
- In `src/app/zukan/page.tsx` use `searchParams` to support language switching.
- Remove duplicate entries from Dish array in category-definitions-en.js
- Refactor category update scripts and fix Onion bug:
    - Create akyo-data-helpers.ts with common extractCategories, extractAuthors, findAkyoById
- The following data categorization fixes have been applied:
    - 複数のカテゴリ修正
        -  ないとどらごんAkyo: 職業・家柄、武器・軍事を追加
        -  振袖どらごんAkyo: 季節・行事を追加
        -  カフェどらごんAkyo: 職業・家柄を追加
        -  風船きつねAkyo: 自然を削除
    - fix(data): 食べ物/寿司 → 食べ物/お寿司に変更
    - fix(data): レッサーパンダを動物カテゴリに修正
        -   誤って食べ物/料理に分類されていたため、正しく動物/レッサーパンダに修正
    - fix(data): カテゴリ修正 - なりきり・仮装統合、個別修正
        - データヘルパーの統合、未使用エクスポートの整理
    - fix(data): カテゴリ修正 - ラー神の誤検出を修正
        - マフラー、エラー、ラーメン等が「ラー」（太陽神）にマッチして架空の存在に分類されていたバグを修正
        - 除外パターン（マフラー、エラー、ラーメン、カラー、ドラー、コーラ）を追加
    - fix(data): 複数のAkyoカテゴリを修正
        - キュウリ → 食べ物/野菜/きゅうり
        - ナスビ → 食べ物/野菜/ナス
        - 揚げ物 → 食べ物/料理/揚げ物
    - fix(data): 硬い・柔らかいを階層型カテゴリに変換
        - 硬い → 素材・材質・生地, 素材・材質・生地/硬い
        - 硬い → 素材・材質・生地/硬い
    - fix(data): サウAkyoをパロディ/人物に修正
    - fix(data): 複数のAkyoカテゴリを修正
        - ハウスネイルAkyo: パロディ/ジャム・ザ・ハウスネイルを追加
        - まめひなたAkyo: 自然を削除
        - 胴長パグAkyo: 動物/いぬを追加
        - エプリAkyo: パロディ/VRChatを追加
- The following data categorization fixes have been applied:
    - fix(data): 複数のカテゴリ修正
        -  ないとどらごんAkyo: 職業・家柄、武器・軍事を追加
        -  振袖どらごんAkyo: 季節・行事を追加
        -  カフェどらごんAkyo: 職業・家柄を追加
        -  風船きつねAkyo: 自然を削除
        -  食べ物/寿司 → 食べ物/お寿司に変更
        -  レッサーパンダを動物カテゴリに修正
            -   誤って食べ物/料理に分類されていたため、正しく動物/レッサーパンダに修正
        - カテゴリ修正 - なりきり・仮装統合、個別修正
            - データヘルパーの統合、未使用エクスポートの整理
        -  カテゴリ修正 - ラー神の誤検出を修正
            - マフラー、エラー、ラーメン等が「ラー」（太陽神）にマッチして架空の存在に分類されていたバグを修正
            - 除外パターン（マフラー、エラー、ラーメン、カラー、ドラー、コーラ）を追加
        - 複数のAkyoカテゴリを修正
            - キュウリ → 食べ物/野菜/きゅうり
            - ナスビ → 食べ物/野菜/ナス
            - 揚げ物 → 食べ物/料理/揚げ物
        - 硬い・柔らかいを階層型カテゴリに変換
            - 硬い → 素材・材質・生地, 素材・材質・生地/硬い
            - 硬い → 素材・材質・生地/硬い
        - サウAkyoをパロディ/人物に修正
        - 複数のAkyoカテゴリを修正
            - ハウスネイルAkyo: パロディ/ジャム・ザ・ハウスネイルを追加
            - まめひなたAkyo: 自然を削除
            - 胴長パグAkyo: 動物/いぬを追加
            - エプリAkyo: パロディ/VRChatを追加
- The following data categorization fixes have been applied:
    - 複数のカテゴリ修正
        -  ないとどらごんAkyo: 職業・家柄、武器・軍事を追加
        -  振袖どらごんAkyo: 季節・行事を追加
        -  カフェどらごんAkyo: 職業・家柄を追加
        -  風船きつねAkyo: 自然を削除
        -  食べ物/寿司 → 食べ物/お寿司に変更
        -  レッサーパンダを動物カテゴリに修正
            -   誤って食べ物/料理に分類されていたため、正しく動物/