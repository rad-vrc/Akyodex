import type { AkyoData, AkyoCsvRow } from '@/types/akyo';

/**
 * CSVテキストをパースしてAkyoDataの配列に変換
 */
export function parseCsvToAkyoData(csvText: string): AkyoData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return []; // ヘッダー + 最低1行必要

  const headers = lines[0].split(',').map(h => h.trim());
  const data: AkyoData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 空行はスキップ

    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1}: column count mismatch`, { expected: headers.length, got: values.length });
      continue;
    }

    const row: Partial<AkyoCsvRow> = {};
    headers.forEach((header, index) => {
      row[header as keyof AkyoCsvRow] = values[index];
    });

    // AkyoCsvRow → AkyoDataに変換
    // CSVの列順: ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL
    data.push({
      id: row.ID || '',
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
 * CSV行をパース（引用符対応）
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされた引用符
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // 最後のフィールド
  values.push(current.trim());

  return values;
}

/**
 * AkyoData配列をCSVテキストに変換
 */
export function akyoDataToCsv(data: AkyoData[]): string {
  const headers = ['ID', '見た目', '通称', 'アバター名', '属性', '備考', '作者', 'アバターURL'];
  const lines = [headers.join(',')];

  for (const akyo of data) {
    const row = [
      akyo.id,
      escapeCSVValue(akyo.appearance),
      escapeCSVValue(akyo.nickname),
      escapeCSVValue(akyo.avatarName),
      escapeCSVValue(akyo.attribute),
      escapeCSVValue(akyo.notes),
      escapeCSVValue(akyo.creator),
      escapeCSVValue(akyo.avatarUrl),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * CSV値をエスケープ（引用符・カンマ・改行を含む場合）
 */
function escapeCSVValue(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * IDを4桁形式に変換 (0001-9999)
 */
export function formatAkyoId(id: string | number): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) return '0000';
  return numId.toString().padStart(4, '0');
}

/**
 * 属性を配列に分割
 */
export function splitAttributes(attribute: string): string[] {
  if (!attribute) return [];
  return attribute.split(',').map(a => a.trim()).filter(Boolean);
}
