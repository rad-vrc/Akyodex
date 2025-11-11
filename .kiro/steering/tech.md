# 技術スタック & ビルドシステム

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15.5.6 (App Router, React 19.1.0)
- **スタイリング**: Tailwind CSS 4.x
- **言語**: TypeScript 5.x
- **ランタイム**: Cloudflare Pages (Edge Runtime)

### バックエンド
- **アダプター**: @opennextjs/cloudflare 1.11.0
- **認証**: JWT (jsonwebtoken 9.0.2)
- **セキュリティ**: sanitize-html 2.17.0, crypto.timingSafeEqual()
- **CSV処理**: csv-parse 6.1.0, csv-stringify 6.6.0

### 外部サービス
- **チャットボット**: Dify埋め込みチャットボットウィジェット

### インフラストラクチャ
- **ホスティング**: Cloudflare Pages
- **ストレージ**: R2 (画像/CSV), KV (セッション)
- **CDN**: Cloudflare Edge Network

## ビルドシステム

### パッケージマネージャー
- **npm** 10.x (必須)
- **Node.js** 20.x (必須)

### 共通コマンド

#### 開発
```bash
# Next.js開発サーバーを起動 (akyodex-nextjs/)
npm run dev

# Turbopackで起動 (高速)
npm run dev --turbopack

# ローカルCloudflare Pages開発サーバー
npm run pages:dev
```

#### ビルド & デプロイ
```bash
# Vercel用ビルド (標準Next.js)
npm run build

# Cloudflare Pages用ビルド
npm run pages:build

# Cloudflare Pagesへデプロイ
npm run pages:deploy
```

#### コード品質
```bash
# ESLintを実行
npm run lint

# 型チェック (出力なし)
npx tsc --noEmit
```

#### データ管理
```bash
# CSVを4桁IDに移行
node scripts/migrate-csv-to-4digit.mjs
```

## 設定ファイル

### Next.js設定 (`next.config.ts`)
- 画像最適化: `unoptimized: true` (Cloudflare R2)
- セキュリティヘッダー: HSTS, CSP, X-Frame-Options
- リモートパターン: images.akyodex.com, *.vrchat.com

### Cloudflare設定 (`wrangler.toml`)
- KVバインディング: `AKYO_KV`
- R2バインディング: `AKYO_BUCKET`

### TypeScript設定 (`tsconfig.json`)
- ターゲット: ES2017
- モジュール: esnext (bundler resolution)
- パスエイリアス: `@/*` → `./src/*`
- Strictモード有効

## 環境変数

### 必須 (本番環境)
```bash
ADMIN_PASSWORD_OWNER=<access_code>
ADMIN_PASSWORD_ADMIN=<access_code>
SESSION_SECRET=<128_hex_chars>
```

### 開発環境 (`.dev.vars` または `.env.local`)
```bash
# 管理者パスワード (開発環境ではプレーンテキスト)
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo

# セッションシークレット (セッショントークン用)
SESSION_SECRET=629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d8439bd4ac8c21b028d7eb9be948cf37a23288ce4b8eebe3aa6fefb255b9c4cbf

# R2ベースURL
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com

# アプリオリジン (CSRF保護)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## テスト & 検証

### ローカルテスト
```bash
# Next.jsビルドをテスト
npm run build && npm start

# Cloudflare Pagesビルドをテスト
npm run pages:build
npx wrangler pages dev .vercel/output/static
```

### 本番環境検証
- ギャラリー: https://akyodex.com/zukan
- 管理画面: https://akyodex.com/admin
- APIヘルスチェック: https://akyodex.com/api/health

## パフォーマンス最適化

### ビルド最適化
- Turbopack有効化で高速開発ビルド
- ギャラリーページの静的生成 (SSG)
- インクリメンタル静的再生成 (ISR): 1時間

### ランタイム最適化
- 低レイテンシのためのEdge Runtime
- 6つのキャッシング戦略を持つService Worker
- IntersectionObserverによる画像遅延読み込み
- 大規模リストの仮想スクロール

## セキュリティプラクティス

### 認証
- SHA-256パスワードハッシュ化
- タイミングセーフ比較 (crypto.timingSafeEqual)
- JWTのHTTP-onlyクッキー
- 7日間のセッション有効期限

### 入力検証
- HTMLサニタイゼーション (sanitize-html)
- URL検証 (URLコンストラクタ)
- エラーハンドリング付きCSVパース
- 長さ制限付き正規表現パターン

### ヘッダー
- HSTS: max-age=63072000
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy: origin-when-cross-origin
