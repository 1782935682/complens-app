import { Hono } from 'hono';
import { createAuthMiddleware, type AuthVariables } from '../middleware/auth.js';
import { AuthServiceError, isEmailAddress, type AuthenticatedUser, type AuthService, type AuthTokenResult } from '../services/authService.js';

type AuthJsonBody = {
  email?: unknown;
  password?: unknown;
};

export function createAuthRoute(authService: AuthService) {
  const route = new Hono<{ Variables: AuthVariables }>();
  const requireAuth = createAuthMiddleware(authService);

  route.post('/auth/register', async (context) => {
    const body = await readAuthBody(context);
    const validation = validateAuthBody(body);
    if (!validation.ok) {
      return context.json(validation.error, 400);
    }

    try {
      const result = await authService.register(validation.value);
      return context.json(toAuthResponse(result), 201);
    } catch (error) {
      if (error instanceof AuthServiceError && error.code === 'email_taken') {
        return context.json({ error: 'email_already_registered' }, 409);
      }

      throw error;
    }
  });

  route.post('/auth/login', async (context) => {
    const body = await readAuthBody(context);
    const validation = validateAuthBody(body);
    if (!validation.ok) {
      return context.json(validation.error, 400);
    }

    try {
      const result = await authService.login(validation.value);
      return context.json(toAuthResponse(result));
    } catch (error) {
      if (error instanceof AuthServiceError && error.code === 'invalid_credentials') {
        return context.json({ error: 'invalid_credentials' }, 401);
      }

      throw error;
    }
  });

  route.post('/auth/logout', requireAuth, async (context) => {
    await authService.logout(context.get('authToken'));
    return context.json({ ok: true });
  });

  route.get('/auth/me', requireAuth, async (context) => context.json({
    user: toPublicUser(context.get('authUser'))
  }));

  route.delete('/auth/account', requireAuth, async (context) => {
    await authService.deleteAccount(context.get('userId'));
    return context.json({ ok: true });
  });

  return route;
}

async function readAuthBody(context: { req: { json(): Promise<unknown> } }): Promise<AuthJsonBody | null> {
  try {
    const body = await context.req.json();
    return body && typeof body === 'object' ? body as AuthJsonBody : null;
  } catch {
    return null;
  }
}

function validateAuthBody(body: AuthJsonBody | null) {
  if (!body) {
    return invalidParameter('body', 'request body must be valid JSON');
  }

  if (typeof body.email !== 'string' || !isEmailAddress(body.email)) {
    return invalidParameter('email', 'email must be a valid address');
  }

  if (typeof body.password !== 'string' || body.password.length < 8) {
    return invalidParameter('password', 'password must be at least 8 characters');
  }

  return {
    ok: true as const,
    value: {
      email: body.email,
      password: body.password
    }
  };
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

function toAuthResponse(result: AuthTokenResult) {
  return {
    token: result.token,
    tokenType: result.tokenType,
    expiresAt: result.expiresAt.toISOString(),
    user: toPublicUser(result.user)
  };
}

function toPublicUser(user: AuthenticatedUser) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString()
  };
}
