// image-manifest-loader.js
// WebP/PNG/JPG を含む画像マニフェストをロードして、先頭3桁ID => URL/ファイル名のマップを作成

(function(){
  function extractImageEntryInfo(rawValue, explicitId){
    const value = String(rawValue || '');
    const noQuery = value.split('?')[0];
    const parts = noQuery.split('/');
    const filename = parts[parts.length - 1] || '';
    let id = '';
    let versionStr = '';
    const match = filename.match(/^(\d{3})(?:_([0-9a-z]+))?/i);
    if (match){
      id = match[1];
      if (match[2]){
        versionStr = match[2].toLowerCase();
      }
    }
    if (explicitId){
      id = String(explicitId).padStart(3, '0');
    }
    let versionNum = null;
    if (versionStr){
      const parsed = parseInt(versionStr, 36);
      if (!Number.isNaN(parsed)){
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

  function shouldPreferCandidate(currentInfo, candidateInfo){
    if (!candidateInfo || !candidateInfo.id) return false;
    if (!currentInfo || !currentInfo.id) return true;
    if (candidateInfo.id !== currentInfo.id) return false;

    if (candidateInfo.hasVersion && !currentInfo.hasVersion) return true;
    if (!candidateInfo.hasVersion && currentInfo.hasVersion) return false;

    if (candidateInfo.hasVersion && currentInfo.hasVersion){
      if (candidateInfo.versionNum !== null && currentInfo.versionNum !== null){
        if (candidateInfo.versionNum > currentInfo.versionNum) return true;
        if (candidateInfo.versionNum < currentInfo.versionNum) return false;
      } else if (candidateInfo.versionStr > currentInfo.versionStr){
        return true;
      } else if (candidateInfo.versionStr < currentInfo.versionStr){
        return false;
      }
    }

    return true; // デフォルトは候補を優先（最新を採用）
  }

  function updateManifestEntry(map, rawValue, explicitId){
    const candidateInfo = extractImageEntryInfo(rawValue, explicitId);
    if (!candidateInfo.id) return;
    const currentRaw = map[candidateInfo.id];
    if (!currentRaw){
      map[candidateInfo.id] = candidateInfo.raw;
      return;
    }
    const currentInfo = extractImageEntryInfo(currentRaw, candidateInfo.id);
    if (shouldPreferCandidate(currentInfo, candidateInfo)){
      map[candidateInfo.id] = candidateInfo.raw;
    }
  }

  function normalizeMapFromList(list){
    const map = {};
    (list || []).forEach((name) => {
      updateManifestEntry(map, name);
    });
    return map;
  }

  async function tryFetchJson(url){
    try{
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      return await res.json();
    }catch(_){ return null; }
  }

  async function loadAkyoManifest(){
    // 1) /api/manifest を優先（フルURLも許容）
    let manifest = await tryFetchJson('/api/manifest');
    let map = {};
    if (manifest){
      if (Array.isArray(manifest)){
        map = normalizeMapFromList(manifest);
      } else if (Array.isArray(manifest.files)){
        map = normalizeMapFromList(manifest.files);
      } else if (manifest.map && typeof manifest.map === 'object'){
        const temp = {};
        Object.entries(manifest.map).forEach(([key, value]) => {
          const id = String(key).padStart(3, '0');
          updateManifestEntry(temp, value, id);
        });
        map = temp;
      } else if (manifest && typeof manifest === 'object'){
        // APIが { "001": "https://.../001.webp", ... } のようなプレーンマップを返す場合
        const temp = {};
        Object.entries(manifest).forEach(([key, value]) => {
          const id = String(key).padStart(3, '0');
          updateManifestEntry(temp, value, id);
        });
        map = temp;
      }
    }

    // 2) フォールバック: images/manifest.json
    if (!Object.keys(map).length){
      manifest = await tryFetchJson('images/manifest.json');
      if (manifest){
        if (Array.isArray(manifest)){
          map = normalizeMapFromList(manifest);
        } else if (Array.isArray(manifest.files)){
          map = normalizeMapFromList(manifest.files);
        } else if (manifest.map && typeof manifest.map === 'object'){
          const temp = {};
          Object.entries(manifest.map).forEach(([key, value]) => {
            const id = String(key).padStart(3, '0');
            updateManifestEntry(temp, value, id);
          });
          map = temp;
        }
      }
    }

    // グローバルへ反映
    if (typeof window !== 'undefined'){
      window.akyoImageManifestMap = map;
      // バージョン連携（安定化）
      try {
        const current = localStorage.getItem('akyoAssetsVersion');
        const manifestVer = (manifest && (manifest.version || manifest.v)) || '';
        // 1) マニフェストにversionがあれば採用
        // 2) 無ければ既存値を維持
        // 3) それも無ければ '1' を使用（時間依存の値は使わない）
        const ver = String(manifestVer || current || '1');
        localStorage.setItem('akyoAssetsVersion', ver);
      } catch(_){ }
    }
    return map;
  }

  // export
  if (typeof window !== 'undefined'){
    window.loadAkyoManifest = loadAkyoManifest;
  }
})();


