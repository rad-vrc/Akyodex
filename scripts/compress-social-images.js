/**
 * 既存の OG/Twitter 画像を圧縮（切り取りは維持）
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OG = path.join(PROJECT_ROOT, 'src/app/opengraph-image.png');
const TW = path.join(PROJECT_ROOT, 'src/app/twitter-image.png');

async function compress(filePath) {
  const before = fs.statSync(filePath).size;
  const buffer = await sharp(filePath)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  fs.writeFileSync(filePath, buffer);
  const after = buffer.length;
  return { before, after };
}

async function main() {
  for (const p of [OG, TW]) {
    if (!fs.existsSync(p)) {
      console.warn('Skip (not found):', p);
      continue;
    }
    const { before, after } = await compress(p);
    console.log(path.basename(p), (before / 1024).toFixed(1), 'KB ->', (after / 1024).toFixed(1), 'KB');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
