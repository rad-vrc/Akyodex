'use client';

import Image from 'next/image';
import type { AkyoData } from '@/types/akyo';
import { getCategoryColor } from '@/lib/akyo-data-helpers';
import { IconInfoCircle } from '@/components/icons';
import { generateBlurDataURL } from '@/lib/blur-data-url';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';

interface AkyoListProps {
  data: AkyoData[];
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

export function AkyoList({ data, onToggleFavorite, onShowDetail }: AkyoListProps) {
  const handleFavoriteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onToggleFavorite?.(id);
  };

  const handleDetailClick = (e: React.MouseEvent, akyo: AkyoData) => {
    e.stopPropagation();
    onShowDetail?.(akyo);
  };

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
            {data.map((akyo) => {
              const category = akyo.category || akyo.attribute || '';
              const author = akyo.author || akyo.creator || '';
              
              return (
                <tr key={akyo.id}>
                  {/* No. */}
                  <td className="font-mono text-sm">#{akyo.id}</td>

                  {/* 見た目 */}
                  <td>
                    <div className="list-image-wrapper">
                      <Image
                        src={buildAvatarImageUrl(akyo.id, akyo.avatarUrl, 96)}
                        alt={akyo.avatarName || akyo.nickname}
                        width={48}
                        height={48}
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                        placeholder="blur"
                        blurDataURL={generateBlurDataURL(akyo.id)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.webp';
                        }}
                      />
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
                        type="button"
                        onClick={(e) => handleFavoriteClick(e, akyo.id)}
                        className="list-action-btn"
                        aria-label={akyo.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
                      >
                        <span className="list-favorite-icon">
                          {akyo.isFavorite ? '❤️' : '🤍'}
                        </span>
                      </button>

                      {/* 詳細ボタン */}
                      <button
                        type="button"
                        onClick={(e) => handleDetailClick(e, akyo)}
                        className="list-action-btn"
                        aria-label="詳細を見る"
                      >
                        <IconInfoCircle size="w-5 h-5" className="text-blue-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
