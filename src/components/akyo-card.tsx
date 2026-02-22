'use client';

import { IconImage, IconVRChat } from '@/components/icons';
import { getCategoryColor, parseAndSortCategories } from '@/lib/akyo-data-helpers';
import { generateBlurDataURL } from '@/lib/blur-data-url';
import { t, type SupportedLanguage } from '@/lib/i18n';
import { buildAvatarImageUrl, safeOpenVRChatLink } from '@/lib/vrchat-utils';
import type { AkyoData } from '@/types/akyo';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Props for the AkyoCard component
 */
interface AkyoCardProps {
  /** The Akyo data object to display */
  akyo: AkyoData;
  /** Currently selected language for translations (default: 'ja') */
  lang?: SupportedLanguage;
  /** Optional callback when the favorite button is clicked */
  onToggleFavorite?: (id: string) => void;
  /** Optional callback when the card is clicked to show details */
  onShowDetail?: (akyo: AkyoData) => void;
  /** Prioritize image loading for above-the-fold cards */
  priority?: boolean;
}

/**
 * AkyoCard Component
 * Displays a single Akyo avatar as a stylized card with an image, metadata, and action buttons.
 * Supports image caching, language-aware labels, and interactive favorites.
 *
 * @param props - Component properties
 * @returns Stylized card element
 */
export function AkyoCard({
  akyo,
  lang = 'ja',
  onToggleFavorite,
  onShowDetail,
  priority = false,
}: AkyoCardProps) {
  const cloudflareImagesEnabled = process.env.NEXT_PUBLIC_ENABLE_CLOUDFLARE_IMAGES === 'true';
  const r2BaseUrl = (process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com').replace(
    /\/$/,
    ''
  );
  const apiImageSrc = buildAvatarImageUrl(akyo.id, akyo.avatarUrl, 512);
  const apiFallbackImageSrc = `${apiImageSrc}&bypassCloudflare=1`;
  const primaryImageSrc = cloudflareImagesEnabled
    ? `/${akyo.id}.webp`
    : `${r2BaseUrl}/${akyo.id}.webp`;
  const placeholderImageSrc = '/images/placeholder.webp';
  const [imageSrc, setImageSrc] = useState(primaryImageSrc);

  /**
   * Handles clicks on the favorite heart icon button
   * @param e - React mouse event
   */
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(akyo.id);
  };

  /**
   * Handles clicks on the card body to open detail view
   */
  const handleCardClick = () => {
    onShowDetail?.(akyo);
  };

  /**
   * Handles clicks on the reference sheet download button.
   * Uses a server-side proxy to bypass CORS and force a download.
   * @param e - React mouse event
   */
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // APIエンドポイント経由でダウンロード（Content-Disposition: attachment が設定される）
    const downloadUrl = `/api/download-reference?id=${akyo.id}`;

    // 新しいウィンドウ/タブで開くとダウンロードがトリガーされる
    window.location.href = downloadUrl;
  };

  /**
   * Handles clicks on the VRChat logo button to open the external detail page safely.
   * @param e - React mouse event
   */
  const handleVRChatClick = (e: React.MouseEvent) => {
    safeOpenVRChatLink(e, akyo.avatarUrl);
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
          src={imageSrc}
          alt={akyo.avatarName || akyo.nickname}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          placeholder="blur"
          blurDataURL={generateBlurDataURL(akyo.id)}
          onError={() => {
            // R2/Cloudflare失敗時はAPI経由にフォールバックし、それでも失敗したらプレースホルダー。
            if (imageSrc !== apiFallbackImageSrc && imageSrc !== placeholderImageSrc) {
              setImageSrc(apiFallbackImageSrc);
              return;
            }
            if (imageSrc !== placeholderImageSrc) {
              setImageSrc(placeholderImageSrc);
            }
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
        {/* VRChatリンク と 三面図DLボタン */}
        <div className="flex items-center justify-end mb-1 gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 max-sm:flex-wrap max-sm:justify-end">
            {akyo.avatarUrl && (
              <button
                type="button"
                onClick={handleVRChatClick}
                className="vrchat-link-button flex-shrink-0 p-1 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center min-h-[44px] min-w-[44px] max-sm:hover:scale-105"
                title={t('modal.vrchatOpen', lang)}
                aria-label={t('modal.vrchatOpen', lang)}
              >
                <IconVRChat
                  size="w-12 h-12 max-sm:w-[75px] max-sm:h-[75px]"
                  className="text-black flex-shrink-0"
                  overflow="visible"
                />
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadClick}
              className="reference-sheet-button flex-shrink-0 scale-90 max-sm:scale-100 max-sm:origin-right max-sm:flex max-sm:flex-col max-sm:items-center max-sm:justify-center"
              title={t('card.download', lang)}
              aria-label={t('card.download', lang)}
            >
              <IconImage size="w-4 h-4 max-sm:w-[22px] max-sm:h-[22px]" className="max-sm:mb-0.5" />
              <span className="hidden sm:inline text-xs">{t('card.downloadLabel', lang)}</span>
              <span className="sm:hidden text-xs max-sm:text-[12px] max-sm:leading-none max-sm:pt-0.5">DL</span>
            </button>
          </div>
        </div>

        {/* ID（通称の直上） */}
        <div className="mb-1">
          <span className="text-sm font-bold text-gray-500">#{akyo.id}</span>
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
