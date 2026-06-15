import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { compressImage as processImageCompression } from '../utils/imageProcessor.js';

export function isNativePlatform() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function capturePhoto() {
  return pickImageFromSource('camera');
}

export function pickImage() {
  return pickImageFromSource('photos');
}

export const compressImage = (file, options) => processImageCompression(file, options);

export async function getNativeCameraPhoto() {
  return getNativePhoto('prompt');
}

export async function getNativePhoto(source = 'prompt') {
  if (!isNativePlatform()) {
    return {
      ok: false,
      reason: 'web',
      message: '当前为 Web 环境，已切换到文件选择。'
    };
  }

  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: resolveCameraSource(source),
      quality: 82,
      allowEditing: false,
      correctOrientation: true
    });

    if (!photo?.base64String) {
      return {
        ok: false,
        reason: 'empty',
        message: '未选择图片，可继续使用文件选择或手动输入。'
      };
    }

    const format = normalizeImageFormat(photo.format);
    const mimeType = `image/${format}`;
    const file = createPhotoFile(photo.base64String, format, mimeType, source);

    return {
      ok: true,
      reason: '',
      dataUrl: `data:image/${format};base64,${photo.base64String}`,
      blob: file?.blob ?? null,
      file,
      format,
      mimeType,
      size: getBase64ByteSize(photo.base64String),
      message: '已通过系统相机或相册选择图片，请校正识别文本。'
    };
  } catch (error) {
    const cancelled = isShareAbort(error);
    return {
      ok: false,
      reason: cancelled ? 'cancelled' : 'native-error',
      error,
      message: cancelled ? '已取消系统相机或相册选择。' : '系统相机或相册不可用，已切换到文件选择。'
    };
  }
}

function resolveCameraSource(source) {
  if (source === 'camera') return CameraSource.Camera;
  if (source === 'photos') return CameraSource.Photos;
  return CameraSource.Prompt;
}

export async function shareWithNative(payload) {
  if (!payload || !isNativePlatform()) {
    return { ok: false, reason: 'web' };
  }

  try {
    const shareOptions = {
      title: payload.title,
      text: payload.text,
      dialogTitle: payload.title
    };
    if (payload.url) shareOptions.url = payload.url;
    await Share.share(shareOptions);
    return { ok: true, reason: '', message: '已打开系统分享。' };
  } catch (error) {
    return {
      ok: false,
      reason: isShareAbort(error) ? 'abort' : 'native-error',
      error
    };
  }
}

function normalizeImageFormat(format) {
  const normalized = String(format || 'jpeg').toLowerCase();
  if (normalized === 'jpg') return 'jpeg';
  return ['jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'].includes(normalized) ? normalized : 'jpeg';
}

export function getBase64ByteSize(base64String) {
  const normalized = String(base64String || '').replace(/\s/g, '');
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

async function pickImageFromSource(source) {
  const result = await getNativePhoto(source);
  if (!result.ok) {
    return result;
  }

  return result;
}

function createPhotoFile(base64String, format, mimeType, source) {
  const blob = decodeBase64ToBlob(base64String, mimeType);
  if (!blob) {
    return {
      blob: null,
      type: mimeType,
      name: `native-${source}.${format}`,
      size: 0
    };
  }

  const extension = String(format || 'jpeg').replace('.', '');
  const fileName = `native-${source}.${extension || 'jpg'}`;
  if (typeof File === 'function') {
    try {
      return new File([blob], fileName, { type: mimeType || 'image/jpeg' });
    } catch {
      // Fallback to Blob-like object for older runtimes.
    }
  }

  return Object.assign(blob, { name: fileName });
}

function decodeBase64ToBlob(base64String, mimeType) {
  try {
    const base64 = String(base64String || '');
    if (!base64) return null;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType || 'image/jpeg' });
  } catch {
    return null;
  }
}

function isShareAbort(error) {
  return error && (error.name === 'AbortError' || error.code === 20 || error.message === 'cancelled');
}
