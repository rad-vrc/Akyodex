#!/usr/bin/env node
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const IMAGES_DIR = process.env.IMAGES_DIR || "images";
const OUTPUT = process.env.MANIFEST_OUTPUT || "images/manifest.json";
const FULL_URL = String(process.env.FULL_URL || "").toLowerCase() === "true";
const USE_CSV_IDS =
  String(process.env.USE_CSV_IDS || "").toLowerCase() === "true";
const DEFAULT_EXT = (process.env.DEFAULT_EXT || "webp").replace(/^\./, "");
const BASE_URL = process.env.BASE_URL || "https://images.akyodex.com";

const imagesPath = path.join(repoRoot, IMAGES_DIR);
const outputPath = path.join(repoRoot, OUTPUT);

const ensureDir = (p) => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const map = {};

if (USE_CSV_IDS) {
  // Build from CSV IDs → BASE_URL/ID.DEFAULT_EXT
  const csvPath = path.join(repoRoot, "data", "akyo-data.csv");
  try {
    const content = fs.readFileSync(csvPath, "utf8");
    const lines = content.split(/\r?\n/);
    const seen = new Set();
    for (const line of lines) {
      const m = line.match(/^(\d{3}),/);
      if (!m) continue;
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      map[id] = FULL_URL
        ? `${BASE_URL}/${id}.${DEFAULT_EXT}`
        : `${id}.${DEFAULT_EXT}`;
    }
  } catch (e) {
    console.error("Failed to read CSV for IDs:", e.message);
  }
} else if (fs.existsSync(imagesPath)) {
  const entries = fs
    .readdirSync(imagesPath, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => /\.(webp|png|jpg|jpeg)$/i.test(n))
    .filter(
      (n) =>
        [
          "logo.webp",
          "logo-200.png",
          "profileIcon.png",
          "miniakyo.webp",
          "manifest.json",
        ].indexOf(n) === -1
    )
    .sort();

  for (const name of entries) {
    const m = name.match(/^(\d{3})/);
    if (!m) continue;
    const id = m[1];
    if (map[id]) continue;
    map[id] = FULL_URL ? `${BASE_URL}/${name.replace(/^images\//, "")}` : name;
  }
} else {
  console.error(`Images directory not found: ${imagesPath}`);
}

const two = (n) => String(n).padStart(2, "0");
const now = new Date();
const version =
  [now.getFullYear(), two(now.getMonth() + 1), two(now.getDate())].join("") +
  "-" +
  [two(now.getHours()), two(now.getMinutes()), two(now.getSeconds())].join("");

// 将来の拡張: ミニAkyo背景のキーを併載（存在すれば）
const miniAkyo = `${BASE_URL}/miniakyo.webp`;

const manifest = { version, map, ...(miniAkyo ? { miniAkyo } : {}) };

// ついでに sitemap.txt / sitemap.xml を出力（簡易）
try {
  const base = process.env.SITE_BASE || "https://akyodex.com";
  const urls = Object.keys(map).map((id) => `${base}/index.html?id=${id}`);
  fs.writeFileSync(
    path.join(repoRoot, "sitemap.txt"),
    urls.join("\n") + "\n",
    "utf8"
  );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    "</urlset>",
  ].join("\n");
  fs.writeFileSync(path.join(repoRoot, "sitemap.xml"), xml + "\n", "utf8");
} catch (_) {}

ensureDir(outputPath);
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(
  `Manifest written: ${OUTPUT} (items=${Object.keys(map).length}, version=${version})`
);
