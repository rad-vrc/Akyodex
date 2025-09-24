const PRECACHE = 'akyo-precache-v1';
const PRECACHE_URLS = [
  '/',
  '/images/logo.webp',
  '/images/profileIcon.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== PRECACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Cache-first for icons; network-first fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isIcon = url.pathname.endsWith('/images/logo.webp') || url.pathname.endsWith('/images/profileIcon.webp');
  if (isIcon) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(PRECACHE).then((c) => c.put(req, resClone));
        return res;
      }))
    );
  }
});


