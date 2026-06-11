const CACHE_VERSION = 'compcheck-shell-v15';
const CACHE_PREFIX = 'compcheck-';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.webmanifest',
  './app-icon.svg',
  './components/render.js',
  './data/allergens.js',
  './data/categories.js',
  './data/foodAdditives.js',
  './data/ingredients.js',
  './data/legalContent.js',
  './data/membershipPlans.js',
  './data/searchAliases.js',
  './data/supportTopics.js',
  './pages/analyzePage.js',
  './pages/comparePage.js',
  './pages/dataPage.js',
  './pages/detailPage.js',
  './pages/favoritesPage.js',
  './pages/homePage.js',
  './pages/legalPage.js',
  './pages/membershipPage.js',
  './pages/notFoundPage.js',
  './pages/onboardingPage.js',
  './pages/reportsPage.js',
  './pages/scanPage.js',
  './pages/searchPage.js',
  './pages/settingsPage.js',
  './pages/supportPage.js',
  './router/router.js',
  './services/aiAnalysisService.js',
  './services/allergenService.js',
  './services/compareService.js',
  './services/ingredientService.js',
  './services/membershipService.js',
  './services/ocrService.js',
  './services/reportExportService.js',
  './services/shareService.js',
  './services/storageService.js',
  './services/supportService.js',
  './store/userStore.js',
  './utils/imageFile.js',
  './utils/text.js'
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
