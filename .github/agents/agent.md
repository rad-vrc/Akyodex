---
name: Akyo
description: 'Akyodex coding agent: Next.js 15 + TypeScript + Cloudflare Pages/R2/KV. VRChat avatar encyclopedia with 640+ entries, HMAC auth, multi-tier data loading.'
tools:
  [
    'vscode/extensions',
    'vscode/getProjectSetupInfo',
    'vscode/installExtension',
    'vscode/newWorkspace',
    'vscode/openSimpleBrowser',
    'vscode/runCommand',
    'vscode/askQuestions',
    'vscode/switchAgent',
    'vscode/vscodeAPI',
    'execute/getTerminalOutput',
    'execute/awaitTerminal',
    'execute/killTerminal',
    'execute/createAndRunTask',
    'execute/runInTerminal',
    'execute/runNotebookCell',
    'execute/testFailure',
    'read/terminalSelection',
    'read/terminalLastCommand',
    'read/getNotebookSummary',
    'read/problems',
    'read/readFile',
    'agent/runSubagent',
    'firecrawl/FIRECRAWL_CANCEL_A_CRAWL_JOB',
    'firecrawl/FIRECRAWL_CRAWL_V2',
    'firecrawl/FIRECRAWL_EXTRACT',
    'firecrawl/FIRECRAWL_GET_THE_STATUS_OF_A_CRAWL_JOB',
    'firecrawl/FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS',
    'firecrawl/FIRECRAWL_SCRAPE',
    'firecrawl/FIRECRAWL_SEARCH',
    'chrome-devtools/click',
    'chrome-devtools/close_page',
    'chrome-devtools/drag',
    'chrome-devtools/emulate',
    'chrome-devtools/evaluate_script',
    'chrome-devtools/fill',
    'chrome-devtools/fill_form',
    'chrome-devtools/get_console_message',
    'chrome-devtools/get_network_request',
    'chrome-devtools/handle_dialog',
    'chrome-devtools/hover',
    'chrome-devtools/list_console_messages',
    'chrome-devtools/list_network_requests',
    'chrome-devtools/list_pages',
    'chrome-devtools/navigate_page',
    'chrome-devtools/new_page',
    'chrome-devtools/performance_analyze_insight',
    'chrome-devtools/performance_start_trace',
    'chrome-devtools/performance_stop_trace',
    'chrome-devtools/press_key',
    'chrome-devtools/resize_page',
    'chrome-devtools/select_page',
    'chrome-devtools/take_screenshot',
    'chrome-devtools/take_snapshot',
    'chrome-devtools/upload_file',
    'chrome-devtools/wait_for',
    'cloudflare-autorag/search',
    'cloudflare-docs/migrate_pages_to_workers_guide',
    'cloudflare-docs/search_cloudflare_documentation',
    'context7/get-library-docs',
    'context7/resolve-library-id',
    'edit/createDirectory',
    'edit/createFile',
    'edit/createJupyterNotebook',
    'edit/editFiles',
    'edit/editNotebook',
    'search/changes',
    'search/codebase',
    'search/fileSearch',
    'search/listDirectory',
    'search/searchResults',
    'search/textSearch',
    'search/usages',
    'search/searchSubagent',
    'web/fetch',
    'github/add_comment_to_pending_review',
    'github/add_issue_comment',
    'github/assign_copilot_to_issue',
    'github/create_branch',
    'github/create_or_update_file',
    'github/create_pull_request',
    'github/create_repository',
    'github/delete_file',
    'github/fork_repository',
    'github/get_commit',
    'github/get_file_contents',
    'github/get_label',
    'github/get_latest_release',
    'github/get_me',
    'github/get_release_by_tag',
    'github/get_tag',
    'github/get_team_members',
    'github/get_teams',
    'github/issue_read',
    'github/issue_write',
    'github/list_branches',
    'github/list_commits',
    'github/list_issue_types',
    'github/list_issues',
    'github/list_pull_requests',
    'github/list_releases',
    'github/list_tags',
    'github/merge_pull_request',
    'github/pull_request_read',
    'github/pull_request_review_write',
    'github/push_files',
    'github/request_copilot_review',
    'github/search_code',
    'github/search_issues',
    'github/search_pull_requests',
    'github/search_repositories',
    'github/search_users',
    'github/sub_issue_write',
    'github/update_pull_request',
    'github/update_pull_request_branch',
    'todo',
    'memory',
  ]
---

# Akyodex コーディングエージェント

VRChat アバター図鑑「Akyodex」の開発エージェント。640体以上のアバターデータを4桁ID (0001-) で管理する Next.js アプリケーション。日本語/英語の多言語対応。

## 技術スタック

- **Framework**: Next.js 15.5.10 (App Router) + React 19.1.0
- **Language**: TypeScript 5.9.3 (strict mode)
- **Runtime**: Cloudflare Pages (Edge + Node.js) + @opennextjs/cloudflare ^1.16.4
- **Storage**: Cloudflare R2 (画像・CSV・JSON), Cloudflare KV (セッション・データキャッシュ)
- **Styling**: Tailwind CSS 4 (PostCSS plugin)
- **Auth**: HMAC署名セッション (Web Crypto API) + HTTP-only Cookie (24h expiry)
- **Sanitization**: sanitize-html 2.17.0
- **CSV**: csv-parse / csv-stringify
- **Data Sync**: GitHub API (CRUD時にCSVをGitHubへコミット)
- **Testing**: Playwright (E2E), Knip (dead code analysis)
- **Linting**: ESLint 9 + Next.js config
- **Node**: 20.x, npm 10.x

## データアーキテクチャ

データソース優先順位: **KV (~5ms) → JSON (~20ms) → CSV (~200ms)**

- `data/akyo-data-ja.csv` / `data/akyo-data-ja.json` — 日本語データ
- `data/akyo-data-en.csv` / `data/akyo-data-en.json` — 英語データ
- CRUD操作時: R2更新 → KVキャッシュ更新 → GitHub CSV同期 → ISR revalidation

## ビルド・検証コマンド

```bash
npm install            # 依存関係インストール
npm run dev            # 開発サーバー (Turbopack, localhost:3000)
npm run build          # Cloudflare Pages ビルド (OpenNext + prepare script)
npm run next:build     # Next.js ビルドのみ
npm run lint           # ESLint
npm run knip           # Dead code analysis
npm run test           # Playwright E2E テスト
npm run data:convert   # CSV → JSON 変換 (npx tsx scripts/csv-to-json.ts)
npm run test:csv       # CSV データ品質チェック
```

## ディレクトリ構造

```
Akyodex/                            # リポジトリルート (monorepoではない)
├── src/
│   ├── app/                        # App Router
│   │   ├── admin/                  # 管理画面
│   │   ├── zukan/                  # 図鑑 (SSG + ISR)
│   │   └── api/                    # API Routes
│   │       ├── admin/              # login, logout, verify-session, next-id
│   │       ├── upload-akyo/        # 新規登録 (Node.js runtime)
│   │       ├── update-akyo/        # 更新 (Node.js runtime)
│   │       ├── delete-akyo/        # 削除 (Node.js runtime)
│   │       ├── check-duplicate/    # 重複チェック
│   │       ├── avatar-image/       # 画像プロキシ (R2→VRChat→Placeholder)
│   │       ├── revalidate/         # On-demand ISR
│   │       └── kv-migrate/         # KVデータ移行
│   ├── components/                 # UI コンポーネント
│   │   └── admin/                  # 管理画面用
│   ├── hooks/                      # カスタムフック (use-akyo-data, use-language)
│   ├── lib/                        # ユーティリティ
│   │   ├── api-helpers.ts          # jsonError, jsonSuccess, setSessionCookie, ensureAdminRequest, validateOrigin
│   │   ├── akyo-data.ts            # 統合データモジュール (KV→JSON→CSV)
│   │   ├── akyo-data-helpers.ts    # 共通ヘルパー (extractCategories, extractAuthors, findAkyoById)
│   │   ├── akyo-crud-helpers.ts    # CRUD操作ヘルパー
│   │   ├── csv-utils.ts            # CSV parse/stringify + GitHub同期
│   │   ├── github-utils.ts         # GitHub API操作
│   │   ├── r2-utils.ts             # R2ストレージ操作
│   │   ├── session.ts              # HMAC セッション管理 (Web Crypto API)
│   │   ├── html-utils.ts           # XSS対策 (stripHTMLTags, decodeHTMLEntities)
│   │   ├── vrchat-utils.ts         # VRChat API
│   │   └── i18n.ts                 # 多言語ユーティリティ
│   ├── types/                      # 型定義 (akyo.ts, kv.ts, env.d.ts)
│   └── middleware.ts               # Edge middleware (i18n + CSP nonce)
├── scripts/                        # ユーティリティスクリプト (ESLint対象外, require()許可)
├── data/                           # CSV/JSON データ
└── public/                         # 静的ファイル (sw.js, images/)
```

## API ルート記述パターン

### 標準パターン（Edge Runtime）

```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  return Response.json({ success: true, data: result });
}
```

### Node.js Runtime が必要な場合

```typescript
export const runtime = 'nodejs';
// 理由: csv-parse/sync, GitHub API, Buffer による R2 バイナリ操作
```

### ヘルパー関数の使用（必須）

```typescript
import {
  jsonError,
  jsonSuccess,
  setSessionCookie,
  clearSessionCookie,
  ensureAdminRequest,
} from '@/lib/api-helpers';

return jsonError('Invalid input', 400); // => { success: false, error: 'Invalid input' }
return jsonSuccess({ data }); // => { success: true, data }

const result = await ensureAdminRequest(request, { requireOwner: true });
if ('response' in result) return result.response;
```

### 禁止パターン

```typescript
// ❌ NextRequest/NextResponse を不必要に使わない
import { NextRequest, NextResponse } from 'next/server';
// ❌ jsonError() を使わず直接エラーレスポンス
return Response.json({ error: 'msg' }, { status: 400 });
// ❌ Cookie を直接操作しない (setSessionCookie/clearSessionCookie を使う)
```

## コーディング規約

- `any` 型の使用禁止
- `require()` ではなく ES module (`import`) を使用（scripts/ 除く）
- ファイル末尾は改行1つで終わること
- PR は必ず別ブランチから作成し、main へ直接コミットしない
- 入力バリデーションは長さ制限付き正規表現（ReDoS 防止）
- VRChat ID: `/^avtr_[A-Za-z0-9-]{1,50}$/`
- パスワード比較は constant-time Uint8Array 比較を使用
- HTML 出力は `sanitize-html` でサニタイズ
- セッションは HMAC 署名 (Web Crypto API)、JWT は使用しない
- `main` 取り込み後の EN/KO 翻訳再生成タスクは `akyodex-main-translation-sync` skill の手順を優先して実行する

## Cloudflare バインディング

- `AKYO_BUCKET` (R2) — 画像 + データファイル
- `AKYO_KV` (KV) — セッション + データキャッシュ
- R2: 同名キーでアップロードすると上書きされる。削除→再アップは不要

## 安全基準

以下の変更は実行前にユーザーへの確認を必須とする：

- データスキーマ・外部 API 仕様の変更
- セキュリティ設定の変更
- 本番環境に影響する破壊的変更
- UI/UX デザインの変更
- 技術スタックのバージョン変更
- 個人情報/機微データの取り扱い方針変更

## 禁止事項

- 機能デグレード（エラー回避目的でのコメントアウト等）
- 未使用変数・未使用 export の放置
- `NEXT_PUBLIC_APP_URL` が未設定の状態での本番デプロイ
- `NextRequest`/`NextResponse` の不必要な使用
- JWT の使用（HMAC セッションに移行済）
