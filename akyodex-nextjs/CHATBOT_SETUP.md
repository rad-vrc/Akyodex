# Akyo Chatbot Setup Guide

## 概要

Akyoずかんチャットボットは、Cloudflare Workers AI、Vectorize、Cohere Rerank、Gemini 2.5 Flashを組み合わせた高度なRAGシステムです。

### アーキテクチャ

```
User Query
    ↓
[Embedding] BGE-M3 (Workers AI)
    ↓
[Vector Search] Vectorize (top 32)
    ↓
[Rerank] Cohere Rerank 3 (top 5)
    ↓
[LLM] Gemini 2.5 Flash Latest
    ↓
Response
```

### コスト試算（月間1000クエリ）

- BGE-M3 (Workers AI): ~$0.0003
- Vectorize: $0 (無料枠内)
- Cohere Rerank: $0 (無料枠1000クエリ/月)
- Gemini 2.5 Flash: ~$0.21
- **合計: 約$0.21/月 (約30円/月)**

## セットアップ手順

### 1. 前提条件

- Node.js 20+
- Cloudflare アカウント
- wrangler CLI (`npm install -g wrangler`)
- Gemini API キー
- Cohere API キー

### 2. Vectorizeインデックス作成

```bash
# Vectorizeインデックスを作成（BGE-M3は1024次元）
wrangler vectorize create akyo-index --dimensions=1024 --metric=cosine
```

### 3. CSVデータの準備

```bash
# データ準備スクリプトを実行
node scripts/prepare-vectorize-data.mjs
```

出力: `data/vectorize-data.json` (639件のバイリンガルチャンク)

### 4. データのアップロード

```bash
# 環境変数を設定
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token

# アップロードスクリプトを実行
node scripts/upload-to-vectorize.mjs
```

このスクリプトは：
1. 各チャンクをBGE-M3で埋め込み生成（100件ずつバッチ処理）
2. Vectorizeにアップロード
3. 進捗状況を表示

**所要時間:** 約5-10分（639件）

### 5. 環境変数の設定

Cloudflare Pages ダッシュボードで以下を設定：

```bash
GEMINI_API_KEY=your-gemini-api-key-here
COHERE_API_KEY=your-cohere-api-key-here
```

または、ローカル開発用に`.dev.vars`ファイルを作成：

```bash
# .dev.vars
GEMINI_API_KEY=your-gemini-api-key-here
COHERE_API_KEY=your-cohere-api-key-here
```

### 6. wrangler.toml 確認

以下のバインディングが設定されていることを確認：

```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "akyo-index"

[ai]
binding = "AI"
```

### 7. ローカルテスト

```bash
# 開発サーバー起動（Cloudflare環境をエミュレート）
wrangler pages dev .next --compatibility-date=2025-01-22

# または通常のNext.js開発サーバー（バインディングなし）
npm run dev
```

### 8. デプロイ

```bash
# Cloudflare Pagesにデプロイ
npm run build
wrangler pages deploy .next
```

## 使い方

### フロントエンド

チャットボットは全ページの右下に表示されます。

**質問例:**
- 「火タイプのアキョは？」
- 「レアなアキョを教えて」
- 「What are the water-type Akyos?」
- 「作者が◯◯のアキョは？」

### API エンドポイント

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "火タイプのアキョは？",
  "conversationHistory": [
    { "role": "user", "content": "こんにちは" },
    { "role": "assistant", "content": "こんにちは！" }
  ]
}
```

**レスポンス:**
```json
{
  "answer": "火タイプのアキョは現在図鑑に...",
  "sources": [
    { "id": "akyo-0042", "score": 0.89 },
    { "id": "akyo-0123", "score": 0.85 }
  ],
  "language": "ja"
}
```

## トラブルシューティング

### エラー: "Cloudflare bindings not available"

**原因:** ローカル開発環境でバインディングが利用できない

**解決策:**
- `wrangler pages dev` を使用（`npm run dev` ではなく）
- または、本番環境でテスト

### エラー: "Gemini API request timed out"

**原因:** Gemini APIの応答が30秒以上かかる

**解決策:**
- ネットワーク接続を確認
- Gemini APIキーが有効か確認
- クエリを短くする

### エラー: "Vectorize query failed"

**原因:** Vectorizeインデックスが存在しないか、空

**解決策:**
```bash
# インデックスの確認
wrangler vectorize list

# データ再アップロード
node scripts/upload-to-vectorize.mjs
```

### 検索結果が不正確

**原因:** 埋め込みの品質、チャンク分割、システムプロンプトの問題

**解決策:**
1. システムプロンプトを調整（`/api/chat/route.ts`）
2. Rerank の `top_n` を調整（現在5）
3. Vector search の `topK` を調整（現在32）

## カスタマイズ

### システムプロンプトの変更

`src/app/api/chat/route.ts` の `SYSTEM_PROMPT_JA`/`SYSTEM_PROMPT_EN` を編集。

### チャンク数の調整

`src/app/api/chat/route.ts` の以下を変更：
- `vectorSearch()` の `topK` (32) - Vector検索の上位件数
- `rerankChunks()` の `topN` (5) - Rerankの上位件数

### モデルの変更

**埋め込みモデル:**
- `scripts/upload-to-vectorize.mjs` の `EMBEDDING_MODEL`
- 注意: 次元数を合わせてVectorizeインデックスを再作成

**LLMモデル:**
- `src/app/api/chat/route.ts` の `generateResponse()` URL
- Gemini 2.5 Flash Latest → Gemini 1.5 Pro 等

## パフォーマンス最適化

### キャッシング

Cloudflare AI Gateway を使用して：
- 埋め込みキャッシュ（同じクエリ）
- Rerankキャッシュ
- LLMレスポンスキャッシュ

### バッチ処理

複数クエリを同時処理する場合、バッチAPIを利用。

### エッジ配置

Vectorize、Workers AI、Gemini は全て Edge で動作し、低レイテンシを実現。

## セキュリティ

- API キーは環境変数で管理
- CORS 設定で不正アクセス防止
- Rate limiting（Cloudflare Pages 自動）
- Input validation（SQLインジェクション等対策済み）

## モニタリング

Cloudflare ダッシュボードで：
- Workers AI 使用量
- Vectorize クエリ数
- API エラーレート
- レスポンスタイム

## ライセンス

このプロジェクトは [MIT License](../LICENSE) の下でライセンスされています。

## サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. GitHub Issues で報告
3. Cloudflare Community フォーラムで質問
