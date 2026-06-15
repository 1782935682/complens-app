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

  return {
    id: createImageId(),
    tempFilePath,
    name: normalizeFileName(tempFile),
    mimeType: inferMimeType(tempFilePath, tempFile),
    size: Number(tempFile?.size) || 0,
    width: Number(tempFile?.width) || undefined,
    height: Number(tempFile?.height) || undefined,
    file: tempFile?.file,
    storage: tempFile?.file ? 'h5-file' : 'temp-file'
  };
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
