import bcrypt from 'bcrypt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Database } from '../src/db/client.js';
import { parseBearerToken } from '../src/middleware/auth.js';
import { AuthServiceError, createAuthService, normalizeEmail, type AuthService, type AuthenticatedUser } from '../src/services/authService.js';

const baseConfig = {
  corsOrigin: 'http://localhost:5173',
  databaseUrl: 'postgres://postgres:password@localhost:15432/compcheck',
  jwtSecret: 'test-only-compcheck-jwt-secret',
  ocrApiKey: '',
  ocrProvider: 'aliyun',
  port: 3000
};

afterEach(() => {
  vi.useRealTimers();
});

function createTestApp(authService: AuthService = createInMemoryAuthService()) {
  return createApp(baseConfig, { authService });
}

function createInMemoryAuthService(): AuthService {
  const usersByEmail = new Map<string, AuthenticatedUser & { password: string }>();
  const usersById = new Map<string, AuthenticatedUser & { password: string }>();
  const tokens = new Map<string, string>();
  let userId = 1;
  let tokenId = 1;

  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      if (usersByEmail.has(email)) {
        throw new AuthServiceError('email_taken');
      }

      const user = {
        id: `user-${userId++}`,
        email,
        password: input.password,
        createdAt: new Date('2026-06-11T00:00:00.000Z')
      };
      usersByEmail.set(email, user);
      usersById.set(user.id, user);
      return issueToken(user);
    },

    async login(input) {
      const user = usersByEmail.get(normalizeEmail(input.email));
      if (!user || user.password !== input.password) {
        throw new AuthServiceError('invalid_credentials');
      }

      return issueToken(user);
    },

    async logout(token) {
      tokens.delete(token);
    },

    async getUserForToken(token) {
      const id = tokens.get(token);
      return id ? usersById.get(id) ?? null : null;
    },

    async deleteAccount(id) {
      const user = usersById.get(id);
      if (!user) {
        return;
      }

      usersById.delete(id);
      usersByEmail.delete(user.email);
      for (const [token, tokenUserId] of tokens.entries()) {
        if (tokenUserId === id) {
          tokens.delete(token);
        }
      }
    }
  };

  async function issueToken(user: AuthenticatedUser) {
    const token = `token-${tokenId++}`;
    tokens.set(token, user.id);
    return {
      token,
      tokenType: 'Bearer' as const,
      expiresAt: new Date('2026-06-18T00:00:00.000Z'),
      user
    };
  }
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('POST /api/auth/register', () => {
  it('registers a user and returns a bearer token without password fields', async () => {
    const app = createTestApp();

    const response = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: ' Tester@Example.COM ', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const body = await json(response);

    expect(response.status).toBe(201);
    expect(body.token).toBe('token-1');
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresAt).toBe('2026-06-18T00:00:00.000Z');
    expect(body.user).toEqual({
      id: 'user-1',
      email: 'tester@example.com',
      createdAt: '2026-06-11T00:00:00.000Z'
    });
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('rejects invalid email and short password before calling the service', async () => {
    const service = createInMemoryAuthService();
    service.register = vi.fn(service.register);
    const app = createTestApp(service);

    const invalidEmail = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const shortPassword = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'short' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(invalidEmail.status).toBe(400);
    expect(await json(invalidEmail)).toEqual({
      error: 'invalid_parameter',
      field: 'email',
      message: 'email must be a valid address'
    });
    expect(shortPassword.status).toBe(400);
    expect(service.register).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already registered', async () => {
    const app = createTestApp();
    const request = {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    };

    await app.request('/api/auth/register', request);
    const duplicate = await app.request('/api/auth/register', request);

    expect(duplicate.status).toBe(409);
    expect(await json(duplicate)).toEqual({ error: 'email_already_registered' });
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and rejects invalid credentials', async () => {
    const app = createTestApp();
    await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const login = await app.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const invalid = await app.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'wrong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(login.status).toBe(200);
    expect((await json(login)).token).toBe('token-2');
    expect(invalid.status).toBe(401);
    expect(await json(invalid)).toEqual({ error: 'invalid_credentials' });
  });
});

describe('authenticated auth routes', () => {
  it('runs register -> me -> logout and rejects the logged-out token', async () => {
    const app = createTestApp();
    const register = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const token = (await json(register)).token as string;

    const me = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const logout = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const afterLogout = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(me.status).toBe(200);
    expect((await json(me)).user).toEqual({
      id: 'user-1',
      email: 'tester@example.com',
      createdAt: '2026-06-11T00:00:00.000Z'
    });
    expect(logout.status).toBe(200);
    expect(await json(logout)).toEqual({ ok: true });
    expect(afterLogout.status).toBe(401);
    expect(await json(afterLogout)).toEqual({ error: 'unauthorized' });
  });

  it('deletes the account and cascades active tokens through the service', async () => {
    const app = createTestApp();
    const register = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'strong-pass' }),
      headers: { 'Content-Type': 'application/json' }
    });
    const token = (await json(register)).token as string;

    const deleted = await app.request('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const afterDelete = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(deleted.status).toBe(200);
    expect(await json(deleted)).toEqual({ ok: true });
    expect(afterDelete.status).toBe(401);
  });

  it('returns 401 for missing and invalid bearer tokens', async () => {
    const app = createTestApp();

    const missing = await app.request('/api/auth/me');
    const invalid = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer not-a-real-token' }
    });

    expect(missing.status).toBe(401);
    expect(await json(missing)).toEqual({ error: 'unauthorized' });
    expect(invalid.status).toBe(401);
    expect(await json(invalid)).toEqual({ error: 'unauthorized' });
  });
});

describe('auth helpers', () => {
  it('parses bearer tokens and normalizes email addresses', () => {
    expect(parseBearerToken('Bearer token-123')).toBe('token-123');
    expect(parseBearerToken('bearer token-123')).toBe('token-123');
    expect(parseBearerToken('Basic token-123')).toBeNull();
    expect(normalizeEmail(' Tester@Example.COM ')).toBe('tester@example.com');
  });
});

describe('createAuthService', () => {
  it('adds per-session entropy so same-second logins receive distinct JWTs', async () => {
    const passwordHash = await bcrypt.hash('strong-pass', 4);
    const user = {
      id: 'user-1',
      email: 'tester@example.com',
      passwordHash,
      createdAt: new Date('2026-06-11T00:00:00.000Z')
    };
    const insertedSessions: Array<{ token: string; userId: string; expiresAt: Date }> = [];
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [user]
          })
        })
      }),
      insert: () => ({
        values: async (session: { token: string; userId: string; expiresAt: Date }) => {
          insertedSessions.push(session);
        }
      })
    } as unknown as Database;

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T00:00:00.000Z'));
    const service = createAuthService(db, 'test-only-compcheck-jwt-secret', () => new Date('2026-06-11T00:00:00.000Z'));

    const first = await service.login({ email: 'tester@example.com', password: 'strong-pass' });
    const second = await service.login({ email: 'tester@example.com', password: 'strong-pass' });

    expect(first.token).not.toBe(second.token);
    expect(insertedSessions.map((session) => session.token)).toEqual([first.token, second.token]);
  });
});
