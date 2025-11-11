# Akyoずかん Next.js デプロイメントガイド

このドキュメントでは、Akyoずかん Next.jsアプリケーションをCloudflare Pagesにデプロイする手順を説明します。

## 📋 前提条件

- Cloudflareアカウント（Pro/Business推奨）
- GitHubリポジトリへのアクセス権
- Node.js 18以上（ローカル開発用）

## 🚀 デプロイ手順

### 1. Cloudflare KV Namespace作成

Akyoずかんでは、アバター画像のメタデータとキャッシュにKVを使用します。

```bash
# Wrangler CLIでKVを作成
npx wrangler kv:namespace create AKYO_KV

# 出力例:
# [[kv_namespaces]]
# binding = "AKYO_KV"
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

作成されたNamespace IDをメモしておきます。

### 2. Cloudflare R2 Bucket作成

アバター画像の保存にR2を使用します。

1. Cloudflare ダッシュボード → R2 → Create bucket
2. Bucket名: `akyo-images` (または任意の名前)
3. Location: Automatic (推奨)
4. Public access: **オフ** (APIを通じてのみアクセス)

Bucket名をメモしておきます。

### 3. Cloudflare Pages プロジェクト作成（または既存プロジェクトの更新）

#### 3.1 GitHubリポジトリ連携

##### 新規プロジェクトの場合

1. Cloudflare ダッシュボード → Pages → Create a project
2. Connect to Git → GitHubリポジトリを選択
3. Build設定:
   ```
   Framework preset:     None (空白のまま)
   Build command:        npm run build
   Build output directory: .open-next
   Root directory:       / (空白またはルート)
   ```

##### 既存プロジェクトの更新の場合

1. Cloudflare ダッシュボード → Pages → あなたのプロジェクト
2. Settings → Builds & deployments
3. Build configuration セクションで **Edit configuration** をクリック
4. 以下のように設定:
   ```
   Framework preset:     None (または空白)
   Build command:        npm run build
   Build output directory: .open-next
   Root directory:       / (空白またはルート)
   ```
5. **Save** をクリック

**⚠️ 重要**: 
- **Framework preset は "None" を選択してください**
  - OpenNextを使用してCloudflare Pages用にビルドします
- **Build output directory は `.open-next` を指定してください**
  - これはOpenNextビルドの出力ディレクトリです

#### 3.2 環境変数設定

Pages プロジェクト → Settings → Environment variables

##### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SESSION_SECRET` | **🔴 重要** セッション署名用の秘密鍵 (128文字推奨) | `629de6ec4bc16b1b31a6b0be24a63a9ab32869c3e7138407cafece0a5226c39d...` |
| `ADMIN_PASSWORD_OWNER` | オーナー（らど）のアクセスコード | `RadAkyo` |
| `ADMIN_PASSWORD_ADMIN` | 管理者のアクセスコード | `Akyo` |
| `GITHUB_TOKEN` | GitHub Personal Access Token (repo権限必須) | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO_OWNER` | リポジトリオーナー名 | `rad-vrc` |
| `GITHUB_REPO_NAME` | リポジトリ名 | `Akyodex` |
| `GITHUB_BRANCH` | 使用するブランチ (省略時: main) | `main` |

##### オプションの環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_APP_URL` または `APP_ORIGIN` | CSRF保護用のオリジンURL | `https://akyodex.com` |
| `NEXT_PUBLIC_R2_BASE` | R2公開URL (カスタムドメイン使用時) | `https://images.akyodex.com` |

##### GitHub Personal Access Tokenの作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Scopes: `repo` (Full control of private repositories) ✅
4. Generate token
5. トークンをコピーして安全に保管

**注意**: Fine-grained tokensではなく、Classic tokensを使用してください。

#### 3.3 Bindingsの設定

Pages プロジェクト → Settings → Functions → Bindings

##### KV Namespace Binding

1. Add binding → KV namespace
2. Variable name: `AKYO_KV`
3. KV namespace: 先ほど作成したNamespaceを選択

##### R2 Bucket Binding

1. Add binding → R2 bucket
2. Variable name: `AKYO_BUCKET`
3. R2 bucket: 先ほど作成した `akyo-images` を選択

### 4. カスタムドメイン設定（オプション）

#### 4.1 Pages ドメイン

Pages プロジェクト → Custom domains → Add custom domain

1. ドメインを入力 (例: `akyodex.com`)
2. DNS設定に従ってCNAMEレコードを追加
3. SSL証明書が自動発行されるまで待つ (数分)

#### 4.2 R2 公開URL (カスタムドメインを使用する場合)

**方法1: Cloudflare Workers経由 (推奨)**

R2 Bucketを公開するWorkerを作成:

```javascript
// r2-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading /
    
    const object = await env.AKYO_BUCKET.get(key);
    
    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    
    return new Response(object.body, { headers });
  }
};
```

Workerをデプロイ:
```bash
npx wrangler publish r2-worker.js --name akyo-images
npx wrangler route add images.akyodex.com/* akyo-images
```

**方法2: R2 Public Buckets (ベータ機能)**

R2 → Bucket → Settings → Public access → Allow Access

⚠️ セキュリティリスク: 全ファイルが公開されます

### 5. デプロイ実行

#### 自動デプロイ (推奨)

GitHubにpushすると自動的にビルド＆デプロイされます。

```bash
git push origin main
```

#### 手動デプロイ

Pages プロジェクト → Deployments → Create deployment

### 6. デプロイ確認

1. デプロイが完了したら、Pages URLにアクセス
   ```
   https://akyodex-nextjs.pages.dev
   ```

2. 動作確認:
   - ✅ 図鑑ページ (`/zukan`) が表示される
   - ✅ 管理画面 (`/admin`) にログインできる
   - ✅ Akyo追加で画像アップロードが動作する
   - ✅ VRChat自動取得が動作する

## 🔧 トラブルシューティング

### ビルドエラー: `MODULE_NOT_FOUND`

**原因**: `node_modules` が正しくインストールされていない

**解決策**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### R2画像がアップロードされない

**原因**: R2 bindingが設定されていない、または変数名が間違っている

**確認事項**:
1. Pages → Settings → Functions → Bindings → R2 bucket
2. Variable name が `AKYO_BUCKET` であることを確認
3. Correct bucketが選択されていることを確認

**ログ確認**:
```bash
# Cloudflare Pages ダッシュボード → Deployments → View details → Functions log
```

### GitHub API エラー: `401 Unauthorized`

**原因**: GitHub tokenが無効、または権限が不足している

**解決策**:
1. GitHub tokenが正しく設定されているか確認
2. Token scopeに `repo` 権限があるか確認
3. Tokenが期限切れでないか確認

### VRChat画像取得タイムアウト

**原因**: VRChatサーバーの応答が遅い

**現在の対策**:
- サーバーサイド: 30秒タイムアウト実装済み
- クライアントサイド: 30秒タイムアウト実装済み

**エラー時の動作**:
- プレースホルダー画像が表示されます
- エラーメッセージが表示されます

### CSVコミットエラー: `409 Conflict`

**原因**: CSVファイルが同時編集された

**解決策**:
- もう一度保存を試行してください
- それでも失敗する場合は、ページをリロードして最新データを取得してください

## 🔐 セキュリティ設定

### 🔴 必須: JWT秘密鍵の設定

**重要**: `SESSION_SECRET` 環境変数は本番環境で**必須**です。

セッショントークンはJWT (JSON Web Token) で署名されており、この秘密鍵がないと攻撃者がセッションを改ざんして権限昇格できます。

**秘密鍵の生成方法**:
```bash
# ランダムな128文字の秘密鍵を生成 (推奨)
openssl rand -hex 64

# または Node.jsで生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

生成した秘密鍵を `SESSION_SECRET` 環境変数に設定してください。

⚠️ **注意**: 
- 秘密鍵は絶対にGitにコミットしないでください
- 本番環境と開発環境で異なる秘密鍵を使用してください
- 秘密鍵を変更すると、すべてのユーザーのセッションが無効になります

### 管理者アクセスコード

管理者アクセスコードは環境変数で設定されます。

**環境変数**:
```
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo
```

**アクセスコードについて**:
- **RadAkyo**: オーナー権限（フルアクセス、削除可能）
- **Akyo**: 管理者権限（追加・編集のみ）
- これらは信頼できるコミュニティメンバーと共有するためのシンプルなアクセスコードです
- 高度なセキュリティが必要な場合は、より複雑なパスワードに変更してください

### セッション有効期限

現在: 24時間 (86400000ミリ秒)

変更する場合:
```typescript
// src/app/api/admin/login/route.ts
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間
```

### セキュリティ機能一覧

このアプリケーションには以下のセキュリティ対策が実装されています:

#### 1. **HMAC SHA256 セッション署名**
- セッショントークンはHMAC SHA256で署名
- 攻撃者によるセッション改ざん・権限昇格を防止
- タイミングセーフな署名検証

#### 2. **CSRF保護**
- すべてのPOSTエンドポイントでOrigin/Referer検証
- クロスサイトリクエストフォージェリ攻撃を防止

#### 3. **入力検証**
- ID形式の厳格な検証 (4桁数字のみ: 0001-9999)
- フィールド値のバリデーション
- 不正な入力の早期検出

#### 4. **安全なCSV処理**
- `csv-parse`/`csv-stringify`ライブラリ使用
- 引用符、カンマ、改行を含むデータを正しく処理
- CSVインジェクション攻撃を防止

#### 5. **SSRF保護**
- VRChat APIアクセスのドメイン制限
- 許可されたドメインのみアクセス可能

#### 6. **XSS防止**
- URL scheme validation (https:/http: のみ)
- React の自動エスケープ

#### 7. **タイムアウト保護**
- すべての外部APIリクエストに30秒タイムアウト
- リソース枯渇攻撃を防止

### CORS設定

Next.js設定で適切なセキュリティヘッダーが設定済み:
```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ... その他のセキュリティヘッダー
        ],
      },
    ];
  },
};
```

## 📊 パフォーマンス最適化

### 画像キャッシュ

- R2画像: 1時間キャッシュ (`max-age=3600`)
- VRChat画像: 1時間キャッシュ (`max-age=3600`)
- VRChatページ: 6時間キャッシュ (`revalidate: 21600`)

### ISR (Incremental Static Regeneration)

図鑑ページは10分ごとに再生成:
```typescript
export const revalidate = 600; // 10分
```

必要に応じて調整してください。

## 🔄 古いHTMLサイトからの移行

### 移行前のデータバックアップ

1. **CSVファイル**: `data/Akyo-list_ja.csv`
   - ✅ 既に移行済み (GitHub経由で共有)

2. **画像ファイル**: `images/` フォルダ
   - ⚠️ ロゴ・アイコンのみ (図鑑画像ではない)
   - 必要に応じて `/public/images/` にコピー

3. **お気に入りデータ**: `localStorage`
   - ✅ ユーザーごとにブラウザに保存済み
   - 移行不要 (同じドメインであれば自動的に引き継がれる)

### DNS切り替え

1. 現在のサイトのバックアップを取る
2. Cloudflare Pagesで新サイトが正常動作することを確認
3. DNS CNAMEレコードを更新:
   ```
   akyodex.com  CNAME  akyodex-nextjs.pages.dev
   ```
4. SSL証明書が発行されるまで待つ (通常数分)
5. 旧サイトを削除 (オプション)

### ダウンタイムを最小化する手順

1. **準備期間**: 新サイトを別のサブドメインでテスト
   ```
   next.akyodex.com → akyodex-nextjs.pages.dev
   ```

2. **本番切り替え**: DNS TTLを短くしてから切り替え
   ```bash
   # 切り替え1時間前: TTLを60秒に設定
   # 切り替え: CNAMEを更新
   # 確認: 新サイトが正常動作
   # 24時間後: TTLを元に戻す (3600秒等)
   ```

## 📝 メンテナンス

### ログ確認

Pages ダッシュボード → Deployments → View details → Logs

### 環境変数の更新

Pages → Settings → Environment variables → Edit

変更後、新しいデプロイが必要:
```bash
git commit --allow-empty -m "Redeploy to update environment variables"
git push origin main
```

### R2ストレージ使用量確認

R2 → Bucket → Usage

無料枠: 10 GB

### KVストレージ使用量確認

Workers & Pages → KV → Namespace → Usage

無料枠: 1 GB, 100,000 read/day, 1,000 write/day

## 🆘 サポート

問題が発生した場合:

1. **デプロイログを確認**: Pages → Deployments → View details
2. **Function logsを確認**: Pages → Functions log
3. **ブラウザコンソールを確認**: F12 → Console
4. **GitHub Issuesで報告**: 具体的なエラーメッセージとスクリーンショット

## 📚 関連ドキュメント

- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

## 🆕 新機能

### VRChatフォールバック機能
画像が見つからない場合、自動的にVRChat APIから画像を取得します：
1. R2バケットから画像を取得
2. 失敗した場合、CSVからVRChat URLを取得
3. VRChat APIから画像を取得
4. それでも失敗した場合、プレースホルダー画像を表示

### Difyチャットボット
右下のオレンジ色のボタンからAIチャットボットにアクセスできます：
- 自然言語でアバターを検索
- 属性や作者で絞り込み
- 日本語・英語対応

---

**最終更新**: 2025-01-22  
**対象バージョン**: Next.js 15.5.2 / React 19.1.0 / @opennextjs/cloudflare 1.11.0

