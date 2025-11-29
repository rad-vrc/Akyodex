/**
 * CSV to JSON Converter for Akyo Data
 * 
 * This script converts Akyo CSV files to JSON format for faster data loading.
 * Run with: npx tsx scripts/csv-to-json.ts
 * 
 * Phase 4 Implementation: R2 JSON Data Cache
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface AkyoData {
  id: string;
  nickname: string;
  avatarName: string;
  category: string;
  comment: string;
  author: string;
  avatarUrl: string;
}

interface AkyoJsonOutput {
  version: string;
  language: string;
  updatedAt: string;
  count: number;
  data: AkyoData[];
}

/**
 * Parse CSV content into AkyoData array
 */
function parseCsvToAkyoData(csvText: string): AkyoData[] {
  const records: string[][] = parse(csvText, {
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false,
    record_delimiter: ['\r\n', '\n', '\r'],
    columns: false,
    quote: '"',
    escape: '"',
  });

  if (records.length < 2) {
    return [];
  }

  const [header, ...dataRecords] = records;
  const data: AkyoData[] = [];

  for (const record of dataRecords) {
    if (record.length !== header.length) {
      continue;
    }

    const rawRow: Record<string, string> = {};
    header.forEach((headerName, index) => {
      const safeHeader = headerName.trim().replace(/^\ufeff/, '');
      rawRow[safeHeader] = record[index] || '';
    });

    data.push({
      id: rawRow['ID'] ?? '',
      nickname: rawRow['Nickname'] ?? '',
      avatarName: rawRow['AvatarName'] ?? '',
      category: rawRow['Category'] ?? '',
      comment: rawRow['Comment'] ?? '',
      author: rawRow['Author'] ?? '',
      avatarUrl: rawRow['AvatarURL'] ?? '',
    });
  }

  return data;
}

async function convertCsvToJson() {
  const dataDir = path.join(process.cwd(), 'data');

  console.log('🔄 Starting CSV to JSON conversion...\n');

  // Convert Japanese CSV
  console.log('📝 Processing Japanese CSV (akyo-data-ja.csv)...');
  const csvJaPath = path.join(dataDir, 'akyo-data-ja.csv');
  const csvJa = await fs.readFile(csvJaPath, 'utf-8');
  const dataJa = parseCsvToAkyoData(csvJa);

  const jsonJa: AkyoJsonOutput = {
    version: '1.0',
    language: 'ja',
    updatedAt: new Date().toISOString(),
    count: dataJa.length,
    data: dataJa,
  };

  const jsonJaPath = path.join(dataDir, 'akyo-data-ja.json');
  await fs.writeFile(jsonJaPath, JSON.stringify(jsonJa.data, null, 2), 'utf-8');
  console.log(`   ✅ Japanese: ${dataJa.length} avatars → ${jsonJaPath}`);

  // Convert English CSV
  console.log('📝 Processing English CSV (akyo-data-en.csv)...');
  const csvEnPath = path.join(dataDir, 'akyo-data-en.csv');
  const csvEn = await fs.readFile(csvEnPath, 'utf-8');
  const dataEn = parseCsvToAkyoData(csvEn);

  const jsonEn: AkyoJsonOutput = {
    version: '1.0',
    language: 'en',
    updatedAt: new Date().toISOString(),
    count: dataEn.length,
    data: dataEn,
  };

  const jsonEnPath = path.join(dataDir, 'akyo-data-en.json');
  await fs.writeFile(jsonEnPath, JSON.stringify(jsonEn.data, null, 2), 'utf-8');
  console.log(`   ✅ English: ${dataEn.length} avatars → ${jsonEnPath}`);

  // Summary
  console.log('\n✨ Conversion complete!');
  console.log('\nGenerated files:');
  console.log(`   - ${jsonJaPath}`);
  console.log(`   - ${jsonEnPath}`);
  console.log('\nTo use JSON data, set environment variable:');
  console.log('   NEXT_PUBLIC_USE_JSON_DATA=true');
}

// Run if executed directly
convertCsvToJson()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
