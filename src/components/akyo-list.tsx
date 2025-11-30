'use client';

import Image from 'next/image';
import { memo, useMemo, useState, useCallback } from 'react';
import type { AkyoData } from '@/types/akyo';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';
import { generateBlurDataURL } from '@/lib/blur-data-url';

interface AkyoListProps {
  data: AkyoData[];
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

// カテゴリに対応する色を取得
function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    チョコミント: '#00bfa5',
    動物: '#ff6f61',
    きつね: '#ff9800',
    おばけ: '#9c27b0',
    人類: '#2196f3',
    ギミック: '#4caf50',
    特殊: '#e91e63',
    ネコ: '#795548',
    イヌ: '#607d8b',
    うさぎ: '#ff4081',
    ドラゴン: '#673ab7',
    ロボット: '#757575',
    食べ物: '#ffc107',
    植物: '#8bc34a',
    宇宙: '#3f51b5',
    和風: '#d32f2f',
    洋風: '#1976d2',
    ファンタジー: '#ab47bc',
    SF: '#00acc1',
    ホラー: '#424242',
    かわいい: '#ec407a',
    クール: '#5c6bc0',
    シンプル: '#78909c',
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (category && category.includes(key)) {
      return color;
    }
  }

  const defaultColors = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#f5576c',
    '#4facfe',
  ];
  
  return defaultColors[Math.floor(Math.random() * defaultColors.length)];
}

// 個別の行コンポーネントをmemo化
const AkyoListRow = memo(function AkyoListRow({ 
  akyo, 
  onToggleFavorite, 
  onShowDetail 
}: { 
  akyo: AkyoData; 
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const blurDataURL = useMemo(() => generateBlurDataURL(akyo.id), [akyo.id]);
  const imageUrl = useMemo(
    () => buildAvatarImageUrl(akyo.id, akyo.avatarUrl, 96),
    [akyo.id, akyo.avatarUrl]
  );
  
  const category = akyo.category || akyo.attribute || '';
  const author = akyo.author || akyo.creator || '';
  
  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(akyo.id);
  }, [akyo.id, onToggleFavorite]);
  
  const handleDetailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetail?.(akyo);
  }, [akyo, onShowDetail]);
  
  return (
    <tr>
      {/* No. */}
      <td className="font-mono text-sm">#{akyo.id}</td>

      {/* 見た目 */}
      <td>
        <div className="list-image-wrapper relative overflow-hidden">
          <Image
            src={imageError ? '/images/placeholder.webp' : imageUrl}
            alt={akyo.avatarName || akyo.nickname}
            width={48}
            height={48}
            className={`object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            unoptimized
            placeholder="blur"
            blurDataURL={blurDataURL}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
          {!imageLoaded && (
            <div 
              className="absolute inset-0 animate-pulse"
              style={{ backgroundImage: `url(${blurDataURL})`, backgroundSize: 'cover' }}
            />
          )}
        </div>
      </td>

      {/* 名前 */}
      <td>
        <div className="font-medium text-[var(--text-primary)]">
          {akyo.nickname || akyo.avatarName}
        </div>
        {akyo.nickname && akyo.avatarName && (
          <div className="text-xs text-[var(--text-secondary)]">
            {akyo.avatarName}
          </div>
        )}
      </td>

      {/* カテゴリ */}
      <td>
        <div className="flex flex-wrap gap-1">
          {category.split(/[、,]/).map((cat, index) => {
            const trimmedCat = cat.trim();
            const color = getCategoryColor(trimmedCat);
            return (
              <span
                key={index}
                className="attribute-badge"
                style={{
                  background: `${color}20`,
                  color: color,
                  boxShadow: `0 6px 12px ${color}20`
                }}
              >
                {trimmedCat}
              </span>
            );
          })}
        </div>
      </td>

      {/* 作者 */}
      <td className="text-sm text-[var(--text-secondary)]">
        {author}
      </td>

      {/* アクション */}
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          {/* お気に入りボタン */}
          <button
            onClick={handleFavoriteClick}
            className="list-action-btn"
            aria-label={akyo.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
          >
            <span className="list-favorite-icon">
              {akyo.isFavorite ? '❤️' : '🤍'}
            </span>
          </button>

          {/* 詳細ボタン */}
          <button
            onClick={handleDetailClick}
            className="list-action-btn"
            aria-label="詳細を見る"
          >
            <i className="fas fa-info-circle text-blue-500"></i>
          </button>
        </div>
      </td>
    </tr>
  );
});

AkyoListRow.displayName = 'AkyoListRow';

export const AkyoList = memo(function AkyoList({ data, onToggleFavorite, onShowDetail }: AkyoListProps) {
  return (
    <div className="list-view-container">
      <div className="list-scroll-wrapper">
        <table className="list-view-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>見た目</th>
              <th>名前</th>
              <th>カテゴリ</th>
              <th>作者</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {data.map((akyo) => (
              <AkyoListRow
                key={akyo.id}
                akyo={akyo}
                onToggleFavorite={onToggleFavorite}
                onShowDetail={onShowDetail}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

AkyoList.displayName = 'AkyoList';
