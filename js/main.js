// Akyoずかん メインJavaScriptファイル

// グローバル変数
let akyoData = [];
let filteredData = [];
let searchIndex = []; // { id, text }
let favorites = JSON.parse(localStorage.getItem('akyoFavorites')) || [];
let currentView = 'grid';
let currentSearchTerms = [];
let imageDataMap = {}; // 画像データの格納
let profileIconCache = { resolved: false, url: null };
const gridCardCache = new Map();
const listRowCache = new Map();

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

function resolveAkyoImageUrl(akyoId) {
    const storedImage = sanitizeImageSource(imageDataMap[akyoId]);
    if (storedImage) {
        return storedImage;
    }

    if (typeof getAkyoImageUrl === 'function') {
        const fallback = sanitizeImageSource(getAkyoImageUrl(akyoId));
        if (fallback) {
            return fallback;
        }
    }

    return '';
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

    profileIconCache = { resolved: true, url: sanitizeImageSource(profileIcon) || null };
    return profileIconCache.url;
}

// 画像データの読み込み関数
async function loadImageData() {
    console.log('Loading image data...');
    try {
        // StorageManagerが初期化されるまで待機
        let attempts = 0;
        while (!window.storageManager && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.storageManager && attempts >= 50) {
            console.warn('StorageManager did not become available within expected time. Falling back.');
        }

        if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
            // IndexedDBから読み込み
            console.log('Loading from IndexedDB...');
            await window.storageManager.init();
            imageDataMap = await window.storageManager.getAllImages();
            console.log(`Loaded ${Object.keys(imageDataMap).length} images from IndexedDB`);

            // IndexedDBが空の場合、LocalStorageも確認
            if (Object.keys(imageDataMap).length === 0) {
                const savedImages = localStorage.getItem('akyoImages');
                if (savedImages) {
                    try {
                        const localImages = JSON.parse(savedImages);
                        console.log(`Found ${Object.keys(localImages).length} images in LocalStorage`);
                        imageDataMap = localImages;
                    } catch (e) {
                        console.error('Failed to parse LocalStorage data:', e);
                    }
                }
            }
        } else {
            // フォールバック: LocalStorageから読み込み
            console.log('StorageManager not available, loading from LocalStorage...');
            const savedImages = localStorage.getItem('akyoImages');
            if (savedImages) {
                imageDataMap = JSON.parse(savedImages);
                console.log(`Loaded ${Object.keys(imageDataMap).length} images from localStorage`);
            }
        }

        console.log('Image data loaded. Total images:', Object.keys(imageDataMap).length);

    } catch (error) {
        console.error('Failed to load images:', error);
        imageDataMap = {};
    }
}

// DOMコンテンツ読み込み完了後の処理
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Akyoずかんを初期化中...');

    // イベントリスナーの設定を最初に実行（UIの応答性向上）
    setupEventListeners();

    // 初期表示を先に実行（ローディング表示など）
    document.getElementById('noDataContainer').classList.remove('hidden');

    // LocalStorageのCSV更新を別タブから検知して自動反映
    window.addEventListener('storage', (e) => {
        if (e.key === 'akyoDataCSV' || e.key === 'akyoDataVersion') {
            console.log('Data changed in another tab. Reloading data...');
            loadAkyoData().then(applyFilters).catch(err => console.error(err));
        }
    });

    // タブ復帰時にも最新反映
    window.addEventListener('focus', () => {
        loadAkyoData().then(applyFilters).catch(() => {});
    });

    // 非同期でデータ読み込み（並列処理で高速化）
    Promise.all([
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
    ]).then(() => {
        // すべての読み込み完了後に表示更新
        applyFilters();
    });
});

// CSVデータの読み込みと解析
async function loadAkyoData() {
    try {
        console.log('CSVデータを読み込み中...');

        // まずLocalStorageから更新されたデータを確認
        const updatedCSV = localStorage.getItem('akyoDataCSV');
        let csvText;

        if (updatedCSV) {
            console.log('LocalStorageから更新データを読み込み');
            csvText = updatedCSV;
        } else {
            // LocalStorageにない場合はファイルから読み込み
            const response = await fetch('data/akyo-data.csv');

            if (!response.ok) {
                throw new Error(`CSVファイルの読み込みに失敗: ${response.status}`);
            }

            csvText = await response.text();
        }

        console.log('CSVデータ取得完了:', csvText.length, 'bytes');

        // CSV解析
        akyoData = parseCSV(csvText);
        gridCardCache.clear();
        listRowCache.clear();

        if (!akyoData || akyoData.length === 0) {
            throw new Error('CSVデータが空です');
        }

        filteredData = [...akyoData];
        buildSearchIndex();

        console.log(`${akyoData.length}種類のAKyoを読み込みました`);

        // 属性・作者リストの作成
        createAttributeFilter();
        createCreatorFilter();

        // 画像データの再確認
        console.log('Current imageDataMap size:', Object.keys(imageDataMap).length);
        if (Object.keys(imageDataMap).length === 0) {
            console.log('imageDataMap is empty, reloading...');
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
            if (inQuotes && csvText[i + 1] === '"') {
                currentField += '"';
                i++;
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

    // ヘッダー行を除外
    rows.shift();

    const data = [];

    rows.forEach(values => {
        if (!values || values.length === 0 || values.every(value => !value || value.trim() === '')) {
            return;
        }

        const normalized = values.map(value => value.replace(/\r/g, '').trim());

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
        // 正規化も追加：全角/半角空白の除去
    });

    const select = document.getElementById('attributeFilter');
    select.innerHTML = '<option value="">すべての属性</option>';

    Array.from(attributeSet).sort((a,b)=>a.localeCompare(b,'ja')).forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = displayAttributeName(attr);
        select.appendChild(option);
    });
}

function createCreatorFilter() {
    const creatorSet = new Set();
    akyoData.forEach(akyo => {
        extractCreators(akyo.creator).forEach(name => creatorSet.add(name));
    });

    const select = document.getElementById('creatorFilter');
    if (!select) return;

    select.innerHTML = '<option value="">すべての作者</option>';

    Array.from(creatorSet)
        .sort((a, b) => a.localeCompare(b, 'ja'))
        .forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
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
    const quickFiltersContainer = document.getElementById('quickFilters');
    if (quickFiltersContainer) {
        const quickFilters = quickFiltersContainer.children;
        if (quickFilters.length > 0) {
    quickFilters[0].addEventListener('click', showRandom); // ランダム
        }
        if (quickFilters.length > 1) {
    quickFilters[1].addEventListener('click', showFavorites); // お気に入り
        }
    }

    // 管理者ボタンを追加
    const adminBtn = document.createElement('button');
    adminBtn.className = 'fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 z-50';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i>';
    adminBtn.title = 'ファインダーモード';
    adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
    document.body.appendChild(adminBtn);

    // モーダルクローズ
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    const detailModal = document.getElementById('detailModal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') closeModal();
        });
    }
}

// 正規化（ひらがな/カタカナ/全角半角）
function normalizeForSearch(input) {
    if (!input) return '';
    const s = String(input)
        .toLowerCase()
        // 全角英数→半角
        .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        // カタカナ→ひらがな
        .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
        // 記号・余分な空白を除去
        .replace(/[\s\u3000]+/g, ' ')
        .trim();
    return s;
}

function buildSearchIndex() {
    searchIndex = akyoData.map(a => {
        const text = [a.id, a.nickname, a.avatarName, a.attribute, a.creator, a.notes]
            .map(normalizeForSearch)
            .join(' ');
        return { id: a.id, text };
    });
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

    if (!currentSearchTerms.length) {
        filteredData = data;
        updateDisplay();
        return;
    }

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

    filteredData = scored
        .map(({ id }) => idToAkyo.get(id))
        .filter(Boolean);

    updateDisplay();
}

// ランダム表示
function showRandom() {
    const pool = [...akyoData];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    filteredData = pool.slice(0, 20);
    updateDisplay();
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

    if (filteredData.length === 0) {
        document.getElementById('noDataContainer').classList.remove('hidden');
        document.getElementById('gridView').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        return;
    }

    document.getElementById('noDataContainer').classList.add('hidden');

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

    filteredData.forEach(akyo => {
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
    creator.className = 'text-xs text-gray-600 mb-2 akyo-creator';
    content.appendChild(creator);

    const detailButton = document.createElement('button');
    detailButton.className = 'detail-button w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white py-3 rounded-2xl hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-bold text-lg shadow-lg hover:shadow-xl relative overflow-hidden';
    detailButton.innerHTML = `
                <span class="relative z-10 flex items-center justify-center">
                    <span class="text-2xl mr-2 animate-bounce">🌟</span>
                    <span>くわしく見る</span>
                    <span class="text-2xl ml-2 animate-bounce" style="animation-delay: 0.2s">🌟</span>
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
        creator.textContent = `作者: ${state.creator}`;
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

    filteredData.forEach(akyo => {
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
    if (profileIconUrl) {
        const icon = document.createElement('img');
        icon.src = profileIconUrl;
        icon.className = 'w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400';
        icon.alt = 'Profile Icon';
        modalTitle.appendChild(icon);
            } else {
        const fallbackIcon = document.createElement('img');
        fallbackIcon.src = 'images/profileIcon.webp';
        fallbackIcon.className = 'w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400';
        fallbackIcon.alt = 'Profile Icon';
        fallbackIcon.addEventListener('error', () => {
            fallbackIcon.onerror = null;
            fallbackIcon.src = 'images/profileIcon.png';
        });
        modalTitle.appendChild(fallbackIcon);
    }
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
        sparkle.className = 'absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce';
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
                        <i class="fas fa-user-astronaut mr-1"></i>アバター
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
    document.getElementById('detailModal').classList.add('hidden');
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

    // 表示更新
    updateDisplay();
}

// 統計情報の更新
function updateStatistics() {
    document.getElementById('totalCount').textContent = akyoData.length;
    document.getElementById('displayCount').textContent = filteredData.length;
    document.getElementById('favoriteCount').textContent = favorites.length;
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

// エラー表示
function showError(message) {
    const container = document.getElementById('loadingContainer');
    container.innerHTML = `
        <div class="text-center">
            <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
            <p class="text-red-600 text-lg font-medium">${message}</p>
            <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                再読み込み
            </button>
        </div>
    `;
}
