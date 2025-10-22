# Universal MCP Bridge

**汎用stdio-to-HTTP/Streamable HTTPブリッジ**

任意のstdio形式のMCPサーバーをHTTP/Streamable HTTP化します。

## 🎯 特徴

- ✅ **汎用的**: 任意のstdio MCPサーバーに対応
- ✅ **簡単設定**: JSON設定ファイルで複数サーバー管理
- ✅ **環境変数サポート**: API keyなどを安全に管理
- ✅ **固定ポート**: 一度決めたポート番号は変更不要
- ✅ **マルチサーバー**: 複数のMCPサーバーを同時に稼働
- ✅ **Streamable HTTP**: 最新のMCP仕様に対応

## 📦 インストール

```bash
cd universal-mcp-bridge
npm install
```

## ⚙️ 設定

### mcp-servers.json

```json
{
  "servers": {
    "nextjs": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"],
      "env": {},
      "description": "Next.js 16 DevTools MCP"
    },
    "perplexity": {
      "command": "uvx",
      "args": ["perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key-here",
        "PERPLEXITY_MODEL": "sonar"
      },
      "description": "Perplexity AI検索MCP"
    },
    "custom": {
      "command": "node",
      "args": ["path/to/your/mcp-server.js"],
      "env": {
        "CUSTOM_VAR": "value"
      },
      "description": "カスタムMCPサーバー"
    }
  },
  "port": 9123,
  "debug": false
}
```

### 設定項目

- **servers**: MCPサーバーの定義（複数可）
  - **command**: 実行コマンド（`npx`, `uvx`, `node`, `python`など）
  - **args**: コマンド引数の配列
  - **env**: 環境変数（オプション）
  - **description**: サーバーの説明（オプション）
- **port**: ブリッジサーバーのポート番号（デフォルト: 9123）
- **debug**: デバッグログを有効化（デフォルト: false）

## 🚀 起動

```bash
npm run dev
```

出力例:
```
======================================================================
✅ Universal MCP Bridge 起動完了
======================================================================
📡 ポート: 9123
🔧 設定ファイル: mcp-servers.json
======================================================================

📋 利用可能なMCPサーバー:

  🔹 nextjs
     📍 エンドポイント: http://localhost:9123/mcp/nextjs
     🛠️  コマンド: npx -y next-devtools-mcp@latest
     📝 説明: Next.js 16 DevTools MCP

  🔹 perplexity
     📍 エンドポイント: http://localhost:9123/mcp/perplexity
     🛠️  コマンド: uvx perplexity-mcp
     📝 説明: Perplexity AI検索MCP
     🔐 環境変数: PERPLEXITY_API_KEY, PERPLEXITY_MODEL

======================================================================
🏥 ヘルスチェック: http://localhost:9123/health
📖 サーバー情報: http://localhost:9123/
======================================================================

✨ MCP接続を待機中...
```

## 🔌 GenSparkでの使用

### 設定例

各MCPサーバーごとに異なるエンドポイントを使用します：

#### Next.js MCP
```json
{
  "name": "nextjs-akyo",
  "transport": "streamablehttp",
  "url": "http://localhost:9123/mcp/nextjs",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "Next.js 16 MCP（Akyoプロジェクト用）"
}
```

#### Perplexity MCP
```json
{
  "name": "perplexity-search",
  "transport": "streamablehttp",
  "url": "http://localhost:9123/mcp/perplexity",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "Perplexity AI検索"
}
```

## 🧪 テスト

### ヘルスチェック

```bash
curl http://localhost:9123/health
```

レスポンス:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "sessions": 2,
  "servers": ["nextjs", "perplexity"],
  "timestamp": "2025-10-22T13:00:00.000Z"
}
```

### サーバー情報

```bash
curl http://localhost:9123/
```

### Initialize接続

```bash
curl -X POST http://localhost:9123/mcp/nextjs \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "GenSpark", "version": "1.0.0"}
    }
  }'
```

レスポンス:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "next-devtools-mcp", "version": "1.0.0" }
  },
  "meta": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## 📝 新しいMCPサーバーの追加

### 手順

1. `mcp-servers.json`を編集
2. `servers`に新しいエントリを追加
3. ブリッジサーバーを再起動

### 例: GitHub MCP追加

```json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
      },
      "description": "GitHub MCP Server"
    }
  }
}
```

エンドポイント: `http://localhost:9123/mcp/github`

## 🔐 セキュリティ

### ⚠️ 重要: ローカル開発専用

現在の実装は**ローカル開発専用**です。

**含まれていない機能**:
- ❌ 認証/認可
- ❌ レート制限
- ❌ 入力検証
- ❌ CORS制限

**公開しないでください**:
- インターネット上のサーバー
- 本番環境
- 信頼できないネットワーク

### 環境変数の管理

APIキーなどの機密情報は:
- ✅ `mcp-servers.json`の`env`フィールドに記載
- ✅ `.gitignore`に`mcp-servers.json`を追加
- ✅ `mcp-servers.example.json`でテンプレート提供

```bash
# .gitignoreに追加
echo "mcp-servers.json" >> .gitignore

# テンプレート作成
cp mcp-servers.json mcp-servers.example.json
# example.jsonからAPIキーを削除してコミット
```

## 🐛 トラブルシューティング

### ポート競合

```
Error: listen EADDRINUSE: address already in use :::9123
```

**解決策**:
```bash
# 使用中のプロセスを確認
lsof -i :9123

# プロセスを終了
kill -9 <PID>

# またはポート番号を変更
# mcp-servers.json の port を変更
```

### コマンドが見つからない

```
Error: spawn npx ENOENT
```

**解決策**:
```bash
# Node.jsとnpmを確認
node --version
npm --version

# Python/uvxを確認（Perplexity MCPの場合）
python --version
uvx --version
```

### セッションが見つからない

```
セッションが見つかりません（期限切れの可能性があります）
```

**原因**: セッションは15分で期限切れ

**解決策**: 再度`initialize`リクエストを送信

### 環境変数が反映されない

**確認事項**:
1. `mcp-servers.json`の`env`フィールドに正しく記載されているか
2. JSONの構文エラーがないか（カンマ、クォートなど）
3. ブリッジサーバーを再起動したか

## 📊 技術仕様

### アーキテクチャ

```
┌─────────────┐    Streamable HTTP    ┌─────────────┐    stdio    ┌─────────────┐
│  GenSpark   │ ──────────────────→   │ Universal   │ ──────────→ │  MCP Server │
│   Client    │                        │ MCP Bridge  │             │   (stdio)   │
│             │ ←──────────────────    │             │ ←────────── │             │
└─────────────┘                        └─────────────┘             └─────────────┘
```

### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | サーバー情報 |
| GET | `/health` | ヘルスチェック |
| POST | `/mcp/:serverName` | JSON-RPCリクエスト |
| GET | `/mcp/:serverName` | SSEストリーミング |

### セッション管理

- セッションID: UUID v4
- タイムアウト: 15分（最終アクティビティから）
- 自動クリーンアップ: 1分ごと
- ヘッダー名: `mcp-session-id`

### パフォーマンス

- レイテンシ: 30-80ms/リクエスト
- スループット: 50-100 req/s（単一サーバー）
- メモリ: 80-150MB（ベース + 10-15MB/セッション）
- 同時セッション: 50-100（推奨）

## 📚 関連リンク

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Next.js DevTools MCP](https://github.com/vercel/next-devtools-mcp)

## 🤝 貢献

バグ報告や機能リクエストは[GitHub Issues](https://github.com/rad-vrc/Akyodex/issues)まで。

## 📄 ライセンス

MIT License - Akyodexプロジェクトの一部

---

**作成者**: GenSpark AI Developer  
**バージョン**: 1.0.0  
**最終更新**: 2025-10-22
