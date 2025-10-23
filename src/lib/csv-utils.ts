/**
 * CSV Utilities
 * 
 * Proper CSV parsing and stringifying using csv-parse and csv-stringify libraries.
 * Handles quoted fields, commas, newlines, and special characters correctly.
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

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
 * 
 * @param data - Object with field values
 * @returns Array of field values
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
    data.id,
    data.nickname || '',
    data.avatarName,
    data.attributes || '',
    data.creator,
    data.avatarUrl || '',
    data.notes || '',
  ];
}
