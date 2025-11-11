# 最終決定事項 - 実装前の確定仕様

## 📋 Codex最終レビュー対応完了

すべてのMust-fixポイントとCloudflare/Edge前提の落とし穴に対応しました。

## 🎯 最終決定事項

### 1. レートリミットの保存先

**決定**: Cloudflare KV Namespace (`AKYO_KV`)

**理由**:
- シンプルな実装
- コスト効率が良い
- 十分な性能（グローバル分散）
- Durable Objectsは過剰

**キー設計**:
```
rate_limit:{ip}:{endpoint}
例: rate_limit:192.168.1.1:admin_login
```

**設定値**:
- **Admin Login**: 5回/15分/IP
- **API一般**: 100回/分/IP
- **TTL**: ログイン900秒、API 60秒

### 2. パスワードハッシュのランタイム実績

**第一選択**: bcryptjs (rounds: 10)

**性能目標**: p95 < 200-300ms/req

**負荷テスト計画**:
1. 単一ログイン: p50, p95, p99測定
2. 並行ログイン: 10 req/s × 1分
3. バースト: 50 req / 5秒

**フォールバック戦略**:
- p95 > 300msの場合:
  1. bcrypt roundsを8に削減
  2. PBKDF2 (WebCrypto, 100k iterations)に切替
  3. Turnstile + 短寿命セッション併用でコスト削減

### 3. R2の前提条件失敗の扱い

**決定**: 409と412の両方をハンドリング

**理由**: R2/S3互換では412 Precondition Failedが返るケースが多い

**実装**:
```typescript
try {
  await r2.put(key, data, { customMetadata: { 'if-match': etag } });
} catch (error) {
  if (error.status === 409 || error.status === 412) {
    return { success: false, error: 'Concurrent modification detected' };
  }
  throw error;
}
```

### 4. ETagとtraceIdの分離

**決定**: ETagは安定したコンテンツハッシュ、traceId/errorIdはヘッダーのみ

**理由**:
- ETagはキャッシュ可能レスポンスに必要（安定した値）
- traceId/errorIdはリクエスト固有（ボディに含めるとキャッシュ不可）

**実装**:
```typescript
// Response Body
{ success: true, data: {...} }

// Response Headers
ETag: "sha256-hash-of-body"
X-Trace-ID: "uuid-v4"
X-Request-ID: "uuid-v4"
X-Error-ID: "uuid-v4" (エラー時のみ)
Cache-Control: "public, max-age=60, stale-while-revalidate=300"
```

### 5. 画像パイプラインの最終決定

**決定**: Cloudflare Images API + R2フォールバック

**アーキテクチャ**:
```
クライアント
  ↓ (Squoosh WASM - dynamic import)
  ↓ 最適化・クロップ
  ↓
アップロード → R2 Bucket (オリジナル保存)
  ↓
Cloudflare Images API (配信・最適化)
  ↓
https://imagedelivery.net/<ACCOUNT_HASH>/${imageId}/${variant}
```

**フォールバック**:
```
R2直接アクセス: https://images.akyodex.com/${imageId}
```

**CSP設定**:
```
img-src 'self' https://imagedelivery.net https://images.akyodex.com https://*.vrchat.com;
```

**実装詳細**:
- **クライアント側**: Squoosh WASMで事前最適化（lazy load）
- **サーバ側**: バリデーションとURL生成のみ
- **配信**: Cloudflare Images APIで自動最適化（WebP/AVIF変換、リサイズ）

### 6. 大きなCSVの取り扱い

**決定**: Web Streamsで処理、全読み込みを避ける

**制約**: 10MB超のCSVでもメモリ効率的に処理

**実装**:
```typescript
async function parseCSVStream(readable: ReadableStream<Uint8Array>): Promise<AkyoData[]> {
  const decoder = new TextDecoder('utf-8');
  const reader = readable.getReader();
  let buffer = '';
  const results: AkyoData[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) results.push(parseCSVLine(line));
    }
  }
  
  return results;
}
```

**テスト計画**:
- 10MB級CSVの読み書き
- 並行更新シナリオ
- メモリ使用量監視

### 7. Sentry/OTelのSDK選定

**決定**: `@sentry/cloudflare` または `@sentry/nextjs` (Edge対応)

**設定**:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10%サンプリング
  beforeSend(event) {
    // PIIマスキング
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
});
```

**traceparent伝播**:
```typescript
headers.set('traceparent', `00-${traceId}-${spanId}-01`);
```

### 8. CSP/CORSの最終調整

**CSP設定**:
```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' https://imagedelivery.net https://images.akyodex.com https://*.vrchat.com;
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.dify.ai;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**CORS設定**:
```typescript
// 最小権限
Access-Control-Allow-Origin: https://akyodex.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### 9. VRChatスクレイプのキャッシュキー

**決定**: URL + 固定Accept-Language

**キー設計**:
```
Cache Key: https://vrchat.com/home/avatar/${avtrId}
Headers: Accept-Language: en-US,en;q=0.9
```

**キャッシュ戦略**:
- **成功レスポンス**: 24時間キャッシュ
- **失敗レスポンス**: キャッシュしない
- **タイムアウト**: 10秒
- **リトライ**: 指数バックオフ（1s, 2s, 4s）

## ✅ 実装準備完了チェックリスト

- [x] レートリミット保存先決定（KV Namespace）
- [x] パスワードハッシュ戦略決定（bcryptjs + 負荷テスト計画）
- [x] R2前提条件失敗ハンドリング（409 + 412）
- [x] ETag/traceID分離戦略決定
- [x] 画像パイプライン決定（Cloudflare Images + R2）
- [x] 大きなCSV処理戦略（Web Streams）
- [x] Sentry/OTel SDK選定（@sentry/cloudflare）
- [x] CSP/CORS最終調整
- [x] VRChatキャッシュ戦略決定

## 🚀 次のステップ

1. `.kiro/specs/opennext-refactoring/tasks.md`を開く
2. Phase 0のTask 0.1から実装開始
3. 各タスク完了後にテストとリント実行
4. 負荷テスト（bcryptjs性能）を早期に実施
5. 画像パイプライン（Cloudflare Images）のアカウント設定

## 📝 実装時の注意事項

### 優先度の高い早期検証項目

1. **bcryptjs性能テスト** (Task 0.4)
   - 実装後すぐに負荷テスト実施
   - p95 > 300msならフォールバック検討

2. **Cloudflare Images設定** (Task 3)
   - アカウントハッシュ取得
   - 配信ドメイン設定
   - バリアント設定（public, w=400, w=800等）

3. **大きなCSVテスト** (Task 2)
   - 10MB CSVで動作確認
   - メモリ使用量監視
   - 並行更新テスト

### 実装順序の推奨

Phase 0を完了してからPhase 1に進むことを強く推奨：
- Phase 0で基盤（セキュリティ、監視、キャッシュ）を固める
- Phase 1以降で機能実装に集中できる

---

**ステータス**: ✅ 実装準備完了 - LGTM from Codex

**最終更新**: 2025-11-11

**承認**: Codex最終レビュー完了
