# プロジェクト構造 & 組織化

## リポジトリレイアウト

```
Akyodex/
├── akyodex-nextjs/          # Next.js 15アプリケーション (メイン)
├── data/                    # CSVデータファイル
├── functions/               # Cloudflare Pages Functions (レガシー)
├── js/                      # レガシーJavaScriptファイル
├── css/                     # レガシーCSSファイル
├── images/                  # 静的画像
├── docs/                    # ドキュメント
├── scripts/                 # ユーティリティスクリプト
└── *.html                   # レガシーHTMLページ
```

## Next.jsアプリケーション (`akyodex-nextjs/`)

### ディレクトリ構造

```
akyodex-nextjs/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # ルートレイアウト (i18n, PWA)
│   │   ├── page.tsx         # ランディングページ
│   │   ├── admin/           # 管理パネル
│   │   ├── zukan/           # アバターギャラリー
│   │   │   ├── page.tsx     # ギャラリー (SSG + ISR)
│   │   │   └── detail/[id]/ # 詳細ページ (SSG)
│   │   └── api/             # APIルート (Edge Runtime)
│   │       ├── admin/       # 管理API
│   │       └── *.ts         # その他のAPI
│   ├── components/          # Reactコンポーネント
│   │   ├── akyo-*.tsx       # アバターコンポーネント
│   │   ├── admin/           # 管理コンポーネント
│   │   └── *.tsx            # 共有コンポーネント
│   ├── lib/                 # ユーティリティライブラリ
│   │   ├── csv-*.ts         # CSV処理
│   │   ├── api-helpers.ts   # APIユーティリティ
│   │   ├── session.ts       # JWTセッション
│   │   └── *.ts             # その他のユーティリティ
│   ├── types/
│   │   └── akyo.ts          # TypeScript型定義
│   └── middleware.ts        # Edgeミドルウェア (i18n)
├── public/
│   ├── sw.js                # Service Worker
│   ├── manifest.json        # PWAマニフェスト
│   └── icons/               # PWAアイコン
├── scripts/                 # データ処理スクリプト
├── next.config.ts           # Next.js設定
├── wrangler.toml            # Cloudflareバインディング
├── tsconfig.json            # TypeScript設定
└── package.json             # 依存関係
```

## 主要ディレクトリ

### `/src/app` - App Routerページ
- **規約**: ファイルベースルーティング
- **レイアウト**: i18n検出、Difyチャットボット統合を含む共有レイアウト
- **ページ**: デフォルトでServer Components
- **APIルート**: Edge Runtime関数

### `/src/components` - Reactコンポーネント
- **命名**: kebab-case (例: `akyo-card.tsx`)
- **組織化**: 機能別にグループ化 (admin/, shared)
- **Client Components**: `'use client'`ディレクティブを使用
- **Server Components**: デフォルト (ディレクティブなし)

### `/src/lib` - ユーティリティライブラリ
- **命名**: kebab-case (例: `csv-parser.ts`)
- **目的**: 共有ロジック、ヘルパー、ユーティリティ
- **Server-only**: 必要に応じて`import 'server-only'`でマーク

### `/src/types` - TypeScript型定義
- **規約**: 集中型定義
- **メインファイル**: `akyo.ts` (AkyoData, AkyoCsvRow, など)

## データフロー

### CSVデータ
```
data/akyo-data.csv (日本語)
data/akyo-data-US.csv (英語)
    ↓
R2バケット (akyo-data/)
    ↓
API: /api/csv (取得)
    ↓
lib/csv-parser.ts (パース)
    ↓
AkyoData[] (TypeScript)
```

### 画像データ
```
images/*.webp (ローカル)
    ↓
R2バケット (images/)
    ↓
CDN: images.akyodex.com
    ↓
API: /api/avatar-image (プロキシ)
    ↓
<img>タグ (遅延読み込み)
```

### Difyチャットボット
```
ユーザークエリ
    ↓
Dify埋め込みウィジェット
    ↓
Dify API (外部サービス)
    ↓
ウィジェットに応答を表示
```

## ファイル命名規則

### TypeScript/React
- **コンポーネント**: kebab-case (例: `akyo-card.tsx`)
- **ユーティリティ**: kebab-case (例: `csv-parser.ts`)
- **型定義**: kebab-case (例: `akyo.ts`)
- **APIルート**: kebab-case (例: `upload-akyo/route.ts`)

### レガシーファイル
- **JavaScript**: kebab-case (例: `main.js`, `admin.js`)
- **CSS**: kebab-case (例: `kid-friendly.css`)
- **HTML**: kebab-case (例: `index.html`, `admin.html`)

## コード組織化パターン

### コンポーネント構造
```typescript
// 1. インポート
import { useState } from 'react';
import type { AkyoData } from '@/types/akyo';

// 2. 型/インターフェース
interface AkyoCardProps {
  akyo: AkyoData;
  onFavorite?: (id: string) => void;
}

// 3. コンポーネント
export function AkyoCard({ akyo, onFavorite }: AkyoCardProps) {
  // 状態
  const [isHovered, setIsHovered] = useState(false);
  
  // ハンドラー
  const handleClick = () => { /* ... */ };
  
  // レンダー
  return <div>...</div>;
}
```

### APIルート構造
```typescript
// 1. インポート
import { NextRequest, NextResponse } from 'next/server';
import type { AkyoData } from '@/types/akyo';

// 2. 型定義
interface RequestBody {
  id: string;
  nickname: string;
}

// 3. ハンドラー
export async function POST(request: NextRequest) {
  try {
    // 1. リクエストをパース
    const body: RequestBody = await request.json();
    
    // 2. バリデーション
    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    // 3. 処理
    const result = await processData(body);
    
    // 4. 返却
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## インポートパスエイリアス

### 設定済みエイリアス
- `@/*` → `./src/*` (Next.jsアプリ)
- 例: `import { AkyoCard } from '@/components/akyo-card'`

### インポート順序 (推奨)
1. 外部パッケージ (react, next, など)
2. 内部エイリアス (@/components, @/lib, @/types)
3. 相対インポート (./utils, ../types)
4. CSS/スタイル

## 状態管理

### クライアント状態
- **React useState**: コンポーネントローカル状態
- **React Context**: 共有状態 (言語、テーマ)
- **localStorage**: 永続状態 (お気に入り、言語)
- **sessionStorage**: セッション状態 (管理者認証)

### サーバー状態
- **Cloudflare KV**: セッショントークン
- **R2バケット**: CSVデータ、画像

## エラーハンドリング

### APIルート
```typescript
try {
  // 操作
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

### コンポーネント
```typescript
try {
  // 操作
} catch (error) {
  console.error('Component error:', error);
  setError('Something went wrong');
}
```

## テスト場所

### 開発環境URL
- ギャラリー: http://localhost:3000/zukan
- 管理画面: http://localhost:3000/admin
- API: http://localhost:3000/api/*

### 本番環境URL
- ギャラリー: https://akyodex.com/zukan
- 管理画面: https://akyodex.com/admin
- API: https://akyodex.com/api/*

## 移行メモ

### レガシー → Next.js
- **ステータス**: 進行中 (Next.js 15移行完了)
- **レガシーファイル**: ルートディレクトリ (HTML/CSS/JS)
- **新規ファイル**: akyodex-nextjs/ ディレクトリ
- **共存**: 両バージョンを別々にデプロイ
- **将来**: Next.jsのみへ段階的に移行
