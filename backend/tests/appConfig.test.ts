import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IngredientService } from '../src/services/ingredientService.js';

const customDatabaseUrl = 'postgres://postgres:password@custom-postgres:5432/compcheck';

function createMockIngredientService(): IngredientService {
  return {
    listIngredients: vi.fn(),
    getIngredientById: vi.fn(),
    getCategorySummaries: vi.fn()
  };
}

afterEach(() => {
  vi.doUnmock('../src/services/authService.js');
  vi.doUnmock('../src/services/ingredientService.js');
  vi.doUnmock('../src/db/client.js');
  vi.resetModules();
});

describe('createApp configuration', () => {
  it('passes the configured database URL to the default ingredient service', async () => {
    const createLazyIngredientService = vi.fn(() => createMockIngredientService());
    vi.doMock('../src/services/ingredientService.js', () => ({
      createLazyIngredientService
    }));
    const { createApp } = await import('../src/app.js');

    createApp({
      corsOrigin: 'http://localhost:5173',
      databaseUrl: customDatabaseUrl,
      jwtSecret: 'test-only-compcheck-jwt-secret',
      port: 3000
    });

    expect(createLazyIngredientService).toHaveBeenCalledWith(customDatabaseUrl);
  });

  it('passes the configured database URL and JWT secret to the default auth service', async () => {
    const createLazyAuthService = vi.fn(() => ({
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getUserForToken: vi.fn(),
      deleteAccount: vi.fn()
    }));
    vi.doMock('../src/services/authService.js', () => ({
      createLazyAuthService
    }));
    const { createApp } = await import('../src/app.js');

    createApp({
      corsOrigin: 'http://localhost:5173',
      databaseUrl: customDatabaseUrl,
      jwtSecret: 'custom-jwt-secret-for-tests',
      port: 3000
    });

    expect(createLazyAuthService).toHaveBeenCalledWith(customDatabaseUrl, 'custom-jwt-secret-for-tests');
  });
});

describe('createLazyIngredientService configuration', () => {
  it('opens the database client with the supplied URL', async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(async () => [])
          }))
        }))
      }))
    };
    const createDatabaseClient = vi.fn(() => ({
      db,
      pool: {}
    }));
    vi.doMock('../src/db/client.js', () => ({
      createDatabaseClient
    }));
    const { createLazyIngredientService } = await import('../src/services/ingredientService.js');

    const service = createLazyIngredientService(customDatabaseUrl);
    await service.getCategorySummaries();

    expect(createDatabaseClient).toHaveBeenCalledWith(customDatabaseUrl);
  });
});
