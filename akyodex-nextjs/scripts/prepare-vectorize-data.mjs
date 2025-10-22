#!/usr/bin/env node
/**
 * Prepare CSV data for Cloudflare Vectorize
 * 
 * This script:
 * 1. Reads Japanese and English CSV files
 * 2. Creates bilingual chunks (one per Akyo record)
 * 3. Outputs JSON format ready for Vectorize upload
 * 
 * Output format:
 * [
 *   {
 *     "id": "akyo-0001",
 *     "text": "ID: 0001\n名前(JP): ...\nName(EN): ...\n...",
 *     "metadata": { id, nameJa, nameEn, type, ... }
 *   },
 *   ...
 * ]
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const csvJaPath = join(projectRoot, 'data/akyo-data.csv');
const csvEnPath = join(projectRoot, 'data/akyo-data-US.csv');
const outputPath = join(projectRoot, 'data/vectorize-data.json');

console.log('📂 Reading CSV files...');

// Read CSV files
const csvJa = readFileSync(csvJaPath, 'utf-8');
const csvEn = readFileSync(csvEnPath, 'utf-8');

// Parse CSV (skip header row)
const recordsJa = parse(csvJa, { 
  columns: true, 
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
});

const recordsEn = parse(csvEn, { 
  columns: true, 
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
});

console.log(`✅ Found ${recordsJa.length} Japanese records`);
console.log(`✅ Found ${recordsEn.length} English records`);

if (recordsJa.length !== recordsEn.length) {
  console.warn('⚠️ Warning: Japanese and English record counts differ');
}

// Process records into bilingual chunks
console.log('\n🔄 Processing records into bilingual chunks...');

const vectorData = recordsJa.map((ja, idx) => {
  const en = recordsEn[idx] || {};
  
  // Pad ID to 4 digits
  const id = String(ja.id || '0000').padStart(4, '0');
  
  // Extract fields (CSV columns may vary, use safe access)
  const nameJa = ja.name || ja['名前'] || '';
  const nameEn = en.name || en['Name'] || '';
  const typeJa = ja.type || ja['タイプ'] || '';
  const typeEn = en.type || en['Type'] || '';
  const rarityJa = ja.rarity || ja['レアリティ'] || '';
  const rarityEn = en.rarity || en['Rarity'] || '';
  const sizeJa = ja.size || ja['サイズ'] || '';
  const sizeEn = en.size || en['Size'] || '';
  const motifJa = ja.motif || ja['モチーフ'] || '';
  const motifEn = en.motif || en['Motif'] || '';
  const descJa = ja.description || ja['説明'] || '';
  const descEn = en.description || en['Description'] || '';
  const vrchatAvatar = ja.vrchat_avatar_name || ja['VRChatアバター名'] || '';
  const creator = ja.creator_name || ja['作者名'] || '';
  
  // Build bilingual text chunk
  // Format: One structured text per Akyo for optimal semantic search
  const text = `
ID: ${id}
名前(JP): ${nameJa}
Name(EN): ${nameEn}
タイプ: ${typeJa} / Type: ${typeEn}
レアリティ: ${rarityJa} / Rarity: ${rarityEn}
サイズ: ${sizeJa} / Size: ${sizeEn}
モチーフ: ${motifJa} / Motif: ${motifEn}
説明(JP): ${descJa}
Description(EN): ${descEn}
VRChatアバター: ${vrchatAvatar || 'なし / None'}
クリエイター: ${creator || 'なし / None'}
  `.trim();

  return {
    id: `akyo-${id}`,
    text,
    metadata: {
      id,
      nameJa,
      nameEn,
      typeJa,
      typeEn,
      rarityJa,
      rarityEn,
      sizeJa,
      sizeEn,
      motifJa,
      motifEn,
      vrchatAvatar,
      creator,
      imageUrl: `/images/${id}.webp`,
    },
  };
});

console.log(`✅ Processed ${vectorData.length} chunks`);

// Calculate statistics
const totalChars = vectorData.reduce((sum, item) => sum + item.text.length, 0);
const avgChars = Math.round(totalChars / vectorData.length);
const maxChars = Math.max(...vectorData.map(item => item.text.length));
const minChars = Math.min(...vectorData.map(item => item.text.length));

console.log('\n📊 Statistics:');
console.log(`  Total chunks: ${vectorData.length}`);
console.log(`  Average chars per chunk: ${avgChars}`);
console.log(`  Max chars: ${maxChars}`);
console.log(`  Min chars: ${minChars}`);
console.log(`  Total characters: ${totalChars.toLocaleString()}`);

// Estimate tokens (rough: 1 token ≈ 4 chars for Japanese/English mix)
const estimatedTokens = Math.round(totalChars / 4);
console.log(`  Estimated tokens: ${estimatedTokens.toLocaleString()}`);

// Write output
console.log(`\n💾 Writing to ${outputPath}...`);
writeFileSync(outputPath, JSON.stringify(vectorData, null, 2), 'utf-8');

console.log('✅ Done!');
console.log(`\n📄 Output: ${outputPath}`);
console.log('\n🚀 Next steps:');
console.log('  1. Create Vectorize index:');
console.log('     wrangler vectorize create akyo-index --dimensions=1024 --metric=cosine');
console.log('  2. Upload data to Vectorize:');
console.log('     node scripts/upload-to-vectorize.mjs');
