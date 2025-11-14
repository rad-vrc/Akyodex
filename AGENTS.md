# リポジトリ ガイドライン

**ユーザーへの返答は日本語で行うこと。**

## プロジェクト構造とモジュール整理
- `src/app` は Next.js の App Router（ページ、エッジ API、ミドルウェア）を収めており、`admin`、`zukan`、`api/*` といった機能別ディレクトリに分割されています。
- 共有 UI とロジックは `src/components`、`src/lib`、`src/types` に配置します。新しい UI 要素は `components` に、サーバー専用のヘルパーは `lib` に置いてください。
- 静的アセット（`public/sw.js`、`public/manifest.json`、アイコン、フォント）は PWA をサポートします。CSV データと英語版コピーは `data/` に保存されています。
- 自動化処理は `scripts/`（CSV マイグレーション、Cloudflare 準備）に、回帰テスト用アセットは `tests/`（Vitest + Playwright スイート）に置きます。

## ビルド・テスト・開発コマンド
- `npm run dev` – Turbopack 開発サーバーを `localhost:3000` でホットリロード付きで起動します。
- `npm run next:build` – 標準的な Next.js ビルドを生成します（Vercel 形式のプレビューに有用）。
- `npm run build` – OpenNext の Cloudflare ビルドを実行し、Pages 用にアセットを後処理します。
- `npm run test` / `npm run test:csv` – Vitest のユニットテスト群と CSV 品質チェックを実行します。
- `npm run test:playwright`、`test:ui`、`test:headed` – `tests/e2e` に定義された E2E フローを実行します。
- `npm run lint` と `npm run knip` – PR 前に ESLint ルールとデッドコード検出を徹底します。

## コーディングスタイルと命名規約
- App Router を用いた TypeScript + React 19 が必須です。クライアント側フックで `"use client"` が必要な場合を除き、Server Components を優先します。
- ESLint 設定（`eslint.config.mjs`）と Tailwind のユーティリティファーストなスタイルに従い、動的な場合を除いてインラインスタイルは避けます。
- コンポーネントはパスカルケース（例: `MiniAkyoBg`）、ヘルパーはキャメルケース、React コンポーネント以外のファイル名はケバブケースにします。
- CSV ヘッダー（4 桁 ID）は安定させ、書き込む前に HTML ユーティリティヘルパーで文字列を正規化してください。

## テストガイドライン
- ユニットレベルのテストはソースの横か `tests/unit` に配置し、ファイル名を `*.spec.ts` とします。
- E2E スペックは `tests/e2e` に配置し、ユーザージャーニー（ログイン、アバター CRUD、PWA インストール）を反映させます。
- PR を開く前に `npm run test` と `npm run test:playwright` を実行してください。CI では両コマンドの成功が必須です。

## コミットとプルリクエストのガイドライン
- コミットはスコープ付き（例: `admin: add VRChat validation`）にし、関連する場合は `#115` のような Issue を参照してください。
- PR では目的、テスト証跡（UI の場合はコマンド出力やスクリーンショット）、環境／データ移行の有無を記載します。
- デプロイに関する考慮事項（Cloudflare バインディング、R2/KV の変更）を含め、アバターデータが変わる場合は CSV の差分を確認してください。

## セキュリティと設定のヒント
- 実際のアクセスコードをコミットしないでください。`.env.local` を使用し、新しい環境変数は README/DEPLOYMENT に記載しましょう。
- 管理機能／認証機能の変更では、タイミングセーフな比較、JWT クッキーのスコープ、Cloudflare KV の使用について必ず触れ、レビュー担当者が回帰に集中できるようにしてください。