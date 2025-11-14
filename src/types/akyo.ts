/**
 * Akyoデータの型定義
 */

export interface AkyoData {
  id: string; // 4桁のID番号 (例: "0001")
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
export type AdminRole = 'owner' | 'admin';

export type AuthRole = AdminRole | null;

/**
 * VRChat アバター情報
 */
export interface VRChatAvatarInfo {
  avatarName: string;
  creatorName: string;
  description: string;
  fullTitle: string;
  avtr: string;
}
