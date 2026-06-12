import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService, AuthenticatedUser } from '../src/services/authService.js';
import type { UserFavoriteItem, UserProductItem, UserProductListParams, UserReportItem, UserService } from '../src/services/userService.js';

const testUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'tester@example.com',
  createdAt: new Date('2026-06-11T00:00:00.000Z')
};

const baseConfig = {
  corsOrigin: 'http://localhost:5173',
  databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
  jwtSecret: 'test-only-compcheck-jwt-secret',
  ocrApiKey: '',
  ocrProvider: 'aliyun',
  port: 3000
};

function createTestApp(userService = createInMemoryUserService()) {
  return createApp(baseConfig, {
    authService: createAuthService(),
    userService
  });
}

function createAuthService(): AuthService {
  return {
    async register() {
      throw new Error('not used');
    },
    async login() {
      throw new Error('not used');
    },
    async logout() {},
    async getUserForToken(token) {
      return token === 'valid-token' ? testUser : null;
    },
    async deleteAccount() {}
  };
}

function createInMemoryUserService(): UserService {
  let favorites: UserFavoriteItem[] = [];
  let history: string[] = [];
  let allergens: string[] = [];
  let reports: UserReportItem[] = [];
  let products: UserProductItem[] = [];

  return {
    async listFavorites() {
      return favorites;
    },
    async addFavorite(_userId, item) {
      favorites = [item, ...favorites.filter((current) => current.id !== item.id || current.category !== item.category)];
      return favorites;
    },
    async replaceFavorites(_userId, items) {
      favorites = items;
      return favorites;
    },
    async deleteFavorite(_userId, item) {
      favorites = item
        ? favorites.filter((current) => current.id !== item.id || current.category !== item.category)
        : [];
      return favorites;
    },
    async listHistory() {
      return history;
    },
    async addHistory(_userId, query) {
      history = [query, ...history.filter((current) => current !== query)];
      return history;
    },
    async replaceHistory(_userId, queries) {
      history = queries;
      return history;
    },
    async deleteHistory(_userId, query) {
      history = query ? history.filter((current) => current !== query) : [];
      return history;
    },
    async listAllergens() {
      return allergens;
    },
    async replaceAllergens(_userId, allergenIds) {
      allergens = [...new Set(allergenIds)];
      return allergens;
    },
    async listReports() {
      return reports;
    },
    async addReport(_userId, report) {
      reports = [report, ...reports.filter((current) => current.id !== report.id)];
      return reports;
    },
    async replaceReports(_userId, nextReports) {
      reports = nextReports;
      return reports;
    },
    async deleteReport(_userId, reportId) {
      reports = reportId ? reports.filter((report) => report.id !== reportId) : [];
      return reports;
    },
    async listProducts(_userId, params = {}) {
      const filtered = filterProducts(products, params);
      const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
      const page = Math.max(1, Number(params.page) || 1);
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;
      return {
        items: filtered.slice(start, start + limit),
        total,
        page: safePage,
        limit,
        totalPages
      };
    },
    async getProduct(_userId, productId) {
      return products.find((product) => product.id === productId) ?? null;
    },
    async addProduct(_userId, product) {
      products = [product, ...products.filter((current) => current.id !== product.id)];
      return products;
    },
    async replaceProducts(_userId, nextProducts) {
      products = nextProducts;
      return products;
    },
    async updateProduct(_userId, productId, patch) {
      const existing = products.find((product) => product.id === productId);
      if (!existing) return null;
      const next = {
        ...existing,
        ...patch,
        updatedAt: '2026-06-11T00:02:00.000Z'
      };
      products = products.map((product) => product.id === productId ? next : product);
      return next;
    },
    async deleteProduct(_userId, productId) {
      products = productId ? products.filter((product) => product.id !== productId) : [];
      return products;
    }
  };
}

function filterProducts(products: UserProductItem[], params: UserProductListParams) {
  const search = String(params.search || '').toLowerCase();
  return products.filter((product) => {
    if (params.isFavorite !== undefined && product.isFavorite !== params.isFavorite) return false;
    if (params.riskGrade && product.riskGrade !== params.riskGrade) return false;
    if (!search) return true;
    return [
      product.productName,
      product.brandName,
      product.originalText,
      ...(Array.isArray(product.tags) ? product.tags : [])
    ].join(' ').toLowerCase().includes(search);
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function authHeaders() {
  return {
    Authorization: 'Bearer valid-token',
    'Content-Type': 'application/json'
  };
}

describe('user routes auth guard', () => {
  it('requires a valid bearer token', async () => {
    const app = createTestApp();

    const missing = await app.request('/api/user/favorites');
    const invalid = await app.request('/api/user/favorites', {
      headers: { Authorization: 'Bearer invalid-token' }
    });

    expect(missing.status).toBe(401);
    expect(await json(missing)).toEqual({ error: 'unauthorized' });
    expect(invalid.status).toBe(401);
  });
});

describe('GET/POST/DELETE /api/user/favorites', () => {
  it('adds, replaces, and deletes favorite ingredients', async () => {
    const app = createTestApp();

    const add = await app.request('/api/user/favorites', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id: 'citric-acid', category: 'food' })
    });
    const replace = await app.request('/api/user/favorites', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: [{ id: 'niacinamide', category: 'cosmetics' }] })
    });
    const remove = await app.request('/api/user/favorites?id=niacinamide&category=cosmetics', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(add.status).toBe(201);
    expect(await json(add)).toEqual({ items: [{ id: 'citric-acid', category: 'food' }] });
    expect(replace.status).toBe(200);
    expect(await json(replace)).toEqual({ items: [{ id: 'niacinamide', category: 'cosmetics' }] });
    expect(remove.status).toBe(200);
    expect(await json(remove)).toEqual({ items: [] });
  });

  it('rejects invalid favorite payloads', async () => {
    const app = createTestApp();

    const response = await app.request('/api/user/favorites', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id: 'citric-acid' })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'id',
      message: 'favorite id and category are required'
    });
  });

  it('rejects invalid favorite bulk payloads instead of dropping items', async () => {
    const app = createTestApp();

    const response = await app.request('/api/user/favorites', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: [{ id: 'citric-acid', category: 'food' }, { id: 'missing-category' }] })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'items',
      message: 'favorite items must include id and category'
    });
  });
});

describe('GET/POST/DELETE /api/user/history', () => {
  it('syncs history queries', async () => {
    const app = createTestApp();

    const replace = await app.request('/api/user/history', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: ['苯甲酸钠', '柠檬酸'] })
    });
    const add = await app.request('/api/user/history', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ query: '山梨酸钾' })
    });
    const remove = await app.request('/api/user/history?query=柠檬酸', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(replace.status).toBe(200);
    expect(await json(replace)).toEqual({ items: ['苯甲酸钠', '柠檬酸'] });
    expect(add.status).toBe(201);
    expect(await json(add)).toEqual({ items: ['山梨酸钾', '苯甲酸钠', '柠檬酸'] });
    expect(remove.status).toBe(200);
    expect(await json(remove)).toEqual({ items: ['山梨酸钾', '苯甲酸钠'] });
  });

  it('rejects non-string history bulk items', async () => {
    const app = createTestApp();

    const response = await app.request('/api/user/history', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: ['柠檬酸', { query: '苯甲酸钠' }] })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'items',
      message: 'history items must be non-empty strings'
    });
  });
});

describe('GET/PUT /api/user/allergens', () => {
  it('replaces allergens as a whole set', async () => {
    const app = createTestApp();

    const replace = await app.request('/api/user/allergens', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ items: ['milk', 'soybeans', 'milk'] })
    });
    const list = await app.request('/api/user/allergens', {
      headers: authHeaders()
    });

    expect(replace.status).toBe(200);
    expect(await json(replace)).toEqual({ items: ['milk', 'soybeans'] });
    expect(await json(list)).toEqual({ items: ['milk', 'soybeans'] });
  });

  it('rejects invalid allergen bulk items', async () => {
    const app = createTestApp();

    const response = await app.request('/api/user/allergens', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ items: ['milk', ''] })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'items',
      message: 'allergen items must be non-empty strings'
    });
  });
});

describe('GET/POST/DELETE /api/user/reports', () => {
  it('adds, replaces, and deletes reports', async () => {
    const app = createTestApp();
    const firstReport = {
      id: 'report-1',
      category: 'food',
      input: '配料：柠檬酸',
      createdAt: '2026-06-11T00:00:00.000Z'
    };
    const secondReport = {
      id: 'report-2',
      category: 'food',
      input: '配料：苯甲酸钠',
      createdAt: '2026-06-11T00:01:00.000Z'
    };

    const add = await app.request('/api/user/reports', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ report: firstReport })
    });
    const replace = await app.request('/api/user/reports', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: [secondReport] })
    });
    const remove = await app.request('/api/user/reports?id=report-2', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(add.status).toBe(201);
    expect(await json(add)).toEqual({ items: [firstReport] });
    expect(replace.status).toBe(200);
    expect(await json(replace)).toEqual({ items: [secondReport] });
    expect(remove.status).toBe(200);
    expect(await json(remove)).toEqual({ items: [] });
  });

  it('rejects invalid report bulk payloads', async () => {
    const app = createTestApp();

    const response = await app.request('/api/user/reports', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: [{ id: 'report-1' }, { title: 'missing id' }] })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'items',
      message: 'report items must include id'
    });
  });
});

describe('GET/POST/PATCH/DELETE /api/user/products', () => {
  it('adds, lists, filters, updates, and deletes product archives', async () => {
    const app = createTestApp();
    const firstProduct = {
      id: 'product-1',
      category: 'food',
      productName: '测试饼干',
      brandName: '测试品牌',
      imageId: 'scan-image-1',
      thumbnailDataUrl: 'data:image/jpeg;base64,AAA=',
      originalText: '配料：小麦粉，卵磷脂',
      parsedIngredients: [{ normalizedText: '小麦粉' }],
      matchResults: [],
      reportId: 'report-1',
      riskGrade: 'B',
      isFavorite: false,
      tags: ['饼干'],
      createdAt: '2026-06-11T00:00:00.000Z',
      updatedAt: '2026-06-11T00:00:00.000Z'
    };
    const secondProduct = {
      id: 'product-2',
      category: 'food',
      productName: '测试饮料',
      originalText: '配料：水，柠檬酸',
      parsedIngredients: [],
      matchResults: [],
      reportId: 'report-2',
      riskGrade: 'A',
      isFavorite: true,
      tags: ['饮料'],
      createdAt: '2026-06-11T00:01:00.000Z',
      updatedAt: '2026-06-11T00:01:00.000Z'
    };

    const add = await app.request('/api/user/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product: firstProduct })
    });
    const replace = await app.request('/api/user/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: [firstProduct, secondProduct] })
    });
    const search = await app.request('/api/user/products?search=%E9%A5%AE%E6%96%99&limit=20', {
      headers: authHeaders()
    });
    const favorite = await app.request('/api/user/products?isFavorite=true', {
      headers: authHeaders()
    });
    const detail = await app.request('/api/user/products/product-2', {
      headers: authHeaders()
    });
    const patch = await app.request('/api/user/products/product-1', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isFavorite: true, tags: ['常买'] })
    });
    const remove = await app.request('/api/user/products/product-2', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(add.status).toBe(201);
    expect((await json(add)).item).toEqual(firstProduct);
    expect(replace.status).toBe(200);
    expect((await json(replace)).items).toEqual([firstProduct, secondProduct]);
    expect(await json(search)).toMatchObject({
      items: [secondProduct],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1
    });
    expect(await json(favorite)).toMatchObject({ items: [secondProduct], total: 1 });
    expect(await json(detail)).toEqual({ item: secondProduct });
    expect(await json(patch)).toMatchObject({ item: { id: 'product-1', isFavorite: true, tags: ['常买'] } });
    expect(await json(remove)).toMatchObject({ items: [expect.objectContaining({ id: 'product-1' })] });
  });

  it('rejects invalid product archive payloads and returns 404 for missing items', async () => {
    const app = createTestApp();

    const invalid = await app.request('/api/user/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product: { id: 'product-1', productName: '缺少原文' } })
    });
    const missing = await app.request('/api/user/products/missing-product', {
      headers: authHeaders()
    });

    expect(invalid.status).toBe(400);
    expect(await json(invalid)).toEqual({
      error: 'invalid_parameter',
      field: 'id',
      message: 'product id, productName, originalText, and reportId are required'
    });
    expect(missing.status).toBe(404);
    expect(await json(missing)).toEqual({ error: 'not_found' });
  });

  it('rejects product archive bulk payloads over the local sync limit', async () => {
    const app = createTestApp();
    const product = {
      id: 'product-template',
      productName: '测试产品',
      originalText: '配料：水',
      reportId: 'report-template'
    };

    const response = await app.request('/api/user/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        items: Array.from({ length: 101 }, (_, index) => ({
          ...product,
          id: `product-${index}`,
          reportId: `report-${index}`
        }))
      })
    });

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      error: 'invalid_parameter',
      field: 'items',
      message: 'product items cannot exceed 100'
    });
  });
});
