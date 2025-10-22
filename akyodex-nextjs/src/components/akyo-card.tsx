'use client';

import Image from 'next/image';
import type { AkyoData } from '@/types/akyo';

interface AkyoCardProps {
  akyo: AkyoData;
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

export function AkyoCard({ akyo, onToggleFavorite, onShowDetail }: AkyoCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(akyo.id);
  };

  const handleCardClick = () => {
    onShowDetail?.(akyo);
  };

  return (
    <div className="akyo-card cursor-pointer" onClick={handleCardClick}>
      {/* 画像 */}
      <div className="relative w-full aspect-[3/2] bg-gray-100">
        <Image
          src={`https://images.akyodex.com/images/${akyo.id}.webp`}
          alt={akyo.avatarName || akyo.nickname}
          fill
          className="object-cover"
          loading="lazy"
          onError={(e) => {
            // フォールバック画像
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder.webp';
          }}
        />
        
        {/* お気に入りボタン */}
        <button
          onClick={handleFavoriteClick}
          className="favorite-btn absolute top-2 right-2 z-10"
          aria-label={akyo.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
        >
          {akyo.isFavorite ? '⭐' : '☆'}
        </button>
      </div>

      {/* カード情報 */}
      <div className="p-4 space-y-2">
        {/* ID */}
        <div className="text-sm font-bold text-[var(--primary-blue)]">
          No. {akyo.id}
        </div>

        {/* 名前 */}
        <h3 className="text-lg font-bold text-[var(--text-primary)] line-clamp-1">
          {akyo.nickname || akyo.avatarName}
        </h3>

        {/* アバター名（ニックネームがある場合） */}
        {akyo.nickname && (
          <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
            {akyo.avatarName}
          </p>
        )}

        {/* 属性 */}
        {akyo.attribute && (
          <div className="flex flex-wrap gap-1">
            {akyo.attribute.split(',').map((attr, index) => (
              <span
                key={index}
                className="attribute-badge text-xs px-2 py-1"
              >
                {attr.trim()}
              </span>
            ))}
          </div>
        )}

        {/* 作者 */}
        <div className="text-sm text-[var(--text-secondary)]">
          作者: <span className="font-semibold">{akyo.creator}</span>
        </div>

        {/* 詳細を見るボタン */}
        <button
          onClick={handleCardClick}
          className="detail-button w-full mt-2"
        >
          <span className="animate-bounce inline-block">✨</span>
          詳細を見る
          <span className="animate-bounce inline-block">✨</span>
        </button>
      </div>
    </div>
  );
}
