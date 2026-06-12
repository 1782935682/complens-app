import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService, AuthenticatedUser } from '../src/services/authService.js';
import type { UserFavoriteItem, UserReportItem, UserService } from '../src/services/userService.js';

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
    }
  };
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
