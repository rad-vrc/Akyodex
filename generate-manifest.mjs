#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const IMAGES_DIR = process.env.IMAGES_DIR || 'images';
const OUTPUT = process.env.MANIFEST_OUTPUT || 'images/manifest.json';
const FULL_URL = String(process.env.FULL_URL || '').toLowerCase() === 'true';
const BASE_URL = process.env.BASE_URL || 'https://images.akyodex.com/images';

const imagesPath = path.join(repoRoot, IMAGES_DIR);
const outputPath = path.join(repoRoot, OUTPUT);

if (!fs.existsSync(imagesPath)) {
  console.error(`Images directory not found: ${imagesPath}`);
  process.exit(1);
}

const ensureDir = (p) => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const entries = fs
  .readdirSync(imagesPath, { withFileTypes: true })
  .filter(d => d.isFile())
  .map(d => d.name)
  .filter(n => /\.(webp|png|jpg|jpeg)$/i.test(n))
  .sort();

const map = {};
for (const name of entries) {
  const m = name.match(/^(\d{3})/);
  if (!m) continue;
  const id = m[1];
  if (map[id]) continue;
  map[id] = FULL_URL ? `${BASE_URL}/${name}` : name;
}

const two = (n) => String(n).padStart(2, '0');
const now = new Date();
const version = [
  now.getFullYear(),
  two(now.getMonth() + 1),
  two(now.getDate())
].join('') + '-' + [two(now.getHours()), two(now.getMinutes()), two(now.getSeconds())].join('');

// 将来の拡張: ミニAkyo背景のキーを併載（存在すれば）
let miniAkyo = null;
const miniCandidates = [
  'miniakyo.webp', '@miniakyo.webp',
  'images/miniakyo.webp', 'images/@miniakyo.webp'
];
for (const cand of miniCandidates){
  const p = path.join(imagesPath, cand);
  if (fs.existsSync(p)){
    miniAkyo = FULL_URL ? `${BASE_URL}/${cand.replace(/^images\//,'')}` : cand;
    break;
  }
}

const manifest = { version, map, ...(miniAkyo ? { miniAkyo } : {}) };

ensureDir(outputPath);
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`Manifest written: ${OUTPUT} (items=${Object.keys(map).length}, version=${version})`);
