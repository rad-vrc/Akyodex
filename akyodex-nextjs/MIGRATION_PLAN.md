# Akyoずかん Next.js 15 移行計画書

## 📋 プロジェクト概要

### 目的
既存のVanilla HTML/JS/CSS + Cloudflare Pages Functionsで構築された「Akyoずかん」を、2025年最新の業界標準技術スタック（Next.js 15 + React 19 + TypeScript）に移行する。

### 移行の方針
- ✅ **新規プロジェクト作成** - クリーンな構造で最新ベストプラクティスを適用
- ✅ **段階的移行** - 機能ごとに段階的に実装・テスト
- ✅ **既存デザイン完全継承** - カラーパレット・UI/UXを完全一致
- ✅ **レスポンシブ統合** - PC/モバイル版を1つのレスポンシブUIに統合
- ✅ **Cloudflare Pages互換** - 既存インフラを活用

---

## 🎨 既存デザイン仕様

### カラーパレット（完全一致）
```css
/* メインカラー - パステル調の優しい色 */
--primary-pink: #FF6B9D;       /* やさしいピンク */
--primary-yellow: #FFC107;     /* 明るい黄色 */
--primary-blue: #66B2FF;       /* 空色 */
--primary-green: #66D9A5;      /* ミントグリーン */
--primary-orange: #FFA06D;     /* やさしいオレンジ */

/* 背景グラデーション */
--bg-gradient-start: #FFF5E6;  /* クリーム色 */
--bg-gradient-end: #E6F7FF;    /* 薄い水色 */

/* テキストカラー */
--text-primary: #4A4A4A;       /* ソフトな黒 */
--text-secondary: #6B6B6B;     /* グレー */
```

### フォント
- **メイン**: 'Kosugi Maru', 'M PLUS Rounded 1c', 'Noto Sans JP'
- **ロゴ**: 'M PLUS Rounded 1c' (font-weight: 900)

### デザイン特徴
- 🌈 背景: 画像 + グラデーション（`images/akyo-bg.webp`）
- 🎨 カード: 白背景、20px角丸、グラデーション境界線
- ⭐ ボタン: 25px角丸、グラデーション背景、ホバー時拡大
- 🎪 アニメーション: gentle-bounce, rainbow-gradient, logo-float

---

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 15.5.6** - App Router（最新版）
- **React 19.1.0** - Server Components対応
- **TypeScript 5** - 厳格な型安全性
- **Tailwind CSS v4** - ユーティリティファースト

### バックエンド
- **Cloudflare Pages Functions** - 既存APIを継承
- **R2 Storage** - 画像配信（images.akyodex.com）
- **KV Namespace** - メタデータ管理
- **GitHub API** - CSV更新・コミット

### ビルド・開発
- **Turbopack** - 高速ビルド（Next.js 15標準）
- **Wrangler** - Cloudflare Pages デプロイ
- **ESLint + TypeScript** - コード品質管理

---

## 📁 プロジェクト構造

```
akyodex-nextjs/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── globals.css         # グローバルスタイル（既存カラー適用）
│   │   ├── zukan/              # 図鑑ページ（旧 index.html）
│   │   │   └── page.tsx
│   │   ├── admin/              # 管理画面（旧 admin.html + finder.html統合）
│   │   │   ├── page.tsx        # メイン管理UI
│   │   │   ├── layout.tsx      # 管理画面レイアウト
│   │   │   └── components/     # 管理画面専用コンポーネント
│   │   └── api/                # API Routes
│   │       ├── csv/route.ts
│   │       ├── manifest/route.ts
│   │       ├── upload/route.ts
│   │       ├── commit-csv/route.ts
│   │       ├── vrc-avatar-image/route.ts
│   │       ├── vrc-avatar-info/route.ts
│   │       └── whoami/route.ts
│   ├── components/             # 共通コンポーネント
│   │   ├── akyo-card.tsx       # Akyoカード
│   │   ├── search-bar.tsx      # 検索バー
│   │   ├── filter-panel.tsx    # フィルターパネル
│   │   ├── favorite-button.tsx # お気に入りボタン
│   │   ├── modal-detail.tsx    # 詳細モーダル
│   │   ├── image-cropper.tsx   # 画像クロップUI
│   │   └── loading-spinner.tsx # ローディング
│   ├── lib/                    # ユーティリティ
│   │   ├── csv-parser.ts       # CSVパーサー
│   │   ├── image-utils.ts      # 画像処理
│   │   ├── auth.ts             # 認証ヘルパー
│   │   ├── storage.ts          # LocalStorage/IndexedDB
│   │   └── api-client.ts       # API クライアント
│   ├── hooks/                  # カスタムフック
│   │   ├── use-akyo-data.ts    # Akyoデータ管理
│   │   ├── use-favorites.ts    # お気に入り管理
│   │   ├── use-auth.ts         # 認証状態管理
│   │   └── use-image-manifest.ts # 画像マニフェスト
│   └── types/                  # 型定義
│       ├── akyo.ts             # Akyo型
│       └── env.d.ts            # 環境変数型
├── data/                       # データファイル
│   ├── akyo-data.csv           # 日本語版
│   └── akyo-data-US.csv        # 英語版
├── public/                     # 静的ファイル
│   └── images/                 # ロゴ・背景画像
├── .env.local                  # 環境変数
├── next.config.ts              # Next.js設定
├── tsconfig.json               # TypeScript設定
└── wrangler.toml               # Cloudflare設定（作成予定）
```

---

## 🔄 機能移行マップ

### Phase 1: 基盤構築 ✅ 完了
- [x] Next.js 15プロジェクト作成
- [x] TypeScript設定
- [x] Tailwind CSS v4セットアップ
- [x] 型定義作成（akyo.ts, env.d.ts）
- [x] ユーティリティ作成（csv-parser.ts, image-utils.ts）
- [x] プロジェクト構造作成

### Phase 2: デザインシステム構築 🔄 進行中
- [ ] 既存カラーパレットの完全適用（globals.css）
- [ ] 共通コンポーネント作成
  - [ ] AkyoCard（カードUI）
  - [ ] SearchBar（検索バー）
  - [ ] FilterPanel（フィルターパネル）
  - [ ] FavoriteButton（お気に入りボタン）
  - [ ] LoadingSpinner（ローディング）
- [ ] アニメーション実装
  - [ ] gentle-bounce（ロゴ）
  - [ ] rainbow-gradient（グラデーション）
  - [ ] card-hover（カードホバー）

### Phase 3: APIルート実装
- [ ] `/api/csv` - CSV取得
- [ ] `/api/manifest` - 画像マニフェスト
- [ ] `/api/upload` - 画像アップロード（R2）
- [ ] `/api/commit-csv` - CSV更新（GitHub API）
- [ ] `/api/vrc-avatar-image` - VRChat画像プロキシ
- [ ] `/api/vrc-avatar-info` - VRChatメタデータ取得
- [ ] `/api/whoami` - 認証確認

### Phase 4: 図鑑ページ実装
- [ ] グリッドビュー
- [ ] リストビュー
- [ ] 検索機能
  - [ ] フリーワード検索
  - [ ] 属性フィルター
  - [ ] 作者フィルター
- [ ] ソート機能
- [ ] お気に入り機能
  - [ ] LocalStorage連携
  - [ ] リアルタイム更新
- [ ] 詳細モーダル
  - [ ] 画像表示
  - [ ] VRChatリンク
  - [ ] 属性表示
- [ ] ページネーション/無限スクロール
- [ ] 統計情報表示

### Phase 5: 管理画面実装（レスポンシブ統合版）
- [ ] 認証システム
  - [ ] ログイン画面
  - [ ] オーナー/管理者権限
  - [ ] SessionStorage管理
- [ ] タブナビゲーション
  - [ ] 新規登録タブ
  - [ ] 編集・削除タブ
  - [ ] ツールタブ
- [ ] 新規登録機能
  - [ ] フォーム入力
  - [ ] 画像ドラッグ&ドロップ
  - [ ] 画像クロップUI（PC/モバイル対応）
  - [ ] VRChat連携（画像・名前自動取得）
  - [ ] ID自動割り当て
- [ ] 編集・削除機能
  - [ ] データ検索
  - [ ] 編集モーダル
  - [ ] 削除確認ダイアログ
  - [ ] 画像差し替え
- [ ] ツール機能
  - [ ] CSVインポート
  - [ ] ID再採番
  - [ ] データエクスポート
  - [ ] 統計情報

### Phase 6: 高度な機能
- [ ] 多言語対応（i18n）
  - [ ] 日本語/英語切替
  - [ ] URL自動振り分け
- [ ] PWA化
  - [ ] Service Worker
  - [ ] オフライン対応
  - [ ] インストール可能
- [ ] パフォーマンス最適化
  - [ ] 画像最適化（Next/Image）
  - [ ] 遅延読み込み
  - [ ] キャッシュ戦略
- [ ] ミニAkyo背景アニメーション
  - [ ] Canvas描画
  - [ ] クエリパラメータ対応

### Phase 7: デプロイ・運用
- [ ] Cloudflare Pages設定
  - [ ] wrangler.toml作成
  - [ ] 環境変数設定
  - [ ] カスタムドメイン設定
- [ ] CI/CD設定
  - [ ] GitHub Actions
  - [ ] 自動デプロイ
- [ ] モニタリング
  - [ ] Sentry連携
  - [ ] Analytics設定

---

## 📊 既存機能との対応表

| 既存ファイル | Next.js 対応 | 備考 |
|-------------|-------------|------|
| `index.html` | `/app/zukan/page.tsx` | 図鑑メインUI |
| `admin.html` | `/app/admin/page.tsx` | PC版管理画面 |
| `finder.html` | `/app/admin/page.tsx` | モバイル版管理画面（統合） |
| `share.html` | `/app/zukan/share/[id]/page.tsx` | 個別シェアページ |
| `js/main.js` | 複数コンポーネント + hooks | ロジック分割 |
| `js/admin.js` | `/app/admin/` 配下 | 管理機能 |
| `js/image-loader.js` | `lib/image-utils.ts` | 画像処理 |
| `js/storage-manager.js` | `lib/storage.ts` | ストレージ管理 |
| `js/attribute-manager.js` | `lib/attributes.ts` | 属性管理 |
| `js/mini-akyo-bg.js` | `components/mini-akyo-bg.tsx` | 背景アニメーション |
| `functions/api/*.ts` | `app/api/*/route.ts` | API Routes |
| `css/kid-friendly.css` | `app/globals.css` + Tailwind | スタイル統合 |

---

## 🎯 マイルストーン

### Week 1: 基盤 + デザイン（現在）
- [x] プロジェクト作成
- [x] 型定義・ユーティリティ
- [ ] デザインシステム構築
- [ ] 共通コンポーネント

### Week 2: コア機能
- [ ] APIルート実装
- [ ] 図鑑ページ（基本表示）
- [ ] 検索・フィルター機能

### Week 3: 管理機能
- [ ] 認証システム
- [ ] 管理画面UI（レスポンシブ）
- [ ] CRUD機能
- [ ] 画像クロップUI

### Week 4: 仕上げ
- [ ] パフォーマンス最適化
- [ ] テスト
- [ ] デプロイ準備
- [ ] ドキュメント整備

---

## ⚠️ 注意事項

### 既存機能の完全継承
- **カラーパレット**: 完全一致必須
- **UI/UX**: 既存デザインを踏襲
- **アニメーション**: 既存の動きを再現
- **機能**: デグレードなし

### レスポンシブ統合
- **admin.html（PC版）** と **finder.html（モバイル版）** を統合
- Tailwind のブレークポイントで出し分け
  - `sm:` (640px〜) タブレット
  - `md:` (768px〜) PC
  - `lg:` (1024px〜) ワイド

### Cloudflare Pages互換性
- **Functions**: App Routerの API Routesに移行
- **R2/KV**: 環境変数経由でアクセス
- **デプロイ**: `wrangler pages deploy` 使用

### パフォーマンス目標
- **初回ロード**: 2秒以内
- **画像表示**: 1秒以内（キャッシュ活用）
- **インタラクション**: 100ms以内

---

## 🚀 次のアクション

### 直近の実装順序

1. **既存カラーパレット適用** ⏭️ 最優先
   - `globals.css` を既存CSSに完全一致
   - CSS変数の定義
   - Tailwindカスタムカラー設定

2. **共通コンポーネント作成**
   - AkyoCard
   - SearchBar
   - FilterPanel
   - LoadingSpinner

3. **APIルート実装**
   - `/api/csv`
   - `/api/manifest`
   - その他

4. **図鑑ページ実装**
   - 基本表示
   - 検索・フィルター
   - 詳細モーダル

5. **管理画面実装**
   - 認証
   - レスポンシブUI
   - CRUD機能

---

## 📚 参考資料

- [Next.js 15 ドキュメント](https://nextjs.org/docs)
- [React 19 新機能](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)

---

**作成日**: 2025-10-21  
**最終更新**: 2025-10-21  
**ステータス**: Phase 2 進行中
