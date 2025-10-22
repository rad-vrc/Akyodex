# Cloudflare Pages デプロイメントガイド

## 必要な環境変数

Cloudflare Pages ダッシュボードで以下の環境変数を設定してください：

### **1. GitHub連携 (必須)**

```bash
GITHUB_TOKEN=github_pat_***YOUR_TOKEN_HERE***
GITHUB_REPO_OWNER=rad-vrc
GITHUB_REPO_NAME=Akyodex
GITHUB_BRANCH=main
```

**用途:**
- CSVデータの取得 (ISR)
- 管理画面でのCSV更新

---

### **2. 管理者認証 (必須)**

```bash
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo
```

**用途:**
- 管理画面へのアクセス
- 画像アップロード権限

---

### **3. R2画像ベースURL (必須)**

```bash
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com
```

**用途:**
- R2画像URLの生成
- 画像プロキシAPIのベースURL

**注意:** `NEXT_PUBLIC_` プレフィックスが必要です（クライアント側で使用）

---

## Cloudflare Bindings (KV & R2)

### **KV Namespace: AKYO_KV**

**作成方法:**
```bash
# Cloudflare Dashboard
1. Workers & Pages → KV
2. Create Namespace: "akyo-kv-production"
3. Copy Namespace ID
4. wrangler.toml に ID を追加
```

**使用例:**
```typescript
// Avatar metadata storage
await env.AKYO_KV.put('akyo:001', JSON.stringify({
  id: '001',
  url: 'https://images.akyodex.com/images/001_xxx.webp',
  name: 'Akyo',
  creator: 'Creator Name'
}));
```

---

### **R2 Bucket: akyo-images**

**作成方法:**
```bash
# Cloudflare Dashboard
1. R2 → Create Bucket
2. Name: "akyo-images"
3. Region: Automatic (recommended)
```

**カスタムドメイン設定:**
```bash
1. R2 Bucket → Settings → Custom Domains
2. Add Domain: "images.akyodex.com"
3. DNS設定: CNAME images.akyodex.com → [R2 bucket URL]
```

**使用例:**
```typescript
// Image upload
await env.AKYO_BUCKET.put('images/001_avatar.webp', file.stream(), {
  httpMetadata: {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  },
});
```

---

## デプロイ手順

### **1. GitHub連携**

```bash
# Cloudflare Dashboard
1. Workers & Pages → Create Application → Pages
2. Connect to Git → Select Repository: rad-vrc/Akyodex
3. Branch: main
```

---

### **2. ビルド設定**

```yaml
Framework preset: Next.js
Build command: npm run build
Build output directory: .next
Root directory: /akyodex-nextjs
Node version: 22.x
```

---

### **3. 環境変数設定**

```bash
# Cloudflare Dashboard → Settings → Environment Variables
# Production タブで追加:

GITHUB_TOKEN=github_pat_***
GITHUB_REPO_OWNER=rad-vrc
GITHUB_REPO_NAME=Akyodex
GITHUB_BRANCH=main
ADMIN_PASSWORD_OWNER=RadAkyo
ADMIN_PASSWORD_ADMIN=Akyo
NEXT_PUBLIC_R2_BASE=https://images.akyodex.com
NODE_ENV=production
```

---

### **4. Bindings設定**

```bash
# Cloudflare Dashboard → Settings → Functions

## KV Namespace Bindings
Variable name: AKYO_KV
KV namespace: akyo-kv-production

## R2 Bucket Bindings
Variable name: AKYO_BUCKET
R2 bucket: akyo-images
```

---

### **5. カスタムドメイン設定**

```bash
# Cloudflare Dashboard → Custom Domains
1. Add Domain: akyodex.com
2. DNS設定:
   - Type: CNAME
   - Name: @
   - Target: akyodex-nextjs.pages.dev
   - Proxy: Yes (オレンジクラウド)
```

---

## デプロイ後の確認

### **✅ チェックリスト**

- [ ] トップページが表示される (`/`)
- [ ] 図鑑ページが表示される (`/zukan`)
- [ ] 639体のAkyoが読み込まれる
- [ ] 検索・フィルターが動作する
- [ ] 言語切り替えボタンが表示される
- [ ] 言語切り替えが動作する (EN/JP)
- [ ] お気に入り登録が動作する
- [ ] 画像が表示される (R2 or VRChat)

---

## トラブルシューティング

### **問題: ビルドエラー**

```bash
Error: Cannot find module '@cloudflare/next-on-pages'
```

**解決策:**
```bash
npm install --save-dev @cloudflare/next-on-pages
```

---

### **問題: 環境変数が読めない**

```bash
Error: GITHUB_TOKEN is not defined
```

**解決策:**
1. Cloudflare Dashboard → Settings → Environment Variables
2. Production タブで追加（Preview タブではない）
3. Re-deploy trigger

---

### **問題: KV/R2が接続できない**

```bash
Error: env.AKYO_KV is undefined
```

**解決策:**
1. Cloudflare Dashboard → Settings → Functions → Bindings
2. Variable name が正確に一致しているか確認
3. Re-deploy trigger

---

### **問題: 画像が表示されない**

```bash
403 Forbidden: https://images.akyodex.com/images/001.webp
```

**解決策:**
1. R2 Bucket → Settings → Public Access
2. Allow public access: Yes
3. CORS設定:
```json
[
  {
    "AllowedOrigins": ["https://akyodex.com", "https://*.pages.dev"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## パフォーマンス最適化

### **1. ISR設定確認**

```typescript
// src/app/zukan/page.tsx
export const revalidate = 3600; // 1時間ごとに再生成
```

### **2. Cache Headers**

Cloudflare Pagesは自動的に最適なキャッシュヘッダーを設定しますが、カスタマイズも可能：

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/images/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

---

## モニタリング

### **Analytics**

```bash
Cloudflare Dashboard → Analytics
- Page Views
- Unique Visitors
- Geographic Distribution
- Performance Metrics
```

### **Logs**

```bash
Cloudflare Dashboard → Logs
- Real-time logs (Logpush)
- Error tracking
- Function invocations
```

---

## まとめ

**最小限の必須設定:**
```bash
1. Environment Variables:
   - NEXT_PUBLIC_R2_BASE=https://images.akyodex.com
   
2. その他の環境変数は後から追加可能
   (GitHub Token, Admin Passwords など)

3. KV/R2 Bindingsは Phase 1B (画像API) から必要
```

**現時点で追加すべき環境変数:**
- ✅ `NEXT_PUBLIC_R2_BASE` のみ

**Phase 1B (画像API) で追加:**
- KV Namespace Binding: `AKYO_KV`
- R2 Bucket Binding: `AKYO_BUCKET`

**Phase 2 (管理画面) で追加:**
- `GITHUB_TOKEN`
- `ADMIN_PASSWORD_OWNER`
- `ADMIN_PASSWORD_ADMIN`
