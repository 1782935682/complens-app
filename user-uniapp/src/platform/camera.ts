import type { LocalImageAsset } from '@/types';

type UniTempImageFile = {
  path?: string;
  name?: string;
  type?: string;
  size?: number;
  width?: number;
  height?: number;
  file?: File;
};

export async function chooseLabelImage(sourceType: 'camera' | 'album'): Promise<LocalImageAsset> {
  const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: resolve,
      fail: reject
    });
  });

  const tempFiles = Array.isArray(result.tempFiles) ? result.tempFiles : [];
  const tempFile = tempFiles[0] as UniTempImageFile | undefined;
  const tempFilePath = result.tempFilePaths?.[0] || tempFile?.path || '';
  if (!tempFilePath) throw new Error('image_not_selected');
  const storedFilePath = await persistPlatformImage(tempFilePath);

  return {
    id: createImageId(),
    tempFilePath: storedFilePath,
    name: normalizeFileName(tempFile),
    mimeType: inferMimeType(storedFilePath, tempFile),
    size: Number(tempFile?.size) || 0,
    width: Number(tempFile?.width) || undefined,
    height: Number(tempFile?.height) || undefined,
    file: tempFile?.file,
    storage: inferStorage(tempFile?.file, storedFilePath, tempFilePath)
  };
}

export interface ScannedProductCode {
  rawValue: string;
  format: string;
}

export async function scanProductCode(): Promise<ScannedProductCode> {
  const scanCode = (uni as typeof uni & {
    scanCode?: (options: {
      onlyFromCamera?: boolean;
      scanType?: string[];
      success?: (result: { result?: string; scanType?: string }) => void;
      fail?: (error: unknown) => void;
    }) => void;
  }).scanCode;
  if (typeof scanCode !== 'function') throw new Error('scan_code_unavailable');
  return await new Promise((resolve, reject) => {
    scanCode({
      onlyFromCamera: true,
      scanType: ['barCode', 'qrCode'],
      success: (result) => {
        const rawValue = String(result.result || '').trim();
        if (!rawValue) {
          reject(new Error('scan_code_empty'));
          return;
        }
        resolve({
          rawValue,
          format: String(result.scanType || 'unknown')
        });
      },
      fail: reject
    });
  });
}

function createImageId(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFileName(file?: UniTempImageFile): string {
  const name = String(file?.name || '').trim();
  return name || 'label-image';
}

function inferMimeType(path: string, file?: UniTempImageFile): string {
  const explicit = String(file?.type || '').trim();
  if (explicit) return explicit;
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function inferStorage(file: File | undefined, nextPath: string, originalPath: string): LocalImageAsset['storage'] {
  if (file) return 'h5-file';
  return nextPath && nextPath !== originalPath ? 'platform-file' : 'temp-file';
}

function persistPlatformImage(tempFilePath: string): Promise<string> {
  const saveFile = (uni as typeof uni & {
    saveFile?: (options: {
      tempFilePath: string;
      success?: (result: { savedFilePath?: string }) => void;
      fail?: () => void;
    }) => void;
  }).saveFile;

  if (!tempFilePath || typeof saveFile !== 'function' || isH5LikePath(tempFilePath)) {
    return Promise.resolve(tempFilePath);
  }

  return new Promise((resolve) => {
    saveFile({
      tempFilePath,
      success: (result) => resolve(result.savedFilePath || tempFilePath),
      fail: () => resolve(tempFilePath)
    });
  });
}

function isH5LikePath(path: string): boolean {
  return /^blob:/i.test(path) || /^data:image\//i.test(path);
}
