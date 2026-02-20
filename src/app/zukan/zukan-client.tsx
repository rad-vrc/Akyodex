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

const MULTI_VALUE_SPLIT_PATTERN = /[、,]/;

// Virtual scrolling constants
const INITIAL_RENDER_COUNT = 60;
const RENDER_CHUNK = 60;

interface LanguageDatasetCacheEntry {
  items: AkyoData[];
  categories: string[];
  authors: string[];
}

function extractTaxonomy(
  akyoItems: AkyoData[]
): Pick<LanguageDatasetCacheEntry, 'categories' | 'authors'> {
  const uniqueCategories = new Set<string>();
  const uniqueAuthors = new Set<string>();

  for (const item of akyoItems) {
    const cats = (item.category || item.attribute || '')
      .split(MULTI_VALUE_SPLIT_PATTERN)
      .map((s) => s.trim())
      .filter(Boolean);
    const auths = (item.author || item.creator || '')
      .split(MULTI_VALUE_SPLIT_PATTERN)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const category of cats) {
      uniqueCategories.add(category);
    }
    for (const author of auths) {
      uniqueAuthors.add(author);
    }
  }

  return {
    categories: Array.from(uniqueCategories).sort(),
    authors: Array.from(uniqueAuthors).sort(),
  };
}

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

  // — State —
  const [currentCategories, setCurrentCategories] = useState(categories);
  const [currentAuthors, setCurrentAuthors] = useState(authors);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [categoryMatchMode, setCategoryMatchMode] = useState<'or' | 'and'>('or');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [randomMode, setRandomMode] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedAkyo, setSelectedAkyo] = useState<AkyoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT);

  const languageDatasetCacheRef = useRef<Map<SupportedLanguage, LanguageDatasetCacheEntry>>(
    new Map([[serverLang, { items: initialData, categories, authors }]])
  );
  const tickingRef = useRef(false);
  const filteredLengthRef = useRef(0);

  // — Derived values —
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

  // Sync server-rendered language payload to cache
  useEffect(() => {
    languageDatasetCacheRef.current.set(serverLang, {
      items: initialData,
      categories,
      authors,
    });
  }, [serverLang, initialData, categories, authors]);

  // Refetch data when language differs from server-rendered language
  useEffect(() => {
    if (!isReady || !needsRefetch || lang === serverLang) return;

    const cachedDataset = languageDatasetCacheRef.current.get(lang);
    if (cachedDataset) {
      refetchWithNewData(cachedDataset.items);
      setCurrentCategories(cachedDataset.categories);
      setCurrentAuthors(cachedDataset.authors);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchLanguageData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch JSON data for the detected language from CDN
        const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
        const response = await fetch(`${r2Base}/data/akyo-data-${lang}.json`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch data');

        const jsonData: unknown = await response.json();
        const wrappedData =
          jsonData && typeof jsonData === 'object'
            ? (jsonData as Record<string, unknown>).data
            : undefined;
        // Handle both array format and wrapped format ({ data: [...] })
        const akyoItems: AkyoData[] | undefined = Array.isArray(jsonData)
          ? (jsonData as AkyoData[])
          : Array.isArray(wrappedData)
            ? (wrappedData as AkyoData[])
            : undefined;
        if (!akyoItems) {
          // Sanitized summary — only safe metadata, no raw content
          const payloadType = jsonData === null ? 'null'
            : Array.isArray(jsonData) ? `array(${(jsonData as unknown[]).length})`
            : typeof jsonData === 'object' ? `object(keys:${Object.keys(jsonData as Record<string, unknown>).length})`
            : typeof jsonData;

          throw new Error(
            `[ZukanClient] Invalid JSON format: expected AkyoData[] or { data: AkyoData[] }, got ${payloadType}`
          );
        }

        if (cancelled) return;

        refetchWithNewData(akyoItems);
        const taxonomy = extractTaxonomy(akyoItems);
        setCurrentCategories(taxonomy.categories);
        setCurrentAuthors(taxonomy.authors);
        languageDatasetCacheRef.current.set(lang, {
          items: akyoItems,
          categories: taxonomy.categories,
          authors: taxonomy.authors,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[ZukanClient] Failed to refetch language data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchLanguageData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isReady, needsRefetch, lang, serverLang, refetchWithNewData, setLoading, setError]);

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
    // Optimistically update modal state and let data-sync effect reconcile with source data.
    setSelectedAkyo((prev) =>
      prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev
    );
  };

  // data が更新された際（cross-tab sync 等）、モーダルが開いていれば selectedAkyo を最新に同期
  useEffect(() => {
    if (!isModalOpen) return;
    setSelectedAkyo((prev) => {
      if (!prev) return prev;
      const latest = data.find((a) => a.id === prev.id);
      if (latest && latest.isFavorite !== prev.isFavorite) return latest;
      return prev;
    });
  }, [data, isModalOpen]);

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

  // Keep filteredData.length in a ref so handleScroll stays stable
  useEffect(() => {
    filteredLengthRef.current = filteredData.length;
  }, [filteredData.length]);

  // Virtual scrolling: Infinite scroll handler (stable — no state/derived deps)
  const handleScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 800;
      if (nearBottom) {
        const len = filteredLengthRef.current;
        setRenderLimit((prev) => (prev < len ? Math.min(len, prev + RENDER_CHUNK) : prev));
      }
      tickingRef.current = false;
    });
  }, []);

  // Attach scroll listener (runs once thanks to stable handleScroll)
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    setSortAscending((prev) => !prev);
  };

  // ランダム表示
  const handleRandomClick = () => {
    if (randomMode) {
      setRandomMode(false);
    } else {
      setRandomMode(true);
      // フィルタ状態をリセットしてからランダムフィルタを適用
      setSearchQuery('');
      setSelectedAttributes([]);
      setCategoryMatchMode('or');
      setSelectedCreators([]);
      setFavoritesOnly(false);
      filterData(
        {
          searchQuery: '',
          randomCount: 20,
        },
        sortAscending
      );
    }
  };

  // お気に入りフィルター切替
  const handleFavoritesClick = () => {
    setFavoritesOnly((prev) => !prev);
  };

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
              preload
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 640px) 260px, 320px"
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

          <div id="zukan-filter-panel" className={isFilterPanelOpen ? 'block sm:block' : 'hidden sm:block'}>
            <FilterPanel
              // 動的に更新されるカテゴリ/作者を使用
              categories={currentCategories || categories || attributes}
              authors={currentAuthors || authors || creators}
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
