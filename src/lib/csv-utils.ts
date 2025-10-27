/**
 * CSV Utilities
 * 
 * Proper CSV parsing and stringifying using csv-parse and csv-stringify libraries.
 * Handles quoted fields, commas, newlines, and special characters correctly.
 * Also includes AkyoData type conversion utilities.
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { AkyoData } from '@/types/akyo';

/**
 * Parse CSV content into records
 * 
 * @param content - CSV file content as string
 * @returns Array of records (each record is an array of fields)
 */
export function parseCSV(content: string): string[][] {
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

/**
 * Stringify records into CSV content
 * 
 * @param records - Array of records (each record is an array of fields)
 * @returns CSV content as string
 */
export function stringifyCSV(records: string[][]): string {
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

    // Build object from header-value pairs
    const row: Record<string, string> = {};
    header.forEach((headerName, index) => {
      row[headerName] = record[index] || '';
    });

    // Convert to AkyoData format
    // CSV columns: ID,見た目,通称,アバター名,属性,備考,作者,アバターURL
    data.push({
      id: row['ID'] || '',
      appearance: row['見た目'] || '',
      nickname: row['通称'] || '',
      avatarName: row['アバター名'] || '',
      attribute: row['属性'] || row['属性（モチーフが基準）'] || '',
      notes: row['備考'] || '',
      creator: row['作者'] || row['作者（敬称略）'] || '',
      avatarUrl: row['アバターURL'] || '',
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
export function akyoDataToCsv(data: AkyoData[]): string {
  const headers = ['ID', '見た目', '通称', 'アバター名', '属性', '備考', '作者', 'アバターURL'];
  const records: string[][] = [headers];

  for (const akyo of data) {
    records.push([
      akyo.id,
      akyo.appearance,
      akyo.nickname,
      akyo.avatarName,
      akyo.attribute,
      akyo.notes,
      akyo.creator,
      akyo.avatarUrl,
    ]);
  }

  return stringifyCSV(records);
}

/**
 * Sanitize CSV cell value to prevent formula injection
 * Escapes cells starting with =, +, -, @, or tab characters
 * 
 * @param value - Cell value to sanitize
 * @returns Sanitized value safe for CSV export
 */
function sanitizeCsvCell(value: string): string {
  const str = String(value ?? '');
  // Prepend single quote to prevent formula execution in Excel/LibreOffice
  return /^[=+\-@\t]/.test(str) ? `'${str}` : str;
}

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

/**
 * Format ID to 4-digit format (0001-9999)
 * 
 * @param id - ID as string or number
 * @returns Formatted 4-digit ID
 */
export function formatAkyoId(id: string | number): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) return '0000';
  return numId.toString().padStart(4, '0');
}

/**
 * Split attributes string into array
 * Supports both Japanese comma (、) and regular comma (,) separators
 * 
 * @param attribute - Comma-separated attributes string (e.g., "チョコミント類,ギミック" or "チョコミント類、ギミック")
 * @returns Array of trimmed attribute strings
 */
export function splitAttributes(attribute: string): string[] {
  if (!attribute) return [];
  return attribute.split(/[、,]/).map(a => a.trim()).filter(Boolean);
}
