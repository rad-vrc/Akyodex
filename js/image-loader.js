// Akyo画像データマッピング
// 画像URLとAkyoIDの対応表
// 画像マニフェスト（images/manifest.json）からのマッピング
// 形式1: { "map": { "001": "001オリジン.png", ... } }
// 形式2: { "files": ["001オリジン.png", ...] }
// 形式3: ["001オリジン.png", ...]
let akyoImageManifestMap = {};
const PUBLIC_R2_BASE = 'https://images.akyodex.com';
const VRCHAT_PROXY_ENDPOINT = '/api/vrc-avatar-image';

function getAssetsVersionValue() {
    try {
        return localStorage.getItem('akyoAssetsVersion') || localStorage.getItem('akyoDataVersion') || '';
    } catch (_) {
        return '';
    }
}

function extractImageEntryInfo(rawValue, explicitId) {
    const value = String(rawValue || '');
    const noQuery = value.split('?')[0];
    const parts = noQuery.split('/');
    const filename = parts[parts.length - 1] || '';
    let id = '';
    let versionStr = '';
    const match = filename.match(/^(\d{3})(?:_([0-9a-z]+))?/i);
    if (match) {
        id = match[1];
        if (match[2]) {
            versionStr = match[2].toLowerCase();
        }
    }
    if (explicitId) {
        id = String(explicitId).padStart(3, '0');
    }
    let versionNum = null;
    if (versionStr) {
        const parsed = parseInt(versionStr, 36);
        if (!Number.isNaN(parsed)) {
            versionNum = parsed;
        }
    }
    return {
        raw: value,
        id,
        hasVersion: Boolean(versionStr),
        versionStr,
        versionNum,
    };
}

function shouldPreferCandidate(currentInfo, candidateInfo) {
    if (!candidateInfo || !candidateInfo.id) return false;
    if (!currentInfo || !currentInfo.id) return true;
    if (candidateInfo.id !== currentInfo.id) return false;

    if (candidateInfo.hasVersion && !currentInfo.hasVersion) return true;
    if (!candidateInfo.hasVersion && currentInfo.hasVersion) return false;

    if (candidateInfo.hasVersion && currentInfo.hasVersion) {
        if (candidateInfo.versionNum !== null && currentInfo.versionNum !== null) {
            if (candidateInfo.versionNum > currentInfo.versionNum) return true;
            if (candidateInfo.versionNum < currentInfo.versionNum) return false;
        } else if (candidateInfo.versionStr > currentInfo.versionStr) {
            return true;
        } else if (candidateInfo.versionStr < currentInfo.versionStr) {
            return false;
        }
    }

    return true; // 同じ情報の場合は後勝ち（最新を優先）
}

function updateManifestEntry(map, rawValue, explicitId) {
    const candidateInfo = extractImageEntryInfo(rawValue, explicitId);
    if (!candidateInfo.id) return;
    const currentRaw = map[candidateInfo.id];
    if (!currentRaw) {
        map[candidateInfo.id] = candidateInfo.raw;
        return;
    }
    const currentInfo = extractImageEntryInfo(currentRaw, candidateInfo.id);
    if (shouldPreferCandidate(currentInfo, candidateInfo)) {
        map[candidateInfo.id] = candidateInfo.raw;
    }
}

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
            data.forEach(name => updateManifestEntry(map, name));
        } else if (data && Array.isArray(data.files)) {
            data.files.forEach(name => updateManifestEntry(map, name));
        } else if (data && data.map && typeof data.map === 'object') {
            Object.entries(data.map).forEach(([key, value]) => {
                const id = String(key).padStart(3, '0');
                updateManifestEntry(map, value, id);
            });
        } else if (data && typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                const id = String(key).padStart(3, '0');
                updateManifestEntry(map, value, id);
            });
        }
        akyoImageManifestMap = map;
        return Object.keys(akyoImageManifestMap).length > 0;
    } catch (_) {
        return false;
    }
}

function getAssetsVersionSuffix() {
    const v = getAssetsVersionValue();
    return v ? `?v=${encodeURIComponent(v)}` : '';
}

function findAkyoRecord(akyoId) {
    if (typeof window === 'undefined') return null;
    const id3 = String(akyoId || '').padStart(3, '0');

    if (!window.__akyoRecordCache) {
        Object.defineProperty(window, '__akyoRecordCache', {
            value: {},
            enumerable: false,
            configurable: true,
            writable: true,
        });
    }

    const cache = window.__akyoRecordCache;
    if (Object.prototype.hasOwnProperty.call(cache, id3)) {
        return cache[id3];
    }

    const candidates = [
        window.publicAkyoList,
        window.adminAkyoRecords,
        window.akyoData,
    ];

    for (const source of candidates) {
        if (Array.isArray(source)) {
            const hit = source.find(entry => String(entry?.id || '').padStart(3, '0') === id3);
            if (hit) {
                cache[id3] = hit;
                return hit;
            }
        }
    }

    cache[id3] = null;
    return null;
}

function extractAvatarIdFromRecord(record) {
    if (!record) return null;
    const avatarUrl = record.avatarUrl || record.avatarURL || '';
    const match = String(avatarUrl).match(/avtr_[A-Za-z0-9-]+/);
    return match ? match[0] : null;
}

function buildVrchatProxyUrl(avtrId, size, version) {
    const params = new URLSearchParams();
    params.set('avtr', avtrId);
    params.set('w', String(size));
    if (version) params.set('v', version);
    return `${VRCHAT_PROXY_ENDPOINT}?${params.toString()}`;
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
function getAkyoImageUrl(akyoIdLike, options = {}) {
    const akyoId = String(akyoIdLike || '').padStart(3, '0');
    const size = Math.max(32, Math.min(4096, parseInt(options.size || '512', 10) || 512));
    const versionValue = getAssetsVersionValue();
    const versionSuffix = versionValue ? `?v=${encodeURIComponent(versionValue)}` : '';

    // まずwindowにロードされたマニフェストを優先
    try {
        if (typeof window !== 'undefined' && window.akyoImageManifestMap && window.akyoImageManifestMap[akyoId]) {
            const v = window.akyoImageManifestMap[akyoId];
            if (typeof v === 'string' && /^https?:\/\//.test(v)) {
                return versionValue && !/[?&]v=/.test(v) ? `${v}${v.includes('?') ? '&' : '?'}v=${encodeURIComponent(versionValue)}` : v;
            }
            return `images/${v}${versionSuffix}`;
        }
    } catch (_) {}
    // マニフェストから探す
    if (akyoImageManifestMap && akyoImageManifestMap[akyoId]) {
        const val = akyoImageManifestMap[akyoId];
        if (typeof val === 'string') {
            // 1) フルURL
            if (/^https?:\/\//.test(val)) {
                return versionValue && !/[?&]v=/.test(val) ? `${val}${val.includes('?') ? '&' : '?'}v=${encodeURIComponent(versionValue)}` : val;
            }
            // 2) 先頭がスラッシュ、または既に images/ を含む相対パス
            if (val.startsWith('/') || val.startsWith('images/')) {
                return `${val}${versionSuffix}`;
            }
            // 3) 純粋なファイル名
            return `images/${val}${versionSuffix}`;
        }
    }

    // 次にローカルストレージから探す
    try {
        const savedImages = localStorage.getItem('akyoImages');
        if (savedImages) {
            const imageDataMap = JSON.parse(savedImages);
            if (imageDataMap[akyoId]) {
                return imageDataMap[akyoId];
            }
        }
    } catch (_) {}

    // VRChat直リンクにフォールバック
    try {
        const record = findAkyoRecord(akyoId);
        const avtrId = extractAvatarIdFromRecord(record);
        if (avtrId) {
            return buildVrchatProxyUrl(avtrId, size, versionValue);
        }
    } catch (_) {}

    // R2直URL（最後の手段）
    try {
        if (PUBLIC_R2_BASE) {
            return `${PUBLIC_R2_BASE}/${akyoId}.webp${versionSuffix}`;
        }
    } catch (_) {}

    // 最後のフォールバック: デプロイ先の静的フォルダ images/{id}.webp
    return `images/${akyoId}.webp${versionSuffix}`;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupLazyLoading, getAkyoImageUrl, loadImagesManifest };
}

if (typeof window !== 'undefined') {
    window.loadImagesManifest = loadImagesManifest;
    window.getAkyoImageUrl = getAkyoImageUrl;
}
