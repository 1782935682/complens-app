import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';

export function isNativePlatform() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export async function getNativeCameraPhoto() {
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
      source: CameraSource.Prompt,
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
    return {
      ok: true,
      reason: '',
      dataUrl: `data:image/${format};base64,${photo.base64String}`,
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

function isShareAbort(error) {
  return error && (error.name === 'AbortError' || error.code === 20 || error.message === 'cancelled');
}
