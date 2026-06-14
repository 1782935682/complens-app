import { Hono } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import type { AuthService } from '../services/authService.js';
import type { Gb2760Service } from '../services/gb2760Service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function createGb2760Route(authService: AuthService, gb2760Service: Gb2760Service) {
  const route = new Hono<{ Variables: AuthVariables }>();
  const requireAuth = createAuthMiddleware(authService);
  route.use('/gb2760/*', requireAuth);

  route.get('/gb2760/import-runs', async (context) => {
    const parsed = parseListQuery(context.req.query());
    if (!parsed.ok) {
      return context.json(parsed.error, 400);
    }

    const result = await gb2760Service.listImportRuns(parsed.value);
    return context.json(result);
  });

  route.get('/gb2760/import-runs/:id/errors', async (context) => {
    const result = await gb2760Service.getImportRunErrors(context.req.param('id'));
    if (!result) {
      return context.json({ error: 'not_found' }, 404);
    }

    return context.json(result);
  });

  return route;
}

function parseListQuery(query: Record<string, string>) {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, 'page');
  if (!page.ok) return page;

  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit', MAX_LIMIT);
  if (!limit.ok) return limit;

  return {
    ok: true as const,
    value: {
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
