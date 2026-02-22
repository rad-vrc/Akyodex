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
import { SearchBar } from '@/components/search-bar';
import { useAkyoData } from '@/hooks/use-akyo-data';
import { useLanguage } from '@/hooks/use-language';
import { t, type SupportedLanguage } from '@/lib/i18n';
import type { AkyoData, ViewMode } from '@/types/akyo';
import dynamic from 'next/dynamic';
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

const DeferredMiniAkyoBg = dynamic(
  () => import('@/components/mini-akyo-bg').then((mod) => mod.MiniAkyoBg),
  { ssr: false }
);

// Virtual scrolling constants
const MOBILE_BREAKPOINT = 768;
const DESKTOP_RENDER_LIMIT = 20;
const MOBILE_RENDER_LIMIT = 12;
const RENDER_CHUNK = 30;
const PRIORITY_CARD_COUNT = 2;
const MINI_AKYO_BG_DELAY_MS = 2500;

function useResponsiveLayout() {
  const [layout, setLayout] = useState({ isMobile: true, gridCols: 5 });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      const initIsMobile = w <= MOBILE_BREAKPOINT;
      setLayout({
        isMobile: initIsMobile,
        gridCols: initIsMobile ? 1 : w >= 1024 ? 5 : w >= 768 ? 3 : 2
      });
    };
    handler();

    let timeoutId: number;
    const debouncedHandler = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handler, 150);
    };

    window.addEventListener('resize', debouncedHandler);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedHandler);
    };
  }, []);

  return layout;
}

interface LanguageDatasetCacheEntry {
  items: AkyoData[];
  categories: string[];
  authors: string[];
}

function normalizeAkyoItem(item: unknown): AkyoData | undefined {
  if (!item || typeof item !== 'object') return undefined;

  const raw = item as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const avatarName = typeof raw.avatarName === 'string' ? raw.avatarName.trim() : '';
  if (!id || !avatarName) return undefined;

  const category =
    typeof raw.category === 'string'
      ? raw.category
      : typeof raw.attribute === 'string'
        ? raw.attribute
        : '';
  const comment =
    typeof raw.comment === 'string'
      ? raw.comment
      : typeof raw.notes === 'string'
        ? raw.notes
        : '';
  const author =
    typeof raw.author === 'string'
      ? raw.author
      : typeof raw.creator === 'string'
        ? raw.creator
        : '';
  const parsedCategory = Array.isArray(raw.parsedCategory)
    ? raw.parsedCategory.filter((value): value is string => typeof value === 'string')
    : undefined;
  const parsedAuthor = Array.isArray(raw.parsedAuthor)
    ? raw.parsedAuthor.filter((value): value is string => typeof value === 'string')
    : undefined;

  return {
    id,
    appearance: typeof raw.appearance === 'string' ? raw.appearance : '',
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
    avatarName,
    category,
    comment,
    author,
    attribute: category,
    notes: comment,
    creator: author,
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : '',
    isFavorite: typeof raw.isFavorite === 'boolean' ? raw.isFavorite : undefined,
    parsedCategory: parsedCategory && parsedCategory.length > 0 ? parsedCategory : undefined,
    parsedAuthor: parsedAuthor && parsedAuthor.length > 0 ? parsedAuthor : undefined,
  };
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
  const [renderLimit, setRenderLimit] = useState(MOBILE_RENDER_LIMIT);
  const { isMobile, gridCols } = useResponsiveLayout();
  const [isMiniAkyoBgEnabled, setIsMiniAkyoBgEnabled] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  const languageDatasetCacheRef = useRef<Map<SupportedLanguage, LanguageDatasetCacheEntry>>(
    new Map([[serverLang, { items: initialData, categories, authors }]])
  );
  const tickingRef = useRef(false);
  const filteredLengthRef = useRef(0);
  const dataLengthRef = useRef(data.length);

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
  const isLanguageRefetching = loading && needsRefetch && data.length > 0;
  const languageStatusMessage = refetchError
    ? refetchError
    : isLanguageRefetching
      ? t('loading.subtext', lang)
      : null;

  // Sync server-rendered language payload to cache
  useEffect(() => {
    languageDatasetCacheRef.current.set(serverLang, {
      items: initialData,
      categories,
      authors,
    });
  }, [serverLang, initialData, categories, authors]);

  // Clear stale refetch status when language returns to server-rendered baseline.
  useEffect(() => {
    if (lang === serverLang) {
      setRefetchError(null);
    }
  }, [lang, serverLang]);

  // Refetch data when language differs from server-rendered language
  useEffect(() => {
    if (!isReady || !needsRefetch || lang === serverLang) return;

    const cachedDataset = languageDatasetCacheRef.current.get(lang);
    if (cachedDataset) {
      refetchWithNewData(cachedDataset.items);
      setCurrentCategories(cachedDataset.categories);
      setCurrentAuthors(cachedDataset.authors);
      setRefetchError(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchLanguageData = async () => {
      setLoading(true);
      setError(null);
      setRefetchError(null);
      try {
        // Route language-switch requests through server API so
        // KV → JSON → CSV fallback strategy stays centralized.
        const response = await fetch(`/api/akyo-data?lang=${encodeURIComponent(lang)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch data (${response.status})`);
        }

        const jsonData: unknown = await response.json();
        const wrappedData =
          jsonData && typeof jsonData === 'object'
            ? (jsonData as Record<string, unknown>).data
            : undefined;
        const akyoItems: AkyoData[] | undefined = Array.isArray(wrappedData)
          ? wrappedData
            .map(normalizeAkyoItem)
            .filter((item): item is AkyoData => item !== undefined)
          : undefined;
        if (!akyoItems) {
          // Sanitized summary — only safe metadata, no raw content
          const payloadType = jsonData === null ? 'null'
            : typeof jsonData === 'object' ? `object(keys:${Object.keys(jsonData as Record<string, unknown>).length})`
              : typeof jsonData;

          throw new Error(
            `[ZukanClient] Empty or invalid JSON: expected { data: AkyoData[] } with items, got ${payloadType}`
          );
        }

        if (akyoItems.length === 0) {
          console.warn('[ZukanClient] Empty language payload, keeping existing dataset.');
          setRefetchError(t('error.languageUnavailable', lang));
          return;
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
        const message = err instanceof Error ? err.message : t('error.title', lang);
        if (dataLengthRef.current > 0) {
          setRefetchError(message);
          return;
        }
        setError(message);
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

  // Initial mount optimizations: responsive render limit and defer heavy bg
  useEffect(() => {
    // 1. Dynamic rendering limit for mobile vs desktop
    if (!isMobile) {
      setRenderLimit(DESKTOP_RENDER_LIMIT);
    }

    // 2. Delay or disable MiniAkyoBg depending on device
    // Consider it disabled completely on mobile to save CPU rendering.
    let timer: number | undefined;
    if (!isMobile) {
      timer = window.setTimeout(() => {
        setIsMiniAkyoBgEnabled(true);
      }, MINI_AKYO_BG_DELAY_MS);
    } else {
      setIsMiniAkyoBgEnabled(false);
    }

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [isMobile]);

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
    setRenderLimit(isMobile ? MOBILE_RENDER_LIMIT : DESKTOP_RENDER_LIMIT);
  }, [
    searchQuery,
    selectedAttributes,
    categoryMatchMode,
    selectedCreators,
    favoritesOnly,
    sortAscending,
    randomMode,
    isMobile,
  ]);

  // Keep filteredData.length in a ref so handleScroll stays stable
  useEffect(() => {
    filteredLengthRef.current = filteredData.length;
  }, [filteredData.length]);

  // Keep latest renderable-data state for non-blocking refetch failures.
  useEffect(() => {
    dataLengthRef.current = data.length;
  }, [data.length]);

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

  // Fallback only when we have no data to keep rendering.
  if (loading && needsRefetch && data.length === 0) {
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
      {isMiniAkyoBgEnabled ? <DeferredMiniAkyoBg /> : null}

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
              unoptimized
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
        <div className="fixed left-4 right-4 top-20 z-[80] pointer-events-none sm:left-auto sm:right-6 sm:top-24 sm:w-[420px]">
          <div role="status" aria-live="polite" aria-atomic="true">
            {languageStatusMessage ? (
              <div
                className={`rounded-xl px-4 py-3 text-sm shadow-sm ${refetchError
                  ? 'border border-amber-300 bg-amber-50/95 text-amber-900'
                  : 'border border-sky-300 bg-sky-50/95 text-sky-900'
                  }`}
              >
                {languageStatusMessage}
              </div>
            ) : null}
          </div>
        </div>

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
              categories={currentCategories}
              authors={currentAuthors}
              // TODO: Remove legacy props once FilterPanel fully drops attribute/creator support.
              attributes={currentCategories}
              creators={currentAuthors}
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6"
            style={{
              minHeight: (!isMobile && filteredData.length > 0)
                // 420px card height + 24px gap = 444px per row
                ? `${Math.ceil(Math.min(filteredData.length, DESKTOP_RENDER_LIMIT) / gridCols) * 444 - 24}px`
                : undefined
            }}
          >
            {filteredData.slice(0, renderLimit).map((akyo, index) => (
              <AkyoCard
                key={akyo.id}
                akyo={akyo}
                lang={lang}
                onToggleFavorite={toggleFavorite}
                onShowDetail={handleShowDetail}
                priority={index < PRIORITY_CARD_COUNT}
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
