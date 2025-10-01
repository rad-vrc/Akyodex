# Akyodex - 開発コマンド集

## ローカル開発環境

### サーバー起動
```bash
# ローカルサーバー起動（静的ファイル配信のみ）
npx serve .
# または
python -m http.server 8000
```

### ブラウザアクセス
- `http://localhost:8000/index.html` - メインページ
- `http://localhost:8000/admin.html` - 管理者ページ

## Cloudflare Pages デプロイ

### 本番デプロイ
```bash
# 本番デプロイ（環境変数が必要）
npx wrangler pages deploy . --project-name akyodex-site
```

### 環境変数設定（Cloudflare Dashboard）
- `ADMIN_PASSWORD_OWNER` - オーナー用パスワード
- `ADMIN_PASSWORD_ADMIN` - 管理者用パスワード
- `PUBLIC_R2_BASE` - 画像配信ドメイン（https://images.akyodex.com）

## データ管理

### CSVデータ確認
```bash
# CSVファイルの構造確認
head -5 data/akyo-data.csv
# またはExcelで開く
```

### アバターマップ生成
```bash
# アバターマップを自動生成（CSV更新時）
node generate-manifest.mjs
```

### favicon生成（PowerShell）
```powershell
# ロゴからfavicon画像を生成
.\tools\make-favicons.ps1
```

## 認証・テスト

### API認証確認
```bash
# 認証確認（Bearerトークンが必要）
curl https://akyodex.com/api/whoami \
  -H "Authorization: Bearer <TOKEN>"
```

### マニフェスト確認
```bash
# 画像マニフェスト確認
curl https://akyodex.com/api/manifest
```

## デバッグツール

### デバッグログ確認
```bash
# デバッグツールページを開く
open test-debug.html
```

### IndexedDB状態確認
```bash
# IndexedDBツールページを開く
open test-indexeddb.html
```

### キャッシュクリア
```bash
# URLパラメータでキャッシュクリア
?reloadBg=1  # 背景キャッシュクリア
```

## Git操作

### ブランチ作成・切替
```bash
git checkout -b feature/新しい機能名
```

### 変更の確認・コミット
```bash
git add .
git commit -m "feat: 新機能の説明"
git push origin feature/ブランチ名
```

### マージコンフリクト解決
```bash
# 競合解決後
git add <解決済みファイル>
git commit
```

## 開発時のTips

- **画像確認**: `?reloadBg=1` で画像キャッシュをクリア
- **デバッグ**: ブラウザの開発者ツールでコンソールを確認
- **テスト**: 各種デバッグページを活用
- **本番確認**: Cloudflare Pagesのプレビュー機能を使用

## Windows環境での注意点

- PowerShellでコマンド実行時はバックスラッシュをエスケープ
- Git BashやWSL2の使用を推奨
- ファイルパスの区切り文字に注意（バックスラッシュ使用時）