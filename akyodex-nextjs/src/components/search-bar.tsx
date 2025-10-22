'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = '名前・作者・属性で検索...' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative w-full">
      {/* 検索アイコン */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">
        🔍
      </div>

      {/* 検索入力 */}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="search-input w-full"
        aria-label="Akyo検索"
        autoComplete="off"
        spellCheck="false"
      />

      {/* クリアボタン */}
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl hover:scale-110 transition-transform"
          aria-label="検索をクリア"
        >
          ❌
        </button>
      )}
    </div>
  );
}
