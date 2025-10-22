# Universal MCP Bridge 使い方ガイド

**あなたのローカルマシンで動かすための完全ガイド**

## 🎯 これは何？

**Universal MCP Bridge** は、任意のstdio形式のMCPサーバーをHTTP化するツールです。

GenSparkのような**Streamable HTTP**のみ対応のMCPクライアントから、stdio形式のMCPサーバー（Next.js DevTools、Perplexity AI、GitHubなど）を使えるようにします。

### 解決する問題

```
❌ 問題:
GenSpark → stdio MCP サーバー
         (接続できない)

✅ 解決:
GenSpark → Universal MCP Bridge → stdio MCP サーバー
         (HTTP)              (stdio)
         接続できる！
```

---

## 📦 セットアップ（初回のみ）

### 1. リポジトリをクローン

```bash
# あなたのローカルマシンで実行
git clone https://github.com/rad-vrc/Akyodex.git
cd Akyodex/akyodex-nextjs/universal-mcp-bridge
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 設定ファイルを作成

```bash
# テンプレートをコピー
cp mcp-servers.example.json mcp-servers.json
```

### 4. 設定ファイルを編集

`mcp-servers.json`を開いて、APIキーを設定します：

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
        "PERPLEXITY_API_KEY": "あなたのAPIキー",
        "PERPLEXITY_MODEL": "sonar"
      },
      "description": "Perplexity AI検索MCP"
    }
  },
  "port": 9123,
  "debug": false
}
```

⚠️ **重要**: `mcp-servers.json`は`.gitignore`に含まれているので、GitHubにコミットされません。

---

## 🚀 起動方法

### ブリッジサーバーを起動

```bash
cd Akyodex/akyodex-nextjs/universal-mcp-bridge
npm run dev
```

### 起動成功の確認

以下のような出力が表示されれば成功です：

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

---

## 🔌 GenSparkでの設定

ブリッジサーバーが起動したら、GenSparkに各MCPサーバーを登録します。

### Next.js DevTools MCP

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

### Perplexity AI MCP

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

### カスタムMCPサーバー

あなたが追加したカスタムサーバーの場合：

```json
{
  "name": "my-custom-mcp",
  "transport": "streamablehttp",
  "url": "http://localhost:9123/mcp/カスタムサーバー名",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "カスタムMCPサーバー"
}
```

⚠️ **重要**: `カスタムサーバー名`は`mcp-servers.json`の`servers`オブジェクトのキー名と一致させてください。

---

## 🧪 動作確認

### 1. ヘルスチェック

ブラウザまたはcurlで確認：

```bash
curl http://localhost:9123/health
```

レスポンス例：
```json
{
  "status": "ok",
  "uptime": 123.456,
  "sessions": 0,
  "servers": ["nextjs", "perplexity"],
  "timestamp": "2025-10-22T14:00:00.000Z"
}
```

### 2. サーバー情報確認

```bash
curl http://localhost:9123/
```

### 3. GenSparkでテスト

GenSparkから以下のようなプロンプトを試してみてください：

**Next.js MCPの場合**:
```
Next.jsの開発サーバーを検出して
```

**Perplexity MCPの場合**:
```
Perplexityで「Next.js 16の新機能」を検索して
```

---

## ➕ 新しいMCPサーバーの追加

### 例: GitHub MCPを追加

#### 1. `mcp-servers.json`に追加

```json
{
  "servers": {
    "nextjs": { ... },
    "perplexity": { ... },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "あなたのGitHubトークン"
      },
      "description": "GitHub MCP Server"
    }
  },
  "port": 9123,
  "debug": false
}
```

#### 2. ブリッジサーバーを再起動

```bash
# Ctrl+C でサーバーを停止
npm run dev
```

#### 3. GenSparkに設定追加

```json
{
  "name": "github-mcp",
  "transport": "streamablehttp",
  "url": "http://localhost:9123/mcp/github",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "GitHub MCP"
}
```

#### 4. 動作確認

```
GitHubで私のリポジトリ一覧を取得して
```

---

## 🛠️ よくある質問

### Q1: ポート9123が使えない

**エラー**:
```
Error: listen EADDRINUSE: address already in use :::9123
```

**解決策**:
```bash
# 使用中のプロセスを確認
lsof -i :9123

# プロセスを終了
kill -9 <PID>
```

または、`mcp-servers.json`の`port`を変更：

```json
{
  "port": 9124,
  ...
}
```

⚠️ **注意**: ポートを変更したら、GenSparkの設定も更新してください。

### Q2: uvxコマンドが見つからない

**エラー**:
```
Error: spawn uvx ENOENT
```

**解決策**:

Pythonの`uv`をインストール：

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Q3: セッションが期限切れになる

セッションは15分間アクティビティがないと自動削除されます。

**解決策**: GenSparkで再度リクエストを送信すると、自動的に新しいセッションが作成されます。

### Q4: 環境変数が反映されない

**確認事項**:

1. `mcp-servers.json`の`env`フィールドに正しく記載されているか
2. JSONの構文エラーがないか（カンマ、クォートなど）
3. ブリッジサーバーを再起動したか

**デバッグ方法**:

`mcp-servers.json`で`debug`を`true`に設定：

```json
{
  "servers": { ... },
  "port": 9123,
  "debug": true
}
```

詳細なログが表示されます。

---

## 🔐 セキュリティ

### ⚠️ 重要な注意事項

1. **ローカル開発専用**
   - このツールはローカルマシン専用です
   - 公開インターネットに晒さないでください

2. **mcp-servers.jsonの管理**
   - APIキーが含まれています
   - `.gitignore`で除外されています
   - 絶対にGitHubにコミットしないでください

3. **テンプレートファイル**
   - `mcp-servers.example.json`にはダミーの値を記載
   - これはGitHubにコミットしてOK

### APIキーの保護

```bash
# .gitignoreで保護されていることを確認
cat .gitignore | grep mcp-servers.json

# 出力: mcp-servers.json
```

---

## 📊 パフォーマンス

### 予想される性能

- **レイテンシ**: 30-80ms/リクエスト
- **スループット**: 50-100リクエスト/秒（単一サーバー）
- **メモリ使用量**: 80-150MB（ベース）+ 10-15MB/セッション
- **同時セッション**: 50-100セッション（推奨）

### メモリ使用量の目安

| アクティブセッション数 | メモリ使用量 |
|--------------------|------------|
| 0 | ~100MB |
| 10 | ~250MB |
| 50 | ~700MB |
| 100 | ~1.3GB |

---

## 🐛 トラブルシューティング

### デバッグモード有効化

`mcp-servers.json`:
```json
{
  "servers": { ... },
  "port": 9123,
  "debug": true
}
```

### ログの確認

すべてのリクエスト/レスポンスが詳細に表示されます：

```
2025-10-22T14:00:00.000Z 🔍 POST /mcp/nextjs - initialize
2025-10-22T14:00:00.050Z 📝 セッション作成中: nextjs (550e8400-...)
2025-10-22T14:00:01.234Z ✅ セッション作成完了: nextjs (550e8400-...)
```

### よくあるエラーと解決策

#### エラー: "サーバー設定が見つかりません"

**原因**: `mcp-servers.json`が存在しないか、構文エラー

**解決策**:
```bash
# テンプレートから再作成
cp mcp-servers.example.json mcp-servers.json

# JSON構文チェック
cat mcp-servers.json | jq .
```

#### エラー: "MCPサーバー接続失敗"

**原因**: コマンドが見つからない、または環境変数が間違っている

**解決策**:
```bash
# コマンドが実行できるか確認
npx -y next-devtools-mcp@latest --version
uvx perplexity-mcp --help

# 環境変数を確認
cat mcp-servers.json | jq '.servers.perplexity.env'
```

---

## 🎓 高度な使い方

### カスタムコマンドの追加

#### Python MCPサーバーの例

```json
{
  "servers": {
    "custom-python": {
      "command": "python",
      "args": ["-m", "my_mcp_server"],
      "env": {
        "PYTHONPATH": "/path/to/your/project",
        "API_KEY": "your-api-key"
      },
      "description": "カスタムPython MCPサーバー"
    }
  }
}
```

#### Node.jsスクリプトの例

```json
{
  "servers": {
    "custom-node": {
      "command": "node",
      "args": ["./path/to/server.js"],
      "env": {
        "NODE_ENV": "development",
        "API_KEY": "your-api-key"
      },
      "description": "カスタムNode.js MCPサーバー"
    }
  }
}
```

### 複数ポートで起動

異なる用途で複数のブリッジを起動できます：

```bash
# ターミナル1: 開発用（ポート9123）
cd universal-mcp-bridge
npm run dev

# ターミナル2: テスト用（ポート9124）
cd universal-mcp-bridge-test
# mcp-servers.jsonでport: 9124に設定
npm run dev
```

---

## 📝 チートシート

### よく使うコマンド

```bash
# ブリッジ起動
npm run dev

# ヘルスチェック
curl http://localhost:9123/health

# サーバー情報
curl http://localhost:9123/

# ログ確認（デバッグモード）
# mcp-servers.jsonでdebug: true

# プロセス確認
lsof -i :9123

# プロセス終了
pkill -f "tsx watch server.ts"
```

### GenSpark設定テンプレート

```json
{
  "name": "サーバー名",
  "transport": "streamablehttp",
  "url": "http://localhost:9123/mcp/サーバーキー",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "説明"
}
```

---

## 🆘 サポート

### 問題が解決しない場合

1. **GitHubでIssueを作成**
   - https://github.com/rad-vrc/Akyodex/issues

2. **必要な情報**
   - エラーメッセージ全文
   - `mcp-servers.json`の内容（APIキーは伏せて）
   - 実行環境（OS、Node.jsバージョン）
   - 再現手順

3. **デバッグログを添付**
   - `debug: true`で起動した際のログ

---

## 🎉 まとめ

これで、あなたのローカルマシンでUniversal MCP Bridgeを使って、任意のstdio MCPサーバーをGenSparkから利用できるようになりました！

### セットアップフロー（再確認）

1. ✅ リポジトリクローン
2. ✅ `npm install`
3. ✅ `mcp-servers.json`作成・編集
4. ✅ `npm run dev`でブリッジ起動
5. ✅ GenSparkに設定追加
6. ✅ GenSparkからテスト

**何か問題があればお気軽にどうぞ！** 😊

---

**作成**: 2025-10-22  
**バージョン**: 1.0.0  
**著者**: GenSpark AI Developer
