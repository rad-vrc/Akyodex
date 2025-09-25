# Akyoずかん - 500種類以上のなぞの生き物を探索しよう

## プロジェクト概要

Akyoずかんは、500種類以上存在する「Akyo」というなぞの生き物たちを検索・閲覧できるファン向けの図鑑サイトです。子どもでも親しみやすいモダンなカードデザインで、ポケモン図鑑のような楽しい体験を提供します。

## プロジェクトの目標

- Akyoファンが全種類のAkyoを簡単に検索・閲覧できる
- お気に入り機能で好きなAkyoをコレクション
- 属性や作者による詳細な分類と検索
- VRChatアバターへの直接リンク提供
- レスポンシブデザインでスマホ・タブレット対応

## ✨ 主な機能

### 🎆 現在実装済みの機能

1. **データ管理**
   - CSV形式のAkyoデータの読み込みと解析（data/Akyo-data.csv または localStorage.AkyoDataCSV）
   - クロスタブ同期：'AkyoDataCSV' の更新を検知して自動リロード
   - IndexedDBによる大容量画像データの保存（数GB対応）

2. **表示モード**
   - **グリッドビュー**: カード形式で視覚的に表示（デフォルト）
   - **リストビュー**: 詳細情報を含む表形式表示
   - ワンクリックでビュー切り替え可能

3. **検索・フィルタリング機能**
   - **フリーワード検索**: ID、名前、属性、作者、備考から検索
   - **属性フィルター**: ドロップダウンで属性別に絞り込み
   - **クイックフィルター**:
     - ランダム表示（20体をランダムピックアップ）
     - お気に入りのみ表示

4. **詳細表示機能**
   - モーダルウィンドウで詳細情報を表示
   - 備考の完全表示（複数行対応）
   - VRChatアバターURLへの直接リンク

5. **お気に入り機能**
   - ワンクリックでお気に入り登録/解除
   - LocalStorageによる永続化（ブラウザを閉じても保持）
   - お気に入り数のリアルタイム表示

6. **統計情報**
   - 全Akyo数の表示
   - 現在表示中の件数
   - お気に入り登録数

7. **レスポンシブデザイン**
   - PC、タブレット、スマートフォンに完全対応
   - Tailwind CSSによるモダンなUI
   - 滑らかなアニメーション効果

8. **管理者機能**
   - 2階層認証システム（オーナー/管理者）
   - Akyoデータの追加・編集・削除
   - CSVインポート（ツールタブに統合）
   - 自動ID割り当て機能
   - ID自動圧縮・再採番機能

9. **デバッグツール**
   - データ状態のリアルタイム確認
   - ID割り当てロジックのテスト
   - 使用済みIDの可視化
   - デバッグログ表示

10. **子供向けデザイン** 🌈
    - パステルカラーの優しい配色
    - 丸みを帯びたデザイン要素
    - 楽しいアニメーション効果
    - 虹色グラデーション背景
    - 絵文字を活用した親しみやすいUI
    - カスタムロゴアップロード機能

## 🔗 機能別エントリーポイント

- `/index.html` - 図鑑（zukan）メインUI。CSV: data/Akyo-data.csv または localStorage.AkyoDataCSV
- `/admin.html` - 管理UI（タブ: 新規登録 / 編集・削除 / ツール（CSVインポート・ID再採番・エクスポート・統計））
- `/admin.html` - 管理UI（タブ: 新規登録 / 編集・削除 / ツール（CSVインポート・ID再採番・統計））

URLパラメータ（将来検討）

- `/?search={keyword}` - 検索キーワード指定
- `/?attribute={attr}` - 属性フィルター指定
- `/?id={AkyoId}` - 特定Akyoの詳細表示

## 📊 データ構造

### CSVデータフォーマット

```csv
ID,見た目,通称,アバター名,属性,備考,作者,アバターURL
001,,オリジンAkyo,Akyo origin,チョコミント類,すべてのはじまり,ugai,https://vrchat.com/...
```

### 内部データモデル

```javascript
{
  id: string,           // 3桁のID番号
  appearance: string,   // 見た目（現在は空）
  nickname: string,     // 通称
  avatarName: string,   // アバター名
  attribute: string,    // 属性（カンマ区切りで複数可）
  notes: string,        // 備考（複数行対応）
  creator: string,      // 作者名
  avatarUrl: string,    // VRChatアバターURL
  isFavorite: boolean   // お気に入りフラグ
}
```

## 🚀 今後の実装予定機能

1. **高度な検索機能**
   - 複数条件の組み合わせ検索
   - 検索履歴の保存
   - サジェスト機能

3. **統計・分析ページ**
   - 属性別分布グラフ（Chart.js使用）
   - 作者別統計
   - 人気ランキング

4. **コレクション機能**
   - 取得済み/未取得の管理
   - コレクション進捗率表示
   - 達成バッジシステム

5. **共有機能**
   - SNS共有ボタン
   - お気に入りリストの共有URL生成
   - QRコード生成

6. **PWA化**
   - オフライン対応
   - ホーム画面追加
   - プッシュ通知（新Akyo追加時）

## 💻 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **CSSフレームワーク**: Tailwind CSS (CDN)
- **アイコン**: Font Awesome 6.4
- **フォント**: Google Fonts (Noto Sans JP, Kosugi Maru)
- **データ形式**: CSV → JSON変換
- **ストレージ**:
  - IndexedDB（画像Base64データの一次保存: object store 'images'）
  - LocalStorage（お気に入り、CSVデータ 'AkyoDataCSV'、画像のフォールバック 'AkyoImages'）
  - SessionStorage（認証情報 'AkyoAdminAuth'）

## 📁 ファイル構成

```
/
├── index.html          # メインページ（図鑑）
├── admin.html          # 管理者ページ
├── (削除) image-manager.html  # 画像管理・編集ツール（削除済み）
├── (削除) bulk-upload.html    # 一括画像登録ツール（削除済み）
├── logo-upload.html    # アイコン設定ツール 🆙
├── migrate-storage.html # IndexedDB移行ツール
├── (削除) admin-import.html   # CSVインポートページ（削除済み）
├── test-indexeddb.html # IndexedDB確認ツール
├── test-debug.html     # デバッグツール
├── HOSTING-GUIDE.md    # ホスティングガイド 🆕
├── js/
│   ├── main.js        # 図鑑ページ用JavaScript
│   ├── admin.js       # 管理者ページ用JavaScript
│   ├── image-loader.js # 画像読み込み用JavaScript
│   ├── storage-manager.js # IndexedDB管理
│   └── storage-adapter.js # ストレージ互換レイヤー
├── css/
│   └── kid-friendly.css # 子ども向けデザインCSS
├── data/
│   └── Akyo-data.csv  # Akyoデータ
└── README.md          # このファイル
```

## 🎨 デザインコンセプト

- **モダンカード式**: Material Design風の洗練されたカードUI
- **親しみやすい配色**: パープル×ブルーのグラデーション
- **直感的な操作**: 子どもでも使いやすいシンプルな操作性
- **視覚的な楽しさ**: 属性ごとの色分けとアニメーション

## 📝 開発者向け情報

### ローカル開発

1. すべてのファイルをWebサーバーに配置
2. `index.html`をブラウザで開く
3. CSVファイルは`data/Akyo-data.csv`に配置
4. 管理機能は`admin.html`からアクセス
5. デバッグは`test-debug.html`で確認

### 管理者ログイン情報

- **オーナー権限**: `RadAkyo` - 全機能利用可能（削除含む）
- **管理者権限**: `Akyo` - 追加・編集のみ

### カスタマイズポイント

- 属性の色設定: `main.js`の`getAttributeColor()`関数
- カードデザイン: `main.js`の`createAkyoCard()`関数
- フィルター条件: 各種フィルター関数をカスタマイズ可能

## 🔄 更新履歴

### v2.3.1 (2025-09-24)

- 編集・削除: 初期表示で全Akyoを一覧表示（検索不要）
- ページ削除: image-manager.html と bulk-upload.html（および admin-import.html）を完全削除
- CSVインポート: MIME/拡張子判定を緩和し動作修正。ツールタブにCSVインポートUIを統合
- クロスタブ同期: main.jsにlocalStorage 'storage' リスナーを追加し、adminでの更新がzukanに自動反映
- 検索の堅牢化: 未定義フィールド参照で落ちないようnullガード
- ツール: データエクスポート項目を削除（CSVエクスポートは個別ツール化検討）
- 統計: 画像登録数をIndexedDB優先で集計するよう修正

### v2.3.0 (2025-01-24) 🚀

- 🔍 **検索ボックスのUI改善**
  - プレースホルダーテキストの位置調整
- 🎆 **モーダルの修正**
  - ×ボタンを固定位置に変更
  - スクロール時も常に表示
- 🌈 **アイコン設定機能の大幅改善**
  - 正方形固定で任意サイズに拡大縮小可能
  - プロフィールアイコン設定を追加
  - マウスホイールでサイズ調整
  - リサイズハンドル追加
- 📊 **一括アップロードの拡張**
  - 001-9999までのIDに対応
  - 4桁IDのサポート
- 🌐 **ホスティングガイド追加**
  - 無料ホスティングサービスの提案
  - Netlifyを使ったセットアップガイド

### v2.2.0 (2025-01-24) 🎊

- 🎨 **詳細モーダルのデザイン大幅改善**
  - 子どもにも親しみやすいポップなデザイン
  - アニメーション効果の追加
  - 絵文字を使った楽しいUI
  - スクロール問題の修正
- ✂️ **ロゴ切り抜き機能の改善**
  - 正方形固定で任意サイズに拡大縮小可能
  - マウスホイールでサイズ調整
  - リサイズハンドル追加
- 🎁 **ラベル変更**
  - 「おはなし」→「おまけ情報」に変更

### v2.2.0 (2025-01-24) 🌟

- 🎨 **子供向けUIの完成度向上**
  - 「詳細を見る」ボタンを「くわしく見る」に変更し、虹色グラデーションアニメーション追加
  - ボタンに星のアニメーションとバウンス効果を実装
  - ボタンホバー時に波紋エフェクトを追加
- 🖼️ **ロゴ表示機能の修正**
  - IndexedDBとlocalStorageの両方からロゴを読み込む機能を実装
  - ロゴ読み込みの信頼性向上（複数のタイミングで実行）
  - ロゴにフロートアニメーション効果を追加
- 🔧 **ストレージシステムの改善**
  - logo-upload.htmlがIndexedDBとlocalStorageの両方に保存するよう修正
  - ロゴ削除時も両方のストレージから削除するよう改善

### v2.1.0 (2025-01-24) 🎆

- 🖼️ **画像管理・編集ツール追加**
  - ID変更・入れ替え機能
  - 87番以降の一括修正機能
  - 連番チェック機能
  - 画像の個別編集・削除
- 🗑️ **不要ファイル削除**
  - LocalStorage関連の古いツールを削除
  - IndexedDB完全移行完了

### v2.0.0 (2025-01-24) 🌈

- ✨ **子どもにやさしいデザインに全面リニューアル**
  - パステル調の明るい色合い
  - 丸みを帯びたフォントとボタン
  - 楽しいアニメーション効果
  - 虹色のグラデーション
- 💾 **IndexedDB対応で容量制限を撤廃**
  - LocalStorage (5-10MB) → IndexedDB (数GB)
  - 大量の画像を保存可能
- 🚀 **一括画像登録ツール追加**
  - ドラッグ&ドロップ対応
  - 自動ID判定機能
- 🔐 **パスワード変更**
  - オーナー: `RadAkyo`
  - 管理者: `Akyo`

### v1.1.0 (2025-01-24)

- 🎆 「Akyo図鑑」から「Akyoずかん」へ名称変更
- 🔧 自動ID割り当て機能の修正と改善
- 🔍 デバッグツールの追加
- 🖼️ ID 001-020のハードコード画像を削除
- 🛠️ ID自動圧縮機能の実装

### v1.0.0 (2025-01-23)

- 初期リリース
- 基本的な検索・表示機能実装
- お気に入り機能追加
- レスポンシブデザイン対応

## 📝 開発メモ

- CSVの永続化は localStorage.AkyoDataCSV。未設定時は data/Akyo-data.csv をフェッチ
- 画像はIndexedDB優先で保存し、フォールバックにlocalStorage.AkyoImages
- 自動ID割り当ては001-020を優先的に使用
- ID削除時は自動で後続IDを詰める（お気に入り・画像のIDマップも更新）

## 🚀 次の開発推奨事項

1. **検索機能の強化**
   - 複数条件のAND/OR検索
   - 検索履歴の保存
   - サジェスト機能の実装

2. **パフォーマンス最適化**
   - 仮想スクロールの実装
   - 画像の遅延読み込み
   - WebP形式での画像保存

3. **ユーザー体験の向上**
   - PWA化によるオフライン対応
   - ダークモード対応
   - 音声検索機能
   - ゲーミフィケーション要素（バッジ、実績など）

4. **管理機能の拡充**
   - 画像の一括エクスポート/インポート（別ツールとして再設計する場合は要検討）
   - バックアップ・リストア機能
   - 変更履歴の記録

## 📧 お問い合わせ

Akyoずかんに関するご意見・ご要望は、プロジェクト管理者までお願いします。

---

公開URL/デプロイ

- デプロイはPublishタブから行ってください（ワンクリックで公開できます）

データモデル/ストレージまとめ

- CSV: data/Akyo-data.csv または localStorage.AkyoDataCSV
- 画像: IndexedDB 'images'（フォールバック localStorage.AkyoImages）
- 認証: sessionStorage.AkyoAdminAuth

**Akyoずかん** - すべてのAkyoファンのために 💜

## Akyodex 公開手順・完全版（Cloudflare Pages＋Functions＋R2＋KV）

- **API トークン**：`<CLOUDFLARE_API_TOKEN>`
- **Cloudflare アカウント名**：`<CLOUDFLARE_ACCOUNT_EMAIL>`
- **Pages プロジェクト名**：`akyodex-site`
- **本番ドメイン**：`akyodex.com`
- **画像配信ドメイン（R2公開用）**：`images.akyodex.com`
- **R2 バケット名**：`akyodex-images`
- **KV 名前空間**：`AKYO_KV`
- **管理者パスワード（オーナー）**：`<ADMIN_PASSWORD_OWNER>`
- **管理者パスワード（一般管理者）**：`<ADMIN_PASSWORD_ADMIN>`

---

## 0) 前提と現在のフォルダ構成

- いまのフォルダは**まだ変更していない**（`functions/` や `api` など未作成）。
- 画像は `images/001.webp`〜`images/612.webp`（3桁固定）＋ `images/logo.webp` と `images/profileIcon.webp` の計 **614枚**。
- **方針**：

  - ロゴ/アイコンは本体から直配信（`https://akyodex.com/images/logo.webp` など）。
  - Akyo画像は **R2** に置き、`https://images.akyodex.com/images/NNN.webp` で配信。
  - 表示側は **ID→URLマニフェスト**を `/api/manifest` から取得して解決。

---

## 1) Cloudflare 側の準備（ダッシュボード）

1. **Pages プロジェクトの作成**

   - プロジェクト名：`akyodex-site`
   - デプロイ方式：一旦は **手動（wrangler）** を想定（Git連携でも可）。
   - カスタムドメインに **`akyodex.com`** を割り当て（DNS が Cloudflare 管理下であること）。

2. **R2 バケットの作成**

   - バケット名：`akyodex-images`
   - **公開バケット**に設定。
   - カスタムドメイン **`images.akyodex.com`** を紐づけ（R2 側の「公開設定」→「カスタムドメイン」）。

3. **KV 名前空間の作成**

   - 名前空間：`AKYO_KV`

4. **Pages Functions のバインディングと環境変数**

   - 対象：`akyodex-site` → *Settings* → *Functions* → *Bindings*
   - 追加：

     - **R2**：`AKYO_BUCKET` → `akyodex-images`
     - **KV**：`AKYO_KV` → さきほど作った名前空間
     - **環境変数**：

       - `ADMIN_PASSWORD_OWNER = <ADMIN_PASSWORD_OWNER>`
       - `ADMIN_PASSWORD_ADMIN = <ADMIN_PASSWORD_ADMIN>`
       - `PUBLIC_R2_BASE = https://images.akyodex.com`

> ここまでで「Pages（本体）」「R2（公開画像）」「KV（メタデータ）」の受け皿が完成する。

---

## 2) ローカルの準備（wrangler とトークン）

- Node.js を準備（v18+ 推奨）。
- `npm i -D wrangler` または `npm i -g wrangler`
- **APIトークン** を環境に設定：

  - macOS/Linux: `export CLOUDFLARE_API_TOKEN=<CLOUDFLARE_API_TOKEN>`
  - PowerShell: `$env:CLOUDFLARE_API_TOKEN = '<CLOUDFLARE_API_TOKEN>'`

> 今回は **ユーザートークン（スコープ最小）**で運用する。Global API Key は使わない。

---

## 3) プロジェクト差分（ファイル追加）

ルートに以下を追加する。ディレクトリが無ければ作成する。

```
functions/
  _utils.ts
  api/
    upload.ts
    manifest.ts
public/  （使わない場合は作成不要。既存 index.html などがルートにあるならそのまま）
js/
  image-manifest-loader.js  （なければ追加）
```

### 3.1 functions/_utils.ts

```ts
export function okJSON(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
    status: init.status ?? 200,
  });
}

export function errJSON(status: number, message: string) {
  return okJSON({ error: message }, { status });
}

export function corsHeaders(origin?: string) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "GET,POST,OPTIONS,DELETE",
    "access-control-allow-headers": "authorization,content-type",
  };
}

export function requireAuth(request: Request, env: { ADMIN_PASSWORD_OWNER: string; ADMIN_PASSWORD_ADMIN: string }) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
  if (token === env.ADMIN_PASSWORD_OWNER) return "owner" as const;
  if (token === env.ADMIN_PASSWORD_ADMIN) return "admin" as const;
  throw new Response("Unauthorized", { status: 401 });
}

export function threeDigits(id: string): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return trimmed.padStart(3, "0");
}

export function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}
```

### 3.2 functions/api/upload.ts

```ts
import { okJSON, errJSON, corsHeaders, requireAuth, threeDigits, sanitizeFileName } from "../_utils";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const role = requireAuth(request, env as any); // "owner" | "admin"
    const form = await request.formData();

    const idRaw = String(form.get("id") ?? "");
    const id = threeDigits(idRaw);
    if (!id) return errJSON(400, "invalid id");

    const file = form.get("file");
    if (!(file instanceof File)) return errJSON(400, "file is required");

    const original = file.name || `${id}.webp`;
    const safeName = sanitizeFileName(original);
    const key = `images/${id}_${safeName}`; // 実ファイル名は自由だが先頭3桁IDで揃える

    await (env as any).AKYO_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const base = (env as any).PUBLIC_R2_BASE as string; // 例: https://images.akyodex.com
    const url = `${base}/${key}`;

    // メタデータ（最小）
    const name = String(form.get("name") ?? "");
    const type = String(form.get("type") ?? "");
    const desc = String(form.get("desc") ?? "");
    const now = new Date().toISOString();
    const updater = role; // ロールのみ記録（必要ならIP/UAも）

    const data = { id, name, type, desc, key, url, updatedAt: now, updater };
    await (env as any).AKYO_KV.put(`akyo:${id}`, JSON.stringify(data));

    return okJSON({ ok: true, id, url, key, updatedAt: now }, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(500, e?.message || "upload failed");
  }
};
```

### 3.3 functions/api/manifest.ts

```ts
import { okJSON, errJSON, corsHeaders } from "../_utils";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const list = await (env as any).AKYO_KV.list({ prefix: "akyo:" });
    const out: Record<string, string> = {};
    const values = await Promise.all(list.keys.map((k: any) => (env as any).AKYO_KV.get(k.name, "json")));
    for (const v of values) {
      if (v?.id && v?.url) out[v.id] = v.url;
    }
    return okJSON(out, {
      headers: {
        ...corsHeaders(request.headers.get("origin") ?? undefined),
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    return errJSON(500, e?.message || "manifest failed");
  }
};
```

### 3.4 js/image-manifest-loader.js（最小）

```js
window.akyoImageManifest = {};

async function loadAkyoManifest() {
  try {
    const res = await fetch('/api/manifest', { cache: 'no-store' });
    window.akyoImageManifest = await res.json();
  } catch (e) {
    console.warn('manifest fetch failed', e);
    window.akyoImageManifest = window.akyoImageManifest || {};
  }
}

function getAkyoImageUrl(id3) {
  return window.akyoImageManifest[id3] || `/images/${id3}.webp`; // フォールバック
}

window.loadAkyoManifest = loadAkyoManifest;
window.getAkyoImageUrl = getAkyoImageUrl;
```

### 3.5 HTML の読み込み

- `index.html` と `admin.html` の末尾で以下を読み込む：

```html
<script src="js/image-manifest-loader.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadAkyoManifest();
  });
  </script>
```

### 3.6 管理画面からのアップロード（追記）

```js
async function uploadAkyoOnline({ id, name, type, desc, file, adminPassword }) {
  const form = new FormData();
  form.set('id', id);
  form.set('name', name);
  form.set('type', type);
  form.set('desc', desc);
  form.set('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminPassword}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || 'upload failed');

  await loadAkyoManifest();
  return json;
}
```

---

## 4) 既存画像の初期投入（R2）

### 推奨：ダッシュボードでドラッグ＆ドロップ

1. R2 の `akyodex-images` を開く。
2. `images/` フォルダを作成。
3. ローカルの `images/001.webp`〜`612.webp` を **`images/` 以下にまとめてアップロード**する。
4. 途中でエラーになった場合は、重複ファイルは**上書き**で良い。

## 5) デプロイ

### 5.1 単発デプロイ（wrangler）

- ルートがそのまま公開ルートなら：

```
npx wrangler pages deploy . --project-name <PAGES_PROJECT_NAME>
```

- `dist/` などビルド成果がある場合はそのパスを指定：

```
npx wrangler pages deploy dist --project-name akyodex-site
```

> 実行前に `CLOUDFLARE_API_TOKEN=<CLOUDFLARE_API_TOKEN>` を環境に設定しておく。

### 5.2 カスタムドメイン確認

- Pages プロジェクトの *Custom domains* で `akyodex.com` の状況が **Active** になっていること。
- R2 公開設定のカスタムドメイン `images.akyodex.com` も **有効**であること。

---

## 6) 動作確認

1. ブラウザで `https://akyodex.com/api/manifest` を開き、`{"001": "https://images.akyodex.com/images/001.webp", ...}` が返ること。
2. `index.html` を開き、ID→画像が正しく表示されること（必要に応じてキャッシュを無効化）。
3. `admin.html` からログイン（`<ADMIN_PASSWORD_OWNER>` / `<ADMIN_PASSWORD_ADMIN>`）、任意のIDで画像をアップロード → 即時反映を確認。

---

## 7) 運用ルール

- 新しい画像は **`id=NNN` を指定してアップロード**（`NNN` は3桁、フォーマットは `.webp` 推奨）。
- 既存画像の差し替えは **同じIDで上書き**する。
- 削除操作は **`<ADMIN_PASSWORD_OWNER>` のみ許可**（必要なら `DELETE /api/akyo/:id` を追加実装）。
- 画像は `loading="lazy"` と `width/height` 指定を維持し、パフォーマンスを確保。

---

## 8) 既知のハマりどころと対処

- **/api/manifest が空**：KV に `akyo:*` が無い。少なくとも1件を `/api/upload` から登録してから再確認する。
- **403 Unauthorized**：Bearer が未設定／誤り。`<ADMIN_PASSWORD_OWNER>` か `<ADMIN_PASSWORD_ADMIN>` を入力して送っているか確認。
- **R2 の URL が 403**：公開設定とカスタムドメイン割当を再確認。パスは `images/NNN_*.webp` になっているか。
- **CORS エラー**：`corsHeaders` を確認。基本は同一オリジンだが、別ドメインから管理する場合は許可オリジンを調整。

---

## 9) 付録：リネーム・クリーンアップ（PowerShell）

## 10) 片付けのチェックリスト（公開直前）

- [ ] `functions/` 3ファイルを追加済み
- [ ] `js/image-manifest-loader.js` を読み込み、起動時に `loadAkyoManifest()` を実行
- [ ] R2 に `images/001.webp`〜`612.webp` が配置済み（`images/` フォルダ直下）
- [ ] Pages Functions の **Bindings**（`AKYO_BUCKET` / `AKYO_KV` / `PUBLIC_R2_BASE`）と **ENV**（`ADMIN_PASSWORD_*`）を設定
- [ ] `npx wrangler pages deploy . --project-name akyodex-site` を実行し公開
- [ ] `/api/manifest` が正しいJSONを返し、トップページで画像が見える
- [ ] `admin.html` からのアップロードが反映される

---

### 完了後の運用メモ

- 画像の追加・差し替えは管理画面から実行（再デプロイ不要）。
- コストを抑えるため、順次 **WebP** 化と **サムネイル**導入を検討（`thumbs/NNN.webp` など）。
- 需要が増えたら、`/api/akyo/:id` のメタデータCRUDや履歴（更新ログ）を追加していく。
