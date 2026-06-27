import type { LocalImageAsset, ProductRecognitionContentType } from '@/types';
import { readStoredImageBlob } from '@/platform/imageStore';

export type BarcodeKind = 'barcode' | 'qrcode';

export interface BarcodeDetection {
  kind: BarcodeKind;
  format: string;
  rawValue: string;
  normalizedCode: string;
  contentType: ProductRecognitionContentType;
}

type NativeBarcodeDetector = {
  detect(image: ImageBitmap | HTMLImageElement): Promise<Array<{ rawValue?: string; format?: string }>>;
};

type NativeBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => NativeBarcodeDetector;

const barcodeFormats = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code'
];

export async function decodeBarcodeFromImage(asset?: LocalImageAsset): Promise<BarcodeDetection[]> {
  if (!asset) return [];
  const Detector = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
  if (!Detector || typeof createImageBitmap !== 'function') return [];

  try {
    const blob = await readImageBlob(asset);
    if (!blob) return [];
    const bitmap = await createImageBitmap(blob);
    const detector = new Detector({ formats: barcodeFormats });
    const detected = await detector.detect(bitmap);
    bitmap.close?.();
    return detected
      .map((item) => normalizeBarcodeDetection(item.rawValue || '', item.format || 'unknown'))
      .filter((item): item is BarcodeDetection => Boolean(item));
  } catch {
    return [];
  }
}

export function normalizeBarcodeDetection(rawValue: string, format = 'unknown'): BarcodeDetection | undefined {
  const raw = String(rawValue || '').trim();
  if (!raw) return undefined;
  const normalizedCode = extractNormalizedProductCode(raw);
  const lowerFormat = format.toLowerCase();
  const kind: BarcodeKind = lowerFormat.includes('qr') ? 'qrcode' : 'barcode';
  return {
    kind,
    format,
    rawValue: raw,
    normalizedCode,
    contentType: resolveContentType(raw, normalizedCode)
  };
}

export function extractNormalizedProductCode(value: string): string {
  const compact = String(value || '').replace(/[^\d]/g, '');
  const candidates = Array.from(new Set([
    ...(String(value || '').match(/\b\d{8}\b|\b\d{12}\b|\b\d{13}\b/g) || []),
    compact.length === 8 || compact.length === 12 || compact.length === 13 ? compact : ''
  ].filter(Boolean)));
  const valid = candidates.find(isValidGtin);
  return valid || candidates[0] || '';
}

export function extractPrintedProductCode(text: string): string {
  const source = String(text || '');
  const labeled = source.match(/(?:商品条码|条形码|条码|barcode|GTIN|EAN|UPC)[:：\s]*([0-9\s-]{8,20})/i)?.[1];
  if (!labeled) return '';
  const compact = labeled.replace(/[^\d]/g, '');
  if (!(compact.length === 8 || compact.length === 12 || compact.length === 13)) return '';
  return isValidGtin(compact) ? compact : '';
}

export function classifyQrContent(value: string): ProductRecognitionContentType {
  const raw = String(value || '').trim();
  if (!raw) return 'unknown';
  if (/^https?:\/\//i.test(raw) || /^www\./i.test(raw)) return 'url';
  if (extractNormalizedProductCode(raw)) return 'product_code';
  return raw.length > 2 ? 'text' : 'unknown';
}

function resolveContentType(raw: string, normalizedCode: string): ProductRecognitionContentType {
  if (/^https?:\/\//i.test(raw) || /^www\./i.test(raw)) return 'url';
  if (normalizedCode) return 'product_code';
  return classifyQrContent(raw);
}

function isValidGtin(value: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(value)) return false;
  const digits = value.split('').map((item) => Number(item));
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

async function readImageBlob(asset: LocalImageAsset): Promise<Blob | undefined> {
  if (asset.file instanceof Blob) return asset.file;
  if (/^data:image\//i.test(asset.tempFilePath)) {
    return await fetch(asset.tempFilePath).then((response) => response.blob());
  }
  if (/^https?:\/\//i.test(asset.tempFilePath) || asset.tempFilePath.startsWith('blob:')) {
    return await fetch(asset.tempFilePath).then((response) => response.blob());
  }
  return await readStoredImageBlob(asset);
}
