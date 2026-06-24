import type { LocalImageAsset } from '@/types';

const DB_NAME = 'compcheck-images';
const DB_VERSION = 1;
const STORE_NAME = 'scan-images';

type StoredImageRecord = {
  id: string;
  blob: Blob;
  meta: {
    name: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    createdAt: string;
  };
};

const memoryImages = new Map<string, StoredImageRecord>();

export function saveInlineImageData(asset: LocalImageAsset): boolean {
  if (!isInlineImageDataUrl(asset.tempFilePath)) return false;
  const blob = dataUrlToBlob(asset.tempFilePath, asset.mimeType);
  if (!blob) return false;
  return saveImageBlob(asset, blob);
}

export function saveFileImageData(asset: LocalImageAsset): boolean {
  if (!isBlobLike(asset.file)) return false;
  return saveImageBlob(asset, asset.file);
}

function saveImageBlob(asset: LocalImageAsset, blob: Blob): boolean {
  const record: StoredImageRecord = {
    id: asset.id,
    blob,
    meta: {
      name: asset.name,
      mimeType: blob.type || asset.mimeType,
      size: asset.size || blob.size,
      width: asset.width,
      height: asset.height,
      createdAt: new Date().toISOString()
    }
  };
  memoryImages.set(record.id, record);
  void persistRecord(record);
  return true;
}

export async function readStoredImageAsBase64(asset: LocalImageAsset): Promise<string> {
  const blob = await readStoredImageBlob(asset);
  if (!blob) return '';
  return readBlobAsBase64(blob);
}

export async function readStoredImageBlob(asset: LocalImageAsset): Promise<Blob | undefined> {
  const record = memoryImages.get(asset.id) || await readRecord(asset.id);
  return record?.blob;
}

export function clearStoredImageMemory(): void {
  memoryImages.clear();
}

export async function deleteStoredImage(target?: string | LocalImageAsset): Promise<void> {
  const imageId = typeof target === 'string' ? target.trim() : String(target?.id || '').trim();
  if (!imageId) return;
  memoryImages.delete(imageId);
  await removeSavedPlatformFile(target);
  try {
    const db = await openImageDb();
    await runStoreRequest(db, 'readwrite', (store) => store.delete(imageId));
  } catch {
    // IndexedDB is unavailable on some targets; memory cleanup above is enough there.
  }
}

async function removeSavedPlatformFile(target?: string | LocalImageAsset): Promise<void> {
  if (!target || typeof target === 'string' || target.storage !== 'platform-file' || !target.tempFilePath) return;

  const removeSavedFile = (uni as typeof uni & {
    removeSavedFile?: (options: { filePath: string; complete?: () => void }) => void;
  }).removeSavedFile;

  if (typeof removeSavedFile !== 'function') return;
  await new Promise<void>((resolve) => {
    removeSavedFile({
      filePath: target.tempFilePath,
      complete: () => resolve()
    });
  });
}

function isInlineImageDataUrl(path: string): boolean {
  return /^data:image\//i.test(path);
}

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType: string): Blob | undefined {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return undefined;

  const header = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const mimeType = header.match(/^data:([^;,]+)/i)?.[1] || fallbackMimeType || 'image/jpeg';
  const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function persistRecord(record: StoredImageRecord): Promise<void> {
  try {
    const db = await openImageDb();
    await runStoreRequest(db, 'readwrite', (store) => store.put(record));
  } catch {
    // Keep the memory fallback; H5/PWA will use IndexedDB when available.
  }
}

async function readRecord(id: string): Promise<StoredImageRecord | undefined> {
  try {
    const db = await openImageDb();
    return await runStoreRequest<StoredImageRecord | undefined>(
      db,
      'readonly',
      (store) => store.get(id) as IDBRequest<StoredImageRecord | undefined>
    );
  } catch {
    return undefined;
  }
}

function openImageDb(): Promise<IDBDatabase> {
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

function runStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = createRequest(store);
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('IndexedDB request failed')));
    transaction.addEventListener('complete', () => db.close());
    transaction.addEventListener('error', () => reject(transaction.error || new Error('IndexedDB transaction failed')));
  });
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(extractBase64Payload(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

function extractBase64Payload(dataUrl: unknown): string {
  return String(dataUrl || '').split(',')[1] || '';
}
