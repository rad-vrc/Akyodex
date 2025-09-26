// Akyo図鑑 管理者用JavaScript
console.debug('admin.js loading started');

// 認証ワードはサーバー側（Cloudflare ENV）で検証。フロントには保存しない

// グローバル変数
let currentUserRole = null;
let akyoData = [];
let imageDataMap = {}; // AkyoIDと画像の紐付け
let adminSessionToken = null; // 認証ワードはメモリ内にのみ保持

const FINDER_PREFILL_VALUE = 'Akyo';
const isFinderModePage = typeof window !== 'undefined' && window.location.pathname.endsWith('finder.html');

function applyFinderRegistrationDefaults({ force = false } = {}) {
    if (!(isFinderModePage || currentUserRole === 'finder')) return;

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

// 命名整合用のエイリアス（徐々に adminAkyoRecords / adminImageDataMap へ移行）
window.adminAkyoRecords = akyoData;
window.adminImageDataMap = imageDataMap;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.debug('DOMContentLoaded - Admin page');

    // 旧バージョンで保存された認証ワードを確実に破棄
    sessionStorage.removeItem('akyoAdminToken');

    // 初期ロード時に検索欄が空でも全件表示する
    const editSearchInput = document.getElementById('editSearchInput');
    if (editSearchInput && typeof searchForEdit === 'function') {
        setTimeout(() => searchForEdit(), 0);
    }

    setupEventListeners();
    setupDragDrop();

    applyFinderRegistrationDefaults();
});

// イベントリスナー設定
function setupEventListeners() {
    // ログインフォーム
    const loginForm = document.querySelector('#loginScreen form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 画像入力
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
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
}

// ドラッグ&ドロップ設定
function setupDragDrop() {
    // 画像ドロップゾーン
    const imageDropZone = document.getElementById('imageDropZone');
    setupDropZone(imageDropZone, handleImageDrop);

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
            loadAkyoData();
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
        errorDiv.classList.remove('hidden');
        const kind = (e && e.message) || '';
        let msg = '<i class="fas fa-exclamation-circle mr-1"></i> 予期せぬエラーが発生しました';
        if (kind === 'unauthorized') msg = '<i class="fas fa-exclamation-circle mr-1"></i> Akyoワードが正しくありません';
        else if (kind === 'server') msg = '<i class="fas fa-server mr-1"></i> サーバーエラーです。しばらく待って再試行してください';
        else if (kind === 'request') msg = '<i class="fas fa-exclamation-triangle mr-1"></i> 認証に失敗しました';
        else if (e && (e.name === 'TypeError' || e.message === 'Failed to fetch')) msg = '<i class="fas fa-wifi mr-1"></i> ネットワークに接続できません';
        errorDiv.innerHTML = msg;
        setTimeout(() => errorDiv.classList.add('hidden'), 4000);
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
    const akyoMaxId = akyoData.length > 0 ? Math.max(...akyoData.map(a => parseInt(a.id) || 0)) : 0;
    const imageMaxId = Object.keys(imageDataMap).length > 0 ? Math.max(...Object.keys(imageDataMap).map(id => parseInt(id) || 0)) : 0;
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
        window.adminAkyoRecords = akyoData;

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
                window.adminImageDataMap = imageDataMap;
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
                    window.adminImageDataMap = imageDataMap;
                } catch (e) {
                    console.error('画像データの読み込みエラー:', e);
                    imageDataMap = {};
                }
            } else {
                imageDataMap = {};
                window.adminImageDataMap = imageDataMap;
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
    const lines = csvText.split('\n');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = [];
        let currentValue = '';
        let inQuotes = false;
        let currentLine = line;

        while (i < lines.length) {
            for (let char of currentLine) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }

            if (inQuotes && i + 1 < lines.length) {
                currentValue += '\n';
                i++;
                currentLine = lines[i];
            } else {
                break;
            }
        }

        values.push(currentValue.trim());

        if (values[0] && values[0].match(/^\d{3}/)) {
            let id = values[0] || '';
            let appearance = values[1] || '';
            let nickname = values[2] || '';
            let avatarName = values[3] || '';
            let attribute = '';
            let notes = '';
            let creator = '';
            let avatarUrl = '';

            if (values.length === 8) {
                attribute = values[4] || '未分類';
                notes = values[5] || '';
                creator = values[6] || '不明';
                avatarUrl = values[7] || '';
            } else if (values.length > 8) {
                avatarUrl = values[values.length - 1] || '';
                creator = values[values.length - 2] || '不明';
                attribute = values[4] || '未分類';
                notes = values.slice(5, values.length - 2).join(',');
            } else {
                attribute = values[4] || '未分類';
                notes = values[5] || '';
                creator = values[6] || '不明';
                avatarUrl = values[7] || '';
            }

            const akyo = {
                id,
                appearance,
                nickname,
                avatarName,
                attribute,
                notes,
                creator,
                avatarUrl
            };
            data.push(akyo);
        }
    }

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
    const maxId = Math.max(0, ...akyoData.map(a => parseInt(a.id) || 0));
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

    // トリミングした画像を保存
    try {
        if (window.generateCroppedImage) {
            const croppedImage = await window.generateCroppedImage();
            if (croppedImage) {
                imageDataMap[newAkyo.id] = croppedImage;

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
            if (fileObj) {
                await uploadAkyoOnline({
                    id: newAkyo.id,
                    name: newAkyo.nickname || newAkyo.avatarName || '',
                    type: newAkyo.attribute || '',
                    desc: newAkyo.notes || '',
                    file: fileObj,
                    adminPassword,
                });
            }
        }
    } catch (e) {
        console.warn('オンラインアップロード失敗（ローカル保存は完了）:', e);
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

// Cloudflare Pages Functions 経由のオンラインアップロード
async function uploadAkyoOnline({ id, name, type, desc, file, adminPassword }) {
    const form = new FormData();
    form.set('id', id);
    form.set('name', name);
    form.set('type', type);
    form.set('desc', desc);
    // 可能ならトリミング済みDataURLをBlob変換して送信
    try {
        if (window.generateCroppedImage) {
            const dataUrl = await window.generateCroppedImage();
            if (dataUrl) {
                const blob = await (await fetch(dataUrl)).blob();
                const fname = (file && file.name) ? file.name.replace(/\.[^.]+$/, '.webp') : `${id}.webp`;
                form.set('file', new File([blob], fname, { type: blob.type || 'image/webp' }));
            } else {
                form.set('file', file);
            }
        } else {
            form.set('file', file);
        }
    } catch(_) {
        form.set('file', file);
    }

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
    return json;
}

// グローバル公開
window.uploadAkyoOnline = uploadAkyoOnline;

// フォームから直接オンライン登録（パスワード欄＋既存入力値を使用）
async function uploadAkyoOnlineFromForm() {
    try {
        const idDisplay = document.getElementById('nextIdDisplay');
        const imageInput = document.getElementById('imageInput');
        const passInput = document.getElementById('adminPasswordOnline');
        const nameInput = document.querySelector('input[name="nickname"]') || { value: '' };
        const avatarNameInput = document.querySelector('input[name="avatarName"]') || { value: '' };
        const typeInput = document.querySelector('input[name="attribute"]') || { value: '' };
        const descInput = document.querySelector('textarea[name="notes"]') || { value: '' };

        const displayText = idDisplay && idDisplay.value ? idDisplay.value.replace(/^#/,'') : '';
        const id = displayText || (akyoData.length > 0 ? String(Math.max(...akyoData.map(a=>parseInt(a.id)||0))+1).padStart(3,'0') : '001');
        const file = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
        const adminPassword = passInput && passInput.value ? passInput.value : '';
        if (!id || !file || !adminPassword) { showNotification('ID・画像・パスワードを入力してください', 'warning'); return; }

        const result = await uploadAkyoOnline({
            id,
            name: nameInput.value || avatarNameInput.value || '',
            type: typeInput.value || '',
            desc: descInput.value || '',
            file,
            adminPassword,
        });

        try { if (window.loadImagesManifest) await window.loadImagesManifest(); } catch(_){ }
        showNotification(`オンライン登録完了: #${result.id}`, 'success');
    } catch(e) {
        console.error(e);
        showNotification('オンライン登録に失敗しました', 'error');
    }
}

window.uploadAkyoOnlineFromForm = uploadAkyoOnlineFromForm;

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

// 編集用 画像保存（IndexedDB優先）
async function saveEditImage(akyoId) {
    try {
        const dataUrl = window.__pendingEditImages && window.__pendingEditImages[akyoId];
        if (!dataUrl) { showNotification('画像が選択されていません', 'warning'); return; }
        if (window.saveSingleImage) {
            await window.saveSingleImage(akyoId, dataUrl);
        } else {
            imageDataMap[akyoId] = dataUrl;
            localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
        }
        showNotification(`Akyo #${akyoId} の画像を保存しました`, 'success');
        updateImageGallery();
        delete window.__pendingEditImages[akyoId];
    } catch (e) {
        showNotification('保存エラー: ' + e.message, 'error');
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
window.saveEditImage = saveEditImage;
window.removeImageForId = removeImageForId;

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

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${akyo.id}</td>
            <td class="px-4 py-3">
                <div class="font-medium">${akyo.nickname || '-'}</div>
                <div class="text-xs text-gray-500">${akyo.avatarName}</div>
            </td>
            <td class="px-4 py-3 text-sm">${akyo.attribute}</td>
            <td class="px-4 py-3 text-sm">${akyo.creator}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="editAkyo('${akyo.id}')" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                ${currentUserRole === 'owner' ? `
                <button onclick="deleteAkyo('${akyo.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
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

    content.innerHTML = `
        <form onsubmit="handleUpdateAkyo(event, '${akyoId}')">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">ID（変更不可）</label>
                    <input type="text" value="${akyo.id}" disabled
                           class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">通称</label>
                    <input type="text" name="nickname" value="${akyo.nickname || ''}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">アバター名</label>
                    <input type="text" name="avatarName" value="${akyo.avatarName || ''}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">属性</label>
                    <input type="text" name="attribute" value="${akyo.attribute || ''}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">作者</label>
                    <input type="text" name="creator" value="${akyo.creator || ''}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">VRChat URL</label>
                    <input type="url" name="avatarUrl" value="${akyo.avatarUrl || ''}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="mt-4">
                <label class="block text-gray-700 text-sm font-medium mb-1">備考</label>
                <textarea name="notes" rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">${akyo.notes || ''}</textarea>
            </div>

            <div class="mt-4">
                <label class="block text-gray-700 text-sm font-medium mb-1">画像</label>
                <div class="flex items-center gap-3">
                    <img id="editImagePreview-${akyoId}" src="${imageDataMap[akyo.id] || (typeof getAkyoImageUrl==='function' ? getAkyoImageUrl(id3) : '')}" class="w-32 h-24 object-cover rounded border" onerror="this.style.display='none'" />
                    <input type="file" accept=".webp,.png,.jpg,.jpeg" onchange="handleEditImageSelect(event, '${akyoId}')" class="text-sm" />
                    <button type="button" onclick="saveEditImage('${akyoId}')" class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">画像を保存</button>
                    <button type="button" onclick="removeImageForId('${akyoId}')" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">画像を削除</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">保存するとIndexedDB（フォールバック: LocalStorage）に登録されます。公開用にはマニフェストまたはimages/${akyo.id}.webp/.png/.jpgを追加して再デプロイしてください。</p>
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

    await updateCSVFile();

    // main側へ変更通知（storageイベント）
    try {
        const ver = parseInt(localStorage.getItem('akyoDataVersion') || '0', 10) + 1;
        localStorage.setItem('akyoDataVersion', String(ver));
        localStorage.setItem('akyoAssetsVersion', String(ver));
    } catch (_) {}

    closeEditModal();
    showNotification(`Akyo #${akyoId} を更新しました`, 'success');
    updateEditList();
}

// グローバルスコープに公開
window.handleUpdateAkyo = handleUpdateAkyo;

// グローバルスコープに公開
window.editAkyo = editAkyo;

// Akyo削除（ID自動詰め機能付き）
async function deleteAkyo(akyoId) {
    if (currentUserRole !== 'owner') {
        showNotification('削除権限がありません', 'error');
        return;
    }

    if (!confirm(`Akyo #${akyoId} を削除してもよろしいですか？\n\n※ 後続のIDが自動的に繰り上がります`)) {
        return;
    }

    const deletedIndex = akyoData.findIndex(a => a.id === akyoId);
    const deletedIdNum = parseInt(akyoId);

    // 削除対象を除外
    akyoData = akyoData.filter(a => a.id !== akyoId);

    // ID詰め処理：削除されたIDより大きいIDを1つずつ繰り上げ
    const oldToNewIdMap = {};
    akyoData.forEach(akyo => {
        const currentIdNum = parseInt(akyo.id);
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
    let favorites = JSON.parse(localStorage.getItem('akyoFavorites')) || [];
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

    // ファイルとして保存するためのBlobを作成
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // ダウンロードリンクを作成（自動保存はしない）
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'akyo-data-updated.csv');
    link.style.display = 'none';
    document.body.appendChild(link);

    // 更新があったことを通知
    console.debug('CSV data updated. Download link created.');
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
    let maxId = Math.max(0, ...akyoData.map(a => parseInt(a.id) || 0));

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
                return `
                <tr>
                    <td class="px-2 py-1 font-mono font-bold text-green-600">${newId}</td>
                    <td class="px-2 py-1 font-mono text-gray-400">${akyo.id}</td>
                    <td class="px-2 py-1">${akyo.nickname || akyo.avatarName}</td>
                    <td class="px-2 py-1">${akyo.attribute}</td>
                    <td class="px-2 py-1">${akyo.creator}</td>
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
    let maxId = Math.max(0, ...akyoData.map(a => parseInt(a.id) || 0));

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
        totalFilesSpan.textContent = imageFiles.length;
        progressText.textContent = '0';
    }

    // グローバル変数に一時保存
    window.pendingImageMappings = window.pendingImageMappings || [];

    let processedCount = 0;

    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded mapping-item';

            // ファイル名からIDを推測
            const match = file.name.match(/(\d{3})/);
            const suggestedId = match ? match[1] : '';

            // ユニークなIDを生成
            const uniqueId = `mapping-${Date.now()}-${index}`;

            div.innerHTML = `
                <img src="${e.target.result}" class="w-12 h-12 object-cover rounded">
                <input type="text" placeholder="AkyoID" value="${suggestedId}"
                       class="px-2 py-1 border rounded w-20 mapping-id-input"
                       data-image="${e.target.result}"
                       data-filename="${file.name}"
                       id="${uniqueId}">
                <span class="text-sm text-gray-600 flex-1">${file.name}</span>
                <button onclick="saveImageMapping('${uniqueId}')"
                        class="save-btn px-2 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
                    保存
                </button>
                <button onclick="removeMapping(this)"
                        class="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            `;

            mappingList.appendChild(div);

            // データを一時保存
            window.pendingImageMappings.push({
                id: uniqueId,
                suggestedId: suggestedId,
                imageData: e.target.result,
                fileName: file.name
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
            showNotification(`${file.name} の読み込みに失敗しました`, 'error');
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
        if (window.saveSingleImage) {
            await window.saveSingleImage(akyoId, imageData);
        } else {
            // フォールバック: 従来のLocalStorage保存
            if (!imageDataMap) imageDataMap = {};
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
    })

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
    button.parentElement.remove();
}

// 画像ギャラリー更新
function updateImageGallery() {
    const gallery = document.getElementById('imageGallery');
    const imageCount = document.getElementById('imageCount');
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

        div.innerHTML = `
            <img src="${imageData}" class="w-full h-24 object-cover rounded-lg">
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <div class="text-white text-center">
                    <div class="font-bold">#${akyoId}</div>
                    <div class="text-xs">${akyo ? akyo.nickname || akyo.avatarName : '未登録'}</div>
                </div>
            </div>
            ${currentUserRole === 'owner' ? `
            <button onclick="removeImage('${akyoId}')"
                    class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-times text-xs"></i>
            </button>
            ` : ''}
        `;

        gallery.appendChild(div);
    });
}

// 画像削除
function removeImage(akyoId) {
    if (!confirm(`Akyo #${akyoId} の画像を削除しますか？`)) return;

    delete imageDataMap[akyoId];
    localStorage.setItem('akyoImages', JSON.stringify(imageDataMap));
    updateImageGallery();
    showNotification(`Akyo #${akyoId} の画像を削除しました`, 'success');
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

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${akyo.id}</td>
            <td class="px-4 py-3">
                <div class="font-medium">${akyo.nickname || '-'}</div>
                <div class="text-xs text-gray-500">${akyo.avatarName}</div>
            </td>
            <td class="px-4 py-3 text-sm">${akyo.attribute}</td>
            <td class="px-4 py-3 text-sm">${akyo.creator}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="editAkyo('${akyo.id}')" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                ${currentUserRole === 'owner' ? `
                <button onclick="deleteAkyo('${akyo.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
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
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all transform translate-x-0`;

    switch (type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-yellow-500 text-white';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }

    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
            ${message}
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ID再採番機能
async function renumberAllIds() {
    if (!confirm('すべてのAkyoのIDを001から振り直します。\nこの操作は取り消せません。続行しますか？')) {
        return;
    }

    // IDマッピングの作成
    const oldToNewIdMap = {};

    // 名前順でソート（または任意の基準）してから連番を振る
    akyoData.sort((a, b) => {
        // 現在のID順でソート
        return parseInt(a.id) - parseInt(b.id);
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
    let favorites = JSON.parse(localStorage.getItem('akyoFavorites')) || [];
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
    // CSVフォーマットに変換
    let csvContent = ',見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL\n';

    akyoData.forEach(akyo => {
        const row = [
            akyo.id,
            akyo.appearance,
            akyo.nickname,
            akyo.avatarName,
            akyo.attribute,
            akyo.notes.includes(',') || akyo.notes.includes('\n') ? `"${akyo.notes}"` : akyo.notes,
            akyo.creator,
            akyo.avatarUrl
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
