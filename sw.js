const PRECACHE = 'akyo-precache-v3';
let precacheUrlList = null;
let precacheUrlSet = null;

function getScope() {
  return (self.registration && self.registration.scope) || self.location.href;
}

function buildPrecacheUrls() {
  const scope = getScope();
  const coreAssets = [
    './',
    './index.html',
    './admin.html',
    './logo-upload.html',
    './css/kid-friendly.css',
    './js/storage-manager.js',
    './js/storage-adapter.js',
    './js/image-manifest-loader.js',
    './js/image-loader.js',
    './js/main.js',
    './js/admin.js',
    './data/akyo-data.csv',
    './images/logo.webp',
    './images/profileIcon.webp',
  ];

  return coreAssets.map((path) => new URL(path, scope).toString());
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
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    handleNavigationRequest(event);
    return;
  }

  const precacheSet = getPrecacheUrlSet();
  if (precacheSet.has(url.toString())) {
    respondWithCacheFirst(event);
  }
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
