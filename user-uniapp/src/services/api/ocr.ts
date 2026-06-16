import { readImageAsBase64ForOcr } from '@/platform/file';
import type { LocalImageAsset, OcrResult } from '@/types';
import { requestJson } from './client';

interface OcrApiResponse {
  text?: string;
  confidence?: number;
  provider?: OcrResult['provider'];
  blocks?: Array<{ text?: string; confidence?: number }>;
}

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
        category: 'food'
      },
      timeoutMs: 15000
    });
    return {
      mode: response.provider === 'mock' ? 'mock' : 'real',
      text: String(response.text || ''),
      confidence: clampConfidence(response.confidence),
      provider: response.provider || 'none',
      blocks: Array.isArray(response.blocks)
        ? response.blocks.map((block) => ({ text: String(block.text || ''), confidence: clampConfidence(block.confidence) }))
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
