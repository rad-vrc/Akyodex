'use client';

/**
 * Akyo Detail Modal Component
 * 
 * Complete recreation of original modal from index.html
 * Features:
 * - Header with gradient background
 * - Profile icon + ID + name
 * - Large image with sparkle effect
 * - Info grid (4 sections: name, avatar, attributes, creator)
 * - VRChat URL section
 * - Notes section (if available)
 * - Action buttons (favorite + VRChat link)
 */

import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import Image from 'next/image';
import type { AkyoData } from '@/types/akyo';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';

interface AkyoDetailModalProps {
  akyo: AkyoData | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
}

// 属性色マッピング (元の実装と完全一致)
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

  return '#667eea';
}

export function AkyoDetailModal({ akyo, isOpen, onClose, onToggleFavorite }: AkyoDetailModalProps) {
  const [localAkyo, setLocalAkyo] = useState<AkyoData | null>(akyo);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalAkyo(akyo);
  }, [akyo]);

  useEffect(() => {
    // ESCキーでモーダルを閉じる
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!localAkyo || !isOpen) return null;

  const displayName = localAkyo.nickname || localAkyo.avatarName || '';
  const attributes: string[] = localAkyo.attribute
    ? localAkyo.attribute.split(',').map((a: string) => a.trim()).filter(Boolean)
    : [];
  const attributeColor = getAttributeColor(localAkyo.attribute);
  const imageUrl = buildAvatarImageUrl(localAkyo.id, localAkyo.avatarUrl, 800);

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // モーダル外（backdrop または modal container）をクリックしたら閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFavoriteClick = () => {
    if (!localAkyo) return;

    // 楽観的更新（即座にUIを変更）
    // Note: お気に入りはlocalStorageベースで同期的に処理されるため、
    // エラーハンドリングやロールバックは不要です。
    // もし将来サーバーサイドAPIを使用する場合は、try-catchと
    // 失敗時のロールバック処理を追加してください。
    setLocalAkyo({
      ...localAkyo,
      isFavorite: !localAkyo.isFavorite,
    });

    // 親コンポーネントに通知（localStorageを更新）
    onToggleFavorite?.(localAkyo.id);
  };

  const handleVRChatOpen = () => {
    if (localAkyo?.avatarUrl) {
      // Security: Validate URL scheme before opening
      try {
        const url = new URL(localAkyo.avatarUrl);
        // Only allow https and http protocols (prevent javascript:, data:, etc.)
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          window.open(localAkyo.avatarUrl, '_blank', 'noopener,noreferrer');
        } else {
          console.error('Invalid URL protocol:', url.protocol);
          alert('無効なURLです');
        }
      } catch (error) {
        console.error('Invalid URL:', error);
        alert('無効なURLです');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Backdrop - クリックで閉じる */}
      <div
        className="modal-backdrop fixed inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal Container - クリックで閉じる */}
      <div className="relative min-h-screen px-4 py-8" onClick={handleBackdropClick}>
        <div className="relative mx-auto max-w-2xl">
          <div
            className="bg-white rounded-3xl shadow-2xl modal-show"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-14 h-14 rounded-full z-[60] flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              }}
              aria-label="閉じる"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 hover:rotate-90">
                <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Modal Header */}
            <div
              className="rounded-t-3xl p-6 border-b-4 border-dotted border-purple-200"
              style={{
                background: 'linear-gradient(to right, rgb(243 232 255), rgb(252 231 243), rgb(219 234 254))',
              }}
            >
              <h2 className="text-3xl font-black flex items-center">
                <Image
                  src="/images/profileIcon.webp"
                  alt="Profile Icon"
                  width={40}
                  height={40}
                  className="w-10 h-10 mr-3 inline-block object-cover rounded-full"
                  unoptimized
                />
                <span>#{localAkyo.id} {displayName}</span>
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-gradient-to-b from-white to-blue-50">
              <div className="space-y-6">
                {/* Image Section */}
                <div className="relative">
                  <div className="h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 p-2">
                    <Image
                      src={imageUrl}
                      alt={displayName}
                      width={800}
                      height={533}
                      className="w-full h-full object-contain rounded-2xl"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.background = `linear-gradient(135deg, ${attributeColor}, ${attributeColor}66)`;
                      }}
                    />
                  </div>

                  {/* Sparkle Effect */}
                  <div className="absolute -top-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center animate-bounce">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Card */}
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#FF6B9D' }}>
                      <i className="fas fa-tag mr-1"></i>なまえ
                    </h3>
                    <p className="text-xl font-black">{localAkyo.nickname || '-'}</p>
                  </div>

                  {/* Avatar Name Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-blue-600 mb-2">
                      <i className="fas fa-user-astronaut mr-1"></i>アバター名
                    </h3>
                    <p className="text-xl font-black">{localAkyo.avatarName || '-'}</p>
                  </div>

                  {/* Attributes Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-orange-600 mb-2">
                      <i className="fas fa-sparkles mr-1"></i>ぞくせい
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {attributes.map((attr, index) => {
                        const color = getAttributeColor(attr);
                        return (
                          <span
                            key={index}
                            className="px-3 py-1 rounded-full text-sm font-bold text-white shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                            }}
                          >
                            {attr}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Creator Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-green-600 mb-2">
                      <i className="fas fa-palette mr-1"></i>つくったひと
                    </h3>
                    <p className="text-xl font-black">{localAkyo.creator || ''}</p>
                  </div>
                </div>

                {/* VRChat URL Section */}
                {localAkyo.avatarUrl && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      VRChat アバターURL
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <a
                        href={localAkyo.avatarUrl}
                        onClick={(e) => {
                          e.preventDefault();
                          handleVRChatOpen();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm break-all cursor-pointer"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>
                        {localAkyo.avatarUrl}
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {localAkyo.notes && (
                  <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-3xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      <i className="fas fa-gift mr-2"></i>おまけじょうほう
                    </h3>
                    <div className="bg-white bg-opacity-80 rounded-2xl p-4 shadow-inner">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {localAkyo.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {/* Favorite Button - ピンク色 */}
                  <button
                    onClick={handleFavoriteClick}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${localAkyo.isFavorite
                      ? 'text-white hover:opacity-90'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    style={localAkyo.isFavorite ? {
                      background: 'linear-gradient(135deg, #FF6B9D, #FF8FA3)',
                    } : undefined}
                    aria-label={localAkyo.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                  >
                    <i className="fas fa-heart"></i>
                    {localAkyo.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                  </button>

                  {/* VRChat Button - Orange Gradient (not purple!) */}
                  {localAkyo.avatarUrl && (
                    <button
                      onClick={handleVRChatOpen}
                      className="flex-1 py-3 rounded-lg font-medium transition-opacity flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #fb923c)',
                        color: 'white',
                      }}
                      aria-label="VRChatで見る"
                    >
                      <i className="fas fa-external-link-alt"></i>
                      VRChatで見る
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
