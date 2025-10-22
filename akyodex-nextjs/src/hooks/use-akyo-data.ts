'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AkyoData, AkyoFilterOptions } from '@/types/akyo';

/**
 * Akyoデータを管理するカスタムフック (SSR対応版)
 * 
 * @param initialData - サーバーサイドで取得した初期データ
 */
export function useAkyoData(initialData: AkyoData[] = []) {
  const [data, setData] = useState<AkyoData[]>([]);
  const [filteredData, setFilteredData] = useState<AkyoData[]>([]);
  const [loading, setLoading] = useState(!initialData.length);
  const [error, setError] = useState<string | null>(null);

  // 初期データの設定とお気に入り復元
  useEffect(() => {
    if (initialData.length > 0) {
      // お気に入り情報を復元
      const favorites = getFavorites();
      const dataWithFavorites = initialData.map(akyo => ({
        ...akyo,
        isFavorite: favorites.includes(akyo.id),
      }));

      setData(dataWithFavorites);
      setFilteredData(dataWithFavorites);
      setLoading(false);
    }
  }, [initialData]);

  // フィルタリング機能
  const filterData = useCallback((options: AkyoFilterOptions, sortAsc: boolean = true) => {
    let result = [...data];

    // フリーワード検索
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      result = result.filter(akyo =>
        akyo.id.toLowerCase().includes(query) ||
        akyo.nickname.toLowerCase().includes(query) ||
        akyo.avatarName.toLowerCase().includes(query) ||
        akyo.attribute.toLowerCase().includes(query) ||
        akyo.creator.toLowerCase().includes(query) ||
        akyo.notes.toLowerCase().includes(query)
      );
    }

    // 属性フィルター
    if (options.attribute) {
      result = result.filter(akyo =>
        akyo.attribute.split(',').map(a => a.trim()).includes(options.attribute!)
      );
    }

    // 作者フィルター
    if (options.creator) {
      result = result.filter(akyo =>
        akyo.creator === options.creator
      );
    }

    // お気に入りのみ
    if (options.favoritesOnly) {
      result = result.filter(akyo => akyo.isFavorite);
    }

    // ランダム表示
    if (options.randomCount && options.randomCount > 0) {
      const shuffled = [...result].sort(() => Math.random() - 0.5);
      result = shuffled.slice(0, options.randomCount);
    } else {
      // ソート機能（ランダム表示時以外）
      result.sort((a, b) => {
        const idA = parseInt(a.id, 10);
        const idB = parseInt(b.id, 10);
        return sortAsc ? idA - idB : idB - idA;
      });
    }

    setFilteredData(result);
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
