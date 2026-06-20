import { createHash, createHmac, randomUUID } from 'node:crypto';

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
  apiSecret?: string;
  aliyunEndpoint?: string;
  aliyunAction?: string;
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
const DEFAULT_ALIYUN_OCR_ENDPOINT = 'https://ocr-api.cn-hangzhou.aliyuncs.com';
const DEFAULT_ALIYUN_OCR_ACTION = 'RecognizeAdvanced';
const ALIYUN_OCR_VERSION = '2021-07-07';
const ALIYUN_SIGNATURE_ALGORITHM = 'ACS3-HMAC-SHA256';

export function normalizeOcrProvider(value: string | undefined): OcrProviderName {
  const normalized = String(value || '').trim().toLowerCase();
  return supportedOcrProviders.includes(normalized as OcrProviderName)
    ? normalized as OcrProviderName
    : 'aliyun';
}

export function requiresOcrApiKey(provider: OcrProviderName) {
  return provider === 'aliyun' || provider === 'paddleocr';
}

export function requiresOcrApiSecret(provider: OcrProviderName) {
  return provider === 'aliyun';
}

export function requiresOcrServiceUrl(provider: OcrProviderName) {
  return provider === 'rapidocr';
}

export async function recognizeWithOcrProvider(provider: OcrProviderName, input: OcrProviderInput, runtime: OcrProviderRuntime = {}): Promise<OcrProviderResult | null> {
  if (provider === 'mock') return buildMockOcrResult(input);
  if (provider === 'aliyun') return recognizeWithAliyunOcr(input, runtime);
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

async function recognizeWithAliyunOcr(input: OcrProviderInput, runtime: OcrProviderRuntime): Promise<OcrProviderResult> {
  const accessKeyId = String(runtime.apiKey || '').trim();
  const accessKeySecret = String(runtime.apiSecret || '').trim();
  if (!accessKeyId || !accessKeySecret) {
    throw new OcrProviderError('ocr_not_configured', 'ALIYUN_ACCESS_KEY_ID/OCR_API_KEY and ALIYUN_ACCESS_KEY_SECRET/OCR_API_SECRET are required for aliyun', 503);
  }

  const image = Buffer.from(input.imageBase64, 'base64');
  const endpoint = normalizeAliyunEndpoint(runtime.aliyunEndpoint);
  const action = normalizeAliyunAction(runtime.aliyunAction);
  const query = buildAliyunOcrQuery(action);
  const request = buildAliyunSignedRequest({
    accessKeyId,
    accessKeySecret,
    action,
    body: image,
    endpoint,
    mimeType: input.mimeType,
    query
  });

  const timeoutMs = normalizeTimeoutMs(runtime.timeoutMs);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: image,
      signal: abortController.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new OcrProviderError('ocr_provider_timeout', `Aliyun OCR service timed out after ${timeoutMs}ms`, 504);
    }
    throw new OcrProviderError('ocr_provider_unreachable', error instanceof Error ? error.message : 'Aliyun OCR service is unreachable', 503);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await readProviderError(response);
    throw new OcrProviderError('ocr_provider_failed', detail || `Aliyun OCR service returned HTTP ${response.status}`, 502);
  }

  const payload = await response.json().catch(() => null);
  return normalizeAliyunOcrPayload(payload);
}

async function recognizeWithRapidOcr(input: OcrProviderInput, runtime: OcrProviderRuntime): Promise<OcrProviderResult> {
  const serviceUrl = normalizeServiceUrl(runtime.serviceUrl);
  if (!serviceUrl) {
    throw new OcrProviderError('ocr_not_configured', 'OCR_LOCAL_URL or OCR_SERVICE_URL is required for rapidocr', 503);
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
    raw_text?: unknown;
    text?: unknown;
    confidence?: unknown;
    blocks?: unknown;
  };
  const rawText = firstString(value.rawText, value.raw_text, value.text);
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

function normalizeAliyunOcrPayload(payload: unknown): OcrProviderResult {
  if (!payload || typeof payload !== 'object') {
    throw new OcrProviderError('ocr_provider_invalid_response', 'Aliyun OCR service returned an invalid JSON response', 502);
  }
  const value = payload as { Data?: unknown; Code?: unknown; Message?: unknown };
  if (typeof value.Code === 'string' && value.Code) {
    throw new OcrProviderError('ocr_provider_failed', `${value.Code}: ${String(value.Message || '')}`.trim(), 502);
  }
  if (typeof value.Data !== 'string' || !value.Data.trim()) {
    throw new OcrProviderError('ocr_provider_invalid_response', 'Aliyun OCR service response is missing Data', 502);
  }

  let data: {
    content?: unknown;
    prism_wordsInfo?: unknown;
    prism_rowsInfo?: unknown;
  };
  try {
    data = JSON.parse(value.Data);
  } catch {
    throw new OcrProviderError('ocr_provider_invalid_response', 'Aliyun OCR service Data is not valid JSON', 502);
  }

  const wordBlocks = Array.isArray(data.prism_wordsInfo) ? data.prism_wordsInfo.map(normalizeAliyunWordBlock).filter((block) => block.text) : [];
  const rowBlocks = Array.isArray(data.prism_rowsInfo) ? data.prism_rowsInfo.map(normalizeAliyunRowBlock).filter((block) => block.text) : [];
  const blocks = rowBlocks.length ? rowBlocks : wordBlocks;
  const text = typeof data.content === 'string' && data.content.trim()
    ? data.content.trim()
    : blocks.map((block) => block.text).join('\n');
  if (!text && !blocks.length) {
    throw new OcrProviderError('ocr_provider_invalid_response', 'Aliyun OCR service response did not contain readable text blocks', 502);
  }

  return {
    text,
    confidence: normalizeConfidence(undefined, blocks),
    provider: 'aliyun',
    blocks: blocks.length ? blocks : [{ text, confidence: 0.8 }]
  };
}

function firstString(...values: unknown[]): string | null {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value : null;
}

function normalizeAliyunWordBlock(value: unknown) {
  const block = value && typeof value === 'object'
    ? value as { word?: unknown; prob?: unknown; pos?: unknown }
    : {};
  const bounds = normalizeAliyunBounds(block.pos);
  return {
    text: typeof block.word === 'string' ? block.word.trim() : '',
    confidence: normalizeConfidenceFromPercent(block.prob),
    ...(bounds ? { bounds } : {})
  };
}

function normalizeAliyunRowBlock(value: unknown) {
  const block = value && typeof value === 'object'
    ? value as { word?: unknown; text?: unknown; prob?: unknown; pos?: unknown }
    : {};
  const bounds = normalizeAliyunBounds(block.pos);
  return {
    text: firstString(block.word, block.text) || '',
    confidence: normalizeConfidenceFromPercent(block.prob),
    ...(bounds ? { bounds } : {})
  };
}

function normalizeRapidOcrBlock(value: unknown) {
  const block = value && typeof value === 'object'
    ? value as { text?: unknown; confidence?: unknown; box?: unknown; bounds?: unknown }
    : {};
  const bounds = normalizeRapidOcrBounds(block.box) || normalizeRapidOcrBounds(block.bounds);
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

function normalizeAliyunBounds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const points = value
    .flatMap((point) => point && typeof point === 'object'
      ? { x: Number((point as { x?: unknown }).x), y: Number((point as { y?: unknown }).y) }
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

function normalizeConfidenceFromPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clampConfidence(numeric > 1 ? numeric / 100 : numeric);
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

function normalizeAliyunEndpoint(value: string | undefined) {
  const raw = String(value || DEFAULT_ALIYUN_OCR_ENDPOINT).trim() || DEFAULT_ALIYUN_OCR_ENDPOINT;
  const endpoint = raw.startsWith('http') ? raw : `https://${raw}`;
  return new URL(endpoint.replace(/\/+$/u, ''));
}

function normalizeAliyunAction(value: string | undefined) {
  const normalized = String(value || DEFAULT_ALIYUN_OCR_ACTION).trim();
  return normalized === 'RecognizeGeneral' ? 'RecognizeGeneral' : DEFAULT_ALIYUN_OCR_ACTION;
}

function buildAliyunOcrQuery(action: string) {
  if (action !== 'RecognizeAdvanced') return new URLSearchParams();
  return new URLSearchParams([
    ['NeedRotate', 'true'],
    ['NeedSortPage', 'false'],
    ['OutputTable', 'true'],
    ['Row', 'true']
  ]);
}

function buildAliyunSignedRequest(input: {
  accessKeyId: string;
  accessKeySecret: string;
  action: string;
  body: Buffer;
  endpoint: URL;
  mimeType: string;
  query: URLSearchParams;
}) {
  const method = 'POST';
  const hashedPayload = sha256Hex(input.body);
  const path = '/';
  const query = canonicalQueryString(input.query);
  const headers: Record<string, string> = {
    host: input.endpoint.host,
    'content-type': input.mimeType || 'application/octet-stream',
    'x-acs-action': input.action,
    'x-acs-content-sha256': hashedPayload,
    'x-acs-date': new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z'),
    'x-acs-signature-nonce': randomUUID(),
    'x-acs-version': ALIYUN_OCR_VERSION
  };
  const signedHeaderNames = Object.keys(headers).map((item) => item.toLowerCase()).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  ].join('\n');
  const stringToSign = `${ALIYUN_SIGNATURE_ALGORITHM}\n${sha256Hex(canonicalRequest)}`;
  const signature = createHmac('sha256', input.accessKeySecret).update(stringToSign).digest('hex');
  headers.Authorization = `${ALIYUN_SIGNATURE_ALGORITHM} Credential=${input.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;

  const url = new URL(path, input.endpoint);
  url.search = query;
  return { url, headers };
}

function canonicalQueryString(query: URLSearchParams) {
  return [...query.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/gu, (item) => `%${item.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256Hex(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
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
  if (body && typeof body === 'object') {
    if ('detail' in body) return String(body.detail || '');
    const code = 'Code' in body ? String(body.Code || '') : '';
    const message = 'Message' in body ? String(body.Message || '') : '';
    const joined = [code, message].filter(Boolean).join(': ');
    if (joined) return joined;
  }
  return response.text().catch(() => '');
}
