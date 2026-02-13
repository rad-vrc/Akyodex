---
description: Akyodex project coding guidelines and AI assistant rules
globs: *
---

# Akyodex Copilot Instructions

**VRChat アバター図鑑「Akyodex」の AI アシスタント向けコーディングガイドライン**

---

## 技術スタック

- **Framework**: Next.js 15.5.10 (App Router) + React 19.1.0
- **Language**: TypeScript 5.9.3 (strict mode)
- **Runtime**: Cloudflare Pages (Edge + Node.js) + @opennextjs/cloudflare ^1.16.4
- **Storage**: Cloudflare R2 (画像・CSV・JSON), Cloudflare KV (セッション・データキャッシュ)
- **Styling**: Tailwind CSS 4 (PostCSS plugin)
- **Auth**: HMAC署名セッション (Web Crypto API) + HTTP-only Cookie
- **CSV**: csv-parse / csv-stringify
- **Data Sync**: GitHub API (CRUD時にCSVをGitHubへコミット)
- **Testing**: Playwright (E2E), Knip (dead code analysis)
- **Linting**: ESLint 9 + Next.js config
- **Node**: 20.x, npm 10.x

---

## データアーキテクチャ

**データソース優先順位**: KV (~5ms) → JSON (~20ms) → CSV (~200ms)

- `data/akyo-data-ja.csv` / `data/akyo-data-ja.json` — 日本語データ
- `data/akyo-data-en.csv` / `data/akyo-data-en.json` — 英語データ
- CRUD操作時: R2更新 → KVキャッシュ更新 → GitHub CSV同期 → ISR revalidation

**統合データモジュール**: `src/lib/akyo-data.ts` がエントリーポイント（KV→JSON→CSVフォールバック）

---

## コーディング規約

### 必須ルール

- ✅ **`any` 型の使用禁止** — 正確な型定義を使用すること
- ✅ **ES modules 必須** — `require()` ではなく `import` を使用（`scripts/` 除く）
- ✅ **ファイル末尾は改行1つ** — `.editorconfig` に準拠
- ✅ **PR は別ブランチから** — main への直接コミット禁止
- ✅ **未使用変数・export の削除** — Knip で検出されたら即削除

### セキュリティ

- 🔒 **入力バリデーション**: 長さ制限付き正規表現（ReDoS 防止）
  - VRChat ID: `/^avtr_[A-Za-z0-9-]{1,50}$/`
- 🔒 **パスワード比較**: constant-time Uint8Array 比較を使用
- 🔒 **HTML 出力**: `sanitize-html` でサニタイズ
- 🔒 **セッション**: HMAC 署名 (Web Crypto API)、**JWT は使用しない**
- 🔒 **CSRF 対策**: Origin/Referer ヘッダー検証 + SameSite=Strict Cookie
- 🔒 **CSP**: Nonce-based Content Security Policy (middleware 経由)

### API ルートパターン

#### 標準パターン (Edge Runtime)

```typescript
export const runtime = 'edge';

export async function POST(request: Request) {
  return Response.json({ success: true, data: result });
}
```

#### Node.js Runtime が必要な場合

```typescript
export const runtime = 'nodejs';
// 理由: csv-parse/sync, GitHub API, Buffer による R2 バイナリ操作
```

#### ヘルパー関数の使用（必須）

```typescript
import {
  jsonError,
  jsonSuccess,
  setSessionCookie,
  clearSessionCookie,
  ensureAdminRequest,
  validateOrigin,
} from '@/lib/api-helpers';

// エラーレスポンス
return jsonError('Invalid input', 400);
// => { success: false, error: 'Invalid input' }

// 成功レスポンス
return jsonSuccess({ data });
// => { success: true, data }

// 認証チェック
const result = await ensureAdminRequest(request, { requireOwner: true });
if ('response' in result) return result.response;
```

#### 禁止パターン

```typescript
// ❌ NextRequest/NextResponse を不必要に使わない
import { NextRequest, NextResponse } from 'next/server';

// ❌ jsonError() を使わず直接エラーレスポンス
return Response.json({ error: 'msg' }, { status: 400 });

// ❌ Cookie を直接操作しない
const cookieStore = await cookies();
cookieStore.set('admin_session', token, {
  /* ... */
});
```

---

## ワークフロー & リリースルール

### Git ワークフロー

1. ✅ **別ブランチで作業** — `feature/`, `fix/`, `refactor/` プレフィックス推奨
2. ✅ **main への直接コミット禁止**
3. ✅ **PR 作成前のチェック**:
   - `npm run lint` — ESLint エラーなし
   - `npm run build` — ビルド成功（型チェック含む）
   - `npm run test` (optional) — E2E テスト通過
4. ✅ **コミットメッセージ規約**:
   ```
   feat: Add new feature
   fix: Fix bug
   docs: Update documentation
   refactor: Refactor code
   test: Add tests
   chore: Update dependencies
   ```

---

## Cloudflare 固有ルール

### R2 ストレージ

- ✅ **同名キーでアップロード** — 既存オブジェクトを上書き（削除不要）
- ✅ **バインディング**: `AKYO_BUCKET` (R2), `AKYO_KV` (KV)
- ✅ **画像パス**: `images/{id}.webp` (例: `images/0001.webp`)
- ✅ **データファイル**: `data/akyo-data-ja.csv`, `data/akyo-data-ja.json`

### KV ストレージ

- ✅ **セッション**: `admin_session:{token}` — 24時間 TTL
- ✅ **データキャッシュ**: `akyo-data:ja`, `akyo-data:en` — ISR revalidation で更新

---

## データカテゴリ化ルール

### 基本原則

- ✅ **正確性と一貫性を優先**
- ✅ **複数カテゴリ許可** — 該当するすべてのカテゴリを割り当て
- ✅ **階層型カテゴリ推奨** — 例: `食べ物/野菜/きゅうり` ではなく `食べ物/野菜/きゅうり`
- ✅ **命名規則の統一** — 全カテゴリで一貫性を保つ
- ✅ **新規カテゴリ追加時** — 既存のカテゴリ化ロジックへの影響を考慮

### 言語別カテゴリ定義

- **日本語**: `scripts/category-definitions-ja.js` — COSTUME_KEYWORDS, OCCUPATION_KEYWORDS 等
- **英語**: `scripts/category-definitions-en.js` — 日本語版と同期を保つ

### カテゴリスクリプトのルール

#### 共通ロジックの抽出

- ✅ `scripts/update-categories-common.js` — `processCategories` 関数を共有
- ✅ `scripts/update-categories-v3.js` (日本語版)
- ✅ `scripts/update-categories-en-v3.js` (英語版)

#### 既知のバグと修正済みパターン

- ✅ **null/undefined ガード**: `oldCategory` が空の場合に TypeError を防ぐ
  ```javascript
  const categories = (oldCategory || '').replace(...).split(',').map(c => c.trim()).filter(Boolean);
  ```
- ✅ **部分文字列マッチの誤検出**:
  - "Onion" が "Oni" (鬼) にマッチしないよう正規表現で単語境界を使用
  - "マフラー" が "ラー" (太陽神) にマッチしないよう除外パターンを追加
- ✅ **ハードコードされたキーワード配列の削除**:
  - `category-definitions-*.js` からインポートして一元管理
- ✅ **CSV パースオプション**:
  - `relax_quotes`, `relax_column_count` を削除して厳密な検証を実施
  - または、必要性をコメントで明記 + ポストパース検証を実装

### カテゴリ修正履歴の例

以下は過去の修正例（今後の参考用）:

- キュウリ → `食べ物/野菜/きゅうり`
- ナスビ → `食べ物/野菜/ナス`
- 硬い → `素材・材質・生地/硬い`
- レッサーパンダ → `動物/レッサーパンダ` (食べ物から修正)
- サウAkyo → `パロディ/人物` に修正

---

## 環境変数ルール

### 必須変数（本番環境）

- ✅ `NEXT_PUBLIC_APP_URL` — CSRF allowlist に使用（未設定時は Host ヘッダーインジェクションリスク）
- ✅ `ADMIN_PASSWORD_OWNER`, `ADMIN_PASSWORD_ADMIN` — 平文で保存（サーバーサイドで HMAC 署名）
- ✅ `SESSION_SECRET` — HMAC 署名キー（128文字以上）
- ✅ `GITHUB_TOKEN` — CSV 同期用 PAT（`repo` scope）

### オプション変数

- `NEXT_PUBLIC_DIFY_CHATBOT_TOKEN` — 未設定時はチャットボット無効化
- `CSRF_DEV_ALLOWLIST=true` — Playwright 等でローカルホスト許可

---

## デバッグ & トラブルシューティング

### ビルドエラー

- ✅ **型エラー**: `npm run build` で検出（`ignoreBuildErrors` は削除済み）
- ✅ **ESLint エラー**: `npm run lint` で検出（`ignoreDuringBuilds` は削除済み）
- ✅ **未使用変数**: Knip で検出 → 即削除

### ランタイムエラー

- ✅ **Session verification failed**: `SESSION_SECRET` 環境変数を確認
- ✅ **CSRF validation failed**: `NEXT_PUBLIC_APP_URL` が本番URLと一致するか確認
- ✅ **R2 object not found**: バインディング名が `AKYO_BUCKET` か確認

---

## 禁止事項

- ❌ **機能デグレード** — エラー回避目的でのコメントアウト
- ❌ **未使用変数・export の放置** — Knip 警告を無視しない
- ❌ **`NEXT_PUBLIC_APP_URL` 未設定での本番デプロイ**
- ❌ **`NextRequest`/`NextResponse` の不必要な使用**
- ❌ **JWT の使用** — HMAC セッションに移行済み
- ❌ **`any` 型の使用** — 型安全性を維持

---

## ワークスペースレビュー & 改善ルール

### 完了済みタスク

- ✅ ESLint エラー修正（`require()` → `import` 変換、scripts/ 除外）
- ✅ Code duplication 削減（`akyo-data-helpers.ts` 抽出）
- ✅ 未使用 export 削除（Knip 警告解決）
- ✅ `next.config.ts` の型エラー解決（`ignoreBuildErrors` 削除）
- ✅ Data module リファクタリング（`getAllCategories`, `getAllAuthors` 統合）
- ✅ Backward compatibility fields 削除（`attribute` → `category` 移行完了）
- ✅ `/zukan` 静的化（`searchParams` 対応）
- ✅ Cookie の `Secure` フラグ追加（HTTPS 環境）
- ✅ Blur placeholders 実装（`generateBlurDataURL` 使用）
- ✅ `use-language.ts` の Cookie パース堅牢化

### 継続的な改善項目

- 🔄 **`findAkyoById` 最適化**: 大規模データセット対応のため `Map<string, AkyoData>` への移行を検討
- 🔄 **カテゴリ定義の一元管理**: `category-definitions-*.js` をさらに DRY に
- 🔄 **E2E テストカバレッジ拡大**: Playwright で主要フローをカバー

---

**Last Updated**: 2026-02-13
**Status**: ✅ Production Ready

このガイドラインは README および `.github/agents/agent.md` と整合性を保っています。
