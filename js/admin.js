// Akyo図鑑 管理者用JavaScript
console.debug('admin.js loading started');

// 認証ワードはサーバー側（Cloudflare ENV）で検証。フロントには保存しない

// グローバル変数
let currentUserRole = null;
let akyoData = [];
let imageDataMap = {}; // AkyoIDと画像の紐付け
let adminSessionToken = null; // 認証ワードはメモリ内にのみ保持
let hasBoundActionDelegation = false;
// ==== 先頭のグローバル変数群の近くに追記 ====
let deletedRemoteIds = new Set();

function loadDeletedRemoteIds() {
    try {
      const raw = localStorage.getItem('akyo:deletedRemoteIds');
      const arr = raw ? JSON.parse(raw) : [];
      deletedRemoteIds = new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      deletedRemoteIds = new Set();
    }
  }
  function saveDeletedRemoteIds() {
    try { localStorage.setItem('akyo:deletedRemoteIds', JSON.stringify(Array.from(deletedRemoteIds))); } catch (_){}
  }
  function markRemoteDeleted(id) {
    const id3 = String(id).padStart(3, '0');
    deletedRemoteIds.add(id3);
    saveDeletedRemoteIds();
  }
  function clearRemoteDeletedMark(id) {
    const id3 = String(id).padStart(3, '0');
    if (deletedRemoteIds.delete(id3)) saveDeletedRemoteIds();
  }
try { loadDeletedRemoteIds(); } catch (_){}
window.addEventListener('storage', (e) => {
  if (e.key === 'akyo:deletedRemoteIds') loadDeletedRemoteIds();
});
// DOMContentLoaded でロード
document.addEventListener('DOMContentLoaded', loadDeletedRemoteIds);

const FINDER_PREFILL_VALUE = 'Akyo';
const DEFAULT_ATTRIBUTE_NAME = '未分類';

const attributeManagerApi = window.attributeManager;
if (!attributeManagerApi) {
    throw new Error('attributeManager module failed to load. Please ensure js/attribute-manager.js is loaded before js/admin.js');
}

attributeManagerApi.configure({
    notify: (message, type = 'info', options) => showNotification(message, type, options),
    confirmDelete: (message) => window.confirm(message),
    getCurrentRole: () => currentUserRole,
    canDelete: (meta, role) => {
        const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
        if (name === DEFAULT_ATTRIBUTE_NAME) {
            return false;
        }
        return meta?.isSession ? true : role === 'owner';
    },
    onDelete: handleAttributeDeletion,
    onAttributesChanged: () => {
        // No-op for now; hook reserved for future analytics or persistence triggers.
    },
});

function setLocalStorageSafe(key, value, { onQuota } = {}) {
    try {
        localStorage.setItem(key, value);
        return { success: true };
    } catch (error) {
        if (error && error.name === 'QuotaExceededError') {
            if (typeof onQuota === 'function') {
                onQuota(error);
            } else {
                try {
                    showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
                } catch (_) {
                    // Notification system unavailable; swallow to keep UX resilient.
                }
            }
        } else {
            console.debug('localStorage setItem failed:', key, error);
        }
        return { success: false, error };
    }
}

function queueIdbMigration(oldToNewIdMap) {
    if (!oldToNewIdMap || typeof oldToNewIdMap !== 'object' || !Object.keys(oldToNewIdMap).length) {
        return;
    }
    setLocalStorageSafe('akyo:pendingIdbMigration', JSON.stringify({ map: oldToNewIdMap, ts: Date.now() }));
}

function clearQueuedIdbMigration() {
    try {
        localStorage.removeItem('akyo:pendingIdbMigration');
    } catch (_) {
        // ignore - removal failures are non-critical
    }
}

async function applyQueuedIdbMigrationIfAny() {
    if (!(window.storageManager && window.storageManager.isIndexedDBAvailable)) {
        return;
    }
    let payload;
    try {
        const raw = localStorage.getItem('akyo:pendingIdbMigration');
        if (!raw) {
            return;
        }
        payload = JSON.parse(raw);
    } catch (error) {
        console.debug('applyQueuedIdbMigrationIfAny: invalid payload', error);
        try { localStorage.removeItem('akyo:pendingIdbMigration'); } catch (_) {}
        return;
    }

    if (!payload || typeof payload !== 'object' || !payload.map || !Object.keys(payload.map).length) {
        clearQueuedIdbMigration();
        return;
    }

    try {
        const result = await migrateIndexedDbImages(payload.map, { removeOld: true });
        if (!result || result.allSuccessful) {
            clearQueuedIdbMigration();
        }
    } catch (error) {
        console.debug('applyQueuedIdbMigrationIfAny failed:', error);
    }
}

async function persistImage(akyoId, dataUrl, { backupToLocalStorage = true } = {}) {
    if (!akyoId) {
        throw new Error('persistImage requires a target ID');
    }
    if (!dataUrl) {
        throw new Error('persistImage requires image data');
    }

    if (!imageDataMap || typeof imageDataMap !== 'object') {
        imageDataMap = {};
    }

    const hadExistingEntry = Object.prototype.hasOwnProperty.call(imageDataMap, akyoId);
    const previousDataUrl = imageDataMap[akyoId];
    imageDataMap[akyoId] = dataUrl;

    const revertCache = () => {
        if (hadExistingEntry) {
            imageDataMap[akyoId] = previousDataUrl;
        } else {
            delete imageDataMap[akyoId];
        }
    };

    let persistedToIndexedDb = false;
    let indexedDbError = null;

    try {
        if (window.saveSingleImage) {
            await window.saveSingleImage(akyoId, dataUrl);
            persistedToIndexedDb = true;
        } else if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            await window.storageManager.init();
            await window.storageManager.saveImage(akyoId, dataUrl);
            persistedToIndexedDb = true;
        }
    } catch (error) {
        indexedDbError = error;
        console.debug('persistImage: indexed storage failed', akyoId, error);
    }

    if (indexedDbError && !persistedToIndexedDb) {
        revertCache();
        throw indexedDbError;
    }

    if (backupToLocalStorage) {
        const { success, error } = setLocalStorageSafe('akyoImages', JSON.stringify(imageDataMap));
        if (!success) {
            if (!persistedToIndexedDb) {
                revertCache();
                throw error || new Error('localStorage backup failed');
            }
            console.debug('persistImage: localStorage backup failed', akyoId, error);
        }
    }
    // 新規保存できたので削除印を解除
    try { clearRemoteDeletedMark(akyoId); } catch (_) {}

    return { persistedToIndexedDb };
}

async function removeImagePersistent(akyoId) {
    if (!akyoId) {
        return;
    }

    let removalError = null;
    let localBackupWarning = null;

    if (window.deleteSingleImage) {
        try {
            await window.deleteSingleImage(akyoId);
        } catch (error) {
            removalError = error;
        }
    }

    if (removalError) {
        throw removalError;
    }

    if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
        try {
            await window.storageManager.init();
            await window.storageManager.deleteImage(akyoId);
        } catch (error) {
            console.debug('removeImagePersistent: indexed storage delete failed', akyoId, error);
        }
    }

    if (imageDataMap && typeof imageDataMap === 'object') {
        delete imageDataMap[akyoId];
    }

    const { success, error } = setLocalStorageSafe('akyoImages', JSON.stringify(imageDataMap));
    if (!success) {
        if (error && error.name === 'QuotaExceededError') {
            localBackupWarning = error;
        } else {
            console.debug('removeImagePersistent: localStorage update failed', akyoId, error);
        }
    }

    return { localBackupWarning };
}

const authorSuggestionState = {
    authors: [],
    isBound: false,
    isOpen: false,
    lastFilter: '',
    handleDocumentClick: null,
    hasDelegatedEvents: false,
    boundInput: null,
};

function rebuildCreatorSuggestionSource() {
    const uniqueCreators = new Set();
    if (Array.isArray(akyoData)) {
        akyoData.forEach((akyo) => {
            const value = typeof akyo?.creator === 'string' ? akyo.creator.trim() : '';
            if (value) {
                uniqueCreators.add(value);
            }
        });
    }

    const sorted = Array.from(uniqueCreators);
    sorted.sort((a, b) => a.localeCompare(b, 'ja'));

    authorSuggestionState.authors = sorted;

    if (authorSuggestionState.isOpen) {
        renderCreatorSuggestions(authorSuggestionState.lastFilter);
    }
}

function bindCreatorSuggestionInput() {
    if (authorSuggestionState.isBound) {
        return;
    }

    const input = document.getElementById('addCreatorInput');
    const panel = document.getElementById('addCreatorSuggestions');

    if (!input || !panel) {
        return;
    }

    authorSuggestionState.boundInput = input;

    const handleInput = () => {
        if (authorSuggestionState.isOpen) {
            renderCreatorSuggestions(input.value || '');
        } else {
            showCreatorSuggestions();
        }
    };

    input.addEventListener('focus', showCreatorSuggestions);
    input.addEventListener('click', showCreatorSuggestions);
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideCreatorSuggestions();
        } else if (event.key === 'ArrowDown') {
            const firstOption = panel.querySelector('button');
            if (firstOption) {
                event.preventDefault();
                showCreatorSuggestions();
                window.requestAnimationFrame(() => firstOption.focus());
            }
        }
    });
    input.addEventListener('blur', () => {
        window.requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!panel.contains(active)) {
                hideCreatorSuggestions();
            }
        });
    });

    if (!authorSuggestionState.hasDelegatedEvents) {
        const handlePanelPointer = (event) => {
            const option = event.target.closest('[data-author-option]');
            if (!option) {
                return;
            }
            const targetInput = authorSuggestionState.boundInput;
            if (!targetInput) {
                return;
            }
            event.preventDefault();
            const value = option.dataset.authorOption || '';
            targetInput.value = value;
            hideCreatorSuggestions();
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            window.requestAnimationFrame(() => targetInput.focus());
        };

        const handlePanelKeydown = (event) => {
            if (event.key === 'Escape') {
                hideCreatorSuggestions();
                window.requestAnimationFrame(() => input.focus());
                return;
            }

            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            const option = event.target.closest('[data-author-option]');
            if (!option) {
                return;
            }

            event.preventDefault();
            const targetInput = authorSuggestionState.boundInput;
            if (!targetInput) {
                return;
            }

            const value = option.dataset.authorOption || '';
            targetInput.value = value;
            hideCreatorSuggestions();
            window.requestAnimationFrame(() => targetInput.focus());
        };

        panel.addEventListener('mousedown', handlePanelPointer);
        panel.addEventListener('keydown', handlePanelKeydown);
        authorSuggestionState.hasDelegatedEvents = true;
    }

    authorSuggestionState.handleDocumentClick = (event) => {
        if (!authorSuggestionState.isOpen) {
            return;
        }
        if (event.target === input || panel.contains(event.target)) {
            return;
        }
        hideCreatorSuggestions();
    };

    document.addEventListener('mousedown', authorSuggestionState.handleDocumentClick);

    authorSuggestionState.isBound = true;
}

function showCreatorSuggestions() {
    const input = document.getElementById('addCreatorInput');
    const panel = document.getElementById('addCreatorSuggestions');
    if (!input || !panel) {
        return;
    }

    renderCreatorSuggestions(input.value || '');

    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');
    authorSuggestionState.isOpen = true;
}

function hideCreatorSuggestions() {
    const panel = document.getElementById('addCreatorSuggestions');
    if (!panel) {
        return;
    }

    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
    authorSuggestionState.isOpen = false;
}

function renderCreatorSuggestions(filterText = '') {
    const panel = document.getElementById('addCreatorSuggestions');
    const input = document.getElementById('addCreatorInput');

    if (!panel || !input) {
        return;
    }

    panel.setAttribute('role', 'listbox');
    authorSuggestionState.lastFilter = filterText;

    const normalized = filterText.trim().toLocaleLowerCase('ja');
    const allAuthors = authorSuggestionState.authors || [];
    const matches = normalized
        ? allAuthors.filter((author) => author.toLocaleLowerCase('ja').includes(normalized))
        : allAuthors;

    panel.textContent = '';
    panel.scrollTop = 0;

    if (allAuthors.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'px-3 py-2 text-sm text-gray-500';
        empty.textContent = '登録済みの作者がまだありません';
        panel.appendChild(empty);
        return;
    }

    if (matches.length === 0) {
        const noMatch = document.createElement('p');
        noMatch.className = 'px-3 py-2 text-sm text-gray-500';
        noMatch.textContent = '一致する作者が見つかりません';
        panel.appendChild(noMatch);
        return;
    }

    const fragment = document.createDocumentFragment();
    matches.forEach((author) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'w-full text-left px-3 py-2 text-sm hover:bg-green-100 focus:bg-green-100 focus:outline-none';
        option.setAttribute('role', 'option');
        option.dataset.authorOption = author;
        option.textContent = author;
        fragment.appendChild(option);
    });

    panel.appendChild(fragment);
}

async function handleAttributeDeletion({ name, meta }) {
    const parsed = attributeManagerApi.parseAttributeString(name);
    const normalized = parsed.length > 0 ? parsed[0] : '';
    if (!normalized) {
        return false;
    }

    if (normalized === DEFAULT_ATTRIBUTE_NAME) {
        showNotification(`属性「${DEFAULT_ATTRIBUTE_NAME}」は削除できません`, 'error');
        return false;
    }

    let csvUpdated = false;
    const touchedRecords = [];

    if (!meta?.isSession && Array.isArray(akyoData) && akyoData.length > 0) {
        akyoData.forEach((akyo) => {
            const attributeValue = typeof akyo?.attribute === 'string' ? akyo.attribute : '';
            const attrs = attributeManagerApi.parseAttributeString(attributeValue);
            if (!attrs.includes(normalized)) {
                return;
            }

            const filtered = attrs.filter(attr => attr !== normalized);
            if (filtered.length === 0) {
                filtered.push(DEFAULT_ATTRIBUTE_NAME);
            }
            const updatedValue = filtered.join(',');
            if (updatedValue !== attributeValue) {
                touchedRecords.push({ akyo, original: attributeValue, updated: updatedValue });
            }
        });

        if (touchedRecords.length > 0) {
            touchedRecords.forEach(({ akyo, updated }) => {
                akyo.attribute = updated;
            });

            try {
                await updateCSVFile();
                csvUpdated = true;
            } catch (error) {
                touchedRecords.forEach(({ akyo, original }) => {
                    akyo.attribute = original;
                });
                console.error('Failed to persist attribute removal', error);
                showNotification('属性の削除内容を保存できませんでした', 'error');
                refreshDerivedCollections();
                return false;
            }
        }
    }

    if (csvUpdated) {
        try {
            updateEditList();
        } catch (_) {
            // 編集リストが未初期化の場合は無視
        }
    }

    refreshDerivedCollections();

    return { message: `属性「${normalized}」を削除しました`, type: 'success' };
}

function refreshDerivedCollections() {
    attributeManagerApi.rebuildFromAkyoData(akyoData);
    rebuildCreatorSuggestionSource();
}

function normalizeForDuplicateComparison(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLocaleLowerCase('ja');
}

function findDuplicateIdsByField(fieldName, value, { excludeId } = {}) {
    const target = normalizeForDuplicateComparison(value);
    if (!target || !Array.isArray(akyoData)) {
        return [];
    }

    return akyoData.reduce((matches, entry) => {
        if (!entry || (excludeId && entry.id === excludeId)) {
            return matches;
        }

        const candidate = normalizeForDuplicateComparison(entry[fieldName]);
        if (candidate && candidate === target) {
            matches.push(entry.id);
        }
        return matches;
    }, []);
}

function formatAkyoIdLabel(id) {
    const numeric = Number.parseInt(id, 10);
    if (Number.isFinite(numeric)) {
        return `#${String(numeric).padStart(3, '0')}`;
    }
    return `#${String(id)}`;
}

function setDuplicateStatus(element, { message, tone }) {
    if (!element) {
        return;
    }

    const baseClass = element.dataset.statusBaseClass ? element.dataset.statusBaseClass.trim() : '';
    if (!message) {
        const hiddenClass = baseClass ? `${baseClass} hidden` : 'hidden';
        element.className = hiddenClass;
        element.textContent = '';
        return;
    }

    let toneClass = 'text-gray-600';
    if (tone === 'error') {
        toneClass = 'text-red-600';
    } else if (tone === 'success') {
        toneClass = 'text-green-600';
    }

    const className = baseClass ? `${baseClass} ${toneClass}` : toneClass;
    element.className = className;
    element.textContent = message;
}

function clearDuplicateStatus(element) {
    setDuplicateStatus(element, { message: '', tone: 'neutral' });
}

function attachDuplicateChecker({ button, input, status, field, texts, excludeId }) {
    if (!button || !input || !status) {
        return;
    }

    const { empty, success, duplicatePrefix } = texts || {};

    const runCheck = () => {
        const rawValue = input.value || '';
        if (!rawValue.trim()) {
            setDuplicateStatus(status, { message: empty || '値を入力してください', tone: 'neutral' });
            return;
        }

        const matches = findDuplicateIdsByField(field, rawValue, { excludeId });
        if (matches.length === 0) {
            setDuplicateStatus(status, { message: success || '重複は見つかりませんでした', tone: 'success' });
            return;
        }

        const formatted = matches.map(formatAkyoIdLabel).join('、');
        setDuplicateStatus(status, {
            message: `${duplicatePrefix || '重複が見つかりました: '}${formatted}`,
            tone: 'error',
        });
    };

    button.addEventListener('click', runCheck);

    const resetHandler = () => clearDuplicateStatus(status);
    input.addEventListener('input', resetHandler);
    input.addEventListener('change', resetHandler);
}

function getMaxAssignedAkyoId() {
    const akyoIds = Array.isArray(akyoData)
        ? akyoData
            .map(item => {
                const parsed = parseInt(item?.id, 10);
                return Number.isFinite(parsed) ? parsed : null;
            })
            .filter((value) => value !== null)
        : [];

    const imageIds = imageDataMap && typeof imageDataMap === 'object'
        ? Object.keys(imageDataMap)
            .map(id => {
                const parsed = parseInt(id, 10);
                return Number.isFinite(parsed) ? parsed : null;
            })
            .filter((value) => value !== null)
        : [];

    if (akyoIds.length === 0 && imageIds.length === 0) {
        return 0;
    }

    return Math.max(...akyoIds, ...imageIds, 0);
}

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

function escapeCsvValue(value) {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
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

async function migrateIndexedDbImages(oldToNewIdMap, { removeOld = true } = {}) {
    if (!(window.storageManager && window.storageManager.isIndexedDBAvailable)) {
        return { anyChanges: false, allSuccessful: false };
    }

    let anyChanges = false;
    let allSuccessful = true;

    const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    try {
        await window.storageManager.init();
        for (const [oldId, newId] of Object.entries(oldToNewIdMap || {})) {
            if (!newId || oldId === newId) {
                continue;
            }

            let dataUrl = imageDataMap[newId] || imageDataMap[oldId];
            if (!dataUrl) {
                try {
                    const blob = await window.storageManager.getImage(oldId);
                    if (blob instanceof Blob) {
                        dataUrl = await blobToDataUrl(blob);
                        imageDataMap[newId] = dataUrl;
                    }
                } catch (error) {
                    console.debug('migrateIndexedDbImages: fallback read failed', { oldId }, error);
                }
            }

            if (!dataUrl) {
                allSuccessful = false;
                continue;
            }

            try {
                await window.storageManager.saveImage(newId, dataUrl);
                anyChanges = true;
                imageDataMap[newId] = dataUrl;
            } catch (error) {
                console.debug('migrateIndexedDbImages: save failed', { oldId, newId }, error);
                allSuccessful = false;
                continue;
            }

            if (removeOld) {
                try {
                    await window.storageManager.deleteImage(oldId);
                } catch (error) {
                    console.debug('migrateIndexedDbImages: delete failed', { oldId }, error);
                }
                delete imageDataMap[oldId];
            }
        }
    } catch (error) {
        console.debug('IndexedDB migration error:', error);
        allSuccessful = false;
    }

    if (anyChanges) {
        setLocalStorageSafe('akyoImages', JSON.stringify(imageDataMap));
    }

    return { anyChanges, allSuccessful };
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
    attributeManagerApi.init();

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
        if (attributeManagerApi.isModalOpen()) {
            event.preventDefault();
            attributeManagerApi.closeModal();
            return;
        }
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
    // ログインフォーム（IDがあれば優先）
    const loginForm = document.getElementById('finderLoginForm') || document.querySelector('#loginScreen form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    bindCreatorSuggestionInput();

    // トリミングUIの有無を検出
    const useCustomCropper = !!document.getElementById('cropContainer');

    // 画像入力
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file || !file.type?.startsWith('image/')) {
                return;
            }
            if (useCustomCropper && typeof window.handleImageFileWithCrop === 'function') {
                window.handleImageFileWithCrop(file);
            } else {
                handleImageSelect(event);
            }
        });
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

    attachDuplicateChecker({
        button: document.getElementById('checkNicknameDuplicateButton'),
        input: document.getElementById('addNicknameInput'),
        status: document.getElementById('nicknameDuplicateStatus'),
        field: 'nickname',
        texts: {
            empty: '通称を入力してください',
            success: '重複している通称はありません',
            duplicatePrefix: '重複している通称が見つかりました: ',
        },
    });

    attachDuplicateChecker({
        button: document.getElementById('checkAvatarDuplicateButton'),
        input: document.getElementById('addAvatarNameInput'),
        status: document.getElementById('avatarDuplicateStatus'),
        field: 'avatarName',
        texts: {
            empty: 'アバター名を入力してください',
            success: '重複しているアバター名はありません',
            duplicatePrefix: '重複しているアバター名が見つかりました: ',
        },
    });

    if (!hasBoundActionDelegation) {
        document.addEventListener('click', handleAdminActionClick);
        hasBoundActionDelegation = true;
    }
}

// ドラッグ&ドロップ設定
function setupDragDrop() {
    // 画像ドロップゾーン（トリミングUIがある場合は drop ハンドラを切り替え）
    const imageDropZone = document.getElementById('imageDropZone');
    const imageInput = document.getElementById('imageInput');
    if (imageDropZone) {
        const useCustomCropper =
            !!document.getElementById('cropContainer') &&
            typeof window.handleImageFileWithCrop === 'function';

        if (imageInput) {
            imageDropZone.addEventListener('click', () => imageInput.click());
            imageDropZone.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    imageInput.click();
                }
            });
            if (!imageDropZone.hasAttribute('tabindex')) {
                imageDropZone.tabIndex = 0;
            }
            imageDropZone.setAttribute('role', 'button');
            imageDropZone.setAttribute('aria-label', '画像を選択');
        }
        imageDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageDropZone.classList.add('dragover');
        });
        imageDropZone.addEventListener('dragleave', () => {
            imageDropZone.classList.remove('dragover');
        });
        imageDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            imageDropZone.classList.remove('dragover');
            const file = e.dataTransfer?.files?.[0];
            if (!file || !file.type?.startsWith('image/')) return;
            if (useCustomCropper) {
                window.handleImageFileWithCrop(file);
            } else {
                handleImageDrop(e);
            }
        });
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

    const nextId = String(getMaxAssignedAkyoId() + 1).padStart(3, '0');
    nextIdInput.value = `#${nextId}`;

    console.debug(`次のID更新: ${nextId}`);
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
                await applyQueuedIdbMigrationIfAny();
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

        refreshDerivedCollections();

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
                await applyQueuedIdbMigrationIfAny();
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

        refreshDerivedCollections();

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
    csvText = String(csvText).replace(/\r\n?/g, '\n');
    const data = [];
    let inQuotes = false;
    let field = '';
    let record = [];
    let lineIndex = 0;
    const pushField = () => { record.push(field); field = ''; };
    const pushRecord = () => {
        if (record.length > 0) {
            // ヘッダ行はスキップ
            if (lineIndex > 0) {
                const rawValues = record;
                const values = rawValues.map((val, index) => {
                    if (val === null || val === undefined) {
                        return '';
                    }
                    const str = String(val);
                    // 備考欄（index 5）はトリムせずそのまま保持
                    if (index === 5) {
                        return str;
                    }
                    return str.trim();
                });
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
                    const attributeSource = values[4] && values[4].trim() ? values[4] : DEFAULT_ATTRIBUTE_NAME;
                    if (values.length === 8) {
                        akyo.attribute = attributeManagerApi.serializeAttributes(attributeSource);
                        akyo.notes = values[5] || '';
                        akyo.creator = values[6] || '不明';
                        akyo.avatarUrl = values[7] || '';
                    } else if (values.length > 8) {
                        akyo.avatarUrl = values[values.length - 1] || '';
                        akyo.creator = values[values.length - 2] || '不明';
                        akyo.attribute = attributeManagerApi.serializeAttributes(attributeSource);
                        akyo.notes = values.slice(5, values.length - 2).join(',');
                    } else {
                        akyo.attribute = attributeManagerApi.serializeAttributes(attributeSource);
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
        btn.classList.remove('tab-active');
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
        targetBtn.classList.add('tab-active');
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

    if (!attributeManagerApi.hasSelection('add')) {
        showNotification('属性を1つ以上選択してください', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const rawAttribute = formData.get('attribute');
    const normalizedAttribute = attributeManagerApi.serializeAttributes(rawAttribute);

    // ID自動採番（データ/画像の双方で最大値+1）
    const maxId = getMaxAssignedAkyoId();
    const newId = String(maxId + 1).padStart(3, '0');

    const newAkyo = {
        id: newId,
        appearance: '',
        nickname: formData.get('nickname'),
        avatarName: formData.get('avatarName'),
        attribute: normalizedAttribute,
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
    refreshDerivedCollections();

    let latestImageDataUrl = null;

    const persistNewImage = async (dataUrl) => {
        if (!dataUrl) {
            return;
        }
        latestImageDataUrl = dataUrl;
        try {
            await persistImage(newAkyo.id, dataUrl);
        } catch (error) {
            console.error('Image save error:', error);
            if (error && error.name === 'QuotaExceededError') {
                showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
            } else {
                showNotification(`画像の保存に失敗しました: ${error?.message || error}`, 'error');
            }
        }
    };

    try {
        if (window.generateCroppedImage) {
            const croppedImage = await window.generateCroppedImage();
            await persistNewImage(croppedImage);
        } else {
            const imagePreview = document.querySelector('#cropImage');
            const previewSrc = imagePreview && imagePreview.src && imagePreview.src !== window.location.href
                ? imagePreview.src
                : null;
            await persistNewImage(previewSrc);
        }
    } catch (error) {
        console.error('Image processing error:', error);
    }

    // オンラインアップロード（存在すれば実行）
    try {
        if (typeof uploadAkyoOnline === 'function') {
            const fileInput = document.getElementById('imageInput');
            const fileObj = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            const adminPassword = adminSessionToken;
            if (!adminPassword) {
                showNotification('認証が無効です。画像の公開アップロードはスキップしました。', 'warning');
            } else if (fileObj || latestImageDataUrl) {
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
    attributeManagerApi.resetField('add');
    clearDuplicateStatus(document.getElementById('nicknameDuplicateStatus'));
    clearDuplicateStatus(document.getElementById('avatarDuplicateStatus'));
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
        setLocalStorageSafe('akyoAssetsVersion', stamp);
    } catch (_) {}

    return json;
}

// 🎯 ここに追記
// admin.js（共通関数群の近く）
async function deleteRemoteImage(id) {
    if (!adminSessionToken) throw new Error('認証が必要です');

    const id3 = String(id).padStart(3, '0');
    const endpoint = window.__USE_GH_UPLOAD__ ? '/api/gh-delete' : '/api/delete-image';
    const authHeader = { authorization: `Bearer ${adminSessionToken}` };

    const attempt = async ({ method, json, query }) => {
      const url = new URL(endpoint, location.origin);
      if (query) url.searchParams.set('id', id3);
      const res = await fetch(url.toString(), {
        method,
        headers: { ...authHeader, ...(json ? { 'content-type': 'application/json' } : {}) },
        body: json ? JSON.stringify({ id: id3 }) : undefined,
      });
      let payload = null; try { payload = await res.clone().json(); } catch (_) {}
      if (!res.ok || (payload && payload.ok === false)) {
        throw new Error((payload && payload.error) || `HTTP ${res.status}`);
      }
      return true;
    };

    try {
      await attempt({ method: 'DELETE', query: true });
    } catch (e1) {
      if (!/405|404/.test(String(e1))) throw e1;
      try {
        await attempt({ method: 'POST', json: true });
      } catch (e2) {
        await attempt({ method: 'POST', query: true });
      }
    }

    // --- 成功時の後処理（ここが重要） ---
    markRemoteDeleted(id3);                 // 再読み込み後もR2/GHを使わないためのフラグ
    if (window.akyoImageManifestMap) {
      delete window.akyoImageManifestMap[id3]; // その場でも参照されないよう即時除去
    }
    try { setLocalStorageSafe('akyoAssetsVersion', String(Date.now())); } catch (_) {}

    return true;
  }


  // グローバル公開
  window.prepareWebpFileForUpload = prepareWebpFileForUpload;
  window.uploadAkyoOnline = uploadAkyoOnline;
  window.deleteRemoteImage = deleteRemoteImage;
   // ←追加

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

    try {
        await persistImage(akyoId, dataUrl);
    } catch (error) {
        if (error && error.name === 'QuotaExceededError') {
            throw new Error('ローカル保存に失敗しました: 容量不足です');
        }
        throw new Error(`ローカル保存に失敗しました: ${error?.message || error}`);
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
      // ローカル（IndexedDB + localStorage + メモリ）を削除
      const { localBackupWarning } = await removeImagePersistent(akyoId);

      // 公開側(R2/GH)も削除（成功すると markRemoteDeleted が立つ）
      try {
        await deleteRemoteImage(akyoId);
        showNotification(`公開画像も削除しました (#${akyoId})`, 'success');
      } catch (e) {
        showNotification(`公開画像の削除に失敗しました: ${e?.message || e}`, 'error');
      }

      // プレビューは getAkyoImageUrl() 再評価で貼り替え（VRChatへフォールバックする）
      const preview = document.getElementById(`editImagePreview-${akyoId}`);
      if (preview) {
        preview.src = window.getAkyoImageUrl(akyoId, { size: 512 });
        preview.style.display = '';
        // 念のため onerror で非表示
        preview.onerror = function () { this.style.display = 'none'; };
      }

      updateImageGallery();
      if (localBackupWarning) {
        showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
      }
    } catch (e) {
      showNotification('削除エラー: ' + (e?.message || e), 'error');
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
    const attributeRawValue = akyo.attribute || '';
    const safeAttribute = escapeHtml(attributeRawValue);
    const safeCreator = escapeHtml(akyo.creator || '');
    const safeAvatarUrl = escapeHtml(akyo.avatarUrl || '');
    const safeNotes = escapeHtml(akyo.notes || '');
    const previewSrc = imageDataMap[akyo.id] || (typeof getAkyoImageUrl === 'function' ? getAkyoImageUrl(id3) : '');
    const safePreviewSrc = escapeHtml(previewSrc || '');

    const nicknameInputId = `editNickname-${safeAkyoId}`;
    const nicknameStatusId = `nicknameStatus-${safeAkyoId}`;
    const nicknameCheckButtonId = `nicknameCheck-${safeAkyoId}`;
    const avatarInputId = `editAvatarName-${safeAkyoId}`;
    const avatarStatusId = `avatarStatus-${safeAkyoId}`;
    const avatarCheckButtonId = `avatarCheck-${safeAkyoId}`;
    const attributeFieldId = `edit-${safeAkyoId}`;
    const attributeHiddenId = `attributeInput-${safeAkyoId}`;
    const attributeListId = `attributeList-${safeAkyoId}`;
    const attributePlaceholderId = `attributePlaceholder-${safeAkyoId}`;
    const attributeSelections = attributeManagerApi.parseAttributeString(attributeRawValue);
    const attributeListClass = attributeSelections.length
        ? 'mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1'
        : 'hidden mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1';
    const attributePlaceholderClass = attributeSelections.length
        ? 'hidden text-sm text-gray-500'
        : 'text-sm text-gray-500';

    content.innerHTML = `
        <form onsubmit="handleUpdateAkyo(event, '${safeAkyoId}')" data-attribute-field-id="${attributeFieldId}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">ID（変更不可）</label>
                    <input type="text" value="${safeDisplayId}" disabled
                           class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                </div>

                <div>
                    <div class="flex items-center justify-between gap-2">
                        <label class="block text-gray-700 text-sm font-medium">通称</label>
                        <button type="button" id="${nicknameCheckButtonId}"
                                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-orange-200 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                            <i class="fas fa-search"></i>
                            同じ通称が既に登録されているか確認
                        </button>
                    </div>
                    <input type="text" name="nickname" id="${nicknameInputId}" value="${safeNickname}"
                           class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p id="${nicknameStatusId}" class="mt-2 text-sm hidden" data-status-base-class="mt-2 text-sm" aria-live="polite"></p>
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">アバター名</label>
                    <input type="text" name="avatarName" id="${avatarInputId}" value="${safeAvatarName}" required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                        <button type="button" id="${avatarCheckButtonId}"
                                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-orange-200 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                            <i class="fas fa-search"></i>
                            同じアバター名が既に登録されているか確認
                        </button>
                        <p id="${avatarStatusId}" class="text-sm hidden mt-1 sm:mt-0 sm:ml-2" data-status-base-class="text-sm mt-1 sm:mt-0 sm:ml-2" aria-live="polite"></p>
                    </div>
                </div>

                <div>
                    <label class="block text-gray-700 text-sm font-medium mb-1">属性</label>
                    <div class="space-y-2">
                        <button type="button"
                                class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 transition-colors"
                                data-attribute-target="${attributeFieldId}">
                            <i class="fas fa-tags"></i>
                            属性を管理
                        </button>
                        <input type="hidden" name="attribute" id="${attributeHiddenId}" value="${safeAttribute}">
                        <div class="border border-dashed border-green-200 rounded-lg bg-white/60 p-3">
                            <p id="${attributePlaceholderId}" class="${attributePlaceholderClass}">
                                選択された属性がここに表示されます
                            </p>
                            <div id="${attributeListId}" class="${attributeListClass}" role="list"></div>
                        </div>
                    </div>
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
                    <img id="editImagePreview-${safeAkyoId}" src="${safePreviewSrc}" alt="Akyo #${safeDisplayId} の画像プレビュー" class="w-32 h-24 object-cover rounded border" onerror="this.style.display='none'" />
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

    const attributeHiddenInput = content.querySelector(`#${attributeHiddenId}`);
    const attributeBadgeContainer = content.querySelector(`#${attributeListId}`);
    const attributePlaceholderEl = content.querySelector(`#${attributePlaceholderId}`);
    const attributeButton = content.querySelector(`[data-attribute-target="${attributeFieldId}"]`);
    attributeManagerApi.registerField(attributeFieldId, {
        hiddenInput: attributeHiddenInput,
        badgeContainer: attributeBadgeContainer,
        placeholder: attributePlaceholderEl,
        button: attributeButton,
    }, { initialValue: attributeRawValue });
    attributeManagerApi.setCurrentEditField(attributeFieldId);
    attributeManagerApi.ensureFieldSync(attributeFieldId, attributeRawValue);

    const nicknameCheckButton = content.querySelector(`#${nicknameCheckButtonId}`);
    const nicknameInputEl = content.querySelector(`#${nicknameInputId}`);
    const nicknameStatusEl = content.querySelector(`#${nicknameStatusId}`);
    attachDuplicateChecker({
        button: nicknameCheckButton,
        input: nicknameInputEl,
        status: nicknameStatusEl,
        field: 'nickname',
        texts: {
            empty: '通称を入力してください',
            success: '重複している通称はありません',
            duplicatePrefix: '重複している通称が見つかりました: ',
        },
        excludeId: akyo.id,
    });

    const avatarCheckButton = content.querySelector(`#${avatarCheckButtonId}`);
    const avatarInputEl = content.querySelector(`#${avatarInputId}`);
    const avatarStatusEl = content.querySelector(`#${avatarStatusId}`);
    attachDuplicateChecker({
        button: avatarCheckButton,
        input: avatarInputEl,
        status: avatarStatusEl,
        field: 'avatarName',
        texts: {
            empty: 'アバター名を入力してください',
            success: '重複しているアバター名はありません',
            duplicatePrefix: '重複しているアバター名が見つかりました: ',
        },
        excludeId: akyo.id,
    });

    modal.classList.remove('hidden');
}


// Akyo更新処理
async function handleUpdateAkyo(event, akyoId) {
    event.preventDefault();

    const fieldId = event.target.getAttribute('data-attribute-field-id');
    if (fieldId && !attributeManagerApi.hasSelection(fieldId)) {
        showNotification('属性を1つ以上選択してください', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const akyoIndex = akyoData.findIndex(a => a.id === akyoId);

    if (akyoIndex === -1) return;

    akyoData[akyoIndex] = {
        ...akyoData[akyoIndex],
        nickname: formData.get('nickname'),
        avatarName: formData.get('avatarName'),
        attribute: attributeManagerApi.serializeAttributes(formData.get('attribute')),
        notes: formData.get('notes'),
        creator: formData.get('creator'),
        avatarUrl: formData.get('avatarUrl')
    };

    try {
        await updateCSVFile();
        refreshDerivedCollections();
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
    setLocalStorageSafe('akyoImages', JSON.stringify(imageDataMap));
    queueIdbMigration(oldToNewIdMap);
    let migrationResult = null;
    try {
        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            await window.storageManager.init();
            try {
                await window.storageManager.deleteImage(akyoId);
            } catch (_) {
                // ignore delete failures
            }
            migrationResult = await migrateIndexedDbImages(oldToNewIdMap, { removeOld: true });
        }
    } catch (error) {
        console.debug('IndexedDB sync failed in deleteAkyo:', error);
    }
    if (migrationResult && migrationResult.allSuccessful) {
        clearQueuedIdbMigration();
    }

    // お気に入りデータのID更新
    let favorites = loadFavoritesArray();
    favorites = favorites
        .filter(id => id !== akyoId)  // 削除対象を除外
        .map(id => oldToNewIdMap[id] || id);  // ID更新
    setLocalStorageSafe('akyoFavorites', JSON.stringify(favorites));

    await updateCSVFile();
    refreshDerivedCollections();

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
    attributeManagerApi.clearCurrentEditField();
    document.getElementById('editModal').classList.add('hidden');
}

// グローバルスコープに公開
window.closeEditModal = closeEditModal;

// CSV更新
async function updateCSVFile() {
    let csvContent = 'ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL\n';

    akyoData.forEach(akyo => {
        const row = [
            escapeCsvValue(akyo.id),
            escapeCsvValue(akyo.appearance),
            escapeCsvValue(akyo.nickname),
            escapeCsvValue(akyo.avatarName),
            escapeCsvValue(akyo.attribute),
            escapeCsvValue(akyo.notes),
            escapeCsvValue(akyo.creator),
            escapeCsvValue(akyo.avatarUrl)
        ].join(',');
        csvContent += row + '\n';
    });

    // ローカルストレージに保存（本番環境ではサーバーに送信）
    setLocalStorageSafe('akyoDataCSV', csvContent);
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
                const extra = detail ? ` ${String(detail).slice(0, 200)}` : '';
                const msg = `GitHubへの反映に失敗しました (${res.status})${extra}。ローカル保存は完了しています。後で再度同期をお試しください。`;
                console.error('commit-csv failed', res.status, detail || json);
                showNotification(msg, 'error');
            } else {
                console.debug('commit-csv ok', json);
                // バージョンアップで即時反映
                const ver = parseInt(localStorage.getItem('akyoDataVersion') || '0', 10) + 1;
                setLocalStorageSafe('akyoDataVersion', String(ver));
                setLocalStorageSafe('akyoAssetsVersion', String(ver));
                const link = (json && (json.commitUrl || json.fileHtmlUrl)) ? `\n${json.commitUrl || json.fileHtmlUrl}` : '';
                showNotification(`GitHubに反映しました（最新データを取得します）${link}`, 'success', { linkify: true });
            }
        }
    } catch (e) {
        console.error('commit-csv request error', e);
        const detail = (e && (e.message || e.toString && e.toString())) || '';
        const suffix = detail ? ` (${String(detail).slice(0, 200)})` : '';
        const msg = `GitHubへの反映通信でエラーが発生しました${suffix}。ローカル保存は完了しています。ネットワークを確認のうえ再試行してください。`;
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
    let maxId = getMaxAssignedAkyoId();

    const preview = document.getElementById('csvPreview');
    const table = document.getElementById('csvPreviewTable');
    if (!preview || !table) return;

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
    let maxId = getMaxAssignedAkyoId();

    // CSVデータのIDを自動採番で上書き
    window.pendingCSVData.forEach(akyo => {
        maxId++;
        akyo.id = String(maxId).padStart(3, '0');
    });

    // 既存データに追加
    akyoData = [...akyoData, ...window.pendingCSVData].sort((a, b) => a.id.localeCompare(b.id));

    await updateCSVFile();
    refreshDerivedCollections();
    try {
        const ver = parseInt(localStorage.getItem('akyoDataVersion') || '0', 10) + 1;
        setLocalStorageSafe('akyoDataVersion', String(ver));
        setLocalStorageSafe('akyoAssetsVersion', String(ver));
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
            const previewAltText = currentFile.name ? `プレビュー: ${currentFile.name}` : '画像プレビュー';
            const safePreviewAlt = escapeHtml(previewAltText);

            div.innerHTML = `
                <img src="${safeImageData}" alt="${safePreviewAlt}" class="w-12 h-12 object-cover rounded">
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
        await persistImage(akyoId, imageData);

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
        if (error && error.name === 'QuotaExceededError') {
            showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
        } else {
            showNotification('保存エラー: ' + (error?.message || error), 'error');
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

        try {
            await persistImage(akyoId, imageData);
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
            if (error && error.name === 'QuotaExceededError') {
                showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
                return;
            }
            console.error(`保存エラー ${akyoId}:`, error);
            showNotification(`保存エラー: ${akyoId} - ${error?.message || error}`, 'error');
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

    // カウントは従来どおり「ローカル保存分」の枚数のままにする
    if (imageCount) imageCount.textContent = Object.keys(imageDataMap).length;

    const ids = Array.isArray(akyoData) ? akyoData.map(a => a.id).sort((a,b)=>a.localeCompare(b)) : [];
    ids.forEach((akyoId) => {
      const akyo = akyoData.find(a => a.id === akyoId);
      const isLocal = !!(imageDataMap && imageDataMap[akyoId]);

      const src =
        (imageDataMap && imageDataMap[akyoId]) ||
        (window.akyoImageManifestMap && window.akyoImageManifestMap[akyoId]) ||
        (typeof getAkyoImageUrl === 'function' ? getAkyoImageUrl(akyoId) : `images/${akyoId}.webp`);

      const div = document.createElement('div');
      div.className = 'relative group';
      div.tabIndex = 0;

      const safeId = escapeHtml(akyoId);
      const safeSrc = escapeHtml(src || '');
      const safeLabel = escapeHtml(akyo ? (akyo.nickname || akyo.avatarName || '') : '未登録');
      const alt = akyo && (akyo.nickname || akyo.avatarName)
        ? `Akyo #${akyoId} ${akyo.nickname || akyo.avatarName}`
        : `Akyo #${akyoId} の画像`;
      const safeAlt = escapeHtml(alt);

      div.innerHTML = `
        <img src="${safeSrc}" alt="${safeAlt}" class="w-full h-24 object-cover rounded-lg" onerror="this.style.display='none'">
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <div class="text-white text-center">
            <div class="font-bold">#${safeId}</div>
            <div class="text-xs">${safeLabel}</div>
          </div>
        </div>
        ${
          (isLocal && currentUserRole === 'owner')
            ? `<button type="button" data-action="remove-image" data-id="${safeId}"
                 class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                 <i class="fas fa-times text-xs"></i>
               </button>`
            : ''
        }
      `;
      gallery.appendChild(div);
    });
  }


// 画像削除（IndexedDB/Local双方）
async function removeImage(akyoId) {
    if (!confirm(`Akyo #${akyoId} の画像を削除しますか？`)) return;
    try {
        const { localBackupWarning } = await removeImagePersistent(akyoId);
        updateImageGallery();
        showNotification(`Akyo #${akyoId} の画像を削除しました`, 'success');
        if (localBackupWarning) {
            showNotification('容量不足！migrate-storage.htmlでIndexedDBへ移行してください', 'error');
        }
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
function showNotification(message, type = 'info', opts = {}) {
    const { linkify = false } = opts;
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'fixed top-20 right-4 flex flex-col items-end gap-2 z-50';
        document.body.appendChild(container);
    }
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const notification = document.createElement('div');
    notification.className = 'px-6 py-3 rounded-lg shadow-lg transition-all transform translate-x-0 text-white bg-blue-500';
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');

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

    const row = document.createElement('div');
    row.className = 'flex items-center';
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} mr-2`;
    row.appendChild(icon);

    const text = String(message ?? '');
    if (linkify) {
        const parts = text.split(/(https?:\/\/[^\s]+)/g);
        parts.forEach(part => {
            if (/^https?:\/\//.test(part)) {
                const anchor = document.createElement('a');
                anchor.href = part;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.className = 'underline';
                anchor.textContent = part;
                row.appendChild(anchor);
            } else if (part) {
                row.appendChild(document.createTextNode(part));
            }
        });
    } else {
        row.appendChild(document.createTextNode(text));
    }

    notification.appendChild(row);

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

    // 現在のID順でソートしてから連番を振る
    akyoData.sort((a, b) => {
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
    setLocalStorageSafe('akyoImages', JSON.stringify(imageDataMap));
    queueIdbMigration(oldToNewIdMap);
    const migrationResult = await migrateIndexedDbImages(oldToNewIdMap, { removeOld: true });
    if (migrationResult && migrationResult.allSuccessful) {
        clearQueuedIdbMigration();
    }

    // お気に入りデータのID更新
    let favorites = loadFavoritesArray();
    favorites = favorites.map(oldId => oldToNewIdMap[oldId]).filter(Boolean);
    setLocalStorageSafe('akyoFavorites', JSON.stringify(favorites));

    await updateCSVFile();
    refreshDerivedCollections();

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
    let csvContent = 'ID,見た目,通称,アバター名,属性（モチーフが基準）,備考,作者（敬称略）,アバターURL\n';

    akyoData.forEach(akyo => {
        const row = [
            escapeCsvValue(akyo.id),
            escapeCsvValue(akyo.appearance),
            escapeCsvValue(akyo.nickname),
            escapeCsvValue(akyo.avatarName),
            escapeCsvValue(akyo.attribute),
            escapeCsvValue(akyo.notes),
            escapeCsvValue(akyo.creator),
            escapeCsvValue(akyo.avatarUrl)
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

// 削除済みIDの読み込みは DOMContentLoaded で済んでいる前提
// ※ 念のため最初の定義群の後ろで定義してください（attributeManagerよりは下でOK）

let adminCachedPublicR2Base = null;
function resolveAdminPublicR2Base() {
  if (adminCachedPublicR2Base !== null) return adminCachedPublicR2Base;
  let base = '';
  try {
    if (typeof window !== 'undefined' && window.PUBLIC_R2_BASE) {
      base = String(window.PUBLIC_R2_BASE || '');
    }
  } catch (_) {
    base = '';
  }
  if (base) {
    base = base.replace(/\/+$/, '');
  }
  adminCachedPublicR2Base = base;
  return adminCachedPublicR2Base;
}

window.getAkyoImageUrl = function getAkyoImageUrl(idLike, { size = 512 } = {}) {
    const id = String(idLike).padStart(3, '0');
    const ver = localStorage.getItem('akyoAssetsVersion') || '';

    // 0) ローカル最優先（DataURL or Blob URL）
    if (imageDataMap && imageDataMap[id]) return imageDataMap[id];

    // 0) 公開側で削除したIDはVRChatへフォールバック
    if (deletedRemoteIds && deletedRemoteIds.has(id)) {
      if (typeof window.getAkyoVrchatFallbackUrl === 'function') {
        const vrchatDeleted = window.getAkyoVrchatFallbackUrl(id, { size });
        if (vrchatDeleted) return vrchatDeleted;
      }
      return `images/${id}.webp${ver ? `?v=${ver}` : ''}`;
    }

    // 1) R2/GH マニフェスト（※削除済みにしていないIDのみ）
    if (window.akyoImageManifestMap && window.akyoImageManifestMap[id]) {
      // CDNキャッシュ対策にバスターを付ける（クエリが既に付いていたら &v= を追記）
      const base = window.akyoImageManifestMap[id];
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${ver ? `${sep}v=${ver}` : ''}`;
    }

    // 2) R2 直リンク（公開CDN）
    const r2Base = resolveAdminPublicR2Base();
    if (r2Base) {
      return `${r2Base}/${id}.webp${ver ? `?v=${ver}` : ''}`;
    }

    // 3) VRChat フォールバック（削除済みIDも含めて利用）
    if (typeof window.getAkyoVrchatFallbackUrl === 'function') {
      const vrchatUrl = window.getAkyoVrchatFallbackUrl(id, { size });
      if (vrchatUrl) return vrchatUrl;
    }

    // 4) 最後のフォールバック（静的）
    return `images/${id}.webp${ver ? `?v=${ver}` : ''}`;
  };





console.debug('admin.js loaded successfully');
