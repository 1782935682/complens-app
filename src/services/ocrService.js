import { formatBytes, PREVIEWABLE_IMAGE_TYPES, SCAN_IMAGE_MAX_BYTES, validateScanImageFile } from '../utils/imageFile.js';

export const OCR_PROTOCOL_VERSION = 1;
export const OCR_ENDPOINT_PATH = '/api/ocr/extract-ingredients';

export const OCR_RESPONSE_CONTRACT = {
  schemaVersion: OCR_PROTOCOL_VERSION,
  required: ['text', 'confidence', 'language', 'candidates', 'warnings', 'nextSteps'],
  confidenceRange: [0, 1]
};

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
  return {
    enabled: false,
    text: '',
    endpoint: OCR_ENDPOINT_PATH,
    protocolVersion: OCR_PROTOCOL_VERSION,
    request,
    fallback: buildOCRFallback(request),
    message: '图片识别接口已预留，当前未配置服务端 OCR 代理，请先使用手动录入或粘贴成分表文本。'
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
      acceptedTypes: [...PREVIEWABLE_IMAGE_TYPES]
    },
    processingHints: {
      returnPlainText: true,
      preserveLineBreaks: true,
      returnCandidates: true,
      requireUserCorrectionBeforeAnalysis: true
    },
    outputContract: OCR_RESPONSE_CONTRACT,
    safetyRules: [
      '只返回图片中可见的成分表文本，不补写未识别内容。',
      '保留不确定项和候选项，置信度低时必须提示用户校正。',
      '识别结果必须先进入可编辑文本区，再进入本地成分分析。',
      '输出必须符合 outputContract，不能返回纯文本代替结构化 JSON。'
    ]
  };
}

export function validateOCRResponse(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: ['response must be an object'],
      value: null
    };
  }

  const schemaVersion = Number(value.schemaVersion);
  if (schemaVersion !== OCR_PROTOCOL_VERSION) {
    errors.push(`schemaVersion must be ${OCR_PROTOCOL_VERSION}`);
  }

  const text = normalizeString(value.text);
  if (typeof value.text !== 'string') errors.push('text must be a string');

  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }

  const language = normalizeString(value.language);
  if (!language) errors.push('language must be a non-empty string');

  const candidates = normalizeCandidates(value.candidates, errors);
  const warnings = normalizeStringList(value.warnings);
  if (!Array.isArray(value.warnings)) errors.push('warnings must be an array');
  const nextSteps = normalizeStringList(value.nextSteps);
  if (!Array.isArray(value.nextSteps) || !nextSteps.length) errors.push('nextSteps must be a non-empty array');

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length
      ? null
      : {
        schemaVersion,
        text,
        confidence,
        language,
        candidates,
        warnings,
        nextSteps
      }
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
    language: safeRequest.locale || 'zh-CN',
    candidates: [],
    warnings: [
      '当前未连接服务端 OCR 代理，无法从图片自动提取成分表文本。',
      `${fileName} 已通过本地文件类型和大小检查后，可保留图片预览并手动录入。`
    ],
    nextSteps: [
      '将包装上的配料表文字录入到校正文本区。',
      '确认文本无误后进入本地成分分析。',
      '后续接入服务端 OCR 后，识别结果仍会先进入可编辑文本区。'
    ]
  };
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

function normalizeCandidates(value, errors) {
  if (!Array.isArray(value)) {
    errors.push('candidates must be an array');
    return [];
  }

  return value.map((candidate, index) => {
    const text = normalizeString(candidate?.text);
    if (!text) errors.push(`candidates[${index}].text must be a non-empty string`);
    const confidence = Number(candidate?.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push(`candidates[${index}].confidence must be a number between 0 and 1`);
    }
    return {
      text,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      source: normalizeString(candidate?.source) || 'ocr'
    };
  });
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
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
