import { Hono } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import type { AuthService } from '../services/authService.js';
import { UserServiceValidationError, type UserFavoriteItem, type UserReportItem, type UserService } from '../services/userService.js';

type UserRouteBody = {
  id?: unknown;
  category?: unknown;
  query?: unknown;
  items?: unknown;
  report?: unknown;
};

export function createUserRoute(authService: AuthService, userService: UserService) {
  const route = new Hono<{ Variables: AuthVariables }>();
  const requireAuth = createAuthMiddleware(authService);
  route.use('/user/*', requireAuth);

  route.get('/user/favorites', async (context) => context.json({
    items: await userService.listFavorites(context.get('userId'))
  }));

  route.post('/user/favorites', async (context) => {
    const body = await readJsonBody(context);
    if (Array.isArray(body?.items)) {
      const items = toFavoriteItems(body.items);
      if (!items) {
        return invalidParameter(context, 'items', 'favorite items must include id and category');
      }

      return context.json({ items: await userService.replaceFavorites(context.get('userId'), items) });
    }

    const item = toFavoriteItem(body);
    if (!item) {
      return invalidParameter(context, 'id', 'favorite id and category are required');
    }

    return context.json({ items: await userService.addFavorite(context.get('userId'), item) }, 201);
  });

  route.delete('/user/favorites', async (context) => {
    const id = context.req.query('id');
    const category = context.req.query('category');
    const item = id || category ? toFavoriteItem({ id, category }) : undefined;
    if ((id || category) && !item) {
      return invalidParameter(context, 'id', 'favorite id and category are required');
    }

    return context.json({ items: await userService.deleteFavorite(context.get('userId'), item ?? undefined) });
  });

  route.get('/user/history', async (context) => context.json({
    items: await userService.listHistory(context.get('userId'))
  }));

  route.post('/user/history', async (context) => {
    const body = await readJsonBody(context);
    if (Array.isArray(body?.items)) {
      const items = toStringItems(body.items);
      if (!items) {
        return invalidParameter(context, 'items', 'history items must be non-empty strings');
      }

      return context.json({ items: await userService.replaceHistory(context.get('userId'), items) });
    }

    const query = normalizeText(body?.query);
    if (!query) {
      return invalidParameter(context, 'query', 'history query is required');
    }

    return context.json({ items: await userService.addHistory(context.get('userId'), query) }, 201);
  });

  route.delete('/user/history', async (context) => context.json({
    items: await userService.deleteHistory(context.get('userId'), context.req.query('query'))
  }));

  route.get('/user/allergens', async (context) => context.json({
    items: await userService.listAllergens(context.get('userId'))
  }));

  route.put('/user/allergens', async (context) => {
    const body = await readJsonBody(context);
    if (!Array.isArray(body?.items)) {
      return invalidParameter(context, 'items', 'allergen items must be an array');
    }

    const items = toStringItems(body.items);
    if (!items) {
      return invalidParameter(context, 'items', 'allergen items must be non-empty strings');
    }

    return context.json({ items: await userService.replaceAllergens(context.get('userId'), items) });
  });

  route.get('/user/reports', async (context) => context.json({
    items: await userService.listReports(context.get('userId'))
  }));

  route.post('/user/reports', async (context) => {
    const body = await readJsonBody(context);
    if (Array.isArray(body?.items)) {
      const items = toReportItems(body.items);
      if (!items) {
        return invalidParameter(context, 'items', 'report items must include id');
      }

      return context.json({ items: await userService.replaceReports(context.get('userId'), items) });
    }

    const report = toReportItem(body?.report ?? body);
    if (!report) {
      return invalidParameter(context, 'id', 'report id is required');
    }

    return context.json({ items: await userService.addReport(context.get('userId'), report) }, 201);
  });

  route.delete('/user/reports', async (context) => context.json({
    items: await userService.deleteReport(context.get('userId'), context.req.query('id'))
  }));

  route.onError((error, context) => {
    if (error instanceof UserServiceValidationError) {
      return context.json({ error: 'invalid_parameter', field: 'items', message: error.code }, 400);
    }

    throw error;
  });

  return route;
}

async function readJsonBody(context: { req: { json(): Promise<unknown> } }): Promise<UserRouteBody | null> {
  try {
    const body = await context.req.json();
    return body && typeof body === 'object' ? body as UserRouteBody : null;
  } catch {
    return null;
  }
}

function toFavoriteItem(value: unknown): UserFavoriteItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as { id?: unknown; category?: unknown };
  const id = normalizeText(item.id);
  const category = normalizeText(item.category);
  return id && category ? { id, category } : null;
}

function toFavoriteItems(values: unknown[]) {
  const items = values.map(toFavoriteItem);
  return items.every((item): item is UserFavoriteItem => item !== null) ? items : null;
}

function toReportItem(value: unknown): UserReportItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const report = value as UserReportItem;
  return typeof report.id === 'string' && report.id.trim() ? report : null;
}

function toReportItems(values: unknown[]) {
  const items = values.map(toReportItem);
  return items.every((item): item is UserReportItem => item !== null) ? items : null;
}

function toStringItems(values: unknown[]) {
  const items = values.map((value) => typeof value === 'string' ? value.trim() : '');
  return items.every(Boolean) ? items : null;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function invalidParameter(context: { json(body: unknown, status: 400): Response }, field: string, message: string) {
  return context.json({
    error: 'invalid_parameter',
    field,
    message
  }, 400);
}
