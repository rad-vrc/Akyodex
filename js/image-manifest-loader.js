// image-manifest-loader.js
// WebP/PNG/JPG を含む画像マニフェストをロードして、先頭3桁ID => URL/ファイル名のマップを作成

(function(){
  const ENTRY_PATTERN = /^(\d{3})(?:[_-]([0-9a-z-]+))?/i;

  function normalizeVersionToken(token){
    return String(token || '').toLowerCase();
  }

  function parseVersionScore(token){
    if (!token) return null;
    const value = parseInt(token, 36);
    if (!Number.isNaN(value)) return value;
    return null;
  }

  function compareVersions(nextToken, currentToken){
    const next = normalizeVersionToken(nextToken);
    const current = normalizeVersionToken(currentToken);
    if (next === current) return 0;

    const nextScore = parseVersionScore(next);
    const currentScore = parseVersionScore(current);

    if (typeof nextScore === 'number' && typeof currentScore === 'number'){
      if (nextScore === currentScore) return 0;
      return nextScore > currentScore ? 1 : -1;
    }

    if (next && !current) return 1;
    if (!next && current) return -1;

    if (next && current){
      const lexical = next.localeCompare(current);
      if (lexical !== 0) return lexical > 0 ? 1 : -1;
    }

    return 0;
  }

  function extractImageEntryInfo(rawValue){
    const original = String(rawValue || '');
    if (!original) return null;

    const withoutQuery = original.split('?')[0];
    const match = withoutQuery.match(ENTRY_PATTERN);
    if (!match) return null;

    const [, id, versionToken] = match;
    return {
      id,
      versionToken: normalizeVersionToken(versionToken),
      value: original,
    };
  }

  function updateManifestEntry(map, candidateValue, fallbackId){
    if (candidateValue && typeof candidateValue === 'object'){
      const { url, href, path, value } = candidateValue;
      candidateValue = url || href || path || value;
    }

    if (!candidateValue) return;

    const candidateInfo = extractImageEntryInfo(candidateValue);
    const fallbackKey = String(fallbackId || '').trim();
    let candidateId = candidateInfo ? candidateInfo.id : '';

    if (!candidateId && fallbackKey){
      if (/^\d+$/.test(fallbackKey)){
        candidateId = fallbackKey.padStart(3, '0').slice(-3);
      } else {
        candidateId = fallbackKey;
      }
    }
    if (!candidateId) return;

    const currentValue = map[candidateId];
    if (!currentValue){
      map[candidateId] = candidateValue;
      return;
    }

    if (!candidateInfo){
      // 既存値の方がメタ情報を多く持っている可能性があるので上書きしない
      return;
    }

    const currentInfo = extractImageEntryInfo(currentValue);
    if (!currentInfo){
      map[candidateId] = candidateValue;
      return;
    }

    if (compareVersions(candidateInfo.versionToken, currentInfo.versionToken) > 0){
      map[candidateId] = candidateValue;
    }
  }

  function normalizeMapFromList(list, map){
    (list || []).forEach((entry) => updateManifestEntry(map, entry));
  }

  function normalizeMapFromObject(obj, map){
    Object.entries(obj || {}).forEach(([id, value]) => {
      updateManifestEntry(map, value, id);
    });
  }

  function normalizeManifest(manifest){
    const map = {};

    if (!manifest) return map;

    if (Array.isArray(manifest)){
      normalizeMapFromList(manifest, map);
      return map;
    }

    if (manifest && typeof manifest === 'object'){
      if (Array.isArray(manifest.files)){
        normalizeMapFromList(manifest.files, map);
      }

      if (manifest.map && typeof manifest.map === 'object'){
        normalizeMapFromObject(manifest.map, map);
        return map;
      }

      const RESERVED_KEYS = new Set(['files', 'map', 'version', 'v']);
      const plainEntries = {};
      Object.keys(manifest).forEach((key) => {
        if (!RESERVED_KEYS.has(key)){
          plainEntries[key] = manifest[key];
        }
      });
      if (Object.keys(plainEntries).length){
        normalizeMapFromObject(plainEntries, map);
      }
    }

    return map;
  }

  async function tryFetchJson(url){
    try{
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      return await res.json();
    }catch(_){
      return null;
    }
  }

  async function loadAkyoManifest(){
    // 1) /api/manifest を優先（フルURLも許容）
    let manifest = await tryFetchJson('/api/manifest');
    let map = normalizeManifest(manifest);

    // 2) フォールバック: images/manifest.json
    if (!Object.keys(map).length){
      const fallbackManifest = await tryFetchJson('images/manifest.json');
      if (fallbackManifest){
        manifest = fallbackManifest;
        map = normalizeManifest(fallbackManifest);
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


