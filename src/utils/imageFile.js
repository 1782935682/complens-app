export const SCAN_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const PREVIEWABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif'
]);

export function isPreviewableImageFile(file) {
  return PREVIEWABLE_IMAGE_TYPES.has(String(file?.type || '').toLowerCase());
}

export function validateScanImageFile(file) {
  if (!file) {
    return {
      ok: false,
      reason: 'empty',
      message: '请先选择一张清晰的产品成分表图片。'
    };
  }

  if (!isPreviewableImageFile(file)) {
    return {
      ok: false,
      reason: 'type',
      message: '当前仅支持 PNG、JPEG、WebP、GIF、BMP 或 AVIF 图片。'
    };
  }

  if (Number.isFinite(file.size) && file.size > SCAN_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      reason: 'size',
      message: `图片超过 ${formatBytes(SCAN_IMAGE_MAX_BYTES)}，请压缩后再上传。`
    };
  }

  return {
    ok: true,
    reason: '',
    message: `已选择图片，大小 ${formatBytes(file.size)}。`
  };
}

export function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / (1024 ** index);
  const formatted = amount >= 10 || index === 0 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return `${formatted} ${units[index]}`;
}
