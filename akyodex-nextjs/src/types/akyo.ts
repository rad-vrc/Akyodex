/**
 * Akyoデータの型定義
 */

export interface AkyoData {
  id: string; // 3桁のID番号 (例: "001")
  appearance: string; // 見た目
  nickname: string; // 通称
  avatarName: string; // アバター名
  attribute: string; // 属性（カンマ区切りで複数可）
  notes: string; // 備考（複数行対応）
  creator: string; // 作者名
  avatarUrl: string; // VRChatアバターURL
  isFavorite?: boolean; // お気に入りフラグ（クライアント側）
}

/**
 * CSVの生データ（ヘッダーに対応）
 */
export interface AkyoCsvRow {
  ID: string;
  見た目: string;
  通称: string;
  アバター名: string;
  属性?: string;
  '属性（モチーフが基準）'?: string;
  備考: string;
  作者?: string;
  '作者（敬称略）'?: string;
  アバターURL: string;
}

/**
 * フィルターオプション
 */
export interface AkyoFilterOptions {
  searchQuery?: string;
  attribute?: string;
  creator?: string;
  randomCount?: number;
  favoritesOnly?: boolean;
}

/**
 * ビューモード
 */
export type ViewMode = 'grid' | 'list';

/**
 * 認証レベル
 */
export type AuthRole = 'owner' | 'admin' | null;

/**
 * 画像マニフェスト
 */
export type ImageManifest = Record<string, string>; // { "001": "https://images.akyodex.com/images/001.webp" }

/**
 * API レスポンス型
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * アップロードレスポンス
 */
export interface UploadResponse {
  ok: boolean;
  id: string;
  url: string;
  key: string;
  updatedAt: string;
}

/**
 * VRChat アバター情報
 */
export interface VRChatAvatarInfo {
  name: string;
  author?: string;
  imageUrl?: string;
}
