# CI/CD Workflows Documentation

このドキュメントでは、Akyodex Next.js プロジェクトの GitHub Actions CI/CD ワークフローについて説明します。

## 📋 目次

1. [ワークフロー概要](#ワークフロー概要)
2. [CI - Continuous Integration](#ci---continuous-integration)
3. [Cloudflare Pages デプロイメント](#cloudflare-pages-デプロイメント)
4. [セキュリティ監査](#セキュリティ監査)
5. [Cloudflare リソース検証](#cloudflare-リソース検証)
6. [再利用可能なビルドワークフロー](#再利用可能なビルドワークフロー)
7. [必要なシークレットと変数](#必要なシークレットと変数)
8. [ベストプラクティス](#ベストプラクティス)
9. [トラブルシューティング](#トラブルシューティング)

---

## ワークフロー概要

このプロジェクトには、以下の GitHub Actions ワークフローが実装されています：

| ワークフロー | ファイル | トリガー | 目的 |
|------------|---------|---------|------|
| **CI** | `ci.yml` | PR, Push | Lint、型チェック、ビルド検証、セキュリティスキャン |
| **Deploy** | `deploy-cloudflare-pages.yml` | Push to main, Manual | Cloudflare Pages へのデプロイ |
| **Security Audit** | `security-audit.yml` | 毎週月曜日, Manual | 依存関係の脆弱性スキャン |
| **Validate Resources** | `validate-cloudflare-resources.yml` | 毎日, Manual | R2/KV/CSV データの整合性チェック |
| **Reusable Build** | `reusable-build.yml` | Workflow call | 共通ビルドロジック（DRY原則） |
| **Next.js Health Check** | `nextjs-health-check.yml` | PR (コード変更時) | Next.js設定とベストプラクティス検証 |

---

## CI - Continuous Integration

**ファイル**: `.github/workflows/ci.yml`

### トリガー条件

```yaml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
```

### ジョブ構成

#### 1. Lint & Type Check
- ESLint による静的解析
- TypeScript の型チェック
- 依存関係: なし

#### 2. Build Validation
- Cloudflare Pages 用のビルド実行
- ビルド成果物の検証
- アーティファクトのアップロード (7日間保持)
- 依存関係: lint-and-typecheck

#### 3. Security Scan
- npm audit 実行
- CodeQL による静的セキュリティ分析
- 依存関係: lint-and-typecheck

#### 4. Dependency Review (PR のみ)
- 依存関係の変更レビュー
- 中程度以上の脆弱性でフェイル
- 依存関係: なし

#### 5. Build Performance Report (PR のみ)
- ビルド時間の測定
- ビルドサイズの分析
- 依存関係: build-validation

### 最適化機能

- **並行実行制御**: 同一コミットに対する重複実行を防止
  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```

- **npm キャッシュ**: 依存関係のインストール時間を短縮
  ```yaml
  cache: 'npm'
  ```

- **Next.js ビルドキャッシュ**: `.next/cache` と `.open-next` をキャッシュ
  ```yaml
  - uses: actions/cache@v4
    with:
      path: |
        .next/cache
        .open-next
      key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
  ```
  
  **効果**: 
  - 初回ビルド: ~2-3分
  - キャッシュヒット時: ~1-2分（30-50% 高速化）
  - Next.js の増分ビルド機能を活用

- **ビルド検証**: 重要なファイルの存在を確認
  ```bash
  test -f .open-next/_worker.js  # Worker スクリプト
  test -f .open-next/_routes.json  # ルート設定
  test -d .open-next/_next  # Next.js アセット
  ```

### 実行例

```bash
# PR を作成時に自動実行
git checkout -b feature/my-feature
git commit -m "feat: add new feature"
git push origin feature/my-feature
# → GitHub で PR 作成 → CI 自動実行
```

---

## Cloudflare Pages デプロイメント

**ファイル**: `.github/workflows/deploy-cloudflare-pages.yml`

### トリガー条件

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # 手動実行可能
    inputs:
      environment:
        type: choice
        options: [production, staging]
```

### デプロイフロー

1. **ビルド準備**
   - Node.js 20 セットアップ
   - 依存関係インストール (npm ci)

2. **ビルド実行**
   - `npm run build` で OpenNext Cloudflare ビルド
   - 環境変数は Cloudflare Pages ダッシュボードで設定済みのものを使用

3. **ビルド検証**
   - `.open-next` ディレクトリの存在確認
   - ビルド成果物のサイズ確認

4. **Cloudflare Pages デプロイ**
   - `wrangler-action@v3` を使用
   - プロジェクト名: `akyodex-nextjs`

5. **デプロイサマリー作成**
   - GitHub Step Summary に結果表示
   - PR の場合はコメント投稿

### 環境変数

デプロイ時は Cloudflare Pages ダッシュボードで設定した環境変数が優先されます。
GitHub Secrets はビルドプロセスのフォールバック用です。

```yaml
env:
  ADMIN_PASSWORD_HASH: ${{ secrets.ADMIN_PASSWORD_HASH }}
  OWNER_PASSWORD_HASH: ${{ secrets.OWNER_PASSWORD_HASH }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  NEXT_PUBLIC_SITE_URL: ${{ vars.NEXT_PUBLIC_SITE_URL }}
  NEXT_PUBLIC_R2_BASE: ${{ vars.NEXT_PUBLIC_R2_BASE }}
```

### 手動デプロイ

GitHub UI から手動実行可能：

1. Actions タブ → "Deploy to Cloudflare Pages" を選択
2. "Run workflow" をクリック
3. 環境 (production/staging) を選択
4. "Run workflow" を実行

---

## セキュリティ監査

**ファイル**: `.github/workflows/security-audit.yml`

### トリガー条件

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜日 9:00 UTC
  workflow_dispatch:     # 手動実行可能
```

### 監査内容

#### 1. npm audit
- npm の脆弱性データベースをスキャン
- 中程度以上の脆弱性を検出
- 結果を JSON で保存 (30日間保持)

#### 2. Snyk Security Scan (オプション)
- Snyk トークンが設定されている場合に実行
- より詳細な脆弱性分析

#### 3. CodeQL 分析
- `security-extended` クエリセットを使用
- JavaScript/TypeScript の静的分析

#### 4. 古い依存関係チェック
- `npm outdated` を実行
- アップデート可能なパッケージをレポート

#### 5. Issue 自動作成
- 脆弱性が見つかった場合、GitHub Issue を自動作成
- ラベル: `security`, `automated`

### Snyk 統合 (オプション)

Snyk を使用する場合は、以下のシークレットを設定：

```bash
# GitHub Settings → Secrets → Actions
SNYK_TOKEN=your_snyk_api_token
```

---

## Cloudflare リソース検証

**ファイル**: `.github/workflows/validate-cloudflare-resources.yml`

### トリガー条件

```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # 毎日 6:00 UTC
  workflow_dispatch:     # 手動実行可能
```

### 検証内容

#### 1. R2 Storage 検証
- wrangler.toml の確認
- R2 バケットへのアクセス確認
- バケットリストの取得

#### 2. KV Namespace 検証
- KV Namespace へのアクセス確認
- Namespace リストの取得

#### 3. CSV データ検証
- CSV ファイルの存在確認
  - `data/akyo-data.csv` (日本語)
  - `data/akyo-data-US.csv` (英語)
- レコード数のカウント
- 空ファイルチェック

#### 4. ヘルスチェックレポート
- 各検証の結果を集計
- ステータスサマリーを作成
- 失敗時は次のステップを提示

### 実行例

```bash
# 手動実行
GitHub Actions タブ → "Validate Cloudflare Resources" → "Run workflow"
```

---

## Next.js Health Check

**ファイル**: `.github/workflows/nextjs-health-check.yml`

### トリガー条件

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'app/**'
      - 'pages/**'
      - 'next.config.*'
      - 'package.json'
  workflow_dispatch:
```

### 検証内容

#### 1. Next.js バージョンチェック
- Next.js のバージョンを確認
- Next.js 15.5+ の使用を推奨

#### 2. App Router 構造検証
- App Router の使用確認
- params/searchParams の適切な await 処理確認
- Next.js 15 の非同期 API 対応

#### 3. 非推奨パターンチェック
- getServerSideProps/getStaticProps の誤用検出
- レガシー Image コンポーネントの使用検出
- Pages Router メソッドの App Router での使用検出

#### 4. Cloudflare Pages 互換性
- Edge Runtime 互換性チェック
- Node.js API の誤用検出（fs, child_process など）
- runtime export の検証

#### 5. ビルド設定検証
- next.config の存在確認
- Turbopack の使用確認
- 画像最適化設定の確認

#### 6. バンドル最適化分析
- 大きな依存関係の検出
- Dynamic imports の使用確認
- コード分割の推奨

### 実行例

```bash
# PR を作成すると自動実行（コード変更時）
git checkout -b feature/my-feature
# src/ 配下を変更
git push origin feature/my-feature
# → GitHub で PR 作成 → Health Check 自動実行
```

---

## 再利用可能なビルドワークフロー

**ファイル**: `.github/workflows/reusable-build.yml`

### 概要

DRY (Don't Repeat Yourself) 原則に従い、共通ビルドロジックを再利用可能なワークフローとして定義。

### 入力パラメータ

```yaml
inputs:
  node-version: '20'           # Node.js バージョン
  upload-artifacts: false      # アーティファクトをアップロードするか
  artifact-name: 'build-output' # アーティファクト名
```

### 出力

```yaml
outputs:
  build-time: ビルド時間 (秒)
  build-size: ビルドサイズ (バイト)
```

### 使用例

他のワークフローから呼び出す：

```yaml
jobs:
  build:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '20'
      upload-artifacts: true
      artifact-name: 'my-build'
    secrets: inherit
```

### 最適化機能

- **node_modules キャッシュ**: インストール時間を短縮
- **ビルドメトリクス**: 時間とサイズを出力
- **柔軟な設定**: プロジェクトに応じてカスタマイズ可能

---

## 必要なシークレットと変数

### GitHub Secrets

以下のシークレットを GitHub リポジトリ設定で追加してください：

| シークレット名 | 必須 | 説明 |
|--------------|------|------|
| `CLOUDFLARE_API_TOKEN` | ✅ Yes | Cloudflare API トークン (デプロイ用) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ Yes | Cloudflare アカウント ID |
| `SNYK_TOKEN` | 🔵 Optional | Snyk API トークン (セキュリティ監査用) |

**注意**: パスワードハッシュと JWT シークレットは、セキュリティのため GitHub Variables に設定します。

### GitHub Variables

| 変数名 | 必須 | 説明 | デフォルト値 |
|-------|------|------|------------|
| `DEFAULT_ADMIN_PASSWORD_HASH` | ✅ Yes | ビルド用管理者パスワードハッシュ | - |
| `DEFAULT_OWNER_PASSWORD_HASH` | ✅ Yes | ビルド用オーナーパスワードハッシュ | - |
| `DEFAULT_JWT_SECRET` | ✅ Yes | ビルド用 JWT シークレット | - |
| `NEXT_PUBLIC_SITE_URL` | 🔵 Optional | サイト URL | - |
| `NEXT_PUBLIC_R2_BASE` | 🔵 Optional | R2 ベース URL | - |

**重要**: 本番用の環境変数は、必ず Cloudflare Pages ダッシュボードで設定してください。
GitHub Variables はビルドプロセス用の値です。

### Cloudflare API トークンの作成

1. Cloudflare ダッシュボード → My Profile → API Tokens
2. "Create Token" をクリック
3. "Edit Cloudflare Workers" テンプレートを選択
4. 以下の権限を付与：
   - Account → Cloudflare Pages → Edit
   - Account → Account Settings → Read
5. トークンをコピーして GitHub Secrets に追加

### 環境変数の設定方法

```bash
# GitHub リポジトリで設定
# Secrets (Settings → Secrets and variables → Actions → New repository secret)
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
SNYK_TOKEN (optional)

# Variables (Settings → Secrets and variables → Actions → Variables → New repository variable)
DEFAULT_ADMIN_PASSWORD_HASH
DEFAULT_OWNER_PASSWORD_HASH
DEFAULT_JWT_SECRET
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_R2_BASE

# Cloudflare Pages で設定 (本番用)
Cloudflare Pages ダッシュボード
→ プロジェクト選択 → Settings → Environment variables
ADMIN_PASSWORD_HASH (本番用の値)
OWNER_PASSWORD_HASH (本番用の値)
JWT_SECRET (本番用の値)
```

**重要**: 
- GitHub Variables は CI/CD ビルドプロセス用です
- 本番環境の実際の値は Cloudflare Pages ダッシュボードで設定してください
- Secrets と Variables を混同しないでください（Secrets は暗号化、Variables は平文）

---

## ベストプラクティス

### 1. ブランチ戦略

```
main (本番)
  ← develop (開発)
    ← feature/* (機能開発)
    ← bugfix/* (バグ修正)
    ← hotfix/* (緊急修正)
```

### 2. PR ワークフロー

```bash
# 1. 機能ブランチを作成
git checkout -b feature/my-feature

# 2. 変更をコミット
git add .
git commit -m "feat: add new feature"

# 3. PR を作成
git push origin feature/my-feature
# → GitHub で PR 作成

# 4. CI が自動実行
# - Lint & Type Check
# - Build Validation
# - Security Scan
# - Dependency Review

# 5. レビュー後、main にマージ
# → 自動デプロイ実行
```

### 3. コミットメッセージ規約

```bash
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加
chore: ビルド設定など
```

### 4. セキュリティ

- **シークレットは絶対にコミットしない**
- **定期的なセキュリティ監査を実施**
- **依存関係を最新に保つ**
- **CodeQL 警告は速やかに対応**

### 5. パフォーマンス

- **npm キャッシュを活用**
- **並行実行制御で重複ビルドを防止**
- **必要なジョブのみ実行**

---

## トラブルシューティング

### ビルドが失敗する

#### 症状
```
Error: Cannot find module '@opennextjs/cloudflare'
```

#### 解決策
```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

---

### デプロイが失敗する

#### 症状
```
Error: Invalid API token
```

#### 解決策
1. Cloudflare API トークンを再確認
2. 権限が正しく設定されているか確認
3. アカウント ID が正しいか確認

```bash
# GitHub Secrets を確認
Settings → Secrets and variables → Actions
→ CLOUDFLARE_API_TOKEN
→ CLOUDFLARE_ACCOUNT_ID
```

---

### TypeScript エラー

#### 症状
```
error TS2307: Cannot find module 'next' or its corresponding type declarations.
```

#### 解決策
```bash
# 型定義を再インストール
npm install --save-dev @types/node @types/react @types/react-dom
```

---

### セキュリティ監査で脆弱性が見つかった

#### 対応手順

1. **脆弱性の確認**
   ```bash
   npm audit
   ```

2. **自動修正を試す**
   ```bash
   npm audit fix
   ```

3. **手動更新が必要な場合**
   ```bash
   npm update package-name
   ```

4. **破壊的変更がある場合**
   - CHANGELOG を確認
   - テストを実行
   - 段階的にアップデート

---

### R2/KV バリデーションが失敗する

#### 症状
```
Could not list R2 buckets - check API token permissions
```

#### 解決策
1. API トークンに以下の権限があるか確認：
   - Account → Workers R2 Storage → Read
   - Account → Workers KV Storage → Read

2. wrangler.toml の設定を確認
   ```toml
   name = "akyodex-nextjs"
   compatibility_date = "2025-01-22"
   ```

3. Cloudflare ダッシュボードでリソースが存在するか確認

---

### CI が遅い

#### 最適化方法

1. **キャッシュの活用**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: node_modules
       key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
   ```

2. **並列実行**
   - 依存関係のないジョブは並列実行
   - `needs:` を適切に設定

3. **不要なジョブをスキップ**
   ```yaml
   if: github.event_name == 'pull_request'
   ```

---

## REST API の考え方に基づいた設計

### リソース指向のワークフロー

このワークフローは、REST API の原則に従って設計されています：

1. **リソースの明確な定義**
   - ビルド成果物 (Build Artifacts)
   - デプロイメント (Deployments)
   - セキュリティレポート (Security Reports)
   - リソース検証 (Resource Validations)

2. **ステートレスな処理**
   - 各ワークフローは独立して実行可能
   - 前回の実行状態に依存しない

3. **再利用可能なコンポーネント**
   - `reusable-build.yml` で共通ロジックを抽出
   - DRY 原則に従った設計

4. **適切な HTTP メソッドに対応**
   - GET: 情報取得 (セキュリティ監査、リソース検証)
   - POST: リソース作成 (ビルド、デプロイ)
   - PUT: リソース更新 (再デプロイ)

---

## まとめ

このワークフローセットは、以下の原則に基づいて設計されています：

✅ **DRY (Don't Repeat Yourself)**: 共通ロジックを再利用可能なワークフローに抽出
✅ **REST API の考え方**: リソース指向、ステートレス、再利用可能
✅ **Next.js 15 ベストプラクティス**: App Router、Edge Runtime、ISR
✅ **Tailwind CSS 最適化**: 適切なビルド設定
✅ **Cloudflare Pages 最適化**: OpenNext、R2、KV の活用
✅ **セキュリティ**: CodeQL、npm audit、定期監査
✅ **パフォーマンス**: キャッシング、並列実行、最適化されたビルド

---

**最終更新**: 2025-10-29
**対応バージョン**: Next.js 15.5.2, Tailwind CSS 4.x, @opennextjs/cloudflare 1.11.0
