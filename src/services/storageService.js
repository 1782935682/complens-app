const memoryStore = new Map();
const syncVersions = new Map();
const hydrationStates = new Map();
const pendingWrites = new Map();

export const AUTH_TOKEN_KEY = 'compcheck:auth-token';
const API_BASE_URL_KEY = 'compcheck:api-base-url';
const SYNC_CONFIGS = {
  'compcheck:favorites': { path: '/user/favorites', method: 'POST' },
  'compcheck:history': { path: '/user/history', method: 'POST' },
  'compcheck:allergens': { path: '/user/allergens', method: 'PUT' },
  'compcheck:analysis-reports': { path: '/user/reports', method: 'POST' }
};

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function readJson(key, fallback) {
  const storage = getStorage();
  try {
    const raw = storage ? storage.getItem(key) ?? memoryStore.get(key) : memoryStore.get(key);
    queueCloudRead(key, storage);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  const serialized = JSON.stringify(value);
  const storage = getStorage();
  try {
    if (storage) {
      storage.setItem(key, serialized);
      queueCloudWrite(key, value, storage);
      return;
    }
  } catch {
    // Fall back to in-memory storage when localStorage is unavailable or full.
  }
  memoryStore.set(key, serialized);
  queueCloudWrite(key, value, storage);
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

function queueCloudRead(key, storage) {
  const token = getAuthToken();
  if (!SYNC_CONFIGS[key] || !token || typeof fetch !== 'function') return;
  ensureCloudHydration(key, storage, token);
}

function queueCloudWrite(key, value, storage) {
  const token = getAuthToken();
  if (!SYNC_CONFIGS[key] || !token || typeof fetch !== 'function') return;
  if (!isCloudHydrated(key, token)) {
    pendingWrites.set(key, value);
    ensureCloudHydration(key, storage, token);
    return;
  }

  const version = bumpSyncVersion(key);
  void syncToCloud(key, value, storage, version, token);
}

function ensureCloudHydration(key, storage, token) {
  const current = hydrationStates.get(key);
  if (current?.token === token) return;
  if (current && current.token !== token) {
    pendingWrites.delete(key);
  }

  const state = { token, status: 'pending' };
  hydrationStates.set(key, state);
  const version = bumpSyncVersion(key);
  void syncFromCloud(key, storage, version, token).then((serverItems) => {
    if (hydrationStates.get(key) !== state) return;
    if (!serverItems) {
      hydrationStates.delete(key);
      return;
    }

    state.status = 'done';
    const pending = pendingWrites.get(key);
    if (pending === undefined) return;

    pendingWrites.delete(key);
    const merged = mergeSyncItems(key, serverItems, pending);
    writeStoredJson(key, merged, storage);
    const writeVersion = bumpSyncVersion(key);
    void syncToCloud(key, merged, storage, writeVersion, token);
  });
}

function isCloudHydrated(key, token) {
  const state = hydrationStates.get(key);
  return state?.token === token && state.status === 'done';
}

async function syncFromCloud(key, storage, version, token) {
  const config = SYNC_CONFIGS[key];
  const response = await requestCloudJson(config.path, {}, token);
  if (!response || syncVersions.get(key) !== version) return null;
  const items = Array.isArray(response.items) ? response.items : [];
  writeStoredJson(key, items, storage);
  return items;
}

async function syncToCloud(key, value, storage, version, token) {
  const config = SYNC_CONFIGS[key];
  const response = await requestCloudJson(config.path, {
    method: config.method,
    body: JSON.stringify({ items: Array.isArray(value) ? value : [] })
  }, token);
  if (!response || syncVersions.get(key) !== version) return;
  const items = Array.isArray(response.items) ? response.items : [];
  writeStoredJson(key, items, storage);
}

async function requestCloudJson(path, options = {}, token = getAuthToken()) {
  if (!token) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function writeStoredJson(key, value, storage) {
  const serialized = JSON.stringify(value);
  try {
    if (storage) {
      storage.setItem(key, serialized);
      return;
    }
  } catch {
    // Keep the local fallback path silent; cloud sync must never break local usage.
  }
  memoryStore.set(key, serialized);
}

function bumpSyncVersion(key) {
  const version = (syncVersions.get(key) || 0) + 1;
  syncVersions.set(key, version);
  return version;
}

function mergeSyncItems(key, serverItems, pendingItems) {
  const server = Array.isArray(serverItems) ? serverItems : [];
  const pending = Array.isArray(pendingItems) ? pendingItems : [];
  if (key === 'compcheck:favorites') {
    return uniqueBy([...server, ...pending], (item) => `${item?.category || ''}:${item?.id || ''}`);
  }
  if (key === 'compcheck:history' || key === 'compcheck:allergens') {
    return uniqueBy([...pending, ...server], (item) => String(item || '').trim());
  }
  if (key === 'compcheck:analysis-reports') {
    return uniqueBy([...server, ...pending], (item) => String(item?.id || '').trim());
  }

  return uniqueBy([...server, ...pending], (item) => JSON.stringify(item));
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function getAuthToken() {
  const token = String(readRaw(AUTH_TOKEN_KEY) || '').trim();
  return isValidJwt(token) ? token : '';
}

function getApiBaseUrl() {
  const configured = String(readRaw(API_BASE_URL_KEY) || '').trim();
  return (configured || '/api').replace(/\/$/, '');
}

function readRaw(key) {
  const storage = getStorage();
  try {
    return storage ? storage.getItem(key) ?? memoryStore.get(key) : memoryStore.get(key);
  } catch {
    return memoryStore.get(key);
  }
}

function isValidJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = parseJwtPayload(parts[1]);
  return Number.isFinite(payload?.exp) && payload.exp * 1000 > Date.now();
}

function parseJwtPayload(payload) {
  try {
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  if (typeof atob === 'function') {
    return atob(padded);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
  return '';
}
