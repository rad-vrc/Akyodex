// Akyo画像データマッピング
// 画像URLとAkyoIDの対応表
// 1-20番の画像は管理画面から再登録するため、空オブジェクトに初期化

const akyoImageUrls = {
    // 管理画面から再登録してください
};

// 画像マニフェスト（images/manifest.json）からのマッピング
// 形式1: { "map": { "001": "001オリジン.png", ... } }
// 形式2: { "files": ["001オリジン.png", ...] }
// 形式3: ["001オリジン.png", ...]
let akyoImageManifestMap = {};
const PUBLIC_R2_BASE = 'https://images.akyodex.com';

async function loadImagesManifest() {
    try {
        // 1) R2/KV 由来の最新マニフェスト（完全URLを返す想定）
        let resp = await fetch('/api/manifest', { cache: 'no-store' });
        if (!resp.ok) {
            // 2) 旧来の静的マニフェスト
            resp = await fetch('images/manifest.json', { cache: 'no-cache' });
        }
        if (!resp.ok) return false;
        const data = await resp.json();
        let map = {};
        if (Array.isArray(data)) {
            data.forEach(name => {
                const m = String(name).match(/^(\d{3})/);
                if (m) { const id = m[1]; if (!map[id]) map[id] = name; }
            });
        } else if (data && Array.isArray(data.files)) {
            data.files.forEach(name => {
                const m = String(name).match(/^(\d{3})/);
                if (m) { const id = m[1]; if (!map[id]) map[id] = name; }
            });
        } else if (data && data.map && typeof data.map === 'object') {
            map = { ...data.map };
        } else if (data && typeof data === 'object') {
            // /api/manifest のような { "001": "https://..." } 形式
            map = { ...data };
        }
        akyoImageManifestMap = map;
        return Object.keys(akyoImageManifestMap).length > 0;
    } catch (_) {
        return false;
    }
}

function getAssetsVersionSuffix() {
    try {
        const v = localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '1';
        return `?v=${encodeURIComponent(v)}`;
    } catch (_) {
        return '';
    }
}

// 画像の遅延読み込み設定
function setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });

    // すべての遅延読み込み対象画像を監視
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// 画像URLを取得
function getAkyoImageUrl(akyoId) {
    // まずwindowにロードされたマニフェストを優先
    try {
        if (typeof window !== 'undefined' && window.akyoImageManifestMap && window.akyoImageManifestMap[akyoId]) {
            const v = window.akyoImageManifestMap[akyoId];
            if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
            return `images/${v}${getAssetsVersionSuffix()}`;
        }
    } catch (_) {}
    // まずURLマッピングから探す
    if (akyoImageUrls[akyoId]) {
        return akyoImageUrls[akyoId];
    }
    // マニフェストから探す
    if (akyoImageManifestMap && akyoImageManifestMap[akyoId]) {
        const val = akyoImageManifestMap[akyoId];
        if (typeof val === 'string') {
            // 1) フルURL
            if (/^https?:\/\//.test(val)) return val;
            // 2) 先頭がスラッシュ、または既に images/ を含む相対パス
            if (val.startsWith('/') || val.startsWith('images/')) {
                return `${val}${getAssetsVersionSuffix()}`;
            }
            // 3) 純粋なファイル名
            return `images/${val}${getAssetsVersionSuffix()}`;
        }
    }

    // R2直URL（強制フォールバック）
    try {
        if (PUBLIC_R2_BASE) {
            return `${PUBLIC_R2_BASE}/${akyoId}.webp${getAssetsVersionSuffix()}`;
        }
    } catch (_) {}

    // 次にローカルストレージから探す
    const savedImages = localStorage.getItem('akyoImages');
    if (savedImages) {
        const imageDataMap = JSON.parse(savedImages);
        if (imageDataMap[akyoId]) {
            return imageDataMap[akyoId];
        }
    }

    // 最後のフォールバック: デプロイ先の静的フォルダ images/{id}.webp
    return `images/${akyoId}.webp${getAssetsVersionSuffix()}`;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { akyoImageUrls, setupLazyLoading, getAkyoImageUrl, loadImagesManifest };
}
