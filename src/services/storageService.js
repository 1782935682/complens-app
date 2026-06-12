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
  'compcheck:analysis-reports': { path: '/user/reports', method: 'POST' },
  'compcheck:products': { path: '/user/products?limit=100', method: 'POST' }
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
  const token = getAuthToken();
  const storageKey = getScopedStorageKey(key, token);
  try {
    const raw = storage ? storage.getItem(storageKey) ?? memoryStore.get(storageKey) : memoryStore.get(storageKey);
    queueCloudRead(key, storage, token);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  const serialized = JSON.stringify(value);
  const storage = getStorage();
  const token = getAuthToken();
  const storageKey = getScopedStorageKey(key, token);
  const previousValue = readStoredJson(key, storage, [], token);
  try {
    if (storage) {
      storage.setItem(storageKey, serialized);
      queueCloudWrite(key, value, storage, previousValue, token);
      return;
    }
  } catch {
    // Fall back to in-memory storage when localStorage is unavailable or full.
  }
  memoryStore.set(storageKey, serialized);
  queueCloudWrite(key, value, storage, previousValue, token);
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

function queueCloudRead(key, storage, token = getAuthToken()) {
  if (!SYNC_CONFIGS[key] || !token || typeof fetch !== 'function') return;
  resetSyncStateForNewToken(key, token);
  ensureCloudHydration(key, storage, token);
}

function queueCloudWrite(key, value, storage, previousValue, token = getAuthToken()) {
  if (!SYNC_CONFIGS[key] || !token || typeof fetch !== 'function') return;
  resetSyncStateForNewToken(key, token);
  if (!isCloudHydrated(key, token)) {
    const pending = pendingWrites.get(key);
    pendingWrites.set(key, {
      before: pending?.before ?? previousValue,
      after: value
    });
    ensureCloudHydration(key, storage, token);
    return;
  }

  const version = bumpSyncVersion(key);
  void syncToCloud(key, value, storage, version, token);
}

function ensureCloudHydration(key, storage, token) {
  const current = hydrationStates.get(key);
  if (current?.token === token) return;

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
    const next = applyPendingWrite(key, serverItems, pending);
    writeStoredJson(key, next, storage, token);
    const writeVersion = bumpSyncVersion(key);
    void syncToCloud(key, next, storage, writeVersion, token);
  });
}

function resetSyncStateForNewToken(key, token) {
  const current = hydrationStates.get(key);
  if (!current || current.token === token) return;
  hydrationStates.delete(key);
  pendingWrites.delete(key);
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
  writeStoredJson(key, items, storage, token);
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
  writeStoredJson(key, items, storage, token);
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

function writeStoredJson(key, value, storage, token = getAuthToken()) {
  const serialized = JSON.stringify(value);
  const storageKey = getScopedStorageKey(key, token);
  try {
    if (storage) {
      storage.setItem(storageKey, serialized);
      return;
    }
  } catch {
    // Keep the local fallback path silent; cloud sync must never break local usage.
  }
  memoryStore.set(storageKey, serialized);
}

function readStoredJson(key, storage, fallback, token = getAuthToken()) {
  const storageKey = getScopedStorageKey(key, token);
  try {
    const raw = storage ? storage.getItem(storageKey) ?? memoryStore.get(storageKey) : memoryStore.get(storageKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function bumpSyncVersion(key) {
  const version = (syncVersions.get(key) || 0) + 1;
  syncVersions.set(key, version);
  return version;
}

function applyPendingWrite(key, serverItems, pending) {
  const server = Array.isArray(serverItems) ? serverItems : [];
  const before = Array.isArray(pending?.before) ? pending.before : [];
  const after = Array.isArray(pending?.after) ? pending.after : [];
  const keyOf = getSyncItemKeyFactory(key);
  const beforeMap = mapBy(before, keyOf);
  const afterMap = mapBy(after, keyOf);
  const removed = new Set([...beforeMap.keys()].filter((itemKey) => !afterMap.has(itemKey)));
  const changed = after.filter((item) => {
    const itemKey = keyOf(item);
    if (!itemKey) return false;
    return !beforeMap.has(itemKey) || JSON.stringify(beforeMap.get(itemKey)) !== JSON.stringify(item);
  });

  return uniqueBy([
    ...changed,
    ...server.filter((item) => !removed.has(keyOf(item)))
  ], keyOf);
}

function getSyncItemKeyFactory(key) {
  if (key === 'compcheck:favorites') {
    return (item) => `${item?.category || ''}:${item?.id || ''}`;
  }
  if (key === 'compcheck:history' || key === 'compcheck:allergens') {
    return (item) => String(item || '').trim();
  }
  if (key === 'compcheck:analysis-reports' || key === 'compcheck:products') {
    return (item) => String(item?.id || '').trim();
  }

  return (item) => JSON.stringify(item);
}

function mapBy(items, getKey) {
  const result = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (key && !result.has(key)) {
      result.set(key, item);
    }
  }

  return result;
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

export function getAuthToken() {
  const token = String(readRaw(AUTH_TOKEN_KEY) || '').trim();
  return isValidJwt(token) ? token : '';
}

export function getApiBaseUrl() {
  const configured = String(readRaw(API_BASE_URL_KEY) || '').trim();
  return (configured || '/api').replace(/\/$/, '');
}

function getScopedStorageKey(key, token) {
  if (!SYNC_CONFIGS[key] || !token) return key;
  return `compcheck:sync:${getAuthUserCacheKey(token)}:${key.replace(/^compcheck:/, '')}`;
}

function getAuthUserCacheKey(token) {
  const payload = parseJwtPayload(token.split('.')[1] || '');
  const identity = payload?.sub ?? payload?.userId ?? payload?.email ?? payload?.jti;
  return sanitizeStorageKeyPart(identity || hashString(token));
}

function sanitizeStorageKeyPart(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function readRaw(key) {
  const storage = getStorage();
  try {
    return storage ? storage.getItem(key) ?? memoryStore.get(key) : memoryStore.get(key);
  } catch {
    return memoryStore.get(key);
  }
}

export function writeRaw(key, value) {
  const storage = getStorage();
  const serialized = String(value ?? '');
  try {
    if (storage) {
      storage.setItem(key, serialized);
      memoryStore.set(key, serialized);
      return;
    }
  } catch {
    // Keep the same in-memory fallback used by JSON storage.
  }
  memoryStore.set(key, serialized);
}

export function removeRaw(key) {
  const storage = getStorage();
  try {
    if (storage) storage.removeItem(key);
  } catch {
    // Keep auth cleanup best-effort when localStorage is blocked.
  }
  memoryStore.delete(key);
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
