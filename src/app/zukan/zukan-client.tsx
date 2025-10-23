'use client';

/**
 * Zukan Client Component
 * 
 * Handles all client-side interactivity:
 * - Search and filtering
 * - View mode switching (grid/list)
 * - Favorites (localStorage)
 * - Sort and random display
 * - Virtual scrolling (performance optimization)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAkyoData } from '@/hooks/use-akyo-data';
import { AkyoCard } from '@/components/akyo-card';
import { AkyoList } from '@/components/akyo-list';
import { SearchBar } from '@/components/search-bar';
import { FilterPanel } from '@/components/filter-panel';
import { LanguageToggle } from '@/components/language-toggle';
import { MiniAkyoBg } from '@/components/mini-akyo-bg';
import { AkyoDetailModal } from '@/components/akyo-detail-modal';
import type { AkyoData, ViewMode } from '@/types/akyo';
import type { SupportedLanguage } from '@/lib/i18n';

interface ZukanClientProps {
  initialData: AkyoData[];
  attributes: string[];
  creators: string[];
  initialLang: SupportedLanguage;
}

export function ZukanClient({ initialData, attributes, creators, initialLang }: ZukanClientProps) {
  const { data, filteredData, loading, error, filterData, toggleFavorite } = useAkyoData(initialData);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [randomMode, setRandomMode] = useState(false);
  
  // Modal state
  const [selectedAkyo, setSelectedAkyo] = useState<AkyoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Virtual scrolling state (performance optimization)
  const INITIAL_RENDER_COUNT = 60;
  const RENDER_CHUNK = 60;
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT);
  const tickingRef = useRef(false);

  const handleShowDetail = (akyo: AkyoData) => {
    setSelectedAkyo(akyo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAkyo(null);
  };

  const handleModalFavoriteToggle = (id: string) => {
    toggleFavorite(id);
    // Update modal with latest data
    const updated = data.find(a => a.id === id);
    if (updated && selectedAkyo?.id === id) {
      setSelectedAkyo(updated);
    }
  };

  // Virtual scrolling: Reset render limit when filters change
  useEffect(() => {
    setRenderLimit(INITIAL_RENDER_COUNT);
  }, [searchQuery, selectedAttribute, selectedCreator, favoritesOnly, sortAscending, randomMode]);

  // Virtual scrolling: Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 800;
      if (nearBottom && renderLimit < filteredData.length) {
        setRenderLimit(prev => Math.min(filteredData.length, prev + RENDER_CHUNK));
      }
      tickingRef.current = false;
    });
  }, [renderLimit, filteredData.length]);

  // Attach scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    <div className="min-h-screen pb-16 relative">
      {/* Mini Akyo Background Animation */}
      <MiniAkyoBg />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* ロゴ */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src={initialLang === 'en' ? '/images/logo-US.webp' : '/images/logo.webp'}
              alt={initialLang === 'en' ? 'Akyodex' : 'Akyoずかん'}
              width={1980}
              height={305}
              className="logo-animation h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* 統計情報 */}
          <div className="flex gap-2 sm:gap-4 text-sm sm:text-base font-bold text-white">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {initialLang === 'en' ? `Total ${stats.total}` : `全${stats.total}体`}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {initialLang === 'en' ? `Showing ${stats.displayed}` : `表示${stats.displayed}体`}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              ❤️{stats.favorites}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 relative z-10">
        {/* 検索バー */}
        <div className="akyo-card p-4 sm:p-6">
          <SearchBar 
            onSearch={setSearchQuery} 
            placeholder={initialLang === 'en' ? 'Search by name, creator, or attribute...' : '名前・作者・属性で検索...'}
          />
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
            lang={initialLang}
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
            data={filteredData.slice(0, renderLimit)}
            onToggleFavorite={toggleFavorite}
            onShowDetail={handleShowDetail}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredData.slice(0, renderLimit).map(akyo => (
              <AkyoCard
                key={akyo.id}
                akyo={akyo}
                onToggleFavorite={toggleFavorite}
                onShowDetail={handleShowDetail}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AkyoDetailModal
        akyo={selectedAkyo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onToggleFavorite={handleModalFavoriteToggle}
      />

      {/* Language Toggle Button - Top */}
      <LanguageToggle initialLang={initialLang} />

      {/* Admin Settings Button - Below Language Toggle (same color as Language Toggle) */}
      <Link
        href="/admin"
        className="admin-button group"
        aria-label="管理画面"
        title="管理画面"
      >
        <i className="fas fa-cog text-lg sm:text-xl group-hover:rotate-90 transition-transform duration-300"></i>
      </Link>

      {/* AI Chat Assistant (Dify embed) */}
      <div id="dify-chatbot-container" className="fixed bottom-6 right-6 z-[2147483647]" />
    </div>
  );
}
