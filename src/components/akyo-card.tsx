'use client';

import { buildAvatarImageUrl } from '@/lib/vrchat-utils';
import { generateBlurDataURL } from '@/lib/blur-data-url';
import type { AkyoData } from '@/types/akyo';
import Image from 'next/image';
import { memo, useMemo, useState } from 'react';

interface AkyoCardProps {
  akyo: AkyoData;
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

// カテゴリに対応する色を取得（元の実装のgetAttributeColorを再現）
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

  // 最初にマッチする属性の色を返す
  for (const [key, color] of Object.entries(colorMap)) {
    if (category && category.includes(key)) {
      return color;
    }
  }

  // デフォルト色
  const defaultColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

  return defaultColors[Math.floor(Math.random() * defaultColors.length)];
}

export const AkyoCard = memo(function AkyoCard({ akyo, onToggleFavorite, onShowDetail }: AkyoCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(akyo.id);
  };

  const handleCardClick = () => {
    onShowDetail?.(akyo);
  };

  // 三面図ダウンロード（サーバーサイドプロキシ経由でCORS回避）
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // APIエンドポイント経由でダウンロード（Content-Disposition: attachment が設定される）
    const downloadUrl = `/api/download-reference?id=${akyo.id}`;
    
    // 新しいウィンドウ/タブで開くとダウンロードがトリガーされる
    window.location.href = downloadUrl;
  };

  // 互換性のため新旧フィールドをチェック
  const category = akyo.category || akyo.attribute;
  const author = akyo.author || akyo.creator;

  // 画像読み込み状態
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Blur placeholder をメモ化（再計算を防止）
  const blurDataURL = useMemo(() => generateBlurDataURL(akyo.id), [akyo.id]);

  // 画像URLをメモ化
  const imageUrl = useMemo(
    () => buildAvatarImageUrl(akyo.id, akyo.avatarUrl, 512),
    [akyo.id, akyo.avatarUrl]
  );

  return (
    <div className="akyo-card cursor-pointer" onClick={handleCardClick}>
      {/* 画像 */}
      <div className="relative w-full aspect-[3/2] bg-gray-100 overflow-hidden">
        <Image
          src={imageError ? '/images/placeholder.webp' : imageUrl}
          alt={akyo.avatarName || akyo.nickname}
          fill
          className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          placeholder="blur"
          blurDataURL={blurDataURL}
          unoptimized
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />
        {/* 読み込み中のプレースホルダー */}
        {!imageLoaded && (
          <div 
            className="absolute inset-0 animate-pulse"
            style={{ backgroundImage: `url(${blurDataURL})`, backgroundSize: 'cover' }}
          />
        )}

        {/* お気に入りボタン */}
        <button
          onClick={handleFavoriteClick}
          className="favorite-btn absolute top-2 right-2 z-10"
          aria-label={akyo.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
        >
          {akyo.isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* カード情報 */}
      <div className="p-4 space-y-2">
        {/* ID と 三面図DLボタン */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-gray-500">#{akyo.id}</span>
          <button
            onClick={handleDownloadClick}
            className="reference-sheet-button"
            title="三面図をダウンロード"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="hidden sm:inline">三面図DL</span>
          </button>
        </div>

        {/* タイトル - 元の実装と同じフォント */}
        <h3 className="font-bold text-lg mb-1 text-gray-800 line-clamp-2">
          {akyo.nickname || akyo.avatarName}
        </h3>

        {/* 属性バッジ */}
        {category && (
          <div className="flex flex-wrap gap-1 mb-2">
            {category.split(/[、,]/).map((cat, index) => {
              const trimmedCat = cat.trim();
              const color = getCategoryColor(trimmedCat);
              return (
                <span
                  key={index}
                  className="attribute-badge text-xs"
                  style={{
                    background: `${color}20`,
                    color: color,
                    boxShadow: `0 6px 12px ${color}20`,
                  }}
                >
                  {trimmedCat}
                </span>
              );
            })}
          </div>
        )}

        {/* 作者情報 - 元の実装と同じ形式 (改行あり、:付き) */}
        <p className="text-xs text-gray-600 mb-2 whitespace-pre-line">
          {akyo.nickname && akyo.avatarName && akyo.nickname !== akyo.avatarName && (
            <>
              アバター名: {akyo.avatarName}
              {'\n'}
            </>
          )}
          作者: {author}
        </p>

        {/* くわしく見るボタン */}
        <button
          onClick={handleCardClick}
          className="detail-button w-full flex items-center justify-center gap-2"
        >
          <span className="animate-bounce">🌟</span>
          <span>くわしく見る</span>
          <span className="animate-bounce">🌟</span>
        </button>
      </div>
    </div>
  );
});

// displayName for debugging
AkyoCard.displayName = 'AkyoCard';
