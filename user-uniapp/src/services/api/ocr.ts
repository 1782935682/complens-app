import { readImageAsBase64 } from '@/platform/file';
import type { LocalImageAsset, OcrResult } from '@/types';
import { requestJson } from './client';

interface OcrApiResponse {
  text?: string;
  confidence?: number;
  provider?: OcrResult['provider'];
  blocks?: Array<{ text?: string; confidence?: number }>;
}

export async function recognizeImageByBackend(asset?: LocalImageAsset): Promise<OcrResult> {
  if (!asset) return buildFallbackResult('manual_required', '图片暂不能读取为后端 OCR 请求，请手动输入。');

  try {
    const imageBase64 = await readImageAsBase64(asset);
    if (!imageBase64) return buildFallbackResult('manual_required', '图片暂不能读取为后端 OCR 请求，请手动输入。');

    const response = await requestJson<OcrApiResponse>('/ocr', {
      method: 'POST',
      data: {
        imageBase64,
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
    const code = String((error as { code?: string })?.code || 'image_read_or_ocr_failed');
    return buildFallbackResult(code, mapOcrErrorMessage(code));
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

function mapOcrErrorMessage(code: string): string {
  if (code === 'manual_required' || code === 'image_read_or_ocr_failed') return '图片暂不能读取或识别失败，可重试或手动输入。';
  if (code === 'ocr_not_configured') return '当前 OCR 后端尚未配置，已保留手动输入路径。';
  if (code === 'http_401') return '当前 OCR 后端需要登录，已保留手动输入路径。';
  if (code === 'ocr_provider_timeout' || code === 'timeout') return '识别超时，可重试或手动输入。';
  return '识别失败，可重试或手动输入。';
}
