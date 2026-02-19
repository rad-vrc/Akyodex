'use client';

import { IconDownload, IconVRChat } from '@/components/icons';
import { getCategoryColor, parseAndSortCategories } from '@/lib/akyo-data-helpers';
import { generateBlurDataURL } from '@/lib/blur-data-url';
import { t, type SupportedLanguage } from '@/lib/i18n';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';
import type { AkyoData } from '@/types/akyo';
import Image from 'next/image';

interface AkyoCardProps {
  akyo: AkyoData;
  lang?: SupportedLanguage;
  onToggleFavorite?: (id: string) => void;
  onShowDetail?: (akyo: AkyoData) => void;
}

export function AkyoCard({ akyo, lang = 'ja', onToggleFavorite, onShowDetail }: AkyoCardProps) {
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

  const handleVRChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (akyo.avatarUrl) {
      window.open(akyo.avatarUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 互換性のため新旧フィールドをチェック
  const category = akyo.category || akyo.attribute;
  const author = akyo.author || akyo.creator;
  const sortedCategories = category ? parseAndSortCategories(category) : [];

  return (
    <div className="akyo-card cursor-pointer" onClick={handleCardClick}>
      {/* 画像 */}
      <div className="relative w-full aspect-[3/2] bg-gray-100">
        <Image
          src={buildAvatarImageUrl(akyo.id, akyo.avatarUrl, 512)}
          alt={akyo.avatarName || akyo.nickname}
          fill
          className="object-cover"
          loading="lazy"
          unoptimized
          placeholder="blur"
          blurDataURL={generateBlurDataURL(akyo.id)}
          onError={(e) => {
            // フォールバック画像
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder.webp';
          }}
        />

        {/* お気に入りボタン */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="favorite-btn absolute top-2 right-2 z-10"
          aria-label={
            akyo.isFavorite ? t('card.favorite.remove', lang) : t('card.favorite.add', lang)
          }
        >
          {akyo.isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* カード情報 */}
      <div className="p-4 space-y-2">
        {/* ID と VRChatリンク と 三面図DLボタン */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-gray-500">#{akyo.id}</span>
          {akyo.avatarUrl && (
            <button
              type="button"
              onClick={handleVRChatClick}
              className="vrchat-link-button p-1 rounded-md transition-all hover:bg-black/5 hover:scale-110 active:scale-95"
              title={t('modal.vrchatOpen', lang)}
            >
              <IconVRChat size="w-6 h-6" className="text-black" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadClick}
            className="reference-sheet-button"
            title={t('card.download', lang)}
          >
            <IconDownload className="w-4 h-4" />
            <span className="hidden sm:inline">{t('card.downloadLabel', lang)}</span>
          </button>
        </div>

        {/* タイトル - 元の実装と同じフォント */}
        <h3 className="font-bold text-lg mb-1 text-gray-800 line-clamp-2">
          {akyo.nickname || akyo.avatarName}
        </h3>

        {/* 属性バッジ */}
        {category && (
          <div className="flex flex-wrap gap-1 mb-2">
            {sortedCategories.map((trimmedCat, index) => {
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
              {t('card.avatarName', lang)}: {akyo.avatarName}
              {'\n'}
            </>
          )}
          {t('card.author', lang)}: {author}
        </p>

        {/* くわしく見るボタン */}
        <button
          type="button"
          onClick={handleCardClick}
          className="detail-button w-full flex items-center justify-center gap-2"
        >
          <span className="animate-bounce">🌟</span>
          <span>{t('card.detail', lang)}</span>
          <span className="animate-bounce">🌟</span>
        </button>
      </div>
    </div>
  );
}
