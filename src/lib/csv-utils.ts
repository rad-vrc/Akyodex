/**
 * CSV Utilities
 *
 * Proper CSV parsing and stringifying using csv-parse and csv-stringify libraries.
 * Handles quoted fields, commas, newlines, and special characters correctly.
 * Also includes AkyoData type conversion utilities.
 */

import type { AkyoData } from '@/types/akyo';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { hydrateAkyoDataset } from './akyo-entry';
import type { GitHubCommitResponse, GitHubConfig } from './github-utils';
import { commitCSVToGitHub, fetchCSVFromGitHub } from './github-utils';

const BASE_AKYO_CSV_COLUMNS = ['ID', 'Nickname', 'AvatarName', 'Category', 'Comment', 'Author', 'AvatarURL'];
const SOURCE_URL_COLUMN = 'SourceURL';
const ENTRY_TYPE_COLUMN = 'EntryType';
const DISPLAY_SERIAL_COLUMN = 'DisplaySerial';
const AKYO_EXTENDED_COLUMNS = [SOURCE_URL_COLUMN, ENTRY_TYPE_COLUMN, DISPLAY_SERIAL_COLUMN];
const WORLD_ENTRY_TYPE = 'world';
const WORLD_CATEGORY_MARKERS = new Set(['ワールド', 'world', '월드']);

/**
 * Parse CSV content into records
 *
 * @param content - CSV file content as string
 * @returns Array of records (each record is an array of fields)
 */
function parseCSV(content: string): string[][] {
  try {
    const records: string[][] = parse(content, {
      relax_quotes: true,
      relax_column_count: true, // Allow variable column counts (will be validated later)
      skip_empty_lines: true,
      trim: false, // Preserve original whitespace
      record_delimiter: ['\r\n', '\n', '\r'], // Handle mixed line endings (Windows/Unix/Mac)
      columns: false, // Don't use first row as column names
      quote: '"', // Standard CSV quote character
      escape: '"', // Standard CSV escape character
    });
    return records;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse CSV file');
  }
}

function normalizeAkyoCsvShape(header: string[], dataRecords: string[][]): {
  header: string[];
  dataRecords: string[][];
} {
  const normalizedHeader = [...header];

  for (const column of AKYO_EXTENDED_COLUMNS) {
    if (!normalizedHeader.includes(column)) {
      normalizedHeader.push(column);
    }
  }

  const normalizedRows = dataRecords.map((row) =>
    normalizedHeader.map((_, index) => row[index] || '')
  );

  return {
    header: normalizedHeader,
    dataRecords: normalizedRows,
  };
}

function isWorldRecord(record: string[], header: string[]): boolean {
  const entryTypeIndex = header.indexOf(ENTRY_TYPE_COLUMN);
  const categoryIndex = header.indexOf('Category');

  const explicitEntryType = entryTypeIndex >= 0 ? String(record[entryTypeIndex] || '').trim() : '';
  if (explicitEntryType === 'world') {
    return true;
  }
  if (explicitEntryType === 'avatar') {
    return false;
  }

  const rawCategory = categoryIndex >= 0 ? String(record[categoryIndex] || '') : '';
  if (!rawCategory) {
    return false;
  }

  return rawCategory
    .split(/[、,]/)
    .map((token) => token.trim().toLowerCase())
    .some((token) => WORLD_CATEGORY_MARKERS.has(token));
}

export async function loadAkyoCsv(options: {
  csvFileName?: string;
  githubConfig?: GitHubConfig;
} = {}) {
  const { csvFileName, githubConfig } = options;
  const csvFile = await fetchCSVFromGitHub(csvFileName, { config: githubConfig });
  const records = parseCSV(csvFile.content);

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const [header, ...dataRecords] = records;
  const normalized = normalizeAkyoCsvShape(header, dataRecords);
  return {
    header: normalized.header,
    dataRecords: normalized.dataRecords,
    fileSha: csvFile.sha,
  };
}

export async function commitAkyoCsv({
  header,
  dataRecords,
  fileSha,
  commitMessage,
  csvFileName,
  githubConfig,
}: {
  header: string[];
  dataRecords: string[][];
  fileSha: string;
  commitMessage: string;
  csvFileName?: string;
  githubConfig?: GitHubConfig;
}): Promise<GitHubCommitResponse> {
  const records = [header, ...dataRecords];
  const content = stringifyCSV(records);
  return commitCSVToGitHub(content, fileSha, commitMessage, csvFileName, githubConfig);
}

export function formatAkyoCommitMessage(
  action: 'Add' | 'Update' | 'Delete',
  id: string,
  avatarName?: string | null
): string {
  const safeName = String(avatarName ?? '').replace(/[\r\n]+/g, ' ').slice(0, 100);
  return `${action} Akyo #${id}: ${safeName}`;
}

/**
 * Stringify records into CSV content
 *
 * @param records - Array of records (each record is an array of fields)
 * @returns CSV content as string
 */
function stringifyCSV(records: string[][]): string {
  try {
    return stringify(records, {
      quoted: true, // Quote all fields for safety
      quoted_empty: true,
      record_delimiter: '\n',
    });
  } catch (error) {
    console.error('CSV stringifying error:', error);
    throw new Error('Failed to stringify CSV data');
  }
}

/**
 * Parse CSV text to AkyoData array
 * Handles both Japanese and English CSV formats
 *
 * @param csvText - CSV content as string
 * @returns Array of AkyoData objects
 */
export function parseCsvToAkyoData(csvText: string): AkyoData[] {
  const records = parseCSV(csvText);

  if (records.length < 2) {
    return []; // Need at least header + 1 data row
  }

  const [header, ...dataRecords] = records;
  const data: AkyoData[] = [];

  for (const record of dataRecords) {
    // Skip records with column count mismatch (malformed data)
    if (record.length !== header.length) {
      // Only log first few mismatches to avoid spam
      if (data.length < 5) {
        console.warn('Column count mismatch - skipping record:', {
          expected: header.length,
          got: record.length,
          firstColumn: record[0],
          recordLength: record.length,
        });
      }
      continue;
    }

    const rawRow: Record<string, string> = {};
    header.forEach((headerName, index) => {
      // Remove BOM and whitespace from header name just in case
      const safeHeader = headerName.trim().replace(/^\ufeff/, '');
      rawRow[safeHeader] = record[index] || '';
    });

    // Map English headers to data structure
    const attribute = rawRow['Category'] || '';
    const notes = rawRow['Comment'] || '';
    const creator = rawRow['Author'] || '';

    data.push({
      id: rawRow['ID'] ?? '',
      appearance: '', // Removed field
      nickname: rawRow['Nickname'] ?? '',
      avatarName: rawRow['AvatarName'] ?? '',
      
      // Standardized fields
      category: attribute,
      comment: notes,
      author: creator,
      
      // Backward compatibility fields
      attribute: attribute,
      notes: notes,
      creator: creator,

      entryType:
        rawRow[ENTRY_TYPE_COLUMN] === 'avatar' || rawRow[ENTRY_TYPE_COLUMN] === 'world'
          ? rawRow[ENTRY_TYPE_COLUMN]
          : undefined,
      displaySerial: rawRow[DISPLAY_SERIAL_COLUMN] || undefined,
      sourceUrl: rawRow['SourceURL'] || rawRow['AvatarURL'] || '',
      avatarUrl: rawRow['AvatarURL'] || rawRow['SourceURL'] || '',
    });
  }

  return hydrateAkyoDataset(data);
}

/**
 * Convert AkyoData array to CSV text
 *
 * @param data - Array of AkyoData objects
 * @returns CSV content as string
 */
/**
 * Find record by ID (first column)
 *
 * @param records - Array of CSV records
 * @param id - ID to search for
 * @returns Record if found, undefined otherwise
 */
export function findRecordById(records: string[][], id: string): string[] | undefined {
  return records.find((record) => {
    const recordId = String(record[0] ?? '').trim().replace(/^"|"$/g, '');
    return recordId === id;
  });
}

/**
 * Filter out record by ID (first column)
 *
 * @param records - Array of CSV records
 * @param id - ID to filter out
 * @returns Filtered array of records
 */
export function filterOutRecordById(records: string[][], id: string): string[][] {
  return records.filter((record) => {
    const recordId = String(record[0] ?? '').trim().replace(/^"|"$/g, '');
    return recordId !== id;
  });
}

/**
 * Replace record by ID (first column)
 *
 * @param records - Array of CSV records
 * @param id - ID of record to replace
 * @param newRecord - New record data
 * @returns Updated array of records
 */
export function replaceRecordById(
  records: string[][],
  id: string,
  newRecord: string[]
): string[][] {
  return records.map((record) => {
    const recordId = String(record[0] ?? '').trim().replace(/^"|"$/g, '');
    if (recordId === id) {
      return newRecord;
    }
    return record;
  });
}

function sanitizeCsvCell(value: string): string {
  const str = String(value ?? '');
  return /^[=+\-@\t]/.test(str) ? `'${str}` : str;
}

/**
 * Create a new record from form data
 * Applies CSV formula injection protection to all fields
 *
 * @param data - Object with field values
 * @returns Array of field values with security sanitization
 */
export function createAkyoRecord(data: {
  id: string;
  nickname?: string;
  avatarName: string;
  entryType?: 'avatar' | 'world';
  displaySerial?: string;
  category?: string;
  author?: string;
  comment?: string;
  sourceUrl?: string;
  avatarUrl?: string;
  /** backward compat */
  attributes?: string;
  creator?: string;
  notes?: string;
}, header: string[] = [...BASE_AKYO_CSV_COLUMNS, ...AKYO_EXTENDED_COLUMNS]): string[] {
  const category = data.category ?? data.attributes ?? '';
  const author = data.author ?? data.creator ?? '';
  const comment = data.comment ?? data.notes ?? '';
  const normalizedEntryType = data.entryType === 'world' ? 'world' : 'avatar';
  const normalizedAvatarUrl = data.avatarUrl || data.sourceUrl || '';
  const normalizedSourceUrl = data.sourceUrl || data.avatarUrl || '';
  const normalizedDisplaySerial = data.displaySerial || '';

  return header.map((columnName) => {
    switch (columnName) {
      case 'ID':
        return sanitizeCsvCell(data.id);
      case 'Nickname':
        return sanitizeCsvCell(data.nickname || '');
      case 'AvatarName':
        return sanitizeCsvCell(data.avatarName);
      case 'Category':
        return sanitizeCsvCell(category);
      case 'Comment':
        return sanitizeCsvCell(comment);
      case 'Author':
        return sanitizeCsvCell(author);
      case 'AvatarURL':
        return sanitizeCsvCell(normalizedAvatarUrl);
      case SOURCE_URL_COLUMN:
        return sanitizeCsvCell(normalizedSourceUrl);
      case ENTRY_TYPE_COLUMN:
        return sanitizeCsvCell(normalizedEntryType);
      case DISPLAY_SERIAL_COLUMN:
        return sanitizeCsvCell(normalizedDisplaySerial);
      default:
        return '';
    }
  });
}

export function getNextDisplaySerial(
  records: string[][],
  header: string[],
  entryType: 'avatar' | 'world'
): string {
  if (entryType !== WORLD_ENTRY_TYPE) {
    return '';
  }

  const displaySerialIndex = header.indexOf(DISPLAY_SERIAL_COLUMN);
  const idIndex = header.indexOf('ID');
  let maxSerial = 0;

  for (const record of records) {
    if (!isWorldRecord(record, header)) {
      continue;
    }

    const serialSource =
      (displaySerialIndex >= 0 ? String(record[displaySerialIndex] || '').trim() : '') ||
      (idIndex >= 0 ? String(record[idIndex] || '').trim() : '');
    const parsed = Number.parseInt(serialSource, 10);
    if (!Number.isNaN(parsed)) {
      maxSerial = Math.max(maxSerial, parsed);
    }
  }

  return String(maxSerial + 1).padStart(4, '0');
}
