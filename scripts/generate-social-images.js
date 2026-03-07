/**
 * logo-200.png を 1200x630 にリサイズして OG/Twitter プレビュー画像を生成
 * X/Discord 推奨サイズに最適化
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(PROJECT_ROOT, 'public/images/logo-200.png');
const OUT_OG = path.join(PROJECT_ROOT, 'src/app/opengraph-image.png');
const OUT_TW = path.join(PROJECT_ROOT, 'src/app/twitter-image.png');

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found:', SRC);
    process.exit(1);
  }

  const buffer = await sharp(SRC)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  fs.mkdirSync(path.dirname(OUT_OG), { recursive: true });
  fs.writeFileSync(OUT_OG, buffer);
  fs.writeFileSync(OUT_TW, buffer);

  const stats = fs.statSync(OUT_OG);
  console.log('Generated:', OUT_OG, OUT_TW);
  console.log('Size:', (stats.size / 1024).toFixed(1), 'KB');
  console.log('Dimensions: 1200x630');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
