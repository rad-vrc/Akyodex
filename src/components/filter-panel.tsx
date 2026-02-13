'use client';

import { IconDice, IconHeart, IconSortAsc, IconSortDesc } from '@/components/icons';
import { t, type SupportedLanguage } from '@/lib/i18n';

interface FilterPanelProps {
  // 新フィールド（オプショナル）
  categories?: string[];
  authors?: string[];

  // 旧フィールド（互換性維持、必須のまま）
  attributes: string[];
  creators: string[];
  
  selectedAttribute?: string; // 選択状態のプロップス名は今回は維持
  selectedCreator?: string;
  onAttributeChange: (attribute: string) => void;
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
  const handleAttributeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onAttributeChange(e.target.value);
  };

  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCreatorChange(e.target.value);
  };

  // 新旧フィールドのマージ（新フィールド優先）
  const displayCategories = categories || attributes;
  const displayAuthors = authors || creators;

  return (
    <div className="space-y-4">
      {/* ドロップダウン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select
          id="attributeFilter"
          value={selectedAttribute ?? ''}
          onChange={handleAttributeChange}
          className="w-full"
          aria-label={t('filter.category', lang)}
        >
          <option value="">{t('filter.allCategories', lang)}</option>
          {displayCategories.map(attr => (
            <option key={attr} value={attr}>
              {attr}
            </option>
          ))}
        </select>
        
        <select
          id="creatorFilter"
          value={selectedCreator ?? ''}
          onChange={handleCreatorChange}
          className="w-full"
          aria-label={t('filter.author', lang)}
        >
          <option value="">{t('filter.allAuthors', lang)}</option>
          {displayAuthors.map(creator => (
            <option key={creator} value={creator}>
              {creator}
            </option>
          ))}
        </select>
      </div>

      {/* クイックフィルターボタン */}
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
