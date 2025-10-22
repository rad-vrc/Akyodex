'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAkyoData } from '@/hooks/use-akyo-data';
import { AkyoCard } from '@/components/akyo-card';
import { AkyoList } from '@/components/akyo-list';
import { SearchBar } from '@/components/search-bar';
import { FilterPanel } from '@/components/filter-panel';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { ViewMode } from '@/types/akyo';

export default function ZukanPage() {
  const { data, filteredData, loading, error, filterData, toggleFavorite } = useAkyoData();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [randomMode, setRandomMode] = useState(false);

  // 属性リストを抽出
  const attributes = useMemo(() => {
    const attrSet = new Set<string>();
    data.forEach(akyo => {
      akyo.attribute.split(',').forEach(attr => {
        const trimmed = attr.trim();
        if (trimmed) attrSet.add(trimmed);
      });
    });
    return Array.from(attrSet).sort();
  }, [data]);

  // 作者リストを抽出
  const creators = useMemo(() => {
    const creatorSet = new Set<string>();
    data.forEach(akyo => {
      if (akyo.creator) creatorSet.add(akyo.creator);
    });
    return Array.from(creatorSet).sort();
  }, [data]);

  // フィルター適用
  useEffect(() => {
    filterData({
      searchQuery,
      attribute: selectedAttribute || undefined,
      creator: selectedCreator || undefined,
      favoritesOnly,
    }, sortAscending);
  }, [searchQuery, selectedAttribute, selectedCreator, favoritesOnly, sortAscending, filterData]);

  // ソート切替
  const handleSortToggle = () => {
    setSortAscending(!sortAscending);
  };

  // ランダム表示
  const handleRandomClick = () => {
    const newRandomMode = !randomMode;
    setRandomMode(newRandomMode);
    if (newRandomMode) {
      filterData({
        searchQuery: '',
        randomCount: 20,
      }, sortAscending);
      setSearchQuery('');
      setSelectedAttribute('');
      setSelectedCreator('');
      setFavoritesOnly(false);
    } else {
      // ランダムモードを解除して通常表示に戻る
      filterData({
        searchQuery,
        attribute: selectedAttribute || undefined,
        creator: selectedCreator || undefined,
        favoritesOnly,
      }, sortAscending);
    }
  };

  // お気に入りフィルター切替
  const handleFavoritesClick = () => {
    setFavoritesOnly(!favoritesOnly);
  };

  // 統計情報
  const stats = {
    total: data.length,
    displayed: filteredData.length,
    favorites: data.filter(a => a.isFavorite).length,
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="akyo-card p-8 text-center space-y-4">
          <div className="text-6xl">😢</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            エラーが発生しました
          </h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* ロゴ */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo.webp"
              alt="Akyoずかん"
              width={1980}
              height={305}
              className="logo-animation h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* 統計情報 */}
          <div className="flex gap-2 sm:gap-4 text-sm sm:text-base font-bold text-white">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              全{stats.total}体
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              表示{stats.displayed}体
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              ❤️{stats.favorites}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* 検索バー */}
        <div className="akyo-card p-4 sm:p-6">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        {/* フィルターとビュー切替 */}
        <div className="akyo-card p-4 sm:p-6 space-y-4">
          <FilterPanel
            attributes={attributes}
            creators={creators}
            onAttributeChange={setSelectedAttribute}
            onCreatorChange={setSelectedCreator}
            onSortToggle={handleSortToggle}
            onRandomClick={handleRandomClick}
            onFavoritesClick={handleFavoritesClick}
            favoritesOnly={favoritesOnly}
            sortAscending={sortAscending}
            randomMode={randomMode}
          />

          {/* ビュー切替 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="グリッド表示"
            >
              <i className="fas fa-th text-xl md:text-2xl"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="リスト表示"
            >
              <i className="fas fa-list text-xl md:text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Akyoカード/リスト表示 */}
        {filteredData.length === 0 ? (
          <div className="akyo-card p-12 text-center space-y-4">
            <div className="text-6xl">🔍</div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              Akyoが見つかりませんでした
            </h3>
            <p className="text-[var(--text-secondary)]">
              検索条件を変更してみてください
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <AkyoList
            data={filteredData}
            onToggleFavorite={toggleFavorite}
            onShowDetail={(akyo) => {
              // TODO: モーダル表示
              console.log('Show detail:', akyo);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredData.map(akyo => (
              <AkyoCard
                key={akyo.id}
                akyo={akyo}
                onToggleFavorite={toggleFavorite}
                onShowDetail={(akyo) => {
                  // TODO: モーダル表示
                  console.log('Show detail:', akyo);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
