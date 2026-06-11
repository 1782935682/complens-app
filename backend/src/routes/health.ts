import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/health', (context) => context.json({
  status: 'ok',
  version: '0.1.0',
  timestamp: new Date().toISOString()
}));
