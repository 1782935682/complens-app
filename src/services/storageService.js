const memoryStore = new Map();
const syncVersions = new Map();

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
  if (!SYNC_CONFIGS[key] || !isLoggedIn() || typeof fetch !== 'function') return;
  const version = bumpSyncVersion(key);
  void syncFromCloud(key, storage, version);
}

function queueCloudWrite(key, value, storage) {
  if (!SYNC_CONFIGS[key] || !isLoggedIn() || typeof fetch !== 'function') return;
  const version = bumpSyncVersion(key);
  void syncToCloud(key, value, storage, version);
}

async function syncFromCloud(key, storage, version) {
  const config = SYNC_CONFIGS[key];
  const response = await requestCloudJson(config.path);
  if (!response || syncVersions.get(key) !== version) return;
  const items = Array.isArray(response.items) ? response.items : [];
  writeStoredJson(key, items, storage);
}

async function syncToCloud(key, value, storage, version) {
  const config = SYNC_CONFIGS[key];
  const response = await requestCloudJson(config.path, {
    method: config.method,
    body: JSON.stringify({ items: Array.isArray(value) ? value : [] })
  });
  if (!response || syncVersions.get(key) !== version) return;
  const items = Array.isArray(response.items) ? response.items : [];
  writeStoredJson(key, items, storage);
}

async function requestCloudJson(path, options = {}) {
  const token = getAuthToken();
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
