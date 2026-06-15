const DB_NAME = 'compcheck-images';
const DB_VERSION = 1;
const STORE_NAME = 'scan-images';
const memoryImages = new Map();

export async function saveImage(blob, meta = {}) {
  const record = {
    id: createImageId(),
    blob,
    meta: normalizeMeta(meta, blob)
  };

  try {
    const db = await openImageDb();
    await putRecord(db, record);
    return record.id;
  } catch {
    record.meta.storage = 'memory';
    memoryImages.set(record.id, record);
    return record.id;
  }
}

export async function getImage(id) {
  const imageId = normalizeId(id);
  if (!imageId) return null;

  try {
    const db = await openImageDb();
    const record = await getRecord(db, imageId);
    if (record) return record;
  } catch {
    // Fall through to the in-memory fallback.
  }
  return memoryImages.get(imageId) || null;
}

export async function deleteImage(id) {
  const imageId = normalizeId(id);
  if (!imageId) return false;
  memoryImages.delete(imageId);

  try {
    const db = await openImageDb();
    await deleteRecord(db, imageId);
  } catch {
    return false;
  }
  return true;
}

export async function listImages() {
  try {
    const db = await openImageDb();
    const records = await getAllRecords(db);
    return records.map((record) => ({ id: record.id, meta: record.meta }));
  } catch {
    return [...memoryImages.values()].map((record) => ({ id: record.id, meta: record.meta }));
  }
}

export async function cleanOldImages(daysToKeep = 30) {
  const cutoff = Date.now() - Math.max(1, Number(daysToKeep) || 30) * 24 * 60 * 60 * 1000;
  const images = await listImages();
  const oldIds = images
    .filter((image) => new Date(image.meta.createdAt).getTime() < cutoff)
    .map((image) => image.id);
  await Promise.all(oldIds.map((id) => deleteImage(id)));
  return oldIds.length;
}

export async function clearAllImages() {
  const images = await listImages();
  const deletedIds = images.map((image) => image.id);
  await Promise.all(deletedIds.map((id) => deleteImage(id)));
  return deletedIds.length;
}

function openImageDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('IndexedDB open failed')));
  });
}

function putRecord(db, record) {
  return runStoreRequest(db, 'readwrite', (store) => store.put(record));
}

function getRecord(db, id) {
  return runStoreRequest(db, 'readonly', (store) => store.get(id));
}

function getAllRecords(db) {
  return runStoreRequest(db, 'readonly', (store) => store.getAll());
}

function deleteRecord(db, id) {
  return runStoreRequest(db, 'readwrite', (store) => store.delete(id));
}

function runStoreRequest(db, mode, createRequest) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = createRequest(store);
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('IndexedDB request failed')));
    tx.addEventListener('complete', () => db.close?.());
    tx.addEventListener('error', () => reject(tx.error || new Error('IndexedDB transaction failed')));
  });
}

function normalizeMeta(meta, blob) {
  return {
    originalName: String(meta.originalName || meta.name || 'ingredient-image').trim(),
    mimeType: String(meta.mimeType || blob?.type || 'application/octet-stream').trim(),
    width: Number(meta.width) || 0,
    height: Number(meta.height) || 0,
    originalSize: Number(meta.originalSize) || Number(blob?.size) || 0,
    compressedSize: Number(meta.compressedSize) || Number(blob?.size) || 0,
    createdAt: meta.createdAt || new Date().toISOString(),
    storage: typeof indexedDB === 'undefined' ? 'memory' : 'indexeddb'
  };
}

function createImageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeId(value) {
  return String(value || '').trim();
}
