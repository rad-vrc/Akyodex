// 選択要素を汎用的に構築するヘルパー
function populateSelect(selectElement, options, placeholderLabel){
    if (!selectElement) return;
    selectElement.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = placeholderLabel || '選択してください';
    selectElement.appendChild(def);
    (options || []).forEach(({value, label}) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        selectElement.appendChild(opt);
    });
}

// Akyoずかん メインJavaScriptファイル

const LANGUAGE_STORAGE_KEY = 'akyoPreferredLanguage';
const LANGUAGE_CONFIG = {
    ja: {
        code: 'ja',
        htmlLang: 'ja',
        csvPath: 'data/akyo-data.csv',
        logoPath: '/images/logo.webp',
        title: 'Akyoずかん-VRChatアバター Akyo図鑑- | Akyodex-VRChat Avatar Akyo Index',
        description: 'VRChatに潜むなぞ生物アバター「Akyo」を500体以上収録した図鑑サイト。名前・作者・属性で探せる日本語対応の共有データベースで、今日からキミもAkyoファインダーの仲間入り!',
        toggleLabel: 'English',
        toggleAria: '英語版ホームページに切り替える'
    },
    en: {
        code: 'en',
        htmlLang: 'en',
        csvPath: 'data/akyo-data-US.csv',
        logoPath: '/images/logo-US.webp',
        title: 'Akyodex - VRChat Avatar Akyo Index',
        description: 'Browse more than 500 mysterious Akyo avatars from VRChat. Search by name, creator, or attributes and join the community of Akyo finders!',
        toggleLabel: '日本語',
        toggleAria: '日本語版ホームページに切り替える'
    }
};

function safeGetLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (_) {
        return null;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (_) {}
}

function detectInitialLanguage() {
    try {
        const params = new URLSearchParams(window.location.search);
        const queryLang = params.get('lang');
        if (queryLang && LANGUAGE_CONFIG[queryLang]) {
            safeSetLocalStorage(LANGUAGE_STORAGE_KEY, queryLang);
            return queryLang;
        }
    } catch (_) {}

    const stored = safeGetLocalStorage(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGE_CONFIG[stored]) {
        return stored;
    }

    try {
        const languages = navigator.languages || (navigator.language ? [navigator.language] : []);
        if (Array.isArray(languages)) {
            if (languages.some(lang => typeof lang === 'string' && lang.toLowerCase().startsWith('en-us'))) {
                return 'en';
            }
        }
    } catch (_) {}

    try {
        const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
        if (typeof tz === 'string' && tz.toLowerCase().startsWith('america/')) {
            return 'en';
        }
    } catch (_) {}

    return 'ja';
}

let currentLanguage = detectInitialLanguage();
window.akyoCurrentLanguage = currentLanguage;
updateDocumentLanguageAttributes();
updatePreferredLogoPath();

function getLanguageConfig(lang = currentLanguage) {
    return LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.ja;
}

function getCsvStorageKeyForLanguage(lang) {
    return lang === 'ja' ? 'akyoDataCSV' : `akyoDataCSV_${lang}`;
}

function getCurrentCsvStorageKey() {
    return getCsvStorageKeyForLanguage(currentLanguage);
}

function getAllCsvStorageKeys() {
    return Object.keys(LANGUAGE_CONFIG).map(getCsvStorageKeyForLanguage);
}

function getCurrentCsvPath() {
    return getLanguageConfig().csvPath;
}

function getCurrentLogoPath() {
    return getLanguageConfig().logoPath;
}

function updateDocumentLanguageAttributes(lang = currentLanguage) {
    const config = getLanguageConfig(lang);
    try {
        if (document?.documentElement) {
            document.documentElement.lang = config.htmlLang || lang;
        }
        if (config.title) {
            document.title = config.title;
        }
        if (config.description) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) {
                meta.setAttribute('content', config.description);
            }
        }
    } catch (error) {
        console.warn('Failed to update document language attributes:', error);
    }
}

function updateLanguageToggleButton() {
    const button = document.getElementById('languageToggleBtn');
    if (!button) return;
    const config = getLanguageConfig();
    button.textContent = config.toggleLabel;
    button.setAttribute('aria-label', config.toggleAria);
    button.title = config.toggleAria;
}

function updatePreferredLogoPath() {
    const logoPath = getCurrentLogoPath();
    window.akyoPreferredLogoPath = logoPath;
    const preload = document.getElementById('logoPreload');
    if (preload) {
        preload.href = logoPath;
    }
    const headerLogoEl = document.getElementById('headerLogo');
    if (headerLogoEl) {
        const img = headerLogoEl.querySelector('img');
        if (img) {
            img.src = logoPath;
            img.alt = getLanguageConfig().code === 'en' ? 'Akyodex' : 'Akyoずかん';
        }
    }
}

async function setLanguage(lang) {
    if (!LANGUAGE_CONFIG[lang] || lang === currentLanguage) return;
    currentLanguage = lang;
    window.akyoCurrentLanguage = lang;
    safeSetLocalStorage(LANGUAGE_STORAGE_KEY, lang);
    updateDocumentLanguageAttributes(lang);
    updateLanguageToggleButton();
    updatePreferredLogoPath();

    const loadingContainer = document.getElementById('loadingContainer');
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const noData = document.getElementById('noDataContainer');

    if (loadingContainer) loadingContainer.classList.remove('hidden');
    if (gridView) gridView.classList.add('hidden');
    if (listView) listView.classList.add('hidden');
    if (noData) noData.classList.add('hidden');

    try {
        await loadAkyoData();
        applyFilters();
    } catch (error) {
        console.error('Failed to reload data for language change:', error);
    }
}

try {
    window.setAkyoLanguage = setLanguage;
} catch (_) {}

// グローバル変数
// 閲覧用データ（命名: publicAkyoList）
let akyoData = [];
window.publicAkyoList = akyoData;
let filteredData = [];
let searchIndex = []; // { id, text }
function loadFavoritesFromStorage() {
    try {
        const raw = localStorage.getItem('akyoFavorites');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse favorites from localStorage. Resetting storage.', error);
        try { localStorage.removeItem('akyoFavorites'); } catch (_) {}
        return [];
    }
}

let favorites = loadFavoritesFromStorage();
let serverCsvRowCount = 0; // /api/csv が返す期待行数（ヘッダで受け取り）
// 行末ダングリング引用符などの単純な破損を自動修復
function sanitizeCsvText(text){
    try{
        const lines = String(text).split(/\r?\n/);
        const out = [];
        for (let i=0;i<lines.length;i++){
            let line = lines[i];
            if (line == null) { out.push(''); continue; }
            // 末尾CR除去
            if (line.endsWith('\r')) line = line.slice(0, -1);
            // 外側の不整合な引用符の暫定修復：先頭と末尾のダブルクオートが奇数なら末尾に補完
            const dqCount = (line.match(/\"/g) || []).length;
            if (dqCount % 2 === 1) {
                line += '"';
            }
            out.push(line);
        }
        return out.join('\n');
    }catch(_){ return text; }
}
let currentView = 'grid';
let favoritesOnlyMode = false; // お気に入りのみ表示トグル
let randomMode = false;        // ランダム表示（現在の絞り込みから抽出）
let sortOrder = 'asc';         // 昇順/降順の切り替え
let currentSearchTerms = [];
let imageDataMap = {}; // 画像データの格納
// --- remote削除印（R2/GHを消したID）を localStorage から読む ---
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
// 初期ロード & 他タブ同期
try { loadDeletedRemoteIds(); } catch (_) {}
window.addEventListener('storage', (e) => {
  if (e.key === 'akyo:deletedRemoteIds') loadDeletedRemoteIds();
});

// 画像マニフェスト（R2/GHの公開URL）も見にいく
// （functions が window.akyoImageManifestMap を用意している前提）
const manifestRef = () => (window.akyoImageManifestMap || {});

let cachedPublicR2Base = null;
function resolvePublicR2Base() {
    if (cachedPublicR2Base !== null) return cachedPublicR2Base;
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
    cachedPublicR2Base = base;
    return cachedPublicR2Base;
}

let profileIconCache = { resolved: false, url: null };
const gridCardCache = new Map();
const listRowCache = new Map();
const idCollator = new Intl.Collator(undefined, { numeric: true });

// パフォーマンス最適化: 初期レンダリング件数を制限し、スクロールで段階的に追加
const INITIAL_RENDER_COUNT = 60;
const RENDER_CHUNK = 60;
let renderLimit = INITIAL_RENDER_COUNT;
// ← ここまでがグローバル変数群
let tickingScroll = false;

/* === HOTFIX: buildSearchIndex の復活・固定（ここから貼り付け） === */
if (typeof buildSearchIndex !== 'function') {
  // normalizeForSearch が未定義でも動く最小版を同梱
  if (typeof normalizeForSearch !== 'function') {
    function normalizeForSearch(input) {
      if (!input) return '';
      return String(input)
        .toLowerCase()
        .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全角→半角
        .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))   // ｶﾅ→ひらがな
        .replace(/[\s\u3000]+/g, ' ')
        .trim();
    }
  }

  var buildSearchIndex = function () {
    try {
      // searchIndex / akyoData は既存のグローバルを利用
      searchIndex = (akyoData || []).map(a => {
        const text = [a.id, a.nickname, a.avatarName, a.attribute, a.creator, a.notes]
          .map(normalizeForSearch)
          .join(' ');
        return { id: a.id, text };
      });
    } catch (e) {
      console.error('buildSearchIndex failed:', e);
      searchIndex = [];
    }
  };

  if (typeof window !== 'undefined') window.buildSearchIndex = buildSearchIndex;
}
/* === HOTFIX: ここまで === */

// （この下に続く既存の関数たち：escapeHTML, sanitizeUrl, ...）


function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}

function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';

    try {
        const parsed = new URL(trimmed, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (_) {}

    return '';
}

function sanitizeImageSource(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        return trimmed;
    }

    try {
        const parsed = new URL(trimmed, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (_) {
        if (trimmed.startsWith('/') || /^[A-Za-z0-9_./-]+$/.test(trimmed)) {
            return trimmed;
        }
    }

    return '';
}

const DEFAULT_PROFILE_ICON_DATA_URL = (() => {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
            <defs>
                <linearGradient id="akyoProfileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a855f7" />
                    <stop offset="100%" stop-color="#6366f1" />
                </linearGradient>
            </defs>
            <rect x="8" y="8" width="112" height="112" rx="32" fill="url(#akyoProfileGradient)" />
            <circle cx="64" cy="48" r="24" fill="rgba(255, 255, 255, 0.85)" />
            <path d="M64 76c-24 0-36 12-36 24v8h72v-8c0-12-12-24-36-24z" fill="rgba(255, 255, 255, 0.9)" />
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
})();

function getDefaultProfileIconDataUrl() {
    return DEFAULT_PROFILE_ICON_DATA_URL;
}

function computeAkyoRenderState(akyo) {
    const nickname = akyo.nickname || '';
    const avatarName = akyo.avatarName || '';
    const displayName = nickname || avatarName || '';
    const attributeRaw = akyo.attribute || '';
    const attributes = extractAttributes(attributeRaw);
    const attributeColor = getAttributeColor(attributeRaw);
    const creator = akyo.creator || '';
    const imageUrl = resolveAkyoImageUrl(akyo.id);
    const signature = [
        akyo.id,
        displayName,
        avatarName,
        attributeRaw,
        creator,
        akyo.isFavorite ? '1' : '0',
        imageUrl || ''
    ].join('|');

    return {
        id: akyo.id,
        nickname,
        avatarName,
        displayName,
        attributes,
        attributeRaw,
        attributeColor,
        creator,
        isFavorite: !!akyo.isFavorite,
        imageUrl,
        signature
    };
}

function extractAttributes(attributeString) {
    return (attributeString || '')
        .split(/[,、]/)
        .map(attr => attr.trim())
        .filter(Boolean);
}

function extractCreators(creatorString) {
    return (creatorString || '')
        .split(/[\/／＆&]/)
        .map(name => name.trim())
        .filter(Boolean);
}

// 表示用の属性名変換
function displayAttributeName(attr) {
    if (!attr) return '';
    return attr === '未分類' ? '未分類(まだ追加されてないよ！もう少し待っててね！)' : attr;
}

function appendVersionQuery(url, versionValue) {
    if (!url) return '';
    if (!versionValue) return String(url);
    const str = String(url);
    if (/[?&]v=/.test(str)) return str;
    return `${str}${str.includes('?') ? '&' : '?'}v=${encodeURIComponent(versionValue)}`;
}

function resolveAkyoImageUrl(akyoId, { size = 512 } = {}) {
    const id3 = String(akyoId).padStart(3, '0');
    const versionValue = localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '';

    // 1) R2/GH マニフェスト（削除印が付いていたら使わない）
    const manifestMap = manifestRef();
    const manifestEntry = manifestMap[id3];
    if (manifestEntry && !deletedRemoteIds.has(id3)) {
      return appendVersionQuery(manifestEntry, versionValue);
    }

    // 2) R2 直リンク（公開CDN）
    if (!deletedRemoteIds.has(id3)) {
        const r2Base = resolvePublicR2Base();
        if (r2Base) {
            return appendVersionQuery(`${r2Base}/${id3}.webp`, versionValue);
        }
    }

    // 3) VRChat 直リンク（CSVの avatarUrl に avtr_... があれば）
    try {
      if (typeof window !== 'undefined' && typeof window.getAkyoVrchatFallbackUrl === 'function') {
        const fallback = window.getAkyoVrchatFallbackUrl(id3, { size });
        if (fallback) {
          return appendVersionQuery(fallback, versionValue);
        }
      }
    } catch (_) {}

    // 4) ユーザーのローカル保存（IndexedDB / localStorage）
    const local = sanitizeImageSource(imageDataMap[id3]);
    if (local) return local;

    // 5) 静的フォールバック（存在しない場合は <img onerror> 側でプレースホルダ）

    return appendVersionQuery(`/images/${id3}.webp`, versionValue);
  }


async function resolveProfileIcon() {
    if (profileIconCache.resolved) {
        return profileIconCache.url;
    }

    let profileIcon = null;

    try {
        const version = localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '1';
        const candidates = [
            `images/profileIcon.webp?v=${encodeURIComponent(version)}`,
            `images/profileIcon.png?v=${encodeURIComponent(version)}`,
            `images/profileIcon.jpg?v=${encodeURIComponent(version)}`
        ];

        for (const candidate of candidates) {
            try {
                const response = await fetch(candidate, { cache: 'no-cache' });
                if (response.ok) {
                    profileIcon = candidate;
                    break;
                }
            } catch (error) {
                console.warn('Failed to fetch profile icon candidate:', candidate, error);
            }
        }

        if (!profileIcon && window.storageManager && window.storageManager.isIndexedDBAvailable) {
            try {
                await window.storageManager.init();
                const storedIcon = await window.storageManager.getImage('profileIcon');
                if (storedIcon) {
                    profileIcon = storedIcon;
                }
            } catch (error) {
                console.warn('Failed to load profile icon from storageManager:', error);
            }
        }

        if (!profileIcon) {
            const localIcon = localStorage.getItem('akyoProfileIcon');
            if (localIcon) {
                profileIcon = localIcon;
            }
        }
    } catch (error) {
        console.error('Error while resolving profile icon:', error);
    }

    const sanitizedIcon = sanitizeImageSource(profileIcon);
    profileIconCache = {
        resolved: true,
        url: sanitizedIcon || getDefaultProfileIconDataUrl()
    };
    return profileIconCache.url;
}

// 画像データの読み込み関数
async function loadImageData() {
    console.debug('Loading image data...');
    try {
        // StorageManagerが初期化されるまで待機
        let attempts = 0;
        while (!window.storageManager && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.storageManager && attempts >= 50) {
            console.debug('StorageManager did not become available within expected time. Falling back.');
        }

        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            // IndexedDBから読み込み
            console.debug('Loading from IndexedDB...');
            await window.storageManager.init();
            imageDataMap = await window.storageManager.getAllImages();
            console.debug(`Loaded ${Object.keys(imageDataMap).length} images from IndexedDB`);

            // IndexedDBが空の場合、LocalStorageも確認
            if (Object.keys(imageDataMap).length === 0) {
                const savedImages = localStorage.getItem('akyoImages');
                if (savedImages) {
                    try {
                        const localImages = JSON.parse(savedImages);
                        console.debug(`Found ${Object.keys(localImages).length} images in LocalStorage`);
                        imageDataMap = localImages;
                    } catch (e) {
                        console.error('Failed to parse LocalStorage data:', e);
                    }
                }
            }
        } else {
            // フォールバック: LocalStorageから読み込み
            console.debug('StorageManager not available, loading from LocalStorage...');
            const savedImages = localStorage.getItem('akyoImages');
            if (savedImages) {
                imageDataMap = JSON.parse(savedImages);
                console.debug(`Loaded ${Object.keys(imageDataMap).length} images from localStorage`);
            }
        }

        console.debug('Image data loaded. Total images:', Object.keys(imageDataMap).length);

    } catch (error) {
        console.error('Failed to load images:', error);
        imageDataMap = {};
    }
}

// DOMコンテンツ読み込み完了後の処理
document.addEventListener('DOMContentLoaded', async () => {
    console.debug('Akyoずかんを初期化中...');

    // イベントリスナーの設定を最初に実行（UIの応答性向上）
    setupEventListeners();

    // 初期表示を先に実行（ローディング表示など）
    document.getElementById('noDataContainer').classList.remove('hidden');

    // LocalStorageのCSV更新を別タブから検知して自動反映
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        const csvKeys = getAllCsvStorageKeys();
        if (csvKeys.includes(e.key) || e.key === 'akyoDataVersion') {
            console.debug('Data changed in another tab. Reloading data...');
            loadAkyoData().then(applyFilters).catch(err => console.error(err));
        }
    });

    // タブ復帰時にも最新反映（エラーはトースト通知＋再試行）
    window.addEventListener('focus', () => {
        loadAkyoData()
            .then(applyFilters)
            .catch(() => {
                showToast('最新データの取得に失敗しました。再試行してください。', 'warning', () => {
                    loadAkyoData().then(applyFilters).catch(() => {});
                });
            });
    });

    const manifestPromise = (async () => {
        if (typeof window.loadAkyoManifest !== 'function') {
            return true;
        }
        try {
            await window.loadAkyoManifest();
            return true;
        } catch (error) {
            console.error('画像マニフェストの読み込みに失敗しました:', error);
            throw error;
        }
    })();

    // 非同期でデータ読み込み（部分成功を許容）
    Promise.allSettled([
        manifestPromise,
        // 旧データクリア（非ブロッキング）
        (async () => {
            try {
                localStorage.removeItem('akyoLogo');
                localStorage.removeItem('akyoHeaderImage');
                localStorage.removeItem('headerImage');

                if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                    await window.storageManager.init();
                    // 削除は非同期で実行（待たない）
                    window.storageManager.deleteImage('logo').catch(() => {});
                    window.storageManager.deleteImage('headerImage').catch(() => {});
                    window.storageManager.deleteImage('akyoHeaderImage').catch(() => {});
                }
            } catch (error) {}
        })(),

        // 画像データ読み込み
        loadImageData(),

        // CSVデータ読み込み
        loadAkyoData()
    ]).then((results) => {
        const hasSuccess = results.some(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected').length;
        if (failures > 0) {
            showToast('一部の読み込みに失敗しました。ページを更新するか再試行してください。', 'warning', () => location.reload());
        }
        // CSV失敗時はapplyFiltersを走らせない
        const csvResult = results[3] || results[2];
        const csvOk = csvResult && csvResult.status === 'fulfilled';
        if (hasSuccess && csvOk) {
            applyFilters();
            // deeplink対応: ?id=NNN で詳細を開く＋canonical更新
            try {
                const q = new URLSearchParams(location.search);
                const deepId = q.get('id');
                if (deepId && /^\d{3}$/.test(deepId)) {
                    showDetail(deepId);
                    const link = document.getElementById('canonicalLink');
                    if (link) link.href = `${location.origin}/index.html?id=${deepId}`;
                    history.replaceState(null, '', `?id=${deepId}`);
                }
            } catch(_) {}
        } else {
            // 詳細なエラーパネル（loadAkyoDataのcatchで描画済み）を保持するため、ここではトーストのみ表示
            showToast('初期化に失敗しました。再読み込みしますか？', 'error', () => location.reload());
        }
    });

    // スクロールで段階的に追加ロード
    window.addEventListener('scroll', () => {
        if (tickingScroll) return;
        tickingScroll = true;
        requestAnimationFrame(() => {
            const nearBottom = (window.innerHeight + window.scrollY) > (document.body.offsetHeight - 800);
            if (nearBottom && renderLimit < filteredData.length) {
                renderLimit = Math.min(filteredData.length, renderLimit + RENDER_CHUNK);
                updateDisplay();
            }
            tickingScroll = false;
        });
    }, { passive: true });
});

// CSVデータの読み込みと解析
async function loadAkyoData() {
    try {
        console.debug('CSVデータを読み込み中...');

        // ネットワーク優先（バージョン付与＋no-cache）。失敗時のみローカルにフォールバック
        const ver = safeGetLocalStorage('akyoDataVersion') || safeGetLocalStorage('akyoAssetsVersion') || String(Date.now());
        const storageKey = getCurrentCsvStorageKey();
        const csvPath = getCurrentCsvPath();
        let csvText;
        let loadedFromNetwork = false;

        if (currentLanguage === 'ja') {
            try {
                const response = await fetch(`/api/csv?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                if (!response.ok) throw new Error(`api/csv failed: ${response.status}`);
                const headerRowCount = response.headers.get('x-akyo-row-count');
                if (headerRowCount) {
                    serverCsvRowCount = parseInt(headerRowCount, 10) || 0;
                    console.debug('server row count header:', serverCsvRowCount);
                }
                csvText = await response.text();
                loadedFromNetwork = true;
                try {
                    if (safeGetLocalStorage(storageKey)) {
                        localStorage.removeItem(storageKey);
                    }
                } catch (_) {}
            } catch (_) {
                // フォールバック1: 直リンクCSVをno-cacheで
                try {
                    const fallback = await fetch(`${csvPath}?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                    if (!fallback.ok) throw new Error(`fallback csv failed: ${fallback.status}`);
                    csvText = await fallback.text();
                    loadedFromNetwork = true;
                } catch (__) {
                    // フォールバック2: ローカル保存（最終手段）
                    const updatedCSV = safeGetLocalStorage(storageKey);
                    if (updatedCSV) {
                        console.debug('ネットワーク失敗のためLocalStorageから読み込み');
                        csvText = updatedCSV;
                    } else {
                        throw new Error('CSV取得に失敗しました（ネットワーク/ローカル保存なし）');
                    }
                }
            }
        } else {
            try {
                const fallback = await fetch(`${csvPath}?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                if (!fallback.ok) throw new Error(`fallback csv failed: ${fallback.status}`);
                csvText = await fallback.text();
                loadedFromNetwork = true;
            } catch (_) {
                const updatedCSV = safeGetLocalStorage(storageKey);
                if (updatedCSV) {
                    console.debug('ネットワーク失敗のためLocalStorageから読み込み');
                    csvText = updatedCSV;
                } else {
                    throw new Error('CSV取得に失敗しました（ネットワーク/ローカル保存なし）');
                }
            }
        }

        if (loadedFromNetwork && typeof csvText === 'string' && currentLanguage !== 'ja') {
            safeSetLocalStorage(storageKey, csvText);
        }

        console.debug('CSVデータ取得完了:', csvText.length, 'bytes');

        // 速報対処: 行ごとの引用符不整合を自動修復（奇数個の行末に閉じ"を補う）
        csvText = sanitizeCsvText(csvText);

        // CSV解析
        akyoData = parseCSV(csvText);
    window.publicAkyoList = akyoData;
        gridCardCache.clear();
        listRowCache.clear();

        if (!akyoData || akyoData.length === 0) {
            throw new Error('CSVデータが空です');
        }

        filteredData = [...akyoData];
(
  (typeof window !== 'undefined' && typeof window.buildSearchIndex === 'function') ? window.buildSearchIndex :
  (typeof buildSearchIndex === 'function') ? buildSearchIndex : null
)?.();


        console.debug(`${akyoData.length}種類のAKyoを読み込みました`);

        // 属性・作者リストの作成
        createAttributeFilter();
        createCreatorFilter();

        // 画像データの再確認
        console.debug('Current imageDataMap size:', Object.keys(imageDataMap).length);
        if (Object.keys(imageDataMap).length === 0) {
            console.debug('imageDataMap is empty, reloading...');
            await loadImageData();
        }

        // 統計情報の更新
        updateStatistics();

        // ローディング非表示
        document.getElementById('loadingContainer').classList.add('hidden');
        document.getElementById('gridView').classList.remove('hidden');

    } catch (error) {
        console.error('データ読み込みエラー:', error);
        // エラー表示
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            loadingContainer.innerHTML = `
                <div class="text-red-600 text-center">
                    <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                    <p class="text-xl font-bold">データの読み込みに失敗しました</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
        // 呼び出し元へ伝播して全体フローを止める
        throw error;
    }
}

// CSV解析関数
function parseCSV(csvText) {
    const rows = [];
    let currentField = '';
    let currentRow = [];
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (char === '"') {
            const prev = csvText[i - 1];
            const next = csvText[i + 1];
            // ダブルクオートのエスケープ（"" -> ")
            if (inQuotes && next === '"') {
                currentField += '"';
                i++;
            } else if (!inQuotes && prev && prev !== ',' && prev !== '\n' && prev !== '\r') {
                // 非正規な場所のダブルクオートは文字として扱う
                currentField += '"';
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && csvText[i + 1] === '\n') {
                i++;
            }
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    // ヘッダー行を除外（壊れていても1行目はヘッダとみなす）
    if (rows.length) rows.shift();

    const data = [];

    rows.forEach(values => {
        if (!values || values.length === 0 || values.every(value => !value || value.trim() === '')) {
            return;
        }

        // フィールドの外側ダブルクオートのみ除去（両端がダブルクオートで囲まれている場合）
        const normalized = values.map(value => {
            const v = (value || '').replace(/\r/g, '');
            if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
                return v.slice(1, -1);
            }
            return v.trim();
        });

        if (normalized[0] && normalized[0].match(/^\d{3}/)) {
            let [id = '', appearance = '', nickname = '', avatarName = ''] = normalized;
            let attribute = '';
            let notes = '';
            let creator = '';
            let avatarUrl = '';

            if (normalized.length === 8) {
                attribute = normalized[4] || '未分類';
                notes = normalized[5] || '';
                creator = normalized[6] || '不明';
                avatarUrl = normalized[7] || '';
            } else if (normalized.length > 8) {
                avatarUrl = normalized[normalized.length - 1] || '';
                creator = normalized[normalized.length - 2] || '不明';
                attribute = normalized[4] || '未分類';
                notes = normalized.slice(5, normalized.length - 2).join(',');
            } else {
                // 不足列は空で埋める（行崩れの暫定救済）
                attribute = normalized[4] || '未分類';
                notes = normalized[5] || '';
                creator = normalized[6] || '不明';
                avatarUrl = normalized[7] || '';
            }

            const akyo = {
                id,
                appearance,
                nickname,
                avatarName,
                attribute,
                notes,
                creator,
                avatarUrl,
                isFavorite: favorites.includes(id)
            };
            data.push(akyo);
        }
    });

    return data;
}

// 属性フィルターの作成
function createAttributeFilter() {
    const attributeSet = new Set();
    akyoData.forEach(akyo => {
        extractAttributes(akyo.attribute).forEach(attr => attributeSet.add(attr));
    });

    const select = document.getElementById('attributeFilter');
    populateSelect(select, Array.from(attributeSet).sort((a,b)=>a.localeCompare(b,'ja')).map(v => ({ value: v, label: displayAttributeName(v) })), 'すべての属性');
}

function createCreatorFilter() {
    const creatorSet = new Set();
    akyoData.forEach(akyo => {
        extractCreators(akyo.creator).forEach(name => creatorSet.add(name));
    });

    const select = document.getElementById('creatorFilter');
    if (!select) return;

    const options = Array.from(creatorSet).sort((a,b)=>a.localeCompare(b,'ja')).map(v => ({ value: v, label: v }));
    populateSelect(select, options, 'すべての作者');
}

// イベントリスナーの設定
function setupEventListeners() {
    // 検索ボックス
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // 属性・作者フィルター
    const attributeFilter = document.getElementById('attributeFilter');
    if (attributeFilter) {
        attributeFilter.addEventListener('change', handleAttributeFilter);
    }

    const creatorFilter = document.getElementById('creatorFilter');
    if (creatorFilter) {
        creatorFilter.addEventListener('change', handleCreatorFilter);
    }

    // ビュー切り替え
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));

    // クイックフィルター
    const sortToggleBtn = document.getElementById('sortToggleBtn');
    if (sortToggleBtn) {
        sortToggleBtn.addEventListener('click', () => {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            updateQuickFilterStyles();
            applyFilters();
        });
    }

    const randomToggleBtn = document.getElementById('randomToggleBtn');
    if (randomToggleBtn) {
        randomToggleBtn.addEventListener('click', () => {
            randomMode = !randomMode;
            updateQuickFilterStyles();
            applyFilters();
        });
    }

    const favoritesToggleBtn = document.getElementById('favoritesToggleBtn');
    if (favoritesToggleBtn) {
        favoritesToggleBtn.addEventListener('click', () => {
            favoritesOnlyMode = !favoritesOnlyMode;
            updateQuickFilterStyles();
            applyFilters();
        });
    }

    updateQuickFilterStyles();

    // 言語切り替え・管理者ボタンを追加
    const floatingContainer = document.createElement('div');
    floatingContainer.className = 'fixed bottom-4 right-4 flex flex-col items-end gap-3 z-50';

    const languageBtn = document.createElement('button');
    languageBtn.id = 'languageToggleBtn';
    languageBtn.className = 'bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-400 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-200';
    const initialConfig = getLanguageConfig();
    languageBtn.textContent = initialConfig.toggleLabel;
    languageBtn.setAttribute('aria-label', initialConfig.toggleAria);
    languageBtn.title = initialConfig.toggleAria;
    languageBtn.addEventListener('click', () => {
        const nextLanguage = currentLanguage === 'ja' ? 'en' : 'ja';
        setLanguage(nextLanguage);
    });
    floatingContainer.appendChild(languageBtn);

    const adminBtn = document.createElement('button');
    adminBtn.className = 'bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i>';
    adminBtn.title = 'ファインダーモード';
    adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
    floatingContainer.appendChild(adminBtn);

    document.body.appendChild(floatingContainer);
    updateLanguageToggleButton();

    // モーダルクローズ
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    const detailModal = document.getElementById('detailModal');
    // モーダルの外側クリック/ESCで閉じる（重複防止フラグ）
    if (detailModal && !detailModal.dataset.outsideCloseInitialized) {
        const isEventInsideModal = (event) => {
            const modalContentContainer = detailModal.querySelector('[data-modal-content]');
            return modalContentContainer ? modalContentContainer.contains(event.target) : false;
        };

        const handlePointerDownOutsideModal = (event) => {
            if (detailModal.classList.contains('hidden')) return;
            if (!isEventInsideModal(event)) {
                closeModal();
            }
        };

        const outsideCloseEvents = window.PointerEvent ? ['pointerdown'] : ['mousedown', 'touchstart'];
        outsideCloseEvents.forEach((eventName) => {
            document.addEventListener(eventName, handlePointerDownOutsideModal, true);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !detailModal.classList.contains('hidden')) {
                closeModal();
            }
        });

        detailModal.dataset.outsideCloseInitialized = 'true';
    }

    }

// 正規化（ひらがな/カタカナ/全角半角）
// 検索用の正規化（既にあるはず。無ければ併せて置いてください）
function normalizeForSearch(input) {
    if (!input) return '';
    const s = String(input)
      .toLowerCase()
      .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全角英数→半角
      .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))   // カタカナ→ひらがな
      .replace(/[\s\u3000]+/g, ' ')
      .trim();
    return s;
  }

  // ★ これを main.js に追加（または復活）してください
  function buildSearchIndex() {
    // searchIndex はグローバルのままでOK（ let searchIndex = [] が上にある前提 ）
    searchIndex = akyoData.map(a => {
      const text = [a.id, a.nickname, a.avatarName, a.attribute, a.creator, a.notes]
        .map(normalizeForSearch)
        .join(' ');
      return { id: a.id, text };
    });
  }

  // どこからでも呼べるように（任意）
  if (typeof window !== 'undefined') {
    window.buildSearchIndex = buildSearchIndex;
  }


// 検索処理
function handleSearch() {
    const raw = (document.getElementById('searchInput').value || '');
    const query = normalizeForSearch(raw);
    currentSearchTerms = query ? query.split(' ').filter(Boolean) : [];

    applyFilters();
}

// 属性フィルター処理
function handleAttributeFilter() {
    applyFilters();
}

function handleCreatorFilter() {
    applyFilters();
}

function applyFilters() {
    const attributeSelect = document.getElementById('attributeFilter');
    const creatorSelect = document.getElementById('creatorFilter');

    const selectedAttribute = attributeSelect ? attributeSelect.value : '';
    const selectedCreator = creatorSelect ? creatorSelect.value : '';

    let data = [...akyoData];

    if (selectedAttribute) {
        data = data.filter(akyo => {
            const attributes = extractAttributes(akyo.attribute);
            return attributes.includes(selectedAttribute);
        });
    }

    if (selectedCreator) {
        data = data.filter(akyo => {
            const creators = extractCreators(akyo.creator);
            return creators.includes(selectedCreator);
        });
    }

    // お気に入りのみモード
    if (favoritesOnlyMode) {
        data = data.filter(akyo => akyo.isFavorite);
    }

    // 並び順を適用
    const comparator = sortOrder === 'asc'
        ? (a, b) => idCollator.compare(a.id, b.id)
        : (a, b) => idCollator.compare(b.id, a.id);
    data.sort(comparator);

    // 検索語が無ければそのまま、あればスコアリング
    let result;
    if (!currentSearchTerms.length) {
        result = data;
    } else {
        const filteredIds = new Set(data.map(akyo => akyo.id));
        const idToAkyo = new Map(data.map(akyo => [akyo.id, akyo]));

        const scored = searchIndex
            .filter(row => filteredIds.has(row.id))
            .map(row => {
                let score = 0;
                for (const term of currentSearchTerms) {
                    const idx = row.text.indexOf(term);
                    if (idx >= 0) {
                        score += 5 + Math.max(0, 20 - idx / 10);
                    } else {
                        return null;
                    }
                }
                return { id: row.id, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

        result = scored
            .map(({ id }) => idToAkyo.get(id))
            .filter(Boolean);
    }

    // ランダムモード: 現在の絞り込み結果から20件を抽出
    if (randomMode) {
        const pool = [...result];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        result = pool.slice(0, 20);
    }

    filteredData = result;

    // フィルタ変更時にレンダー上限をリセット
    renderLimit = INITIAL_RENDER_COUNT;
    updateDisplay();
}

// クイックフィルターのスタイル更新（無効時はランダムの無効色に合わせる）
function updateQuickFilterStyles() {
    const sortBtn = document.getElementById('sortToggleBtn');
    const randomBtn = document.getElementById('randomToggleBtn');
    const favoriteBtn = document.getElementById('favoritesToggleBtn');

    if (sortBtn) {
        if (sortOrder === 'asc') {
            sortBtn.className = 'attribute-badge quick-filter-badge bg-green-200 text-green-800 hover:bg-green-300 transition-colors';
            sortBtn.innerHTML = '<i class="fas fa-arrow-up-1-9"></i> 昇順';
        } else {
            sortBtn.className = 'attribute-badge quick-filter-badge bg-blue-200 text-blue-800 hover:bg-blue-300 transition-colors';
            sortBtn.innerHTML = '<i class="fas fa-arrow-down-9-1"></i> 降順';
        }
    }

    if (randomBtn) {
        randomBtn.className = randomMode
            ? 'attribute-badge quick-filter-badge bg-yellow-200 text-yellow-800 hover:bg-yellow-300 transition-colors'
            : 'attribute-badge quick-filter-badge bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors';
        randomBtn.innerHTML = '<i class="fas fa-dice"></i> ランダム表示';
    }

    if (favoriteBtn) {
        favoriteBtn.className = favoritesOnlyMode
            ? 'attribute-badge quick-filter-badge bg-yellow-200 text-yellow-800 hover:bg-yellow-300 transition-colors'
            : 'attribute-badge quick-filter-badge bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors';
        favoriteBtn.innerHTML = '<i class="fas fa-star"></i> お気に入りのみ';
    }
}

// ランダム表示
function showRandom() {
    randomMode = !randomMode;
    updateQuickFilterStyles();
    applyFilters();
}

// お気に入り表示
function showFavorites() {
    filteredData = akyoData.filter(akyo => akyo.isFavorite);
    updateDisplay();
}



// ビュー切り替え
function switchView(view) {
    currentView = view;

    if (view === 'grid') {
        document.getElementById('gridView').classList.remove('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('gridViewBtn').className = 'inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-purple-500 text-white rounded-xl';
        document.getElementById('listViewBtn').className = 'inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gray-300 text-gray-600 rounded-xl';
    } else {
        document.getElementById('gridView').classList.add('hidden');
        document.getElementById('listView').classList.remove('hidden');
        document.getElementById('gridViewBtn').className = 'inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gray-300 text-gray-600 rounded-xl';
        document.getElementById('listViewBtn').className = 'inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-purple-500 text-white rounded-xl';
    }

    updateDisplay();
}

// 表示更新
function updateDisplay() {
    updateStatistics();

    const noData = filteredData.length === 0;
    const noDataEl = document.getElementById('noDataContainer');
    const gridEl = document.getElementById('gridView');
    const listEl = document.getElementById('listView');

    if (noData) {
        noDataEl.classList.remove('hidden');
        gridEl.classList.add('hidden');
        listEl.classList.add('hidden');
        return;
    } else {
        // 一度非表示にした要素を復帰させる
        noDataEl.classList.add('hidden');
        if (currentView === 'grid') {
            gridEl.classList.remove('hidden');
            listEl.classList.add('hidden');
        } else {
            gridEl.classList.add('hidden');
            listEl.classList.remove('hidden');
        }
    }

    // レンダリング上限を適用
    if (currentView === 'grid') {
        renderGridView();
    } else {
        renderListView();
    }
}

// グリッドビューのレンダリング
function renderGridView() {
    const grid = document.getElementById('akyoGrid');
    const fragment = document.createDocumentFragment();

    const slice = filteredData.slice(0, renderLimit);
    slice.forEach(akyo => {
        const state = computeAkyoRenderState(akyo);
        let card = gridCardCache.get(state.id);
        if (!card) {
            card = createAkyoCard(state);
            gridCardCache.set(state.id, card);
        } else {
            updateAkyoCard(card, state);
        }
        fragment.appendChild(card);
    });

    grid.replaceChildren(fragment);
}

function createAkyoCard(state) {
    const card = document.createElement('div');
    card.className = 'akyo-card bg-white rounded-xl shadow-lg overflow-hidden';
    card.dataset.akyoId = state.id;

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'relative akyo-media';
    const mediaContent = document.createElement('div');
    mediaContent.className = 'akyo-media-content';
    mediaWrapper.appendChild(mediaContent);

    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'absolute top-2 right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform';
    favoriteButton.addEventListener('click', () => toggleFavorite(state.id));
    const favoriteIcon = document.createElement('i');
    favoriteIcon.dataset.favoriteIcon = 'grid';
    favoriteButton.appendChild(favoriteIcon);
    mediaWrapper.appendChild(favoriteButton);

    card.appendChild(mediaWrapper);

    const content = document.createElement('div');
    content.className = 'p-4';

    const idWrapper = document.createElement('div');
    idWrapper.className = 'flex items-center justify-between mb-2';
    const idLabel = document.createElement('span');
    idLabel.className = 'text-sm font-bold text-gray-500 akyo-id-label';
    idWrapper.appendChild(idLabel);
    content.appendChild(idWrapper);

    const title = document.createElement('h3');
    title.className = 'font-bold text-lg mb-1 text-gray-800 akyo-title';
    content.appendChild(title);

    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'flex flex-wrap gap-1 mb-2 akyo-attribute-container';
    content.appendChild(badgeContainer);

    const creator = document.createElement('p');
    creator.className = 'text-xs text-gray-600 mb-2 akyo-creator whitespace-pre-line';
    content.appendChild(creator);

    const detailButton = document.createElement('button');
    detailButton.className = 'detail-button w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white py-3 rounded-2xl hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-bold text-lg shadow-lg hover:shadow-xl relative overflow-hidden';
    detailButton.innerHTML = `
                <span class="relative z-10 flex items-center justify-center whitespace-nowrap">
                    <span class="text-2xl mr-2 hidden sm:inline animate-bounce">🌟</span>
                    <span class="inline-flex items-center">
                        <span>くわしく見る</span>
                    </span>
                    <span class="text-2xl ml-2 hidden sm:inline animate-bounce" style="animation-delay: 0.2s">🌟</span>
                </span>
                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
    `;
    detailButton.addEventListener('click', () => showDetail(state.id));
    content.appendChild(detailButton);

    card.appendChild(content);

    updateAkyoCard(card, state);

    return card;
}

function updateAkyoCard(card, state) {
    if (card.dataset.akyoSignature === state.signature) {
        return;
    }

    card.dataset.akyoSignature = state.signature;
    card.dataset.akyoId = state.id;

    const idLabel = card.querySelector('.akyo-id-label');
    if (idLabel) {
        idLabel.textContent = `#${state.id}`;
    }

    const title = card.querySelector('.akyo-title');
    if (title) {
        title.textContent = state.displayName;
    }

    const badgeContainer = card.querySelector('.akyo-attribute-container');
    if (badgeContainer) {
        badgeContainer.textContent = '';
        state.attributes.forEach(attr => {
            const badge = document.createElement('span');
            badge.className = 'attribute-badge text-xs';
            const color = getAttributeColor(attr);
            badge.style.background = `${color}20`;
            badge.style.color = color;
            badge.textContent = displayAttributeName(attr);
            badgeContainer.appendChild(badge);
        });
    }

    const creator = card.querySelector('.akyo-creator');
    if (creator) {
        let creatorText = `作者: ${state.creator}`;
        if (state.avatarName && state.avatarName !== state.displayName) {
            creatorText = `アバター名: ${state.avatarName}\n${creatorText}`;
        }
        creator.textContent = creatorText;
    }

    const favoriteIcon = card.querySelector('[data-favorite-icon="grid"]');
    if (favoriteIcon) {
        favoriteIcon.className = `fas fa-heart ${state.isFavorite ? 'text-red-500' : 'text-gray-300'}`;
    }

    const mediaContent = card.querySelector('.akyo-media-content');
    if (mediaContent) {
        mediaContent.textContent = '';
        if (state.imageUrl) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'h-48 overflow-hidden bg-gray-100';
            const img = document.createElement('img');
            img.src = state.imageUrl;
            img.alt = state.displayName;
            img.className = 'w-full h-full object-cover';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.fetchPriority = 'low';
            img.addEventListener('error', () => handleImageError(img, state.id, state.attributeColor, 'card'));
            imageContainer.appendChild(img);
            mediaContent.appendChild(imageContainer);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'akyo-image-placeholder h-48';
            placeholder.style.background = state.attributeColor;
            const placeholderText = document.createElement('span');
            placeholderText.className = 'text-4xl';
            placeholderText.textContent = state.id;
            placeholder.appendChild(placeholderText);
            mediaContent.appendChild(placeholder);
        }
    }
}

function renderListView() {
    const list = document.getElementById('akyoList');
    const fragment = document.createDocumentFragment();

    const slice = filteredData.slice(0, renderLimit);
    slice.forEach(akyo => {
        const state = computeAkyoRenderState(akyo);
        let row = listRowCache.get(state.id);
        if (!row) {
            row = createListRow(state);
            listRowCache.set(state.id, row);
        } else {
            updateListRow(row, state);
        }
        fragment.appendChild(row);
    });

    list.replaceChildren(fragment);
}

function createListRow(state) {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 transition-colors';
    row.dataset.akyoId = state.id;

    const idCell = document.createElement('td');
    idCell.className = 'px-4 py-3 font-mono text-sm akyo-list-id';
    row.appendChild(idCell);

    const imageCell = document.createElement('td');
    imageCell.className = 'px-4 py-3 akyo-list-image';
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'akyo-list-image-wrapper';
    imageCell.appendChild(imageWrapper);
    row.appendChild(imageCell);

    const nameCell = document.createElement('td');
    nameCell.className = 'px-4 py-3';
    const nickname = document.createElement('div');
    nickname.className = 'font-medium akyo-list-nickname';
    nameCell.appendChild(nickname);
    const avatarName = document.createElement('div');
    avatarName.className = 'text-xs text-gray-500 akyo-list-avatar-name';
    nameCell.appendChild(avatarName);
    row.appendChild(nameCell);

    const attributeCell = document.createElement('td');
    attributeCell.className = 'px-4 py-3';
    const attributeContainer = document.createElement('div');
    attributeContainer.className = 'flex flex-wrap gap-1 akyo-attribute-container';
    attributeCell.appendChild(attributeContainer);
    row.appendChild(attributeCell);

    const creatorCell = document.createElement('td');
    creatorCell.className = 'px-4 py-3 text-sm akyo-list-creator';
    row.appendChild(creatorCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'px-4 py-3 text-center';

    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'p-2 hover:bg-gray-100 rounded-lg mr-1';
    favoriteButton.addEventListener('click', () => toggleFavorite(state.id));
    const favoriteIcon = document.createElement('i');
    favoriteIcon.dataset.favoriteIcon = 'list';
    favoriteButton.appendChild(favoriteIcon);
    actionCell.appendChild(favoriteButton);

    const detailButton = document.createElement('button');
    detailButton.className = 'p-2 hover:bg-gray-100 rounded-lg';
    detailButton.addEventListener('click', () => showDetail(state.id));
    const detailIcon = document.createElement('i');
    detailIcon.className = 'fas fa-info-circle text-blue-500';
    detailButton.appendChild(detailIcon);
    actionCell.appendChild(detailButton);

    row.appendChild(actionCell);

    updateListRow(row, state);

    return row;
}

function updateListRow(row, state) {
    if (row.dataset.akyoSignature === state.signature) {
        return;
    }

    row.dataset.akyoSignature = state.signature;
    row.dataset.akyoId = state.id;

    const idCell = row.querySelector('.akyo-list-id');
    if (idCell) {
        idCell.textContent = state.id;
    }

    const imageWrapper = row.querySelector('.akyo-list-image-wrapper');
    if (imageWrapper) {
        imageWrapper.textContent = '';
        if (state.imageUrl) {
            const img = document.createElement('img');
            img.src = state.imageUrl;
            img.alt = state.displayName;
            img.className = 'w-12 h-12 rounded-lg object-cover';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.fetchPriority = 'low';
            img.addEventListener('error', () => handleImageError(img, state.id, state.attributeColor, 'list'));
            imageWrapper.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'w-12 h-12 rounded-lg';
            placeholder.style.background = state.attributeColor;
            const placeholderContent = document.createElement('div');
            placeholderContent.className = 'w-full h-full flex items-center justify-center text-white text-xs font-bold';
            placeholderContent.textContent = state.id;
            placeholder.appendChild(placeholderContent);
            imageWrapper.appendChild(placeholder);
        }
    }

    const nickname = row.querySelector('.akyo-list-nickname');
    if (nickname) {
        nickname.textContent = state.nickname || '-';
    }

    const avatarName = row.querySelector('.akyo-list-avatar-name');
    if (avatarName) {
        avatarName.textContent = state.avatarName || '';
    }

    const attributeContainer = row.querySelector('.akyo-attribute-container');
    if (attributeContainer) {
        attributeContainer.textContent = '';
        state.attributes.forEach(attr => {
            const badge = document.createElement('span');
            badge.className = 'attribute-badge text-xs';
            const color = getAttributeColor(attr);
            badge.style.background = `${color}20`;
            badge.style.color = color;
            badge.textContent = displayAttributeName(attr);
            attributeContainer.appendChild(badge);
        });
    }

    const creatorCell = row.querySelector('.akyo-list-creator');
    if (creatorCell) {
        creatorCell.textContent = state.creator;
    }

    const favoriteIcon = row.querySelector('[data-favorite-icon="list"]');
    if (favoriteIcon) {
        favoriteIcon.className = `fas fa-heart ${state.isFavorite ? 'text-red-500' : 'text-gray-300'}`;
    }
}

// 詳細モーダル表示
async function showDetail(akyoId) {
    const akyo = akyoData.find(a => a.id === akyoId);
    if (!akyo) return;

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    const displayName = akyo.nickname || akyo.avatarName || '';
    const attributeColor = getAttributeColor(akyo.attribute);
    const imageUrl = resolveAkyoImageUrl(akyo.id);
    const hasImage = !!imageUrl;
    const attributes = extractAttributes(akyo.attribute);
    const sanitizedAvatarUrl = sanitizeUrl(akyo.avatarUrl);

    const profileIconUrl = await resolveProfileIcon();

    modalTitle.textContent = '';
    const profileIconSrc = profileIconUrl || getDefaultProfileIconDataUrl();
    const icon = document.createElement('img');
    icon.src = profileIconSrc;
    icon.loading = 'lazy';
    icon.decoding = 'async';
    icon.className = 'w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400';
    icon.alt = 'Profile Icon';
    icon.addEventListener('error', () => {
        icon.onerror = null;
        icon.src = getDefaultProfileIconDataUrl();
    });
    modalTitle.appendChild(icon);
    const titleText = document.createElement('span');
    titleText.textContent = `#${akyo.id} ${displayName}`;
    modalTitle.appendChild(titleText);

    const container = document.createElement('div');
    container.className = 'space-y-6';

    if (hasImage) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'relative';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 p-2';

    const modalImage = document.createElement('img');
    modalImage.src = imageUrl;
    modalImage.alt = displayName;
    modalImage.className = 'w-full h-full object-contain rounded-2xl';
    modalImage.loading = 'lazy';
    modalImage.addEventListener('error', () => handleImageError(modalImage, akyo.id, attributeColor, 'modal'));
        imageContainer.appendChild(modalImage);

        imageWrapper.appendChild(imageContainer);

        const sparkle = document.createElement('div');
        sparkle.className = 'absolute -top-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center animate-bounce';
        const sparkleIcon = document.createElement('span');
        sparkleIcon.className = 'text-2xl';
        sparkleIcon.textContent = '✨';
        sparkle.appendChild(sparkleIcon);
        imageWrapper.appendChild(sparkle);

        container.appendChild(imageWrapper);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'akyo-image-placeholder h-64 rounded-3xl shadow-lg';
        placeholder.style.background = `linear-gradient(135deg, ${attributeColor}, ${attributeColor}66)`;
        const placeholderTitle = document.createElement('span');
        placeholderTitle.className = 'text-6xl';
        placeholderTitle.textContent = akyo.id;
        placeholder.appendChild(placeholderTitle);
        const placeholderText = document.createElement('p');
        placeholderText.className = 'text-white text-lg mt-2';
        placeholderText.textContent = '画像がまだないよ！';
        placeholder.appendChild(placeholderText);
        container.appendChild(placeholder);
    }

    const infoGrid = document.createElement('div');
    infoGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    const nameCard = document.createElement('div');
    nameCard.className = 'bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4';
    nameCard.innerHTML = `
                    <h3 class="text-sm font-bold text-purple-600 mb-2">
                        <i class="fas fa-tag mr-1"></i>なまえ
                    </h3>
    `;
    const nameValue = document.createElement('p');
    nameValue.className = 'text-xl font-black';
    nameValue.textContent = akyo.nickname || '-';
    nameCard.appendChild(nameValue);
    infoGrid.appendChild(nameCard);

    const avatarCard = document.createElement('div');
    avatarCard.className = 'bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4';
    avatarCard.innerHTML = `
                    <h3 class="text-sm font-bold text-blue-600 mb-2">
                        <i class="fas fa-user-astronaut mr-1"></i>アバター名
                    </h3>
    `;
    const avatarValue = document.createElement('p');
    avatarValue.className = 'text-xl font-black';
    avatarValue.textContent = akyo.avatarName || '-';
    avatarCard.appendChild(avatarValue);
    infoGrid.appendChild(avatarCard);

    const attributeCard = document.createElement('div');
    attributeCard.className = 'bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4';
    attributeCard.innerHTML = `
                    <h3 class="text-sm font-bold text-orange-600 mb-2">
                        <i class="fas fa-sparkles mr-1"></i>ぞくせい
                    </h3>
    `;
    const attributeContainer = document.createElement('div');
    attributeContainer.className = 'flex flex-wrap gap-2 mt-1';
    attributes.forEach(attr => {
        const badge = document.createElement('span');
        badge.className = 'px-3 py-1 rounded-full text-sm font-bold text-white shadow-md';
        const color = getAttributeColor(attr);
        badge.style.background = `linear-gradient(135deg, ${color}, ${color}dd)`;
        badge.textContent = displayAttributeName(attr);
        attributeContainer.appendChild(badge);
    });
    attributeCard.appendChild(attributeContainer);
    infoGrid.appendChild(attributeCard);

    const creatorCard = document.createElement('div');
    creatorCard.className = 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4';
    creatorCard.innerHTML = `
                    <h3 class="text-sm font-bold text-green-600 mb-2">
                        <i class="fas fa-palette mr-1"></i>つくったひと
                    </h3>
    `;
    const creatorValue = document.createElement('p');
    creatorValue.className = 'text-xl font-black';
    creatorValue.textContent = akyo.creator || '';
    creatorCard.appendChild(creatorValue);
    infoGrid.appendChild(creatorCard);

    container.appendChild(infoGrid);

    if (sanitizedAvatarUrl) {
        const urlSection = document.createElement('div');
        const urlTitle = document.createElement('h3');
        urlTitle.className = 'text-sm font-semibold text-gray-500 mb-2';
        urlTitle.textContent = 'VRChat アバターURL';
        const urlWrapper = document.createElement('div');
        urlWrapper.className = 'bg-blue-50 rounded-lg p-4';
        const urlLink = document.createElement('a');
        urlLink.href = sanitizedAvatarUrl;
        urlLink.target = '_blank';
        urlLink.rel = 'noopener noreferrer';
        urlLink.className = 'text-blue-600 hover:text-blue-800 text-sm break-all';
        const linkIcon = document.createElement('i');
        linkIcon.className = 'fas fa-external-link-alt mr-1';
        urlLink.appendChild(linkIcon);
        urlLink.appendChild(document.createTextNode(sanitizedAvatarUrl));
        urlWrapper.appendChild(urlLink);
        urlSection.appendChild(urlTitle);
        urlSection.appendChild(urlWrapper);
        container.appendChild(urlSection);
    }

    if (akyo.notes) {
        const notesSection = document.createElement('div');
        notesSection.className = 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-3xl p-5';
        notesSection.innerHTML = `
                <h3 class="text-lg font-bold text-purple-600 mb-3">
                    <i class="fas fa-gift mr-2"></i>おまけ情報
                </h3>
        `;
        const notesWrapper = document.createElement('div');
        notesWrapper.className = 'bg-white bg-opacity-80 rounded-2xl p-4 shadow-inner';
        const notesText = document.createElement('p');
        notesText.className = 'text-gray-700 whitespace-pre-wrap leading-relaxed';
        notesText.textContent = akyo.notes;
        notesWrapper.appendChild(notesText);
        notesSection.appendChild(notesWrapper);
        container.appendChild(notesSection);
    }

    const actionContainer = document.createElement('div');
    actionContainer.className = 'flex gap-3 pt-4 border-t';

    const favoriteButton = document.createElement('button');
    favoriteButton.className = `flex-1 py-3 rounded-lg font-medium transition-colors ${akyo.isFavorite ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    favoriteButton.addEventListener('click', async () => {
        toggleFavorite(akyo.id);
        await showDetail(akyo.id);
    });
    const favoriteIcon = document.createElement('i');
    favoriteIcon.className = 'fas fa-heart mr-2';
    favoriteButton.appendChild(favoriteIcon);
    favoriteButton.appendChild(document.createTextNode(akyo.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'));
    actionContainer.appendChild(favoriteButton);

    if (sanitizedAvatarUrl) {
        const openButton = document.createElement('button');
        openButton.className = 'flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity';
        openButton.addEventListener('click', () => window.open(sanitizedAvatarUrl, '_blank'));
        const openIcon = document.createElement('i');
        openIcon.className = 'fas fa-external-link-alt mr-2';
        openButton.appendChild(openIcon);
        openButton.appendChild(document.createTextNode('VRChatで見る'));
        actionContainer.appendChild(openButton);
    }

    container.appendChild(actionContainer);

    modalContent.innerHTML = '';
    modalContent.appendChild(container);

    modal.classList.remove('hidden');
}

// モーダルを閉じる
function closeModal() {
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

// お気に入り切り替え
function toggleFavorite(akyoId) {
    const akyo = akyoData.find(a => a.id === akyoId);
    if (!akyo) return;

    akyo.isFavorite = !akyo.isFavorite;

    if (akyo.isFavorite) {
        if (!favorites.includes(akyoId)) {
            favorites.push(akyoId);
        }
    } else {
        const index = favorites.indexOf(akyoId);
        if (index > -1) {
            favorites.splice(index, 1);
        }
    }

    // ローカルストレージに保存
    localStorage.setItem('akyoFavorites', JSON.stringify(favorites));

    // 表示更新（お気に入りのみ or ランダムモード時はフィルタを再適用）
    if (favoritesOnlyMode || randomMode) {
        applyFilters();
    } else {
        updateDisplay();
    }
}

// 統計情報の更新
function updateStatistics() {
    const total = akyoData.length;
    const displayed = Math.min(filteredData.length, renderLimit);
    document.getElementById('totalCount').textContent = total;
    document.getElementById('displayCount').textContent = displayed;
    document.getElementById('favoriteCount').textContent = favorites.length;

    // 自己修復: 描画数 < 総数 かつ、フィルタなし・ランダム/お気に入りモードでない場合はCSVを再取得
    const noFilter = !(document.getElementById('attributeFilter')?.value) && !(document.getElementById('creatorFilter')?.value) && currentSearchTerms.length === 0;
    if (noFilter && !randomMode && !favoritesOnlyMode) {
        // クールダウン（30秒）で連続再取得を抑制
        const lastRefetchAt = Number(localStorage.getItem('akyoCsvLastRefetchAt') || '0');
        const now = Date.now();
        const cooled = now - lastRefetchAt > 30_000;
        // 取得総数がサーバ期待より少ない場合のみ再取得
        if (cooled && serverCsvRowCount && serverCsvRowCount > total) {
            const ts = now;
            localStorage.setItem('akyoCsvLastRefetchAt', String(now));
            fetch(`/api/csv?v=${ts}`, { cache: 'no-cache' })
                .then(r => r.ok ? r.text() : Promise.reject(new Error(String(r.status))))
                .then(text => {
                    const fresh = parseCSV(text);
                    if (Array.isArray(fresh) && fresh.length >= total) {
                        akyoData = fresh;
                        (
                          (typeof window !== 'undefined' && typeof window.buildSearchIndex === 'function') ? window.buildSearchIndex :
                          (typeof buildSearchIndex === 'function') ? buildSearchIndex : null
                        )?.();
                        applyFilters();
                      }
                })
                .catch(() => {});
        }
    }
}

// 属性による色の取得
function getAttributeColor(attribute) {
    const colorMap = {
        'チョコミント': '#00bfa5',
        '動物': '#ff6f61',
        'きつね': '#ff9800',
        'おばけ': '#9c27b0',
        '人類': '#2196f3',
        'ギミック': '#4caf50',
        '特殊': '#e91e63',
        'ネコ': '#795548',
        'イヌ': '#607d8b',
        'うさぎ': '#ff4081',
        'ドラゴン': '#673ab7',
        'ロボット': '#757575',
        '食べ物': '#ffc107',
        '植物': '#8bc34a',
        '宇宙': '#3f51b5',
        '和風': '#d32f2f',
        '洋風': '#1976d2',
        'ファンタジー': '#ab47bc',
        'SF': '#00acc1',
        'ホラー': '#424242',
        'かわいい': '#ec407a',
        'クール': '#5c6bc0',
        'シンプル': '#78909c'
    };

    // 最初にマッチする属性の色を返す
    for (const [key, color] of Object.entries(colorMap)) {
        if (attribute && attribute.includes(key)) {
            return color;
        }
    }

    // デフォルト色（グラデーションの一部）
    const defaultColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    const hash = attribute ? attribute.charCodeAt(0) : 0;
    return defaultColors[hash % defaultColors.length];
}

// デバウンス関数（検索の最適化）
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

// エラー表示（未使用のため簡潔化し、必要時の再利用に備えて保持）
function showError(message) {
    const el = document.getElementById('loadingContainer');
    if (!el) return;
    el.textContent = '';
    const wrap = document.createElement('div');
    wrap.className = 'text-center text-red-600';
    wrap.innerHTML = `<p class="text-lg font-medium">${message}</p>`;
    el.appendChild(wrap);
}

// 共通トースト通知（任意でリトライボタンを付与）
function showToast(message, type = 'info', retryHandler) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3';
    toast.style.backgroundColor = (type === 'error') ? '#ef4444' : (type === 'warning') ? '#f59e0b' : '#3b82f6';
    toast.style.color = '#fff';
    toast.innerHTML = `<i class="fas ${type==='error'?'fa-exclamation-circle': type==='warning'?'fa-exclamation-triangle':'fa-info-circle'}"></i><span>${message}</span>`;
    if (typeof retryHandler === 'function') {
        const btn = document.createElement('button');
        btn.className = 'ml-2 px-3 py-1 bg-white text-gray-800 rounded';
        btn.textContent = '再試行';
        btn.onclick = () => { try { retryHandler(); } finally { document.body.removeChild(toast); } };
        toast.appendChild(btn);
    }
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6000);
}
