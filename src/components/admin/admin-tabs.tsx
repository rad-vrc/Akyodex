'use client';

import { useState } from 'react';
import { AddTab } from './tabs/add-tab';
import { EditTab } from './tabs/edit-tab';
import { ToolsTab } from './tabs/tools-tab';

import type { AdminRole, AkyoData } from '@/types/akyo';

interface AdminTabsProps {
  userRole: AdminRole;
  attributes: string[];
  creators: string[];
  akyoData: AkyoData[];
}

type TabType = 'add' | 'edit' | 'tools';

/**
 * Admin Tabs Component
 * 管理画面のタブナビゲーション（完全再現）
 */
export function AdminTabs({ userRole, attributes, creators, akyoData }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('add');

  const handleDataChange = () => {
  // For now, just show a message that page needs refresh
  // In production, this would trigger a router refresh or data revalidation
    alert('データが更新されました。\nページを再読み込みして最新のデータを表示してください。');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* タブナビゲーション */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-4 font-medium text-gray-700 transition-colors ${
              activeTab === 'add'
                ? 'border-b-2 border-red-500 text-red-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-plus-circle mr-2" aria-hidden="true"></i>
            新規登録
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-6 py-4 font-medium text-gray-700 transition-colors ${
              activeTab === 'edit'
                ? 'border-b-2 border-red-500 text-red-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-edit mr-2" aria-hidden="true"></i>
            編集・削除
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-6 py-4 font-medium text-gray-700 transition-colors ${
              activeTab === 'tools'
                ? 'border-b-2 border-red-500 text-red-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-tools mr-2" aria-hidden="true"></i>
            ツール
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeTab === 'add' && (
          <AddTab
            attributes={attributes}
            creators={creators}
          />
        )}
        {activeTab === 'edit' && (
          <EditTab
            userRole={userRole}
            akyoData={akyoData}
            attributes={attributes}
            onDataChange={handleDataChange}
          />
        )}
  {activeTab === 'tools' && <ToolsTab />}
      </div>
    </div>
  );
}
