import type { LocalImageAsset } from '@/types';
import { readStoredImageAsBase64 } from '@/platform/imageStore';

export interface OcrImageReadResult {
  base64: string;
  compressed: boolean;
  exceedsLimit: boolean;
}

const MAX_OCR_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OCR_IMAGE_BASE64_LENGTH = Math.ceil(MAX_OCR_IMAGE_BYTES / 3) * 4;
const OCR_IMAGE_MAX_SIDE = 1200;

export async function readImageAsBase64(asset?: LocalImageAsset): Promise<string> {
  if (!asset) return '';
  if (asset.file && typeof FileReader !== 'undefined') {
    return readFileObjectAsBase64(asset.file);
  }
  if (isH5BlobUrl(asset.tempFilePath)) {
    const blob = await fetch(asset.tempFilePath).then((response) => response.blob());
    return readFileObjectAsBase64(blob);
  }

  const storedBase64 = await readStoredImageAsBase64(asset);
  if (storedBase64) return storedBase64;

  const appBase64 = await readAppFileAsBase64(asset.tempFilePath);
  if (appBase64) return appBase64;

  return readUniFileSystemAsBase64(asset.tempFilePath);
}

export async function readImageAsBase64ForOcr(asset?: LocalImageAsset): Promise<OcrImageReadResult> {
  if (!asset) return { base64: '', compressed: false, exceedsLimit: false };

  const originalBase64 = await readImageAsBase64(asset);
  if (!originalBase64) return { base64: '', compressed: false, exceedsLimit: false };
  if (isWithinOcrBase64Limit(originalBase64)) {
    return { base64: originalBase64, compressed: false, exceedsLimit: false };
  }

  const compressedBase64 = await compressBase64ImageForOcr(asset, originalBase64);
  if (!compressedBase64) {
    return { base64: originalBase64, compressed: false, exceedsLimit: true };
  }

  return {
    base64: compressedBase64,
    compressed: compressedBase64.length < originalBase64.length,
    exceedsLimit: !isWithinOcrBase64Limit(compressedBase64)
  };
}

async function compressBase64ImageForOcr(asset: LocalImageAsset, base64: string): Promise<string | null> {
  if (!canUseCanvasCompression()) return null;

  const sourceDataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${base64}`;
  const image = await loadImage(sourceDataUrl);
  if (!image.naturalWidth || !image.naturalHeight) return null;

  const scale = Math.min(1, OCR_IMAGE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));

  let quality = 0.9;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const compressed = await compressImageToDataUrl(image, width, height, quality);
    if (!compressed) return null;
    if (compressed.length <= MAX_OCR_IMAGE_BASE64_LENGTH) return compressed;

    quality = Math.max(0.5, quality - 0.15);
    width = Math.max(1, Math.round(width * 0.9));
    height = Math.max(1, Math.round(height * 0.9));
  }

  return null;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法解码图片，无法进行压缩。'));
    image.src = url;
  });
}

async function compressImageToDataUrl(image: HTMLImageElement, width: number, height: number, quality: number): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return extractBase64Payload(dataUrl);
}

function canUseCanvasCompression(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined';
}

function isWithinOcrBase64Limit(base64: string): boolean {
  return base64.length <= MAX_OCR_IMAGE_BASE64_LENGTH;
}

function readUniFileSystemAsBase64(filePath: string): Promise<string> {
  const fileSystemManager = (uni as typeof uni & { getFileSystemManager?: () => UniApp.FileSystemManager })
    .getFileSystemManager;
  if (typeof fileSystemManager === 'function') {
    return new Promise((resolve) => {
      fileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (result) => resolve(String(result.data || '')),
        fail: () => resolve('')
      });
    });
  }
  return Promise.resolve('');
}

async function readAppFileAsBase64(filePath: string): Promise<string> {
  // #ifdef APP-PLUS
  if (!filePath || typeof plus === 'undefined' || !plus.io?.resolveLocalFileSystemURL) return '';

  return new Promise((resolve) => {
    plus.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => {
        const fileEntry = entry as unknown as PlusIoFileEntry;
        if (typeof fileEntry.file !== 'function') {
          resolve('');
          return;
        }
        fileEntry.file(
          (file) => {
            const reader = new plus.io.FileReader();
            reader.onload = () => resolve(extractBase64Payload(reader.result || ''));
            reader.onerror = () => resolve('');
            reader.onabort = () => resolve('');
            reader.readAsDataURL(file);
          },
          () => resolve('')
        );
      },
      () => resolve('')
    );
  });
  // #endif
  return '';
}

function readFileObjectAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(extractBase64Payload(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function isH5BlobUrl(path: string): boolean {
  return /^blob:/i.test(path) || /^data:image\//i.test(path);
}

function extractBase64Payload(dataUrl: unknown): string {
  return String(dataUrl || '').split(',')[1] || '';
}
