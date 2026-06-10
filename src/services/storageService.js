const memoryStore = new Map();

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
    const raw = storage ? storage.getItem(key) : memoryStore.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  const serialized = JSON.stringify(value);
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, serialized);
    return;
  }
  memoryStore.set(key, serialized);
}
