import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppConfig } from './config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createAuthRoute } from './routes/auth.js';
import { healthRoute } from './routes/health.js';
import { createIngredientsRoute } from './routes/ingredients.js';
import { createUserRoute } from './routes/user.js';
import { createLazyAuthService, type AuthService } from './services/authService.js';
import { createLazyIngredientService, type IngredientService } from './services/ingredientService.js';
import { createLazyUserService, type UserService } from './services/userService.js';

export type AppServices = {
  authService?: AuthService;
  ingredientService?: IngredientService;
  userService?: UserService;
};

export function createApp(config: AppConfig, services: AppServices = {}) {
  const app = new Hono();

  app.use('*', cors({
    origin: config.corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  }));
  app.use('*', requestLogger());

  app.route('/', healthRoute);
  const authService = services.authService ?? createLazyAuthService(config.databaseUrl, config.jwtSecret);
  app.route('/api', createAuthRoute(authService));
  app.route('/api', createUserRoute(authService, services.userService ?? createLazyUserService(config.databaseUrl)));
  app.route('/api', createIngredientsRoute(services.ingredientService ?? createLazyIngredientService(config.databaseUrl)));

  app.notFound((context) => context.json({ error: 'not_found' }, 404));
  app.onError((error, context) => {
    console.error('[api:error]', error);
    return context.json({ error: 'internal_server_error' }, 500);
  });

  return app;
}
