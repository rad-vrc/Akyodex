#!/usr/bin/env node

/**
 * World display serial migration script
 *
 * Purpose:
 * - Keep `id` as the immutable internal primary key
 * - Assign `displaySerial` only for world entries
 * - Re-number existing worlds as `0001...` in a stable order for the next release
 *
 * Behavior:
 * - Reads `data/akyo-data-{ja,en,ko}.csv`
 * - Ensures optional columns `SourceURL`, `EntryType`, `DisplaySerial` exist
 * - Detects world rows from `EntryType`, `SourceURL`, `AvatarURL`, or `Category`
 * - Assigns the same world `displaySerial` across all locale CSVs based on JA source of truth
 * - Writes updated CSV files back to disk
 *
 * Notes:
 * - This script is intended for a one-time migration before release.
 * - After release, new world entries should use append-only numbering.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const FILES = {
  ja: path.join(DATA_DIR, 'akyo-data-ja.csv'),
  en: path.join(DATA_DIR, 'akyo-data-en.csv'),
  ko: path.join(DATA_DIR, 'akyo-data-ko.csv'),
};

const REQUIRED_BASE_COLUMNS = [
  'ID',
  'Nickname',
  'AvatarName',
  'Category',
  'Comment',
  'Author',
  'AvatarURL',
];

const OPTIONAL_COLUMNS = ['SourceURL', 'EntryType', 'DisplaySerial'];

const WORLD_CATEGORY_MARKERS = new Set(['ワールド', 'world', '월드']);
const WORLD_URL_PATTERN = /\/world\/(wrld_[A-Za-z0-9-]{1,64})(?:[/?#]|$)/i;
const AVATAR_URL_PATTERN = /\/avatar\/(avtr_[A-Za-z0-9-]{1,64})(?:[/?#]|$)/i;

function parseCsv(content) {
  const records = [];
  let field = '';
  let row = [];
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
        .map((value) => {
          const normalized = String(value ?? '');
          return `"${normalized.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n')}\n`;
}

function ensureColumns(header) {
  const nextHeader = [...header];

  for (const column of REQUIRED_BASE_COLUMNS) {
    if (!nextHeader.includes(column)) {
      throw new Error(`Missing required CSV column: ${column}`);
    }
  }

  for (const column of OPTIONAL_COLUMNS) {
    if (!nextHeader.includes(column)) {
      nextHeader.push(column);
    }
  }

  return nextHeader;
}

function normalizeRows(header, rows) {
  return rows.map((row) => header.map((_, index) => row[index] || ''));
}

function readCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parseCsv(content);

  if (records.length === 0) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const [rawHeader, ...rawRows] = records;
  const header = ensureColumns(rawHeader);
  const rows = normalizeRows(header, rawRows);
  const indexMap = buildIndexMap(header);

  return {
    filePath,
    header,
    rows,
    indexMap,
  };
}

function buildIndexMap(header) {
  const map = Object.create(null);

  for (let i = 0; i < header.length; i += 1) {
    map[header[i]] = i;
  }

  return map;
}

function getCell(row, indexMap, column) {
  const index = indexMap[column];
  return index == null ? '' : String(row[index] || '');
}

function setCell(row, indexMap, column, value) {
  const index = indexMap[column];
  if (index == null) {
    throw new Error(`Missing expected column: ${column}`);
  }
  row[index] = value;
}

function normalizeEntryType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'world' || normalized === 'avatar' ? normalized : '';
}

function splitCategoryTokens(category) {
  return String(category || '')
    .split(/[、,]/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function detectEntryType(row, indexMap) {
  const explicit = normalizeEntryType(getCell(row, indexMap, 'EntryType'));
  if (explicit) {
    return explicit;
  }

  const sourceUrl = getCell(row, indexMap, 'SourceURL').trim();
  const avatarUrl = getCell(row, indexMap, 'AvatarURL').trim();
  const urlCandidate = sourceUrl || avatarUrl;

  if (WORLD_URL_PATTERN.test(urlCandidate)) {
    return 'world';
  }
  if (AVATAR_URL_PATTERN.test(urlCandidate)) {
    return 'avatar';
  }

  const category = getCell(row, indexMap, 'Category');
  const hasWorldCategory = splitCategoryTokens(category).some((token) =>
    WORLD_CATEGORY_MARKERS.has(token)
  );

  return hasWorldCategory ? 'world' : 'avatar';
}

function extractWorldKey(row, indexMap) {
  const sourceUrl = getCell(row, indexMap, 'SourceURL').trim();
  const avatarUrl = getCell(row, indexMap, 'AvatarURL').trim();
  const urlCandidate = sourceUrl || avatarUrl;
  const worldMatch = urlCandidate.match(WORLD_URL_PATTERN);

  if (worldMatch && worldMatch[1]) {
    return `wrld:${worldMatch[1]}`;
  }

  const id = getCell(row, indexMap, 'ID').trim();
  return `id:${id}`;
}

function compareWorldRows(a, b) {
  const aDate = a.createdAt;
  const bDate = b.createdAt;

  if (aDate && bDate && aDate !== bDate) {
    return aDate < bDate ? -1 : 1;
  }
  if (aDate && !bDate) {
    return -1;
  }
  if (!aDate && bDate) {
    return 1;
  }

  if (a.id !== b.id) {
    return a.id.localeCompare(b.id, 'en');
  }

  return a.originalIndex - b.originalIndex;
}

function resolveCreatedAt(row, indexMap) {
  const candidates = ['CreatedAt', 'CreatedAtUTC', 'CreatedDate', 'Date', 'PublishedAt'];

  for (const column of candidates) {
    if (Object.prototype.hasOwnProperty.call(indexMap, column)) {
      const value = getCell(row, indexMap, column).trim();
      if (value) {
        return value;
      }
    }
  }

  return '';
}

function assignWorldDisplaySerialsFromJa(jaCsv) {
  const worldRows = [];

  for (let i = 0; i < jaCsv.rows.length; i += 1) {
    const row = jaCsv.rows[i];
    const entryType = detectEntryType(row, jaCsv.indexMap);
    const id = getCell(row, jaCsv.indexMap, 'ID').trim();

    if (!id) {
      continue;
    }

    if (entryType !== 'world') {
      setCell(row, jaCsv.indexMap, 'EntryType', 'avatar');
      setCell(row, jaCsv.indexMap, 'DisplaySerial', '');
      continue;
    }

    worldRows.push({
      row,
      id,
      key: extractWorldKey(row, jaCsv.indexMap),
      createdAt: resolveCreatedAt(row, jaCsv.indexMap),
      originalIndex: i,
    });
  }

  worldRows.sort(compareWorldRows);

  const serialMap = new Map();

  for (let i = 0; i < worldRows.length; i += 1) {
    const serial = String(i + 1).padStart(4, '0');
    const item = worldRows[i];
    serialMap.set(item.key, serial);
    serialMap.set(`id:${item.id}`, serial);

    setCell(item.row, jaCsv.indexMap, 'EntryType', 'world');
    setCell(item.row, jaCsv.indexMap, 'DisplaySerial', serial);
  }

  return {
    serialMap,
    count: worldRows.length,
  };
}

function applyWorldSerials(csv, serialMap) {
  let worldCount = 0;

  for (const row of csv.rows) {
    const id = getCell(row, csv.indexMap, 'ID').trim();
    if (!id) {
      continue;
    }

    const detectedType = detectEntryType(row, csv.indexMap);
    const key = extractWorldKey(row, csv.indexMap);
    const serial = serialMap.get(key) || serialMap.get(`id:${id}`) || '';

    if (detectedType === 'world' || serial) {
      setCell(row, csv.indexMap, 'EntryType', 'world');
      setCell(row, csv.indexMap, 'DisplaySerial', serial);
      worldCount += 1;
    } else {
      setCell(row, csv.indexMap, 'EntryType', 'avatar');
      setCell(row, csv.indexMap, 'DisplaySerial', '');
    }

    const sourceUrl = getCell(row, csv.indexMap, 'SourceURL').trim();
    const avatarUrl = getCell(row, csv.indexMap, 'AvatarURL').trim();
    if (!sourceUrl && avatarUrl) {
      setCell(row, csv.indexMap, 'SourceURL', avatarUrl);
    }
  }

  return worldCount;
}

function writeCsvFile(csv) {
  const content = stringifyCsv([csv.header, ...csv.rows]);
  fs.writeFileSync(csv.filePath, content, 'utf8');
}

function main() {
  const jaCsv = readCsvFile(FILES.ja);
  const enCsv = readCsvFile(FILES.en);
  const koCsv = readCsvFile(FILES.ko);

  const { serialMap, count } = assignWorldDisplaySerialsFromJa(jaCsv);
  const enWorldCount = applyWorldSerials(enCsv, serialMap);
  const koWorldCount = applyWorldSerials(koCsv, serialMap);

  writeCsvFile(jaCsv);
  writeCsvFile(enCsv);
  writeCsvFile(koCsv);

  console.log(`✅ Assigned displaySerial to ${count} world entries from JA source.`);
  console.log(`✅ Synced world displaySerial to EN (${enWorldCount} rows).`);
  console.log(`✅ Synced world displaySerial to KO (${koWorldCount} rows).`);
  console.log('ℹ️ Internal `id` values were preserved. Public world numbering now uses `DisplaySerial`.');
}

main();
