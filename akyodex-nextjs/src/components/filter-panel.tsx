'use client';

import { useState } from 'react';

interface FilterPanelProps {
  attributes: string[];
  creators: string[];
  onAttributeChange: (attribute: string) => void;
  onCreatorChange: (creator: string) => void;
  onSortToggle: () => void;
  onRandomClick: () => void;
  onFavoritesClick: () => void;
  favoritesOnly: boolean;
  sortAscending: boolean;
  randomMode: boolean;
}

export function FilterPanel({
  attributes,
  creators,
  onAttributeChange,
  onCreatorChange,
  onSortToggle,
  onRandomClick,
  onFavoritesClick,
  favoritesOnly,
  sortAscending,
  randomMode,
}: FilterPanelProps) {
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');

  const handleAttributeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAttribute(value);
    onAttributeChange(value);
  };

  const handleCreatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCreator(value);
    onCreatorChange(value);
  };

  return (
    <div className="space-y-4">
      {/* ドロップダウン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select
          id="attributeFilter"
          value={selectedAttribute}
          onChange={handleAttributeChange}
          className="w-full"
        >
          <option value="">すべての属性</option>
          {attributes.map(attr => (
            <option key={attr} value={attr}>
              {attr}
            </option>
          ))}
        </select>
        
        <select
          id="creatorFilter"
          value={selectedCreator}
          onChange={handleCreatorChange}
          className="w-full"
        >
          <option value="">すべての作者</option>
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
          className={`attribute-badge quick-filter-badge transition-colors ${
            sortAscending
              ? 'bg-green-200 text-green-800 hover:bg-green-300'
              : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
          }`}
        >
          <i className={`fas fa-arrow-${sortAscending ? 'up' : 'down'}-${sortAscending ? '1-9' : '9-1'}`}></i>{' '}
          {sortAscending ? '昇順' : '降順'}
        </button>
        
        <button
          onClick={onRandomClick}
          className={`attribute-badge quick-filter-badge transition-colors ${
            randomMode
              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <i className="fas fa-dice"></i> ランダム表示
        </button>
        
        <button
          onClick={onFavoritesClick}
          className={`attribute-badge quick-filter-badge transition-colors ${
            favoritesOnly
              ? 'bg-pink-200 text-pink-800 hover:bg-pink-300'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <i className="fas fa-heart"></i> お気に入りのみ
        </button>
      </div>
    </div>
  );
}
