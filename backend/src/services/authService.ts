import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { and, eq, gt } from 'drizzle-orm';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { getConfig } from '../config.js';
import { createDatabaseClient, type Database, type DatabaseClient } from '../db/client.js';
import { sessions, users, type UserRow } from '../db/schema.js';

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_EXPIRES_IN_SECONDS = SESSION_TTL_MS / 1000;

export type AuthenticatedUser = {
  id: string;
  email: string;
  createdAt: Date;
};

export type AuthTokenResult = {
  token: string;
  tokenType: 'Bearer';
  expiresAt: Date;
  user: AuthenticatedUser;
};

export type AuthService = {
  register(input: { email: string; password: string }): Promise<AuthTokenResult>;
  login(input: { email: string; password: string }): Promise<AuthTokenResult>;
  logout(token: string): Promise<void>;
  getUserForToken(token: string): Promise<AuthenticatedUser | null>;
  deleteAccount(userId: string): Promise<void>;
};

export type AuthServiceErrorCode = 'email_taken' | 'invalid_credentials';

export class AuthServiceError extends Error {
  code: AuthServiceErrorCode;

  constructor(code: AuthServiceErrorCode) {
    super(code);
    this.code = code;
  }
}

let defaultClient: DatabaseClient | null = null;
let defaultService: AuthService | null = null;

export function createAuthService(db: Database, jwtSecret: string, now = () => new Date()): AuthService {
  async function findUserByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async function issueToken(user: AuthenticatedUser): Promise<AuthTokenResult> {
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: JWT_EXPIRES_IN_SECONDS });

    await db.insert(sessions).values({
      token,
      userId: user.id,
      expiresAt
    });

    return {
      token,
      tokenType: 'Bearer',
      expiresAt,
      user
    };
  }

  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      const existing = await findUserByEmail(email);
      if (existing) {
        throw new AuthServiceError('email_taken');
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      const createdAt = now();

      try {
        const [created] = await db
          .insert(users)
          .values({
            id: randomUUID(),
            email,
            passwordHash,
            createdAt
          })
          .returning({
            id: users.id,
            email: users.email,
            createdAt: users.createdAt
          });

        return issueToken(created);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AuthServiceError('email_taken');
        }

        throw error;
      }
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const user = await findUserByEmail(email);
      if (!user) {
        throw new AuthServiceError('invalid_credentials');
      }

      const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatches) {
        throw new AuthServiceError('invalid_credentials');
      }

      return issueToken(toAuthenticatedUser(user));
    },

    async logout(token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    },

    async getUserForToken(token) {
      const payload = verifyJwt(token, jwtSecret);
      if (!payload?.sub) {
        return null;
      }

      const [row] = await db
        .select({
          id: users.id,
          email: users.email,
          createdAt: users.createdAt
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(
          eq(sessions.token, token),
          eq(users.id, payload.sub),
          gt(sessions.expiresAt, now())
        ))
        .limit(1);

      return row ?? null;
    },

    async deleteAccount(userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  };
}

export function getDefaultAuthService(): AuthService {
  if (!defaultClient) {
    const config = getConfig();
    defaultClient = createDatabaseClient(config.databaseUrl);
    defaultService = createAuthService(defaultClient.db, config.jwtSecret);
  }

  return defaultService as AuthService;
}

export function createLazyAuthService(databaseUrl?: string, jwtSecret = getConfig().jwtSecret): AuthService {
  let lazyClient: DatabaseClient | null = null;
  let lazyService: AuthService | null = null;

  function getLazyService() {
    if (!lazyClient) {
      lazyClient = createDatabaseClient(databaseUrl);
      lazyService = createAuthService(lazyClient.db, jwtSecret);
    }

    return lazyService as AuthService;
  }

  return {
    register(input) {
      return getLazyService().register(input);
    },
    login(input) {
      return getLazyService().login(input);
    },
    logout(token) {
      return getLazyService().logout(token);
    },
    getUserForToken(token) {
      return getLazyService().getUserForToken(token);
    },
    deleteAccount(userId) {
      return getLazyService().deleteAccount(userId);
    }
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmailAddress(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function toAuthenticatedUser(user: UserRow): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  };
}

function verifyJwt(token: string, jwtSecret: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '23505';
}
