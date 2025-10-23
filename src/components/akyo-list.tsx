'use client';

import Image from 'next/image';
import type { AkyoData } from '@/types/akyo';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';

interface AkyoListProps {
  data: AkyoData[];
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

// 属性に対応する色を取得
function getAttributeColor(attribute: string): string {
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
    if (attribute && attribute.includes(key)) {
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
              <th>属性</th>
              <th>作者</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {data.map((akyo) => (
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

                {/* 属性 */}
                <td>
                  <div className="flex flex-wrap gap-1">
                    {akyo.attribute.split(',').map((attr, index) => {
                      const trimmedAttr = attr.trim();
                      const color = getAttributeColor(trimmedAttr);
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
                          {trimmedAttr}
                        </span>
                      );
                    })}
                  </div>
                </td>

                {/* 作者 */}
                <td className="text-sm text-[var(--text-secondary)]">
                  {akyo.creator}
                </td>

                {/* アクション */}
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {/* お気に入りボタン */}
                    <button
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
                      onClick={(e) => handleDetailClick(e, akyo)}
                      className="list-action-btn"
                      aria-label="詳細を見る"
                    >
                      <i className="fas fa-info-circle text-blue-500"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
