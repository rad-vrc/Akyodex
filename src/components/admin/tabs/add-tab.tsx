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
  const formRef = useRef<HTMLFormElement | null>(null);

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
  const [checkingNickname, setCheckingNickname] = useState(false);

  // Update image transform when position or scale changes
  useEffect(() => {
    const img = cropImageRef.current;
    if (img) {
      img.style.transform = `translate(${imageX}px, ${imageY}px) scale(${imageScale})`;
    }
  }, [imageX, imageY, imageScale]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate VRChat URL is required
    const url = formData.avatarUrl.trim();
    if (!url) {
      alert('VRChat URLは必須です');
      return;
    }

    const match = url.match(/avtr_[A-Za-z0-9-]+/);
    if (!match) {
      alert(
        '有効なVRChatアバターURLを入力してください\n例: https://vrchat.com/home/avatar/avtr_xxx...'
      );
      return;
    }

    // Validate categories
    if (formData.categories.length === 0) {
      alert('カテゴリを1つ以上選択してください');
      return;
    }

    // Check for nickname duplicates (if nickname provided)
    if (nicknameStatus.tone === 'error') {
      if (!confirm('重複する通称が検出されました。\n登録を続行しますか？')) {
        return;
      }
    }

    const avtrId = match[0];

    // Show loading state
    const formEl = formRef.current;
    if (!formEl) {
      console.error('Form element not found on submit');
      return;
    }
    const submitBtn = formEl.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const originalText = submitBtn?.innerHTML || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> VRChat情報取得中...';
    }

    // ===== Step 1: Fetch avatar info and image from VRChat =====
    let avatarName = '';
    let creatorName = '';
    let imageFile: File | null = null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Fetch avatar info and image in parallel
      const [infoResponse, imageResponse] = await Promise.all([
        fetch(`/api/vrc-avatar-info?avtr=${avtrId}`, { signal: controller.signal }),
        fetch(`/api/vrc-avatar-image?avtr=${avtrId}&w=1024`, { signal: controller.signal }),
      ]);
      clearTimeout(timeoutId);

      // Process avatar info
      if (!infoResponse.ok) {
        const errorText = await infoResponse.text().catch(() => '');
        throw new Error(
          `アバター情報取得に失敗しました (${infoResponse.status})${
            errorText ? `: ${errorText}` : ''
          }`
        );
      }
      const infoData = await infoResponse.json();
      avatarName = infoData.avatarName || '';
      creatorName = infoData.creatorName || '';

      if (!avatarName) {
        throw new Error('アバター名を取得できませんでした。URLが正しいか確認してください。');
      }
      if (!creatorName) {
        throw new Error('作者名を取得できませんでした。URLが正しいか確認してください。');
      }

      // Process image
      if (!imageResponse.ok) {
        throw new Error(`画像取得に失敗しました (${imageResponse.status})`);
      }
      const blob = await imageResponse.blob();
      imageFile = new File([blob], `${avtrId}.webp`, { type: 'image/webp' });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('VRChat情報取得エラー:', error);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        alert(
          '❌ 登録に失敗しました\n\nリクエストがタイムアウトしました。\nもう一度お試しください。'
        );
      } else {
        alert(
          `❌ 登録に失敗しました\n\n${
            error instanceof Error ? error.message : 'VRChat情報の取得に失敗しました'
          }\n\nURLが正しいか、アバターが公開設定か確認してください。`
        );
      }
      return;
    }

    // Update button text
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 画像処理中...';
    }

    // ===== Step 2: Process image for cropping preview =====
    // Load image into cropping preview
    await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const imgSrc = readerEvent.target?.result as string;
        setOriginalImageSrc(imgSrc);
        setShowImagePreview(true);
        // Give time for image to load
        setTimeout(resolve, 100);
      };
      reader.readAsDataURL(imageFile!);
    });

    // Generate cropped image
    let croppedImageData: string | null = null;
    // Wait a bit more for the image element to be ready
    await new Promise((resolve) => setTimeout(resolve, 200));
    croppedImageData = await generateCroppedImage();
    if (!croppedImageData) {
      // If cropping fails, use original image
      const reader = new FileReader();
      croppedImageData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile!);
      });
    }

    // Update button text for final submission
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 登録中...';
    }

    try {
      // Prepare form data for submission (using fetched values)
      const submitData = new FormData();
      submitData.append('id', nextId);
      submitData.append('nickname', formData.nickname);
      submitData.append('avatarName', avatarName);
      submitData.append('avatarUrl', formData.avatarUrl);

      // 新フィールド (VRChatから取得した作者名を使用)
      submitData.append('author', creatorName);
      submitData.append('category', formData.categories.join(','));
      submitData.append('comment', formData.comment);

      // 旧フィールド (互換性のため)
      submitData.append('creator', creatorName);
      submitData.append('attributes', formData.categories.join(','));
      submitData.append('notes', formData.comment);

      // Always include image data (fetched from VRChat)
      submitData.append('imageData', croppedImageData!);

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
          `アバター名: ${avatarName}\n` +
          `作者: ${creatorName}\n\n` +
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Nickname duplicate check function
  const handleCheckNicknameDuplicate = async () => {
    const trimmedValue = formData.nickname.trim();

    if (!trimmedValue) {
      setNicknameStatus({
        message: '通称を入力してください',
        tone: 'neutral',
      });
      return;
    }

    setCheckingNickname(true);
    setNicknameStatus({ message: '', tone: 'neutral' });

    try {
      const response = await fetch('/api/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'nickname',
          value: trimmedValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Duplicate check failed');
      }

      const data = await response.json();
      setNicknameStatus({
        message: data.message,
        tone: data.isDuplicate ? 'error' : 'success',
      });
    } catch (error) {
      console.error('通称 duplicate check error:', error);
      setNicknameStatus({
        message: '重複チェックに失敗しました',
        tone: 'error',
      });
    } finally {
      setCheckingNickname(false);
    }
  };

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
    setImageScale((prev) => {
      const newScale = prev * factor;
      return Math.max(0.5, Math.min(3, newScale));
    });
  };

  // Note: handleImageFile, handleFileInputChange, handleDrop, handleDragOver
  // were removed - images are now automatically fetched from VRChat URL

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

        const baseScale = imageAspect > containerAspect ? ch / ih : cw / iw;
        const totalScale = baseScale * imageScale;

        const sx = Math.max(0, -imageX / totalScale);
        const sy = Math.max(0, -imageY / totalScale);
        const sw = Math.min(iw - sx, cw / totalScale);
        const sh = Math.min(ih - sy, ch / totalScale);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvasW, canvasH);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            } else {
              resolve(null);
            }
          },
          'image/webp',
          0.9
        );
      };
      image.crossOrigin = 'anonymous';
      image.src = originalImageSrc;
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        <i className="fas fa-plus-circle text-red-500 mr-2"></i> 新しいAkyoを登録
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID（自動採番） */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">ID（自動採番）</label>
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
                    <svg
                      className="w-3 h-3 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
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

          {/* アバター名（登録時にURLから自動取得） */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              アバター名（登録時に自動取得）
            </label>
            <input
              type="text"
              value="登録時にVRChat URLから自動取得"
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
            />
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
                  <p className="text-sm text-gray-500">選択されたカテゴリがここに表示されます</p>
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

          {/* 作者（登録時に自動取得） */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              作者（登録時に自動取得）
            </label>
            <input
              type="text"
              value="登録時にVRChat URLから自動取得"
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
            />
          </div>

          {/* VRChat URL */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">
              VRChat URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://vrchat.com/home/avatar/avtr_..."
            />
            <p className="mt-2 text-xs text-gray-500 leading-snug">
              登録ボタンを押すと、このURLからアバター名・作者名・画像が自動的に取得されます。
            </p>
          </div>
        </div>

        {/* おまけ情報（comment） */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">おまけ情報</label>
          <textarea
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Quest対応、特殊機能など"
          />
        </div>

        {/* 画像（自動取得） */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            画像（登録時に自動取得）
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
            <i className="fas fa-cloud-download-alt text-4xl text-blue-400 mb-2"></i>
            <p className="text-gray-600 font-medium">VRChat URLから自動取得</p>
            <p className="text-sm text-gray-500 mt-1">
              登録ボタンを押すと、VRChatから画像を自動的に取得します
            </p>
          </div>

          {/* Image Cropping Preview (自動取得後に表示) */}
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
            登録すると画像も公開環境へ自動でアップロードされ、図鑑でもすぐ表示されます。
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
