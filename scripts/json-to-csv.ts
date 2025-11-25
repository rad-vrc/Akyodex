/**
 * JSON to CSV Converter for Akyo Data
 * 
 * This script converts Akyo JSON files back to CSV format.
 * Run with: npx tsx scripts/json-to-csv.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

interface AkyoData {
  id: string;
  nickname: string;
  avatarName: string;
  category: string;
  comment: string;
  author: string;
  avatarUrl: string;
}

/**
 * Convert AkyoData array to CSV content
 */
function convertAkyoDataToCsv(data: AkyoData[]): string {
  const headers = ['ID', 'Nickname', 'AvatarName', 'Category', 'Comment', 'Author', 'AvatarURL'];
  
  const records = data.map(item => [
    item.id,
    item.nickname,
    item.avatarName,
    item.category,
    item.comment,
    item.author,
    item.avatarUrl,
  ]);

  return stringify([headers, ...records], {
    quoted: true,
    quoted_empty: false,
    quoted_string: true,
  });
}

async function convertJsonToCsv() {
  const dataDir = path.join(process.cwd(), 'data');

  console.log('🔄 Starting JSON to CSV conversion...\n');

  // Convert Japanese JSON
  console.log('📝 Processing Japanese JSON (akyo-data-ja.json)...');
  const jsonJaPath = path.join(dataDir, 'akyo-data-ja.json');
  const jsonJaContent = await fs.readFile(jsonJaPath, 'utf-8');
  const dataJa: AkyoData[] = JSON.parse(jsonJaContent);

  const csvJa = convertAkyoDataToCsv(dataJa);
  const csvJaPath = path.join(dataDir, 'akyo-data.csv');
  await fs.writeFile(csvJaPath, csvJa, 'utf-8');
  console.log(`   ✅ Japanese: ${dataJa.length} avatars → ${csvJaPath}`);

  // Convert English JSON
  console.log('📝 Processing English JSON (akyo-data-en.json)...');
  const jsonEnPath = path.join(dataDir, 'akyo-data-en.json');
  const jsonEnContent = await fs.readFile(jsonEnPath, 'utf-8');
  const dataEn: AkyoData[] = JSON.parse(jsonEnContent);

  const csvEn = convertAkyoDataToCsv(dataEn);
  const csvEnPath = path.join(dataDir, 'akyo-data-US.csv');
  await fs.writeFile(csvEnPath, csvEn, 'utf-8');
  console.log(`   ✅ English: ${dataEn.length} avatars → ${csvEnPath}`);

  // Summary
  console.log('\n✨ Conversion complete!');
  console.log('\nGenerated files:');
  console.log(`   - ${csvJaPath}`);
  console.log(`   - ${csvEnPath}`);
}

// Run if executed directly
convertJsonToCsv()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
