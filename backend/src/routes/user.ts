import { Hono } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import type { AuthService } from '../services/authService.js';
import { UserServiceValidationError, type UserFavoriteItem, type UserProductItem, type UserProductListParams, type UserProfileIngredientKind, type UserReportItem, type UserService } from '../services/userService.js';

type UserRouteBody = {
  id?: unknown;
  brandName?: unknown;
  category?: unknown;
  isFavorite?: unknown;
  query?: unknown;
  items?: unknown;
  originalText?: unknown;
  product?: unknown;
  productName?: unknown;
  report?: unknown;
  reportId?: unknown;
  riskGrade?: unknown;
  tags?: unknown;
};
const MAX_PRODUCT_ITEMS = 100;

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

  route.get('/user/profile/:kind', async (context) => {
    const kind = toProfileIngredientKind(context.req.param('kind'));
    if (!kind) {
      return invalidParameter(context, 'kind', 'profile kind must be watch or avoid');
    }

    return context.json({
      items: await userService.listProfileIngredients(context.get('userId'), kind)
    });
  });

  route.put('/user/profile/:kind', async (context) => {
    const kind = toProfileIngredientKind(context.req.param('kind'));
    if (!kind) {
      return invalidParameter(context, 'kind', 'profile kind must be watch or avoid');
    }
    const body = await readJsonBody(context);
    if (!Array.isArray(body?.items)) {
      return invalidParameter(context, 'items', 'profile ingredient items must be an array');
    }

    const items = toStringItems(body.items);
    if (!items) {
      return invalidParameter(context, 'items', 'profile ingredient items must be non-empty strings');
    }

    return context.json({ items: await userService.replaceProfileIngredients(context.get('userId'), kind, items) });
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

  route.get('/user/products', async (context) => {
    const result = await userService.listProducts(context.get('userId'), toProductListParams({
      search: context.req.query('search'),
      isFavorite: context.req.query('isFavorite'),
      riskGrade: context.req.query('riskGrade'),
      page: context.req.query('page'),
      limit: context.req.query('limit')
    }));
    return context.json(result);
  });

  route.get('/user/products/:id', async (context) => {
    const productId = normalizeText(context.req.param('id'));
    if (!productId) return invalidParameter(context, 'id', 'product id is required');
    const product = await userService.getProduct(context.get('userId'), productId);
    if (!product) return context.json({ error: 'not_found' }, 404);
    return context.json({ item: product });
  });

  route.post('/user/products', async (context) => {
    const body = await readJsonBody(context);
    if (Array.isArray(body?.items)) {
      if (body.items.length > MAX_PRODUCT_ITEMS) {
        return invalidParameter(context, 'items', `product items cannot exceed ${MAX_PRODUCT_ITEMS}`);
      }
      const items = toProductItems(body.items);
      if (!items) {
        return invalidParameter(context, 'items', 'product items must include id, productName, originalText, and reportId');
      }

      return context.json({ items: await userService.replaceProducts(context.get('userId'), items) });
    }

    const product = toProductItem(body?.product ?? body);
    if (!product) {
      return invalidParameter(context, 'id', 'product id, productName, originalText, and reportId are required');
    }

    const items = await userService.addProduct(context.get('userId'), product);
    return context.json({ item: items.find((item) => item.id === product.id) ?? product, items }, 201);
  });

  route.patch('/user/products/:id', async (context) => {
    const productId = normalizeText(context.req.param('id'));
    if (!productId) return invalidParameter(context, 'id', 'product id is required');
    const body = await readJsonBody(context);
    if (!body) return invalidParameter(context, 'id', 'product patch is required');
    const product = await userService.updateProduct(context.get('userId'), productId, toProductPatch(body));
    if (!product) return context.json({ error: 'not_found' }, 404);
    return context.json({ item: product });
  });

  route.delete('/user/products/:id', async (context) => {
    const productId = normalizeText(context.req.param('id'));
    if (!productId) return invalidParameter(context, 'id', 'product id is required');
    return context.json({
      items: await userService.deleteProduct(context.get('userId'), productId)
    });
  });

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

function toProductItem(value: unknown): UserProductItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const product = value as UserProductItem;
  return normalizeText(product.id)
    && normalizeText(product.productName)
    && normalizeText(product.originalText)
    && normalizeText(product.reportId)
    ? product
    : null;
}

function toProductItems(values: unknown[]) {
  const items = values.map(toProductItem);
  return items.every((item): item is UserProductItem => item !== null) ? items : null;
}

function toProductPatch(value: UserRouteBody): Partial<UserProductItem> {
  return {
    ...(Object.hasOwn(value, 'productName') ? { productName: value.productName as string } : {}),
    ...(Object.hasOwn(value, 'brandName') ? { brandName: value.brandName as string } : {}),
    ...(Object.hasOwn(value, 'isFavorite') ? { isFavorite: value.isFavorite === true } : {}),
    ...(Object.hasOwn(value, 'tags') ? { tags: Array.isArray(value.tags) ? value.tags.map((item) => String(item || '')) : [] } : {}),
    ...(Object.hasOwn(value, 'riskGrade') ? { riskGrade: value.riskGrade as string } : {})
  };
}

function toProductListParams(value: Record<string, unknown>): UserProductListParams {
  const isFavorite = value.isFavorite === 'true'
    ? true
    : value.isFavorite === 'false'
      ? false
      : undefined;
  return {
    search: normalizeText(value.search),
    isFavorite,
    riskGrade: normalizeText(value.riskGrade),
    page: parsePositiveInteger(value.page, 1),
    limit: parsePositiveInteger(value.limit, 20)
  };
}

function toStringItems(values: unknown[]) {
  const items = values.map((value) => typeof value === 'string' ? value.trim() : '');
  return items.every(Boolean) ? items : null;
}

function toProfileIngredientKind(value: unknown): UserProfileIngredientKind | null {
  const kind = normalizeText(value);
  return kind === 'watch' || kind === 'avoid' ? kind : null;
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

function parsePositiveInteger(value: unknown, fallback: number) {
  const number = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
