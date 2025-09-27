// image-manifest-loader.js
// WebP/PNG/JPG を含む画像マニフェストをロードして、先頭3桁ID => URL/ファイル名のマップを作成
// - 入力形：配列 / { files: [...] } / { map: {...} } / プレーンマップ に対応
// - 候補にバージョン(例: 001_zzzz.webp, 001-2024a.webp)があれば “より新しい” ものを採用
// - 配列要素がフルURLでもファイル名でもOK（末尾のファイル名から抽出）

(function () {
  const ENTRY_PATTERN = /^(\d{3})(?:[_-]([0-9a-z-]+))?/i;

  function normalizeVersionToken(token) {
    return String(token || "").toLowerCase();
  }

  function parseVersionScore(token) {
    if (!token) return null;
    const value = parseInt(token, 36);
    if (!Number.isNaN(value)) return value;
    return null;
  }

  /**
   * @returns 1: next > current / -1: next < current / 0: equal
   */
  function compareVersions(nextToken, currentToken) {
    const next = normalizeVersionToken(nextToken);
    const current = normalizeVersionToken(currentToken);
    if (next === current) return 0;

    const nextScore = parseVersionScore(next);
    const currentScore = parseVersionScore(current);

    // どちらも base36 として解釈できる場合は数値比較
    if (typeof nextScore === "number" && typeof currentScore === "number") {
      if (nextScore === currentScore) return 0;
      return nextScore > currentScore ? 1 : -1;
    }

    // 片方のみトークンを持つなら “持っている方” を新しいとみなす
    if (next && !current) return 1;
    if (!next && current) return -1;

    // 文字列比較のフォールバック
    if (next && current) {
      const lexical = next.localeCompare(current);
      if (lexical !== 0) return lexical > 0 ? 1 : -1;
    }
    return 0;
  }

  /**
   * 任意の raw 値（URL / パス / ファイル名）から ID とバージョンを抽出
   */
  function extractImageEntryInfo(rawValue) {
    const original = String(rawValue || "");
    if (!original) return null;

    // ?以降は無視
    const withoutQuery = original.split("?")[0];
    // 末尾のファイル名を抽出（フルURLでもOK）
    const filename = (withoutQuery.split("/").pop() || "").trim();

    // ファイル名から ID / バージョンを抽出
    const match = filename.match(ENTRY_PATTERN);
    if (!match) return null;

    const [, id, versionToken] = match;
    return {
      id,
      versionToken: normalizeVersionToken(versionToken),
      value: original,
    };
  }

  /**
   * 候補値を既存マップへ反映。候補がより新しければ置き換える。
   * - candidateValue がオブジェクトなら {url|href|path|value} をソースとして扱う
   * - fallbackId が与えられ、候補から ID が取れない場合はそれを使用
   */
  function updateManifestEntry(map, candidateValue, fallbackId) {
    if (candidateValue && typeof candidateValue === "object") {
      const { url, href, path, value } = candidateValue;
      candidateValue = url || href || path || value;
    }
    if (!candidateValue) return;

    const candidateInfo = extractImageEntryInfo(candidateValue);
    const fallbackKey = String(fallbackId || "").trim();

    let candidateId = candidateInfo ? candidateInfo.id : "";
    if (!candidateId && fallbackKey) {
      // 明示IDが数値なら 3 桁ゼロ詰め
      if (/^\d+$/.test(fallbackKey)) {
        candidateId = fallbackKey.padStart(3, "0").slice(-3);
      } else {
        candidateId = fallbackKey;
      }
    }
    if (!candidateId) return;

    const currentValue = map[candidateId];
    if (!currentValue) {
      map[candidateId] = candidateValue;
      return;
    }

    // 既存 or 候補のどちらかがパース不能なら、情報量の多い（=パースできた）方を優先
    const currentInfo = extractImageEntryInfo(currentValue);
    if (!candidateInfo && !currentInfo) {
      // どちらも判定できない場合は上書きしない
      return;
    }
    if (candidateInfo && !currentInfo) {
      map[candidateId] = candidateValue;
      return;
    }
    if (!candidateInfo && currentInfo) {
      return;
    }

    // どちらも判定できる → バージョン比較で新しければ採用
    if (compareVersions(candidateInfo.versionToken, currentInfo.versionToken) > 0) {
      map[candidateId] = candidateValue;
    }
  }

  function normalizeMapFromList(list, map) {
    (list || []).forEach((entry) => updateManifestEntry(map, entry));
  }

  function normalizeMapFromObject(obj, map) {
    Object.entries(obj || {}).forEach(([id, value]) => {
      updateManifestEntry(map, value, id);
    });
  }

  /**
   * 受け取った manifest を統一的に { "001": "<url or filename>", ... } へ正規化
   */
  function normalizeManifest(manifest) {
    const map = {};
    if (!manifest) return map;

    if (Array.isArray(manifest)) {
      normalizeMapFromList(manifest, map);
      return map;
    }

    if (manifest && typeof manifest === "object") {
      if (Array.isArray(manifest.files)) {
        normalizeMapFromList(manifest.files, map);
      }

      if (manifest.map && typeof manifest.map === "object") {
        normalizeMapFromObject(manifest.map, map);
        return map;
      }

      // プレーンマップの可能性に対応（予約キーは除外）
      const RESERVED_KEYS = new Set(["files", "map", "version", "v"]);
      const plainEntries = {};
      Object.keys(manifest).forEach((key) => {
        if (!RESERVED_KEYS.has(key)) {
          plainEntries[key] = manifest[key];
        }
      });
      if (Object.keys(plainEntries).length) {
        normalizeMapFromObject(plainEntries, map);
      }
    }

    return map;
  }

  async function tryFetchJson(url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  async function loadAkyoManifest() {
    // 1) /api/manifest を優先（フルURLも許容）
    let manifest = await tryFetchJson("/api/manifest");
    let map = normalizeManifest(manifest);

    // 2) フォールバック: images/manifest.json
    if (!Object.keys(map).length) {
      const fallbackManifest = await tryFetchJson("images/manifest.json");
      if (fallbackManifest) {
        manifest = fallbackManifest;
        map = normalizeManifest(fallbackManifest);
      }
    }

    // グローバルへ反映
    if (typeof window !== "undefined") {
      window.akyoImageManifestMap = map;

      // バージョン連携（安定化）
      try {
        const current = localStorage.getItem("akyoAssetsVersion");
        const manifestVer = (manifest && (manifest.version || manifest.v)) || "";
        // 1) マニフェストに version があれば採用
        // 2) 無ければ既存値を維持
        // 3) それも無ければ '1'
        const ver = String(manifestVer || current || "1");
        localStorage.setItem("akyoAssetsVersion", ver);
      } catch (_) {}
    }
    return map;
  }

  // export
  if (typeof window !== "undefined") {
    window.loadAkyoManifest = loadAkyoManifest;
  }
})();
