'use client';

import { useState, useEffect } from 'react';

interface AttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAttributes: string[];
  onApply: (attributes: string[]) => void;
  allAttributes: string[];
}

/**
 * Attribute Management Modal
 * 属性管理モーダル（完全再現）
 */
export function AttributeModal({
  isOpen,
  onClose,
  currentAttributes,
  onApply,
  allAttributes,
}: AttributeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [availableAttributes, setAvailableAttributes] = useState<string[]>(allAttributes);

  useEffect(() => {
    if (isOpen) {
      setSelectedAttributes([...currentAttributes]);
    }
  }, [isOpen, currentAttributes]);

  useEffect(() => {
    setAvailableAttributes(allAttributes);
  }, [allAttributes]);

  const filteredAttributes = availableAttributes.filter((attr) =>
    attr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleAttribute = (attr: string) => {
    setSelectedAttributes((prev) => {
      if (prev.includes(attr)) {
        return prev.filter((a) => a !== attr);
      } else {
        return [...prev, attr];
      }
    });
  };

  const handleCreateAttribute = () => {
    const trimmed = newAttributeName.trim();
    if (!trimmed) {
      alert('属性名を入力してください');
      return;
    }

    if (availableAttributes.includes(trimmed)) {
      alert('この属性は既に存在します');
      return;
    }

    setAvailableAttributes((prev) => [...prev, trimmed].sort());
    setSelectedAttributes((prev) => [...prev, trimmed]);
    setNewAttributeName('');
    setShowCreateForm(false);
  };

  const handleApply = () => {
    onApply(selectedAttributes);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attributeModalTitle"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 flex min-h-full items-center justify-center px-4 py-8 sm:py-12"
        onClick={handleBackdropClick}
      >
        {/* Modal Content */}
        <div
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-5rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3
              id="attributeModalTitle"
              className="text-lg font-bold text-gray-800 flex items-center gap-2"
            >
              <i className="fas fa-tags text-green-500" aria-hidden="true"></i>
              属性を管理
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">閉じる</span>
              <i className="fas fa-times text-xl" aria-hidden="true"></i>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 flex-1 overflow-y-auto">
            {/* Search and Create Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="属性を検索"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-green-300 bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
              >
                <i className="fas fa-plus-circle" aria-hidden="true"></i>
                新しい属性を作成
              </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div>
                  <label
                    htmlFor="attributeNewInput"
                    className="block text-sm font-medium text-green-900 mb-1"
                  >
                    新しい属性名
                  </label>
                  <input
                    type="text"
                    id="attributeNewInput"
                    value={newAttributeName}
                    onChange={(e) => setNewAttributeName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateAttribute();
                      }
                    }}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="例: チョコミント類"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewAttributeName('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAttribute}
                    className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                  >
                    追加する
                  </button>
                </div>
              </div>
            )}

            {/* Attribute List */}
            <div className="border border-gray-200 rounded-2xl">
              <div className="max-h-72 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                  {filteredAttributes.map((attr) => {
                    const isSelected = selectedAttributes.includes(attr);
                    return (
                      <button
                        key={attr}
                        type="button"
                        onClick={() => handleToggleAttribute(attr)}
                        className={`px-4 py-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-green-100 border-2 border-green-500 text-green-800 font-semibold'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <i
                          className={`fas ${
                            isSelected ? 'fa-check-circle' : 'fa-circle'
                          } mr-2`}
                          aria-hidden="true"
                        ></i>
                        {attr}
                      </button>
                    );
                  })}
                </div>
              </div>
              {filteredAttributes.length === 0 && (
                <p className="px-4 pb-4 text-sm text-gray-500">
                  一致する属性がありません。
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow hover:opacity-90 transition-opacity"
            >
              選択を決定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
