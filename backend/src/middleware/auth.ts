import { createMiddleware } from 'hono/factory';
import type { AuthenticatedUser, AuthService } from '../services/authService.js';

export type AuthVariables = {
  authToken: string;
  authUser: AuthenticatedUser;
  userId: string;
};

export function createAuthMiddleware(authService: AuthService) {
  return createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
    const token = parseBearerToken(context.req.header('Authorization'));
    if (!token) {
      return context.json({ error: 'unauthorized' }, 401);
    }

    const user = await authService.getUserForToken(token);
    if (!user) {
      return context.json({ error: 'unauthorized' }, 401);
    }

    context.set('authToken', token);
    context.set('authUser', user);
    context.set('userId', user.id);
    await next();
  });
}

export function parseBearerToken(authorization: string | undefined) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
