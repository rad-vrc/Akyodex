// image-manifest-loader.js
// WebP/PNG/JPG を含む画像マニフェストをロードして、先頭3桁ID => URL/ファイル名のマップを作成

(function(){
  function normalizeMapFromList(list){
    const map = {};
    (list || []).forEach((name) => {
      const n = String(name || '');
      const m = n.match(/^(\d{3})/);
      if (m){ const id = m[1]; if (!map[id]) map[id] = n; }
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
        map = { ...manifest.map };
      } else if (manifest && typeof manifest === 'object'){
        // APIが { "001": "https://.../001.webp", ... } のようなプレーンマップを返す場合
        map = { ...manifest };
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
          map = { ...manifest.map };
        }
      }
    }

    // グローバルへ反映
    if (typeof window !== 'undefined'){
      window.akyoImageManifestMap = map;
      // バージョン連携（任意）
      try {
        const ver = (manifest && (manifest.version || manifest.v)) || Date.now().toString();
        localStorage.setItem('akyoAssetsVersion', String(ver));
      } catch(_){ }
    }
    return map;
  }

  // export
  if (typeof window !== 'undefined'){
    window.loadAkyoManifest = loadAkyoManifest;
  }
})();


