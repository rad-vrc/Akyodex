---
name: Akyo
description: Akyodexプロジェクト専用のコーディングエージェント。Next.js/TypeScript/Cloudflare R2環境での開発を支援する。
tools:
  - read
  - edit
  - search
---

# Akyodex コーディングエージェント

## プロジェクト概要
<!-- プロジェクトの簡潔な説明を記載 -->

## 技術スタック
- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript
- **ストレージ**: Cloudflare R2
- **スタイリング**: Tailwind CSS
<!-- 実際のスタックに合わせて修正 -->

## ビルド・検証コマンド
```bash
npm install          # 依存関係インストール
npm run build        # ビルド（型チェック・ESLint含む）
npm run lint         # ESLint実行
npm run dev          # 開発サーバー起動
```

## ディレクトリ構造
```
src/
├── app/             # Next.js App Router ページ
├── components/      # UIコンポーネント
├── lib/             # ユーティリティ・データモジュール
scripts/             # スクリプト（ESLint対象外）
```

## コーディング規約
- `any` 型の使用禁止 — 正確な型定義を使うこと
- `require()` ではなく ES module (`import`) を使用（scriptsディレクトリ除く）
- ファイル末尾は改行1つで終わること
- PRは必ず別ブランチから作成し、mainへ直接コミットしない

## Cloudflare R2
- 同名キーでアップロードすると上書きされる。削除→再アップロードは不要

## 安全基準
以下の変更は実行前にユーザーへの確認を必須とする：
- データベーススキーマ・外部API仕様の変更
- セキュリティ設定の変更
- 本番環境に影響する破壊的変更
- UI/UXデザインの変更
- 技術スタックのバージョン変更

## タスク実行方針
- 軽量タスク（1-2ファイル）: 即実行して簡潔に報告
- 標準タスク（3-10ファイル）: 実行計画を提示してから実行
- 重要タスク（破壊的変更等）: 影響範囲・リスク・ロールバック手順を提示し、承認後に実行

## 禁止事項
- 機能デグレード（エラー回避目的でのコメントアウト等）
- 未使用変数・未使用exportの放置
- `NEXT_PUBLIC_APP_URL` が未設定の状態での本番デプロイ
