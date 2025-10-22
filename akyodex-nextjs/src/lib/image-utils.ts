import type { ImageManifest } from '@/types/akyo';

/**
 * 画像マニフェストの取得（クライアント側）
 */
export async function fetchImageManifest(): Promise<ImageManifest> {
  try {
    const response = await fetch('/api/manifest', {
      cache: 'no-store',
      next: { revalidate: 60 }, // 60秒ごとに再検証
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Failed to load image manifest:', error);
    return {};
  }
}

/**
 * AkyoのIDから画像URLを生成
 */
export function getAkyoImageUrl(
  id: string,
  manifest?: ImageManifest,
  fallbackToVRChat?: boolean,
  avatarUrl?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
  
  // 1. マニフェストから取得
  if (manifest && manifest[id]) {
    return manifest[id];
  }
  
  // 2. R2直リンク
  const r2Url = `${baseUrl}/images/${id}.webp`;
  
  // 3. VRChatフォールバック（オプション）
  if (fallbackToVRChat && avatarUrl) {
    return getVRChatProxyUrl(avatarUrl);
  }
  
  return r2Url;
}

/**
 * VRChat画像プロキシURLを生成
 */
export function getVRChatProxyUrl(avatarUrl: string): string {
  if (!avatarUrl) return '';
  
  // 既にプロキシURL化されている場合はそのまま返す
  if (avatarUrl.includes('/api/vrc-avatar-image')) {
    return avatarUrl;
  }
  
  // VRChatのアバターIDを抽出
  const match = avatarUrl.match(/\/avatars\/(avtr_[a-f0-9-]+)/);
  if (!match) return '';
  
  return `/api/vrc-avatar-image?avtr=${match[1]}`;
}

/**
 * 画像のフォールバックチェーン
 */
export function getImageFallbackUrls(id: string, avatarUrl?: string): string[] {
  const baseUrl = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
  const urls: string[] = [
    `${baseUrl}/images/${id}.webp`,
    `${baseUrl}/images/${id}.png`,
    `${baseUrl}/images/${id}.jpg`,
  ];
  
  // VRChatフォールバック
  if (avatarUrl) {
    const proxyUrl = getVRChatProxyUrl(avatarUrl);
    if (proxyUrl) urls.push(proxyUrl);
  }
  
  // 静的フォールバック
  urls.push(`/images/${id}.webp`);
  urls.push('/images/placeholder.webp');
  
  return urls;
}

/**
 * 画像URLのプリロード
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 複数画像の並列プリロード
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => preloadImage(url).catch(() => {})));
}
