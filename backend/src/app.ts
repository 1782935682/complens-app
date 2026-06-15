import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppConfig } from './config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createAuthRoute } from './routes/auth.js';
import { createGb2760Route } from './routes/gb2760.js';
import { healthRoute } from './routes/health.js';
import { createIngredientsRoute } from './routes/ingredients.js';
import { createLabelsRoute } from './routes/labels.js';
import { createNutritionRoute } from './routes/nutrition.js';
import { createReportsRoute } from './routes/reports.js';
import { createOcrRoute } from './routes/ocr.js';
import { createUserRoute } from './routes/user.js';
import { createLazyAuthService, type AuthService } from './services/authService.js';
import { createLazyGb2760Service, type Gb2760Service } from './services/gb2760Service.js';
import { createLazyIngredientService, type IngredientService } from './services/ingredientService.js';
import { createLabelService, type LabelService } from './services/labelService.js';
import { createNutritionService, type NutritionService } from './services/nutritionService.js';
import { createReportService, type ReportService } from './services/reportService.js';
import { createLazyUserService, type UserService } from './services/userService.js';

export type AppServices = {
  authService?: AuthService;
  gb2760Service?: Gb2760Service;
  ingredientService?: IngredientService;
  labelService?: LabelService;
  nutritionService?: NutritionService;
  userService?: UserService;
  reportService?: ReportService;
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
  app.route('/api', createLabelsRoute(services.labelService ?? createLabelService()));
  app.route('/api', createNutritionRoute(services.nutritionService ?? createNutritionService()));
  app.route('/api', createReportsRoute(services.reportService ?? createReportService({ ingredientService: services.ingredientService })));
  app.route('/api', createOcrRoute(authService, config));
  app.route('/api', createUserRoute(authService, services.userService ?? createLazyUserService(config.databaseUrl)));
  app.route('/api', createGb2760Route(authService, services.gb2760Service ?? createLazyGb2760Service(config.databaseUrl), {
    internalReviewers: config.gb2760InternalReviewers
  }));
  app.route('/api', createIngredientsRoute(services.ingredientService ?? createLazyIngredientService(config.databaseUrl)));

  app.notFound((context) => context.json({ error: 'not_found' }, 404));
  app.onError((error, context) => {
    console.error('[api:error]', error);
    return context.json({ error: 'internal_server_error' }, 500);
  });

  return app;
}
