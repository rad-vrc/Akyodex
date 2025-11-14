# 完全なContext7ドキュメントリーディングリスト

このドキュメントは、Akyodexプロジェクトで使用している技術スタックに基づいて、Context7から取得すべき関連ドキュメントの完全なリストです。

## 🎯 最優先 - コア技術スタック

### Next.js
- **Library ID**: `/vercel/next.js`
- **Trust Score**: 10
- **Code Snippets**: 3,050
- **説明**: Next.js公式ドキュメント（最優先）
- **バージョン**: v14.3.0-canary.87, v13.5.11, v15.1.8, v15.4.0-canary.82, v12.3.7, v11.1.3

### React
- **Library ID**: `/reactjs/react.dev`
- **Trust Score**: 10
- **Code Snippets**: 2,836
- **説明**: React公式ドキュメント
- **バージョン**: v18_3_1, v19_1_1, v19_2_0

### TypeScript
- **Library ID**: `/microsoft/typescript`
- **Trust Score**: 9.9
- **Code Snippets**: 16,752
- **説明**: TypeScript公式ドキュメント
- **バージョン**: v5.9.2

### Tailwind CSS
- **Library ID**: `/tailwindlabs/tailwindcss.com`
- **Trust Score**: 10
- **Code Snippets**: 1,418
- **説明**: Tailwind CSS公式ドキュメント

## 🚀 デプロイ・インフラ

### Cloudflare Pages
- **Library ID**: `/websites/developers_cloudflare_pages`
- **Trust Score**: 7.5
- **Code Snippets**: 740
- **説明**: Cloudflare Pages公式ドキュメント

### Cloudflare Workers
- **Library ID**: `/websites/developers_cloudflare_workers`
- **Trust Score**: 7.5
- **Code Snippets**: 2,551
- **説明**: Cloudflare Workers公式ドキュメント

### Cloudflare Developer Platform
- **Library ID**: `/websites/developers_cloudflare`
- **Trust Score**: 7.5
- **Code Snippets**: 54,280
- **説明**: Cloudflare開発者プラットフォーム全体のドキュメント（R2, KV, D1, Images, Streamなど）

### OpenNext
- **Library ID**: `/websites/opennext_js`
- **Trust Score**: 7.5
- **Code Snippets**: 278
- **説明**: OpenNext公式ドキュメント（Next.jsをCloudflareにデプロイするためのアダプター）

### OpenNext Cloudflare
- **Library ID**: `/opennextjs/opennextjs-cloudflare`
- **Trust Score**: 7.4
- **Code Snippets**: 24
- **説明**: OpenNext Cloudflareアダプター

## 🔐 認証・セキュリティ

### sanitize-html
- **Library ID**: `/apostrophecms/sanitize-html`
- **Trust Score**: 8.4
- **Code Snippets**: 43
- **説明**: HTMLサニタイゼーションライブラリ

## 📊 データ処理

### Fast CSV (csv-parse)
- **Library ID**: `/c2fo/fast-csv`
- **Trust Score**: 7.5
- **Code Snippets**: 118
- **説明**: Node.js用の高速CSVパーサー・フォーマッター

### PapaParse
- **Library ID**: `/mholt/papaparse`
- **Trust Score**: 9.3
- **Code Snippets**: 55
- **説明**: ブラウザ用の高速CSVパーサー（参考用）

## 🧪 テスト

### Playwright
- **Library ID**: `/microsoft/playwright`
- **Trust Score**: 9.9
- **Code Snippets**: 2,123
- **説明**: Playwright公式ドキュメント（E2Eテスト）
- **バージョン**: v1.51.0

## 🛠️ 開発ツール

### ESLint
- **Library ID**: `/eslint/eslint`
- **Trust Score**: 9.1
- **Code Snippets**: 2,853
- **説明**: ESLint公式ドキュメント
- **バージョン**: v8.57.1

## 📖 補足ドキュメント

### Next.js App Router
- **Library ID**: `/websites/nextjs_app`
- **Trust Score**: 7.5
- **Code Snippets**: 20,228
- **説明**: Next.js App Router詳細ドキュメント

### Next.js (llms.txt)
- **Library ID**: `/llmstxt/nextjs_llms-full_txt`
- **Trust Score**: 8
- **Code Snippets**: 10,182
- **説明**: Next.js完全版LLMドキュメント

### Cloudflare Workers (llms.txt)
- **Library ID**: `/llmstxt/developers_cloudflare_workers_llms-full_txt`
- **Trust Score**: 8
- **Code Snippets**: 46,230
- **説明**: Cloudflare Workers完全版LLMドキュメント

## 使用方法

Context7からドキュメントを取得する際は、以下の手順を実行してください：

1. **Library IDの解決**（必要に応じて）:
   ```
   mcp_context7_resolve_library_id({ libraryName: "Next.js" })
   ```

2. **ドキュメントの取得**:
   ```
   mcp_context7_get_library_docs({
     context7CompatibleLibraryID: "/vercel/next.js",
     topic: "routing",  // オプション: 特定のトピックに絞る
     tokens: 10000      // オプション: トークン数の制限
   })
   ```

## 優先順位

1. **最優先**: Next.js, React, TypeScript, Tailwind CSS
2. **高優先**: Cloudflare Pages, Cloudflare Workers, OpenNext
3. **中優先**: Playwright, ESLint, sanitize-html, csv-parse
4. **低優先**: 補足ドキュメント（必要に応じて参照）

## 注意事項

- Next.js関連の質問には、**必ず**Next.js DevTools MCPの`nextjs_docs`ツールを使用してください
- Context7は補足的な情報源として使用し、公式ドキュメントを優先してください
- バージョン指定が必要な場合は、上記のバージョン情報を参照してください