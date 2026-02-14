'use client';

import {
  IconDice,
  IconHeart,
  IconSortAsc,
  IconSortDesc,
  IconSparkles,
  IconTag,
} from '@/components/icons';
import { t, type SupportedLanguage } from '@/lib/i18n';
import { useMemo, useState } from 'react';

interface FilterPanelProps {
  // 新フィールド（オプショナル）
  categories?: string[];
  authors?: string[];

  // 旧フィールド（互換性維持、必須のまま）
  attributes: string[];
  creators: string[];

  // 新しいカテゴリ選択
  selectedAttributes?: string[];
  categoryMatchMode?: 'or' | 'and';
  onAttributesChange?: (attributes: string[]) => void;
  onCategoryMatchModeChange?: (mode: 'or' | 'and') => void;

  // 旧フィールド（互換）
  selectedAttribute?: string;
  selectedCreator?: string;
  onAttributeChange?: (attribute: string) => void;
  onCreatorChange: (creator: string) => void;

  onSortToggle: () => void;
  onRandomClick: () => void;
  onFavoritesClick: () => void;
  favoritesOnly: boolean;
  sortAscending: boolean;
  randomMode: boolean;
  lang?: SupportedLanguage;
}

export function FilterPanel({
  categories,
  authors,
  attributes,
  creators,
  selectedAttributes,
  categoryMatchMode = 'or',
  onAttributesChange,
  onCategoryMatchModeChange,
  selectedAttribute,
  selectedCreator,
  onAttributeChange,
  onCreatorChange,
  onSortToggle,
  onRandomClick,
  onFavoritesClick,
  favoritesOnly,
  sortAscending,
  randomMode,
  lang = 'ja',
}: FilterPanelProps) {
  const [categoryQuery, setCategoryQuery] = useState('');

  const displayCategories = categories || attributes;
  const displayAuthors = authors || creators;
  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase();
  const activeCategories = selectedAttributes?.length
    ? selectedAttributes
    : selectedAttribute
      ? [selectedAttribute]
      : [];

  const filteredCategories = useMemo(() => {
    if (!normalizedCategoryQuery) return displayCategories;
    return displayCategories.filter((category) =>
      category.toLowerCase().includes(normalizedCategoryQuery)
    );
  }, [displayCategories, normalizedCategoryQuery]);

  const setCategories = (nextCategories: string[]) => {
    if (onAttributesChange) {
      onAttributesChange(nextCategories);
      return;
    }
    onAttributeChange?.(nextCategories[0] || '');
  };

  const toggleCategory = (category: string) => {
    if (activeCategories.includes(category)) {
      setCategories(activeCategories.filter((value) => value !== category));
      return;
    }
    setCategories([...activeCategories, category]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-orange-600 flex items-center gap-2">
              <IconSparkles size="w-4 h-4" />
              {t('filter.category', lang)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategories([])}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                  aria-label={t('filter.clearCategories', lang)}
                >
                  {t('filter.clearCategories', lang)}
                </button>
              )}
              {onCategoryMatchModeChange && (
                <div
                  className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200"
                  role="radiogroup"
                  aria-label={`${t('filter.matchOr', lang)} / ${t('filter.matchAnd', lang)}`}
                >
                  <button
                    type="button"
                    role="radio"
                    onClick={() => onCategoryMatchModeChange('or')}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      categoryMatchMode === 'or'
                        ? 'bg-blue-200 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-checked={categoryMatchMode === 'or'}
                    aria-label={t('filter.matchOr', lang)}
                  >
                    {t('filter.matchOr', lang)}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    onClick={() => onCategoryMatchModeChange('and')}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      categoryMatchMode === 'and'
                        ? 'bg-green-200 text-green-900'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-checked={categoryMatchMode === 'and'}
                    aria-label={t('filter.matchAnd', lang)}
                  >
                    {t('filter.matchAnd', lang)}
                  </button>
                </div>
              )}
            </div>
          </div>

          <input
            type="text"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--primary-green)] bg-white px-3 py-2 text-sm font-semibold"
            placeholder={t('filter.categorySearch', lang)}
            aria-label={t('filter.categorySearch', lang)}
          />

          <div className="flex flex-wrap gap-2 min-h-8">
            {activeCategories.length === 0 ? (
              <span className="text-xs text-[var(--text-secondary)]">
                {t('filter.noneSelected', lang)}
              </span>
            ) : (
              activeCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="attribute-badge bg-green-100 text-green-900 hover:bg-green-200"
                  aria-label={`${category} ${t('filter.removeCategory', lang)}`}
                >
                  <IconTag size="w-3 h-3" /> {category} ×
                </button>
              ))
            )}
          </div>

          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
            {filteredCategories.length === 0 ? (
              <div className="px-2 py-3 text-xs text-[var(--text-secondary)]">
                {t('filter.noCategoryMatch', lang)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCategories.map((category) => {
                  const selected = activeCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`text-left rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                        selected
                          ? 'bg-green-100 text-green-900 border-green-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                      aria-pressed={selected}
                    >
                      {selected ? `✓ ${category}` : category}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <label htmlFor="creatorFilter" className="font-bold text-[var(--text-primary)] block">
            {t('filter.author', lang)}
          </label>
          <select
            id="creatorFilter"
            value={selectedCreator ?? ''}
            onChange={(e) => onCreatorChange(e.target.value)}
            className="w-full"
            aria-label={t('filter.author', lang)}
          >
            <option value="">{t('filter.allAuthors', lang)}</option>
            {displayAuthors.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </select>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={onSortToggle}
          aria-pressed={sortAscending}
          aria-label={t('filter.sortToggle', lang)}
          className={`attribute-badge quick-filter-badge transition-colors ${
            sortAscending
              ? 'bg-green-200 text-green-800 hover:bg-green-300'
              : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
          }`}
        >
          {sortAscending ? <IconSortAsc size="w-4 h-4" /> : <IconSortDesc size="w-4 h-4" />}{' '}
          {sortAscending ? t('filter.ascending', lang) : t('filter.descending', lang)}
        </button>

        <button
          type="button"
          onClick={onRandomClick}
          aria-pressed={randomMode}
          aria-label={t('filter.randomToggle', lang)}
          className={`attribute-badge quick-filter-badge transition-colors ${
            randomMode
              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <IconDice size="w-4 h-4" /> {t('filter.random', lang)}
        </button>

        <button
          type="button"
          onClick={onFavoritesClick}
          aria-pressed={favoritesOnly}
          aria-label={t('filter.favoritesToggle', lang)}
          className={`attribute-badge quick-filter-badge transition-colors ${
            favoritesOnly
              ? 'bg-pink-200 text-pink-800 hover:bg-pink-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <IconHeart size="w-4 h-4" /> {t('filter.favorites', lang)}
        </button>
      </div>
    </div>
  );
}
