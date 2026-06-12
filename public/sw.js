const CACHE_VERSION = 'compcheck-shell-v18';
const CACHE_PREFIX = 'compcheck-';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetchNavigation(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => (
      cachedResponse || fetch(request).then((networkResponse) => cacheResponse(request, networkResponse))
    ))
  );
});

function fetchNavigation(request) {
  return fetch(request)
    .then((networkResponse) => cacheResponse('./index.html', networkResponse))
    .catch(() => caches.match('./index.html'));
}

function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const responseCopy = response.clone();
  caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseCopy));
  return response;
}
