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
  const fileSystemManager = (uni as typeof uni & { getFileSystemManager?: () => UniApp.FileSystemManager }).getFileSystemManager;
  if (typeof fileSystemManager === 'function') {
    return new Promise((resolve) => {
      fileSystemManager().readFile({
        filePath: asset.tempFilePath,
        encoding: 'base64',
        success: (result) => resolve(String(result.data || '')),
        fail: () => resolve('')
      });
    });
  }
  return '';
}

function readFileObjectAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function isH5BlobUrl(path: string): boolean {
  return /^blob:/i.test(path) || /^data:image\//i.test(path);
}
