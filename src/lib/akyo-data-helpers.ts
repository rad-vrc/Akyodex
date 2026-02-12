/**
 * Common Helper Functions for Akyo Data Processing
 * 
 * This module provides reusable utility functions for extracting
 * categories, authors, and finding items in Akyo datasets.
 * Used by akyo-data.ts, akyo-data-server.ts, akyo-data-json.ts, and akyo-data-kv.ts
 * to avoid code duplication.
 */

import type { AkyoData } from '@/types/akyo';

/**
 * Extract all unique categories from a dataset
 * Handles both 'category' and legacy 'attribute' fields
 * Supports both Japanese (、) and Western (,) delimiters
 * 
 * @param data - Array of Akyo data
 * @returns Sorted array of unique categories
 */
export function extractCategories(data: AkyoData[]): string[] {
  const categoriesSet = new Set<string>();
  
  data.forEach((akyo) => {
    const catStr = akyo.category || akyo.attribute || '';
    const cats = catStr.split(/[、,]/).map((c) => c.trim()).filter(Boolean);
    cats.forEach((cat) => categoriesSet.add(cat));
  });
  
  return Array.from(categoriesSet).sort();
}

/**
 * Extract all unique authors from a dataset
 * Handles both 'author' and legacy 'creator' fields
 * Supports both Japanese (、) and Western (,) delimiters
 * 
 * @param data - Array of Akyo data
 * @returns Sorted array of unique authors
 */
export function extractAuthors(data: AkyoData[]): string[] {
  const authorsSet = new Set<string>();
  
  data.forEach((akyo) => {
    const authorStr = akyo.author || akyo.creator || '';
    const authors = authorStr.split(/[、,]/).map((a) => a.trim()).filter(Boolean);
    authors.forEach((author) => authorsSet.add(author));
  });
  
  return Array.from(authorsSet).sort();
}

/**
 * Find a single Akyo item by ID
 * 
 * @param data - Array of Akyo data
 * @param id - 4-digit ID (e.g., "0001")
 * @returns Single Akyo data or null if not found
 */
export function findAkyoById(data: AkyoData[], id: string): AkyoData | null {
  return data.find((akyo) => akyo.id === id) || null;
}

/**
 * カテゴリ名 → 色の定数マッピング
 */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  チョコミント: '#00bfa5',
  動物: '#ff6f61',
  きつね: '#ff9800',
  おばけ: '#9c27b0',
  人類: '#2196f3',
  ギミック: '#4caf50',
  特殊: '#e91e63',
  ネコ: '#795548',
  イヌ: '#607d8b',
  うさぎ: '#ff4081',
  ドラゴン: '#673ab7',
  ロボット: '#757575',
  食べ物: '#ffc107',
  植物: '#8bc34a',
  宇宙: '#3f51b5',
  和風: '#d32f2f',
  洋風: '#1976d2',
  ファンタジー: '#ab47bc',
  SF: '#00acc1',
  ホラー: '#424242',
  かわいい: '#ec407a',
  クール: '#5c6bc0',
  シンプル: '#78909c',
};

const DEFAULT_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

/**
 * 文字列から決定的なハッシュ値を生成（簡易 djb2）
 * Math.random() の代わりに使用し、同一カテゴリ名には常に同じ色を返す
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0; // 32bit整数に変換
  }
  return Math.abs(hash);
}

/**
 * カテゴリ名に対応する色を取得
 *
 * マッピングに一致するキーワードが含まれていればその色を返し、
 * 一致しなければカテゴリ名のハッシュからデフォルト色を決定的に選択する。
 * （Math.random() を使わないため SSR/CSR のハイドレーションミスマッチが起きない）
 *
 * @param category - カテゴリ文字列
 * @returns HEX カラーコード
 */
export function getCategoryColor(category: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLOR_MAP)) {
    if (category && category.includes(key)) {
      return color;
    }
  }
  return DEFAULT_COLORS[hashString(category || '') % DEFAULT_COLORS.length];
}
