'use client';

import type { AkyoData, AkyoFilterOptions } from '@/types/akyo';
import { useCallback, useEffect, useState } from 'react';

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
      // お気に入り情報を復元（localStorageはクライアントのみ）
      const favorites = getFavorites();
      const dataWithFavorites = initialData.map(akyo => ({
        ...akyo,
        isFavorite: favorites.includes(akyo.id),
      }));

      setData(dataWithFavorites);
      setFilteredData(dataWithFavorites);
    }
  }, [initialData]);

  /**
   * 新しいデータでリフレッシュ（言語切り替え時などに使用）
   */
  const refetchWithNewData = useCallback((newData: AkyoData[]) => {
    const favorites = getFavorites();
    const dataWithFavorites = newData.map(akyo => ({
      ...akyo,
      isFavorite: favorites.includes(akyo.id),
    }));
    setData(dataWithFavorites);
    setFilteredData(dataWithFavorites);
  }, []);

  // フィルタリング機能
  const filterData = useCallback((options: AkyoFilterOptions, sortAsc: boolean = true) => {
    const query = (options.searchQuery || '').toLowerCase();
    const targetCategory = options.category || options.attribute;
    const targetAuthor = options.author || options.creator;

    let filtered = [...data];

    // Filter by attribute/category
    if (targetCategory && targetCategory !== 'all') {
      filtered = filtered.filter((akyo) => {
        const catsStr = akyo.category || akyo.attribute || '';
        const cats = catsStr.split(/[、,]/).map((a) => a.trim());
        return cats.includes(targetCategory);
      });
    }

    // Filter by creator/author
    if (targetAuthor && targetAuthor !== 'all') {
      filtered = filtered.filter((akyo) => {
        const authorsStr = akyo.author || akyo.creator || '';
        const authors = authorsStr.split(/[、,]/).map((c) => c.trim());
        return authors.includes(targetAuthor);
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
        const idA = parseInt(a.id, 10);
        const idB = parseInt(b.id, 10);
        return sortAsc ? idA - idB : idB - idA;
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
 * お気に入りIDを取得
 */
function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem('akyoFavorites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * お気に入りIDを保存
 */
function saveFavorites(ids: string[]): void {
  try {
    localStorage.setItem('akyoFavorites', JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save favorites:', e);
  }
}
