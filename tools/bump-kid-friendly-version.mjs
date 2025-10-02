#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

function fail(message) {
  console.error(`\u274c  ${message}`);
  process.exit(1);
}

const nextVersion = process.argv[2];
if (!nextVersion) {
  fail("Usage: node tools/bump-kid-friendly-version.mjs <YYYYMMDD|version>");
}

if (!/^\d{4,}$/.test(nextVersion)) {
  fail(
    `Invalid version "${nextVersion}". Use a numeric stamp such as 20250927.`
  );
}

function updateFile(relativePath, transform) {
  const filePath = join(repoRoot, relativePath);
  const original = readFileSync(filePath, "utf8");
  const updated = transform(original);
  if (original === updated) {
    fail(
      `No changes produced for ${relativePath}. Check that the expected patterns exist.`
    );
  }
  writeFileSync(filePath, updated, "utf8");
  console.log(`\u2705  Updated ${relativePath}`);
}

const cssVersionPattern = /const CSS_VERSION = '([^']+)'/;
const kidCssPattern = /kid-friendly\.css\?v=\d+/g;
const kidCssBacktickPattern = /`css\/kid-friendly\.css\?v=\d+`/g;
const kidBackgroundPattern = /akyo-bg\.webp\?v=\d+/g;

updateFile("sw.js", (content) => {
  if (!cssVersionPattern.test(content)) {
    fail("Could not find CSS_VERSION assignment in sw.js");
  }
  return content
    .replace(cssVersionPattern, `const CSS_VERSION = '${nextVersion}'`)
    .replace(kidBackgroundPattern, `akyo-bg.webp?v=${nextVersion}`);
});

updateFile("css/kid-friendly.css", (content) => {
  if (!kidBackgroundPattern.test(content)) {
    fail("Could not find akyo-bg.webp version in css/kid-friendly.css");
  }
  return content.replace(kidBackgroundPattern, `akyo-bg.webp?v=${nextVersion}`);
});

["index.html", "admin.html", "finder.html", "logo-upload.html"].forEach(
  (htmlPath) => {
    updateFile(htmlPath, (content) => {
      if (!kidCssPattern.test(content)) {
        fail(`Could not find versioned stylesheet reference in ${htmlPath}`);
      }
      return content.replace(
        kidCssPattern,
        `kid-friendly.css?v=${nextVersion}`
      );
    });
  }
);

updateFile("HOSTING-GUIDE.md", (content) => {
  let updated = content;
  if (kidCssBacktickPattern.test(updated)) {
    updated = updated.replace(
      kidCssBacktickPattern,
      `\`css/kid-friendly.css?v=${nextVersion}\``
    );
  }
  if (kidBackgroundPattern.test(updated)) {
    updated = updated.replace(
      kidBackgroundPattern,
      `akyo-bg.webp?v=${nextVersion}`
    );
  }
  if (updated === content) {
    fail(
      "HOSTING-GUIDE.md did not contain versioned asset references to update."
    );
  }
  return updated;
});

console.log("\nAll kid-friendly assets now reference version", nextVersion);
