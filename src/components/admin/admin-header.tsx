'use client';

import { IconHome, IconShield, IconSignOut } from '@/components/icons';
import type { AuthRole } from '@/types/akyo';
import Link from 'next/link';

interface AdminHeaderProps {
  isAuthenticated: boolean;
  userRole: AuthRole;
  onLogout: () => void;
}

/**
 * Admin Header Component
 * 管理画面のヘッダー（完全再現）
 */
export function AdminHeader({ isAuthenticated, userRole, onLogout }: AdminHeaderProps) {
  const roleText = userRole === 'owner' ? 'オーナー' : userRole === 'admin' ? '管理者' : '';

  return (
    <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center" aria-hidden="true">
              <IconShield size="w-5 h-5" className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Akyoずかん ファインダーモード</h1>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && userRole && (
              <span className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm">
                {roleText}
              </span>
            )}
            <Link
              href="/zukan"
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
            >
              <IconHome size="w-4 h-4" className="mr-1" /> 図鑑に戻る
            </Link>
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
              >
                <IconSignOut size="w-4 h-4" className="mr-1" /> ログアウト
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
