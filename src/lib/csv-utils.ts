/**
 * CSV Utilities
 *
 * Proper CSV parsing and stringifying using csv-parse and csv-stringify libraries.
 * Handles quoted fields, commas, newlines, and special characters correctly.
 * Also includes AkyoData type conversion utilities.
 */

import type { AkyoCsvRow, AkyoData } from '@/types/akyo';
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
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false, // Preserve original whitespace
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
  const csvFile = await fetchCSVFromGitHub(csvFileName, githubConfig);
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
    if (record.length !== header.length) {
      console.warn('Column count mismatch:', { expected: header.length, got: record.length, record });
      continue;
    }

    const rawRow: Record<string, string> = {};
    header.forEach((headerName, index) => {
      rawRow[headerName] = record[index] || '';
    });

    const csvRow: AkyoCsvRow = {
      ID: rawRow['ID'] ?? '',
      見た目: rawRow['見た目'] ?? '',
      通称: rawRow['通称'] ?? '',
      アバター名: rawRow['アバター名'] ?? '',
      属性: rawRow['属性'] || undefined,
      '属性（モチーフが基準）': rawRow['属性（モチーフが基準）'] || undefined,
      備考: rawRow['備考'] ?? '',
      作者: rawRow['作者'] || undefined,
      '作者（敬称略）': rawRow['作者（敬称略）'] || undefined,
      アバターURL: rawRow['アバターURL'] ?? '',
    };

    data.push({
      id: csvRow.ID,
      appearance: csvRow.見た目,
      nickname: csvRow.通称,
      avatarName: csvRow.アバター名,
      attribute: csvRow.属性 || csvRow['属性（モチーフが基準）'] || '',
      notes: csvRow.備考,
      creator: csvRow.作者 || csvRow['作者（敬称略）'] || '',
      avatarUrl: csvRow.アバターURL,
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
  attributes?: string;
  creator: string;
  avatarUrl?: string;
  notes?: string;
}): string[] {
  return [
    sanitizeCsvCell(data.id),
    '', // appearance field is not used in form
    sanitizeCsvCell(data.nickname || ''),
    sanitizeCsvCell(data.avatarName),
    sanitizeCsvCell(data.attributes || ''),
    sanitizeCsvCell(data.notes || ''),
    sanitizeCsvCell(data.creator),
    sanitizeCsvCell(data.avatarUrl || ''),
  ];
}
