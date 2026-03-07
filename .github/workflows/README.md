# CI/CD Workflows Documentation

このドキュメントは `.github/workflows/*.yml` の現行実装を起点にした運用メモです。README と YAML が食い違う場合は、YAML を正として扱ってください。

## 📚 関連ドキュメント

このディレクトリには、以下の補助ドキュメントがあります。

| ドキュメント | 内容 |
| ------------ | ---- |
| `ARCHITECTURE.md` | ワークフロー全体の設計背景 |
| `QUICKSTART.md` | GitHub Actions / Cloudflare の初期セットアップ |
| `SUMMARY.md` | 導入時のサマリー |
| `NEXTDEVTOOLS-IMPROVEMENTS.md` | Next.js / CI 改善メモ |
| `WORKERS-VS-PAGES-ANALYSIS.md` | Workers と Pages の比較検討 |

## ワークフロー概要

| ワークフロー | ファイル | トリガー | 主な役割 | 補足 |
| ------------- | --------- | --------- | --------- | ---- |
| CI | `ci.yml` | PR / push (`main`, `develop`) | 型チェック、Cloudflare Pages ビルド検証、Security Scan | ESLint と Dify CSP hash は advisory |
| Deploy to Cloudflare Pages | `deploy-cloudflare-pages.yml` | `main` push / manual | 本番または手動環境への Pages デプロイ | URL ヘルスチェック付き |
| Cloudflare Pages Preview Gate | `cloudflare-pages-preview-gate.yml` | non-draft PR (`main`, `develop`) | PR の preview 成否をゲート | Cloudflare API + GitHub check-run fallback |
| Conflict Check | `conflict-check.yml` | PR to `main`, push to `main` | `main` との競合をコメントで通知 | 競合解消時は古いコメントを削除 |
| Sync JSON Data from CSV | `sync-json-data.yml` | `main` push (CSV変更時) / manual | CSV→JSON 変換、R2 アップロード、ISR 再検証 | GitHub へ自動コミットも行う |
| Weekly Security Audit | `security-audit.yml` | weekly / manual | `npm audit`、Snyk、CodeQL、Issue 作成 | Snyk は token がある場合のみ有効 |
| Validate Cloudflare Resources | `validate-cloudflare-resources.yml` | daily / manual | R2/KV/CSV の健全性確認 | CSV チェックは legacy path 前提 |
| Next.js Health Check | `nextjs-health-check.yml` | PR (Next.js関連パス変更時) / manual | Next.js / Pages 互換性の advisory チェック | 警告中心で deploy の本線ではない |
| Lint project | `knip.yml` | PR / push (`main`, `cloudflare-opennext-test`) | `npm run knip` 実行 | dead-code / unused export 検知 |
| Claude Code Review | `claude-code-review.yml` | `@claude` メンション | Claude による issue / PR 補助 | 人手レビューの代替ではない |
| Reusable Build | `reusable-build.yml` | `workflow_call` | 再利用可能なビルド共通化 | 現在の本線 deploy/CI からは直接参照されていない |

### 推奨 Required Checks

Branch protection で最低限 Required にしたいのは次の 2 つです。

- `CI - Continuous Integration / Build Validation`
- `Cloudflare Pages Preview Gate / Verify Cloudflare Pages Preview`

`Conflict Check` は有用ですが、補助的なコメント通知として扱うのが実運用に合っています。

## 通常の開発フロー

1. ローカルで作業し、コミットする。
2. `git push` する。
3. PowerShell では repo 既定の wrapper が push 後に PR 状態を確認する。
4. それ以外の shell では `npm run push:check-pr -- -u origin HEAD` を使うと push と PR 状態確認をまとめて実行できる。
5. PR を開くと `CI` と `Cloudflare Pages Preview Gate` が走る。
6. `main` にマージされると `Deploy to Cloudflare Pages` が走る。
7. CSV を更新した commit が `main` に入ると `Sync JSON Data from CSV` が追加で走る。

## Cloudflare Pages Preview Gate

**ファイル**: `cloudflare-pages-preview-gate.yml`

### 何をしているか

- non-draft PR が `main` または `develop` を向いているときだけ実行します。
- fork PR では Cloudflare secrets にアクセスできないため、明示的に skip します。
- `vars.CLOUDFLARE_PAGES_PROJECT` を第 1 候補、`akyodex` を fallback 候補として preview deployment を探します。
- Cloudflare API の deployment metadata から `PR_HEAD_SHA` と branch を一致させて preview を特定します。
- Cloudflare 側 metadata に commit 情報が載らない場合は、GitHub の check run `Cloudflare Pages` を fallback として参照します。

### 責務分担

- PR preview の source of truth は Cloudflare Pages の Git-connected preview deployment です。
- この workflow 自体は preview を作らず、出来上がった preview の成否を待って判定します。
- production/manual deploy の source of truth は `deploy-cloudflare-pages.yml` の `wrangler pages deploy` です。

### 待機ポリシー

- 最大 36 回ポーリング
- 前半は 5 秒間隔、中盤は 10 秒間隔、後半は 20 秒間隔
- job 自体の timeout は 15 分

### 成功時の見え方

- Step Summary に deployment ID と preview URL を出力します。
- Cloudflare API で preview が見つかった場合も、GitHub check-run fallback で成功した場合も success 扱いです。

### 失敗時の見え方

- PR に失敗コメントを自動投稿または更新します。
- コメントには Actions run URL が含まれます。

### Runbook

Preview Gate が失敗または timeout したら、次を上から順に確認してください。

1. `CLOUDFLARE_PAGES_PROJECT` が実際の Pages project 名と一致しているか。
2. Cloudflare Pages 側で対象 commit の preview deployment が作成されているか。
3. GitHub checks に `Cloudflare Pages` という check run が出ているか。
4. fork PR ではないか。fork PR なら secrets 非公開のため gate は skip が正常です。

## Deploy to Cloudflare Pages

**ファイル**: `deploy-cloudflare-pages.yml`

### トリガー

- `push` to `main`
- `workflow_dispatch` with `environment=production|staging`

`environment=staging` は GitHub Actions の environment label を切り替えるだけです。Pages project、R2、KV、runtime secrets を分離したい場合は、workflow input とは別に Cloudflare 側の project / binding / secret 設計を分けてください。

### 実行フロー

1. Node.js 20 をセットアップし、npm cache と `.next/cache` を復元
2. `npm ci`
3. `npm run build`
4. `.open-next`、`_worker.js`、`_routes.json`、`_next/` の存在を検証
5. `cloudflare/wrangler-action@v3` で `pages deploy .open-next --project-name=${CF_PAGES_PROJECT}`
6. deployment URL に対して HTTP ヘルスチェック
7. Step Summary に deploy 結果を記録

### ヘルスチェック仕様

- 対象: `steps.deployment.outputs.url`
- 成功条件: HTTP `200` / `301` / `302`
- リトライ: 10 回
- 間隔: 3 秒

### Step Summary の読み方

| 状態 | 意味 |
| ---- | ---- |
| `Deploy Step=success`, `Health Check=healthy` | deploy と URL 応答が両方成功 |
| `Deploy Step=success`, `Health Check=missing_url` | deploy 自体は成功したが action が URL を返さなかった |
| `Deploy Step=success`, `Health Check=unhealthy` | deploy 後の URL が想定 HTTP を返さなかった |
| `Deploy Step!=success` | Wrangler deploy そのものが失敗 |

### 実装上の注意点

- workflow は `CF_PAGES_PROJECT=${{ vars.CLOUDFLARE_PAGES_PROJECT || 'akyodex' }}` を使います。
- build step では `DEFAULT_ADMIN_PASSWORD_HASH` / `DEFAULT_OWNER_PASSWORD_HASH` / `DEFAULT_JWT_SECRET` 由来の legacy fallback をまだ export しています。
- ただし runtime code が読むのは `ADMIN_PASSWORD_OWNER`, `ADMIN_PASSWORD_ADMIN`, `SESSION_SECRET` です。workflow 側の legacy defaults は runtime source of truth ではありません。
- workflow ファイルには PR コメント step がありますが、現在の trigger は `push` と `workflow_dispatch` のみなので、その step は通常到達しません。

## CI とマージ安全性

### CI (`ci.yml`)

`ci.yml` は 5 つの job で構成されています。

| Job | 役割 | Gating |
| --- | ---- | ------ |
| `lint-and-typecheck` | Dify CSP hash 検証、ESLint、TypeScript | TypeScript は hard fail、Dify hash と ESLint は `continue-on-error` |
| `build-validation` | Cloudflare Pages build と成果物検証 | Required check 候補 |
| `security-scan` | `npm audit` と CodeQL | `npm audit` は advisory |
| `dependency-review` | 依存関係レビュー (PR only) | 中程度以上で fail |
| `build-performance` | build 時間とサイズの計測 (PR only) | レポート用途 |

### Conflict Check (`conflict-check.yml`)

- PR to `main`: PR head に `origin/main` を merge して競合有無を確認
- `main` push: open PR 一覧をなめて mergeable 状態を再チェック
- 競合がある場合は PR コメントを作成/更新
- 競合が解消された場合は過去コメントを削除

### ローカル push helper

repo ルートの `npm run push:check-pr` は次をまとめて行います。

- 既に merged 済み PR に紐づく branch かどうかのガード
- 必要なら `git push`
- 対象 branch の open PR を `gh pr list` で確認
- mergeability pending の場合は retry 後に exit code `4`

主な exit code:

- `2`: open PR が conflicted (`mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`)
- `4`: GitHub が mergeability をまだ計算中
- `5`: 現在の branch は既に merged PR に紐づいているので、新しい branch / PR を使うべき

## データ同期と補助ワークフロー

### Sync JSON Data from CSV (`sync-json-data.yml`)

- `data/akyo-data-ja.csv`, `data/akyo-data-en.csv`, `data/akyo-data-ko.csv` の変更で起動
- `npm run data:convert` で JSON を再生成
- 差分があれば JSON をコミットして push
- R2 へ `data/akyo-data-*.json` をアップロード
- `REVALIDATE_SECRET` があれば `/api/revalidate` を叩いて ISR と KV cache 更新を促す

### Validate Cloudflare Resources (`validate-cloudflare-resources.yml`)

この workflow は次を確認します。

- Wrangler 経由での R2 bucket access
- Wrangler 経由での KV namespace access
- CSV ファイル存在確認

ただし現行 YAML では CSV チェックが legacy path のままです。

- `data/akyo-data.csv`
- `data/akyo-data-US.csv`

現在の repo で使っている実ファイルは `data/akyo-data-ja.csv` と `data/akyo-data-en.csv` なので、CSV step の失敗は workflow drift である可能性を先に疑ってください。

### Weekly Security Audit (`security-audit.yml`)

- weekly/manual で実行
- `npm audit --json`
- Snyk scan (`SNYK_TOKEN` がある場合)
- CodeQL analyze
- outdated dependencies report
- 脆弱性が見つかった場合は GitHub Issue を自動作成

### Next.js Health Check (`nextjs-health-check.yml`)

- Next.js 関連ファイル変更時に実行
- App Router、deprecated pattern、Pages 互換性、画像設定などを grep ベースで確認
- 警告中心の advisory workflow であり、Cloudflare deploy の source of truth ではありません

注意:

- この workflow は `export const runtime = 'nodejs'` を warning することがあります。
- 本 repo には意図的に Node.js runtime を使う API route もあるため、警告はコード文脈と合わせて判断してください。

### Lint / Claude / Reusable Build

- `knip.yml`: `npm run knip` による dead-code 検査
- `claude-code-review.yml`: `@claude` メンション時のみ起動する補助 workflow
- `reusable-build.yml`: 将来の caller 向け build helper。現時点では本線 CI/deploy からは直接呼ばれていません

## 必要なシークレットと変数

### GitHub Actions 側

| 名前 | 主な用途 | 必須 |
| ---- | -------- | ---- |
| `CLOUDFLARE_API_TOKEN` | Deploy / Preview Gate | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy / Preview Gate | Yes |
| `CLOUDFLARE_PAGES_PROJECT` | Deploy / Preview Gate の project 解決 | Recommended |
| `NEXT_PUBLIC_SITE_URL` | build-time fallback | Optional |
| `NEXT_PUBLIC_R2_BASE` | build-time fallback | Optional |
| `DEFAULT_ADMIN_PASSWORD_HASH` | legacy build fallback | Optional |
| `DEFAULT_OWNER_PASSWORD_HASH` | legacy build fallback | Optional |
| `DEFAULT_JWT_SECRET` | legacy build fallback | Optional |
| `R2_ACCESS_KEY_ID` | JSON sync の R2 upload | `sync-json-data.yml` で必須 |
| `R2_SECRET_ACCESS_KEY` | JSON sync の R2 upload | `sync-json-data.yml` で必須 |
| `REVALIDATE_SECRET` | JSON sync 後の ISR 再検証 | Recommended |
| `SNYK_TOKEN` | Weekly Security Audit | Optional |
| `ANTHROPIC_API_KEY` | Claude Code Review | `@claude` workflow で必須 |

### Cloudflare runtime 側

| 名前 | 用途 |
| ---- | ---- |
| `ADMIN_PASSWORD_OWNER` | owner login |
| `ADMIN_PASSWORD_ADMIN` | admin login |
| `SESSION_SECRET` | session HMAC signing |
| `NEXT_PUBLIC_APP_URL` | CSRF origin 判定 |
| `NEXT_PUBLIC_R2_BASE` | public image/data base URL |
| `GITHUB_TOKEN` / `GITHUB_*` | admin-side CSV sync |
| `REVALIDATE_SECRET` | `/api/revalidate` |

## トラブルシューティング

### Preview Gate が skip された

- fork PR か確認してください。
- fork PR なら `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が読めないため skip が正常です。
- fork PR の author が自力で確認できるのは GitHub 上の CI と一般的なアプリ動作までです。Cloudflare preview / secrets 依存の確認は maintainer 側で行う必要があります。

### Preview Gate が timeout / failed した

1. `CLOUDFLARE_PAGES_PROJECT` の値を確認する
2. Cloudflare Pages の preview deployment 一覧で対象 commit を探す
3. GitHub checks の `Cloudflare Pages` を確認する
4. 必要なら rerun する

### Deploy workflow が `missing_url` になった

- deploy 自体は完了している可能性があります。
- Step Summary と Cloudflare Pages dashboard の deployment URL を確認してください。

### ロールバックしたい

最短経路は、問題を起こした commit を `main` で revert し、`Deploy to Cloudflare Pages` を再度走らせることです。

- アプリコードの rollback: revert commit を `main` に push する
- CSV / JSON 変更を含む rollback: revert 後に `sync-json-data.yml` が期待通り `data/akyo-data-*.json` と R2 を戻しているか確認する

### `npm run push:check-pr` が失敗した

- `2`: PR conflict を解消する
- `4`: 少し待って再実行する
- `5`: その branch は既に merged PR に紐づいているので、新しい branch を切る

### `Validate Cloudflare Resources` の CSV step だけ失敗した

- まず workflow が legacy CSV path を見ていないか確認してください。
- 現状は `data/akyo-data.csv` / `data/akyo-data-US.csv` を前提としているため、repo 側の実ファイル名と一致しません。

---

**最終更新**: 2026-03-07  
**対象実装**: `.github/workflows/*.yml`, `scripts/push-and-check-pr-conflicts.js`, `open-next.config.ts`, `scripts/prepare-cloudflare-pages.js`
