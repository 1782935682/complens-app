const JPEG_SOI = 0xffd8;
const EXIF_MARKER = 0xffe1;
const ORIENTATION_TAG = 0x0112;
const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MAX_BYTES = 800_000;

/**
 * Reads JPEG EXIF orientation from the first 64KB. Returns 1 when orientation
 * is missing, unsupported, or the file is not JPEG.
 */
export async function readExifOrientation(file) {
  if (!file || !/jpe?g/i.test(String(file.type || file.name || ''))) return 1;
  const buffer = await file.slice(0, 64 * 1024).arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== JPEG_SOI) return 1;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const size = view.getUint16(offset + 2, false);
    if (marker === EXIF_MARKER) {
      return parseExifOrientation(view, offset + 4, size - 2);
    }
    offset += 2 + size;
  }
  return 1;
}

export async function fixImageOrientation(file) {
  const orientation = await readExifOrientation(file);
  let bitmap = null;
  try {
    bitmap = await decodeImage(file);
  } catch {
    bitmap = null;
  }
  if (!bitmap || !canUseCanvas()) {
    return {
      bitmap,
      canvas: null,
      orientation,
      width: bitmap?.width || 0,
      height: bitmap?.height || 0
    };
  }

  const rotated = orientation === 6 || orientation === 8;
  const canvas = document.createElement('canvas');
  canvas.width = rotated ? bitmap.height : bitmap.width;
  canvas.height = rotated ? bitmap.width : bitmap.height;
  const context = canvas.getContext('2d');

  applyOrientationTransform(context, orientation, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);

  return {
    bitmap,
    canvas,
    orientation,
    width: canvas.width,
    height: canvas.height
  };
}

export async function compressImage(file, opts = {}) {
  const maxWidth = Number(opts.maxWidth) || DEFAULT_MAX_WIDTH;
  const maxBytes = Number(opts.maxBytes) || DEFAULT_MAX_BYTES;
  const initialQuality = Number(opts.quality) || DEFAULT_QUALITY;
  const originalSize = Number(file?.size) || 0;
  const fixed = await fixImageOrientation(file);

  if (!fixed.canvas || !canUseCanvas()) {
    return {
      blob: file,
      width: fixed.width,
      height: fixed.height,
      originalSize,
      compressedSize: originalSize,
      orientation: fixed.orientation,
      compressed: false,
      fallback: 'canvas_unavailable'
    };
  }

  let sourceCanvas = fixed.canvas;
  if (sourceCanvas.width > maxWidth) {
    sourceCanvas = resizeCanvas(sourceCanvas, maxWidth);
  }

  if (sourceCanvas === fixed.canvas && originalSize > 0 && originalSize <= maxBytes && fixed.orientation === 1) {
    return {
      blob: file,
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      originalSize,
      compressedSize: originalSize,
      orientation: fixed.orientation,
      compressed: false
    };
  }

  let quality = clampQuality(initialQuality);
  let blob = await canvasToBlob(sourceCanvas, quality);
  for (let attempt = 0; attempt < 3 && blob.size > maxBytes && quality > 0.55; attempt += 1) {
    quality = clampQuality(quality - 0.05);
    blob = await canvasToBlob(sourceCanvas, quality);
  }

  return {
    blob,
    width: sourceCanvas.width,
    height: sourceCanvas.height,
    originalSize,
    compressedSize: blob.size,
    orientation: fixed.orientation,
    compressed: blob !== file
  };
}

function parseExifOrientation(view, start, length) {
  if (length < 14 || start + length > view.byteLength) return 1;
  const exifHeader = readAscii(view, start, 6);
  if (exifHeader !== 'Exif\u0000\u0000') return 1;

  const tiffOffset = start + 6;
  const byteOrder = view.getUint16(tiffOffset, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) return 1;
  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const ifdStart = tiffOffset + firstIfdOffset;
  if (ifdStart + 2 > view.byteLength) return 1;

  const entryCount = view.getUint16(ifdStart, littleEndian);
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdStart + 2 + index * 12;
    if (entryOffset + 12 > view.byteLength) return 1;
    if (view.getUint16(entryOffset, littleEndian) === ORIENTATION_TAG) {
      const orientation = view.getUint16(entryOffset + 8, littleEndian);
      return [1, 3, 6, 8].includes(orientation) ? orientation : 1;
    }
  }
  return 1;
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'none' });
    } catch {
      return createImageBitmap(file);
    }
  }
  if (typeof Image === 'undefined' || typeof URL === 'undefined') return null;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    }, { once: true });
    image.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decode failed'));
    }, { once: true });
    image.src = objectUrl;
  });
}

function canUseCanvas() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function applyOrientationTransform(context, orientation, width, height) {
  if (orientation === 3) {
    context.translate(width, height);
    context.rotate(Math.PI);
  } else if (orientation === 6) {
    context.translate(width, 0);
    context.rotate(Math.PI / 2);
  } else if (orientation === 8) {
    context.translate(0, height);
    context.rotate(-Math.PI / 2);
  }
}

function resizeCanvas(sourceCanvas, maxWidth) {
  const scale = maxWidth / sourceCanvas.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceCanvas.width * scale);
  canvas.height = Math.round(sourceCanvas.height * scale);
  const context = canvas.getContext('2d');
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/jpeg', quality);
  });
}

function clampQuality(value) {
  return Math.max(0.45, Math.min(0.95, value));
}

function readAscii(view, offset, length) {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += String.fromCharCode(view.getUint8(offset + index));
  }
  return result;
}
