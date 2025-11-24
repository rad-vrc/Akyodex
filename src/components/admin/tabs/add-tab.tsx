'use client';

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AttributeModal } from '../attribute-modal';

interface AddTabProps {
  // 新フィールド
  categories?: string[];
  authors?: string[];
  // 旧フィールド（互換性）
  attributes: string[];
  creators: string[];
}

/**
 * Add Tab Component
 * 新規登録タブ（完全再現 + VRChat自動取得 + 属性管理）
 */
export function AddTab({ categories, authors, attributes, creators }: AddTabProps) {
  // 新旧フィールドのマージ
  const allAttributes = categories || attributes;
  const allCreators = authors || creators;

  const [nextId, setNextId] = useState('0001');
  const [formData, setFormData] = useState({
    nickname: '',
    avatarName: '',
    categories: [] as string[],
    author: '',
    avatarUrl: '',
    comment: '',
  });

  // Fetch next available ID on component mount
  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const response = await fetch('/api/admin/next-id');
        if (response.ok) {
          const data = await response.json();
          setNextId(data.nextId);
        } else {
          console.error('Failed to fetch next ID, using default');
        }
      } catch (error) {
        console.error('Error fetching next ID:', error);
      }
    };

    fetchNextId();
  }, []);

  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [fetchingName, setFetchingName] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [showCreatorSuggestions, setShowCreatorSuggestions] = useState(false);
  const [creatorSuggestions, setCreatorSuggestions] = useState<string[]>([]);

  // Ref for file input (better than document.getElementById)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image cropping states
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Duplicate check states
  const [nicknameStatus, setNicknameStatus] = useState({
    message: '',
    tone: 'neutral' as 'neutral' | 'success' | 'error',
  });
  const [avatarNameStatus, setAvatarNameStatus] = useState({
    message: '',
    tone: 'neutral' as 'neutral' | 'success' | 'error',
  });
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [checkingAvatarName, setCheckingAvatarName] = useState(false);

  // Update image transform when position or scale changes
  useEffect(() => {
    const img = cropImageRef.current;
    if (img) {
      img.style.transform = `translate(${imageX}px, ${imageY}px) scale(${imageScale})`;
    }
  }, [imageX, imageY, imageScale]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.avatarName.trim()) {
      alert('アバター名は必須です');
      return;
    }
    if (!formData.author.trim()) {
      alert('作者は必須です');
      return;
    }
    if (formData.categories.length === 0) {
      alert('カテゴリを1つ以上選択してください');
      return;
    }

    // Check for duplicates
    if (nicknameStatus.tone === 'error' || avatarNameStatus.tone === 'error') {
      if (!confirm('重複する通称またはアバター名が検出されました。\n登録を続行しますか？')) {
        return;
      }
    }

    // Generate cropped image if available
    let croppedImageData: string | null = null;
    if (showImagePreview && originalImageSrc) {
      croppedImageData = await generateCroppedImage();
      if (!croppedImageData) {
        alert('画像の生成に失敗しました');
        return;
      }
    }

    // Show loading state
    const formEl = e.currentTarget as HTMLFormElement | null;
    if (!formEl) {
      console.error('Form element not found on submit');
      return;
    }
    const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const originalText = submitBtn?.innerHTML || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 登録中...';
    }

    try {
      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('id', nextId);
      submitData.append('nickname', formData.nickname);
      submitData.append('avatarName', formData.avatarName);
      submitData.append('avatarUrl', formData.avatarUrl);
      
      // 新フィールド
      submitData.append('author', formData.author);
      submitData.append('category', formData.categories.join(','));
      submitData.append('comment', formData.comment);
      
      // 旧フィールド (互換性のため)
      submitData.append('creator', formData.author);
      submitData.append('attributes', formData.categories.join(','));
      submitData.append('notes', formData.comment);
      
      if (croppedImageData) {
        submitData.append('imageData', croppedImageData);
      }

      // Submit to API
      const response = await fetch('/api/upload-akyo', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'サーバーエラーが発生しました');
      }

      // Success!
      alert(
        `✅ ${result.message}\n\n` +
        `ID: #${nextId}\n` +
        `アバター名: ${formData.avatarName}\n` +
        `作者: ${formData.author}\n\n` +
        (result.commitUrl ? `コミット: ${result.commitUrl}` : '')
      );

      // Reset form
      setFormData({
        nickname: '',
        avatarName: '',
        categories: [],
        author: '',
        avatarUrl: '',
        comment: '',
      });
      setShowImagePreview(false);
      setOriginalImageSrc(null);
      setNicknameStatus({ message: '', tone: 'neutral' });
      setAvatarNameStatus({ message: '', tone: 'neutral' });

      // Increment next ID for next registration
      const currentId = parseInt(nextId, 10);
      if (!isNaN(currentId)) {
        setNextId((currentId + 1).toString().padStart(4, '0'));
      }

    } catch (error) {
      console.error('Form submission error:', error);
      alert(
        '❌ 登録に失敗しました\n\n' +
        (error instanceof Error ? error.message : '不明なエラーが発生しました') +
        '\n\nもう一度お試しください。'
      );
    } finally {
      // Restore button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 作者フィールドの場合、サジェストを更新
    if (field === 'author' && typeof value === 'string') {
      if (value.trim()) {
        const filtered = allCreators.filter(c =>
          c.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10);
        setCreatorSuggestions(filtered);
        setShowCreatorSuggestions(filtered.length > 0);
      } else {
        setShowCreatorSuggestions(false);
      }
    }
  };

  const handleSelectCreator = (creator: string) => {
    handleInputChange('author', creator);
    setShowCreatorSuggestions(false);
  };

  // Generic duplicate check function
  const handleCheckDuplicate = async (field: 'nickname' | 'avatarName', value: string) => {
    const trimmedValue = value.trim();

    const setStatus = field === 'nickname' ? setNicknameStatus : setAvatarNameStatus;
    const setChecking = field === 'nickname' ? setCheckingNickname : setCheckingAvatarName;
    const fieldLabel = field === 'nickname' ? '通称' : 'アバター名';

    if (!trimmedValue) {
      setStatus({
        message: `${fieldLabel}を入力してください`,
        tone: 'neutral',
      });
      return;
    }

    setChecking(true);
    setStatus({ message: '', tone: 'neutral' });

    try {
      const response = await fetch('/api/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          value: trimmedValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Duplicate check failed');
      }

      const data = await response.json();
      setStatus({
        message: data.message,
        tone: data.isDuplicate ? 'error' : 'success',
      });
    } catch (error) {
      console.error(`${fieldLabel} duplicate check error:`, error);
      setStatus({
        message: '重複チェックに失敗しました',
        tone: 'error',
      });
    } finally {
      setChecking(false);
    }
  };

  // Wrapper functions for backward compatibility
  const handleCheckNicknameDuplicate = () => handleCheckDuplicate('nickname', formData.nickname);
  const handleCheckAvatarNameDuplicate = () => handleCheckDuplicate('avatarName', formData.avatarName);

  // Image cropping functions (matching original implementation)
  const resetImagePosition = () => {
    setImageScale(1);
    const container = cropContainerRef.current;
    const img = cropImageRef.current;
    if (container && img) {
      const cw = container.offsetWidth;
      const ch = container.offsetHeight;
      const iw = img.offsetWidth;
      const ih = img.offsetHeight;
      setImageX((cw - iw) / 2);
      setImageY((ch - ih) / 2);
    } else {
      setImageX(0);
      setImageY(0);
    }
  };

  const zoomImage = (factor: number) => {
    setImageScale(prev => {
      const newScale = prev * factor;
      return Math.max(0.5, Math.min(3, newScale));
    });
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgSrc = e.target?.result as string;
      setOriginalImageSrc(imgSrc);
      setShowImagePreview(true);

      // Wait for image to load
      setTimeout(() => {
        const img = cropImageRef.current;
        const container = cropContainerRef.current;
        if (img && container) {
          img.onload = () => {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const containerAspect = containerWidth / containerHeight;

            // Initial scale setting
            if (imgAspect > containerAspect) {
              img.style.height = containerHeight + 'px';
              img.style.width = 'auto';
            } else {
              img.style.width = containerWidth + 'px';
              img.style.height = 'auto';
            }

            // Center image
            const imgWidth = img.offsetWidth;
            const imgHeight = img.offsetHeight;
            setImageX((containerWidth - imgWidth) / 2);
            setImageY((containerHeight - imgHeight) / 2);
            setImageScale(1);
          };
        }
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imageX,
      y: e.clientY - imageY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImageX(e.clientX - dragStart.x);
      setImageY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomImage(delta);
  };

  const generateCroppedImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const container = cropContainerRef.current;
      const imgEl = cropImageRef.current;
      if (!container || !imgEl || !imgEl.src || !originalImageSrc) {
        resolve(null);
        return;
      }

      const canvasW = 300;
      const canvasH = 200;
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      const image = new Image();
      image.onload = () => {
        const cw = container.offsetWidth;
        const ch = container.offsetHeight;
        const iw = image.naturalWidth;
        const ih = image.naturalHeight;
        const containerAspect = cw / ch;
        const imageAspect = iw / ih;

        const baseScale = imageAspect > containerAspect ? (ch / ih) : (cw / iw);
        const totalScale = baseScale * imageScale;

        const sx = Math.max(0, (-imageX) / totalScale);
        const sy = Math.max(0, (-imageY) / totalScale);
        const sw = Math.min(iw - sx, cw / totalScale);
        const sh = Math.min(ih - sy, ch / totalScale);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvasW, canvasH);

        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        }, 'image/webp', 0.9);
      };
      image.crossOrigin = 'anonymous';
      image.src = originalImageSrc;
    });
  };

  // VRChat URLからアバター名を取得
  const handleFetchAvatarName = async () => {
    const url = formData.avatarUrl.trim();
    if (!url) {
      alert('VRChat URLを入力してください');
      return;
    }

    const match = url.match(/avtr_[A-Za-z0-9-]+/);
    if (!match) {
      alert('有効なVRChatアバターURLを入力してください\n例: https://vrchat.com/home/avatar/avtr_xxx...');
      return;
    }

    const avtrId = match[0];
    setFetchingName(true);

    // Add timeout handling with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`/api/vrc-avatar-info?avtr=${avtrId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`アバター情報取得に失敗しました: ${response.status}`);
      }

      const data = await response.json();
      handleInputChange('avatarName', data.avatarName || '');

      // 成功通知
      setTimeout(() => setFetchingName(false), 1000);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('VRChatアバター名取得エラー:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        alert('リクエストがタイムアウトしました。\nもう一度お試しください。');
      } else {
        alert('VRChatからアバター名を取得できませんでした。\nURLが正しいか、アバターが公開設定か確認してください。');
      }
      setFetchingName(false);
    }
  };

  // VRChat URLから画像を取得
  const handleFetchImage = async () => {
    const url = formData.avatarUrl.trim();
    if (!url) {
      alert('VRChat URLを入力してください');
      return;
    }

    const match = url.match(/avtr_[A-Za-z0-9-]+/);
    if (!match) {
      alert('有効なVRChatアバターURLを入力してください\n例: https://vrchat.com/home/avatar/avtr_xxx...');
      return;
    }

    const avtrId = match[0];
    setFetchingImage(true);

    // Add timeout handling with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`/api/vrc-avatar-image?avtr=${avtrId}&w=1024`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`画像取得に失敗しました: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], `${avtrId}.webp`, { type: 'image/webp' });

      // Display image in cropping preview
      handleImageFile(file);

      setTimeout(() => setFetchingImage(false), 1000);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('VRChat画像取得エラー:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        alert('リクエストがタイムアウトしました。\nもう一度お試しください。');
      } else {
        alert('VRChatから画像を取得できませんでした。\nURLが正しいか、アバターが公開設定か確認してください。');
      }
      setFetchingImage(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        <i className="fas fa-plus-circle text-red-500 mr-2"></i> 新しいAkyoを登録
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID（自動採番） */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              ID（自動採番）
            </label>
            <input
              type="text"
              value={nextId}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono font-bold"
            />
            <p className="mt-2 text-xs text-gray-500 leading-snug">
              画像IDの自動割り当てはローカルに保存された画像を優先的に参照し、未使用の番号（CSV未登録の画像も含む）から決定されます。
            </p>
          </div>

          {/* 通称 */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="block text-gray-700 text-sm font-medium">通称</label>
              <button
                type="button"
                onClick={handleCheckNicknameDuplicate}
                disabled={checkingNickname}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-orange-200 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingNickname ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    確認中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    同じ通称が既に登録されているか確認
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => {
                handleInputChange('nickname', e.target.value);
                // Clear status when user changes input
                setNicknameStatus({ message: '', tone: 'neutral' });
              }}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="例: チョコミントAkyo"
            />
            {nicknameStatus.message && (
              <p
                className={`mt-2 text-sm ${ 
                  nicknameStatus.tone === 'error'
                    ? 'text-red-600'
                    : nicknameStatus.tone === 'success'
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}
              >
                {nicknameStatus.message}
              </p>
            )}
          </div>

          {/* アバター名 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              アバター名
            </label>
            <input
              type="text"
              value={formData.avatarName}
              onChange={(e) => {
                handleInputChange('avatarName', e.target.value);
                // Clear status when user changes input
                setAvatarNameStatus({ message: '', tone: 'neutral' });
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="例: Akyo origin"
            />
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={handleCheckAvatarNameDuplicate}
                disabled={checkingAvatarName}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-orange-200 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingAvatarName ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    確認中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    同じアバター名が既に登録されているか確認
                  </>
                )}
              </button>
              {avatarNameStatus.message && (
                <p
                  className={`text-sm ${ 
                    avatarNameStatus.tone === 'error'
                      ? 'text-red-600'
                      : avatarNameStatus.tone === 'success'
                      ? 'text-green-600'
                      : 'text-gray-600'
                  }`}
                >
                  {avatarNameStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* カテゴリ (旧: 属性) */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">カテゴリ</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAttributeModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 transition-colors"
              >
                <i className="fas fa-tags"></i>
                カテゴリを管理
              </button>
              <div className="border border-dashed border-green-200 rounded-lg bg-white/60 p-3 min-h-[60px]">
                {formData.categories.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    選択されたカテゴリがここに表示されます
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                      >
                        <i className="fas fa-tag text-xs"></i>
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 作者 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">作者</label>
            <div className="relative">
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                onFocus={() => {
                  if (formData.author.trim() && creatorSuggestions.length > 0) {
                    setShowCreatorSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // 少し遅延させてクリックイベントを処理できるようにする
                  setTimeout(() => setShowCreatorSuggestions(false), 200);
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="例: ugai"
                autoComplete="off"
              />

              {/* オートコンプリートサジェスト */}
              {showCreatorSuggestions && creatorSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30">
                  {creatorSuggestions.map((creator) => (
                    <button
                      key={creator}
                      type="button"
                      onClick={() => handleSelectCreator(creator)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-user mr-2 text-gray-400"></i>
                      {creator}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* VRChat URL */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
              <label className="text-gray-700 text-sm font-medium">VRChat URL</label>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleFetchAvatarName}
                  disabled={fetchingName}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-1.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="VRChat URLからアバター名を自動取得"
                >
                  {fetchingName ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>取得中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      <span>URLからアバター名を取得</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFetchImage}
                  disabled={fetchingImage}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-1.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="VRChat URLから画像を自動取得"
                >
                  {fetchingImage ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>取得中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>URLから画像を取得</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <input
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://vrchat.com/..."
            />
          </div>
        </div>

        {/* 備考（comment） */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">備考</label>
          <textarea
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Quest対応、特殊機能など"
          />
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">画像</label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
          >
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-600">画像をドラッグ&ドロップ または</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".webp,.png,.jpg,.jpeg"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ファイルを選択
            </button>
          </div>

          {/* Image Cropping Preview (元の実装を完全再現) */}
          {showImagePreview && (
            <div className="mt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  <i className="fas fa-crop mr-2"></i>画像のトリミング調整
                </h3>

                {/* Crop Container */}
                <div
                  ref={cropContainerRef}
                  className="relative mx-auto mb-4 overflow-hidden border-2 border-indigo-500 rounded-lg"
                  style={{ width: '300px', height: '200px' }}
                  onWheel={handleWheel}
                >
                  <img
                    ref={cropImageRef}
                    src={originalImageSrc || ''}
                    alt="Crop preview"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute cursor-move"
                    style={{
                      transform: `translate(${imageX}px, ${imageY}px) scale(${imageScale})`,
                      transformOrigin: 'center',
                    }}
                    draggable={false}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={resetImagePosition}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    <i className="fas fa-redo mr-1"></i> リセット
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomImage(1.1)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    <i className="fas fa-search-plus mr-1"></i> 拡大
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomImage(0.9)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    <i className="fas fa-search-minus mr-1"></i> 縮小
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            登録すると画像も公開環境へ自動でアップロードされ、図鑑でもすぐ表示されます（対応形式: WebP / PNG / JPG）。
          </p>
        </div>

        {/* 登録ボタン */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <i className="fas fa-save mr-2"></i> 登録する
        </button>
      </form>

      {/* 属性管理モーダル */}
      <AttributeModal
        isOpen={showAttributeModal}
        onClose={() => setShowAttributeModal(false)}
        currentAttributes={formData.categories}
        onApply={(attributes) => handleInputChange('categories', attributes)}
        allAttributes={allAttributes}
      />
    </div>
  );
}
