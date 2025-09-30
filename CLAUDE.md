# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Akyodex (Akyoずかん)** は、500種類以上の「Akyo」という謎の生き物を検索・閲覧できるファン向け図鑑サイト。VRChatアバターへのリンクも提供。

## 主要技術スタック

- **フロントエンド**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (CDN)
- **バックエンド**: Cloudflare Pages Functions (TypeScript)
- **ストレージ**:
  - R2 (画像), KV (メタデータ), IndexedDB (ローカルキャッシュ), LocalStorage (お気に入り・認証)
- **データ形式**: CSV → JSON変換
- **デプロイ**: Cloudflare Pages (本番: akyodex.com)

## 開発コマンド

### ローカル開発
```bash
# ローカルサーバー起動（静的ファイル配信のみ）
npx serve .
# または
python -m http.server 8000
```

### Cloudflare Pages デプロイ
```bash
# 本番デプロイ
npx wrangler pages deploy . --project-name akyodex-site

# 環境変数設定（Cloudflare Dashboard）
ADMIN_PASSWORD_OWNER=<オーナー用パスワード>
ADMIN_PASSWORD_ADMIN=<管理者用パスワード>
PUBLIC_R2_BASE=https://images.akyodex.com
```

## アーキテクチャ

### データフロー
1. **CSV管理**: `data/akyo-data.csv` がマスターデータ（GitHub管理）
2. **画像配信**: R2バケット (`akyodex-images`) から `images.akyodex.com` で配信
3. **マニフェスト**: `/api/manifest` が ID → 画像URL マッピングを返す
4. **認証**: Bearer トークンで Pages Functions に認証（KVには非保存）

### ストレージ階層
- **R2 (Cloudflare)**: 本番画像 (`images/NNN.webp`)
- **IndexedDB (ローカル)**: 画像キャッシュ (object store: `images`)
- **LocalStorage**: お気に入り (`akyoFavorites`), CSV (`AkyoDataCSV`), 削除印 (`akyo:deletedRemoteIds`)
- **SessionStorage**: 認証情報 (`AkyoAdminAuth`)

### 主要エントリーポイント
- `index.html` - 図鑑メインUI (閲覧専用)
- `admin.html` - 管理UI (新規登録/編集/削除/ツール)
- `finder.html` - 検索特化UI
- `logo-upload.html` - ロゴ設定ツール
- `share.html` - シェア機能

### コアモジュール
- `js/main.js` - 図鑑表示ロジック (グリッド/リスト切替, 検索, フィルター)
- `js/admin.js` - 管理機能 (CRUD, 認証, ID圧縮)
- `js/storage-manager.js` - IndexedDB管理
- `js/image-manifest-loader.js` - R2画像マニフェスト取得
- `js/attribute-manager.js` - 属性管理API
- `js/mini-akyo-bg.js` - 背景アニメーション

### Pages Functions (functions/*.ts)
- `functions/api/csv.ts` - CSV取得 (GET)
- `functions/api/commit-csv.ts` - CSV更新コミット (POST, 認証必須) + アバターマップ自動更新
- `functions/api/upload.ts` - 画像アップロード → R2 (POST, 認証必須)
- `functions/api/gh-upload.ts` - GitHub直接アップロード (POST, 認証必須)
- `functions/api/delete-image.ts` - 画像削除 (DELETE, オーナーのみ)
- `functions/api/manifest.ts` - 画像マニフェスト取得 (GET)
- `functions/api/scan.ts` - R2バケットスキャン (GET, 認証必須)
- `functions/api/whoami.ts` - 認証確認 (GET)
- `functions/api/vrc-avatar-image.ts` - VRChat画像プロキシ (GET) - CORS/403回避
- `functions/api/vrc-avatar-info.ts` - VRChatアバター名取得 (GET) - og:titleから抽出
- `functions/_utils.ts` - 共通ユーティリティ (CORS, 認証, レート制限)

## 重要な設計原則

### ID管理
- **形式**: 3桁固定 (`001`-`999`)
- **自動圧縮**: 欠番を自動検出して詰める (`admin.js` の自動再採番機能)
- **削除印**: `localStorage.akyo:deletedRemoteIds` で論理削除を管理
- **優先範囲**: 001-020 を優先的に使用

### 画像管理
- **命名規則**: `images/NNN.webp` (3桁ID固定)
- **画像取得優先順位**:
  1. `/api/manifest` からマニフェスト取得 (R2/KV由来)
  2. R2直リンク (`https://images.akyodex.com/NNN.webp`)
  3. VRChatフォールバック (`/api/vrc-avatar-image?avtr=xxx`) - アバターURLから自動取得
  4. 静的フォールバック (`/images/NNN.webp`)
- **VRChat連携**:
  - `/api/vrc-avatar-image` - VRChat画像をプロキシして返す（CORS/403回避）
  - `/api/vrc-avatar-info` - VRChatページからアバター名・作者名を自動取得
- **マニフェスト**: `/api/manifest` で最新URL取得 (キャッシュ: 60秒)
- **アバターマップ**: CSV更新時に自動再生成 (`data/akyo-avatar-map.js`)

### 認証
- **オーナー権限** (`RadAkyo`): 全機能 (削除含む)
- **管理者権限** (`Akyo`): 追加・編集のみ
- **認証方式**: Bearer トークン (メモリ内保持, SessionStorage非推奨)

### CSV形式
```csv
ID,見た目,通称,アバター名,属性,備考,作者,アバターURL
001,,オリジンAkyo,Akyo origin,チョコミント類,すべてのはじまり,ugai,https://vrchat.com/...
```

## 開発時の注意事項

### スクリプト読込ポリシー
- 外部JSは `defer` 属性で読込
- インラインスクリプトはIIFEでラップ (グローバル汚染防止)

### コード規約 (.cursor/rules 準拠)
- **出力順序**: 結論 → 根拠 → 手順 → 改善提案
- **タスク分類**: 軽量/標準/重要 (v5.mdc 参照)
- **並列実行**: 独立タスクは並列実行推奨

### 禁止事項
- UI/UXデザインの無断変更 (事前承認必須)
- `any` 型の使用 (型安全性の回避)
- 機能デグレード (エラー回避目的)
- 技術スタックバージョンの無断変更

### 属性管理
- デフォルト属性 (`未分類`) は削除不可
- 属性削除時は依存関係チェック必須 (`attribute-manager.js`)

### 画像アップロード
- **推奨形式**: WebP (サイズ最適化済み)
- **アップロード方法**:
  - 新規登録画面: ドラッグ&ドロップ + クロップUI (300×200px)
  - 編集画面: 新規登録画面と同じクロップUI
  - VRChatボタン: URLから画像を自動取得してクロップUI表示
- **クロップ機能**:
  - ドラッグで位置調整、マウスホイール/ピンチでズーム
  - PC/スマホ両対応（タッチイベント対応）
  - ドラッグ直後のクリック防止機能
- **サムネイル**: 未実装 (将来対応予定)
- **容量制限**: R2無料枠 10GB/月, KV 1GB

### エラーハンドリング
- **CSV破損**: `sanitizeCsvText()` で自動修復 (引用符補完)
- **Quota超過**: IndexedDB移行を促す通知表示
- **認証エラー**: 401 即座停止, トークン再入力

## よくあるタスク

### 新しいAkyoを追加
1. `admin.html` → 新規登録タブ
2. VRChat URLを入力（オプション）
   - 「URLからアバター名を取得」ボタンでアバター名を自動入力
   - 「URLから画像を取得」ボタンで画像を自動取得＆クロップUI表示
3. 残りのフォーム入力 (ID自動割当)
4. 画像をドラッグ&ドロップまたはVRChatボタンで取得
5. クロップUIで位置調整・ズーム
6. CSV自動更新 (GitHub API経由) + アバターマップ自動再生成

### 既存のAkyoを編集
1. `admin.html` → 編集・削除タブ
2. 編集ボタンをクリック
3. 編集モーダルで情報を更新
   - VRChatボタンで画像/名前の自動取得も可能
   - 新規登録画面と同じクロップUIで画像編集
4. 「更新する」ボタンで保存 + 画像も自動アップロード

### IDを再採番
1. `admin.html` → ツールタブ → ID自動圧縮
2. 欠番検出 → 自動詰め処理
3. お気に入り/画像マップも自動更新

### 画像を一括移行
1. `migrate-storage.html` でIndexedDB移行
2. LocalStorage容量解放

### 認証トークン確認
```bash
curl https://akyodex.com/api/whoami \
  -H "Authorization: Bearer <TOKEN>"
```

## トラブルシューティング

### `/api/manifest` が空
- KV に `akyo:*` データが無い
- `/api/upload` で最低1件登録してから確認

### 画像が表示されない
1. R2公開設定確認 (`images.akyodex.com`)
2. `akyo:deletedRemoteIds` に誤って登録されていないか確認
3. マニフェストキャッシュクリア (`?reloadBg=1`)

### QuotaExceededError
- LocalStorage容量超過
- `migrate-storage.html` でIndexedDB移行

### CORS エラー
- `functions/_utils.ts` の `ALLOWED_ORIGINS` に追加
- 基本は同一オリジン前提

## デバッグツール

- `test-debug.html` - デバッグログ確認
- `test-indexeddb.html` - IndexedDB状態確認
- URLパラメータ:
  - `?reloadBg=1` - 背景キャッシュクリア
  - `?bgdensity=NN` - ミニAkyo表示数調整 (推奨: 10-28)
  - `?bg=front` - 背景を前面表示 (確認用)

## 関連ドキュメント

- `README.md` - 機能詳細・実装状況
- `HOSTING-GUIDE.md` - デプロイガイド (Cloudflare/Netlify/Vercel)
- `.cursor/rules/v5.mdc` - AI開発ルール詳細
- `.cursor/rules/Always.mdc` - 基本方針

## 連絡先

- GitHub: https://github.com/rad-vrc/Akyodex
- 本番URL: https://akyodex.com