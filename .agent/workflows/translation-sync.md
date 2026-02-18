---
description: Regenerate EN/KO translation data from JA source CSV, validate, commit, and push. Use after editing JA CSV or category maps.
---

# Translation Sync Workflow

// turbo-all

## Prerequisites

Before running this workflow, ensure:
- You are on the correct feature branch
- Any new JA category tokens have been added to:
  - `scripts/category-ja-en-map.js`
  - `scripts/category-definitions-ko.js`
- The JA source CSV (`data/akyo-data-ja.csv`) has been updated

## Step 1: Regenerate EN CSV from JA

```bash
node scripts/sync-akyo-data-en-from-ja.js
```

If this fails with "Missing category translations", add the missing categories to `scripts/category-ja-en-map.js` and re-run.

## Step 2: Regenerate KO CSV and JSON from JA

```bash
node scripts/generate-ko-data.js
```

## Step 3: Regenerate all JSON cache files

```bash
npx --yes tsx scripts/csv-to-json.ts
```

## Step 4: Validate CSV structure

```bash
npm run test:csv
```

If validation fails, fix the CSV data and re-run from Step 1.

## Step 5: Validate TypeScript types

```bash
npx tsc --noEmit --incremental false
```

## Step 6: Stage and commit

```bash
git add data/ scripts/category-ja-en-map.js scripts/category-definitions-ko.js
git status --short
```

Then commit with a descriptive message summarizing the changes.

## Step 7: Push

```bash
git push
```
