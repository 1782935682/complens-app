import { Hono } from 'hono';
import type { IngredientService, RiskLevel } from '../services/ingredientService.js';
import { isRiskLevel } from '../services/ingredientService.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function createIngredientsRoute(ingredientService: IngredientService) {
  const route = new Hono();

  route.get('/ingredients', async (context) => {
    const parsed = parseListQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await ingredientService.listIngredients(parsed.value);
    return context.json(result);
  });

  route.get('/ingredients/categories', async (context) => {
    const items = await ingredientService.getCategorySummaries();
    return context.json({ items });
  });

  route.get('/ingredients/search', async (context) => {
    const parsed = parseListQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await ingredientService.listIngredients(parsed.value);
    return context.json(result);
  });

  route.get('/ingredients/:id', async (context) => {
    const ingredient = await ingredientService.getIngredientById(context.req.param('id'));
    if (!ingredient) {
      return context.json({ error: 'not_found' }, 404);
    }

    return context.json(ingredient);
  });

  return route;
}

function parseListQuery(query: Record<string, string>) {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, 'page');
  if (!page.ok) {
    return page;
  }

  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit', MAX_LIMIT);
  if (!limit.ok) {
    return limit;
  }

  const riskLevel = query.riskLevel?.trim();
  if (riskLevel && !isRiskLevel(riskLevel)) {
    return invalidParameter('riskLevel', 'riskLevel must be one of low, medium, high, unknown');
  }

  return {
    ok: true as const,
    value: {
      q: normalizeOptionalQuery(query.q),
      category: normalizeOptionalQuery(query.category),
      riskLevel: riskLevel as RiskLevel | undefined,
      page: page.value,
      limit: limit.value
    }
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number, field: string, max?: number) {
  if (!value) {
    return { ok: true as const, value: fallback };
  }

  if (!/^\d+$/.test(value)) {
    return invalidParameter(field, `${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || (max && parsed > max)) {
    return invalidParameter(field, max ? `${field} must be between 1 and ${max}` : `${field} must be a positive integer`);
  }

  return { ok: true as const, value: parsed };
}

function normalizeOptionalQuery(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
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
