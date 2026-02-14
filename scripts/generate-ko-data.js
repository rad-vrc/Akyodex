#!/usr/bin/env node
/**
 * Generate Korean (ko) translation data from Japanese (ja) source
 *
 * Translates: nickname, category, comment
 * Keeps as-is: id, avatarName, author, avatarUrl
 *
 * Usage: node scripts/generate-ko-data.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { NICKNAME_MAP } = require('./nickname-map-ko');
const { CATEGORY_MAP } = require('./category-definitions-ko');

// ============================================================
// Category translation map: Japanese → Korean
// ============================================================

/**
 * Translate a single category string (comma-separated list)
 */
function translateCategory(jaCategory) {
  if (!jaCategory) return '';

  return jaCategory
    .split(/\s*,\s*/)
    .map((cat) => {
      const trimmed = cat.trim();
      if (CATEGORY_MAP[trimmed]) {
        return CATEGORY_MAP[trimmed];
      }
      // If no mapping found, keep original
      console.warn(`[WARN] No Korean translation for category: "${trimmed}"`);
      return trimmed;
    })
    .join(', ');
}

/**
 * Translate nickname from Japanese to Korean
 * Uses NICKNAME_MAP for exact matches, keeps original as fallback
 */
function translateNickname(jaNickname) {
  if (!jaNickname) return jaNickname;

  // Exact match from map
  if (NICKNAME_MAP[jaNickname]) {
    return NICKNAME_MAP[jaNickname];
  }

  // If no mapping found, keep original
  console.warn(`[WARN] No Korean translation for nickname: "${jaNickname}"`);
  return jaNickname;
}

/**
 * Translate comment from Japanese to Korean
 * Common patterns translation
 */
const COMMENT_MAP = {
  すべてのはじまり: '모든 것의 시작',
  Quest対応〇: 'Quest 지원〇',
  'Quest対応○': 'Quest 지원○',
  'Quest対応✕': 'Quest 지원✕',
  'Quest対応×': 'Quest 지원×',
  Quest対応: 'Quest 지원',
  'お正月衣装に着替えたうまakyo。うきうきしているらしい。':
    '설날 복장으로 갈아입은 말 Akyo. 들떠 있는 듯하다.',
  'ねぎakyoを背負った、かもakyo。どこで出会ったのだろう？':
    '파 Akyo를 업은 오리 Akyo. 어디서 만난 걸까?',
  '舞踊を極めしAkyoらしい。': '춤의 경지에 이른 Akyo라고 한다.',
  '外宇宙探査のために独自の進化を遂げたらしい。':
    '외우주 탐사를 위해 독자적인 진화를 이룬 듯하다.',
};

function translateComment(jaComment) {
  if (!jaComment) return '';

  // Check exact match first
  if (COMMENT_MAP[jaComment]) {
    return COMMENT_MAP[jaComment];
  }

  console.warn(`[WARN] untranslated comment, falling back to original: "${jaComment}"`);
  return jaComment;
}

/**
 * Fail fast on malformed CSV rows after parsing.
 */
function validateParsedRows(records, csvPath) {
  const [header, ...dataRows] = records;
  const expectedColumnCount = header.length;

  dataRows.forEach((row, index) => {
    const lineNumber = index + 2; // Header is line 1
    if (row.length !== expectedColumnCount) {
      throw new Error(
        `Malformed CSV row at line ${lineNumber} in ${csvPath}: expected ${expectedColumnCount} columns, got ${row.length}`
      );
    }
  });
}

// ============================================================
// Main: Generate Korean data files
// ============================================================
function main() {
  const dataDir = path.join(__dirname, '..', 'data');

  // === Read Japanese CSV ===
  console.log('📖 Reading Japanese CSV...');
  const csvJaPath = path.join(dataDir, 'akyo-data-ja.csv');
  const csvJa = fs.readFileSync(csvJaPath, 'utf-8');

  // Strict parsing is required so malformed CSVs fail immediately.
  const records = parse(csvJa, {
    skip_empty_lines: true,
    trim: false,
    record_delimiter: ['\r\n', '\n', '\r'],
    columns: false,
    quote: '"',
    escape: '"',
  });

  if (records.length < 2) {
    console.error('❌ No data rows found in CSV');
    process.exit(1);
  }

  const [header, ...dataRows] = records;
  validateParsedRows(records, csvJaPath);
  console.log(`   Found ${dataRows.length} rows`);

  // Header: ID, Nickname, AvatarName, Category, Comment, Author, AvatarURL
  const headerMap = {};
  header.forEach((h, i) => {
    headerMap[h.trim().replace(/^\ufeff/, '')] = i;
  });

  // Validate required headers exist
  const REQUIRED_HEADERS = [
    'ID',
    'Nickname',
    'AvatarName',
    'Category',
    'Comment',
    'Author',
    'AvatarURL',
  ];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !(h in headerMap));
  if (missingHeaders.length > 0) {
    console.error(`\u274C Missing required CSV headers: ${missingHeaders.join(', ')}`);
    console.error(`   Found headers: ${Object.keys(headerMap).join(', ')}`);
    process.exit(1);
  }

  // === Translate rows ===
  console.log('🔄 Translating to Korean...');
  const koRows = dataRows.map((row) => {
    const id = row[headerMap['ID']] || '';
    const nickname = row[headerMap['Nickname']] || '';
    const avatarName = row[headerMap['AvatarName']] || '';
    const category = row[headerMap['Category']] || '';
    const comment = row[headerMap['Comment']] || '';
    const author = row[headerMap['Author']] || '';
    const avatarUrl = row[headerMap['AvatarURL']] || '';

    return [
      id,
      translateNickname(nickname),
      avatarName, // Keep as-is
      translateCategory(category),
      translateComment(comment),
      author, // Keep as-is
      avatarUrl, // Keep as-is
    ];
  });

  // === Write Korean CSV ===
  console.log('📝 Writing Korean CSV...');
  const csvKoPath = path.join(dataDir, 'akyo-data-ko.csv');
  const csvOutput = stringify([header, ...koRows], {
    quoted: true,
    record_delimiter: '\n',
  });
  fs.writeFileSync(csvKoPath, csvOutput, 'utf-8');
  console.log(`   ✅ ${csvKoPath}`);

  // === Write Korean JSON ===
  console.log('📝 Writing Korean JSON...');
  const jsonKoPath = path.join(dataDir, 'akyo-data-ko.json');
  const jsonData = koRows.map((row) => ({
    id: row[0],
    nickname: row[1],
    avatarName: row[2],
    category: row[3],
    comment: row[4],
    author: row[5],
    avatarUrl: row[6],
  }));
  fs.writeFileSync(jsonKoPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`   ✅ ${jsonKoPath}`);

  // === Summary ===
  console.log(`\n✨ Korean data generated: ${koRows.length} avatars`);
  console.log('   Files:');
  console.log(`   - ${csvKoPath}`);
  console.log(`   - ${jsonKoPath}`);
}

main();
