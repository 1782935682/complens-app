import type { LocalImageAsset } from '@/types';

export async function readImageAsBase64(asset?: LocalImageAsset): Promise<string> {
  if (!asset) return '';
  if (asset.file && typeof FileReader !== 'undefined') {
    return readFileObjectAsBase64(asset.file);
  }
  if (isH5BlobUrl(asset.tempFilePath)) {
    const blob = await fetch(asset.tempFilePath).then((response) => response.blob());
    return readFileObjectAsBase64(blob);
  }

  const appBase64 = await readAppFileAsBase64(asset.tempFilePath);
  if (appBase64) return appBase64;

  return readUniFileSystemAsBase64(asset.tempFilePath);
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
