#!/bin/bash
# R2バケット内の3桁ファイルを4桁にリネームするスクリプト
# 使用方法: ./scripts/rename-r2-to-4digit.sh
#
# 前提:
# - CLOUDFLARE_ACCOUNT_ID と CLOUDFLARE_API_TOKEN が環境変数に設定されていること
# - または wrangler が認証済みであること

BUCKET_NAME="akyo-images"
R2_PUBLIC_URL="https://images.akyodex.com"

echo "=== R2バケット内の画像を3桁→4桁にリネーム ==="
echo "バケット: $BUCKET_NAME"
echo "公開URL: $R2_PUBLIC_URL"
echo ""

# 方法1: wrangler経由でコピー＆削除
# wrangler r2 object get/put/delete を使用

# まず、3桁ファイルが存在するかHTTPで確認
echo "=== 3桁ファイルの存在確認 ==="
for i in $(seq -w 1 200); do
  # 3桁形式 (001, 002, ..., 200)
  three_digit=$(printf "%03d" $i)
  four_digit=$(printf "%04d" $i)

  # HTTPステータスコードを取得
  status=$(curl -s -o /dev/null -w "%{http_code}" "${R2_PUBLIC_URL}/${three_digit}.webp")

  if [ "$status" = "200" ]; then
    echo "Found: ${three_digit}.webp → ${four_digit}.webp"

    # ダウンロード
    curl -s "${R2_PUBLIC_URL}/${three_digit}.webp" -o "/tmp/${three_digit}.webp"

    # wranglerでアップロード（4桁名）
    npx wrangler r2 object put "${BUCKET_NAME}/${four_digit}.webp" \
      --file "/tmp/${three_digit}.webp" \
      --content-type "image/webp" \
      --remote

    # 旧ファイル削除
    npx wrangler r2 object delete "${BUCKET_NAME}/${three_digit}.webp" --remote

    echo "  Renamed: ${three_digit}.webp → ${four_digit}.webp ✓"

    # 一時ファイル削除
    rm -f "/tmp/${three_digit}.webp"
  fi
done

echo ""
echo "=== リネーム完了 ==="
