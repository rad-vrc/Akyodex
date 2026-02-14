#!/usr/bin/env node

/**
 * Sync `data/akyo-data-en.csv` to match `data/akyo-data-ja.csv` (ID set + Category),
 * translating categories token-by-token via `scripts/category-ja-en-map.js`.
 *
 * - Japanese CSV is treated as source of truth for:
 *   - row existence / order
 *   - AvatarName, Author, AvatarURL
 *   - Category (translated)
 * - English CSV is treated as source of truth for:
 *   - Nickname, Comment (when present)
 *
 * For newly added Japanese rows (missing in English CSV), Nickname/Comment are filled
 * by the overrides below (and otherwise fall back to Japanese values with a warning).
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const categoryMap = require('./category-ja-en-map');

const rootDir = path.resolve(__dirname, '..');
const jaPath = path.join(rootDir, 'data', 'akyo-data-ja.csv');
const enPath = path.join(rootDir, 'data', 'akyo-data-en.csv');

const overridesById = {
  '0640': { Nickname: 'Bean Kappa Akyo', Comment: 'Cucumber, please.' },
  '0641': { Nickname: 'Bean Akyo', Comment: '' },
  '0642': { Nickname: 'Epli Akyo', Comment: '' },
  '0643': { Nickname: 'Kappa Maki Akyo', Comment: 'It seems to be made with fresh cucumbers.' },
  '0644': { Nickname: 'Kiwi Akyo 2', Comment: '' },
  '0645': { Nickname: 'One-piece Fox Akyo 2025', Comment: '' },
  '0646': { Nickname: 'Spotting Look Akyo', Comment: '' },
  '0647': { Nickname: 'Western Fox Akyo', Comment: '' },
  '0648': { Nickname: 'Pine Cone Akyo', Comment: '' },
  '0649': { Nickname: 'Salmon Akyo', Comment: '' },
  '0650': { Nickname: 'U Akyo', Comment: '' },
  '0651': { Nickname: 'Stingray Akyo', Comment: '' },
  '0652': { Nickname: 'Peach Akyo', Comment: '' },
  '0653': { Nickname: 'Hash Akyo', Comment: '' },
  '0654': { Nickname: 'Anti Floating-Point Akyo', Comment: '' },
  '0655': { Nickname: 'Clione Akyo', Comment: '' },
  '0656': { Nickname: 'Soga Plateau Akyo', Comment: '' },
  '0657': { Nickname: 'Crocodile Akyo', Comment: '' },
  '0658': { Nickname: 'Rune Akyo', Comment: '' },
  '0659': { Nickname: 'Halloween Fox Akyo 2025', Comment: '' },
  '0660': { Nickname: 'Masked Wolf Akyo', Comment: '' },
  '0661': { Nickname: 'Fly Agaric Akyo', Comment: '' },
  '0662': { Nickname: 'Halloween Maid Fox Akyo', Comment: '' },
  '0663': { Nickname: 'Doctor Dragon Akyo', Comment: '' },
  '0664': { Nickname: 'Halloween Carrot Akyo', Comment: '' },
  '0665': { Nickname: 'Onion Akyo', Comment: '' },
  '0666': { Nickname: 'Look Akyo?', Comment: '' },
  '0667': { Nickname: 'Lunch Charm Akyo', Comment: '' },
  '0668': { Nickname: 'Cold Akyo', Comment: '' },
  '0669': { Nickname: 'Human-faced Akyo', Comment: '' },
  '0670': { Nickname: 'Ear Akyo', Comment: '' },
  '0671': { Nickname: 'Multi-Eared Akyo', Comment: '' },
  '0672': { Nickname: 'Face Akyo', Comment: '' },
  '0673': { Nickname: 'Agyo', Comment: '' },
  '0674': {
    Nickname: 'Sea Turtle Akyo',
    Comment:
      'It lives in warm seas and is often seen swimming around coral reefs. It also seems to come ashore and take walks along sandy beaches.',
  },
  '0675': {
    Nickname: 'Akyo S',
    Comment: 'A mysterious Akyo discovered beyond the sea. Its ecology is shrouded in mystery.',
  },
  '0676': {
    Nickname: 'Akyo J',
    Comment: 'A mysterious Akyo discovered beyond the sea. Its ecology is shrouded in mystery.',
  },
  '0677': {
    Nickname: 'Rainbow Akyo',
    Comment:
      'On a rainy day, it was captured on video by a TV crew, bringing its existence into the public eye.',
  },
  '0678': { Nickname: 'Rain Akyo', Comment: "There's a rumor it appears on rainy days. The credibility is quite low." },
  '0679': { Nickname: 'Uro Akyo', Comment: 'Seeking information.' },
  '0699': {
    Nickname: 'Year of the Horse Akyo / New Year Horse Akyo',
    Comment: 'A horse Akyo dressed in New Year attire. It seems very excited.',
  },
  '0700': {
    Nickname: 'Duck-and-Green-Onion Akyo',
    Comment: 'A duck Akyo carrying a green onion Akyo. Where did they meet?',
  },
  '0701': { Nickname: 'Diamond Akyo', Comment: '' },
  '0702': { Nickname: 'Fox Bean Akyo', Comment: '' },
  '0703': { Nickname: 'Cheese Akyo', Comment: '' },
  '0704': {
    Nickname: 'RGB Dance Akyo',
    Comment: 'It seems to be an Akyo that has mastered dance.',
  },
  '0705': {
    Nickname: 'Cosmic Akyo',
    Comment: 'It seems to have undergone unique evolution for outer-space exploration.',
  },
};

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // These CSVs are frequently hand-edited in spreadsheets/editors; we use relaxed parsing to avoid
  // cryptic parser failures from minor formatting issues, then validate the column count ourselves
  // to fail fast with a high-signal error message.
  const records = parse(content, {
    columns: false,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false,
    record_delimiter: ['\r\n', '\n', '\r'],
  });

  if (!records.length) throw new Error(`Empty CSV: ${filePath}`);

  const header = records[0];
  const expectedColumns = header.length;

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (record.length !== expectedColumns) {
      throw new Error(
        `CSV column count mismatch in ${filePath} at record index ${i} (expected ${expectedColumns}, got ${record.length}). Record: ${JSON.stringify(
          record,
        )}`,
      );
    }
  }

  return { header, rows: records.slice(1) };
}

function assertCsvRowLengthsMatchHeader({ header, rows }, filePath) {
  const expectedColumns = header.length;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length !== expectedColumns) {
      throw new Error(
        `CSV row has unexpected column count in ${filePath} at data row #${i + 1} (expected ${expectedColumns}, got ${
          row.length
        }). Row: ${JSON.stringify(row)}`,
      );
    }
  }
}

function indexOfHeader(header, name) {
  const idx = header.findIndex((h) => String(h).trim() === name);
  if (idx === -1) throw new Error(`Could not find column "${name}" in header: ${header.join(',')}`);
  return idx;
}

function splitTokens(value) {
  return String(value || '')
    .replace(/、/g, ',')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function main() {
  if (!fs.existsSync(jaPath)) throw new Error(`Missing source CSV: ${jaPath}`);
  if (!fs.existsSync(enPath)) throw new Error(`Missing target CSV: ${enPath}`);

  const ja = parseCsv(jaPath);
  const en = parseCsv(enPath);

  // Fail fast if the CSV shapes are inconsistent.
  assertCsvRowLengthsMatchHeader(ja, jaPath);
  assertCsvRowLengthsMatchHeader(en, enPath);

  const outHeader = en.header;
  const idx = {
    ID: indexOfHeader(outHeader, 'ID'),
    Nickname: indexOfHeader(outHeader, 'Nickname'),
    AvatarName: indexOfHeader(outHeader, 'AvatarName'),
    Category: indexOfHeader(outHeader, 'Category'),
    Comment: indexOfHeader(outHeader, 'Comment'),
    Author: indexOfHeader(outHeader, 'Author'),
    AvatarURL: indexOfHeader(outHeader, 'AvatarURL'),
  };

  const jaIdx = {
    ID: indexOfHeader(ja.header, 'ID'),
    Nickname: indexOfHeader(ja.header, 'Nickname'),
    AvatarName: indexOfHeader(ja.header, 'AvatarName'),
    Category: indexOfHeader(ja.header, 'Category'),
    Comment: indexOfHeader(ja.header, 'Comment'),
    Author: indexOfHeader(ja.header, 'Author'),
    AvatarURL: indexOfHeader(ja.header, 'AvatarURL'),
  };

  const enById = new Map();
  for (const row of en.rows) enById.set(String(row[idx.ID]).trim(), row);

  const missingCategoryTokens = new Set();
  const missingRowTranslations = [];

  const outRows = [outHeader];

  for (const jaRow of ja.rows) {
    const id = String(jaRow[jaIdx.ID]).trim();
    const existingEnRow = enById.get(id);

    const jaTokens = splitTokens(jaRow[jaIdx.Category]);
    const enTokens = jaTokens.map((t) => {
      const mapped = categoryMap[t];
      if (!mapped) missingCategoryTokens.add(t);
      return mapped || t;
    });
    const category = enTokens.join(',');

    let nickname = existingEnRow ? String(existingEnRow[idx.Nickname] || '').trim() : '';
    let comment = existingEnRow ? String(existingEnRow[idx.Comment] || '') : '';

    if (overridesById[id]?.Nickname != null) {
      nickname = overridesById[id].Nickname;
    } else if (!nickname) {
      nickname = overridesById[id]?.Nickname ?? String(jaRow[jaIdx.Nickname] || '');
    }
    if (overridesById[id]?.Comment != null) {
      comment = overridesById[id].Comment;
    } else if (!comment) {
      comment = overridesById[id]?.Comment ?? String(jaRow[jaIdx.Comment] || '');
    }

    if (!existingEnRow && !overridesById[id]) missingRowTranslations.push(id);

    const outRow = Array(outHeader.length).fill('');
    outRow[idx.ID] = id;
    outRow[idx.Nickname] = nickname;
    outRow[idx.AvatarName] = String(jaRow[jaIdx.AvatarName] || '');
    outRow[idx.Category] = category;
    outRow[idx.Comment] = comment;
    outRow[idx.Author] = String(jaRow[jaIdx.Author] || '');
    outRow[idx.AvatarURL] = String(jaRow[jaIdx.AvatarURL] || '');
    outRows.push(outRow);
  }

  if (missingCategoryTokens.size > 0) {
    const tokens = Array.from(missingCategoryTokens).sort();
    throw new Error(
      `Missing category translations (${tokens.length}). Add them to scripts/category-ja-en-map.js:\\n` +
        tokens.map((t) => `- ${t}`).join('\\n'),
    );
  }

  if (missingRowTranslations.length > 0) {
    console.warn(
      `⚠️ Missing Nickname/Comment overrides for new IDs (kept JA values): ${missingRowTranslations.join(', ')}`,
    );
  }

  const outCsv = stringify(outRows, {
    quoted: true,
    record_delimiter: '\r\n',
  });
  fs.writeFileSync(enPath, outCsv, 'utf8');

  console.log(`✅ Synced English CSV: ${path.relative(rootDir, enPath)}`);
  console.log(`   Rows: ${ja.rows.length} (matched Japanese CSV)`);
}

if (require.main === module) main();
