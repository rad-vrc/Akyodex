# Akyo データ統一 & Vectorize 再同期計画 v2

## 0. ゴール / 前提
- CSV / JSON / TypeScript / Vectorize / D1 で同じスキーマに統一し、再同期できる状態を作る。
- 正式スキーマ（アプリ側 JSON / CSV）：`id, nickname, avatarname, category, comment, author, url`
- ソース・オブ・トゥルースは **CSV**。`data/akyo-data.json` は生成物として扱う。
- 画像は別管理（見た目列は使わない）。
- 秘匿情報（`CLOUDFLARE_API_TOKEN` 等）は環境変数で渡す。コードに直書きしない。

## 1. スキーマ確定とマッピング
- CSV ヘッダー（日本語版/英語版共通の列順を固定）  
  `ID, 通称, アバター名, カテゴリ, 備考, 作者（敬称略）, アバターURL`
- JSON (Next.js) フィールド:  
  `id, nickname, avatarname, category, comment, author, url`
- Worker / Vectorize 用メタデータへの対応:  
  - `id` → `id`  
  - `nickname` → `nickname`  
  - `avatarname` → `name`  
  - `category` → `category`  
  - `comment` → `description`  
  - `author` → `author`  
  - `url` → `url`  
  - `language` は生成時に付与（ja / en）

## 2. 段階的移行（順番に実施）
### A. 型とコードの準備（後方互換しつつ進める）
- `src/types/akyo.ts` を正式スキーマに合わせてリネーム（attribute/notes/creator 等を廃止）。  
- `csv-utils.ts` に一時的な後方互換マッピングを入れる（旧ヘッダー `属性（モチーフが基準）` も読めるように）→ 後で削除する前提。  
- コンポーネント / API で旧フィールドを参照していないか置換（attribute→category, author 等）。

### B. CSV 物理構造の変更
- `data/akyo-data.csv` / `akyo-data-US.csv` の 2 列目「見た目」を削除し、ヘッダーを 7 列に揃える。  
- 作業前にバックアップ（例: `data/akyo-data.csv.bak`）。  
- 列数チェック（全行 7 列）と行数カウントを記録。

### C. 変換スクリプトの更新
- `scripts/convert-akyo-data.js` を新ヘッダー前提に修正。  
- オプション: Worker 用ペイロード（`name/description` へのマッピング）を出力できるフラグを追加。  
- JSON 出力はトップレベル配列のまま（`akyo` キーを付けない）。  
- 出力後にフォーマット確認 (`jq '.[0]' data/akyo-data.json` 等)。

### D. Vectorize / D1 への再投入
- 新 CSV → JSON 生成 → `/insert-data` に POST（バッチでも可）。  
- 必要なら Vectorize を事前にクリア or 上書き upsert のみで進める（運用ポリシーに従う）。  
- D1 への投入は Worker が同時に行うので、挿入件数とエラーをログに残す。  
- 検証: `/health`, `/search`, `/debug-search`, `/test-author-filter` を最低限叩き、言語フィルタと exact マッチの挙動を確認。

### E. 互換コードの整理
- CSV 後方互換マッピング（旧ヘッダー対応）を削除。  
- 使っていない `appearance` などのフィールドを型とコードから除去。  
- ドキュメント（README/plan）を最新化。

## 3. テスト / 検証
- `npm run lint`（型エラー・import 崩れ確認）。  
- CSV パース／生成のユニットテストを新スキーマで追加・更新。  
- 管理画面 E2E: 追加→編集→検索→表示で新フィールドが一貫して反映されるか。  
- Vectorize 検証: 代表キーワード（日本語/英語）で `/search` を叩き、上位結果に期待の id が含まれるかをチェック。

## 4. ロールバック指針
- CSV は常にバックアップを保存（変更前コピーと Git diff）。  
- 変換スクリプトは旧バージョンを残し、切り戻し用に `convert-akyo-data.legacy.js` を一時保持可。  
- Vectorize 再投入に失敗した場合は、バックアップ CSV → 旧スクリプトで再 upsert して戻す。

## 5. 運用ルール
- 編集フロー: CSV 編集 → `node scripts/convert-akyo-data.js` → 確認 → コミット/デプロイ。  
- Secrets: `CLOUDFLARE_API_TOKEN` などは環境変数で渡す（Windows ユーザー環境変数設定済み）。  
- 定期再インデックスが必要な場合は、バッチ手順を README に追記。

## 6. 着手順チェックリスト（実行順の目安）
1. 型・コードの後方互換リネーム（A）  
2. CSV 物理変更 + バックアップ（B）  
3. 変換スクリプト更新 & JSON 再生成（C）  
4. Vectorize / D1 再投入 & 検証（D）  
5. 互換コード除去・ドキュメント更新（E）
