'use client';

import type { AkyoData, AkyoFilterOptions } from '@/types/akyo';
import { useCallback, useEffect, useState } from 'react';

/** localStorage のキー名 */
const FAVORITES_STORAGE_KEY = 'akyoFavorites';
const MULTI_VALUE_SPLIT_PATTERN = /[、,]/;

/**
 * Akyoデータを管理するカスタムフック (SSR対応版)
 *
 * @param initialData - サーバーサイドで取得した初期データ
 */
export function useAkyoData(initialData: AkyoData[] = []) {
  // 初期状態でSSRデータを直接設定（「見つかりませんでした」の一瞬表示を防止）
  const [data, setData] = useState<AkyoData[]>(initialData);
  const [filteredData, setFilteredData] = useState<AkyoData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // クライアントサイドでお気に入り情報を復元
  useEffect(() => {
    if (initialData.length > 0) {
      const dataWithFavorites = applyFavorites(initialData);
      setData(dataWithFavorites);
      setFilteredData(dataWithFavorites);
    }
  }, [initialData]);

  // 別タブからの localStorage 変更を検知してお気に入り状態を同期する
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== FAVORITES_STORAGE_KEY) return;
      // キャッシュを無効化して最新の値を取得
      favoritesCache = null;
      setData(prev => applyFavorites(prev));
      setFilteredData(prev => applyFavorites(prev));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * 新しいデータでリフレッシュ（言語切り替え時などに使用）
   */
  const refetchWithNewData = useCallback((newData: AkyoData[]) => {
    const dataWithFavorites = applyFavorites(newData);
    setData(dataWithFavorites);
    setFilteredData(dataWithFavorites);
  }, []);

  // フィルタリング機能
  const filterData = useCallback((options: AkyoFilterOptions, sortAsc: boolean = true) => {
    const query = (options.searchQuery || '').toLowerCase();
    const targetCategory = options.category || options.attribute;
    const targetAuthor = options.author || options.creator;
    const createSelectedList = (values: string[] | undefined, singleValue: string | undefined) =>
      (values && values.length > 0 ? values : singleValue && singleValue !== 'all' ? [singleValue] : [])
        .map((item) => item.trim())
        .filter(Boolean);

    const selectedAuthors = createSelectedList(options.authors, targetAuthor);
    const selectedCategories = createSelectedList(options.categories, targetCategory);
    const categoryMatchMode = options.categoryMatchMode === 'and' ? 'and' : 'or';

    let filtered = [...data];

    // Filter by categories (supports both single and multi-select)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((akyo) => {
        const parsedCategories =
          akyo.parsedCategory ?? parseMultiValueField(akyo.category || akyo.attribute || '');

        if (categoryMatchMode === 'and') {
          return selectedCategories.every((category) => parsedCategories.includes(category));
        }
        return selectedCategories.some((category) => parsedCategories.includes(category));
      });
    }

    // Filter by creator/author
    if (selectedAuthors.length > 0) {
      filtered = filtered.filter((akyo) => {
        const parsedAuthors =
          akyo.parsedAuthor ?? parseMultiValueField(akyo.author || akyo.creator || '');
        return selectedAuthors.some((author) => parsedAuthors.includes(author));
      });
    }

    // Filter by favorites
    if (options.favoritesOnly) {
      filtered = filtered.filter((akyo) => akyo.isFavorite);
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter(
        (akyo) =>
          (akyo.id || '').toLowerCase().includes(query) ||
          (akyo.nickname || '').toLowerCase().includes(query) ||
          (akyo.avatarName || '').toLowerCase().includes(query) ||
          (akyo.category || akyo.attribute || '').toLowerCase().includes(query) ||
          (akyo.author || akyo.creator || '').toLowerCase().includes(query) ||
          (akyo.comment || akyo.notes || '').toLowerCase().includes(query)
      );
    }

    // Random display mode
    if (options.randomCount) {
      filtered = filtered
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .slice(0, options.randomCount);
    } else {
      // Sort by ID
      filtered.sort((a, b) => {
        const idA = Number.parseInt(a.id, 10);
        const idB = Number.parseInt(b.id, 10);
        const safeIdA = Number.isNaN(idA) ? 0 : idA;
        const safeIdB = Number.isNaN(idB) ? 0 : idB;
        return sortAsc ? safeIdA - safeIdB : safeIdB - safeIdA;
      });
    }

    setFilteredData(filtered);
  }, [data]);

  // お気に入り機能
  const toggleFavorite = useCallback((id: string) => {
    setData(prevData => {
      const newData = prevData.map(akyo =>
        akyo.id === id ? { ...akyo, isFavorite: !akyo.isFavorite } : akyo
      );

      // LocalStorageに保存
      const favorites = newData.filter(a => a.isFavorite).map(a => a.id);
      saveFavorites(favorites);

      return newData;
    });

    setFilteredData(prevData =>
      prevData.map(akyo =>
        akyo.id === id ? { ...akyo, isFavorite: !akyo.isFavorite } : akyo
      )
    );
  }, []);

  return {
    data,
    filteredData,
    loading,
    error,
    filterData,
    toggleFavorite,
    refetchWithNewData,
    setLoading,
    setError,
  };
}

/**
 * localStorage キャッシュ (React Best Practices 7.5)
 * localStorage の読み書きは同期的で高コストなため、メモリ内にキャッシュして
 * 頻繁なアクセス時のパフォーマンスを改善
 */
let favoritesCache: string[] | null = null;

/**
 * お気に入りIDを取得（キャッシュ対応）
 */
function getFavorites(): string[] {
  if (favoritesCache !== null) return favoritesCache;
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) {
      favoritesCache = [];
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    // バリデーション: 配列かつ全要素が文字列であることを確認
    if (Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')) {
      favoritesCache = parsed;
      return parsed;
    }
    // 不正なデータ形式の場合はリセット
    console.warn('Invalid favorites data in localStorage, resetting');
    favoritesCache = [];
    return [];
  } catch {
    favoritesCache = [];
    return [];
  }
}

/**
 * お気に入りIDを保存（キャッシュも同時に更新）
 */
function saveFavorites(ids: string[]): void {
  // 防御的コピー: 呼び出し元による配列の変更からキャッシュを保護
  const idsCopy = [...ids];
  // キャッシュを先に更新してセッション内の一貫性を保つ
  // (localStorage.setItem が容量超過等で失敗しても UI は正しく動作する)
  favoritesCache = idsCopy;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(idsCopy));
  } catch (e) {
    console.warn('Failed to save favorites to localStorage:', e);
  }
}

/**
 * データ配列にお気に入り情報を付与する共通ヘルパー
 * Set を使用して O(1) ルックアップを実現 (React Best Practices 7.11)
 */
function applyFavorites(items: AkyoData[]): AkyoData[] {
  if (items.length === 0) return items;
  const favoritesSet = new Set(getFavorites());
  return items.map(akyo => ({
    ...akyo,
    parsedCategory: akyo.parsedCategory ?? parseMultiValueField(akyo.category || akyo.attribute || ''),
    parsedAuthor: akyo.parsedAuthor ?? parseMultiValueField(akyo.author || akyo.creator || ''),
    isFavorite: favoritesSet.has(akyo.id),
  }));
}

function parseMultiValueField(value: string): string[] {
  return value
    .split(MULTI_VALUE_SPLIT_PATTERN)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
