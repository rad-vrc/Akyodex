#!/usr/bin/env node

/**
 * data/akyo-data.csv → data/akyo-data.json 変換スクリプト
 * - CSV の列: ID, Nickname, AvatarName, Category, Comment, Author, AvatarURL
 * - JSON の列: id, nickname, avatarName, category, comment, author, avatarUrl
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const csvPath = path.join(rootDir, 'data', 'akyo-data.csv');
const jsonPath = path.join(rootDir, 'data', 'akyo-data.json');

/**
 * 1 行ぶんの CSV をパースする簡易パーサ
 * - ダブルクォート内のカンマを許容
 * - 連続した "" はエスケープされた " として扱う
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      // "" -> エスケープされた "
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function normalizeValue(value) {
  return value.replace(/\r/g, '');
}

function main() {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length <= 1) {
    console.error('CSV にデータ行がありません。');
    process.exit(1);
  }

  // 先頭行はヘッダーとしてスキップ
  lines.shift();

  const items = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);

    if (cols.length !== 7) {
      // 想定外の行はスキップして警告
      console.warn(
        `列数が想定外のためスキップ: (想定 7 列, 実際 ${cols.length} 列) ${line}`,
      );
      continue;
    }

    const item = {
      id: normalizeValue(cols[0]),
      nickname: normalizeValue(cols[1]),
      avatarName: normalizeValue(cols[2]),
      category: normalizeValue(cols[3]),
      comment: normalizeValue(cols[4]),
      author: normalizeValue(cols[5]),
      avatarUrl: normalizeValue(cols[6]),
    };

    items.push(item);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2) + '\n', 'utf8');
  console.log(
    `✅ ${path.relative(rootDir, csvPath)} から ${items.length} 件を変換し、${path.relative(
      rootDir,
      jsonPath,
    )} に出力しました。`,
  );
}

if (require.main === module) {
  main();
}

