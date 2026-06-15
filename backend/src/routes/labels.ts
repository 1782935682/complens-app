import { Hono } from 'hono';
import type { LabelClassifyInput, LabelService } from '../services/labelService.js';
import type { LabelScanService, LabelScanSessionInput, LabelScanImageStatus } from '../services/labelScanService.js';
import { isLabelType } from '../services/labelService.js';

type LabelClassifyBody = {
  text?: unknown;
  imageAssetId?: unknown;
  userSelectedType?: unknown;
};

type LabelScanBody = {
  sessionId?: unknown;
  labelTypeHint?: unknown;
  images?: unknown;
};

type LabelScanImagePayload = {
  assetId?: unknown;
  labelType?: unknown;
  mimeType?: unknown;
  ocrResultId?: unknown;
  status?: unknown;
};

export function createLabelsRoute(labelService: LabelService, labelScanService: LabelScanService) {
  const route = new Hono();

  route.post('/labels/classify', async (context) => {
    const parsed = await parseClassifyBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    return context.json(labelService.classifyLabel(parsed.value));
  });

  route.post('/labels/scan', async (context) => {
    const parsed = await parseScanBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    try {
      const result = await labelScanService.upsertScanSession(parsed.value);
      return context.json(result);
    } catch (error) {
      if (isInvalidParameterError(error)) {
        return context.json({
          error: error.code,
          field: error.field,
          message: error.message
        }, 400);
      }
      throw error;
    }
  });

  return route;
}

async function parseClassifyBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const parsed = parseClassifyInput(body as LabelClassifyBody);
    if (!parsed.ok) return parsed;
    return {
      ok: true as const,
      value: parsed.value
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

async function parseScanBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const parsed = parseScanInput(body as LabelScanBody);
    if (!parsed.ok) return parsed;
    return {
      ok: true as const,
      value: parsed.value
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseClassifyInput(body: LabelClassifyBody) {
  const text = parseOptionalString(body.text, 'text', 5000);
  if (!text.ok) return text;

  const imageAssetId = parseOptionalString(body.imageAssetId, 'imageAssetId', 200);
  if (!imageAssetId.ok) return imageAssetId;

  if (body.userSelectedType !== undefined && !isLabelType(body.userSelectedType)) {
    return invalidParameter('userSelectedType', 'userSelectedType must be one of ingredient_list, nutrition_facts, front_claims, barcode_or_product, unknown_label');
  }

  return {
    ok: true as const,
    value: {
      text: text.value,
      imageAssetId: imageAssetId.value,
      userSelectedType: body.userSelectedType as LabelClassifyInput['userSelectedType']
    }
  };
}

function parseScanInput(body: LabelScanBody) {
  const sessionId = parseOptionalString(body.sessionId, 'sessionId', 120);
  if (!sessionId.ok) return sessionId;

  const labelTypeHint = parseOptionalLabelType(body.labelTypeHint, 'labelTypeHint');
  if (!labelTypeHint.ok) return labelTypeHint;

  const images = parseImageList(body.images, 'images');
  if (!images.ok) return images;

  return {
    ok: true as const,
    value: {
      sessionId: sessionId.value,
      labelTypeHint: labelTypeHint.value,
      images: images.value
    } as LabelScanSessionInput
  };
}

function parseImageList(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return { ok: true as const, value: [] as NonNullable<LabelScanSessionInput['images']> };
  }
  if (!Array.isArray(value)) return invalidParameter(field, `${field} must be an array`);
  if (value.length > 3) return invalidParameter(field, `${field} must include no more than 3 items`);

  const images: NonNullable<LabelScanSessionInput['images']> = [];

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return invalidParameter(field, `${field}[${index}] must be an object`);
    }
    const image = item as LabelScanImagePayload;

    const assetId = parseRequiredString(image.assetId, `${field}[${index}].assetId`, 200);
    if (!assetId.ok) return assetId;

    const labelType = parseOptionalLabelType(image.labelType, `${field}[${index}].labelType`);
    if (!labelType.ok) return labelType;

    const mimeType = parseOptionalString(image.mimeType, `${field}[${index}].mimeType`, 120);
    if (!mimeType.ok) return mimeType;

    const ocrResultId = parseOptionalString(image.ocrResultId, `${field}[${index}].ocrResultId`, 120);
    if (!ocrResultId.ok) return ocrResultId;

    const status = parseOptionalImageStatus(image.status, `${field}[${index}].status`);
    if (!status.ok) return status;

    images.push({
      assetId: assetId.value,
      labelType: labelType.value,
      mimeType: mimeType.value,
      ocrResultId: ocrResultId.value,
      status: status.value
    });
  }

  return {
    ok: true as const,
    value: dedupeImageInputs(images)
  };
}

function parseOptionalLabelType(value: unknown, field: string) {
  if (value === undefined || value === null) return { ok: true as const, value: undefined };
  if (typeof value !== 'string' || !isLabelType(value)) {
    return invalidParameter(field, `${field} must be one of ingredient_list, nutrition_facts, front_claims, barcode_or_product, unknown_label`);
  }
  return { ok: true as const, value };
}

function parseOptionalImageStatus(value: unknown, field: string) {
  if (value === undefined || value === null) return { ok: true as const, value: undefined };
  if (value === 'ocr_input' || value === 'ocr_success' || value === 'ocr_failed' || value === 'manual_entry') {
    return { ok: true as const, value: value as LabelScanImageStatus };
  }
  return invalidParameter(field, `${field} must be one of ocr_input, ocr_success, ocr_failed, manual_entry`);
}

function parseRequiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') return invalidParameter(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return invalidParameter(field, `${field} is required`);
  if (trimmed.length > maxLength) return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  return {
    ok: true as const,
    value: trimmed
  };
}

function parseOptionalString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) return { ok: true as const, value: undefined };
  if (typeof value !== 'string') return invalidParameter(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  return {
    ok: true as const,
    value: trimmed || undefined
  };
}

function dedupeImageInputs(images: NonNullable<LabelScanSessionInput['images']>) {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.assetId)) return false;
    seen.add(image.assetId);
    return true;
  });
}

function isInvalidParameterError(error: unknown): error is { code: 'invalid_parameter'; field: string; message: string } {
  return (
    Boolean(error) &&
    typeof error === 'object' &&
    (error as { code?: unknown }).code === 'invalid_parameter' &&
    typeof (error as { field?: unknown }).field === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

function invalidParameter(field: string, message: string) {
  return {
    ok: false as const,
    error: {
      error: 'invalid_parameter',
      field,
      message
    }
  };
}
