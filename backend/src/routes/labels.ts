import { Hono } from 'hono';
import type { LabelClassifyInput, LabelService } from '../services/labelService.js';
import { isLabelType } from '../services/labelService.js';

type LabelClassifyBody = {
  text?: unknown;
  imageAssetId?: unknown;
  userSelectedType?: unknown;
};

export function createLabelsRoute(labelService: LabelService) {
  const route = new Hono();

  route.post('/labels/classify', async (context) => {
    const parsed = await parseClassifyBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    return context.json(labelService.classifyLabel(parsed.value));
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
