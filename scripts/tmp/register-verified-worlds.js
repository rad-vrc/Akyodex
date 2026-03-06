#!/usr/bin/env node

/**
 * Register verified VRChat world entries into Akyodex CSV/JSON datasets.
 *
 * Purpose:
 * - Append verified world rows to ja/en/ko CSV files
 * - Preserve immutable internal `id`
 * - Preserve append-only public world numbering via `DisplaySerial`
 * - Rebuild ja/en/ko JSON files from CSV
 *
 * Usage:
 *   node scripts/tmp/register-verified-worlds.js
 *
 * Notes:
 * - This script is intentionally conservative and idempotent.
 * - It skips rows when the same `wrld_...` URL already exists.
 * - It uses the same verified metadata for ja/en/ko unless you later customize per-locale text.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const CSV_FILES = {
  ja: path.join(DATA_DIR, 'akyo-data-ja.csv'),
  en: path.join(DATA_DIR, 'akyo-data-en.csv'),
  ko: path.join(DATA_DIR, 'akyo-data-ko.csv'),
};

const JSON_FILES = {
  ja: path.join(DATA_DIR, 'akyo-data-ja.json'),
  en: path.join(DATA_DIR, 'akyo-data-en.json'),
  ko: path.join(DATA_DIR, 'akyo-data-ko.json'),
};

const REQUIRED_COLUMNS = [
  'ID',
  'Nickname',
  'AvatarName',
  'Category',
  'Comment',
  'Author',
  'AvatarURL',
  'SourceURL',
  'EntryType',
  'DisplaySerial',
];

/**
 * Verified world metadata.
 *
 * IMPORTANT:
 * - These values were manually verified while logged in to VRChat.
 * - Edit comments/category per locale if you want locale-specific text later.
 */
const VERIFIED_WORLDS = [
  {
    wrld: 'wrld_b0748170-ed80-4544-8c0f-d5c9f8a1d764',
    nickname: '最終バス（LastBus）',
    author: 'たくあん_',
    category: 'ワールド',
    comment: '',
  },
  {
    wrld: 'wrld_e5f87a59-70a9-4110-9af9-67bc0e38195b',
    nickname: 'Legacy Japan Street',
    author: 'NEET ENGINEER',
    category: 'ワールド',
    comment: '',
  },
  {
    wrld: 'wrld_c5322553-b156-433e-9117-33386919dbc3',
    nickname: 'Last',
    author: 'Tentilicon',
    category: 'ワールド',
    comment: '',
  },
  {
    wrld: 'wrld_d7c64a4a-b795-456c-8c4a-4657c9c94920',
    nickname: '星月夜 - Starry Night -',
    author: 'ももx_x',
    category: 'ワールド',
    comment: '',
  },
  {
    wrld: 'wrld_b0d752e6-bbb8-4b1e-acfa-2a111a9cd990',
    nickname: 'こなちるーむ -day-',
    author: 'konachi-',
    category: 'ワールド',
    comment: '',
  },
];

function parseCsv(content) {
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\r') {
      if (next === '\n') {
        i += 1;
      }
      row.push(field);
      records.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

function stringifyCsv(records) {
  return `${records
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')}\n`;
}

function ensureColumns(header) {
  const nextHeader = [...header];
  for (const column of REQUIRED_COLUMNS) {
    if (!nextHeader.includes(column)) {
      nextHeader.push(column);
    }
  }
  return nextHeader;
}

function buildIndexMap(header) {
  const map = Object.create(null);
  for (let i = 0; i < header.length; i += 1) {
    map[header[i]] = i;
  }
  return map;
}

function normalizeRows(header, rows) {
  return rows.map((row) => header.map((_, index) => row[index] || ''));
}

function readCsvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const records = parseCsv(raw);

  if (records.length === 0) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const [rawHeader, ...rawRows] = records;
  const header = ensureColumns(rawHeader);
  const rows = normalizeRows(header, rawRows);

  return {
    filePath,
    header,
    rows,
    indexMap: buildIndexMap(header),
  };
}

function writeCsvFile(csv) {
  fs.writeFileSync(csv.filePath, stringifyCsv([csv.header, ...csv.rows]), 'utf8');
}

function getCell(row, indexMap, column) {
  const index = indexMap[column];
  return index == null ? '' : String(row[index] || '');
}

function setCell(row, indexMap, column, value) {
  const index = indexMap[column];
  if (index == null) {
    throw new Error(`Missing column: ${column}`);
  }
  row[index] = String(value ?? '');
}

function format4(num) {
  return String(num).padStart(4, '0');
}

function buildWorldUrl(wrld) {
  return `https://vrchat.com/home/world/${wrld}`;
}

function getMaxNumericId(rows, indexMap) {
  let maxId = 0;

  for (const row of rows) {
    const parsed = Number.parseInt(getCell(row, indexMap, 'ID').trim(), 10);
    if (!Number.isNaN(parsed) && parsed > maxId) {
      maxId = parsed;
    }
  }

  return maxId;
}

function getMaxWorldDisplaySerial(rows, indexMap) {
  let maxSerial = 0;

  for (const row of rows) {
    const entryType = getCell(row, indexMap, 'EntryType').trim().toLowerCase();
    if (entryType !== 'world') {
      continue;
    }

    const parsed = Number.parseInt(getCell(row, indexMap, 'DisplaySerial').trim(), 10);
    if (!Number.isNaN(parsed) && parsed > maxSerial) {
      maxSerial = parsed;
    }
  }

  return maxSerial;
}

function hasWorldByWrld(rows, indexMap, wrld) {
  return rows.some((row) => {
    const avatarUrl = getCell(row, indexMap, 'AvatarURL');
    const sourceUrl = getCell(row, indexMap, 'SourceURL');
    return avatarUrl.includes(wrld) || sourceUrl.includes(wrld);
  });
}

function appendVerifiedWorlds(csv, worlds) {
  let nextId = getMaxNumericId(csv.rows, csv.indexMap) + 1;
  let nextDisplaySerial = getMaxWorldDisplaySerial(csv.rows, csv.indexMap) + 1;
  const added = [];

  for (const world of worlds) {
    if (hasWorldByWrld(csv.rows, csv.indexMap, world.wrld)) {
      continue;
    }

    const row = csv.header.map(() => '');
    const id = format4(nextId);
    const displaySerial = format4(nextDisplaySerial);
    const worldUrl = buildWorldUrl(world.wrld);

    setCell(row, csv.indexMap, 'ID', id);
    setCell(row, csv.indexMap, 'Nickname', world.nickname);
    setCell(row, csv.indexMap, 'AvatarName', '');
    setCell(row, csv.indexMap, 'Category', world.category || 'ワールド');
    setCell(row, csv.indexMap, 'Comment', world.comment || '');
    setCell(row, csv.indexMap, 'Author', world.author);
    setCell(row, csv.indexMap, 'AvatarURL', worldUrl);
    setCell(row, csv.indexMap, 'SourceURL', worldUrl);
    setCell(row, csv.indexMap, 'EntryType', 'world');
    setCell(row, csv.indexMap, 'DisplaySerial', displaySerial);

    csv.rows.push(row);
    added.push({
      id,
      displaySerial,
      wrld: world.wrld,
      nickname: world.nickname,
      author: world.author,
    });

    nextId += 1;
    nextDisplaySerial += 1;
  }

  return added;
}

function convertCsvRowsToJsonItems(csv) {
  return csv.rows.map((row) => {
    const id = getCell(row, csv.indexMap, 'ID').trim();
    const entryTypeRaw = getCell(row, csv.indexMap, 'EntryType').trim().toLowerCase();
    const entryType =
      entryTypeRaw === 'world'
        ? 'world'
        : entryTypeRaw === 'avatar'
          ? 'avatar'
          : undefined;
    const displaySerialRaw = getCell(row, csv.indexMap, 'DisplaySerial').trim();

    return {
      id,
      entryType,
      displaySerial: displaySerialRaw || (entryType === 'avatar' ? id : undefined),
      nickname: getCell(row, csv.indexMap, 'Nickname'),
      avatarName: getCell(row, csv.indexMap, 'AvatarName'),
      category: getCell(row, csv.indexMap, 'Category'),
      comment: getCell(row, csv.indexMap, 'Comment'),
      author: getCell(row, csv.indexMap, 'Author'),
      sourceUrl:
        getCell(row, csv.indexMap, 'SourceURL') ||
        getCell(row, csv.indexMap, 'AvatarURL'),
      avatarUrl:
        getCell(row, csv.indexMap, 'AvatarURL') ||
        getCell(row, csv.indexMap, 'SourceURL'),
    };
  });
}

function writeJsonFiles(csvs) {
  fs.writeFileSync(
    JSON_FILES.ja,
    `${JSON.stringify(convertCsvRowsToJsonItems(csvs.ja), null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    JSON_FILES.en,
    `${JSON.stringify(convertCsvRowsToJsonItems(csvs.en), null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    JSON_FILES.ko,
    `${JSON.stringify(convertCsvRowsToJsonItems(csvs.ko), null, 2)}\n`,
    'utf8'
  );
}

function main() {
  const csvs = {
    ja: readCsvFile(CSV_FILES.ja),
    en: readCsvFile(CSV_FILES.en),
    ko: readCsvFile(CSV_FILES.ko),
  };

  const addedByLocale = {
    ja: appendVerifiedWorlds(csvs.ja, VERIFIED_WORLDS),
    en: appendVerifiedWorlds(csvs.en, VERIFIED_WORLDS),
    ko: appendVerifiedWorlds(csvs.ko, VERIFIED_WORLDS),
  };

  writeCsvFile(csvs.ja);
  writeCsvFile(csvs.en);
  writeCsvFile(csvs.ko);
  writeJsonFiles(csvs);

  console.log('✅ Verified world registration complete');
  for (const locale of Object.keys(addedByLocale)) {
    const added = addedByLocale[locale];
    console.log(`\n[${locale}] added: ${added.length}`);
    for (const item of added) {
      console.log(
        `- id=${item.id} world${item.displaySerial} ${item.nickname} / ${item.author} / ${item.wrld}`
      );
    }
  }
}

main();
