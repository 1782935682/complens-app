import type { MiddlewareHandler } from 'hono';

export function requestLogger(): MiddlewareHandler {
  return async (context, next) => {
    const startedAt = Date.now();
    await next();
    const durationMs = Date.now() - startedAt;
    console.log(`${context.req.method} ${context.req.path} ${context.res.status} ${durationMs}ms`);
  };
}
