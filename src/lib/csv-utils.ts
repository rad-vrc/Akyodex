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
import type { GitHubCommitResponse, GitHubConfig } from './github-utils';
import { commitCSVToGitHub, fetchCSVFromGitHub } from './github-utils';

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
  return {
    header,
    dataRecords,
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
      
      avatarUrl: rawRow['AvatarURL'] ?? '',
    });
  }

  return data;
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
  category?: string;
  author?: string;
  comment?: string;
  avatarUrl?: string;
  /** backward compat */
  attributes?: string;
  creator?: string;
  notes?: string;
}): string[] {
  const category = data.category ?? data.attributes ?? '';
  const author = data.author ?? data.creator ?? '';
  const comment = data.comment ?? data.notes ?? '';

  return [
    sanitizeCsvCell(data.id),
    sanitizeCsvCell(data.nickname || ''),
    sanitizeCsvCell(data.avatarName),
    sanitizeCsvCell(category),
    sanitizeCsvCell(comment),
    sanitizeCsvCell(author),
    sanitizeCsvCell(data.avatarUrl || ''),
  ];
}
