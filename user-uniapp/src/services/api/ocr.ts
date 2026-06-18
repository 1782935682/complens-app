import { readImageAsBase64ForOcr } from '@/platform/file';
import type { LocalImageAsset, OcrResult } from '@/types';
import { requestJson } from './client';

interface OcrApiResponse {
  text?: string;
  confidence?: number;
  provider?: OcrResult['provider'];
  blocks?: OcrApiBlock[];
}

type OcrApiBlock = {
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
  bounds?: unknown;
  box?: unknown;
};

interface OcrApiError {
  error?: string;
  field?: string;
  message?: string;
}

export async function recognizeImageByBackend(asset?: LocalImageAsset): Promise<OcrResult> {
  if (!asset) return buildFallbackResult('manual_required', '图片暂不能读取为后端 OCR 请求，请手动输入。');

  try {
    const image = await readImageAsBase64ForOcr(asset);
    if (!image.base64) return buildFallbackResult('manual_required', '图片暂不能读取为后端 OCR 请求，请手动输入。');
    if (image.exceedsLimit) {
      return buildFallbackResult('image_too_large', '图片体积过大，请拍摄更小分辨率后重试，或改为手动输入。');
    }

    const response = await requestJson<OcrApiResponse>('/ocr', {
      method: 'POST',
      authMode: 'optional',
      data: {
        imageBase64: image.base64,
        mimeType: asset.mimeType,
        category: 'food',
        target: 'food_label',
        expectedText: ['配料表', '配料', '食品配料', '营养成分表', '包装正面文字', 'Ingredients', 'Nutrition Facts']
      },
      timeoutMs: 15000
    });
    return {
      mode: response.provider === 'mock' ? 'mock' : 'real',
      text: String(response.text || ''),
      confidence: clampConfidence(response.confidence),
      provider: response.provider || 'none',
      blocks: Array.isArray(response.blocks)
        ? response.blocks.map(normalizeApiBlock)
        : [],
      requiresUserConfirmation: true
    };
  } catch (error) {
    const rawMessage = String((error as { message?: string })?.message || '');
    const code = String((error as { code?: string })?.code || 'image_read_or_ocr_failed');
    const field = String((error as OcrApiError)?.field || '');
    return buildFallbackResult(code, mapOcrErrorMessage(code, rawMessage, field));
  }
}

export function buildManualOcrResult(): OcrResult {
  return {
    mode: 'manual',
    text: '',
    confidence: 1,
    provider: 'manual',
    blocks: [],
    requiresUserConfirmation: true
  };
}

function buildFallbackResult(errorCode: string, errorMessage: string): OcrResult {
  return {
    mode: 'fallback',
    text: '',
    confidence: 0,
    provider: 'none',
    blocks: [],
    errorCode,
    errorMessage,
    requiresUserConfirmation: true
  };
}

function clampConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

function toOptionalNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeApiBlock(block: OcrApiBlock) {
  const rect = boundsToRect(block.bounds) || boundsToRect(block.box);
  return {
    text: String(block.text || ''),
    x: toOptionalNumber(block.x) ?? rect?.x,
    y: toOptionalNumber(block.y) ?? rect?.y,
    width: toOptionalNumber(block.width) ?? rect?.width,
    height: toOptionalNumber(block.height) ?? rect?.height,
    confidence: clampConfidence(block.confidence)
  };
}

function boundsToRect(value: unknown): { x: number; y: number; width: number; height: number } | undefined {
  const points = extractBoundsPoints(value);
  if (!points.length) return undefined;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

function extractBoundsPoints(value: unknown): Array<{ x: number; y: number }> {
  const rawPoints = value && typeof value === 'object' && 'points' in value
    ? (value as { points?: unknown }).points
    : value;
  if (!Array.isArray(rawPoints)) return [];
  return rawPoints.flatMap((point) => {
    if (Array.isArray(point) && point.length >= 2) {
      const x = Number(point[0]);
      const y = Number(point[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    }
    if (point && typeof point === 'object') {
      const x = Number((point as { x?: unknown }).x);
      const y = Number((point as { y?: unknown }).y);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    }
    return [];
  });
}

function mapOcrErrorMessage(code: string, detail = '', field = ''): string {
  if (code === 'manual_required' || code === 'image_read_or_ocr_failed') return '图片暂不能读取或识别失败，可重试或手动输入。';
  if (code === 'ocr_not_configured') return '当前 OCR 后端尚未配置，已保留手动输入路径。';
  if (code === 'invalid_parameter' && field === 'imageBase64') {
    return isOcrImageSizeParameterError(detail)
      ? '图片过大，建议拍摄更小分辨率后重试，或改为手动输入。'
      : '图片参数错误，请重试或手动输入。';
  }
  if (code === 'auth_required') return '当前 OCR 后端需要登录，已保留手动输入路径。';
  if (code === 'http_401') return '当前 OCR 后端需要登录，已保留手动输入路径。';
  if (code === 'image_too_large') return '图片体积过大，请拍摄更小分辨率后重试，或改为手动输入。';
  if (code === 'ocr_provider_timeout' || code === 'timeout') return '识别超时，可重试或手动输入。';
  return '识别失败，可重试或手动输入。';
}

function isOcrImageSizeParameterError(detail = ''): boolean {
  const normalized = detail.toLowerCase();
  return (
    normalized.includes('imagebase64')
    || normalized.includes('image base64')
    || normalized.includes('imagebase64 must be')
    || normalized.includes('too large')
    || normalized.includes('exceed')
    || normalized.includes('10 mb')
  );
}
