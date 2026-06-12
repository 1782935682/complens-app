const CACHE_VERSION = 'compcheck-shell-v23';
const RUNTIME_CACHE = 'compcheck-runtime-v23';
const IMAGE_CACHE = 'compcheck-images-v23';
const CACHE_PREFIX = 'compcheck-';
const ACTIVE_CACHES = new Set([CACHE_VERSION, RUNTIME_CACHE, IMAGE_CACHE]);

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon.svg',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS).then(() => warmAppShellBundles(cache)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(key))
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
    event.respondWith(staleWhileRevalidate('./index.html', request, CACHE_VERSION));
    return;
  }

  if (isOcrApi(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isAuthApi(url) || isUserDataApi(url)) {
    event.respondWith(networkOnlyJson(request));
    return;
  }

  if (isIngredientApi(url)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, CACHE_VERSION));
    return;
  }

  if (isStaticAppAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, request, CACHE_VERSION));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

function isIngredientApi(url) {
  return url.pathname.startsWith('/api/ingredients');
}

function isUserDataApi(url) {
  return url.pathname.startsWith('/api/user/');
}

function isAuthApi(url) {
  return url.pathname.startsWith('/api/auth/');
}

function isOcrApi(url) {
  return url.pathname.startsWith('/api/ocr');
}

function isImageRequest(request, url) {
  return request.destination === 'image'
    || /\.(?:png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

function isStaticAppAsset(request, url) {
  return ['script', 'style', 'worker', 'font', 'manifest'].includes(request.destination)
    || /\.(?:js|css|webmanifest|woff2?)$/i.test(url.pathname);
}

function warmAppShellBundles(cache) {
  return fetch('./index.html', { cache: 'no-cache' })
    .then((response) => (response?.ok ? cacheHtmlWithBundles(cache, './index.html', response) : undefined))
    .catch(() => undefined);
}

function extractAppShellBundleUrls(html) {
  const urls = [];
  const pattern = /(?:src|href)="([^"]+\.(?:js|css))"/g;
  let match = pattern.exec(html);
  while (match) {
    const url = match[1];
    if (url.startsWith('./') && !urls.includes(url)) urls.push(url);
    match = pattern.exec(html);
  }
  return urls;
}

function staleWhileRevalidate(cacheKey, request, cacheName) {
  return caches.open(cacheName).then((cache) => (
    cache.match(cacheKey).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse?.ok) {
            const cacheUpdate = shouldWarmBundlesBeforeCache(cacheKey)
              ? cacheHtmlWithBundles(cache, cacheKey, networkResponse)
              : cache.put(cacheKey, networkResponse.clone());
            return cacheUpdate.catch(() => undefined).then(() => networkResponse);
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  ));
}

function shouldWarmBundlesBeforeCache(cacheKey) {
  return cacheKey === './index.html';
}

function cacheHtmlWithBundles(cache, cacheKey, response) {
  const responseForCache = response.clone();
  return response.clone().text()
    .then((html) => cacheAppShellBundlesFromHtml(cache, html))
    .then(() => cache.put(cacheKey, responseForCache));
}

function cacheAppShellBundlesFromHtml(cache, html) {
  const bundleUrls = extractAppShellBundleUrls(html);
  return bundleUrls.length ? cache.addAll(bundleUrls) : Promise.resolve();
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) => (
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse?.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(() => cache.match(request).then((cachedResponse) => (
        cachedResponse || offlineJsonResponse(request)
      )))
  ));
}

function networkOnlyJson(request) {
  return fetch(request).catch(() => offlineJsonResponse(request, true));
}

function cacheFirst(request, cacheName, fallbackCacheName = '') {
  return caches.open(cacheName).then((cache) => (
    cache.match(request)
      .then((cachedResponse) => cachedResponse || matchFallbackCache(request, fallbackCacheName))
      .then((cachedResponse) => (
        cachedResponse || fetch(request).then((networkResponse) => {
          if (networkResponse?.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
      ))
  ));
}

function matchFallbackCache(request, cacheName) {
  if (!cacheName) return Promise.resolve(undefined);
  return caches.open(cacheName).then((cache) => cache.match(request));
}

function offlineJsonResponse(request, forceJson = false) {
  if (!forceJson && !request.headers.get('accept')?.includes('application/json')) {
    return Response.error();
  }

  return new Response(JSON.stringify({
    error: 'offline',
    message: '当前离线，且没有可用缓存。'
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
