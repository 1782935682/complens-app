import { formatBytes, SCAN_IMAGE_MAX_BYTES, validateScanImageFile } from '../utils/imageFile.js';
import { getApiBaseUrl, getAuthToken } from './storageService.js';

export const OCR_PROTOCOL_VERSION = 2;
export const OCR_ENDPOINT_PATH = '/api/ocr';
const OCR_TIMEOUT_MS = 15_000;

export const OCR_RESPONSE_CONTRACT = {
  schemaVersion: OCR_PROTOCOL_VERSION,
  required: ['text', 'confidence', 'provider', 'blocks'],
  confidenceRange: [0, 1],
  requiresConfirm: true
};

export async function recognizeImage(imageBlob, opts = {}) {
  const mode = detectOcrMode();
  if (mode !== 'real') return buildManualResult();
  return callRealOcr(imageBlob, opts);
}

export function detectOcrMode() {
  return getAuthToken() ? 'real' : 'manual';
}

export async function callRealOcr(blob, opts = {}) {
  if (!blob) return buildFallbackResult('empty_image', '请先选择一张清晰的配料表图片。');

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), OCR_TIMEOUT_MS) : null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${OCR_ENDPOINT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        imageBase64: await blobToBase64(blob),
        mimeType: blob.type || 'image/jpeg',
        category: normalizeCategory(opts.category)
      }),
      signal: controller?.signal
    });

    if (response.status === 503) return buildFallbackResult('ocr_not_configured', 'OCR 服务未配置，请手动输入文字。');
    if (response.status === 501) return buildFallbackResult('provider_pending', 'OCR 供应商尚未接入，请手动输入文字。');
    if (response.status === 429) return buildFallbackResult('rate_limited', '识别请求过多，请稍后再试。');
    if (response.status === 402) return buildFallbackResult('quota_exceeded', '本月 OCR 额度已用完，请手动输入文字。');
    if (!response.ok) return buildFallbackResult('server_error', 'OCR 服务异常，请手动输入文字。');

    const data = await response.json();
    const validation = validateOCRResponse(data);
    if (!validation.ok) return buildFallbackResult('invalid_response', '识别结果格式异常，请手动输入文字。');

    return {
      mode: 'real',
      rawText: validation.value.text,
      confidence: validation.value.confidence,
      provider: validation.value.provider,
      requiresConfirm: true,
      blocks: validation.value.blocks
    };
  } catch (error) {
    if (error?.name === 'AbortError') return buildFallbackResult('timeout', '识别超时，请检查网络或手动输入。');
    return buildFallbackResult('network_error', '网络异常，请手动输入文字。');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function buildManualResult() {
  return {
    mode: 'manual',
    rawText: '',
    confidence: 1,
    provider: 'manual',
    requiresConfirm: true,
    blocks: []
  };
}

export function buildFallbackResult(errorCode, errorMsg) {
  return {
    mode: 'fallback',
    rawText: '',
    confidence: 0,
    provider: 'none',
    requiresConfirm: true,
    blocks: [],
    errorCode,
    errorMsg
  };
}

export async function extractIngredientsFromImage(file, options = {}) {
  const validation = validateScanImageFile(file);
  if (!validation.ok) {
    return {
      enabled: false,
      text: '',
      validation,
      message: validation.message
    };
  }

  const request = buildOCRRequest(file, options);
  const result = await recognizeImage(file, options);
  return {
    enabled: result.mode === 'real',
    text: result.rawText,
    endpoint: OCR_ENDPOINT_PATH,
    protocolVersion: OCR_PROTOCOL_VERSION,
    request,
    fallback: buildOCRFallback(request),
    result,
    message: result.mode === 'real'
      ? 'OCR 识别完成，请进入确认页核对文本。'
      : 'OCR 服务未配置或未登录，请先使用手动输入模式。'
  };
}

export function buildOCRRequest(file, options = {}) {
  const validation = validateScanImageFile(file);
  const image = normalizeImageFile(file);
  return {
    protocolVersion: OCR_PROTOCOL_VERSION,
    requestType: 'ingredient-image-ocr',
    endpoint: OCR_ENDPOINT_PATH,
    category: normalizeCategory(options.category),
    locale: normalizeLocale(options.locale),
    createdAt: new Date().toISOString(),
    image,
    validation,
    clientConstraints: {
      maxBytes: SCAN_IMAGE_MAX_BYTES,
      maxSizeLabel: formatBytes(SCAN_IMAGE_MAX_BYTES),
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    },
    processingHints: {
      returnPlainText: true,
      preserveLineBreaks: true,
      returnCandidates: true,
      requireUserCorrectionBeforeAnalysis: true
    },
    outputContract: OCR_RESPONSE_CONTRACT,
    safetyRules: [
      '只返回图片中可见的配料表文本，不补写未识别内容。',
      '保留不确定项和候选项，置信度低时必须提示用户校正。',
      '识别结果必须先进入可编辑确认页，再进入数据库匹配和分析。',
      '未配置 OCR Key 时必须进入 manual 模式，不能返回伪造识别文本。'
    ]
  };
}

export function validateOCRResponse(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['response must be an object'], value: null };
  }

  const text = normalizeString(value.text);
  if (typeof value.text !== 'string') errors.push('text must be a string');

  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }

  const provider = normalizeString(value.provider);
  if (!provider) errors.push('provider must be a non-empty string');

  const blocks = normalizeBlocks(value.blocks, errors);
  if (value.blocks !== undefined && !Array.isArray(value.blocks)) errors.push('blocks must be an array');

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length ? null : { text, confidence, provider, blocks }
  };
}

export function buildOCRFallback(request) {
  const safeRequest = isPlainObject(request) ? request : {};
  const image = isPlainObject(safeRequest.image) ? safeRequest.image : {};
  const fileName = image.name || '已选择图片';
  return {
    schemaVersion: OCR_PROTOCOL_VERSION,
    text: '',
    confidence: 0,
    provider: 'manual',
    blocks: [],
    warnings: [
      '当前未连接真实 OCR 服务，不能从图片自动提取配料表文本。',
      `${fileName} 可保留图片预览并进入手动确认模式。`
    ],
    nextSteps: [
      '在确认页录入或粘贴包装上的配料表文字。',
      '确认文本无误后进入数据库匹配和配料分析。',
      '后续接入真实 OCR 后，识别结果仍会先进入可编辑确认页。'
    ]
  };
}

function normalizeBlocks(value, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [];
  return value.map((block, index) => {
    const text = normalizeString(block?.text);
    if (!text) errors.push(`blocks[${index}].text must be a non-empty string`);
    const confidence = Number(block?.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push(`blocks[${index}].confidence must be a number between 0 and 1`);
    }
    const bounds = isPlainObject(block?.bounds) ? block.bounds : undefined;
    return {
      text,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      bounds
    };
  });
}

function blobToBase64(blob) {
  if (typeof FileReader === 'function') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result || '').split(',')[1] || ''));
      reader.addEventListener('error', () => reject(reader.error || new Error('File read failed')));
      reader.readAsDataURL(blob);
    });
  }

  if (typeof Buffer !== 'undefined' && typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer().then((buffer) => Buffer.from(buffer).toString('base64'));
  }

  return '';
}

function normalizeImageFile(file) {
  return {
    name: normalizeString(file?.name) || 'ingredient-image',
    type: normalizeString(file?.type).toLowerCase(),
    size: Number.isFinite(file?.size) ? file.size : 0,
    sizeLabel: formatBytes(file?.size),
    lastModified: Number.isFinite(file?.lastModified) ? file.lastModified : 0
  };
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeLocale(value) {
  return normalizeString(value) || 'zh-CN';
}

function normalizeCategory(value) {
  const category = normalizeString(value);
  return ['food', 'cosmetics'].includes(category) ? category : 'food';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
