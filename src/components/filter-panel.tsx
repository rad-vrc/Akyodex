'use client';

interface FilterPanelProps {
  attributes: string[];
  creators: string[];
  selectedAttribute?: string;
  selectedCreator?: string;
  onAttributeChange: (attribute: string) => void;
  onCreatorChange: (creator: string) => void;
  onSortToggle: () => void;
  onRandomClick: () => void;
  onFavoritesClick: () => void;
  favoritesOnly: boolean;
  sortAscending: boolean;
  randomMode: boolean;
  lang?: 'ja' | 'en';
}

export function FilterPanel({
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

  return (
    <div className="space-y-4">
      {/* ドロップダウン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select
          id="attributeFilter"
          value={selectedAttribute ?? ''}
          onChange={handleAttributeChange}
          className="w-full"
          aria-label={lang === 'en' ? 'Filter by attribute' : '属性で絞り込み'}
        >
          <option value="">{lang === 'en' ? 'All Attributes' : 'すべての属性'}</option>
          {attributes.map(attr => (
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
          aria-label={lang === 'en' ? 'Filter by creator' : '作者で絞り込み'}
        >
          <option value="">{lang === 'en' ? 'All Creators' : 'すべての作者'}</option>
          {creators.map(creator => (
            <option key={creator} value={creator}>
              {creator}
            </option>
          ))}
        </select>
      </div>

      {/* クイックフィルターボタン */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={onSortToggle}
          aria-pressed={sortAscending}
          aria-label={lang === 'en'
            ? (sortAscending ? 'Sort ascending' : 'Sort descending')
            : (sortAscending ? '昇順に並び替え' : '降順に並び替え')}
          className={`attribute-badge quick-filter-badge transition-colors ${
            sortAscending
              ? 'bg-green-200 text-green-800 hover:bg-green-300'
              : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
          }`}
        >
          <i className={`fas fa-arrow-${sortAscending ? 'up' : 'down'}-${sortAscending ? '1-9' : '9-1'}`}></i>{' '}
          {lang === 'en' ? (sortAscending ? 'Ascending' : 'Descending') : (sortAscending ? '昇順' : '降順')}
        </button>
        
        <button
          onClick={onRandomClick}
          aria-pressed={randomMode}
          aria-label={lang === 'en' ? 'Toggle random mode' : 'ランダム表示の切り替え'}
          className={`attribute-badge quick-filter-badge transition-colors ${
            randomMode
              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <i className="fas fa-dice"></i> {lang === 'en' ? 'Random' : 'ランダム表示'}
        </button>
        
        <button
          onClick={onFavoritesClick}
          aria-pressed={favoritesOnly}
          aria-label={lang === 'en' ? 'Show favorites only' : 'お気に入りのみ表示'}
          className={`attribute-badge quick-filter-badge transition-colors ${
            favoritesOnly
              ? 'bg-pink-200 text-pink-800 hover:bg-pink-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <i className="fas fa-heart"></i> {lang === 'en' ? 'Favorites Only' : 'お気に入りのみ'}
        </button>
      </div>
    </div>
  );
}
