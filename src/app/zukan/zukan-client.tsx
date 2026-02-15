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
import { FilterPanel } from '@/components/filter-panel';
import { IconCog, IconGrid, IconList } from '@/components/icons';
import { LanguageToggle } from '@/components/language-toggle';
import { MiniAkyoBg } from '@/components/mini-akyo-bg';
import { SearchBar } from '@/components/search-bar';
import { useAkyoData } from '@/hooks/use-akyo-data';
import { useLanguage } from '@/hooks/use-language';
import { t, type SupportedLanguage } from '@/lib/i18n';
import type { AkyoData, ViewMode } from '@/types/akyo';
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

const LOGO_BY_LANG: Record<SupportedLanguage | 'default', string> = {
  ja: '/images/logo.webp',
  en: '/images/logo-US.webp',
  ko: '/images/logo-KO.webp',
  default: '/images/logo-US.webp',
};

export function ZukanClient({
  initialData,
  categories,
  authors,
  attributes,
  creators,
  serverLang,
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
    setError,
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
        const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
        const response = await fetch(`${r2Base}/data/akyo-data-${lang}.json`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const jsonData = await response.json();
        // Handle both array format and wrapped format ({ data: [...] })
        const akyoItems: AkyoData[] | undefined = Array.isArray(jsonData)
          ? jsonData
          : jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.data)
            ? jsonData.data
            : undefined;
        if (!akyoItems) {
          const payloadSummary = (() => {
            if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
              const keys = Object.keys(jsonData as Record<string, unknown>);
              return `{ keys: [${keys.join(', ')}] }`;
            }
            const raw = JSON.stringify(jsonData);
            const MAX_LENGTH = 1000;
            if (raw.length <= MAX_LENGTH) return raw;
            return `${raw.slice(0, MAX_LENGTH)}...(truncated, ${raw.length} chars)`;
          })();

          throw new Error(
            `[ZukanClient] Invalid JSON format: expected AkyoData[] or { data: AkyoData[] }, got ${payloadSummary}`
          );
        }

        refetchWithNewData(akyoItems);

        // Extract unique categories and authors from data
        const uniqueCategories = new Set<string>();
        const uniqueAuthors = new Set<string>();

        akyoItems.forEach((item: AkyoData) => {
          const cats = (item.category || item.attribute || '')
            .split(/[、,]/)
            .map((s) => s.trim())
            .filter(Boolean);
          const auths = (item.author || item.creator || '')
            .split(/[、,]/)
            .map((s) => s.trim())
            .filter(Boolean);
          cats.forEach((c) => {
            uniqueCategories.add(c);
          });
          auths.forEach((a) => {
            uniqueAuthors.add(a);
          });
        });

        setCurrentCategories(Array.from(uniqueCategories).sort());
        setCurrentAuthors(Array.from(uniqueAuthors).sort());
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

  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [categoryMatchMode, setCategoryMatchMode] = useState<'or' | 'and'>('or');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [randomMode, setRandomMode] = useState(false);
  const [isWideViewport, setIsWideViewport] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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
    const updated = data.find((a) => a.id === id);
    if (updated && selectedAkyo?.id === id) {
      setSelectedAkyo(updated);
    }
  };

  // data が更新された際（cross-tab sync 等）、モーダルが開いていれば selectedAkyo を最新に同期
  useEffect(() => {
    if (!selectedAkyo || !isModalOpen) return;
    const latest = data.find((a) => a.id === selectedAkyo.id);
    if (latest && latest.isFavorite !== selectedAkyo.isFavorite) {
      setSelectedAkyo(latest);
    }
  }, [data, selectedAkyo, isModalOpen]);

  // Virtual scrolling: Reset render limit when filters change
  useEffect(() => {
    setRenderLimit(INITIAL_RENDER_COUNT);
  }, [
    searchQuery,
    selectedAttributes,
    categoryMatchMode,
    selectedCreators,
    favoritesOnly,
    sortAscending,
    randomMode,
  ]);

  // Virtual scrolling: Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 800;
      if (nearBottom && renderLimit < filteredData.length) {
        setRenderLimit((prev) => Math.min(filteredData.length, prev + RENDER_CHUNK));
      }
      tickingRef.current = false;
    });
  }, [renderLimit, filteredData.length]);

  // Attach scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Keep filter layout in sync with viewport size.
  // Collapsible only on mobile; always visible on >= sm screens.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(min-width: 640px)');
    const syncByViewport = () => {
      const isWide = query.matches;
      setIsWideViewport(isWide);
      setIsFilterPanelOpen(isWide);
    };
    syncByViewport();
    query.addEventListener('change', syncByViewport);
    return () => query.removeEventListener('change', syncByViewport);
  }, []);

  // フィルター適用
  useEffect(() => {
    if (randomMode) return; // ランダム表示中は通常フィルタ適用を抑止
    filterData(
      {
        searchQuery,
        categories: selectedAttributes.length > 0 ? selectedAttributes : undefined,
        authors: selectedCreators.length > 0 ? selectedCreators : undefined,
        categoryMatchMode,
        // 新フィールド名を優先して渡す
        category: selectedAttributes[0] || undefined,
        author: selectedCreators[0] || undefined,
        // 旧フィールド名も念のため渡す
        attribute: selectedAttributes[0] || undefined,
        creator: selectedCreators[0] || undefined,
        favoritesOnly,
      },
      sortAscending
    );
  }, [
    searchQuery,
    selectedAttributes,
    categoryMatchMode,
    selectedCreators,
    favoritesOnly,
    sortAscending,
    randomMode,
    filterData,
  ]);

  // ソート切替
  const handleSortToggle = () => {
    setSortAscending(!sortAscending);
  };

  // ランダム表示
  const handleRandomClick = () => {
    const newRandomMode = !randomMode;
    setRandomMode(newRandomMode);
    if (newRandomMode) {
      filterData(
        {
          searchQuery: '',
          randomCount: 20,
        },
        sortAscending
      );
      setSearchQuery('');
      setSelectedAttributes([]);
      setCategoryMatchMode('or');
      setSelectedCreators([]);
      setFavoritesOnly(false);
    } else {
      // ランダムモードを解除して通常表示に戻る
      filterData(
        {
          searchQuery,
          categories: selectedAttributes.length > 0 ? selectedAttributes : undefined,
          authors: selectedCreators.length > 0 ? selectedCreators : undefined,
          categoryMatchMode,
          category: selectedAttributes[0] || undefined,
          author: selectedCreators[0] || undefined,
          favoritesOnly,
        },
        sortAscending
      );
    }
  };

  // お気に入りフィルター切替
  const handleFavoritesClick = () => {
    setFavoritesOnly(!favoritesOnly);
  };

  // 統計情報（useMemo で再計算を抑制 — data/filteredData が変わらない限りキャッシュ）
  const stats = useMemo(
    () => ({
      total: data.length,
      displayed: filteredData.length,
      favorites: data.filter((a) => a.isFavorite).length,
    }),
    [data, filteredData]
  );

  const activeFilterCount = useMemo(
    () => selectedAttributes.length + selectedCreators.length + (favoritesOnly ? 1 : 0),
    [selectedAttributes, selectedCreators, favoritesOnly]
  );
  const shouldRenderFilterPanel = isWideViewport || isFilterPanelOpen;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="akyo-card p-8 text-center space-y-4">
          <div className="text-6xl">😢</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('error.title', lang)}
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
            {t('loading.text', lang)}
          </h2>
          <p className="text-[var(--text-secondary)]">{t('loading.subtext', lang)}</p>
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
              src={LOGO_BY_LANG[lang] || LOGO_BY_LANG.default}
              alt={t('logo.alt', lang)}
              width={1980}
              height={305}
              className="logo-animation h-10 sm:h-12 w-auto"
            />
          </Link>

          {/* 統計情報 */}
          <div className="flex gap-2 sm:gap-4 text-sm sm:text-base font-bold text-white">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {t('stats.total', lang).replace('{count}', String(stats.total))}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
              {t('stats.displayed', lang).replace('{count}', String(stats.displayed))}
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
            placeholder={t('search.placeholder', lang)}
            ariaLabel={t('search.ariaLabel', lang)}
            clearAriaLabel={t('search.clearAriaLabel', lang)}
          />
        </div>

        {/* フィルターとビュー切替 */}
        <div className="akyo-card p-4 sm:p-6 space-y-4">
          <div className="sm:hidden space-y-2">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((current) => !current)}
              aria-expanded={isFilterPanelOpen}
              aria-controls="zukan-filter-panel"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-sm transition-colors hover:bg-gray-50"
            >
              {isFilterPanelOpen ? t('filter.panelHide', lang) : t('filter.panelShow', lang)}
            </button>
            {!isFilterPanelOpen ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {t('filter.panelSummary', lang).replace('{count}', String(activeFilterCount))}
              </p>
            ) : null}
          </div>

          {shouldRenderFilterPanel ? (
            <div id="zukan-filter-panel">
              <FilterPanel
                // 動的に更新されるカテゴリ/作者を使用
                attributes={currentCategories || categories || attributes}
                creators={currentAuthors || authors || creators}
                selectedAttributes={selectedAttributes}
                selectedCreators={selectedCreators}
                categoryMatchMode={categoryMatchMode}
                selectedCreator={selectedCreators[0] || ''}
                onAttributesChange={setSelectedAttributes}
                onCreatorsChange={setSelectedCreators}
                onCategoryMatchModeChange={setCategoryMatchMode}
                onCreatorChange={(creator) => setSelectedCreators(creator ? [creator] : [])}
                onSortToggle={handleSortToggle}
                onRandomClick={handleRandomClick}
                onFavoritesClick={handleFavoritesClick}
                favoritesOnly={favoritesOnly}
                sortAscending={sortAscending}
                randomMode={randomMode}
                lang={lang}
              />
            </div>
          ) : null}

          {/* ビュー切替 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label={t('view.grid', lang)}
            >
              <IconGrid size="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label={t('view.list', lang)}
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
              {t('notfound.title', lang)}
            </h3>
            <p className="text-[var(--text-secondary)]">{t('notfound.message', lang)}</p>
          </div>
        ) : viewMode === 'list' ? (
          <AkyoList
            data={filteredData.slice(0, renderLimit)}
            lang={lang}
            onToggleFavorite={toggleFavorite}
            onShowDetail={handleShowDetail}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredData.slice(0, renderLimit).map((akyo) => (
              <AkyoCard
                key={akyo.id}
                akyo={akyo}
                lang={lang}
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
        lang={lang}
      />

      {/* Language Toggle Button - Top */}
      <LanguageToggle initialLang={lang} />

      {/* Admin Settings Button - Below Language Toggle (same color as Language Toggle) */}
      <Link
        href="/admin"
        className="admin-button group"
        aria-label={t('admin.panel', lang)}
        title={t('admin.panel', lang)}
      >
        <IconCog
          size="w-5 h-5 sm:w-6 sm:h-6"
          className="group-hover:rotate-90 transition-transform duration-300"
        />
      </Link>

      {/* AI Chat Assistant (Dify embed) */}
      <div id="dify-chatbot-container" className="fixed bottom-6 right-6 z-[2147483647]" />
    </div>
  );
}
