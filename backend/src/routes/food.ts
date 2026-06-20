import { Hono } from 'hono';
import type { FoodAnalyzeRequest, FoodAnalyzeService } from '../services/foodAnalyzeService.js';

export function createFoodRoute(foodAnalyzeService: FoodAnalyzeService) {
  const route = new Hono();

  route.post('/food/analyze', async (context) => {
    const parsed = await parseBody(context);
    if (!parsed.ok) return context.json(parsed.error, 400);
    if (!parsed.value.ocrText.trim()) {
      return context.json({
        error: 'insufficient_label_data',
        message: 'ocrText is required.'
      }, 422);
    }
    return context.json(await foodAnalyzeService.analyze(parsed.value));
  });

  return route;
}

async function parseBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }
    const input = body as Record<string, unknown>;
    if (typeof input.ocrText !== 'string') return invalidParameter('ocrText', 'ocrText must be a string');
    if (input.ocrText.length > 20000) return invalidParameter('ocrText', 'ocrText must be no longer than 20000 characters');
    return {
      ok: true as const,
      value: {
        ocrText: input.ocrText,
        userProfile: parseUserProfile(input.userProfile),
        options: parseOptions(input.options)
      } satisfies FoodAnalyzeRequest
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
}

function parseUserProfile(value: unknown): FoodAnalyzeRequest['userProfile'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  return {
    goals: stringArray(input.goals),
    allergens: stringArray(input.allergens),
    forChild: Boolean(input.forChild),
    pregnant: Boolean(input.pregnant),
    highBloodPressure: Boolean(input.highBloodPressure)
  };
}

function parseOptions(value: unknown): FoodAnalyzeRequest['options'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  return {
    enableAi: input.enableAi === undefined ? undefined : Boolean(input.enableAi),
    provider: typeof input.provider === 'string'
      ? input.provider as NonNullable<FoodAnalyzeRequest['options']>['provider']
      : undefined
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20) : [];
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
