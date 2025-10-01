# Akyodex (Akyoずかん) - プロジェクト概要

## プロジェクトの目的
Akyodexは、500種類以上存在する「Akyo」という謎の生き物たちを検索・閲覧できるファン向けの図鑑サイトです。VRChatアバターへのリンクも提供し、ポケモン図鑑のような楽しい体験を提供します。子どもでも親しみやすいモダンなカードデザインを採用しています。

## 技術スタック
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+), TypeScript
- **CSSフレームワーク**: Tailwind CSS (CDN)
- **バックエンド**: Cloudflare Pages Functions (TypeScript)
- **ストレージ**:
  - R2 (Cloudflare): 画像配信 (images.akyodex.com)
  - KV (Cloudflare): メタデータ保存
  - IndexedDB: ローカル画像キャッシュ (数GB対応)
  - LocalStorage: お気に入り・設定・認証情報
  - SessionStorage: 一時認証情報
- **データ形式**: CSV → JSON変換 (data/akyo-data.csv)
- **デプロイ**: Cloudflare Pages (本番: akyodex.com)

## コア機能
- グリッド/リストビューの切替
- フリーワード検索・属性/作者フィルター
- お気に入り機能 (LocalStorage永続化)
- 詳細モーダル表示
- レスポンシブデザイン (PC/タブレット/スマホ対応)
- 管理者機能 (新規登録/編集/削除/ツール)

## データ構造
- CSV形式のAkyoデータ (ID,見た目,通称,アバター名,属性,備考,作者,アバターURL)
- 内部モデル: 3桁固定ID (001-999)、属性（複数可）、VRChat連携

## 認証システム
- オーナー権限 (RadAkyo): 全機能利用可能
- 管理者権限 (Akyo): 追加・編集のみ
- Bearerトークン認証 (メモリ内保持)

## 画像管理
- 命名規則: images/NNN.webp (3桁ID固定)
- 取得優先順位: マニフェスト → R2直リンク → VRChatフォールバック → 静的ファイル
- 高速化機能: マニフェストキャッシュ、IntersectionObserver先読み、自動フォールバック