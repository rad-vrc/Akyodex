'use client';

/**
 * Optimized Avatar Image Component
 * 
 * Features:
 * - Blur placeholder for smooth loading
 * - 3-tier fallback: R2 → VRChat API → Placeholder
 * - Loading state with animation
 * - Automatic error handling
 * - Optimized for display speed
 */

import Image from 'next/image';
import { useState } from 'react';
import { generateBlurDataURL } from '@/lib/blur-data-url';

interface AvatarImageProps {
  /** 4-digit avatar ID (e.g., "0001") */
  id: string;
  /** Avatar name for alt text */
  name: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Priority loading (for above-the-fold images) */
  priority?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Image quality (1-100) */
  quality?: number;
  /** Click handler */
  onClick?: () => void;
  /** Responsive sizes attribute */
  sizes?: string;
}

export function AvatarImage({
  id,
  name,
  width = 400,
  height = 400,
  priority = false,
  className = '',
  quality = 85,
  onClick,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackAttempt, setFallbackAttempt] = useState(0);
  
  // Image fallback chain
  // 0: Primary (R2 or Cloudflare Images)
  // 1: VRChat API fallback
  // 2: Static placeholder
  const getImageSrc = () => {
    const r2Base = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
    
    if (fallbackAttempt === 0) {
      // Primary: R2 or Cloudflare Images (via loader)
      return `${r2Base}/images/${id}.webp`;
    } else if (fallbackAttempt === 1) {
      // Fallback: VRChat API
      return `/api/avatar-image?id=${id}`;
    } else {
      // Final fallback: Static placeholder
      return '/images/placeholder.png';
    }
  };
  
  const handleImageError = () => {
    if (fallbackAttempt < 2) {
      console.log(`[AvatarImage] Fallback attempt ${fallbackAttempt + 1} for avatar ${id}`);
      setFallbackAttempt((prev) => prev + 1);
      setImageError(false); // Reset error state to trigger re-render
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  };
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Main image */}
      <Image
        src={getImageSrc()}
        alt={name}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        quality={quality}
        placeholder="blur"
        blurDataURL={generateBlurDataURL(id)}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${onClick ? 'hover:scale-105 transition-transform' : ''}
        `}
        style={{
          objectFit: 'contain',
          width: '100%',
          height: 'auto',
        }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700"
          style={{
            background: `linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)`,
          }}
        />
      )}
      
      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center p-4">
            {/* SVG is decorative since the adjacent text conveys the message */}
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Image unavailable
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight variant for list views
 * Uses smaller sizes and simplified fallback
 */
export function AvatarImageThumbnail({
  id,
  name,
  className = '',
  onClick,
}: Pick<AvatarImageProps, 'id' | 'name' | 'className' | 'onClick'>) {
  return (
    <AvatarImage
      id={id}
      name={name}
      width={200}
      height={200}
      className={className}
      onClick={onClick}
      sizes="200px"
      quality={75}
    />
  );
}
