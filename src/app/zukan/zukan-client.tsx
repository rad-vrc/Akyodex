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

import { AkyoCard } from '@/components/akyo-card';
import { AkyoDetailModal } from '@/components/akyo-detail-modal';
import { AkyoList } from '@/components/akyo-list';
import { DifyChatbotHandler } from '@/components/dify-chatbot-handler';
import { FilterPanel } from '@/components/filter-panel';
import { LanguageToggle } from '@/components/language-toggle';
import { MiniAkyoBg } from '@/components/mini-akyo-bg';
import { SearchBar } from '@/components/search-bar';
import { useAkyoData } from '@/hooks/use-akyo-data';
import { useLanguage } from '@/hooks/use-language';
import type { SupportedLanguage } from '@/lib/i18n';
import type { AkyoData, ViewMode } from '@/types/akyo';
import { IconCog, IconGrid, IconList } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ZukanClientProps {
  initialData: AkyoData[];
  
  // 新フィールド
  categories: string[];
  authors: string[];

  // 旧フィールド（非推奨）
  /** @deprecated use categories */
  attributes: string[];
  /** @deprecated use authors */
  creators: string[];
  
  /** Server-rendered language (for static generation) */
  serverLang: SupportedLanguage;
}

export function ZukanClient({ 
  initialData, 
  categories, 
  authors,
  attributes, 
  creators, 
  serverLang 
}: ZukanClientProps) {
  // Client-side language detection
  const { lang, needsRefetch, isReady } = useLanguage(serverLang);
  
  const { 
    data, 
    filteredData, 
    error, 
    loading,
    filterData, 
    toggleFavorite, 
    refetchWithNewData,
    setLoading,
    setError 
  } = useAkyoData(initialData);
  
  // Dynamic categories/authors (may change on language switch)
  const [currentCategories, setCurrentCategories] = useState(categories);
  const [currentAuthors, setCurrentAuthors] = useState(authors);
  
  // Refetch data when language differs from server-rendered language
  useEffect(() => {
    if (!isReady || !needsRefetch || lang === serverLang) return;
    
    const fetchLanguageData = async () => {
      setLoading(true);
      try {
        // Fetch JSON data for the detected language from CDN
        const response = await fetch(`https://images.akyodex.com/data/akyo-data-${lang}.json`);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const jsonData = await response.json();
        if (Array.isArray(jsonData)) {
          refetchWithNewData(jsonData);
          
          // Extract unique categories and authors from data
          const uniqueCategories = new Set<string>();
          const uniqueAuthors = new Set<string>();
          
          jsonData.forEach((item: AkyoData) => {
            const cats = (item.category || item.attribute || '').split(/[、,]/).map(s => s.trim()).filter(Boolean);
            const auths = (item.author || item.creator || '').split(/[、,]/).map(s => s.trim()).filter(Boolean);
            cats.forEach(c => uniqueCategories.add(c));
            auths.forEach(a => uniqueAuthors.add(a));
          });
          
          setCurrentCategories(Array.from(uniqueCategories).sort());
          setCurrentAuthors(Array.from(uniqueAuthors).sort());
        }
      } catch (err) {
        console.error('[ZukanClient] Failed to refetch language data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLanguageData();
  }, [isReady, needsRefetch, lang, serverLang, refetchWithNewData, setLoading, setError]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 状態変数名は変更量が多いので一旦そのまま（selectedCategory等への変更は今後の課題）
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

  // data が更新された際（cross-tab sync 等）、モーダルが開いていれば selectedAkyo を最新に同期
  useEffect(() => {
    if (!selectedAkyo || !isModalOpen) return;
    const latest = data.find(a => a.id === selectedAkyo.id);
    if (latest && latest.isFavorite !== selectedAkyo.isFavorite) {
      setSelectedAkyo(latest);
    }
  }, [data, selectedAkyo, isModalOpen]);

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
    if (randomMode) return; // ランダム表示中は通常フィルタ適用を抑止
    filterData({
      searchQuery,
      // 新フィールド名を優先して渡す
      category: selectedAttribute || undefined,
      author: selectedCreator || undefined,
      // 旧フィールド名も念のため渡す
      attribute: selectedAttribute || undefined,
      creator: selectedCreator || undefined,
      favoritesOnly,
    }, sortAscending);
  }, [searchQuery, selectedAttribute, selectedCreator, favoritesOnly, sortAscending, randomMode, filterData]);

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

  // 統計情報（useMemo で再計算を抑制 — data/filteredData が変わらない限りキャッシュ）
  const stats = useMemo(() => ({
    total: data.length,
    displayed: filteredData.length,
    favorites: data.filter(a => a.isFavorite).length,
  }), [data, filteredData]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="akyo-card p-8 text-center space-y-4">
          <div className="text-6xl">😢</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {lang === 'en' ? 'An error occurred' : 'エラーが発生しました'}
          </h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  // Show loading skeleton when refetching data for different language
  if (loading && needsRefetch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="akyo-card p-8 text-center space-y-4 animate-pulse">
          <div className="text-6xl">🔄</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {lang === 'en' ? 'Loading...' : '読み込み中...'}
          </h2>
          <p className="text-[var(--text-secondary)]">
            {lang === 'en' ? 'Fetching data for your language' : 'お使いの言語のデータを取得中'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative">
      {/* Mini Akyo Background Animation */}
      <MiniAkyoBg />

      {/* Dify Chatbot Handler */}
      <DifyChatbotHandler />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* ロゴ */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src={lang === 'en' ? '/images/logo-US.webp' : '/images/logo.webp'}
              alt={lang === 'en' ? 'Akyodex' : 'Akyoずかん'}
              width={1980}
              height={305}
              className="logo-animation h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* 統計情報 */}
          <div className="flex gap-2 sm:gap-4 text-sm sm:text-base font-bold text-white">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {lang === 'en' ? `Total ${stats.total}` : `全${stats.total}体`}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {lang === 'en' ? `Showing ${stats.displayed}` : `表示${stats.displayed}体`}
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
            value={searchQuery}
            placeholder={lang === 'en' ? 'Search by name, creator, or attribute...' : '名前・作者・属性で検索...'}
          />
        </div>

        {/* フィルターとビュー切替 */}
        <div className="akyo-card p-4 sm:p-6 space-y-4">
          <FilterPanel
            // 動的に更新されるカテゴリ/作者を使用
            attributes={currentCategories || categories || attributes}
            creators={currentAuthors || authors || creators}
            selectedAttribute={selectedAttribute}
            selectedCreator={selectedCreator}
            onAttributeChange={setSelectedAttribute}
            onCreatorChange={setSelectedCreator}
            onSortToggle={handleSortToggle}
            onRandomClick={handleRandomClick}
            onFavoritesClick={handleFavoritesClick}
            favoritesOnly={favoritesOnly}
            sortAscending={sortAscending}
            randomMode={randomMode}
            lang={lang}
          />

          {/* ビュー切替 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label={lang === 'en' ? 'Grid view' : 'グリッド表示'}
            >
              <IconGrid size="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label={lang === 'en' ? 'List view' : 'リスト表示'}
            >
              <IconList size="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Akyoカード/リスト表示 */}
        {filteredData.length === 0 ? (
          <div className="akyo-card p-12 text-center space-y-4">
            <div className="text-6xl">🔍</div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {lang === 'en' ? 'No Akyo found' : 'Akyoが見つかりませんでした'}
            </h3>
            <p className="text-[var(--text-secondary)]">
              {lang === 'en' ? 'Try changing your search criteria' : '検索条件を変更してみてください'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <AkyoList
            data={filteredData.slice(0, renderLimit)}
            onToggleFavorite={toggleFavorite}
            onShowDetail={handleShowDetail}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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
      <LanguageToggle initialLang={lang} />

      {/* Admin Settings Button - Below Language Toggle (same color as Language Toggle) */}
      <Link
        href="/admin"
        className="admin-button group"
        aria-label="管理画面"
        title="管理画面"
      >
        <IconCog size="w-5 h-5 sm:w-6 sm:h-6" className="group-hover:rotate-90 transition-transform duration-300" />
      </Link>

      {/* AI Chat Assistant (Dify embed) */}
      <div id="dify-chatbot-container" className="fixed bottom-6 right-6 z-[2147483647]" />
    </div>
  );
}
