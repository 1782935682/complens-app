export const supportedOcrProviders = ['manual', 'mock', 'aliyun', 'paddleocr', 'rapidocr'] as const;

export type OcrProviderName = typeof supportedOcrProviders[number];

export type OcrProviderInput = {
  imageBase64: string;
  mimeType: string;
  category: string;
};

export type OcrProviderResult = {
  text: string;
  confidence: number;
  provider: OcrProviderName;
  blocks: Array<{
    text: string;
    confidence: number;
    bounds?: unknown;
  }>;
};

export type OcrProviderRuntime = {
  apiKey?: string;
  serviceUrl?: string;
  timeoutMs?: number;
};

export class OcrProviderError extends Error {
  code: string;
  status: 502 | 503 | 504;

  constructor(code: string, message: string, status: 502 | 503 | 504 = 502) {
    super(message);
    this.name = 'OcrProviderError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_RAPIDOCR_TIMEOUT_MS = 30_000;

export function normalizeOcrProvider(value: string | undefined): OcrProviderName {
  const normalized = String(value || '').trim().toLowerCase();
  return supportedOcrProviders.includes(normalized as OcrProviderName)
    ? normalized as OcrProviderName
    : 'aliyun';
}

export function requiresOcrApiKey(provider: OcrProviderName) {
  return provider === 'aliyun' || provider === 'paddleocr';
}

export function requiresOcrServiceUrl(provider: OcrProviderName) {
  return provider === 'rapidocr';
}

export async function recognizeWithOcrProvider(provider: OcrProviderName, input: OcrProviderInput, runtime: OcrProviderRuntime = {}): Promise<OcrProviderResult | null> {
  if (provider === 'mock') return buildMockOcrResult(input);
  if (provider === 'rapidocr') return recognizeWithRapidOcr(input, runtime);
  return null;
}

function buildMockOcrResult(input: OcrProviderInput): OcrProviderResult {
  const text = input.category === 'food'
    ? '水，柠檬酸，山梨酸钾'
    : '水，甘油，烟酰胺';
  return {
    text,
    confidence: 0.92,
    provider: 'mock',
    blocks: [
      {
        text,
        confidence: 0.92
      }
    ]
  };
}

async function recognizeWithRapidOcr(input: OcrProviderInput, runtime: OcrProviderRuntime): Promise<OcrProviderResult> {
  const serviceUrl = normalizeServiceUrl(runtime.serviceUrl);
  if (!serviceUrl) {
    throw new OcrProviderError('ocr_not_configured', 'OCR_SERVICE_URL is required for rapidocr', 503);
  }

  const image = Buffer.from(input.imageBase64, 'base64');
  const formData = new FormData();
  formData.append('file', new Blob([image], { type: input.mimeType }), `ingredient-image${extensionForMimeType(input.mimeType)}`);

  const timeoutMs = normalizeTimeoutMs(runtime.timeoutMs);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${serviceUrl}/ocr`, {
      method: 'POST',
      body: formData,
      signal: abortController.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new OcrProviderError('ocr_provider_timeout', `RapidOCR service timed out after ${timeoutMs}ms`, 504);
    }
    throw new OcrProviderError('ocr_provider_unreachable', error instanceof Error ? error.message : 'RapidOCR service is unreachable', 503);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await readProviderError(response);
    throw new OcrProviderError('ocr_provider_failed', detail || `RapidOCR service returned HTTP ${response.status}`, 502);
  }

  const payload = await response.json().catch(() => null);
  return normalizeRapidOcrPayload(payload);
}

function normalizeRapidOcrPayload(payload: unknown): OcrProviderResult {
  if (!payload || typeof payload !== 'object') {
    throw new OcrProviderError('ocr_provider_invalid_response', 'RapidOCR service returned an invalid JSON response', 502);
  }

  const value = payload as {
    rawText?: unknown;
    confidence?: unknown;
    blocks?: unknown;
  };
  const rawText = typeof value.rawText === 'string' ? value.rawText : null;
  const rawBlocks = Array.isArray(value.blocks) ? value.blocks : null;
  if (rawText === null && rawBlocks === null) {
    throw new OcrProviderError('ocr_provider_invalid_response', 'RapidOCR service response is missing rawText or blocks', 502);
  }

  const blocks = rawBlocks
    ? rawBlocks.map(normalizeRapidOcrBlock).filter((block) => block.text)
    : [];
  const text = rawText !== null
    ? rawText.trim()
    : blocks.map((block) => block.text).join('\n');
  if (rawText === null && !blocks.length) {
    throw new OcrProviderError('ocr_provider_invalid_response', 'RapidOCR service response did not contain readable text blocks', 502);
  }

  return {
    text,
    confidence: normalizeConfidence(value.confidence, blocks),
    provider: 'rapidocr',
    blocks
  };
}

function normalizeRapidOcrBlock(value: unknown) {
  const block = value && typeof value === 'object'
    ? value as { text?: unknown; confidence?: unknown; box?: unknown }
    : {};
  const bounds = normalizeRapidOcrBounds(block.box);
  return {
    text: typeof block.text === 'string' ? block.text.trim() : '',
    confidence: normalizeConfidence(block.confidence),
    ...(bounds ? { bounds } : {})
  };
}

function normalizeRapidOcrBounds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const points = value
    .flatMap((point) => Array.isArray(point) && point.length >= 2
      ? { x: Number(point[0]), y: Number(point[1]) }
      : [])
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  return points.length ? { points } : null;
}

function normalizeConfidence(value: unknown, fallbackBlocks: Array<{ confidence: number }> = []) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return clampConfidence(numeric);
  if (fallbackBlocks.length) {
    const total = fallbackBlocks.reduce((sum, block) => sum + block.confidence, 0);
    return clampConfidence(total / fallbackBlocks.length);
  }
  return 0;
}

function clampConfidence(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalizeServiceUrl(value: string | undefined) {
  return String(value || '').trim().replace(/\/+$/u, '');
}

function normalizeTimeoutMs(value: number | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : DEFAULT_RAPIDOCR_TIMEOUT_MS;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function extensionForMimeType(mimeType: string) {
  if (/png$/iu.test(mimeType)) return '.png';
  if (/webp$/iu.test(mimeType)) return '.webp';
  return '.jpg';
}

async function readProviderError(response: Response) {
  const body = await response.json().catch(() => null);
  if (body && typeof body === 'object' && 'detail' in body) return String(body.detail || '');
  return response.text().catch(() => '');
}
