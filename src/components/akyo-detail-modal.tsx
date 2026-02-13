'use client';

/**
 * Akyo Detail Modal Component
 *
 * Complete recreation of original modal from index.html
 * Features:
 * - Header with gradient background
 * - Profile icon + ID + name
 * - Large image with sparkle effect (PNG reference sheet preferred, WebP fallback)
 * - Info grid (4 sections: name, avatar, attributes, creator)
 * - VRChat URL section
 * - Notes section (if available)
 * - Action buttons (favorite + VRChat link)
 */

import { getCategoryColor } from '@/lib/akyo-data-helpers';
import { IconExternalLink, IconGift, IconHeart, IconPalette, IconSparkles, IconTag, IconUserAstronaut } from '@/components/icons';
import { buildAvatarImageUrl } from '@/lib/vrchat-utils';
import type { AkyoData } from '@/types/akyo';
import Image from 'next/image';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AkyoDetailModalProps {
  akyo: AkyoData | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
}

export function AkyoDetailModal({ akyo, isOpen, onClose, onToggleFavorite }: AkyoDetailModalProps) {
  const [localAkyo, setLocalAkyo] = useState<AkyoData | null>(akyo);

  // 三面図（PNG）優先、WebPフォールバック用の状態
  // Note: Hooks はすべて早期リターンの前に配置する必要がある (React Hooks ルール)
  const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoadAttempt, setImageLoadAttempt] = useState(0);

  // ズーム機能の状態
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 }); // パーセンテージ
  
  // ドラッグ機能の状態
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const originStartRef = useRef({ x: 50, y: 50 });
  
  // ダブルタップ検出用（モバイル対応）
  const lastTapRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false); // 実際にドラッグ（移動）したか
  const justZoomedOutRef = useRef<boolean>(false); // ダブルタップでズーム解除した直後か
  const DOUBLE_TAP_DELAY = 300; // ミリ秒
  const DRAG_THRESHOLD = 5; // ピクセル（これ以上動いたらドラッグとみなす）

  // Sync local state with prop changes
  useEffect(() => {
    setLocalAkyo(akyo);
  }, [akyo]);

  // akyo変更時に画像URLをリセット
  // Note: localAkyo?.id のみを依存にすることで、同一IDのプロパティ変更（isFavoriteなど）で
  // 画像URLがリセットされるのを防ぐ
  useEffect(() => {
    if (localAkyo) {
      const pngUrl = `${r2Base}/${localAkyo.id}.png`;
      setImageUrl(pngUrl);
      setImageLoadAttempt(0);
      setIsZoomed(false); // ズーム状態もリセット
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localAkyo.id の変更時のみ発火させたい
  }, [localAkyo?.id, r2Base]);

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

  // PNG→WebPフォールバック処理
  const handleImageError = useCallback(() => {
    if (localAkyo && imageLoadAttempt === 0) {
      // PNG失敗 → WebPにフォールバック
      const webpUrl = buildAvatarImageUrl(localAkyo.id, localAkyo.avatarUrl, 800);
      console.log(`[detail-modal] PNG not found for ${localAkyo.id}, falling back to WebP`);
      setImageUrl(webpUrl);
      setImageLoadAttempt(1);
    }
    // WebPも失敗した場合はonErrorのスタイル処理に任せる
  }, [imageLoadAttempt, localAkyo]);

  // シングルクリックでズームイン（クリック位置を中心に）
  const handleImageClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    // ドラッグ中やズーム中はクリックとして扱わない
    if (isDragging || isZoomed) return;
    
    // ダブルタップでズーム解除した直後のclickイベントは無視（再ズーム防止）
    if (justZoomedOutRef.current) {
      justZoomedOutRef.current = false;
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // ズームイン：クリック位置を中心に
    setZoomOrigin({ x, y });
    setIsZoomed(true);
  }, [isZoomed, isDragging]);

  // ダブルクリックでズームアウト
  const handleImageDoubleClick = useCallback(() => {
    if (isZoomed) {
      setIsZoomed(false);
    }
  }, [isZoomed]);

  // ドラッグ開始（マウス）
  const handleDragStart = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    originStartRef.current = { ...zoomOrigin };
  }, [isZoomed, zoomOrigin]);

  // ドラッグ開始（タッチ）
  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isZoomed || e.touches.length !== 1) return;
    // ネイティブスクロールを防止
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false; // ドラッグ開始時はまだ移動していない
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    originStartRef.current = { ...zoomOrigin };
  }, [isZoomed, zoomOrigin]);

  // ドラッグ中（マウス）
  const handleDragMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDragging || !isZoomed) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    // ドラッグ方向と逆に origin を移動（自然な操作感）
    const newX = Math.max(0, Math.min(100, originStartRef.current.x - deltaX));
    const newY = Math.max(0, Math.min(100, originStartRef.current.y - deltaY));
    
    setZoomOrigin({ x: newX, y: newY });
  }, [isDragging, isZoomed]);

  // ドラッグ中（タッチ）
  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isDragging || !isZoomed || e.touches.length !== 1) return;
    
    // ネイティブスクロールを防止
    e.preventDefault();
    e.stopPropagation();
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    // 移動量がしきい値を超えたらドラッグとみなす
    const movedX = Math.abs(touchX - dragStartRef.current.x);
    const movedY = Math.abs(touchY - dragStartRef.current.y);
    if (movedX > DRAG_THRESHOLD || movedY > DRAG_THRESHOLD) {
      hasDraggedRef.current = true;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const deltaX = ((touchX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((touchY - dragStartRef.current.y) / rect.height) * 100;
    
    const newX = Math.max(0, Math.min(100, originStartRef.current.x - deltaX));
    const newY = Math.max(0, Math.min(100, originStartRef.current.y - deltaY));
    
    setZoomOrigin({ x: newX, y: newY });
  }, [isDragging, isZoomed]);

  // ドラッグ終了（マウス用）
  const handleDragEnd = useCallback(() => {
    // 少し遅延させてクリックイベントとの競合を防ぐ
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  // タッチ終了（ダブルタップ検出付き）
  const handleTouchEnd = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    // ズーム中のみダブルタップ判定を行う
    if (isZoomed) {
      if (!hasDraggedRef.current && timeSinceLastTap < DOUBLE_TAP_DELAY) {
        // ダブルタップでズームアウト
        setIsZoomed(false);
        lastTapRef.current = 0;
        justZoomedOutRef.current = true; // 直後のclickイベントをブロックするためのフラグ
      } else if (!hasDraggedRef.current) {
        // ズーム中のタップのみ、タップ時刻を記録
        lastTapRef.current = now;
      }
    }
    // 非ズーム時は lastTapRef を更新しない（ズームイン→即ダブルタップ判定を防ぐ）
    
    // ドラッグ状態をリセット
    setIsDragging(false);
    hasDraggedRef.current = false;
  }, [isZoomed]);

  // 早期リターン - すべての Hooks 呼び出しの後に配置
  if (!localAkyo || !isOpen) return null;

  // 新旧フィールド対応
  const categoryStr = localAkyo.category || localAkyo.attribute || '';
  const authorStr = localAkyo.author || localAkyo.creator || '';
  const commentStr = localAkyo.comment || localAkyo.notes || '';

  const displayName = localAkyo.nickname || localAkyo.avatarName || '';
  const categories: string[] = categoryStr
    ? categoryStr
        .split(/[、,]/)
        .map((a: string) => a.trim())
        .filter(Boolean)
    : [];
  const categoryColor = getCategoryColor(categoryStr);

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
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={handleBackdropClick}>
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
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-12 h-12 rounded-full z-[60] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-white/60 backdrop-blur-md border border-white/30"
              style={{
                background: 'rgba(255, 255, 255, 0.45)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
              aria-label="閉じる"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="transition-transform duration-300 hover:rotate-90"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#6b5b7b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Modal Header */}
            <div
              className="rounded-t-3xl p-6 border-b-4 border-dotted border-purple-200"
              style={{
                background:
                  'linear-gradient(to right, rgb(243 232 255), rgb(252 231 243), rgb(219 234 254))',
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
                <span>
                  #{localAkyo.id} {displayName}
                </span>
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-gradient-to-b from-white to-blue-50">
              <div className="space-y-6">
                {/* Image Section with Zoom & Drag */}
                <div className="relative">
                  <div 
                    className={`h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 p-2 select-none ${
                      isZoomed ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                    }`}
                    style={{ touchAction: isZoomed ? 'none' : 'auto' }}
                    onClick={handleImageClick}
                    onDoubleClick={handleImageDoubleClick}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div 
                      className={`w-full h-full relative ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
                      style={{
                        transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                      }}
                    >
                      <Image
                        src={imageUrl}
                        alt={displayName}
                        width={800}
                        height={533}
                        className="w-full h-full object-contain rounded-2xl"
                        unoptimized
                        draggable={false}
                        onError={(e) => {
                          // PNG→WebPフォールバック
                          handleImageError();
                          // 最終フォールバック：グラデーション背景
                          const target = e.target as HTMLImageElement;
                          target.style.background = `linear-gradient(135deg, ${categoryColor}, ${categoryColor}66)`;
                        }}
                      />
                    </div>
                  </div>

                  {/* Zoom/Drag Hint */}
                  {!isZoomed ? (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                      タップでズーム 🔍
                    </div>
                  ) : (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                      ドラッグで移動  / ダブルタップで戻る
                    </div>
                  )}

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
                      <IconTag size="w-3.5 h-3.5" className="mr-1" />なまえ
                    </h3>
                    <p className="text-xl font-black">{localAkyo.nickname || '-'}</p>
                  </div>

                  {/* Avatar Name Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-blue-600 mb-2">
                      <IconUserAstronaut size="w-3.5 h-3.5" className="mr-1" />アバター名
                    </h3>
                    <p className="text-xl font-black">{localAkyo.avatarName || '-'}</p>
                  </div>

                  {/* Categories Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-orange-600 mb-2">
                      <IconSparkles size="w-3.5 h-3.5" className="mr-1" />カテゴリ
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {categories.map((cat, index) => {
                        const color = getCategoryColor(cat);
                        return (
                          <span
                            key={index}
                            className="px-3 py-1 rounded-full text-sm font-bold text-white shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                            }}
                          >
                            {cat}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Author Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-green-600 mb-2">
                      <IconPalette size="w-3.5 h-3.5" className="mr-1" />つくったひと
                    </h3>
                    <p className="text-xl font-black">{authorStr || ''}</p>
                  </div>
                </div>

                {/* VRChat URL Section */}
                {localAkyo.avatarUrl && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">VRChat アバターURL</h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <a
                        href={localAkyo.avatarUrl}
                        onClick={(e) => {
                          e.preventDefault();
                          handleVRChatOpen();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm break-all cursor-pointer"
                      >
                        <IconExternalLink size="w-3.5 h-3.5" className="mr-1" />
                        {localAkyo.avatarUrl}
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes/Comment Section */}
                {commentStr && (
                  <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-3xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      <IconGift size="w-4 h-4" className="mr-2" />おまけじょうほう
                    </h3>
                    <div className="bg-white bg-opacity-80 rounded-2xl p-4 shadow-inner">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {commentStr}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {/* Favorite Button - ピンク色 */}
                  <button
                    type="button"
                    onClick={handleFavoriteClick}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      localAkyo.isFavorite
                        ? 'text-white hover:opacity-90'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={
                      localAkyo.isFavorite
                        ? {
                            background: 'linear-gradient(135deg, #FF6B9D, #FF8FA3)',
                          }
                        : undefined
                    }
                    aria-label={localAkyo.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                  >
                    <IconHeart size="w-4 h-4" />
                    {localAkyo.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                  </button>

                  {/* VRChat Button - Orange Gradient (not purple!) */}
                  {localAkyo.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleVRChatOpen}
                      className="flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:brightness-110 hover:shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #fb923c)',
                        color: 'white',
                      }}
                      aria-label="VRChatで見る"
                    >
                      <IconExternalLink size="w-4 h-4" />
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
