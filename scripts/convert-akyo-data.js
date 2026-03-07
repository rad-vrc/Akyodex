#!/usr/bin/env node

/**
 * CSV → JSON 変換スクリプト
 * - data/akyo-data-ja.csv → data/akyo-data-ja.json
 * - data/akyo-data-en.csv → data/akyo-data-en.json
 * - CSV の列: 旧7列 + 追加列（SourceURL, EntryType, DisplaySerial）に対応
 * - JSON の列: id, nickname, avatarName, category, comment, author, avatarUrl, sourceUrl, entryType, displaySerial
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

// 変換対象のファイルペア
const files = [
  { csv: "akyo-data-ja.csv", json: "akyo-data-ja.json" },
  { csv: "akyo-data-en.csv", json: "akyo-data-en.json" },
];

/**
 * 1 行ぶんの CSV をパースする簡易パーサ
 * - ダブルクォート内のカンマを許容
 * - 連続した "" はエスケープされた " として扱う
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
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
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function normalizeValue(value) {
  return value.replace(/\r/g, "");
}

function getColumnValue(headerIndexMap, cols, aliases, fallbackIndex = -1) {
  for (const alias of aliases) {
    const index = headerIndexMap.get(alias.toLowerCase());
    if (typeof index === "number") {
      return normalizeValue(String(cols[index] ?? ""));
    }
  }

  if (fallbackIndex >= 0) {
    return normalizeValue(String(cols[fallbackIndex] ?? ""));
  }

  return "";
}

function convertCsvToJson(csvPath, jsonPath) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️ CSVファイルが存在しません: ${csvPath}`);
    return 0;
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length <= 1) {
    console.warn(`⚠️ CSV にデータ行がありません: ${csvPath}`);
    return 0;
  }

  // 先頭行はヘッダー
  const headerLine = lines.shift();
  if (!headerLine) {
    console.warn(`⚠️ CSVヘッダーを取得できません: ${csvPath}`);
    return 0;
  }
  const headerColumns = parseCsvLine(headerLine).map((column) =>
    normalizeValue(column).trim(),
  );
  const headerIndexMap = new Map(
    headerColumns.map((columnName, index) => [columnName.toLowerCase(), index]),
  );

  const items = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);

    if (cols.length < 7) {
      // 想定外の行はスキップして警告
      console.warn(
        `列数が想定外のためスキップ: (想定 最低7列, 実際 ${cols.length} 列) ${line}`,
      );
      continue;
    }

    const id = getColumnValue(headerIndexMap, cols, ["id"], 0).padStart(4, "0");
    const nickname = getColumnValue(headerIndexMap, cols, ["nickname"], 1);
    const avatarName = getColumnValue(headerIndexMap, cols, ["avatarname"], 2);
    const category = getColumnValue(
      headerIndexMap,
      cols,
      ["category", "attributes"],
      3,
    );
    const comment = getColumnValue(
      headerIndexMap,
      cols,
      ["comment", "notes"],
      4,
    );
    const author = getColumnValue(
      headerIndexMap,
      cols,
      ["author", "creator"],
      5,
    );
    const avatarUrl = getColumnValue(headerIndexMap, cols, ["avatarurl"], 6);
    const sourceUrl =
      getColumnValue(headerIndexMap, cols, ["sourceurl"], 7) || avatarUrl;
    const entryTypeRaw = getColumnValue(headerIndexMap, cols, ["entrytype"], 8)
      .trim()
      .toLowerCase();
    const explicitDisplaySerial = getColumnValue(
      headerIndexMap,
      cols,
      ["displayserial"],
      9,
    ).trim();
    const entryType =
      entryTypeRaw === "world"
        ? "world"
        : entryTypeRaw === "avatar"
          ? "avatar"
          : undefined;
    const displaySerial =
      explicitDisplaySerial || (entryType === "avatar" ? id : undefined);

    const item = {
      id,
      entryType,
      displaySerial,
      nickname,
      avatarName,
      category,
      comment,
      author,
      avatarUrl,
      sourceUrl,
    };

    items.push(item);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2) + "\n", "utf8");
  return items.length;
}

function main() {
  let totalConverted = 0;

  for (const { csv, json } of files) {
    const csvPath = path.join(rootDir, "data", csv);
    const jsonPath = path.join(rootDir, "data", json);

    const count = convertCsvToJson(csvPath, jsonPath);
    if (count > 0) {
      console.log(
        `✅ ${csv} から ${count} 件を変換し、${json} に出力しました。`,
      );
      totalConverted += count;
    }
  }

  if (totalConverted === 0) {
    console.error("❌ 変換されたデータがありません。");
    process.exit(1);
  }

  console.log(`\n🎉 合計 ${totalConverted} 件のデータを変換しました。`);
}

if (require.main === module) {
  main();
}
