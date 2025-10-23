#!/usr/bin/env node

/**
 * CSV ID Migration Script: 3-digit → 4-digit
 * 
 * Safely converts Akyo CSV files from 3-digit IDs (001-999) to 4-digit IDs (0001-9999)
 * 
 * Usage:
 *   node scripts/migrate-csv-to-4digit.mjs
 * 
 * Files processed:
 *   - data/akyo-data.csv (Japanese)
 *   - data/akyo-data-US.csv (English)
 * 
 * Safety features:
 *   - Creates backups with timestamp
 *   - Validates CSV structure before/after
 *   - Atomic writes (temp file → rename)
 *   - Rollback instructions if needed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// CSV files to migrate
const FILES_TO_MIGRATE = [
  'data/akyo-data.csv',
  'data/akyo-data-US.csv',
];

/**
 * Create backup of file with timestamp
 */
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Convert 3-digit ID to 4-digit (001 → 0001)
 */
function convertIdTo4Digit(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId < 1 || numId > 9999) {
    throw new Error(`Invalid ID: ${id}`);
  }
  return numId.toString().padStart(4, '0');
}

/**
 * Validate CSV structure (basic checks)
 */
function validateCsvStructure(lines) {
  if (lines.length < 2) {
    throw new Error('CSV must have at least header + 1 data row');
  }

  const header = lines[0];
  if (!header.includes('ID') || !header.includes('アバター名')) {
    throw new Error('CSV header missing required columns');
  }

  return true;
}

/**
 * Migrate single CSV file
 */
function migrateCsvFile(filePath) {
  const absolutePath = path.resolve(rootDir, filePath);
  
  console.log(`\n📄 Processing: ${filePath}`);
  
  if (!fs.existsSync(absolutePath)) {
    console.log(`⚠️  File not found, skipping: ${filePath}`);
    return { skipped: true };
  }

  // Read file
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n');

  // Validate before migration
  validateCsvStructure(lines);
  
  // Create backup
  const backupPath = createBackup(absolutePath);

  // Convert IDs
  let convertedCount = 0;
  const newLines = lines.map((line, index) => {
    if (index === 0) {
      // Header line - keep as is
      return line;
    }

    if (!line.trim()) {
      // Empty line - keep as is
      return line;
    }

    // Data line - convert ID (first field)
    const match = line.match(/^(\d{3})(,.*)/);
    if (match) {
      const oldId = match[1];
      const rest = match[2];
      const newId = convertIdTo4Digit(oldId);
      convertedCount++;
      return `${newId}${rest}`;
    }

    // Line doesn't start with 3-digit ID - keep as is (might be comment or malformed)
    return line;
  });

  // Validate after migration
  const newContent = newLines.join('\n');
  const newLinesForValidation = newContent.split('\n');
  validateCsvStructure(newLinesForValidation);

  // Count 4-digit IDs to verify
  const fourDigitCount = newContent.match(/^\d{4},/gm)?.length || 0;
  
  // Atomic write (temp file → rename)
  const tempPath = `${absolutePath}.tmp`;
  fs.writeFileSync(tempPath, newContent, 'utf-8');
  fs.renameSync(tempPath, absolutePath);

  console.log(`✅ Migrated ${convertedCount} IDs (verified: ${fourDigitCount} rows with 4-digit IDs)`);
  
  return {
    success: true,
    backupPath,
    convertedCount,
    fourDigitCount,
  };
}

/**
 * Main migration process
 */
function main() {
  console.log('🚀 CSV ID Migration: 3-digit → 4-digit');
  console.log('=====================================\n');

  const results = [];

  for (const filePath of FILES_TO_MIGRATE) {
    try {
      const result = migrateCsvFile(filePath);
      results.push({ filePath, ...result });
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      results.push({ filePath, error: error.message });
    }
  }

  // Summary
  console.log('\n📊 Migration Summary');
  console.log('====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => r.error);
  const skipped = results.filter(r => r.skipped);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⚠️  Skipped: ${skipped.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\nBackup files created:');
    successful.forEach(r => console.log(`  - ${r.backupPath}`));
    
    console.log('\n📝 Next steps:');
    console.log('1. Verify the migrated CSV files');
    console.log('2. Test the application with 4-digit IDs');
    console.log('3. If everything works, commit the changes');
    console.log('4. If rollback needed: cp <backup-file> <original-file>');
  }

  if (failed.length > 0) {
    console.log('\n⚠️  Some files failed to migrate:');
    failed.forEach(r => console.log(`  - ${r.filePath}: ${r.error}`));
    process.exit(1);
  }
}

// Run migration
main();
