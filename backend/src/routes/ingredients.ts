import { Hono } from 'hono';
import type { IngredientService, RiskLevel, SearchSort } from '../services/ingredientService.js';
import { isRiskLevel, isSearchSort } from '../services/ingredientService.js';

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

  route.post('/ingredients/batch-search', async (context) => {
    const parsed = await parseBatchSearchBody(context);
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const results = await ingredientService.batchSearch(parsed.value);
    return context.json({ results });
  });

  // Keep the explicit search endpoint before /ingredients/:id so "search" is
  // never interpreted as an ingredient id by routers with ordered matching.
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

async function parseBatchSearchBody(context: { req: { json(): Promise<unknown> } }) {
  try {
    const body = await context.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidParameter('body', 'request body must be an object');
    }
    const terms = (body as { terms?: unknown }).terms;
    if (!Array.isArray(terms)) {
      return invalidParameter('terms', 'terms must be an array');
    }
    const normalizedTerms = terms.map((term) => String(term || '').trim()).filter(Boolean);
    if (normalizedTerms.length > 200) {
      return invalidParameter('terms', 'terms must include no more than 200 items');
    }
    return {
      ok: true as const,
      value: {
        terms: normalizedTerms,
        includeENumbers: (body as { includeENumbers?: unknown }).includeENumbers !== false
      }
    };
  } catch {
    return invalidParameter('body', 'request body must be valid JSON');
  }
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

  const sort = query.sort?.trim();
  if (sort && !isSearchSort(sort)) {
    return invalidParameter('sort', 'sort must be one of relevance, risk, name');
  }

  return {
    ok: true as const,
    value: {
      q: normalizeOptionalQuery(query.q),
      category: normalizeOptionalQuery(query.category),
      riskLevel: riskLevel as RiskLevel | undefined,
      sort: sort as SearchSort | undefined,
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
