// Akyo図鑑 管理者用JavaScript
console.debug('admin.js loading started');

// 認証ワードはサーバー側（Cloudflare ENV）で検証。フロントには保存しない

// グローバル変数
let currentUserRole = null;
let akyoData = [];
let imageDataMap = {}; // AkyoIDと画像の紐付け
let adminSessionToken = null; // 認証ワードはメモリ内にのみ保持
let hasBoundActionDelegation = false;

const FINDER_PREFILL_VALUE = 'Akyo';

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;',
    };
    return String(value).replace(/[&<>"'`]/g, (char) => escapeMap[char] || char);
}

function loadFavoritesArray() {
    try {
        const raw = localStorage.getItem('akyoFavorites');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse favorites for admin tools. Resetting storage.', error);
        try { localStorage.removeItem('akyoFavorites'); } catch (_) {}
        return [];
    }
}

function applyFinderRegistrationDefaults({ force = false } = {}) {
    const addTab = document.getElementById('addTab');
    if (!addTab) return;

    const nicknameInput = addTab.querySelector('input[name="nickname"]');
    if (nicknameInput && (force || !nicknameInput.value)) {
        nicknameInput.value = FINDER_PREFILL_VALUE;
    }

    const avatarNameInput = addTab.querySelector('input[name="avatarName"]');
    if (avatarNameInput && (force || !avatarNameInput.value)) {
        avatarNameInput.value = FINDER_PREFILL_VALUE;
    }
}

// 必須/任意DOMの存在チェック（初期化時に一括検査）
function verifyRequiredDom() {
    // ページ機能の中核に必要な要素
    const requiredIds = [
        'loginScreen', 'adminScreen',
        'addTab', 'editTab',
        'editList', 'editSearchInput',
        'editModal', 'editModalContent'
    ];
    const missing = requiredIds.filter(id => !document.getElementById(id));
    if (missing.length) {
        const msg = `管理画面の必須要素が見つかりません: ${missing.join(', ')}`;
        console.warn(msg);
        try { showNotification(msg, 'warning'); } catch(_) {}
    }

    // 機能限定で使用する任意要素（欠落時は機能を自動的に無効化）
    const optionalIds = [
        'imageGallery', 'imageCount',
        'imageMappingList', 'uploadProgress', 'progressBar', 'progressText', 'totalFiles'
    ];
    const missingOpt = optionalIds.filter(id => !document.getElementById(id));
    if (missingOpt.length) {
        console.debug('任意要素が未配置のため、関連機能は自動的にスキップ:', missingOpt);
    }
}

// 命名整合用のエイリアス（徐々に adminAkyoRecords / adminImageDataMap へ移行）
try {
    Object.defineProperty(window, 'adminAkyoRecords', { get: () => akyoData });
    Object.defineProperty(window, 'adminImageDataMap', { get: () => imageDataMap });
} catch (_) {
    window.adminAkyoRecords = akyoData;
    window.adminImageDataMap = imageDataMap;
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.debug('DOMContentLoaded - Admin page');

    // 旧バージョンで保存された認証ワードを確実に破棄
    sessionStorage.removeItem('akyoAdminToken');

    setupEventListeners();
    setupDragDrop();

    // DOMの検査（欠落は警告表示）
    verifyRequiredDom();

    applyFinderRegistrationDefaults();

    // 未保存の作業がある場合は離脱確認を表示
    window.addEventListener('beforeunload', (e) => {
        if (!hasUnsavedWork()) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // 他タブのログアウト操作と同期
    window.addEventListener('storage', (event) => {
        if (event.key === 'akyo:logoutTS') {
            location.reload();
        }
    });
});

function hasUnsavedWork() {
    if (Array.isArray(window.pendingCSVData) && window.pendingCSVData.length > 0) {
        return true;
    }

    const pendingEditImages = window.__pendingEditImages;
    if (pendingEditImages && typeof pendingEditImages === 'object' && Object.keys(pendingEditImages).length > 0) {
        return true;
    }

    if (Array.isArray(window.pendingImageMappings) && window.pendingImageMappings.length > 0) {
        if (document.querySelector('.mapping-item .save-btn:not([disabled])')) {
            return true;
        }
    }

    return false;
}

// ESCで編集モーダルを閉じる
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('editModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeEditModal();
        }
    }
});

function handleAdminActionClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'remove-image') {
        event.preventDefault();
        if (id) {
            removeImage(id);
        }
        return;
    }

    if (action === 'remove-edit-image') {
        event.preventDefault();
        if (id) {
            removeImageForId(id);
        }
        return;
    }

    if (!id) return;

    if (action === 'edit') {
        event.preventDefault();
        editAkyo(id);
    } else if (action === 'delete') {
        event.preventDefault();
        deleteAkyo(id);
    }
}

// イベントリスナー設定
function setupEventListeners() {
    const useCustomCropper = !!document.getElementById('cropContainer');

    // ログインフォーム
    const loginForm = document.getElementById('finderLoginForm') || document.querySelector('#loginScreen form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 画像入力
    const imageInput = document.getElementById('imageInput');
    if (imageInput && !useCustomCropper) {
        imageInput.addEventListener('change', handleImageSelect);
    }

    const bulkImageInput = document.getElementById('bulkImageInput');
    if (bulkImageInput) {
        bulkImageInput.addEventListener('change', handleBulkImageSelect);
    }

    const csvInput = document.getElementById('csvInput');
    if (csvInput) {
        csvInput.addEventListener('change', handleCSVSelect);
    }

    // 編集タブの検索
    const editSearchInput = document.getElementById('editSearchInput');
    if (editSearchInput) {
        // 入力時に検索
        editSearchInput.addEventListener('input', debounce(searchForEdit, 300));
        // 初期表示で全件を表示（空文字検索）
        setTimeout(() => searchForEdit(), 0);
    }

    if (!hasBoundActionDelegation) {
        document.addEventListener('click', handleAdminActionClick);
        hasBoundActionDelegation = true;
    }
}

// ドラッグ&ドロップ設定
function setupDragDrop() {
    const useCustomCropper = !!document.getElementById('cropContainer');

    // 画像ドロップゾーン
    const imageDropZone = document.getElementById('imageDropZone');
    if (!useCustomCropper) {
        setupDropZone(imageDropZone, handleImageDrop);
    }

    // CSV ドロップゾーン
    const csvDropZone = document.getElementById('csvDropZone');
    setupDropZone(csvDropZone, handleCSVDrop);

    // 一括画像ドロップゾーン
    const bulkImageDropZone = document.getElementById('bulkImageDropZone');
    setupDropZone(bulkImageDropZone, handleBulkImageDrop);
}

// ドロップゾーンの共通設定
function setupDropZone(element, dropHandler) {
    if (!element) return;

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('dragover');
    });

    element.addEventListener('dragleave', () => {
        element.classList.remove('dragover');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
        dropHandler(e);
    });
}

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();

    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');

    // メモリ上にのみ保持し、Storageへは保存しない
    adminSessionToken = password;
    try {
        const res = await fetch('/api/whoami', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${password}` },
        });
        let json = null;
        try { json = await res.json(); } catch(_) {}
        if (res.ok && json?.role) {
            currentUserRole = json.role;
            sessionStorage.setItem('akyoAdminAuth', currentUserRole);
            showAdminScreen();
            showNotification(`${currentUserRole === 'owner' ? 'マスター' : 'ファインダー'}権限でログインしました`, 'success');
            applyFinderRegistrationDefaults();
            return;
        }
        // ステータス別エラー
        if (res.status === 401 || res.status === 403) {
            throw new Error('unauthorized');
        } else if (res.status >= 500) {
            throw new Error('server');
        } else {
            throw new Error('request');
        }
    } catch (e) {
        adminSessionToken = null;
        const kind = (e && e.message) || '';
        let msg = '<i class="fas fa-exclamation-circle mr-1"></i> 予期せぬエラーが発生しました';
        if (kind === 'unauthorized') msg = '<i class="fas fa-exclamation-circle mr-1"></i> Akyoワードが正しくありません';
        else if (kind === 'server') msg = '<i class="fas fa-server mr-1"></i> サーバーエラーです。しばらく待って再試行してください';
        else if (kind === 'request') msg = '<i class="fas fa-exclamation-triangle mr-1"></i> 認証に失敗しました';
        else if (e && (e.name === 'TypeError' || e.message === 'Failed to fetch')) msg = '<i class="fas fa-wifi mr-1"></i> ネットワークに接続できません';
        if (errorDiv) {
            errorDiv.classList.remove('hidden');
            errorDiv.innerHTML = msg;
            setTimeout(() => errorDiv.classList.add('hidden'), 4000);
        } else {
            showNotification(msg.replace(/<[^>]+>/g, ''), 'error');
        }
    }
}

// グローバルスコープに公開
window.handleLogin = handleLogin;

// 管理画面表示
function showAdminScreen() {
    console.debug('showAdminScreen called');

    const loginScreen = document.getElementById('loginScreen');
    const adminScreen = document.getElementById('adminScreen');
    const logoutBtn = document.getElementById('logoutBtn');
    const roleSpan = document.getElementById('userRole');

    if (!loginScreen || !adminScreen) {
        console.error('Required elements not found:', {loginScreen, adminScreen});
        return;
    }

    loginScreen.classList.add('hidden');
    adminScreen.classList.remove('hidden');

    if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
    }

    // 権限表示
    if (roleSpan) {
        roleSpan.classList.remove('hidden');
        roleSpan.textContent = currentUserRole === 'owner' ? 'オーナー権限' : '管理者権限';
        // ログアウトと同一スタイルに統一
        roleSpan.className = 'px-3 py-2 rounded-lg bg-gray-700 text-white text-sm';
    }

    // データ読み込み
    loadAkyoData().then(() => {
        console.debug('Data loaded in showAdminScreen');
        // 初期状態で編集タブを表示（全件一覧）
        if (document.querySelector('.tab-content')) {
            switchTab('edit');
        }
        applyFinderRegistrationDefaults();
    });
}

// 次のIDを表示
function updateNextIdDisplay() {
    const nextIdInput = document.getElementById('nextIdDisplay');
    if (!nextIdInput) return;

    // akyoDataとimageDataMapの両方から最大IDを取得
    const akyoIds = akyoData
        .map(a => Number.parseInt(a.id, 10))
        .filter(Number.isFinite);
    const imageIds = Object.keys(imageDataMap)
        .map(id => Number.parseInt(id, 10))
        .filter(Number.isFinite);
    const akyoMaxId = akyoIds.length ? Math.max(...akyoIds) : 0;
    const imageMaxId = imageIds.length ? Math.max(...imageIds) : 0;
    const maxId = Math.max(akyoMaxId, imageMaxId, 0);
    const nextId = String(maxId + 1).padStart(3, '0');
    nextIdInput.value = `#${nextId}`;

    console.debug(`次のID更新: ${nextId} (Akyo最大: ${akyoMaxId}, 画像最大: ${imageMaxId})`);
}

// ログアウト
function logout() {
    sessionStorage.removeItem('akyoAdminAuth');
    sessionStorage.removeItem('akyoAdminToken');
    adminSessionToken = null;
    currentUserRole = null;
    try { localStorage.setItem('akyo:logoutTS', String(Date.now())); } catch (_) {}
    location.reload();
}

// グローバルスコープに公開
window.logout = logout;

// データ読み込み
async function loadAkyoData() {
    try {
        console.debug('Loading Akyo data...');

        // まずLocalStorageから更新されたデータを確認
        const updatedCSV = localStorage.getItem('akyoDataCSV');
        let csvText;

        if (updatedCSV) {
            console.debug('LocalStorageから更新データを読み込み');
            csvText = updatedCSV;
        } else {
            // LocalStorageにない場合はファイルから読み込み（API経由で最新を取得）
            const ver = localStorage.getItem('akyoDataVersion') || localStorage.getItem('akyoAssetsVersion') || String(Date.now());
            const response = await fetch(`/api/csv?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
            if (!response.ok) {
                const fallback = await fetch(`data/akyo-data.csv?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                csvText = await fallback.text();
            } else {
                csvText = await response.text();
            }
        }

        akyoData = parseCSV(csvText);

        // フォールバック: LocalStorageのCSVが壊れていた場合はファイルから再読込
        if ((!akyoData || akyoData.length === 0) && updatedCSV) {
            try {
                console.warn('LocalStorageのCSVが空/不正のため、ファイルから再読込します');
                const response = await fetch('data/akyo-data.csv');
                const fileCsv = await response.text();
                akyoData = parseCSV(fileCsv);
            } catch (e) {
                console.error('ファイルからの再読込にも失敗:', e);
            }
        }

        // 画像データをIndexedDB優先で読み込み（統計が0になる問題の修正）
        try {
            if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                await window.storageManager.init();
                const indexedImages = await window.storageManager.getAllImages();
                imageDataMap = indexedImages || {};
            }
        } catch (e) {
            console.warn('IndexedDBからの画像読み込みに失敗:', e);
        }
        // フォールバック: LocalStorage
        if (!imageDataMap || Object.keys(imageDataMap).length === 0) {
            const savedImages = localStorage.getItem('akyoImages');
            if (savedImages) {
                try {
                    imageDataMap = JSON.parse(savedImages) || {};
                } catch (e) {
                    console.error('画像データの読み込みエラー:', e);
                    imageDataMap = {};
                }
            } else {
                imageDataMap = {};
            }
        }

        console.debug(`データ読み込み完了: Akyo ${akyoData.length}件, 画像 ${Object.keys(imageDataMap).length}件`);

        // 各関数の実行前に要素の存在を確認
        if (document.getElementById('editList')) {
            updateEditList();
        }
        if (document.getElementById('imageGallery')) {
            updateImageGallery();
        }
        if (document.getElementById('nextIdDisplay')) {
            updateNextIdDisplay();
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        // CSVが見つからない場合、LocalStorageを確認
        const updatedCSV = localStorage.getItem('akyoDataCSV');
        if (updatedCSV) {
            try {
                akyoData = parseCSV(updatedCSV);
                console.debug('LocalStorageからフォールバック読み込み');
            } catch (e) {
                akyoData = [];
            }
        } else {
            akyoData = [];
        }

        // 画像データ読み込み（エラー時フォールバックもIndexedDB優先）
        try {
            if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                await window.storageManager.init();
                const indexedImages = await window.storageManager.getAllImages();
                imageDataMap = indexedImages || {};
            }
        } catch (e) {
            console.warn('IndexedDBからの画像フォールバック読み込みに失敗:', e);
        }
        if (!imageDataMap || Object.keys(imageDataMap).length === 0) {
            const savedImages = localStorage.getItem('akyoImages');
            if (savedImages) {
                try {
                    imageDataMap = JSON.parse(savedImages) || {};
                } catch (e) {
                    imageDataMap = {};
                }
            } else {
                imageDataMap = {};
            }
        }

        console.debug('CSVなし、画像データのみで動作');

        // 各関数の実行前に要素の存在を確認
        if (document.getElementById('editList')) {
            updateEditList();
        }
        if (document.getElementById('imageGallery')) {
            updateImageGallery();
        }
        if (document.getElementById('nextIdDisplay')) {
            updateNextIdDisplay();
        }
    }
}

// CSV解析（main.jsと同じロジック）
function parseCSV(csvText) {
    // CRLF正規化
    csvText = String(csvText).replace(/\r\n/g, '\n');
    const data = [];
    let inQuotes = false;
    let field = '';
    let record = [];
    let lineIndex = 0;
    const pushField = () => { record.push(field.trim()); field = ''; };
    const pushRecord = () => {
        if (record.length > 0) {
            // ヘッダ行はスキップ
            if (lineIndex > 0) {
                const values = record;
                if (values[0] && /^\d{3}$/.test(values[0])) {
                    const akyo = {
                        id: values[0] || '',
                        appearance: values[1] || '',
                        nickname: values[2] || '',
                        avatarName: values[3] || '',
                        attribute: '',
                        notes: '',
                        creator: '',
                        avatarUrl: ''
                    };
                    if (values.length === 8) {
                        akyo.attribute = values[4] || '未分類';
                        akyo.notes = values[5] || '';
                        akyo.creator = values[6] || '不明';
                        akyo.avatarUrl = values[7] || '';
                    } else if (values.length > 8) {
                        akyo.avatarUrl = values[values.length - 1] || '';
                        akyo.creator = values[values.length - 2] || '不明';
                        akyo.attribute = values[4] || '未分類';
                        akyo.notes = values.slice(5, values.length - 2).join(',');
                    } else {
                        akyo.attribute = values[4] || '未分類';
                        akyo.notes = values[5] || '';
                        akyo.creator = values[6] || '不明';
                        akyo.avatarUrl = values[7] || '';
                    }
                    data.push(akyo);
                }
            }
            lineIndex++;
        }
        record = [];
    };

    for (let idx = 0; idx < csvText.length; idx++) {
        const ch = csvText[idx];
        if (ch === '"') {
            const next = csvText[idx + 1];
            // 連続する二重引用符はエスケープ: 1つの " を追加し、inQuotesは維持
            if (inQuotes && next === '"') { field += '"'; idx++; continue; }
            inQuotes = !inQuotes;
            continue;
        }
        if (!inQuotes && ch === ',') { pushField(); continue; }
        if (!inQuotes && ch === '\n') { pushField(); pushRecord(); continue; }
        field += ch;
    }
    // 最終レコードを反映
    pushField(); pushRecord();

    return data;
}

// タブ切り替え
function switchTab(tabName) {
    console.debug('Switching to tab:', tabName);

    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // すべてのタブボタンのスタイルをリセット
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-red-500');
        btn.classList.add('border-transparent');
    });

    // 選択されたタブを表示
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    } else {
        console.error('Tab not found:', `${tabName}Tab`);
    }

    // 編集タブに切り替えたら一覧を初期表示
    if (tabName === 'edit') {
        const input = document.getElementById('editSearchInput');
        if (input) input.value = '';
        if (typeof updateEditList === 'function') updateEditList();
    }

    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetBtn) {
        targetBtn.classList.remove('border-transparent');
        targetBtn.classList.add('border-red-500');
    }

    if (tabName === 'add') {
        applyFinderRegistrationDefaults();
    }

    // ツールタブの統計は削除済み

    // 画像管理タブの場合は画像ギャラリーを更新
    if (tabName === 'images') {
        if (typeof updateImageGallery === 'function') {
            updateImageGallery();
        }
    }
}

// グローバルスコープに公開
window.switchTab = switchTab;

// 新規Akyo追加
async function handleAddAkyo(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    // ID自動採番（最大値+1）
    const maxId = Math.max(0, ...akyoData.map(a => Number.parseInt(a.id, 10) || 0));
    const newId = String(maxId + 1).padStart(3, '0');

    const newAkyo = {
        id: newId,
        appearance: '',
        nickname: formData.get('nickname'),
        avatarName: formData.get('avatarName'),
        attribute: formData.get('attribute'),
        notes: formData.get('notes'),
        creator: formData.get('creator'),
        avatarUrl: formData.get('avatarUrl')
    };

    // データ追加
    akyoData.push(newAkyo);
    akyoData.sort((a, b) => a.id.localeCompare(b.id));

    console.debug('New Akyo added:', newAkyo);
    console.debug('Total Akyo count:', akyoData.length);

    // CSV更新
    await updateCSVFile();

    let latestImageDataUrl = null;

    // トリミングした画像を保存
    try {
        if (window.generateCroppedImage) {
            const croppedImage = await window.generateCroppedImage();
            if (croppedImage) {
                imageDataMap[newAkyo.id] = croppedImage;
                latestImageDataUrl = croppedImage;

                // IndexedDBに保存を試みる
                try {
                    if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                        await window.storageManager.init();
                        await window.storageManager.saveImage(newAkyo.id, croppedImage);
                    }
                } catch (e) {
                    console.debug('IndexedDB save failed, using localStorage');
                }

                // LocalStorageにも保存（バックアップ）
                localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
            }
        } else {
            // フォールバック: 元の画像をそのまま保存
            const imagePreview = document.querySelector('#cropImage');
            if (imagePreview && imagePreview.src && imagePreview.src !== window.location.href) {
                imageDataMap[newAkyo.id] = imagePreview.src;
                latestImageDataUrl = imagePreview.src;

                try {
                    if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                        await window.storageManager.init();
                        await window.storageManager.saveImage(newAkyo.id, imagePreview.src);
                    }
                } catch (e) {
                    console.debug('IndexedDB save failed, using localStorage');
                }

                localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
            }
        }
    } catch (error) {
        console.error('Image save error:', error);
    }

    // オンラインアップロード（存在すれば実行）
    try {
        if (typeof uploadAkyoOnline === 'function') {
            const fileInput = document.getElementById('imageInput');
            const fileObj = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            const adminPassword = adminSessionToken;
            if (!adminPassword) {
                showNotification('認証が無効です。再度ログインしてください。', 'error');
                return;
            }
            if (fileObj || latestImageDataUrl) {
                const result = await uploadAkyoOnline({
                    id: newAkyo.id,
                    name: newAkyo.nickname || newAkyo.avatarName || '',
                    type: newAkyo.attribute || '',
                    desc: newAkyo.notes || '',
                    file: fileObj,
                    dataUrl: latestImageDataUrl,
                    adminPassword,
                });
                const uploadedId = result?.id || newAkyo.id;
                showNotification(`Akyo #${uploadedId} の画像を公開環境にアップロードしました`, 'success');
            }
        }
    } catch (e) {
        console.warn('オンラインアップロード失敗（ローカル保存は完了）:', e);
        const message = e && e.message ? e.message : 'オンラインアップロードに失敗しました';
        showNotification(`Akyo #${newAkyo.id} の画像アップロードに失敗しました: ${message}`, 'error');
    }

    // フォームリセット
    event.target.reset();
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.classList.add('hidden');
    }

    applyFinderRegistrationDefaults({ force: true });

    // トリミング状態をリセット
    if (window.resetImagePosition) {
        window.resetImagePosition();
    }

    showNotification(`Akyo #${newAkyo.id} を登録しました`, 'success');

    // 認証状態を確認
    console.debug('Current role after save:', currentUserRole);
    console.debug('Session auth:', sessionStorage.getItem('akyoAdminAuth'));

    // 更新処理
    if (document.getElementById('editList')) {
        updateEditList();
    }
    if (document.getElementById('nextIdDisplay')) {
        updateNextIdDisplay();
    }
}

// グローバルスコープに公開
window.handleAddAkyo = handleAddAkyo;

async function readFileAsDataUrl(file) {
    if (!file) return null;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

// Data URL 補助
function inferExtensionFromMime(mime) {
    if (!mime) return '.webp';
    const lower = mime.toLowerCase();
    if (lower.includes('webp')) return '.webp';
    if (lower.includes('png')) return '.png';
    if (lower.includes('jpeg') || lower.includes('jpg')) return '.jpg';
    if (lower.includes('gif')) return '.gif';
    return '.bin';
}

function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!match) return null;
    const mime = match[1] || 'application/octet-stream';
    const isBase64 = !!match[2];
    const data = match[3] || '';
    try {
        if (isBase64) {
            const binary = atob(data);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new Blob([bytes], { type: mime });
        }
        const decoded = decodeURIComponent(data);
        return new Blob([decoded], { type: mime });
    } catch (e) {
        console.debug('dataUrlToBlob failed', e);
        return null;
    }
}

async function convertDataUrlToWebpFile(dataUrl, id) {
    if (!dataUrl) return null;
    const id3 = String(id).padStart(3, '0');

    const tryDomCanvas = () => new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const width = image.naturalWidth || image.width;
                const height = image.naturalHeight || image.height;
                if (!width || !height) {
                    reject(new Error('画像サイズを取得できません'));
                    return;
                }
                const maxEdge = 2048;
                const scale = Math.min(1, maxEdge / Math.max(width, height));
                const targetWidth = Math.max(1, Math.round(width * scale));
                const targetHeight = Math.max(1, Math.round(height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error('WEBP変換に失敗しました'));
                        return;
                    }
                    resolve(new File([blob], `${id3}.webp`, { type: 'image/webp' }));
                }, 'image/webp', 0.92);
            } catch (err) {
                reject(err);
            }
        };
        image.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        image.src = dataUrl;
    });

    try {
        return await tryDomCanvas();
    } catch (primaryError) {
        console.debug('DOM canvas WEBP conversion failed', primaryError);
        try {
            if (typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function') {
                const blob = dataUrlToBlob(dataUrl);
                if (blob) {
                    const bitmap = await createImageBitmap(blob);
                    const maxEdge = 2048;
                    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
                    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
                    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));
                    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
                    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
                    const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });
                    if (typeof bitmap.close === 'function') {
                        bitmap.close();
                    }
                    return new File([webpBlob], `${id3}.webp`, { type: 'image/webp' });
                }
            }
        } catch (offscreenError) {
            console.debug('OffscreenCanvas WEBP conversion failed', offscreenError);
        }

        const fallbackBlob = dataUrlToBlob(dataUrl);
        if (fallbackBlob) {
            const ext = inferExtensionFromMime(fallbackBlob.type);
            return new File([fallbackBlob], `${id3}${ext}`, { type: fallbackBlob.type || 'application/octet-stream' });
        }

        throw primaryError;
    }
}

async function prepareWebpFileForUpload({ id, file, dataUrl }) {
    let sourceDataUrl = dataUrl || null;

    if (!sourceDataUrl && typeof window.generateCroppedImage === 'function') {
        try {
            const generated = await window.generateCroppedImage();
            if (generated) sourceDataUrl = generated;
        } catch (e) {
            console.debug('generateCroppedImage failed', e);
        }
    }

    if (!sourceDataUrl && file) {
        try {
            sourceDataUrl = await readFileAsDataUrl(file);
        } catch (e) {
            console.debug('readFileAsDataUrl failed', e);
        }
    }

    if (sourceDataUrl) {
        try {
            const converted = await convertDataUrlToWebpFile(sourceDataUrl, id);
            if (converted) return converted;
        } catch (e) {
            console.debug('WEBP conversion failed', e);
            const blob = dataUrlToBlob(sourceDataUrl);
            if (blob) {
                const ext = inferExtensionFromMime(blob.type);
                const idStr = String(id).padStart(3, '0');
                return new File([blob], `${idStr}${ext}`, { type: blob.type || 'application/octet-stream' });
            }
        }
    }

    if (file) {
        if (/\.webp$/i.test(file.name) || file.type === 'image/webp') {
            const idStr = String(id).padStart(3, '0');
            return new File([file], `${idStr}.webp`, { type: 'image/webp' });
        }
        return file;
    }

    throw new Error('画像データが見つかりません');
}

// Cloudflare Pages Functions 経由のオンラインアップロード
async function uploadAkyoOnline({ id, name, type, desc, file, adminPassword, dataUrl }) {
    if (!adminPassword) throw new Error('認証情報がありません');

    const form = new FormData();
    form.set('id', id);
    form.set('name', name);
    form.set('type', type);
    form.set('desc', desc);
    if (dataUrl) {
        form.set('dataUrl', dataUrl);
    }

    const preparedFile = await prepareWebpFileForUpload({ id, file, dataUrl });
    if (!(preparedFile instanceof File)) {
        throw new Error('アップロード用の画像を生成できませんでした');
    }
    form.set('file', preparedFile, preparedFile.name);

    // R2未設定時はGitHubアップロードにフォールバック
    const endpoint = window.__USE_GH_UPLOAD__ ? '/api/gh-upload' : '/api/upload';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminPassword}` },
        body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'upload failed');

    try { if (window.loadAkyoManifest) await window.loadAkyoManifest(); } catch (_) {}
    try { if (window.loadImagesManifest) await window.loadImagesManifest(); } catch (_) {}

    try {
        if (json?.url && typeof window !== 'undefined') {
            window.akyoImageManifestMap = window.akyoImageManifestMap || {};
            window.akyoImageManifestMap[id] = json.url;
        }
    } catch (_) {}

    try {
        const stamp = String(Date.now());
        localStorage.setItem('akyoAssetsVersion', stamp);
    } catch (_) {}

    return json;
}

// グローバル公開
window.prepareWebpFileForUpload = prepareWebpFileForUpload;
window.uploadAkyoOnline = uploadAkyoOnline;

// フォームから直接オンライン登録（パスワード欄＋既存入力値を使用）
// 画像選択処理
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.querySelector('img').src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// 編集用 画像選択
function handleEditImageSelect(event, akyoId) {
    const file = event.target.files && event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`editImagePreview-${akyoId}`);
        if (preview) preview.src = e.target.result;
        // 一時保存
        window.__pendingEditImages = window.__pendingEditImages || {};
        window.__pendingEditImages[akyoId] = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 編集用 画像同期（ローカル保存 + 公開アップロード）
async function syncPendingEditImage(akyoId) {
    const pendingMap = window.__pendingEditImages || {};
    window.__pendingEditImages = pendingMap;
    const dataUrl = pendingMap[akyoId];

    if (!dataUrl) {
        return { hasPending: false };
    }

    // まずはローカルストレージ系へ保存
    imageDataMap[akyoId] = dataUrl;
    try {
        if (window.saveSingleImage) {
            await window.saveSingleImage(akyoId, dataUrl);
        }
    } catch (e) {
        throw new Error(`ローカル保存に失敗しました: ${e?.message || e}`);
    }

    try {
        localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
    } catch (e) {
        console.debug('Failed to persist pending edit image to localStorage', e);
    }

    const preview = document.getElementById(`editImagePreview-${akyoId}`);
    if (preview) {
        preview.src = dataUrl;
        preview.style.display = '';
    }

    if (typeof updateImageGallery === 'function') {
        try { updateImageGallery(); } catch (_) {}
    }

    if (!adminSessionToken) {
        return {
            hasPending: true,
            uploaded: false,
            warning: '画像アップロードには再ログインが必要です',
        };
    }

    const akyo = akyoData.find(a => a.id === akyoId) || {};

    try {
        const result = await uploadAkyoOnline({
            id: akyoId,
            name: akyo.nickname || akyo.avatarName || '',
            type: akyo.attribute || '',
            desc: akyo.notes || '',
            file: null,
            adminPassword: adminSessionToken,
            dataUrl,
        });
        delete pendingMap[akyoId];
        const uploadedId = result?.id || akyoId;
        showNotification(`Akyo #${uploadedId} の画像を公開環境にアップロードしました`, 'success');
        return { hasPending: true, uploaded: true };
    } catch (e) {
        throw new Error(`公開アップロードに失敗しました: ${e?.message || e}`);
    }
}

// 編集用 画像削除（両ストレージ）
async function removeImageForId(akyoId) {
    if (!confirm(`Akyo #${akyoId} の画像を削除しますか？`)) return;
    try {
        if (window.deleteSingleImage) {
            await window.deleteSingleImage(akyoId);
        }
        delete imageDataMap[akyoId];
        localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
        const preview = document.getElementById(`editImagePreview-${akyoId}`);
        if (preview) {
            const id3 = String(akyoId).padStart(3, '0');
            preview.src = (typeof getAkyoImageUrl==='function' ? getAkyoImageUrl(id3) : `images/${id3}.webp`);
            preview.onerror = function(){ this.style.display='none'; };
        }
        updateImageGallery();
        showNotification(`Akyo #${akyoId} の画像を削除しました`, 'success');
    } catch (e) {
        showNotification('削除エラー: ' + e.message, 'error');
    }
}

// グローバル公開
window.handleEditImageSelect = handleEditImageSelect;
window.removeImageForId = removeImageForId;
// 互換用エイリアス（既存の onclick="saveEditImage(...)" 呼び出しを考慮）
window.syncPendingEditImage = syncPendingEditImage;
window.saveEditImage = syncPendingEditImage;

// 画像ドロップ処理
function handleImageDrop(event) {
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.querySelector('img').src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(files[0]);
    }
}

// 編集リスト更新
function updateEditList() {
    const editList = document.getElementById('editList');
    if (!editList) {
        console.debug('editList element not found');
        return;
    }

    editList.innerHTML = '';

    console.debug('Updating edit list with', akyoData.length, 'items');

    akyoData.forEach(akyo => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const safeId = escapeHtml(akyo.id);
        const safeNickname = escapeHtml(akyo.nickname || '-');
        const safeAvatarName = escapeHtml(akyo.avatarName || '');
        const safeAttribute = escapeHtml(akyo.attribute || '');
        const safeCreator = escapeHtml(akyo.creator || '');

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${safeId}</td>
            <td class="px-4 py-3">
                <div class="font-medium">${safeNickname}</div>
                <div class="text-xs text-gray-500">${safeAvatarName}</div>
            </td>
            <td class="px-4 py-3 text-sm">${safeAttribute}</td>
            <td class="px-4 py-3 text-sm">${safeCreator}</td>
            <td class="px-4 py-3 text-center">
                <button type="button" data-action="edit" data-id="${safeId}" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                ${currentUserRole === 'owner' ? `
                <button type="button" data-action="delete" data-id="${safeId}" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </td>
        `;

        editList.appendChild(row);
    });
}


// Akyo編集
function editAkyo(akyoId) {
    const akyo = akyoData.find(a => a.id === akyoId);
    if (!akyo) return;

    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    const id3 = String(akyoId).padStart(3, '0');

    const safeAkyoId = escapeHtml(akyoId);
    const safeDisplayId = escapeHtml(akyo.id);
    const safeNickname = escapeHtml(akyo.nickname || '');
    const safeAvatarName = escapeHtml(akyo.avatarName || '');
    const safeAttribute = escapeHtml(akyo.attribute || '');
    const safeCreator = escapeHtml(akyo.creator || '');
    const safeAvatarUrl = escapeHtml(akyo.avatarUrl || '');
    const safeNotes = escapeHtml(akyo.notes || '');
    const previewSrc = imageDataMap[akyo.id] || (typeof getAkyoImageUrl === 'function' ? getAkyoImageUrl(id3) : '');
    const safePreviewSrc = escapeHtml(previewSrc || '');

    content.innerHTML = `
        <form onsubmit="handleUpdateAkyo(event, '${safeAkyoId}')">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">ID（変更不可）</label>
                    <input type="text" value="${safeDisplayId}" disabled
                           class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">通称</label>
                    <input type="text" name="nickname" value="${safeNickname}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">アバター名</label>
                    <input type="text" name="avatarName" value="${safeAvatarName}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">属性</label>
                    <input type="text" name="attribute" value="${safeAttribute}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">作者</label>
                    <input type="text" name="creator" value="${safeCreator}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">VRChat URL</label>
                    <input type="url" name="avatarUrl" value="${safeAvatarUrl}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="mt-4">
                <label class="block text-gray-700 text-sm font-medium mb-1">備考</label>
                <textarea name="notes" rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">${safeNotes}</textarea>
            </div>

            <div class="mt-4">
                <label class="block text-gray-700 text-sm font-medium mb-1">画像</label>
                <div class="flex items-center gap-3">
                    <img id="editImagePreview-${safeAkyoId}" src="${safePreviewSrc}" class="w-32 h-24 object-cover rounded border" onerror="this.style.display='none'" />
                    <input type="file" accept=".webp,.png,.jpg,.jpeg" onchange="handleEditImageSelect(event, '${safeAkyoId}')" class="text-sm" />
                    <button type="button" data-action="remove-edit-image" data-id="${safeAkyoId}" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">画像を削除</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">「更新する」を押すと画像も公開環境へ反映されます。</p>
            </div>

            <button type="submit" class="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-medium hover:opacity-90">
                <i class="fas fa-save mr-2"></i> 更新する
            </button>
        </form>
    `;

    modal.classList.remove('hidden');
}


// Akyo更新処理
async function handleUpdateAkyo(event, akyoId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const akyoIndex = akyoData.findIndex(a => a.id === akyoId);

    if (akyoIndex === -1) return;

    akyoData[akyoIndex] = {
        ...akyoData[akyoIndex],
        nickname: formData.get('nickname'),
        avatarName: formData.get('avatarName'),
        attribute: formData.get('attribute'),
        notes: formData.get('notes'),
        creator: formData.get('creator'),
        avatarUrl: formData.get('avatarUrl')
    };

    try {
        await updateCSVFile();
    } catch (e) {
        console.error('updateCSVFile failed', e);
        showNotification('更新内容の保存に失敗しました', 'error');
        return;
    }

    let messageSuffix = '';
    try {
        const imageResult = await syncPendingEditImage(akyoId);
        if (imageResult?.hasPending) {
            if (imageResult.uploaded) {
                messageSuffix = '（画像も更新されました）';
            } else if (imageResult.warning) {
                messageSuffix = `（画像アップロードは未完了: ${imageResult.warning}）`;
            }
        }
    } catch (e) {
        console.error('syncPendingEditImage failed', e);
        showNotification(`Akyo #${akyoId} の画像更新に失敗しました: ${e.message || e}`, 'error');
        return;
    }

    closeEditModal();
    updateEditList();
    showNotification(`Akyo #${akyoId} を更新しました${messageSuffix}`, 'success');
}

// グローバルスコープに公開
window.handleUpdateAkyo = handleUpdateAkyo;

// グローバルスコープに公開
window.editAkyo = editAkyo;

// Akyo削除（ID自動詰め機能付き）
async function deleteAkyo(akyoId) {
    if (!adminSessionToken) {
        showNotification('認証が切れています。再ログインしてください。', 'error');
        return;
    }
    if (currentUserRole !== 'owner') {
        showNotification('削除権限がありません', 'error');
        return;
    }

    if (!confirm(`Akyo #${akyoId} を削除してもよろしいですか？\n\n※ 後続のIDが自動的に繰り上がります`)) {
        return;
    }

    const deletedIdNum = Number.parseInt(akyoId, 10);
    if (Number.isNaN(deletedIdNum)) {
        showNotification('削除対象のIDが不正です', 'error');
        return;
    }

    // 削除対象を除外
    akyoData = akyoData.filter(a => a.id !== akyoId);

    // ID詰め処理：削除されたIDより大きいIDを1つずつ繰り上げ
    const oldToNewIdMap = {};
    akyoData.forEach(akyo => {
        const currentIdNum = Number.parseInt(akyo.id, 10);
        if (Number.isNaN(currentIdNum)) {
            return;
        }
        if (currentIdNum > deletedIdNum) {
            const newId = String(currentIdNum - 1).padStart(3, '0');
            oldToNewIdMap[akyo.id] = newId;
            akyo.id = newId;
        }
    });

    // 画像データのID更新
    const newImageDataMap = {};
    Object.entries(imageDataMap).forEach(([id, data]) => {
        if (id === akyoId) {
            // 削除対象の画像は除外
            return;
        } else if (oldToNewIdMap[id]) {
            // ID変更対象
            newImageDataMap[oldToNewIdMap[id]] = data;
        } else {
            // ID変更なし
            newImageDataMap[id] = data;
        }
    });
    imageDataMap = newImageDataMap;
    localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));

    // お気に入りデータのID更新
    let favorites = loadFavoritesArray();
    favorites = favorites
        .filter(id => id !== akyoId)  // 削除対象を除外
        .map(id => oldToNewIdMap[id] || id);  // ID更新
    localStorage.setItem('akyoFavorites', JSON.stringify(favorites));

    await updateCSVFile();

    showNotification(`Akyo #${akyoId} を削除し、後続のIDを詰めました`, 'success');
    updateEditList();
    updateNextIdDisplay();
}

// グローバルスコープに公開
window.uploadCSV = uploadCSV;

// グローバルスコープに公開
window.deleteAkyo = deleteAkyo;

// 編集モーダルを閉じる
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

// グローバルスコープに公開
window.closeEditModal = closeEditModal;

// CSV更新
async function updateCSVFile() {
    // CSVフォーマットに変換
    const escapeCsv = (val) => {
        const s = (val ?? '').toString();
        const needsQuote = /[",\n]/.test(s);
        const body = s.replace(/"/g, '""');
        return needsQuote ? `"${body}"` : body;
    };

    let csvContent = 'ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL\n';

    akyoData.forEach(akyo => {
        const row = [
            escapeCsv(akyo.id),
            escapeCsv(akyo.appearance),
            escapeCsv(akyo.nickname),
            escapeCsv(akyo.avatarName),
            escapeCsv(akyo.attribute),
            escapeCsv(akyo.notes),
            escapeCsv(akyo.creator),
            escapeCsv(akyo.avatarUrl)
        ].join(',');
        csvContent += row + '\n';
    });

    // ローカルストレージに保存（本番環境ではサーバーに送信）
    localStorage.setItem('akyoDataCSV', csvContent);
    console.debug('CSV saved to localStorage, size:', csvContent.length, 'bytes');
    console.debug('First 200 chars:', csvContent.substring(0, 200));

    // GitHubへ即時反映（サーバーレスAPI）
    try {
        const adminPassword = adminSessionToken;
        if (adminPassword) {
            const res = await fetch('/api/commit-csv', {
                method: 'POST',
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'authorization': `Bearer ${adminPassword}`,
                },
                body: csvContent,
            });
            let json = null;
            try { json = await res.clone().json(); } catch(_) {}
            if (!res.ok) {
                let detail = '';
                try {
                    if (json && typeof json === 'object') {
                        detail = json.error || JSON.stringify(json);
                    } else {
                        detail = await res.text();
                    }
                } catch(_) {}
                const msg = `GitHubへの反映に失敗しました (${res.status}) ${detail ? String(detail).slice(0, 200) : ''}`.trim();
                console.error('commit-csv failed', res.status, detail || json);
                showNotification(msg, 'error');
            } else {
                console.debug('commit-csv ok', json);
                // バージョンアップで即時反映
                const ver = parseInt(localStorage.getItem('akyoDataVersion') || '0', 10) + 1;
                localStorage.setItem('akyoDataVersion', String(ver));
                localStorage.setItem('akyoAssetsVersion', String(ver));
                const link = (json && (json.commitUrl || json.fileHtmlUrl)) ? `\n${json.commitUrl || json.fileHtmlUrl}` : '';
                showNotification(`GitHubに反映しました（最新データを取得します）${link}`, 'success');
            }
        }
    } catch (e) {
        console.error('commit-csv request error', e);
        const detail = (e && (e.message || e.toString && e.toString())) || '';
        const msg = `GitHubへの反映通信でエラーが発生しました ${detail ? `- ${String(detail).slice(0, 200)}` : ''}`.trim();
        showNotification(msg, 'error');
    }

    // ここではダウンロード用リンクを生成しない（必要時のみ別処理で作成）
}

// CSV一括アップロード処理
function handleCSVSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    // 一部ブラウザはCSVのtypeが空やapplication/vnd.ms-excelになるため拡張子で判定
    const isCsv = file.name.toLowerCase().endsWith('.csv') ||
                  file.type.includes('csv') ||
                  file.type.startsWith('text/');
    if (!isCsv) {
        showNotification('CSVファイルを選択してください', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        previewCSV(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
}

function handleCSVDrop(event) {
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const isCsv = file.name.toLowerCase().endsWith('.csv') ||
                  file.type.includes('csv') ||
                  file.type.startsWith('text/');
    if (!isCsv) {
        showNotification('CSVファイルをドロップしてください', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        previewCSV(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
}

function previewCSV(csvText) {
    const newData = parseCSV(csvText);

    // 現在の最大IDを取得して、新規IDを仮設定
    let maxId = Math.max(0, ...akyoData.map(a => Number.parseInt(a.id, 10) || 0));

    const preview = document.getElementById('csvPreview');
    const table = document.getElementById('csvPreviewTable');

    // プレビュー表示（最初の5件）
    table.innerHTML = `
        <thead class="bg-gray-100">
            <tr>
                <th class="px-2 py-1 text-left">新ID</th>
                <th class="px-2 py-1 text-left">元ID</th>
                <th class="px-2 py-1 text-left">名前</th>
                <th class="px-2 py-1 text-left">属性</th>
                <th class="px-2 py-1 text-left">作者</th>
            </tr>
        </thead>
        <tbody>
            ${newData.slice(0, 5).map((akyo, index) => {
                const newId = String(maxId + index + 1).padStart(3, '0');
                const safeNewId = escapeHtml(newId);
                const safeOriginalId = escapeHtml(akyo.id || '');
                const safeName = escapeHtml(akyo.nickname || akyo.avatarName || '');
                const safeAttribute = escapeHtml(akyo.attribute || '');
                const safeCreator = escapeHtml(akyo.creator || '');
                return `
                <tr>
                    <td class="px-2 py-1 font-mono font-bold text-green-600">${safeNewId}</td>
                    <td class="px-2 py-1 font-mono text-gray-400">${safeOriginalId}</td>
                    <td class="px-2 py-1">${safeName}</td>
                    <td class="px-2 py-1">${safeAttribute}</td>
                    <td class="px-2 py-1">${safeCreator}</td>
                </tr>
                `;
            }).join('')}
        </tbody>
    `;

    if (newData.length > 5) {
        table.innerHTML += `
            <tfoot>
                <tr>
                    <td colspan="5" class="px-2 py-1 text-center text-gray-500">
                        他 ${newData.length - 5} 件のデータ
                    </td>
                </tr>
            </tfoot>
        `;
    }

    preview.classList.remove('hidden');

    // グローバル変数に一時保存
    window.pendingCSVData = newData;
}

async function uploadCSV() {
    if (!window.pendingCSVData) return;

    // 現在の最大IDを取得
    let maxId = Math.max(0, ...akyoData.map(a => Number.parseInt(a.id, 10) || 0));

    // CSVデータのIDを自動採番で上書き
    window.pendingCSVData.forEach(akyo => {
        maxId++;
        akyo.id = String(maxId).padStart(3, '0');
    });

    // 既存データに追加
    akyoData = [...akyoData, ...window.pendingCSVData].sort((a, b) => a.id.localeCompare(b.id));

    await updateCSVFile();
    try {
        const ver = parseInt(localStorage.getItem('akyoDataVersion') || '0', 10) + 1;
        localStorage.setItem('akyoDataVersion', String(ver));
        localStorage.setItem('akyoAssetsVersion', String(ver));
    } catch (_) {}

    showNotification(`${window.pendingCSVData.length} 件のデータを自動採番で登録しました`, 'success');

    // リセット
    window.pendingCSVData = null;
    document.getElementById('csvPreview').classList.add('hidden');
    document.getElementById('csvInput').value = '';

    updateEditList();
}

// 一括画像処理
function handleBulkImageSelect(event) {
    handleBulkImages(Array.from(event.target.files));
}

function handleBulkImageDrop(event) {
    handleBulkImages(Array.from(event.dataTransfer.files));
}

function handleBulkImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        showNotification('画像ファイルが選択されていません', 'error');
        return;
    }

    const mappingList = document.getElementById('imageMappingList');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const totalFilesSpan = document.getElementById('totalFiles');

    // プログレス表示
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        if (totalFilesSpan) totalFilesSpan.textContent = imageFiles.length;
        if (progressText) progressText.textContent = '0';
    }

    // グローバル変数に一時保存
    window.pendingImageMappings = window.pendingImageMappings || [];

    let processedCount = 0;

    imageFiles.forEach((file, index) => {
        const currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded mapping-item';

            // ファイル名からIDを推測
            const match = currentFile.name.match(/(\d{3})/);
            const suggestedId = match ? match[1] : '';

            // ユニークなIDを生成
            const uniqueId = `mapping-${Date.now()}-${index}`;

            const safeImageData = escapeHtml(e.target.result || '');
            const safeSuggestedId = escapeHtml(suggestedId);
            const safeFileName = escapeHtml(currentFile.name || '');
            const safeUniqueId = escapeHtml(uniqueId);

            div.innerHTML = `
                <img src="${safeImageData}" class="w-12 h-12 object-cover rounded">
                <input type="text" placeholder="AkyoID" value="${safeSuggestedId}"
                       class="px-2 py-1 border rounded w-20 mapping-id-input"
                       inputmode="numeric" pattern="\\d{3}" maxlength="3"
                       data-image="${safeImageData}"
                       data-filename="${safeFileName}"
                       id="${safeUniqueId}">
                <span class="text-sm text-gray-600 flex-1">${safeFileName}</span>
                <button onclick="saveImageMapping('${safeUniqueId}')"
                        class="save-btn px-2 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
                    保存
                </button>
                <button onclick="removeMapping(this)"
                        class="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            `;

            if (mappingList) {
                mappingList.appendChild(div);
            }

            // データを一時保存
            window.pendingImageMappings.push({
                id: uniqueId,
                suggestedId: suggestedId,
                imageData: e.target.result,
                fileName: currentFile.name
            });

            // プログレス更新
            processedCount++;
            if (progressBar && progressText) {
                const percent = Math.round((processedCount / imageFiles.length) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = processedCount;

                // 完了時の処理
                if (processedCount === imageFiles.length) {
                    setTimeout(() => {
                        if (progressDiv) {
                            progressDiv.classList.add('hidden');
                        }
                        showNotification(`${imageFiles.length}枚の画像を読み込みました`, 'success');

                        // 自動ID割り当てを提案
                        if (imageFiles.length >= 10) {
                            if (confirm('自動でIDを割り当てますか？')) {
                                autoAssignIds();
                            }
                        }
                    }, 500);
                }
            }
        };

        // エラーハンドリング
        reader.onerror = () => {
            processedCount++;
            showNotification(`${currentFile.name} の読み込みに失敗しました`, 'error');
        };

        reader.readAsDataURL(file);
    });
}

async function saveImageMapping(inputId) {
    console.debug(`saveImageMapping called with inputId: ${inputId}`);

    const input = document.getElementById(inputId);
    if (!input) {
        console.error('Input not found:', inputId);
        showNotification('入力フィールドが見つかりません', 'error');
        return;
    }

    const akyoId = input.value.trim();
    const imageData = input.dataset.image;

    console.debug(`Attempting to save - ID: ${akyoId}, Image data length: ${imageData ? imageData.length : 0}`);

    if (!akyoId || !akyoId.match(/^\d{3}$/)) {
        showNotification('正しいAkyoID（3桁の数字）を入力してください', 'error');
        return;
    }

    if (!imageData) {
        showNotification('画像データがありません', 'error');
        return;
    }

    try {
        // ストレージアダプターを使用して保存（IndexedDB優先）
        if (!imageDataMap) imageDataMap = {};
        if (window.saveSingleImage) {
            await window.saveSingleImage(akyoId, imageData);
            imageDataMap[akyoId] = imageData;
            try { localStorage.setItem('akyoImages', JSON.stringify(imageDataMap)); } catch (_) {}
        } else {
            // フォールバック: 従来のLocalStorage保存
            imageDataMap[akyoId] = imageData;
            localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
        }

        console.debug(`Image saved for ID ${akyoId}`);

        // ボタンを更新
        const button = input.parentElement.querySelector('.save-btn');
        if (button) {
            button.textContent = '保存済み';
            button.className = 'save-btn px-2 py-1 bg-green-500 text-white rounded text-sm';
            button.disabled = true;
        }

        updateImageGallery();
        showNotification(`画像を Akyo #${akyoId} に紐付けました`, 'success');

    } catch (error) {
        console.error('Save error:', error);
        if (error.name === 'QuotaExceededError') {
            showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
        } else {
            showNotification('保存エラー: ' + error.message, 'error');
        }
    }
}

// 自動ID割り当て
function autoAssignIds() {
    console.debug('=== 自動ID割り当て開始 ===');
    const inputs = document.querySelectorAll('.mapping-id-input');

    console.debug(`対象入力フィールド数: ${inputs.length}`);

    if (inputs.length === 0) {
        showNotification('割り当てる画像がありません', 'warning');
        return;
    }

    // データの初期化確認
    if (!imageDataMap) imageDataMap = {};

    // 使用済みIDのセットを作成（画像データのみから収集）
    // 注意: CSVデータ(akyoData)は参照しない。実際に画像が存在するIDのみを「使用済み」とする
    const usedIds = new Set();

    // imageDataMapからIDを収集（実際に画像が存在するIDのみ）
    if (imageDataMap && Object.keys(imageDataMap).length > 0) {
        Object.keys(imageDataMap).forEach(id => {
            usedIds.add(String(id).padStart(3, '0'));
        });
    }

    // 現在の入力フィールドに既に入力されている値も使用済みとして追加
    inputs.forEach(input => {
        if (input.value && input.value.match(/^\d{3}$/)) {
            usedIds.add(input.value);
        }
    });

    console.debug('現在使用済みの画像ID:', Array.from(usedIds).sort());
    console.debug('特に001-020の使用状況:');
    for (let i = 1; i <= 20; i++) {
        const id = String(i).padStart(3, '0');
        console.debug(`  ${id}: ${usedIds.has(id) ? '使用済み' : '未使用'}`);
    }

    let assignedCount = 0;
    let skippedCount = 0;

    // 各入力フィールドに対して処理
    inputs.forEach((input, index) => {
        console.debug(`処理中 [${index}]: 現在値="${input.value}"`);

        // すでに有効な値がある場合はスキップ
        if (input.value && input.value.match(/^\d{3}$/)) {
            console.debug(`  → スキップ（既存値あり）: ${input.value}`);
            skippedCount++;
            return;
        }

        // 001-020を優先的に割り当て
        let assigned = false;
        for (let i = 1; i <= 20 && !assigned; i++) {
            const candidateId = String(i).padStart(3, '0');
            if (!usedIds.has(candidateId)) {
                input.value = candidateId;
                usedIds.add(candidateId);
                assignedCount++;
                assigned = true;
                console.debug(`  ✓ ID割り当て成功（優先範囲）: ${candidateId}`);
            }
        }

        // 001-020が全て使用済みの場合、021以降を割り当て
        if (!assigned) {
            let nextId = 21;
            while (usedIds.has(String(nextId).padStart(3, '0'))) {
                nextId++;
            }
            const newId = String(nextId).padStart(3, '0');
            input.value = newId;
            usedIds.add(newId);
            assignedCount++;
            console.debug(`  ✓ ID割り当て成功（通常範囲）: ${newId}`);
        }
    });

    console.debug(`=== 割り当て完了: 新規=${assignedCount}, スキップ=${skippedCount} ===`);

    if (assignedCount > 0) {
        showNotification(`${assignedCount}件のIDを自動割り当てしました`, 'success');
    } else if (skippedCount > 0) {
        showNotification('すべての画像にIDが設定済みです', 'info');
    } else {
        showNotification('処理対象の画像がありません', 'warning');
    }
}

// すべて保存
async function saveAllMappings() {
    console.debug('=== すべて保存開始 ===');
    const inputs = document.querySelectorAll('.mapping-id-input');

    console.debug(`保存対象数: ${inputs.length}`);

    if (inputs.length === 0) {
        showNotification('保存する画像がありません', 'warning');
        return;
    }

    // imageDataMapの初期化確認
    if (!imageDataMap) {
        imageDataMap = {};
    }

    let savedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const akyoId = input.value ? input.value.trim() : '';
        const imageData = input.dataset.image;
        const button = input.parentElement.querySelector('.save-btn');

        // すでに保存済みの場合はスキップ
        if (button && button.disabled) {
            skippedCount++;
            console.debug(`スキップ: ${akyoId} (保存済み)`);
            continue;
        }

        if (!akyoId || !akyoId.match(/^\d{3}$/)) {
            errorCount++;
            console.debug(`エラー: 無効なID - "${akyoId}"`);
            continue;
        }

        if (!imageData) {
            errorCount++;
            console.debug(`エラー: 画像データなし - ID ${akyoId}`);
            continue;
        }

        // ストレージアダプターを使用して保存
        try {
            if (window.saveSingleImage) {
                await window.saveSingleImage(akyoId, imageData);
                imageDataMap[akyoId] = imageData;
                try { localStorage.setItem('akyoImages', JSON.stringify(imageDataMap)); } catch (_) {}
            } else {
                // フォールバック
                imageDataMap[akyoId] = imageData;
            }
            savedCount++;
            console.debug(`保存: ${akyoId}`);

            // ボタンを更新
            if (button) {
                button.textContent = '保存済み';
                button.className = 'save-btn px-2 py-1 bg-green-500 text-white rounded text-sm';
                button.disabled = true;
            }
        } catch (error) {
            errorCount++;
            console.error(`保存エラー ${akyoId}:`, error);
        }
    }

    // フォールバック: LocalStorageに一括保存（アダプターがない場合）
    if (!window.saveSingleImage && savedCount > 0) {
        try {
            localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
            console.debug(`LocalStorageに保存: ${savedCount}件`);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
                return;
            }
        }
    }

    if (savedCount > 0) {
        updateImageGallery();
    }

    // 結果を通知
    const messages = [];
    if (savedCount > 0) messages.push(`${savedCount}枚保存`);
    if (skippedCount > 0) messages.push(`${skippedCount}枚スキップ（保存済み）`);
    if (errorCount > 0) messages.push(`${errorCount}枚エラー`);

    if (messages.length > 0) {
        const type = errorCount > 0 ? 'warning' : 'success';
        showNotification(messages.join('、'), type);
    } else {
        showNotification('保存する画像がありません', 'info');
    }
}

// グローバルスコープに公開
window.saveImageMapping = saveImageMapping;
window.saveAllMappings = saveAllMappings;

// リストをクリア
function clearMappingList() {
    if (confirm('未保存の画像はクリアされます。よろしいですか？')) {
        document.getElementById('imageMappingList').innerHTML = '';
        window.pendingImageMappings = [];
        showNotification('リストをクリアしました', 'success');
    }
}

// 個別削除
function removeMapping(button) {
    const row = button.parentElement;
    const input = row ? row.querySelector('.mapping-id-input') : null;
    const uid = input ? input.id : null;
    if (row) {
        row.remove();
    }
    if (uid && Array.isArray(window.pendingImageMappings)) {
        window.pendingImageMappings = window.pendingImageMappings.filter(m => m.id !== uid);
    }
}

// 画像ギャラリー更新
function updateImageGallery() {
    const gallery = document.getElementById('imageGallery');
    const imageCount = document.getElementById('imageCount');
    if (!gallery) return;
    gallery.innerHTML = '';

    // 画像数を更新
    if (imageCount) {
        imageCount.textContent = Object.keys(imageDataMap).length;
    }

    // IDでソート
    const sortedEntries = Object.entries(imageDataMap).sort((a, b) => a[0].localeCompare(b[0]));

    sortedEntries.forEach(([akyoId, imageData]) => {
        const akyo = akyoData.find(a => a.id === akyoId);
        const div = document.createElement('div');
        div.className = 'relative group';
        div.tabIndex = 0;

        const safeAkyoId = escapeHtml(akyoId);
        const safeImageData = escapeHtml(imageData || '');
        const safeLabel = escapeHtml(akyo ? (akyo.nickname || akyo.avatarName || '') : '未登録');

        div.innerHTML = `
            <img src="${safeImageData}" class="w-full h-24 object-cover rounded-lg">
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <div class="text-white text-center">
                    <div class="font-bold">#${safeAkyoId}</div>
                    <div class="text-xs">${safeLabel}</div>
                </div>
            </div>
            ${currentUserRole === 'owner' ? `
            <button type="button" data-action="remove-image" data-id="${safeAkyoId}"
                    class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <i class="fas fa-times text-xs"></i>
            </button>
            ` : ''}
        `;

        gallery.appendChild(div);
    });
}

// 画像削除（IndexedDB/Local双方）
async function removeImage(akyoId) {
    if (!confirm(`Akyo #${akyoId} の画像を削除しますか？`)) return;
    try {
        if (window.deleteSingleImage) {
            await window.deleteSingleImage(akyoId);
        }
        delete imageDataMap[akyoId];
        try { localStorage.setItem('akyoImages', JSON.stringify(imageDataMap)); } catch (_) {}
        updateImageGallery();
        showNotification(`Akyo #${akyoId} の画像を削除しました`, 'success');
    } catch (e) {
        showNotification('削除エラー: ' + (e?.message || e), 'error');
    }
}

// グローバルスコープに公開
window.removeImage = removeImage;

// 編集用検索
function searchForEdit() {
    const inputEl = document.getElementById('editSearchInput');
    const query = (inputEl && inputEl.value ? inputEl.value : '').toLowerCase();

    const filtered = query
        ? akyoData.filter(akyo =>
            ((akyo.id || '').toLowerCase().includes(query)) ||
            ((akyo.nickname || '').toLowerCase().includes(query)) ||
            ((akyo.avatarName || '').toLowerCase().includes(query)) ||
            ((akyo.attribute || '').toLowerCase().includes(query)) ||
            ((akyo.creator || '').toLowerCase().includes(query))
        )
        : akyoData;

    const editList = document.getElementById('editList');
    editList.innerHTML = '';

    filtered.forEach(akyo => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const safeId = escapeHtml(akyo.id);
        const safeNickname = escapeHtml(akyo.nickname || '-');
        const safeAvatarName = escapeHtml(akyo.avatarName || '');
        const safeAttribute = escapeHtml(akyo.attribute || '');
        const safeCreator = escapeHtml(akyo.creator || '');

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${safeId}</td>
            <td class="px-4 py-3">
                <div class="font-medium">${safeNickname}</div>
                <div class="text-xs text-gray-500">${safeAvatarName}</div>
            </td>
            <td class="px-4 py-3 text-sm">${safeAttribute}</td>
            <td class="px-4 py-3 text-sm">${safeCreator}</td>
            <td class="px-4 py-3 text-center">
                <button type="button" data-action="edit" data-id="${safeId}" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                ${currentUserRole === 'owner' ? `
                <button type="button" data-action="delete" data-id="${safeId}" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </td>
        `;

        editList.appendChild(row);
    });
}

// 通知表示
function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'fixed top-20 right-4 flex flex-col items-end gap-2 z-50';
        container.setAttribute('role', 'region');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = 'px-6 py-3 rounded-lg shadow-lg transition-all transform translate-x-0 text-white bg-blue-500';
    notification.setAttribute('role', 'status');

    if (type === 'success') {
        notification.classList.remove('bg-blue-500');
        notification.classList.add('bg-green-500');
    } else if (type === 'error') {
        notification.classList.remove('bg-blue-500');
        notification.classList.add('bg-red-500');
    } else if (type === 'warning') {
        notification.classList.remove('bg-blue-500');
        notification.classList.add('bg-yellow-500');
    }

    const iconClass = type === 'success'
        ? 'fa-check-circle'
        : type === 'error'
            ? 'fa-exclamation-circle'
            : type === 'warning'
                ? 'fa-exclamation-triangle'
                : 'fa-info-circle';

    const safeMessage = escapeHtml(message);

    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${iconClass} mr-2"></i>
            ${safeMessage}
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
            if (!container.hasChildNodes()) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// ID再採番機能
async function renumberAllIds() {
    if (!adminSessionToken) {
        showNotification('認証が切れています。再ログインしてください。', 'error');
        return;
    }
    if (!confirm('すべてのAkyoのIDを001から振り直します。\nこの操作は取り消せません。続行しますか？')) {
        return;
    }

    // IDマッピングの作成
    const oldToNewIdMap = {};

    // 名前順でソート（または任意の基準）してから連番を振る
    akyoData.sort((a, b) => {
        // 現在のID順でソート
        return (Number.parseInt(a.id, 10) || 0) - (Number.parseInt(b.id, 10) || 0);
    });

    // 新しいIDを割り当て
    akyoData.forEach((akyo, index) => {
        const newId = String(index + 1).padStart(3, '0');
        oldToNewIdMap[akyo.id] = newId;
        akyo.id = newId;
    });

    // 画像データのID更新
    const newImageDataMap = {};
    Object.entries(imageDataMap).forEach(([oldId, data]) => {
        const newId = oldToNewIdMap[oldId];
        if (newId) {
            newImageDataMap[newId] = data;
        }
    });
    imageDataMap = newImageDataMap;
    localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));

    // お気に入りデータのID更新
    let favorites = loadFavoritesArray();
    favorites = favorites.map(oldId => oldToNewIdMap[oldId]).filter(Boolean);
    localStorage.setItem('akyoFavorites', JSON.stringify(favorites));

    await updateCSVFile();

    showNotification('すべてのIDを再採番しました', 'success');
    updateEditList();
    updateImageGallery();
    updateNextIdDisplay();
}

// グローバルスコープに公開
window.renumberAllIds = renumberAllIds;

// CSVエクスポート機能
function exportCSV() {
    const csvEscape = (value) => {
        const str = value === null || value === undefined ? '' : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    // CSVフォーマットに変換
    let csvContent = 'ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL\n';

    akyoData.forEach(akyo => {
        const row = [
            csvEscape(akyo.id),
            csvEscape(akyo.appearance),
            csvEscape(akyo.nickname),
            csvEscape(akyo.avatarName),
            csvEscape(akyo.attribute),
            csvEscape(akyo.notes),
            csvEscape(akyo.creator),
            csvEscape(akyo.avatarUrl)
        ].join(',');
        csvContent += row + '\n';
    });

    // BOMを追加（Excelで開いた時の文字化け対策）
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // ダウンロード実行
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('download', `akyo-data-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('CSVファイルをダウンロードしました', 'success');
}

// グローバルスコープに公開
window.exportCSV = exportCSV;

// （削除）統計機能はUIごと撤去

// デバウンス関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

console.debug('admin.js loaded successfully');
