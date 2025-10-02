(() => {
  const dbg = (...a) => {
    try {
      if (window && window.console && console.debug)
        console.debug("[mini-bg]", ...a);
    } catch (_) {}
  };
  // 全体の出現頻度ブースト（1=従来）。リクエストに合わせて1.5倍へ。
  const FreqBoost = 1.5;
  const Candidates = [
    // 本番の実体（R2 直下）を最優先
    "https://images.akyodex.com/miniakyo.webp",
    "https://images.akyodex.com/@miniakyo.webp",
    // R2 images/ 下パターン
    "https://images.akyodex.com/images/miniakyo.webp",
    "https://images.akyodex.com/images/@miniakyo.webp",
    // 相対（Pages/ローカル）
    "images/miniakyo.webp",
    "images/@miniakyo.webp",
  ];

  function getVersionSuffix() {
    try {
      const href = typeof window !== "undefined" ? window.location.href : "";
      const params = new URL(href).searchParams;
      const force = params.get("reloadBg") === "1" || params.has("nocache");
      const base =
        localStorage.getItem("akyoAssetsVersion") ||
        localStorage.getItem("akyoDataVersion") ||
        "1";
      const bump = force ? `.${Date.now().toString(36)}` : "";
      return `?v=${encodeURIComponent(base + bump)}`;
    } catch (_) {
      return "";
    }
  }

  function applyVersion(path, ver) {
    if (!ver) return path;
    if (path.includes("?")) {
      return path + ver.replace("?", "&");
    }
    return path + ver;
  }

  function probeImage(url, timeout = 8000) {
    if (typeof Image === "undefined") {
      return Promise.reject(new Error("Image unavailable"));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;
      const finalize = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = img.onerror = null;
        img.src = "";
        if (ok) {
          resolve(url);
        } else {
          reject(new Error("load failed"));
        }
      };
      const timer = setTimeout(() => finalize(false), timeout);
      img.decoding = "async";
      img.loading = "eager";
      img.onload = () => finalize(true);
      img.onerror = () => finalize(false);
      img.src = url;
    });
  }

  async function resolveMiniAkyoUrl() {
    try {
      const m =
        typeof window !== "undefined" && window.akyoImageManifestMap
          ? window.akyoImageManifestMap
          : null;
      const ver = getVersionSuffix();
      if (m && m.miniAkyo) {
        const url = applyVersion(m.miniAkyo, ver);
        dbg("manifest miniAkyo hit:", url);
        return url;
      }
    } catch (_) {}
    const ver = getVersionSuffix();

    const Acceptable = new Set([200, 203, 204, 206, 304]);
    let fallback = null;
    for (const path of Candidates) {
      // ?v= の連結は '?' 有無に応じて安全に
      const candidate = applyVersion(path, ver);
      if (!fallback) fallback = candidate;
      try {
        const r = await fetch(candidate, { cache: "no-cache" });
        if (
          r.ok ||
          Acceptable.has(r.status) ||
          (r.type === "opaque" && !r.status)
        ) {
          dbg("fetch ok:", candidate);
          return candidate;
        }
        // fetchがCDN設定で弾かれるケース向けにImageプローブを試みる
        try {
          const okUrl = await probeImage(candidate);
          dbg("probe ok:", okUrl);
          return okUrl;
        } catch (_) {
          /* fall through */
        }
      } catch (_) {
        // fetch自体が失敗でも最終的にfallbackで返す
        try {
          const okUrl = await probeImage(candidate);
          dbg("probe ok after fetch fail:", okUrl);
          return okUrl;
        } catch (__) {
          /* continue */
        }
      }
    }
    return fallback;
  }

  function ensureStyles() {
    if (document.getElementById("miniAkyoBgStyles")) return;
    const css = `
#miniAkyoBg{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;z-index:0}
.mini-akyo{position:absolute;bottom:-12%;background-size:contain;background-repeat:no-repeat;opacity:var(--opacity,0.35);width:var(--size,96px);height:var(--size,96px);left:var(--left,50vw);animation:akyo-float-up var(--duration,22s) linear infinite;will-change:transform,opacity;filter:drop-shadow(0 3px 10px rgba(0,0,0,.35))}
@keyframes akyo-float-up{0%{transform:translateY(0) rotate(var(--rotate,0deg));opacity:var(--opacity,0.35)}100%{transform:translateY(-120vh) rotate(calc(var(--rotate,0deg) + 360deg));opacity:0}}
`;
    const style = document.createElement("style");
    style.id = "miniAkyoBgStyles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createHost() {
    let host = document.getElementById("miniAkyoBg");
    if (!host) {
      host = document.createElement("div");
      host.id = "miniAkyoBg";
      host.setAttribute("aria-hidden", "true");
      document.body.prepend(host);
    }
    return host;
  }

  // 左右偏りを抑えるための低差異シーケンス（黄金比擬似乱数）
  let __seqU = Math.random();
  const Phi = 0.618_033_988_749_894_9; // (sqrt(5)-1)/2
  function nextUniform() {
    __seqU = (__seqU + Phi) % 1;
    return __seqU;
  }
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function spawnOne(host, url, uOverride) {
    const el = document.createElement("div");
    el.className = "mini-akyo";

    const size = Math.round(64 + Math.random() * 96); // 64-160px
    const u = typeof uOverride === "number" ? uOverride : nextUniform();
    const leftVw = clamp(u * 100, 2, 98);
    const duration = 18 + Math.random() * 14; // 18-32s
    const delay = Math.random() * 8; // 0-8s
    const opacity = 0.24 + Math.random() * 0.18; // 0.24-0.42
    const drift = Math.random() * 40 - 20;

    el.style.setProperty("--size", size + "px");
    el.style.setProperty("--left", `calc(${leftVw}vw + ${drift}px)`);
    el.style.setProperty("--opacity", String(opacity));
    el.style.setProperty("--duration", duration + "s");
    el.style.animationDuration = duration + "s";
    el.style.animationDelay = delay + "s";
    el.style.backgroundImage = `url("${url}")`;

    const rotate = Math.random() * 40 - 20;
    el.style.setProperty("--rotate", rotate + "deg");
    el.style.transform = `translateY(0) rotate(${rotate}deg)`;
    el.style.opacity = String(opacity);

    el.addEventListener("animationend", () => {
      el.remove();
    });
    host.appendChild(el);
  }

  let initializing = false;
  let maintainTimer = null;
  let resizeHandler = null;

  async function initMiniAkyoBackground(force) {
    if (initializing) return;
    initializing = true;
    try {
      ensureStyles();
      const url = await resolveMiniAkyoUrl();
      if (!url) return;
      const host = createHost();

      if (!force && host.children.length > 0) return;

      // 初期クリア（再初期化時の重複防止）
      while (host.firstChild) host.removeChild(host.firstChild);

      // 初期密度: 画面サイズから自動算出 → 1.5倍ブースト（リクエスト対応）。
      const side = Math.sqrt(window.innerWidth * window.innerHeight);
      let base = Math.round(side / 95); // 大きい画面は密度を上げる
      base = Math.min(28, Math.max(10, base));
      let initial = Math.round(base * FreqBoost);
      initial = Math.min(Math.round(28 * FreqBoost), Math.max(10, initial));
      try {
        const dens = Number.parseInt(
          new URLSearchParams(location.search).get("bgdensity") || "",
          10
        );
        if (!isNaN(dens) && dens >= 6 && dens <= 50) initial = dens;
      } catch (_) {}
      // ストラタム分割で均等配置（各スライス内にランダム）
      for (let i = 0; i < initial; i++) {
        const u = (i + Math.random()) / initial;
        spawnOne(host, url, u);
      }

      const targetDensity = initial;

      if (maintainTimer) clearInterval(maintainTimer);
      maintainTimer = setInterval(
        () => {
          const current = host.children.length;
          const deficit = targetDensity - current;
          const spawnCount =
            deficit > 0 ? Math.min(5, Math.max(1, deficit)) : 0; // 常に最低1体補充
          for (let i = 0; i < spawnCount; i++) spawnOne(host, url);
        },
        Math.round(1600 / FreqBoost)
      );

      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      resizeHandler = () => {
        const idealBase = Math.min(
          22,
          Math.max(10, Math.round(window.innerWidth / 110))
        );
        const ideal = Math.min(
          Math.round(22 * FreqBoost),
          Math.max(10, Math.round(idealBase * FreqBoost))
        );
        while (host.children.length > ideal) host.removeChild(host.firstChild);
      };
      window.addEventListener("resize", resizeHandler);
    } catch (_) {
    } finally {
      initializing = false;
    }
  }

  if (typeof window !== "undefined") {
    window.initMiniAkyoBackground = initMiniAkyoBackground;
    const start = () => {
      try {
        initMiniAkyoBackground();
      } catch (_) {}
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})();
