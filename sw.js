const PRECACHE = 'akyo-precache-v8';
const CSS_VERSION = '20250927';
const THEME_BACKGROUND = './images/akyo-bg.webp';
let precacheUrlList = null;
let precacheUrlSet = null;

function getScope() {
  return (self.registration && self.registration.scope) || self.location.href;
}

function buildPrecacheUrls() {
  const scope = getScope();

  const currentCssAssets = CSS_VERSION
    ? [`./css/kid-friendly.css?v=${CSS_VERSION}`]
    : ['./css/kid-friendly.css'];
  const legacyCssAssets = CSS_VERSION ? ['./css/kid-friendly.css'] : [];

  const currentBackgroundAssets = CSS_VERSION
    ? [`${THEME_BACKGROUND}?v=${CSS_VERSION}`]
    : [THEME_BACKGROUND];
  const legacyBackgroundAssets = CSS_VERSION ? [THEME_BACKGROUND] : [];

  const coreAssets = [
    './',
    './index.html',
    './admin.html',
    './logo-upload.html',
    ...currentCssAssets,
    './js/storage-manager.js',
    './js/storage-adapter.js',
    './js/image-manifest-loader.js',
    './js/image-loader.js',
    './js/main.js',
    './js/admin.js',
    './images/logo.webp',
    ...currentBackgroundAssets,
  ];

  const supplementalAssets = [...legacyCssAssets, ...legacyBackgroundAssets];

  return [...coreAssets, ...supplementalAssets].map((path) =>
    new URL(path, scope).toString()
  );
}

function getPrecacheUrls() {
  if (!precacheUrlList) {
    precacheUrlList = buildPrecacheUrls();
    precacheUrlSet = new Set(precacheUrlList);
  }
  return precacheUrlList;
}

function getPrecacheUrlSet() {
  if (!precacheUrlSet) {
    getPrecacheUrls();
  }
  return precacheUrlSet;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(getPrecacheUrls()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('akyo-precache-') && key !== PRECACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // クロスオリジン（R2等）はSWで触らない
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';

  // 1) HTMLはネットワーク優先＋必ずフォールバックを返す
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith((async () => {
      try {
        // 直取り（最新を優先）
        return await fetch(req);
      } catch (_) {
        // キャッシュ→index.htmlの順に保険
        const cache = await caches.open(PRECACHE);
        const scope = getScope();
        const cached = (await cache.match(req))
          || (await cache.match(new URL('./index.html', scope).toString()))
          || (await cache.match(new URL('./', scope).toString()));
        if (cached) return cached;
        // どうしても無い場合は空HTMLを返して ERR_FAILED を回避
        return new Response('<!doctype html><title>offline</title>', {
          headers: { 'content-type': 'text/html; charset=utf-8' },
          status: 200,
        });
      }
    })());
    return;
  }

  // 1.5) 画像マニフェストは常に最新を優先（SWキャッシュに阻害されないよう特別扱い）
  if (url.pathname === '/images/manifest.json') {
    event.respondWith((async () => {
      const cache = await caches.open(PRECACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await cache.match(req);
        return cached || new Response(JSON.stringify({ map: {}, version: Date.now() }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        });
      }
    })());
    return;
  }

  // 1.6) CSVは常にネットワーク優先（最新版を即時反映）
  if (url.pathname === '/data/akyo-data.csv' || url.pathname === '/api/csv') {
    event.respondWith((async () => {
      const cache = await caches.open(PRECACHE);
      try {
        const fresh = await fetch(new Request(req, { cache: 'no-cache' }));
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await cache.match(req);
        return cached || new Response('', { status: 204 });
      }
    })());
    return;
  }

  // 2) APIはネットワーク優先（キャッシュしない）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'content-type': 'application/json' },
        status: 503,
      }))
    );
    return;
  }

  // 3) 画像/CSS/JS等はキャッシュ優先＋ネットワーク、最後にフォールバック
  event.respondWith((async () => {
    const cache = await caches.open(PRECACHE);
    const hit = await cache.match(req);
    if (hit) {
      event.waitUntil(updateCache(cache, req));
      return hit;
    }
    try {
      const net = await fetch(req);
      if (net && net.ok) await cache.put(req, net.clone());
      return net;
    } catch (_) {
      const scope = getScope();
      const fallback = (await cache.match(new URL('./index.html', scope).toString()))
        || (await cache.match(new URL('./', scope).toString()));
      return fallback || new Response('', { status: 204 });
    }
  })());
});

function handleNavigationRequest(event) {
  const { request } = event;

  event.respondWith(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        event.waitUntil(updateCache(cache, request));
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const scope = getScope();
        const fallbacks = [
          new URL('./index.html', scope).toString(),
          new URL('./', scope).toString(),
        ];

        for (const fallback of fallbacks) {
          const match = await cache.match(fallback);
          if (match) {
            return match;
          }
        }

        return Response.error();
      }
    })()
  );
}

function respondWithCacheFirst(event) {
  const { request } = event;

  event.respondWith(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        event.waitUntil(updateCache(cache, request));
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const fallback = await cache.match(request);
        return fallback || Response.error();
      }
    })()
  );
}

async function updateCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
  } catch (error) {
    // Ignore network errors during background update
  }
}
