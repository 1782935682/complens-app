import { Hono } from 'hono';
import type { NutritionParseInput, NutritionService } from '../services/nutritionService.js';

type NutritionParseBody = {
  text?: unknown;
  perUnit?: unknown;
  servingSize?: unknown;
};

export function createNutritionRoute(nutritionService: NutritionService) {
  const route = new Hono();

  route.post('/nutrition/parse', async (context) => {
    const parsed = await parseNutritionBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const parseResult = nutritionService.parseNutritionText(parsed.value);
    const hasParsedValues = parseResult.nutrition.some(hasParsedNutrientValue);
    if (!hasParsedValues) {
      return context.json({ error: 'parse_failed', message: 'Unable to parse nutrition fields from text.' }, 422);
    }

    return context.json(parseResult);
  });

  return route;
}

function hasParsedNutrientValue(field: { key: string; value?: string }) {
  if (!field.value) return false;
  return field.key !== 'perUnit' && field.key !== 'servingSize' && field.key !== 'nrvPercent';
}

async function parseNutritionBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }

    const bodyObject = body as Record<string, unknown>;
    const text = parseRequiredString(bodyObject.text, 'text', 5000);
    if (!text.ok) return text;

    const perUnit = parseOptionalString(bodyObject.perUnit, 'perUnit', 50);
    if (!perUnit.ok) return perUnit;

    const servingSize = parseOptionalString(bodyObject.servingSize, 'servingSize', 50);
    if (!servingSize.ok) return servingSize;

    return {
      ok: true as const,
      value: {
        text: text.value,
        perUnit: perUnit.value,
        servingSize: servingSize.value
      } as NutritionParseInput
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseRequiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string') {
    return invalidParameter(field, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return invalidParameter(field, `${field} is required`);
  }
  if (trimmed.length > maxLength) {
    return invalidParameter(field, `${field} must be no longer than ${maxLength} characters`);
  }
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
