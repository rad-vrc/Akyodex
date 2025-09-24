// Akyoずかん メインJavaScriptファイル

// グローバル変数
let akyoData = [];
let filteredData = [];
let favorites = JSON.parse(localStorage.getItem('akyoFavorites')) || [];
let currentView = 'grid';
let imageDataMap = {}; // 画像データの格納

// 画像データの読み込み関数
async function loadImageData() {
    console.log('Loading image data...');
    try {
        // StorageManagerが初期化されるまで待機
        let attempts = 0;
        while (!window.storageManager && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
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
            loadAkyoData().then(updateDisplay).catch(err => console.error(err));
        }
    });

    // タブ復帰時にも最新反映
    window.addEventListener('focus', () => {
        loadAkyoData().then(updateDisplay).catch(() => {});
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
        updateDisplay();
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

        if (!akyoData || akyoData.length === 0) {
            throw new Error('CSVデータが空です');
        }

        filteredData = [...akyoData];

        console.log(`${akyoData.length}種類のAKyoを読み込みました`);

        // 属性リストの作成
        createAttributeFilter();

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
    const lines = csvText.split('\n');
    const headers = ['id', 'appearance', 'nickname', 'avatarName', 'attribute', 'notes', 'creator', 'avatarUrl'];
    const data = [];

    // ヘッダー行をスキップして、データ行を処理
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // カンマで分割（複数行の備考に対応）
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        let currentLine = line;

        // 複数行にまたがる値の処理
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

            // 引用符が閉じていない場合、次の行を続けて読む
            if (inQuotes && i + 1 < lines.length) {
                currentValue += '\n';
                i++;
                currentLine = lines[i];
            } else {
                break;
            }
        }

        // 最後の値を追加
        values.push(currentValue.trim());

        // 正規化（列が溢れた場合の救済）
        if (values[0] && values[0].match(/^\d{3}/)) {
            // 基本8列を期待。多い場合は右側（URL/作者）を優先して固定し、中間をnotesに集約
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
                avatarUrl,
                isFavorite: favorites.includes(id)
            };
            data.push(akyo);
        }
    }

    return data;
}

// 属性フィルターの作成
function createAttributeFilter() {
    const attributeSet = new Set();
    akyoData.forEach(akyo => {
        const src = akyo.attribute || '';
        const attrs = src.split(/[,、]/).map(s => s.trim()).filter(Boolean);
        attrs.forEach(attr => attributeSet.add(attr));
        // 正規化も追加：全角/半角空白の除去
    });

    const select = document.getElementById('attributeFilter');
    select.innerHTML = '<option value="">すべての属性</option>';

    Array.from(attributeSet).sort((a,b)=>a.localeCompare(b,'ja')).forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = attr;
        select.appendChild(option);
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    // 検索ボックス
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // 属性フィルター
    document.getElementById('attributeFilter').addEventListener('change', handleAttributeFilter);

    // ビュー切り替え
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));

    // クイックフィルター
    const quickFilters = document.getElementById('quickFilters').children;
    quickFilters[0].addEventListener('click', showRandom); // ランダム
    quickFilters[1].addEventListener('click', showFavorites); // お気に入り

    // 管理者ボタンを追加
    const adminBtn = document.createElement('button');
    adminBtn.className = 'fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 z-50';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i>';
    adminBtn.title = '管理者モード';
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

// 検索処理
function handleSearch() {
    const query = (document.getElementById('searchInput').value || '').toLowerCase();

    if (!query) {
        filteredData = [...akyoData];
    } else {
        filteredData = akyoData.filter(akyo => {
            return (akyo.id || '').toLowerCase().includes(query) ||
                   (akyo.nickname || '').toLowerCase().includes(query) ||
                   (akyo.avatarName || '').toLowerCase().includes(query) ||
                   (akyo.attribute || '').toLowerCase().includes(query) ||
                   (akyo.creator || '').toLowerCase().includes(query) ||
                   (akyo.notes || '').toLowerCase().includes(query);
        });
    }

    updateDisplay();
}

// 属性フィルター処理
function handleAttributeFilter() {
    const selectedAttribute = document.getElementById('attributeFilter').value;

    if (!selectedAttribute) {
        filteredData = [...akyoData];
    } else {
        filteredData = akyoData.filter(akyo => {
            return akyo.attribute.includes(selectedAttribute);
        });
    }

    updateDisplay();
}

// ランダム表示
function showRandom() {
    const shuffled = [...akyoData].sort(() => Math.random() - 0.5);
    filteredData = shuffled.slice(0, 20);
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
    grid.innerHTML = '';

    // DocumentFragmentを使用してDOM操作を最適化
    const fragment = document.createDocumentFragment();

    filteredData.forEach(akyo => {
        const card = createAkyoCard(akyo);
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
}

// AKyoカードの作成
function createAkyoCard(akyo) {
    const card = document.createElement('div');
    card.className = 'akyo-card bg-white rounded-xl shadow-lg overflow-hidden';

    // 属性に基づく色の決定
    const attributeColor = getAttributeColor(akyo.attribute);

    // 画像URLを取得
    // imageDataMapから取得（IndexedDB/LocalStorageから読み込まれたデータ）
    let imageUrl = imageDataMap[akyo.id] || null;

    // デバッグ情報を削除（パフォーマンス向上）

    // image-loader.jsの関数があればそれも確認（フォールバック）
    if (!imageUrl && typeof getAkyoImageUrl === 'function') {
        imageUrl = getAkyoImageUrl(akyo.id);
    }

    const hasImage = !!imageUrl && imageUrl !== '';

    card.innerHTML = `
        <div class="relative">
            <!-- 画像または プレースホルダー -->
            ${hasImage
                ? `<div class="h-48 overflow-hidden bg-gray-100">
                       <img src="${imageUrl}" alt="${akyo.nickname || akyo.avatarName}"
                            class="w-full h-full object-cover" loading="lazy"
                            onerror="handleImageError(this, '${akyo.id}', '${attributeColor}', 'card')">
                   </div>`
                : `<div class="akyo-image-placeholder h-48" style="background: ${attributeColor}">
                       <span class="text-4xl">${akyo.id}</span>
                   </div>`
            }

            <!-- お気に入りボタン -->
            <button onclick="toggleFavorite('${akyo.id}')" class="absolute top-2 right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform">
                <i class="fas fa-heart ${akyo.isFavorite ? 'text-red-500' : 'text-gray-300'}"></i>
            </button>
        </div>

        <div class="p-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold text-gray-500">#${akyo.id}</span>
            </div>

            <h3 class="font-bold text-lg mb-1 text-gray-800">${akyo.nickname || akyo.avatarName}</h3>

            <div class="flex flex-wrap gap-1 mb-2">
                ${akyo.attribute.split(/[,、]/).map(attr =>
                    `<span class="attribute-badge text-xs" style="background: ${getAttributeColor(attr)}20; color: ${getAttributeColor(attr)}">${attr.trim()}</span>`
                ).join('')}
            </div>

            <p class="text-xs text-gray-600 mb-2">作者: ${akyo.creator}</p>

            <button onclick="showDetail('${akyo.id}')" class="detail-button w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white py-3 rounded-2xl hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-bold text-lg shadow-lg hover:shadow-xl relative overflow-hidden">
                <span class="relative z-10 flex items-center justify-center">
                    <span class="text-2xl mr-2 animate-bounce">🌟</span>
                    <span>くわしく見る</span>
                    <span class="text-2xl ml-2 animate-bounce" style="animation-delay: 0.2s">🌟</span>
                </span>
                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
            </button>
        </div>
    `;

    return card;
}

// リストビューのレンダリング
function renderListView() {
    const list = document.getElementById('akyoList');
    list.innerHTML = '';

    // DocumentFragmentを使用してDOM操作を最適化
    const fragment = document.createDocumentFragment();

    filteredData.forEach(akyo => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 transition-colors';

        const imageUrl = getAkyoImageUrl ? getAkyoImageUrl(akyo.id) : imageDataMap[akyo.id];
        const hasImage = !!imageUrl;

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${akyo.id}</td>
            <td class="px-4 py-3">
                ${hasImage
                    ? `<img src="${imageUrl}" alt="${akyo.nickname}" class="w-12 h-12 rounded-lg object-cover" loading="lazy">`
                    : `<div class="w-12 h-12 rounded-lg" style="background: ${getAttributeColor(akyo.attribute)}">
                           <div class="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                               ${akyo.id}
                           </div>
                       </div>`
                }
            </td>
            <td class="px-4 py-3">
                <div class="font-medium">${akyo.nickname || '-'}</div>
                <div class="text-xs text-gray-500">${akyo.avatarName}</div>
            </td>
            <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                    ${akyo.attribute.split(/[,、]/).map(attr =>
                        `<span class="attribute-badge text-xs" style="background: ${getAttributeColor(attr)}20; color: ${getAttributeColor(attr)}">${attr.trim()}</span>`
                    ).join('')}
                </div>
            </td>
            <td class="px-4 py-3 text-sm">${akyo.creator}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="toggleFavorite('${akyo.id}')" class="p-2 hover:bg-gray-100 rounded-lg mr-1">
                    <i class="fas fa-heart ${akyo.isFavorite ? 'text-red-500' : 'text-gray-300'}"></i>
                </button>
                <button onclick="showDetail('${akyo.id}')" class="p-2 hover:bg-gray-100 rounded-lg">
                    <i class="fas fa-info-circle text-blue-500"></i>
                </button>
            </td>
        `;

        fragment.appendChild(row);
    });

    list.appendChild(fragment);
}

// 詳細モーダル表示
function showDetail(akyoId) {
    const akyo = akyoData.find(a => a.id === akyoId);
    if (!akyo) return;

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    // タイトルを設定（プロファイルアイコンまたは絵文字を使用）
    (async () => {
        try {
            let profileIcon = null;

            // まずフォルダ（images/）からの既定アイコンを試す（GETで存在確認）
            try {
                const ver = (localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '1');
                const respPng = await fetch(`images/profileIcon.png?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                if (respPng.ok) profileIcon = `images/profileIcon.png?v=${encodeURIComponent(ver)}`;
                else {
                    const respJpg = await fetch(`images/profileIcon.jpg?v=${encodeURIComponent(ver)}`, { cache: 'no-cache' });
                    if (respJpg.ok) profileIcon = `images/profileIcon.jpg?v=${encodeURIComponent(ver)}`;
                }
            } catch (_) {}

            // IndexedDBから読み込みを試行
            if (window.storageManager && window.storageManager.isIndexedDBAvailable) {
                await window.storageManager.init();
                profileIcon = await window.storageManager.getImage('profileIcon');
            }

            // localStorageをチェック
            if (!profileIcon) {
                profileIcon = localStorage.getItem('akyoProfileIcon');
            }

            if (profileIcon) {
                modalTitle.innerHTML = `
                    <img src="${profileIcon}" class="w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400">
                    #${akyo.id} ${akyo.nickname || akyo.avatarName}
                `;
            } else {
                // 画像ファイルを直接試す（存在しなければ非表示）
                modalTitle.innerHTML = `
                    <img src="images/profileIcon.png" onerror="this.style.display='none'" class="w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400">
                    #${akyo.id} ${akyo.nickname || akyo.avatarName}
                `;
            }
        } catch (error) {
            console.error('プロファイルアイコンの読み込みに失敗:', error);
            modalTitle.innerHTML = `
                <img src="images/profileIcon.png" onerror="this.style.display='none'" class="w-10 h-10 rounded-full mr-3 inline-block object-cover border-2 border-purple-400">
                #${akyo.id} ${akyo.nickname || akyo.avatarName}
            `;
        }
    })();

    // 画像URLを取得
    let imageUrl = imageDataMap[akyo.id] || null;
    if (!imageUrl && typeof getAkyoImageUrl === 'function') {
        imageUrl = getAkyoImageUrl(akyo.id);
    }
    const hasImage = !!imageUrl && imageUrl !== '';

    modalContent.innerHTML = `
        <div class="space-y-6">
            <!-- メイン画像 -->
            ${hasImage
                ? `<div class="relative">
                       <div class="h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 p-2">
                           <img src="${imageUrl}" alt="${akyo.nickname || akyo.avatarName}"
                                class="w-full h-full object-contain rounded-2xl"
                                onerror="handleImageError(this, '${akyo.id}', '${getAttributeColor(akyo.attribute)}', 'modal')">
                       </div>
                       <div class="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                           <span class="text-2xl">✨</span>
                       </div>
                   </div>`
                : `<div class="akyo-image-placeholder h-64 rounded-3xl shadow-lg" style="background: linear-gradient(135deg, ${getAttributeColor(akyo.attribute)}, ${getAttributeColor(akyo.attribute)}66)">
                       <span class="text-6xl">${akyo.id}</span>
                       <p class="text-white text-lg mt-2">画像がまだないよ！</p>
                   </div>`
            }

            <!-- 基本情報 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4">
                    <h3 class="text-sm font-bold text-purple-600 mb-2">
                        <i class="fas fa-tag mr-1"></i>なまえ
                    </h3>
                    <p class="text-xl font-black">${akyo.nickname || '-'}</p>
                </div>
                <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4">
                    <h3 class="text-sm font-bold text-blue-600 mb-2">
                        <i class="fas fa-user-astronaut mr-1"></i>アバター
                    </h3>
                    <p class="text-xl font-black">${akyo.avatarName || '-'}</p>
                </div>
                <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4">
                    <h3 class="text-sm font-bold text-orange-600 mb-2">
                        <i class="fas fa-sparkles mr-1"></i>ぞくせい
                    </h3>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${akyo.attribute.split(/[,、]/).map(attr =>
                            `<span class="px-3 py-1 rounded-full text-sm font-bold text-white shadow-md"
                                   style="background: linear-gradient(135deg, ${getAttributeColor(attr)}, ${getAttributeColor(attr)}dd)">
                                ${attr.trim()}
                            </span>`
                        ).join('')}
                    </div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
                    <h3 class="text-sm font-bold text-green-600 mb-2">
                        <i class="fas fa-palette mr-1"></i>つくったひと
                    </h3>
                    <p class="text-xl font-black">${akyo.creator}</p>
                </div>
            </div>

            <!-- URL -->
            ${akyo.avatarUrl ? `
            <div>
                <h3 class="text-sm font-semibold text-gray-500 mb-2">VRChat アバターURL</h3>
                <div class="bg-blue-50 rounded-lg p-4">
                    <a href="${akyo.avatarUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 text-sm break-all">
                        <i class="fas fa-external-link-alt mr-1"></i>
                        ${akyo.avatarUrl}
                    </a>
                </div>
            </div>
            ` : ''}

            <!-- 備考 -->
            ${akyo.notes ? `
            <div class="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-3xl p-5">
                <h3 class="text-lg font-bold text-purple-600 mb-3">
                    <i class="fas fa-gift mr-2"></i>おまけ情報
                </h3>
                <div class="bg-white bg-opacity-80 rounded-2xl p-4 shadow-inner">
                    <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">${akyo.notes}</p>
                </div>
            </div>
            ` : ''}

            <!-- アクションボタン -->
            <div class="flex gap-3 pt-4 border-t">
                <button onclick="toggleFavorite('${akyo.id}'); showDetail('${akyo.id}')" class="flex-1 py-3 rounded-lg font-medium transition-colors ${akyo.isFavorite ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                    <i class="fas fa-heart mr-2"></i>
                    ${akyo.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                </button>
                ${akyo.avatarUrl ? `
                <button onclick="window.open('${akyo.avatarUrl}', '_blank')" class="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                    <i class="fas fa-external-link-alt mr-2"></i>
                    VRChatで見る
                </button>
                ` : ''}
            </div>
        </div>
    `;

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
