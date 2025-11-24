/**
 * Akyoデータの型定義
 */

export interface AkyoData {
  id: string; // 4桁のID番号 (例: "0001")
  appearance: string; // 見た目（削除予定）
  nickname: string; // 通称
  avatarName: string; // アバター名
  
  // 新スキーマ
  category: string; // 属性（旧 attribute）
  comment: string; // 備考（旧 notes）
  author: string; // 作者名（旧 creator）

  // 旧スキーマ（互換性のため維持、将来的に削除）
  /** @deprecated Use category instead */
  attribute: string; 
  /** @deprecated Use comment instead */
  notes: string;
  /** @deprecated Use author instead */
  creator: string;

  avatarUrl: string; // VRChatアバターURL
  isFavorite?: boolean; // お気に入りフラグ（クライアント側）
}

/**
 * CSVの生データ（ヘッダーに対応）
 */
export interface AkyoCsvRow {
  ID: string;
  Nickname: string;
  AvatarName: string;
  Category: string;
  Comment: string;
  Author: string;
  AvatarURL: string;
}

/**
 * フィルターオプション
 */
export interface AkyoFilterOptions {
  searchQuery?: string;
  category?: string; // 新フィールド
  author?: string;   // 新フィールド
  randomCount?: number;
  favoritesOnly?: boolean;
  
  /** @deprecated Use category instead */
  attribute?: string;
  /** @deprecated Use author instead */
  creator?: string;
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
