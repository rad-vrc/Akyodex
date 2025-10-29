'use client';

/**
 * Mini Akyo Background Animation
 *
 * Floating mini Akyo avatars in the background - signature UX feature from original site
 * Port from js/mini-akyo-bg.js with complete feature parity:
 * - Golden ratio pseudo-random placement for visual balance
 * - Configurable density via URL param ?bgdensity=NN
 * - Prefers-reduced-motion support for accessibility
 * - Performance optimized with CSS animations and will-change
 * - Background density auto-adjusts based on viewport size
 * - Loads miniakyo.webp image from R2 with fallback cascade
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Frequency boost (1.5x from original)
const FREQ_BOOST = 1.5;

// Image URL candidates (priority order)
const CANDIDATES = [
  // Production R2 direct
  'https://images.akyodex.com/miniakyo.webp',
  'https://images.akyodex.com/@miniakyo.webp',
  // R2 images/ subdirectory
  'https://images.akyodex.com/images/miniakyo.webp',
  'https://images.akyodex.com/images/@miniakyo.webp',
  // Relative (Pages/Local)
  '/images/miniakyo.webp',
  '/images/@miniakyo.webp',
];

// Golden ratio for low-discrepancy sequence
const PHI = 0.6180339887498949; // (sqrt(5)-1)/2

interface MiniAkyoProps {
  className?: string;
}

export function MiniAkyoBg({ className = '' }: MiniAkyoProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [density, setDensity] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const seqU = useRef<number>(Math.random());
  const maintainTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeHandler = useRef<(() => void) | null>(null);

  // Low-discrepancy sequence for balanced placement
  const nextUniform = useCallback(() => {
    seqU.current = (seqU.current + PHI) % 1;
    return seqU.current;
  }, []);

  const clamp = useCallback((v: number, min: number, max: number) => {
    return v < min ? min : v > max ? max : v;
  }, []);

  // Probe image availability
  const probeImage = useCallback((url: string, timeout = 8000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;

      const finalize = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = img.onerror = null;
        img.src = '';
        if (ok) {
          resolve(url);
        } else {
          reject(new Error('load failed'));
        }
      };

      const timer = setTimeout(() => finalize(false), timeout);
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => finalize(true);
      img.onerror = () => finalize(false);
      img.src = url;
    });
  }, []);

  // Resolve miniakyo.webp URL with fallback cascade
  const resolveMiniAkyoUrl = useCallback(async (): Promise<string | null> => {
    // Try fetch with fallback to image probe
    let fallback: string | null = null;
    const ACCEPTABLE = new Set([200, 203, 204, 206, 304]);

    for (const path of CANDIDATES) {
      if (!fallback) fallback = path;

      try {
        const r = await fetch(path, { cache: 'no-cache' });
        if (r.ok || ACCEPTABLE.has(r.status) || (r.type === 'opaque' && !r.status)) {
          return path;
        }

        // Try image probe as fallback
        try {
          await probeImage(path);
          return path;
        } catch {
          // Continue to next candidate
        }
      } catch {
        // Fetch failed, try image probe
        try {
          await probeImage(path);
          return path;
        } catch {
          // Continue to next candidate
        }
      }
    }

    return fallback;
  }, [probeImage]);

  // Spawn single mini Akyo element
  const spawnOne = useCallback((container: HTMLDivElement, url: string, uOverride?: number) => {
    const el = document.createElement('div');
    el.className = 'mini-akyo';

    const size = Math.round(64 + Math.random() * 96); // 64-160px
    const u = typeof uOverride === 'number' ? uOverride : nextUniform();
    const leftVW = clamp(u * 100, 2, 98);
    const duration = 18 + Math.random() * 14; // 18-32s
    const delay = Math.random() * 8; // 0-8s
    const opacity = 0.24 + Math.random() * 0.18; // 0.24-0.42
    const drift = Math.random() * 40 - 20;
    const rotate = Math.random() * 40 - 20;

    el.style.setProperty('--size', `${size}px`);
    el.style.setProperty('--left', `calc(${leftVW}vw + ${drift}px)`);
    el.style.setProperty('--opacity', String(opacity));
    el.style.setProperty('--duration', `${duration}s`);
    el.style.setProperty('--rotate', `${rotate}deg`);
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.backgroundImage = `url("${url}")`;
    el.style.transform = `translateY(0) rotate(${rotate}deg)`;
    el.style.opacity = String(opacity);

    el.addEventListener('animationend', () => {
      el.remove();
    });

    container.appendChild(el);
  }, [clamp, nextUniform]);

  // Initialize background animation
  useEffect(() => {
    const init = async () => {
      const container = containerRef.current;
      if (!container) return;

      // Resolve image URL
      const url = await resolveMiniAkyoUrl();
      if (!url) return;

      setImageUrl(url);

      // Calculate initial density
      const side = Math.sqrt(window.innerWidth * window.innerHeight);
      let base = Math.round(side / 95); // Larger screens get more density
      base = Math.min(28, Math.max(10, base));
      let initial = Math.round(base * FREQ_BOOST);
      initial = Math.min(Math.round(28 * FREQ_BOOST), Math.max(10, initial));

      // Check URL parameter for custom density
      try {
        const params = new URLSearchParams(window.location.search);
        const dens = parseInt(params.get('bgdensity') || '', 10);
        if (!isNaN(dens) && dens >= 6 && dens <= 50) {
          initial = dens;
        }
      } catch {
        // Ignore URL parsing errors
      }

      setDensity(initial);

      // Spawn initial elements with stratified placement
      for (let i = 0; i < initial; i++) {
        const u = (i + Math.random()) / initial;
        spawnOne(container, url, u);
      }

      const targetDensity = initial;

      // Maintain density with periodic spawning
      if (maintainTimer.current) clearInterval(maintainTimer.current);
      maintainTimer.current = setInterval(() => {
        if (!containerRef.current) return;
        const current = containerRef.current.children.length;
        const deficit = targetDensity - current;
        const spawnCount = deficit > 0 ? Math.min(5, Math.max(1, deficit)) : 0;
        for (let i = 0; i < spawnCount; i++) {
          spawnOne(containerRef.current, url);
        }
      }, Math.round(1600 / FREQ_BOOST));

      // Handle window resize
      if (resizeHandler.current) {
        window.removeEventListener('resize', resizeHandler.current);
      }
      resizeHandler.current = () => {
        if (!containerRef.current) return;
        const idealBase = Math.min(22, Math.max(10, Math.round(window.innerWidth / 110)));
        const ideal = Math.min(Math.round(22 * FREQ_BOOST), Math.max(10, Math.round(idealBase * FREQ_BOOST)));
        while (containerRef.current.children.length > ideal) {
          containerRef.current.removeChild(containerRef.current.firstChild!);
        }
      };
      window.addEventListener('resize', resizeHandler.current);
    };

    init();

    // Cleanup
    return () => {
      if (maintainTimer.current) {
        clearInterval(maintainTimer.current);
      }
      if (resizeHandler.current) {
        window.removeEventListener('resize', resizeHandler.current);
      }
    };
  }, [resolveMiniAkyoUrl, spawnOne]);

  return (
    <>
      <style jsx global>{`
        #miniAkyoBg {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .mini-akyo {
          position: absolute;
          bottom: -12%;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: var(--opacity, 0.35);
          width: var(--size, 96px);
          height: var(--size, 96px);
          left: var(--left, 50vw);
          animation: akyo-float-up var(--duration, 22s) linear infinite;
          will-change: transform, opacity;
          filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.35));
        }

        @keyframes akyo-float-up {
          0% {
            transform: translateY(0) rotate(var(--rotate, 0deg));
            opacity: var(--opacity, 0.35);
          }
          100% {
            transform: translateY(-120vh) rotate(calc(var(--rotate, 0deg) + 360deg));
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mini-akyo {
            animation: none;
            opacity: 0.08;
          }
        }
      `}</style>

      <div
        id="miniAkyoBg"
        ref={containerRef}
        aria-hidden="true"
  className={className}
  data-image-url={imageUrl}
  data-density={density}
      />
    </>
  );
}
