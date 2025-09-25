const PRECACHE = 'akyo-precache-v2';

function getPrecacheUrls() {
  const scope = (self.registration && self.registration.scope) || self.location.href;
  return [
    new URL('./', scope).toString(),
    new URL('./index.html', scope).toString(),
    new URL('./images/logo.webp', scope).toString(),
    new URL('./images/profileIcon.webp', scope).toString(),
  ];
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

  const scope = (self.registration && self.registration.scope) || self.location.href;
  const logoPath = new URL('./images/logo.webp', scope).pathname;
  const profilePath = new URL('./images/profileIcon.webp', scope).pathname;
  const isIconRequest = url.pathname === logoPath || url.pathname === profilePath;

  if (!isIconRequest) {
    return;
  }

  event.respondWith(handleIconRequest(event));
});

async function handleIconRequest(event) {
  const { request } = event;
  const cache = await caches.open(PRECACHE);
  const cachedResponse = await cache.match(request);

  const networkFetch = (async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return undefined;
    }
  })();

  if (cachedResponse) {
    event.waitUntil(networkFetch);
    return cachedResponse;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  return Response.error();
}
