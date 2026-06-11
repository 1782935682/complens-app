import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AI_ANALYSIS_ENDPOINT_PATH, AI_ANALYSIS_PROTOCOL_VERSION, buildAIAnalysisFallback, buildAIAnalysisRequest, validateAIAnalysisResponse, analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { formatAllergenNames, getAllergensByIds, getMatchingTextAllergens, getMatchingUserAllergens } from '../src/services/allergenService.js';
import { analyzeIngredientText, getCategoryStats, getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientById, getIngredientCategorySummaries, getRelatedIngredients, getSearchFilterOptions, getSearchSuggestions, searchIngredients } from '../src/services/ingredientService.js';
import { categoryPath } from '../src/data/categories.js';
import { OCR_ENDPOINT_PATH, OCR_PROTOCOL_VERSION, buildOCRFallback, buildOCRRequest, extractIngredientsFromImage, validateOCRResponse } from '../src/services/ocrService.js';
import { getCompareOverview } from '../src/services/compareService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from '../src/services/reportExportService.js';
import { buildSupportPrefillFromParams, buildSupportPrefillUrl, buildSupportRequestMarkdown } from '../src/services/supportService.js';
import { renderComparePage } from '../src/pages/comparePage.js';
import { renderDataPage } from '../src/pages/dataPage.js';
import { renderFoodAdditiveDetails } from '../src/pages/detailPage.js';
import { renderAnalyzePage } from '../src/pages/analyzePage.js';
import { renderHomePage } from '../src/pages/homePage.js';
import { renderLegalPage } from '../src/pages/legalPage.js';
import { renderMembershipPage } from '../src/pages/membershipPage.js';
import { renderOnboardingPage } from '../src/pages/onboardingPage.js';
import { renderScanPage } from '../src/pages/scanPage.js';
import { renderSearchPage } from '../src/pages/searchPage.js';
import { renderSettingsPage } from '../src/pages/settingsPage.js';
import { renderSupportPage } from '../src/pages/supportPage.js';
import { ingredientCard } from '../src/components/render.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from '../src/router/router.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { formatBytes, SCAN_IMAGE_MAX_BYTES, validateScanImageFile } from '../src/utils/imageFile.js';
import { readJson, writeJson } from '../src/services/storageService.js';
import { getMembershipActionMessage, getMembershipOverview } from '../src/services/membershipService.js';
import { buildCompareSharePayload, buildIngredientSharePayload, buildReportSharePayload, buildShareUrl, formatShareText, isShareAbort, isShareTypeError, sanitizeNativeSharePayload, sharePayloadWithFallback } from '../src/services/shareService.js';
import { getBase64ByteSize, getNativeCameraPhoto, isNativePlatform } from '../src/services/nativeBridgeService.js';
import { addCompareIngredient, addHistory, clearAnalysisReports, clearCompareItems, clearLocalUserData, clearScanDraft, clearSupportRequests, completeOnboarding, createAnalysisReport, deleteAnalysisReport, deleteSupportRequest, getAnalysisReportById, getAnalysisReports, getCompareIngredients, getCompareItems, getFavoriteIngredients, getFavoriteItems, getHistory, getLocalDataSnapshot, getLocalDataSummary, getOnboardingState, getScanDraft, getSupportRequests, getUserAllergens, importLocalDataSnapshot, isHistoryRecordingEnabled, removeCompareIngredient, removeHistory, resetOnboarding, saveAnalysisReport, saveScanDraft, saveSupportRequest, setHistoryRecordingEnabled, setUserAllergens, shouldShowOnboardingPrompt, skipOnboarding, toggleFavorite } from '../src/store/userStore.js';
import { normalizeText, splitIngredientInput, SAMPLES } from '../src/utils/text.js';
import { validateFoodAdditives } from './validate-data.mjs';

assert.equal(getIngredientById('niacinamide').nameCn, '烟酰胺');
assert.deepEqual(resolveRoute('#/food/search?q=E330'), {
  view: 'search',
  category: 'food',
  query: 'E330',
  page: 1,
  filters: { risk: '', ingredientCategory: '' }
});
assert.deepEqual(resolveRoute('#/food/search?risk=medium&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82'), {
  view: 'search',
  category: 'food',
  query: '',
  page: 1,
  filters: { risk: 'medium', ingredientCategory: '防腐剂' }
});
assert.deepEqual(resolveRoute('#/food/search?q=%E5%89%82&page=2'), {
  view: 'search',
  category: 'food',
  query: '剂',
  page: 2,
  filters: { risk: '', ingredientCategory: '' }
});
assert.deepEqual(resolveRoute('#/food/search?q=%E5%89%82&sort=risk&page=2'), {
  view: 'search',
  category: 'food',
  query: '剂',
  page: 2,
  filters: { risk: '', ingredientCategory: '' },
  sort: 'risk'
});
assert.deepEqual(resolveRoute('#/food/search?q=%E5%89%82&page=-4'), {
  view: 'search',
  category: 'food',
  query: '剂',
  page: 1,
  filters: { risk: '', ingredientCategory: '' }
});
assert.deepEqual(resolveRoute('#/food'), { view: 'home', category: 'food' });
assert.deepEqual(resolveRoute('#/food/compare'), { view: 'compare', category: 'food' });
assert.deepEqual(resolveRoute('#/food/scan'), { view: 'scan', category: 'food', input: '' });
assert.deepEqual(resolveRoute('#/food/scan?text=%E6%9F%A0%E6%AA%AC%E9%85%B8'), { view: 'scan', category: 'food', input: '柠檬酸' });
assert.deepEqual(resolveRoute('#/food/data'), { view: 'data', category: 'food' });
assert.deepEqual(resolveRoute('#/food/onboarding'), { view: 'onboarding', category: 'food' });
assert.deepEqual(resolveRoute('#/food/legal'), { view: 'legal', category: 'food', documentId: '' });
assert.deepEqual(resolveRoute('#/food/legal/privacy'), { view: 'legal', category: 'food', documentId: 'privacy' });
assert.deepEqual(resolveRoute('#/food/legal/not-real'), { view: 'not-found', category: 'food', path: '/food/legal/not-real' });
assert.deepEqual(resolveRoute('#/food/membership'), { view: 'membership', category: 'food' });
assert.deepEqual(resolveRoute('#/food/support'), {
  view: 'support',
  category: 'food',
  prefill: { topic: '', subject: '', message: '', contact: '', hasPrefill: false }
});
assert.deepEqual(resolveRoute('#/food/support?topic=data-correction&subject=%E6%9F%A0%E6%AA%AC%E9%85%B8%E6%9D%A5%E6%BA%90&message=%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9'), {
  view: 'support',
  category: 'food',
  prefill: { topic: 'data-correction', subject: '柠檬酸来源', message: '需要核对', contact: '', hasPrefill: true }
});
assert.deepEqual(resolveRoute('#/food/reports'), { view: 'reports', category: 'food', query: '' });
assert.deepEqual(resolveRoute('#/food/reports?q=%E5%8D%B5%E7%A3%B7%E8%84%82'), { view: 'reports', category: 'food', query: '卵磷脂' });
assert.deepEqual(resolveRoute('#/food/reports/report-123'), { view: 'report-detail', category: 'food', id: 'report-123' });
assert.deepEqual(resolveRoute('#/cosmetics/ingredient/niacinamide'), { view: 'detail', category: 'cosmetics', id: 'niacinamide' });
assert.deepEqual(resolveRoute('#/search?q=BHA'), {
  view: 'search',
  category: 'cosmetics',
  query: 'BHA',
  page: 1,
  filters: { risk: '', ingredientCategory: '' }
});
assert.deepEqual(resolveRoute('#/settings'), { view: 'settings', category: 'food' });
assert.deepEqual(resolveRoute('#/food/settings'), { view: 'settings', category: 'food' });
assert.deepEqual(resolveRoute('#/cosmetics/settings'), { view: 'settings', category: 'cosmetics' });
assert.deepEqual(resolveRoute('#/not-a-real-page'), { view: 'not-found', category: 'food', path: '/not-a-real-page' });
assert.deepEqual(resolveRoute('#/food/not-a-real-page'), { view: 'not-found', category: 'food', path: '/food/not-a-real-page' });
assert.equal(getRouteTitle(resolveRoute('#/food/search?q=E330')), 'E330 搜索结果 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/search?risk=medium')), '筛选结果 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/compare')), '成分对比 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/scan')), '扫描识别 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/data')), '数据来源 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/onboarding')), '首次设置 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/legal')), '隐私与条款 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/legal/privacy')), '隐私 - 隐私与条款 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/membership')), '会员中心 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/support')), '支持中心 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/ingredient/citric-acid')), '柠檬酸 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/reports/report-123')), '报告详情 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/reports?q=%E5%8D%B5%E7%A3%B7%E8%84%82')), '卵磷脂 报告检索 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/not-a-real-page')), '页面不存在 - 食品添加剂 - CompCheck 成分小查');
assert.deepEqual(getNavigationLinks(resolveRoute('#/food/search?q=E330')), [
  { key: 'search', href: '#/food/search', active: true },
  { key: 'compare', href: '#/food/compare', active: false },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'analyze', href: '#/food/analyze', active: false },
  { key: 'data', href: '#/food/data', active: false },
  { key: 'reports', href: '#/food/reports', active: false },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'membership', href: '#/food/membership', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.deepEqual(getNavigationLinks(resolveRoute('#/cosmetics/analyze')), [
  { key: 'search', href: '#/cosmetics/search', active: false },
  { key: 'compare', href: '#/cosmetics/compare', active: false },
  { key: 'scan', href: '#/cosmetics/scan', active: false },
  { key: 'analyze', href: '#/cosmetics/analyze', active: true },
  { key: 'data', href: '#/cosmetics/data', active: false },
  { key: 'reports', href: '#/cosmetics/reports', active: false },
  { key: 'favorites', href: '#/cosmetics/favorites', active: false },
  { key: 'membership', href: '#/cosmetics/membership', active: false },
  { key: 'settings', href: '#/cosmetics/settings', active: false }
]);
assert.deepEqual(getNavigationLinks(resolveRoute('#/food/reports/report-123')), [
  { key: 'search', href: '#/food/search', active: false },
  { key: 'compare', href: '#/food/compare', active: false },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'analyze', href: '#/food/analyze', active: false },
  { key: 'data', href: '#/food/data', active: false },
  { key: 'reports', href: '#/food/reports', active: true },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'membership', href: '#/food/membership', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.equal(getNavigationLinks(resolveRoute('#/food/onboarding')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/legal')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/membership')).find((item) => item.key === 'membership').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/support')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/compare')).find((item) => item.key === 'compare').active, true);
assert.deepEqual(getMobileNavigationLinks(resolveRoute('#/food')), [
  { key: 'home', href: '#/food', active: true },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'search', href: '#/food/search', active: false },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.deepEqual(getMobileNavigationLinks(resolveRoute('#/cosmetics/settings')), [
  { key: 'home', href: '#/cosmetics', active: false },
  { key: 'scan', href: '#/cosmetics/scan', active: false },
  { key: 'search', href: '#/cosmetics/search', active: false },
  { key: 'favorites', href: '#/cosmetics/favorites', active: false },
  { key: 'settings', href: '#/cosmetics/settings', active: true }
]);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/membership')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/legal/privacy')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/support')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/compare')).find((item) => item.key === 'favorites').active, true);
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(packageJson.scripts.dev, 'vite');
assert.equal(packageJson.scripts.build, 'vite build');
assert.equal(packageJson.scripts.preview, 'vite preview');
assert.equal(packageJson.scripts['cap:sync'], 'npm run build && npx cap sync');
assert.equal(packageJson.scripts['cap:open:ios'], 'npx cap open ios');
assert.equal(packageJson.scripts['cap:open:android'], 'npx cap open android');
assert.match(packageJson.dependencies['@capacitor/core'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/cli'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/ios'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/android'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/camera'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/filesystem'], /^\^7\./);
assert.match(packageJson.dependencies['@capacitor/share'], /^\^7\./);
const packageLock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
assert.equal(packageLock.packages['node_modules/@capacitor/cli'].version.startsWith('7.'), true);
assert.equal(packageLock.packages['node_modules/@capacitor/cli'].engines.node, '>=20.0.0');
assert.equal(packageLock.packages['node_modules/@capacitor/camera'].version.startsWith('7.'), true);
assert.equal(packageLock.packages['node_modules/@capacitor/filesystem'].version.startsWith('7.'), true);
assert.equal(packageLock.packages['node_modules/@capacitor/share'].version.startsWith('7.'), true);
const capacitorConfig = JSON.parse(await readFile(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
assert.deepEqual(capacitorConfig, {
  appId: 'com.compcheck.app',
  appName: '成分小查',
  webDir: 'dist',
  server: { androidScheme: 'https' }
});
const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
assert.match(gitignore, /\/ios\//);
assert.match(gitignore, /\/android\//);
assert.match(gitignore, /\/backend\/node_modules\//);
assert.match(gitignore, /\/backend\/dist\//);
assert.match(gitignore, /\/backend\/\.env/);
const backendPackageJson = JSON.parse(await readFile(new URL('../backend/package.json', import.meta.url), 'utf8'));
assert.equal(backendPackageJson.name, 'compcheck-api');
assert.equal(backendPackageJson.type, 'module');
assert.equal(backendPackageJson.scripts.dev, 'tsx src/index.ts');
assert.equal(backendPackageJson.scripts.start, 'node dist/index.js');
assert.equal(backendPackageJson.scripts.build, 'tsc');
assert.equal(backendPackageJson.scripts['db:generate'], 'drizzle-kit generate');
assert.equal(backendPackageJson.scripts['db:migrate'], 'drizzle-kit migrate');
assert.equal(backendPackageJson.scripts['db:seed'], 'tsx scripts/seed.ts');
assert.equal(backendPackageJson.scripts.typecheck, 'tsc --noEmit && tsc --noEmit -p tsconfig.test.json');
assert.equal(backendPackageJson.scripts.test, 'vitest run');
assert.match(backendPackageJson.dependencies.hono, /^\^4\./);
assert.match(backendPackageJson.dependencies['@hono/node-server'], /^\^2\./);
assert.match(backendPackageJson.dependencies['drizzle-orm'], /^\^0\./);
assert.match(backendPackageJson.dependencies.pg, /^\^8\./);
assert.match(backendPackageJson.dependencies.dotenv, /^\^17\./);
assert.match(backendPackageJson.dependencies.bcrypt, /^\^6\./);
assert.match(backendPackageJson.dependencies.jsonwebtoken, /^\^9\./);
assert.match(backendPackageJson.devDependencies.typescript, /^\^6\./);
assert.match(backendPackageJson.devDependencies.vitest, /^\^4\./);
assert.match(backendPackageJson.devDependencies['drizzle-kit'], /^\^0\./);
assert.match(backendPackageJson.devDependencies['@types/bcrypt'], /^\^6\./);
assert.match(backendPackageJson.devDependencies['@types/jsonwebtoken'], /^\^9\./);
const backendTsConfig = JSON.parse(await readFile(new URL('../backend/tsconfig.json', import.meta.url), 'utf8'));
assert.equal(backendTsConfig.compilerOptions.module, 'NodeNext');
assert.equal(backendTsConfig.compilerOptions.moduleResolution, 'NodeNext');
assert.equal(backendTsConfig.compilerOptions.rootDir, 'src');
assert.deepEqual(backendTsConfig.include, ['src/**/*.ts']);
const backendTestTsConfig = JSON.parse(await readFile(new URL('../backend/tsconfig.test.json', import.meta.url), 'utf8'));
assert.equal(backendTestTsConfig.extends, './tsconfig.json');
assert.equal(backendTestTsConfig.compilerOptions.rootDir, '.');
assert.deepEqual(backendTestTsConfig.include, ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', 'drizzle.config.ts', 'vitest.config.ts']);
const backendEnvExample = await readFile(new URL('../backend/.env.example', import.meta.url), 'utf8');
assert.match(backendEnvExample, /DATABASE_URL=postgres:\/\/postgres:password@localhost:15432\/compcheck/);
assert.match(backendEnvExample, /POSTGRES_PORT=15432/);
assert.match(backendEnvExample, /HOST=127\.0\.0\.1/);
assert.match(backendEnvExample, /PORT=3000/);
assert.match(backendEnvExample, /CORS_ORIGIN=http:\/\/localhost:5173/);
assert.match(backendEnvExample, /JWT_SECRET=replace-with-at-least-32-random-characters/);
assert.match(backendEnvExample, /OCR_PROVIDER=aliyun/);
assert.match(backendEnvExample, /AI_PROVIDER=anthropic/);
const backendDockerfile = await readFile(new URL('../backend/Dockerfile', import.meta.url), 'utf8');
assert.match(backendDockerfile, /FROM node:20-alpine AS build/);
assert.match(backendDockerfile, /RUN npm ci/);
assert.match(backendDockerfile, /CMD \["node", "dist\/index\.js"\]/);
const backendDockerCompose = await readFile(new URL('../backend/docker-compose.yml', import.meta.url), 'utf8');
assert.match(backendDockerCompose, /postgres:15-alpine/);
assert.match(backendDockerCompose, /\$\{POSTGRES_PORT:-15432\}:5432/);
assert.match(backendDockerCompose, /env_file:\n\s+- \.env/);
assert.match(backendDockerCompose, /HOST: 0\.0\.0\.0/);
assert.match(backendDockerCompose, /DATABASE_URL: postgres:\/\/postgres:password@postgres:5432\/compcheck/);
const backendAppSource = await readFile(new URL('../backend/src/app.ts', import.meta.url), 'utf8');
assert.match(backendAppSource, /createLazyAuthService\(config\.databaseUrl, config\.jwtSecret\)/);
assert.match(backendAppSource, /createLazyIngredientService\(config\.databaseUrl\)/);
const backendDrizzleConfig = await readFile(new URL('../backend/drizzle.config.ts', import.meta.url), 'utf8');
assert.match(backendDrizzleConfig, /dialect: 'postgresql'/);
assert.match(backendDrizzleConfig, /schema: '\.\/src\/db\/schema\.ts'/);
assert.match(backendDrizzleConfig, /out: '\.\/src\/db\/migrations'/);
const backendDbSchema = await readFile(new URL('../backend/src/db/schema.ts', import.meta.url), 'utf8');
assert.match(backendDbSchema, /export const ingredients = pgTable\('ingredients'/);
assert.match(backendDbSchema, /jsonb\('usage_limits'\)/);
assert.match(backendDbSchema, /jsonb\('food_categories'\)/);
assert.match(backendDbSchema, /export const ingredientSources = pgTable\('ingredient_sources'/);
assert.match(backendDbSchema, /export const users = pgTable\('users'/);
assert.match(backendDbSchema, /uniqueIndex\('users_email_unique_idx'\)/);
assert.match(backendDbSchema, /export const sessions = pgTable\('sessions'/);
assert.match(backendDbSchema, /references\(\(\) => users\.id, \{ onDelete: 'cascade' \}\)/);
assert.match(backendDbSchema, /ingredients_description_trgm_idx/);
assert.match(backendDbSchema, /ingredients_aliases_gin_idx/);
const backendIngredientsRoute = await readFile(new URL('../backend/src/routes/ingredients.ts', import.meta.url), 'utf8');
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients'/);
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients\/categories'/);
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients\/:id'/);
assert.match(backendIngredientsRoute, /invalid_parameter/);
const backendIngredientServiceSource = await readFile(new URL('../backend/src/services/ingredientService.ts', import.meta.url), 'utf8');
assert.equal(backendIngredientServiceSource.split(String.raw`ESCAPE '\\'`).length - 1, 2);
const backendAuthRoute = await readFile(new URL('../backend/src/routes/auth.ts', import.meta.url), 'utf8');
assert.match(backendAuthRoute, /route\.post\('\/auth\/register'/);
assert.match(backendAuthRoute, /route\.post\('\/auth\/login'/);
assert.match(backendAuthRoute, /route\.post\('\/auth\/logout'/);
assert.match(backendAuthRoute, /route\.get\('\/auth\/me'/);
assert.match(backendAuthRoute, /route\.delete\('\/auth\/account'/);
assert.match(backendAuthRoute, /email_already_registered/);
const backendAuthServiceSource = await readFile(new URL('../backend/src/services/authService.ts', import.meta.url), 'utf8');
assert.match(backendAuthServiceSource, /const BCRYPT_ROUNDS = 12/);
assert.match(backendAuthServiceSource, /7 \* 24 \* 60 \* 60 \* 1000/);
assert.match(backendAuthServiceSource, /bcrypt\.hash/);
assert.match(backendAuthServiceSource, /jti: randomUUID\(\)/);
assert.match(backendAuthServiceSource, /jwt\.sign/);
assert.match(backendAuthServiceSource, /jwt\.verify/);
const backendAuthMiddleware = await readFile(new URL('../backend/src/middleware/auth.ts', import.meta.url), 'utf8');
assert.match(backendAuthMiddleware, /Authorization/);
assert.match(backendAuthMiddleware, /Bearer\\s\+\(\.\+\)/);
assert.match(backendAuthMiddleware, /context\.set\('userId'/);
const backendSeedScript = await readFile(new URL('../backend/scripts/seed.ts', import.meta.url), 'utf8');
assert.match(backendSeedScript, /src\/data\/foodAdditives\.js/);
assert.match(backendSeedScript, /Seeded \$\{foodAdditives\.length\} ingredients/);
const backendMigrationSql = await readFile(new URL('../backend/src/db/migrations/0000_thick_the_professor.sql', import.meta.url), 'utf8');
assert.match(backendMigrationSql, /CREATE TABLE "ingredients"/);
assert.match(backendMigrationSql, /CREATE TABLE "ingredient_sources"/);
assert.match(backendMigrationSql, /FOREIGN KEY \("ingredient_id"\) REFERENCES "public"\."ingredients"\("id"\) ON DELETE cascade/);
const backendSearchIndexMigrationSql = await readFile(new URL('../backend/src/db/migrations/0001_complex_maximus.sql', import.meta.url), 'utf8');
assert.match(backendSearchIndexMigrationSql, /CREATE EXTENSION IF NOT EXISTS "pg_trgm"/);
assert.match(backendSearchIndexMigrationSql, /ingredients_description_trgm_idx/);
assert.match(backendSearchIndexMigrationSql, /ingredients_aliases_gin_idx/);
const backendAuthMigrationSql = await readFile(new URL('../backend/src/db/migrations/0002_chilly_wallflower.sql', import.meta.url), 'utf8');
assert.match(backendAuthMigrationSql, /CREATE TABLE "users"/);
assert.match(backendAuthMigrationSql, /"password_hash" text NOT NULL/);
assert.match(backendAuthMigrationSql, /CREATE TABLE "sessions"/);
assert.match(backendAuthMigrationSql, /FOREIGN KEY \("user_id"\) REFERENCES "public"\."users"\("id"\) ON DELETE cascade/);
const backendVitestConfig = await readFile(new URL('../backend/vitest.config.ts', import.meta.url), 'utf8');
assert.match(backendVitestConfig, /include: \['tests\/\*\*\/\*\.test\.ts'\]/);
const viteConfigJs = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
assert.match(viteConfigJs, /root: 'src'/);
assert.match(viteConfigJs, /base: '\.\/'/);
assert.match(viteConfigJs, /publicDir: '\.\.\/public'/);
assert.match(viteConfigJs, /define: \{ __APP_NAME__: JSON\.stringify\(process\.env\.APP_NAME \|\| '成分小查'\) \}/);
assert.match(viteConfigJs, /outDir: '\.\.\/dist'/);
const ciWorkflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
assert.match(ciWorkflow, /node-version: '20\.19'/);
assert.match(ciWorkflow, /npm ci/);
const indexHtml = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
assert.match(indexHtml, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(indexHtml, /name="apple-mobile-web-app-capable" content="yes"/);
assert.match(indexHtml, /data-mobile-nav-key="home"/);
assert.match(indexHtml, /data-mobile-nav-key="scan"/);
assert.match(indexHtml, /data-nav-key="compare"/);
assert.match(indexHtml, /data-nav-key="scan"/);
assert.match(indexHtml, /data-nav-key="data"/);
assert.match(indexHtml, /data-nav-key="reports"/);
assert.match(indexHtml, /data-nav-key="membership"/);
assert.match(indexHtml, /href="#\/food\/legal"/);
assert.match(indexHtml, /data-shell-legal-link/);
const stylesCss = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(stylesCss, /padding-bottom: max\(env\(safe-area-inset-bottom, 0px\), 1rem\)/);
assert.match(stylesCss, /\.scan-source-actions/);
const appManifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(appManifest.display, 'standalone');
assert.equal(appManifest.start_url, './#/food');
assert.equal(appManifest.icons[0].src, './app-icon.svg');
assert.equal(appManifest.shortcuts[1].url, './#/food/scan');
const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainJs, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
assert.match(mainJs, /function getInitialHash\(\)/);
assert.match(mainJs, /categoryPath\(onboardingState\.preferredCategory, '\/onboarding'\)/);
assert.match(mainJs, /categoryPath\(onboardingState\.preferredCategory\)/);
assert.match(mainJs, /categoryPath\(route\.category, '\/legal'\)/);
assert.match(mainJs, /history\.replaceState\(null, '', `#\$\{categoryPath\(route\.category, '\/support'\)\}`\)/);
assert.match(mainJs, /sharePayloadWithFallback\(payload, \{ copyText, updateStatus \}\)/);
assert.match(mainJs, /getNativeCameraPhoto\(\)/);
assert.match(mainJs, /isNativePlatform\(\)/);
assert.match(mainJs, /data-native-scan-image/);
assert.match(mainJs, /result\.reason === 'cancelled' \|\| result\.reason === 'empty'/);
assert.match(mainJs, /validateScanImageFile\(\{ type: result\.mimeType, size: result\.size \}\)/);
assert.match(mainJs, /openScanFilePicker\(fileInput\)/);
assert.match(mainJs, /updateScanPreviewWithDataUrl\(preview, result\.dataUrl\)/);
assert.match(mainJs, /请先输入成分表文字/);
assert.match(mainJs, /function updateAnalyzeStatus\(message\)/);
const shareServiceJs = await readFile(new URL('../src/services/shareService.js', import.meta.url), 'utf8');
assert.match(shareServiceJs, /nativeShare = shareWithNative/);
assert.match(shareServiceJs, /sanitizeNativeSharePayload\(payload\)/);
assert.match(shareServiceJs, /navigatorShare/);
assert.match(shareServiceJs, /formatShareText\(payload\)/);
assert.match(shareServiceJs, /isShareAbort\(error\)/);
assert.match(shareServiceJs, /isShareTypeError\(error\)/);
assert.match(shareServiceJs, /系统分享不可用，已复制分享内容。/);
const nativeBridgeServiceJs = await readFile(new URL('../src/services/nativeBridgeService.js', import.meta.url), 'utf8');
assert.match(nativeBridgeServiceJs, /Capacitor\?\.isNativePlatform\?\.\(\)/);
assert.match(nativeBridgeServiceJs, /Camera\.getPhoto/);
assert.match(nativeBridgeServiceJs, /CameraResultType\.Base64/);
assert.match(nativeBridgeServiceJs, /CameraSource\.Prompt/);
assert.match(nativeBridgeServiceJs, /getBase64ByteSize\(photo\.base64String\)/);
assert.match(nativeBridgeServiceJs, /Share\.share/);
assert.match(nativeBridgeServiceJs, /if \(payload\.url\) shareOptions\.url = payload\.url/);
const serviceWorkerJs = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.match(serviceWorkerJs, /CACHE_VERSION = 'compcheck-shell-v17'/);
assert.match(serviceWorkerJs, /\.\/index\.html/);
assert.match(serviceWorkerJs, /\.\/manifest\.webmanifest/);
assert.match(serviceWorkerJs, /\.\/app-icon\.svg/);
assert.doesNotMatch(serviceWorkerJs, /\.\/data\/foodAdditives\.js/);
assert.match(serviceWorkerJs, /request\.mode === 'navigate'/);
assert.match(serviceWorkerJs, /caches\.match\('\.\/index\.html'\)/);
assert.match(serviceWorkerJs, /cacheResponse\(request, networkResponse\)/);
const notFoundHtml = renderRoute(resolveRoute('#/food/not-a-real-page'));
assert.match(notFoundHtml, /页面不存在/);
assert.match(notFoundHtml, /没有找到这个页面/);
assert.match(notFoundHtml, /href="#\/food"/);
assert.match(notFoundHtml, /href="#\/food\/search"/);
assert.equal(categoryPath('food', '/search'), '/food/search');

const scanHtml = renderRoute(resolveRoute('#/food/scan?text=%E6%9F%A0%E6%AA%AC%E9%85%B8'));
assert.match(scanHtml, /扫描成分表/);
assert.match(scanHtml, /data-scan-form/);
assert.match(scanHtml, /data-scan-image-input/);
assert.match(scanHtml, /data-native-scan-image/);
assert.match(scanHtml, /系统相机\/相册/);
assert.match(scanHtml, /accept="image\/png,image\/jpeg,image\/webp,image\/gif,image\/bmp,image\/avif"/);
assert.match(scanHtml, /capture="environment"/);
assert.match(scanHtml, /data-scan-preview/);
assert.match(scanHtml, /data-rotate-scan-image/);
assert.match(scanHtml, /data-clear-scan-image/);
assert.match(scanHtml, /旋转预览/);
assert.match(scanHtml, /移除图片/);
assert.match(scanHtml, /data-scan-draft-status/);
assert.match(scanHtml, /协议 v1 已固定/);
assert.match(scanHtml, /OCR 服务端代理 \/ 待接入/);
assert.match(scanHtml, /识别协议已就绪/);
assert.match(scanHtml, /OCR 服务未接入，请手动输入文字/);
assert.doesNotMatch(scanHtml, /\/api\/ocr\/extract-ingredients/);
assert.match(scanHtml, /单张不超过 8 MB/);
assert.match(scanHtml, /柠檬酸/);
assert.match(scanHtml, /已从链接带入待分析文本/);
assert.match(scanHtml, /href="#\/food\/analyze"/);
assert.match(renderScanPage('', 'cosmetics'), /化妆品成分/);
const iosPlistAdditions = await readFile(new URL('../docs/ios-plist-additions.md', import.meta.url), 'utf8');
assert.match(iosPlistAdditions, /NSCameraUsageDescription = "用于扫描食品成分表"/);
assert.match(iosPlistAdditions, /NSPhotoLibraryUsageDescription = "用于从相册选择食品包装图片"/);
writeJson('compcheck:scan-drafts', {});
assert.equal(getScanDraft('food'), '');
assert.equal(saveScanDraft(' 柠檬酸，山梨酸钾 ', 'food'), '柠檬酸，山梨酸钾');
assert.equal(getScanDraft('food'), '柠檬酸，山梨酸钾');
assert.match(renderScanPage('', 'food'), /已恢复本机保存的扫描草稿/);
assert.match(renderScanPage('', 'food'), /柠檬酸，山梨酸钾/);
assert.deepEqual(clearScanDraft('food'), {});
assert.equal(getScanDraft('food'), '');
assert.equal(SCAN_IMAGE_MAX_BYTES, 8 * 1024 * 1024);
assert.equal(formatBytes(0), '0 B');
assert.equal(formatBytes(1024), '1 KB');
assert.equal(formatBytes(SCAN_IMAGE_MAX_BYTES), '8 MB');
assert.deepEqual(validateScanImageFile(null), {
  ok: false,
  reason: 'empty',
  message: '请先选择一张清晰的产品成分表图片。'
});
assert.deepEqual(validateScanImageFile({ type: 'image/svg+xml', size: 100 }), {
  ok: false,
  reason: 'type',
  message: '当前仅支持 PNG、JPEG、WebP、GIF、BMP 或 AVIF 图片。'
});
assert.deepEqual(validateScanImageFile({ type: 'image/png', size: SCAN_IMAGE_MAX_BYTES + 1 }), {
  ok: false,
  reason: 'size',
  message: '图片超过 8 MB，请压缩后再上传。'
});
assert.deepEqual(validateScanImageFile({ type: 'image/jpeg', size: 2048 }), {
  ok: true,
  reason: '',
  message: '已选择图片，大小 2 KB。'
});

const cnResults = searchIngredients('烟酰胺');
assert.equal(cnResults[0].id, 'niacinamide');
const citricSharePayload = buildIngredientSharePayload(getIngredientById('citric-acid', 'food'), 'food', 'https://example.com/app');
assert.equal(citricSharePayload.url, 'https://example.com/app#/food/ingredient/citric-acid');
assert.match(citricSharePayload.text, /食品添加剂成分：柠檬酸/);
assert.match(formatShareText(citricSharePayload), /CompCheck/);
assert.equal(buildShareUrl('food', '/compare', 'https://example.com/#/old'), 'https://example.com/#/food/compare');
assert.equal(sanitizeNativeSharePayload({ ...citricSharePayload, url: 'capacitor://localhost/#/food/ingredient/citric-acid' }).url, '');
assert.equal(sanitizeNativeSharePayload({ ...citricSharePayload, url: 'https://localhost/#/food/ingredient/citric-acid' }).url, '');
assert.equal(sanitizeNativeSharePayload({ ...citricSharePayload, url: '#/food/ingredient/citric-acid' }).url, '');
assert.equal(sanitizeNativeSharePayload({ ...citricSharePayload, url: '/food/ingredient/citric-acid' }).url, '');
assert.equal(sanitizeNativeSharePayload(citricSharePayload).url, 'https://example.com/app#/food/ingredient/citric-acid');
assert.equal(isNativePlatform(), false);
assert.equal(getBase64ByteSize(''), 0);
assert.equal(getBase64ByteSize('TWE='), 2);
assert.equal(getBase64ByteSize('TWFu'), 3);
const nativePhotoResult = await getNativeCameraPhoto();
assert.equal(nativePhotoResult.ok, false);
assert.equal(nativePhotoResult.reason, 'web');
const copiedShareTexts = [];
const shareStatuses = [];
assert.deepEqual(
  await sharePayloadWithFallback(citricSharePayload, {
    navigatorShare: null,
    copyText: async (text) => copiedShareTexts.push(text),
    updateStatus: (message) => shareStatuses.push(message)
  }),
  { ok: true, method: 'copy' }
);
assert.match(copiedShareTexts[0], /柠檬酸/);
assert.equal(shareStatuses.at(-1), '已复制分享内容。');
let nativeSharePayload = null;
assert.deepEqual(
  await sharePayloadWithFallback({ ...citricSharePayload, url: 'capacitor://localhost/#/food/ingredient/citric-acid' }, {
    nativeShare: async (payload) => {
      nativeSharePayload = payload;
      return { ok: true, method: 'native', message: '已打开系统分享。' };
    },
    copyText: async (text) => copiedShareTexts.push(text),
    updateStatus: (message) => shareStatuses.push(message)
  }),
  { ok: true, method: 'native' }
);
assert.equal(nativeSharePayload.url, '');
const webShareCopyStatuses = [];
assert.deepEqual(
  await sharePayloadWithFallback(citricSharePayload, {
    navigatorShare: async () => {
      throw new TypeError('Web Share blocked');
    },
    copyText: async (text) => copiedShareTexts.push(text),
    updateStatus: (message) => webShareCopyStatuses.push(message)
  }),
  { ok: true, method: 'copy' }
);
assert.equal(webShareCopyStatuses.at(-1), '系统分享不可用，已复制分享内容。');
assert.equal(isShareAbort({ name: 'AbortError' }), true);
assert.equal(isShareAbort({ message: 'cancelled' }), true);
assert.equal(isShareTypeError(new TypeError('blocked')), true);

const enResults = searchIngredients('BHA');
assert.equal(enResults[0].id, 'salicylic-acid');
assert.equal(searchIngredients('E330', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('INS 211', 'food')[0].id, 'sodium-benzoate');
assert.equal(searchIngredients('E621', 'food')[0].id, 'monosodium-glutamate');
assert.equal(searchIngredients('E950', 'food')[0].id, 'acesulfame-potassium');
assert.equal(searchIngredients('E282', 'food')[0].id, 'calcium-propionate');
assert.equal(searchIngredients('花青素', 'food')[0].id, 'anthocyanins');
assert.equal(searchIngredients('E100', 'food')[0].id, 'curcumin');
assert.equal(searchIngredients('辣椒红', 'food')[0].id, 'paprika-extract');
assert.equal(searchIngredients('苋菜红', 'food')[0].id, 'amaranth');
assert.equal(searchIngredients('亮蓝', 'food')[0].id, 'brilliant-blue-fcf');
assert.equal(searchIngredients('焦磷酸钠', 'food')[0].id, 'sodium-pyrophosphate');
assert.equal(searchIngredients('三聚磷酸钠', 'food')[0].id, 'sodium-tripolyphosphate');
assert.equal(searchIngredients('木糖醇', 'food')[0].id, 'xylitol');
assert.equal(searchIngredients('麦芽糖醇', 'food')[0].id, 'maltitol');
assert.equal(searchIngredients('赤藓糖醇', 'food')[0].id, 'erythritol');
assert.equal(searchIngredients('ningmengsuan', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('nms', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('柠猛酸', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('shanlisuanjia', 'food')[0].id, 'potassium-sorbate');
assert.equal(searchIngredients('山莉酸钾', 'food')[0].id, 'potassium-sorbate');
assert.equal(searchIngredients('yanxianan', 'cosmetics')[0].id, 'niacinamide');
assert.equal(getSearchSuggestions('', 'food')[0].id, 'citric-acid');
assert.equal(getSearchSuggestions('E330', 'food')[0].id, 'citric-acid');
assert.equal(getSearchSuggestions('INS 211', 'food')[0].id, 'sodium-benzoate');
assert.equal(getSearchSuggestions('INS 102', 'food')[0].id, 'tartrazine');
assert.equal(getSearchSuggestions('INS 250', 'food')[0].id, 'sodium-nitrite');
assert.equal(getSearchSuggestions('INS 551', 'food')[0].id, 'silicon-dioxide');
assert.equal(getSearchSuggestions('防腐剂', 'food')[0].matchLabel, '分类');
assert.equal(getSearchSuggestions('BHA', 'cosmetics')[0].id, 'salicylic-acid');
assert.equal(getSearchSuggestions('ningmengsuan', 'food')[0].matchLabel, '拼音');
assert.equal(getSearchSuggestions('nms', 'food')[0].matchLabel, '首字母');
assert.equal(getSearchSuggestions('柠猛酸', 'food')[0].matchLabel, '常见写法');
assert.equal(getSearchSuggestions('shanlisuanjia', 'food')[0].id, 'potassium-sorbate');
assert.equal(getSearchSuggestions('山莉酸钾', 'food')[0].matchLabel, '近似');
assert.equal(getSearchSuggestions('not-found-term', 'food').length, 0);
assert.deepEqual(searchIngredients('40 mg', 'food'), []);
assert.deepEqual(searchIngredients('', 'food'), []);
assert.deepEqual(
  searchIngredients('', 'food', { risk: 'medium', ingredientCategory: '防腐剂' }).map((item) => item.id).sort(),
  [
    'benzoic-acid',
    'calcium-propionate',
    'natamycin',
    'nisin',
    'potassium-benzoate',
    'potassium-metabisulfite',
    'potassium-nitrate',
    'potassium-sorbate',
    'sodium-benzoate',
    'sodium-propionate',
    'sorbic-acid'
  ].sort()
);
assert.deepEqual(
  searchIngredients('防腐剂', 'food', { ingredientCategory: '防腐剂' }).map((item) => item.id).sort(),
  [
    'benzoic-acid',
    'calcium-propionate',
    'natamycin',
    'nisin',
    'potassium-benzoate',
    'potassium-metabisulfite',
    'potassium-nitrate',
    'potassium-sorbate',
    'sodium-benzoate',
    'sodium-nitrite',
    'sodium-propionate',
    'sorbic-acid'
  ].sort()
);
assert.deepEqual(searchIngredients('', 'food', { risk: 'high' }).map((item) => item.id), ['sodium-nitrite']);
assert.deepEqual(getSearchFilterOptions('food').categories.includes('防腐剂'), true);
assert.deepEqual(getSearchFilterOptions('food').categories.includes('抗结剂'), true);
assert.deepEqual(getSearchFilterOptions('food').categories.includes('着色剂'), true);
assert.deepEqual(getSearchFilterOptions('food').categories.includes('增味剂'), true);
assert.deepEqual(getSearchFilterOptions('food').riskLevels.includes('high'), true);
assert.deepEqual(getSearchFilterOptions('food').riskLevels.includes('medium'), true);
assert.equal(getIngredientById('sulfur-dioxide', 'food').allergenTypes[0], 'sulphites');
assert.equal(getIngredientById('sodium-alginate', 'food').gbCode, 'INS 401');
assert.equal(getIngredientById('carrageenan', 'food').category, '增稠剂');
assert.equal(getIngredientById('malic-acid', 'food').eNumber, 'E296');
assert.equal(getIngredientById('sodium-tripolyphosphate', 'food').category, '其他');
assert.deepEqual(getIngredientById('xylitol', 'food').usageLimits, []);
const foodAuditSummary = getDatasetAuditSummary('food');
assert.equal(foodAuditSummary.totalCount, 100);
assert.equal(foodAuditSummary.categoryCount, 15);
assert.equal(foodAuditSummary.draftCount, 100);
assert.equal(foodAuditSummary.reviewedOrVerifiedCount, 0);
assert.equal(foodAuditSummary.withUsageLimitsCount, 0);
assert.equal(foodAuditSummary.missingUsageLimitsCount, 100);
assert.equal(foodAuditSummary.mvpMinimumReached, true);
const foodSourceSummaries = getDatasetSourceSummaries('food');
assert.equal(foodSourceSummaries.length, 4);
assert.equal(foodSourceSummaries[0].recordCount, 100);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'GB 2760'), true);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'FAO/WHO JECFA'), true);
const foodVersionSummaries = getDatasetVersionSummaries('food');
assert.deepEqual(foodVersionSummaries, [{ version: 'food-additives-seed-v5', count: 100, latestUpdatedAt: '2026-06-11' }]);
const foodCategorySummaries = getIngredientCategorySummaries('food');
assert.deepEqual(getCategoryStats('food').slice(0, 3).map((item) => item.name), foodCategorySummaries.slice(0, 3).map((item) => item.name));
assert.equal(foodCategorySummaries.find((item) => item.name === '酸度调节剂').count, 9);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').count, 12);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.medium, 11);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.high, 1);
assert.equal(foodCategorySummaries.find((item) => item.name === '着色剂').count, 13);
assert.equal(foodCategorySummaries.find((item) => item.name === '增味剂').count, 2);
assert.equal(foodCategorySummaries.find((item) => item.name === '甜味剂').count, 11);
assert.equal(foodCategorySummaries.find((item) => item.name === '增稠剂').count, 12);
assert.equal(foodCategorySummaries.find((item) => item.name === '乳化剂').count, 8);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗氧化剂').count, 9);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗结剂').count, 1);
assert.equal(foodCategorySummaries.find((item) => item.name === '膨松剂').count, 6);
assert.equal(foodCategorySummaries.find((item) => item.name === '香料类').count, 5);
assert.equal(foodCategorySummaries.find((item) => item.name === '其他').count, 7);
assert.equal(foodCategorySummaries.every((item) => item.count > 0), true);

const relatedCitricAcid = getRelatedIngredients('citric-acid', 'food');
assert.equal(relatedCitricAcid.some((item) => item.id === 'sodium-citrate'), true);
assert.equal(relatedCitricAcid.some((item) => item.id === 'potassium-citrate'), true);
assert.equal(relatedCitricAcid.every((item) => item.id !== 'citric-acid'), true);
assert.equal(relatedCitricAcid[0].relationReasons.some((reason) => reason === '同属酸度调节剂'), true);
assert.deepEqual(getRelatedIngredients('not-found', 'food'), []);
const relatedSalicylicAcid = getRelatedIngredients('salicylic-acid', 'cosmetics', 2);
assert.equal(relatedSalicylicAcid.length, 2);
assert.equal(relatedSalicylicAcid.some((item) => item.id === 'retinol'), true);
const detailHtmlWithRelatedIngredients = renderRoute(resolveRoute('#/food/ingredient/citric-acid'));
assert.match(detailHtmlWithRelatedIngredients, /data-related-ingredients/);
assert.match(detailHtmlWithRelatedIngredients, /data-food-audit-note/);
assert.match(detailHtmlWithRelatedIngredients, /逐食品类别限量、ADI 原文和来源条款仍需审核/);
assert.match(detailHtmlWithRelatedIngredients, /相关成分/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/ingredient\/sodium-citrate"/);
assert.match(detailHtmlWithRelatedIngredients, /同属酸度调节剂/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/search\?q=%E9%85%B8%E5%91%B3%E5%89%82"/);
assert.match(detailHtmlWithRelatedIngredients, /data-support-correction-link/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/support\?topic=data-correction/);
assert.match(detailHtmlWithRelatedIngredients, /%E6%9F%A0%E6%AA%AC%E9%85%B8\+%E6%95%B0%E6%8D%AE%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9/);
const missingIngredientHtml = renderRoute(resolveRoute('#/food/ingredient/not-in-dataset'));
assert.match(missingIngredientHtml, /data-missing-ingredient/);
assert.match(missingIngredientHtml, /该成分暂未收录/);
assert.match(missingIngredientHtml, /href="#\/food\/search\?q=not-in-dataset"/);
assert.match(missingIngredientHtml, /data-support-correction-link/);
assert.match(missingIngredientHtml, /href="#\/food\/support\?topic=data-correction/);

const filteredSearchHtml = renderSearchPage('', 'food', { risk: 'medium', ingredientCategory: '防腐剂' });
assert.match(filteredSearchHtml, /筛选结果/);
assert.match(filteredSearchHtml, /value="medium" selected/);
assert.match(filteredSearchHtml, /value="防腐剂" selected/);
assert.match(filteredSearchHtml, /关注等级：需关注/);
assert.match(filteredSearchHtml, /成分分类：防腐剂/);
assert.match(filteredSearchHtml, /href="#\/food\/search"/);
const homeHtmlWithCategoryFilters = renderHomePage('food');
assert.match(homeHtmlWithCategoryFilters, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(homeHtmlWithCategoryFilters, /href="#\/food\/data"/);
assert.match(homeHtmlWithCategoryFilters, /查看来源与审核/);
assert.match(homeHtmlWithCategoryFilters, /酸度调节剂[\s\S]*9 项/);
assert.match(homeHtmlWithCategoryFilters, /data-dataset-audit/);
assert.match(homeHtmlWithCategoryFilters, /100 条[\s\S]*草稿数据/);
assert.match(homeHtmlWithCategoryFilters, /0 条[\s\S]*已复核\/验证/);
assert.match(homeHtmlWithCategoryFilters, /0%[\s\S]*限量覆盖/);
const dataPageHtml = renderRoute(resolveRoute('#/food/data'));
assert.match(dataPageHtml, /数据来源与审核状态/);
assert.match(dataPageHtml, /data-dataset-detail/);
assert.match(dataPageHtml, /100 条[\s\S]*当前记录/);
assert.match(dataPageHtml, /4 个来源/);
assert.match(dataPageHtml, /食品安全国家标准 食品添加剂使用标准/);
assert.match(dataPageHtml, /GB 2760/);
assert.match(dataPageHtml, /food-additives-seed-v5/);
assert.match(dataPageHtml, /缺逐食品类别限量/);
assert.match(dataPageHtml, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(dataPageHtml, /data-dataset-correction-link/);
assert.match(dataPageHtml, /href="#\/food\/support\?topic=data-correction/);
assert.match(dataPageHtml, /%E6%95%B0%E6%8D%AE%E6%9D%A5%E6%BA%90%E6%88%96%E5%AE%A1%E6%A0%B8%E7%8A%B6%E6%80%81%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9/);
assert.match(renderDataPage('cosmetics'), /当前类别含 8 条原型数据/);
const searchHtmlWithSuggestions = renderSearchPage('E330', 'food');
assert.match(searchHtmlWithSuggestions, /data-search-suggestions/);
assert.match(searchHtmlWithSuggestions, /suggestion-item/);
assert.match(searchHtmlWithSuggestions, /柠檬酸/);
assert.match(searchHtmlWithSuggestions, /E-number：E330/);
assert.match(searchHtmlWithSuggestions, /data-dataset-audit-note/);
assert.match(searchHtmlWithSuggestions, /100 条草稿数据/);
assert.match(searchHtmlWithSuggestions, /使用限量和 ADI 原文仍在审核中/);
const pinyinSearchHtml = renderSearchPage('ningmengsuan', 'food');
assert.match(pinyinSearchHtml, /data-search-assist/);
assert.match(pinyinSearchHtml, /可能相关/);
assert.match(pinyinSearchHtml, /拼音：ningmengsuan/);
const nearSearchHtml = renderSearchPage('山莉酸钾', 'food');
assert.match(nearSearchHtml, /近似：山梨酸钾/);
const emptyResultSearchHtml = renderSearchPage('not-found-term', 'food');
assert.match(emptyResultSearchHtml, /data-search-empty-state/);
assert.match(emptyResultSearchHtml, /未找到相关成分/);
assert.match(emptyResultSearchHtml, /data-empty-category-links/);
assert.match(emptyResultSearchHtml, /热门分类/);
assert.match(emptyResultSearchHtml, /href="#\/food\/search\?ingredientCategory=/);
const firstPageSearchHtml = renderSearchPage('剂', 'food');
assert.match(firstPageSearchHtml, /显示第 1-6 项，共 100 项/);
assert.match(firstPageSearchHtml, /href="#\/food\/search\?q=%E5%89%82&page=2"/);
const riskSortedSearchHtml = renderSearchPage('剂', 'food', {}, 1, 'risk');
assert.match(riskSortedSearchHtml, /value="risk" selected/);
assert.match(riskSortedSearchHtml, /排序：关注等级优先/);
assert.match(riskSortedSearchHtml, /risk-facets/);
assert.match(riskSortedSearchHtml, /category-facets/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&risk=medium&sort=risk"/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=risk"/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&sort=risk&page=2"/);
const riskSortedPreservativeHtml = renderSearchPage('', 'food', { ingredientCategory: '防腐剂' }, 1, 'risk');
assert.equal(riskSortedPreservativeHtml.indexOf('亚硝酸钠') < riskSortedPreservativeHtml.indexOf('丙酸钙'), true);
assert.match(riskSortedPreservativeHtml, /href="#\/food\/search\?ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=risk"/);
assert.match(riskSortedPreservativeHtml, /href="#\/food\/search\?risk=high&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=risk"/);
const mediumNameSortedHtml = renderSearchPage('', 'food', { risk: 'medium' }, 1, 'name');
assert.match(mediumNameSortedHtml, /href="#\/food\/search\?risk=medium&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=name"/);
const highRiskSearchHtml = renderSearchPage('', 'food', { risk: 'high' });
assert.match(highRiskSearchHtml, /高关注/);
assert.match(highRiskSearchHtml, /亚硝酸钠/);
const pagedSearchHtml = renderSearchPage('剂', 'food', {}, 2);
assert.match(pagedSearchHtml, /显示第 7-12 项，共 100 项/);
assert.match(pagedSearchHtml, /aria-current="page">2</);
assert.match(pagedSearchHtml, /href="#\/food\/search\?q=%E5%89%82"/);
assert.doesNotMatch(pagedSearchHtml, /<h3>阿斯巴甜<\/h3>/);

assert.deepEqual(splitIngredientInput('水，烟酰胺; 香精\n水杨酸'), ['水', '烟酰胺', '香精', '水杨酸']);
assert.deepEqual(splitIngredientInput('苯氧乙醇(防腐剂)，香精（香料）'), ['苯氧乙醇', '香精']);
assert.deepEqual(splitIngredientInput('单，双甘油脂肪酸酯，甘油'), ['单，双甘油脂肪酸酯', '甘油']);
assert.deepEqual(splitIngredientInput('配料：水，食品添加剂（柠檬酸、山梨酸钾），黄原胶0.1%'), ['水', '柠檬酸', '山梨酸钾', '黄原胶']);
assert.deepEqual(splitIngredientInput('配料：水，食品添加剂（柠檬酸钠），山梨酸钾'), ['水', '柠檬酸钠', '山梨酸钾']);
assert.deepEqual(splitIngredientInput('水，食品添加剂：柠檬酸，山梨酸钾'), ['水', '柠檬酸', '山梨酸钾']);
assert.deepEqual(splitIngredientInput('（柠檬酸、山梨酸钾）'), []);
assert.deepEqual(splitIngredientInput('柠檬酸(一水)，山梨酸钾'), ['柠檬酸', '山梨酸钾']);
assert.deepEqual(splitIngredientInput('复配增稠剂（黄原胶、卡拉胶）；食用盐'), ['黄原胶', '卡拉胶', '食用盐']);
assert.deepEqual(splitIngredientInput('烟酰胺（Niacinamide, Vitamin B3），水杨酸'), ['烟酰胺', '水杨酸']);
assert.deepEqual(splitIngredientInput('烟酰胺（尼克酰胺、维生素B3），水杨酸'), ['烟酰胺', '水杨酸']);
assert.deepEqual(splitIngredientInput('抗结剂（二氧化硅），酸度调节剂（柠檬酸）'), ['二氧化硅', '柠檬酸']);

const analysis = analyzeIngredientText('水，烟酰胺，透明质酸钠，水杨酸，香精，未知成分');
assert.equal(analysis.matchedCount, 4);
assert.deepEqual(analysis.highlights.map((item) => item.id), ['salicylic-acid', 'fragrance']);
assert.deepEqual(analysis.unknownItems, ['水', '未知成分']);
assert.match(analysis.summary, /已匹配 4 项成分/);
const cjkAliasNoteAnalysis = analyzeIngredientText('烟酰胺（尼克酰胺、维生素B3）', 'cosmetics');
assert.equal(cjkAliasNoteAnalysis.matchedCount, 1);
assert.deepEqual(cjkAliasNoteAnalysis.ingredients.map((item) => item.id), ['niacinamide']);
assert.deepEqual(cjkAliasNoteAnalysis.unknownItems, []);
assert.equal(cjkAliasNoteAnalysis.quality.coveragePercent, 100);

const foodAnalysis = analyzeIngredientText('柠檬酸，山梨酸钾，焦亚硫酸钠，未知添加剂', 'food');
assert.equal(foodAnalysis.matchedCount, 3);
assert.deepEqual(foodAnalysis.highlights.map((item) => item.id), ['potassium-sorbate', 'sodium-metabisulfite']);
assert.deepEqual(foodAnalysis.unknownItems, ['未知添加剂']);
assert.match(foodAnalysis.summary, /摄入频率、食品类别和个人情况/);
assert.doesNotMatch(foodAnalysis.summary, /肤质/);
assert.equal(foodAnalysis.quality.coveragePercent, 75);
assert.equal(foodAnalysis.analysisItems[0].confidence, 'high');
assert.equal(foodAnalysis.analysisItems[0].matchLabel, '中文名');
assert.doesNotMatch(foodAnalysis.analysisItems.map((item) => item.note).join(' '), /undefined/);
const packagedFoodAnalysis = analyzeIngredientText('配料：水，食品添加剂（柠檬酸、山梨酸钾），黄原胶0.1%，未知添加剂', 'food');
assert.equal(packagedFoodAnalysis.matchedCount, 3);
assert.deepEqual(packagedFoodAnalysis.ingredients.map((item) => item.id), ['citric-acid', 'potassium-sorbate', 'xanthan-gum']);
assert.equal(packagedFoodAnalysis.quality.totalCount, 5);
assert.equal(packagedFoodAnalysis.quality.unknownCount, 2);
assert.equal(packagedFoodAnalysis.quality.coveragePercent, 60);
assert.equal(packagedFoodAnalysis.quality.needsReview, true);
const singleWrappedFoodAnalysis = analyzeIngredientText('配料：水，食品添加剂（柠檬酸钠），山梨酸钾', 'food');
assert.deepEqual(singleWrappedFoodAnalysis.ingredients.map((item) => item.id), ['sodium-citrate', 'potassium-sorbate']);
assert.deepEqual(singleWrappedFoodAnalysis.unknownItems, ['水']);
assert.equal(singleWrappedFoodAnalysis.quality.coveragePercent, 67);
const colonLabeledFoodAnalysis = analyzeIngredientText('水，食品添加剂：柠檬酸，山梨酸钾', 'food');
assert.deepEqual(colonLabeledFoodAnalysis.ingredients.map((item) => item.id), ['citric-acid', 'potassium-sorbate']);
assert.deepEqual(colonLabeledFoodAnalysis.unknownItems, ['水']);
assert.equal(colonLabeledFoodAnalysis.quality.coveragePercent, 67);
const prefixedFoodAnalysis = analyzeIngredientText('食用柠檬酸', 'food');
assert.equal(prefixedFoodAnalysis.matchedCount, 1);
assert.equal(prefixedFoodAnalysis.ingredients[0].id, 'citric-acid');
assert.equal(prefixedFoodAnalysis.ingredients[0].matchConfidence, 'low');
assert.equal(prefixedFoodAnalysis.quality.lowConfidenceCount, 1);
const mediumConfidenceAnalysis = analyzeIngredientText('柠檬', 'food');
assert.equal(mediumConfidenceAnalysis.matchedCount, 1);
assert.equal(mediumConfidenceAnalysis.ingredients[0].id, 'citric-acid');
assert.equal(mediumConfidenceAnalysis.ingredients[0].matchConfidence, 'medium');
assert.equal(mediumConfidenceAnalysis.quality.mediumConfidenceCount, 1);
assert.equal(mediumConfidenceAnalysis.quality.needsReview, true);
const embeddedNameAnalysis = analyzeIngredientText('脱氢乙酸钠', 'food');
assert.equal(embeddedNameAnalysis.matchedCount, 0);
assert.deepEqual(embeddedNameAnalysis.unknownItems, ['脱氢乙酸钠']);
const wrappedSingleItemAnalysis = analyzeIngredientText('抗结剂（二氧化硅）', 'food');
assert.equal(wrappedSingleItemAnalysis.matchedCount, 1);
assert.equal(wrappedSingleItemAnalysis.ingredients[0].id, 'silicon-dioxide');
const expandedFoodAnalysis = analyzeIngredientText('味精，柠檬黄，山梨糖醇，未知添加剂', 'food');
assert.equal(expandedFoodAnalysis.matchedCount, 3);
assert.deepEqual(expandedFoodAnalysis.ingredients.map((item) => item.id), ['monosodium-glutamate', 'tartrazine', 'sorbitol']);
assert.deepEqual(expandedFoodAnalysis.unknownItems, ['未知添加剂']);
const secondBatchFoodAnalysis = analyzeIngredientText('安赛蜜，卡拉胶，亚硝酸钠，未知添加剂', 'food');
assert.equal(secondBatchFoodAnalysis.matchedCount, 3);
assert.deepEqual(secondBatchFoodAnalysis.ingredients.map((item) => item.id), ['acesulfame-potassium', 'carrageenan', 'sodium-nitrite']);
assert.deepEqual(secondBatchFoodAnalysis.highlights.map((item) => item.id), ['sodium-nitrite', 'acesulfame-potassium']);
assert.deepEqual(secondBatchFoodAnalysis.unknownItems, ['未知添加剂']);
const lowerRiskFoodAnalysis = analyzeIngredientText('苹果酸，二氧化硅，乳酸钙', 'food');
assert.equal(lowerRiskFoodAnalysis.matchedCount, 3);
assert.match(lowerRiskFoodAnalysis.summary, /摄入量、食品类别和产品标签/);
assert.doesNotMatch(lowerRiskFoodAnalysis.summary, /肤质/);
const emulsifierCommaAnalysis = analyzeIngredientText('单，双甘油脂肪酸酯', 'food');
assert.equal(emulsifierCommaAnalysis.matchedCount, 1);
assert.deepEqual(emulsifierCommaAnalysis.ingredients.map((item) => item.id), ['mono-and-diglycerides-fatty-acids']);
assert.deepEqual(emulsifierCommaAnalysis.unknownItems, []);

const aiRequest = buildAIAnalysisRequest('柠檬酸，山梨酸钾，未知添加剂', 'food', {
  userAllergenIds: ['soybeans'],
  consumerGroups: ['child']
});
assert.equal(aiRequest.protocolVersion, AI_ANALYSIS_PROTOCOL_VERSION);
assert.equal(aiRequest.requestType, 'ingredient-analysis');
assert.equal(aiRequest.category, 'food');
assert.equal(aiRequest.categoryLabel, '食品添加剂');
assert.equal(aiRequest.endpoint, undefined);
assert.equal(aiRequest.userContext.allergenIds[0], 'soybeans');
assert.equal(aiRequest.localAnalysis.matchedCount, 2);
assert.equal(aiRequest.localAnalysis.ingredients.some((item) => item.id === 'potassium-sorbate' && item.gbCode === 'INS 202'), true);
assert.equal(aiRequest.localAnalysis.unknownItems[0], '未知添加剂');
assert.equal(aiRequest.outputContract.schemaVersion, AI_ANALYSIS_PROTOCOL_VERSION);
assert.equal(aiRequest.safetyRules.some((rule) => /结构化 JSON/.test(rule)), true);
const aiFallback = buildAIAnalysisFallback(aiRequest);
assert.equal(aiFallback.schemaVersion, AI_ANALYSIS_PROTOCOL_VERSION);
assert.match(aiFallback.summary, /已匹配 2 项成分/);
assert.match(aiFallback.riskNarrative, /需关注/);
assert.equal(aiFallback.sections.some((section) => section.title === '数据边界'), true);
assert.equal(aiFallback.ingredientNotes.some((note) => note.id === 'potassium-sorbate'), true);
assert.equal(aiFallback.nextSteps.some((step) => /暂未收录/.test(step)), true);
const sparseAiFallback = buildAIAnalysisFallback({ localAnalysis: { matchedCount: 0 } });
assert.match(sparseAiFallback.sections.find((section) => section.title === '数据边界').body, /食品添加剂数据/);
assert.deepEqual(sparseAiFallback.ingredientNotes, []);
const validAIResponse = {
  schemaVersion: AI_ANALYSIS_PROTOCOL_VERSION,
  summary: '该配料表匹配到本地食品添加剂库中的酸度调节剂和防腐剂。',
  riskNarrative: '山梨酸钾属于需关注项，应结合摄入频率和食品类别理解。',
  sections: [
    { title: '重点关注', tone: 'watch', body: '优先核对山梨酸钾相关说明。' }
  ],
  ingredientNotes: [
    { id: 'potassium-sorbate', name: '山梨酸钾', note: '常见防腐剂，建议结合食品类别理解。', confidence: 'high' }
  ],
  allergenWarnings: [
    { item: '标签文本', allergenIds: ['soybeans'], message: '示例过敏原提示。' }
  ],
  nextSteps: ['核对包装原文。'],
  limitations: ['仅用于日常成分理解。']
};
assert.deepEqual(validateAIAnalysisResponse(validAIResponse), {
  ok: true,
  errors: [],
  value: validAIResponse
});
const invalidAIResponse = validateAIAnalysisResponse({
  schemaVersion: 999,
  summary: '',
  sections: [{ title: '坏响应', tone: 'severe', body: '' }],
  ingredientNotes: 'bad',
  allergenWarnings: [],
  nextSteps: [],
  limitations: []
});
assert.equal(invalidAIResponse.ok, false);
assert.equal(invalidAIResponse.value, null);
assert.equal(invalidAIResponse.errors.some((error) => /schemaVersion/.test(error)), true);
assert.equal(invalidAIResponse.errors.some((error) => /ingredientNotes/.test(error)), true);
const aiResult = await analyzeIngredientsByAI('烟酰胺', 'cosmetics');
assert.equal(aiResult.enabled, false);
assert.equal(aiResult.endpoint, AI_ANALYSIS_ENDPOINT_PATH);
assert.equal(aiResult.request.category, 'cosmetics');
assert.equal(aiResult.fallback.schemaVersion, AI_ANALYSIS_PROTOCOL_VERSION);
assert.match(aiResult.message, /服务端代理/);

const ocrFile = {
  name: 'ingredient-list.png',
  type: 'image/png',
  size: 4096,
  lastModified: 1710000000000
};
const ocrRequest = buildOCRRequest(ocrFile, { category: 'food' });
assert.equal(ocrRequest.protocolVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrRequest.requestType, 'ingredient-image-ocr');
assert.equal(ocrRequest.endpoint, OCR_ENDPOINT_PATH);
assert.equal(ocrRequest.validation.ok, true);
assert.equal(ocrRequest.image.name, 'ingredient-list.png');
assert.equal(ocrRequest.image.sizeLabel, '4 KB');
assert.equal(ocrRequest.processingHints.requireUserCorrectionBeforeAnalysis, true);
assert.equal(ocrRequest.outputContract.schemaVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrRequest.safetyRules.some((rule) => /可编辑文本区/.test(rule)), true);
const ocrFallback = buildOCRFallback(ocrRequest);
assert.equal(ocrFallback.schemaVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrFallback.text, '');
assert.equal(ocrFallback.confidence, 0);
assert.equal(ocrFallback.warnings.some((warning) => /未连接服务端 OCR 代理/.test(warning)), true);
assert.equal(ocrFallback.nextSteps.some((step) => /校正文本区/.test(step)), true);
const validOCRResponse = {
  schemaVersion: OCR_PROTOCOL_VERSION,
  text: '水，柠檬酸，山梨酸钾',
  confidence: 0.88,
  language: 'zh-CN',
  candidates: [
    { text: '水，柠檬酸，山梨酸钾', confidence: 0.88, source: 'line-1' }
  ],
  warnings: ['示例低置信区域'],
  nextSteps: ['请核对包装原文后再分析。']
};
assert.deepEqual(validateOCRResponse(validOCRResponse), {
  ok: true,
  errors: [],
  value: validOCRResponse
});
const invalidOCRResponse = validateOCRResponse({
  schemaVersion: 999,
  text: 123,
  confidence: 2,
  language: '',
  candidates: [{ text: '', confidence: -1 }],
  warnings: 'bad',
  nextSteps: []
});
assert.equal(invalidOCRResponse.ok, false);
assert.equal(invalidOCRResponse.value, null);
assert.equal(invalidOCRResponse.errors.some((error) => /confidence/.test(error)), true);
assert.equal(invalidOCRResponse.errors.some((error) => /warnings/.test(error)), true);
const emptyOcrResult = await extractIngredientsFromImage(null);
assert.equal(emptyOcrResult.enabled, false);
assert.equal(emptyOcrResult.text, '');
assert.match(emptyOcrResult.message, /请先选择/);
const invalidOcrResult = await extractIngredientsFromImage({ name: 'bad.svg', type: 'image/svg+xml', size: 100 });
assert.equal(invalidOcrResult.validation.reason, 'type');
const ocrResult = await extractIngredientsFromImage(ocrFile, { category: 'food' });
assert.equal(ocrResult.enabled, false);
assert.equal(ocrResult.text, '');
assert.equal(ocrResult.endpoint, OCR_ENDPOINT_PATH);
assert.equal(ocrResult.request.image.name, 'ingredient-list.png');
assert.equal(ocrResult.fallback.schemaVersion, OCR_PROTOCOL_VERSION);
assert.match(ocrResult.message, /图片识别接口已预留/);

assert.equal(standardAllergenTypes.length, 14);
assert.deepEqual(validateFoodAdditives(), []);

const originalWindow = globalThis.window;
globalThis.window = {
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('QuotaExceededError');
    }
  }
};
writeJson('compcheck:test-quota-fallback', ['ok']);
assert.deepEqual(readJson('compcheck:test-quota-fallback', []), ['ok']);
globalThis.window = originalWindow;

writeJson('compcheck:favorites', ['niacinamide']);
assert.deepEqual(getFavoriteItems(), [{ id: 'niacinamide', category: 'cosmetics' }]);
assert.equal(getFavoriteIngredients('cosmetics')[0].id, 'niacinamide');
assert.deepEqual(getFavoriteIngredients('food'), []);
toggleFavorite('citric-acid', 'food');
assert.deepEqual(getFavoriteItems(), [
  { id: 'citric-acid', category: 'food' },
  { id: 'niacinamide', category: 'cosmetics' }
]);

writeJson('compcheck:history', []);
writeJson('compcheck:analysis-reports', []);
resetOnboarding();
assert.equal(shouldShowOnboardingPrompt(), true);
const onboardingHtml = renderOnboardingPage('food');
assert.match(onboardingHtml, /建立本机成分档案/);
assert.match(onboardingHtml, /data-onboarding-form/);
assert.match(onboardingHtml, /name="category" value="food" checked/);
assert.match(onboardingHtml, /name="allergens" value="milk"/);
assert.match(onboardingHtml, /name="historyRecordingEnabled" checked/);
assert.match(onboardingHtml, /name="acceptedBoundary"/);
assert.match(onboardingHtml, /data-skip-onboarding/);
assert.match(renderOnboardingPage('cosmetics'), /name="category" value="cosmetics" checked/);
const homeHtmlWithOnboardingPrompt = renderHomePage('food');
assert.match(homeHtmlWithOnboardingPrompt, /data-onboarding-prompt/);
assert.match(homeHtmlWithOnboardingPrompt, /href="#\/food\/onboarding"/);
const completedOnboarding = completeOnboarding({
  preferredCategory: 'food',
  allergenIds: ['milk', 'soybeans', 'milk'],
  historyRecordingEnabled: false,
  acceptedBoundary: true
});
assert.equal(completedOnboarding.status, 'completed');
assert.equal(completedOnboarding.allergenCount, 2);
assert.equal(completedOnboarding.historyRecordingEnabled, false);
assert.equal(completedOnboarding.acceptedBoundary, true);
assert.equal(shouldShowOnboardingPrompt(), false);
assert.deepEqual(getUserAllergens(), ['milk', 'soybeans']);
assert.equal(isHistoryRecordingEnabled(), false);
assert.doesNotMatch(renderHomePage('food'), /data-onboarding-prompt/);
assert.equal(getOnboardingState().preferredCategory, 'food');
const skippedOnboarding = skipOnboarding({ preferredCategory: 'cosmetics' });
assert.equal(skippedOnboarding.status, 'skipped');
assert.equal(skippedOnboarding.preferredCategory, 'cosmetics');
assert.equal(shouldShowOnboardingPrompt(), false);
assert.equal(`#${categoryPath(getOnboardingState().preferredCategory)}`, '#/cosmetics');
resetOnboarding();
assert.equal(getOnboardingState().status, 'pending');
assert.equal(shouldShowOnboardingPrompt(), true);
setUserAllergens([]);
setHistoryRecordingEnabled(true);
addHistory('烟酰胺');
addHistory('BHA');
assert.deepEqual(getHistory(), ['BHA', '烟酰胺']);
assert.deepEqual(removeHistory('BHA'), ['烟酰胺']);
assert.deepEqual(getHistory(), ['烟酰胺']);
const homeHtmlWithHistory = renderHomePage('cosmetics');
assert.match(homeHtmlWithHistory, /data-delete-history="烟酰胺"/);
assert.match(homeHtmlWithHistory, /aria-label="删除查询记录：烟酰胺"/);
assert.doesNotMatch(homeHtmlWithHistory, /data-delete-history="BHA"/);
assert.match(homeHtmlWithHistory, /分析报告/);
assert.match(homeHtmlWithHistory, /data-suggestion-category="cosmetics"/);
assert.match(homeHtmlWithHistory, /data-search-suggestions/);
assert.equal(setHistoryRecordingEnabled(false), false);
assert.equal(isHistoryRecordingEnabled(), false);
assert.deepEqual(addHistory('不会记录'), ['烟酰胺']);
const homeHtmlWithHistoryDisabled = renderHomePage('cosmetics');
assert.match(homeHtmlWithHistoryDisabled, /已关闭自动记录查询历史/);
assert.equal(setHistoryRecordingEnabled(true), true);

const originalUserAllergens = getUserAllergens();
assert.deepEqual(setUserAllergens(['milk', 'milk', '', 'soybeans']), ['milk', 'soybeans']);
assert.deepEqual(getUserAllergens(), ['milk', 'soybeans']);
const settingsHtml = renderSettingsPage();
assert.match(settingsHtml, /过敏原档案/);
assert.match(settingsHtml, /2 项已关注/);
assert.match(settingsHtml, /value="milk" checked/);
assert.match(settingsHtml, /value="soybeans" checked/);
assert.match(settingsHtml, /value="peanuts"/);
assert.match(settingsHtml, /会员中心/);
assert.match(settingsHtml, /href="#\/food\/membership"/);
assert.match(settingsHtml, /href="#\/food\/support"/);
assert.match(settingsHtml, /隐私与条款/);
assert.match(settingsHtml, /href="#\/food\/legal"/);
assert.match(settingsHtml, /数据与隐私/);
assert.match(settingsHtml, /data-export-local-data/);
assert.match(settingsHtml, /data-import-local-data-input/);
assert.match(settingsHtml, /data-import-local-data/);
assert.match(settingsHtml, /accept="application\/json,.json"/);
assert.match(settingsHtml, /导入并覆盖/);
assert.match(settingsHtml, /data-clear-local-data/);
assert.match(settingsHtml, /data-local-data-count="favorites">2</);
assert.match(settingsHtml, /data-local-data-count="compareItems">0</);
assert.match(settingsHtml, /data-local-data-count="history">1</);
assert.match(settingsHtml, /data-local-data-count="supportRequests">0</);
assert.match(settingsHtml, /data-local-data-count="allergens">2</);
assert.match(settingsHtml, /data-history-recording-toggle checked/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/membership"/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/support"/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/legal"/);
const membershipOverview = getMembershipOverview('food');
assert.equal(membershipOverview.currentPlan.id, 'free');
assert.equal(membershipOverview.proPlan.id, 'pro');
assert.equal(membershipOverview.entitlement.purchaseEnabled, false);
assert.equal(membershipOverview.entitlement.restoreEnabled, false);
assert.equal(membershipOverview.usage.find((item) => item.key === 'reports').value, '0 / 20');
assert.equal(membershipOverview.usage.find((item) => item.key === 'history').value, '1 / 8');
assert.match(getMembershipActionMessage('restore'), /恢复购买尚未开放/);
assert.match(getMembershipActionMessage('restore'), /服务端订阅状态同步/);
const membershipHtml = renderMembershipPage('food');
assert.match(membershipHtml, /会员中心/);
assert.match(membershipHtml, /当前套餐/);
assert.match(membershipHtml, /本机用量/);
assert.match(membershipHtml, /CompCheck Pro/);
assert.match(membershipHtml, /data-membership-action="purchase"/);
assert.match(membershipHtml, /data-membership-action="restore"/);
assert.match(membershipHtml, /href="#\/food\/support"/);
assert.match(membershipHtml, /href="#\/food\/legal\/subscription"/);
assert.match(membershipHtml, /data-membership-status/);
assert.match(membershipHtml, /权益边界/);
assert.doesNotMatch(membershipHtml, /购买成功|已订阅|续费成功/);
const routedMembershipHtml = renderRoute(resolveRoute('#/food/membership'));
assert.match(routedMembershipHtml, /真实权益以后必须由服务端和商店票据校验共同决定/);
const invalidSupportRequest = saveSupportRequest({ subject: '', message: '缺少标题', acceptedBoundary: true }, 'food');
assert.equal(invalidSupportRequest.ok, false);
assert.match(invalidSupportRequest.message, /标题/);
const unacceptedSupportRequest = saveSupportRequest({ topic: 'data-correction', subject: '柠檬酸来源', message: '需要核对来源条款。' }, 'food');
assert.equal(unacceptedSupportRequest.reason, 'boundary');
const supportRequestResult = saveSupportRequest({
  topic: 'data-correction',
  subject: '柠檬酸来源需要核对',
  message: '详情页来源引用显示为草稿，希望后续核对 GB 2760 条款。',
  contact: 'qa@example.com',
  acceptedBoundary: true
}, 'food');
assert.equal(supportRequestResult.ok, true);
assert.equal(getSupportRequests('food').length, 1);
assert.equal(getSupportRequests('cosmetics').length, 0);
const supportRequest = getSupportRequests()[0];
assert.equal(supportRequest.topic, 'data-correction');
assert.equal(supportRequest.category, 'food');
assert.match(buildSupportRequestMarkdown(supportRequest), /# 柠檬酸来源需要核对/);
assert.match(buildSupportRequestMarkdown(supportRequest), /类型：数据纠错/);
assert.match(buildSupportRequestMarkdown(supportRequest), /联系方式：qa@example.com/);
const supportPrefill = buildSupportPrefillFromParams(new URLSearchParams('topic=data-correction&subject=%E6%9F%A0%E6%AA%AC%E9%85%B8%E6%9D%A5%E6%BA%90&message=%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9&contact=qa%40example.com'));
assert.deepEqual(supportPrefill, {
  topic: 'data-correction',
  subject: '柠檬酸来源',
  message: '需要核对',
  contact: 'qa@example.com',
  hasPrefill: true
});
assert.equal(
  buildSupportPrefillUrl('food', { topic: 'data-correction', subject: '柠檬酸来源', message: '需要核对' }),
  '#/food/support?topic=data-correction&subject=%E6%9F%A0%E6%AA%AC%E9%85%B8%E6%9D%A5%E6%BA%90&message=%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9'
);
assert.equal(
  buildSupportPrefillUrl('food', { topic: 'bug-feedback', subject: '页面显示异常', message: '按钮没有响应' }),
  '#/food/support?topic=bug-feedback&subject=%E9%A1%B5%E9%9D%A2%E6%98%BE%E7%A4%BA%E5%BC%82%E5%B8%B8&message=%E6%8C%89%E9%92%AE%E6%B2%A1%E6%9C%89%E5%93%8D%E5%BA%94'
);
const legalIndexHtml = renderLegalPage('food');
assert.match(legalIndexHtml, /隐私与条款/);
assert.match(legalIndexHtml, /隐私政策草案/);
assert.match(legalIndexHtml, /服务条款草案/);
assert.match(legalIndexHtml, /订阅说明草案/);
assert.match(legalIndexHtml, /数据安全说明草案/);
assert.match(legalIndexHtml, /href="#\/food\/legal\/privacy"/);
const legalDetailHtml = renderRoute(resolveRoute('#/food/legal/privacy'));
assert.match(legalDetailHtml, /隐私政策草案/);
assert.match(legalDetailHtml, /当前数据处理/);
assert.match(legalDetailHtml, /上线前需复核/);
assert.match(legalDetailHtml, /href="#\/food\/support"/);
assert.match(legalDetailHtml, /草案声明/);
const supportHtml = renderSupportPage('food');
assert.match(supportHtml, /支持中心/);
assert.match(supportHtml, /data-support-form/);
assert.match(supportHtml, /value="data-correction"/);
assert.match(supportHtml, /data-copy-support-request=/);
assert.match(supportHtml, /data-delete-support-request=/);
assert.match(supportHtml, /data-clear-support-requests/);
assert.match(supportHtml, /href="#\/food\/legal\/privacy"/);
assert.match(renderRoute(resolveRoute('#/food/support')), /支持记录只保存在本机浏览器/);
const supportPrefillHtml = renderRoute(resolveRoute('#/food/support?topic=data-correction&subject=%E6%9F%A0%E6%AA%AC%E9%85%B8%E6%9D%A5%E6%BA%90&message=%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9'));
assert.match(supportPrefillHtml, /data-support-prefill/);
assert.match(supportPrefillHtml, /value="data-correction" selected/);
assert.match(supportPrefillHtml, /value="柠檬酸来源"/);
assert.match(supportPrefillHtml, />需要核对<\/textarea>/);
const bugFeedbackPrefillHtml = renderRoute(resolveRoute('#/food/support?topic=bug-feedback&subject=%E9%A1%B5%E9%9D%A2%E6%98%BE%E7%A4%BA%E5%BC%82%E5%B8%B8&message=%E6%8C%89%E9%92%AE%E6%B2%A1%E6%9C%89%E5%93%8D%E5%BA%94'));
assert.match(bugFeedbackPrefillHtml, /value="bug-feedback" selected/);
assert.match(bugFeedbackPrefillHtml, /value="页面显示异常"/);
assert.equal(deleteSupportRequest(supportRequest.id).length, 0);
assert.equal(getSupportRequests().length, 0);
saveSupportRequest({
  topic: 'subscription',
  subject: '恢复购买入口',
  message: '希望会员中心后续可以恢复购买。',
  contact: '',
  acceptedBoundary: true
}, 'food');
assert.equal(getSupportRequests().length, 1);
assert.equal(clearSupportRequests('food').length, 0);
assert.deepEqual(getCompareItems('food'), []);
assert.match(renderComparePage('food'), /还没有加入对比的成分/);
assert.equal(addCompareIngredient('citric-acid', 'food').ok, true);
assert.equal(addCompareIngredient('citric-acid', 'food').reason, 'exists');
assert.equal(addCompareIngredient('sodium-benzoate', 'food').ok, true);
assert.equal(addCompareIngredient('niacinamide', 'cosmetics').ok, true);
assert.equal(getCompareItems('food').length, 2);
assert.equal(getCompareIngredients('food')[0].id, 'citric-acid');
const compareOverview = getCompareOverview('food');
assert.equal(compareOverview.count, 2);
assert.equal(compareOverview.rows.some((row) => row.key === 'gbStatus'), true);
const compareSharePayload = buildCompareSharePayload(compareOverview, 'https://example.com/');
assert.equal(compareSharePayload.url, 'https://example.com/#/food/compare');
assert.match(compareSharePayload.text, /柠檬酸/);
assert.match(compareSharePayload.text, /苯甲酸钠/);
const compareHtml = renderComparePage('food');
assert.match(compareHtml, /成分对比/);
assert.match(compareHtml, /柠檬酸/);
assert.match(compareHtml, /苯甲酸钠/);
assert.match(compareHtml, /横向对比/);
assert.match(compareHtml, /data-share-compare/);
assert.match(compareHtml, /data-compare-remove="citric-acid"/);
assert.match(compareHtml, /清空对比/);
assert.match(renderRoute(resolveRoute('#/food/search?q=E330')), /data-compare-add="citric-acid"/);
const detailWithShareHtml = renderRoute(resolveRoute('#/food/ingredient/citric-acid'));
assert.match(detailWithShareHtml, /已加入对比/);
assert.match(detailWithShareHtml, /data-share-ingredient="citric-acid"/);
assert.match(detailWithShareHtml, /data-share-status/);
assert.equal(addCompareIngredient('potassium-sorbate', 'food').ok, true);
assert.equal(addCompareIngredient('lecithins', 'food').ok, true);
assert.equal(addCompareIngredient('acesulfame-potassium', 'food').reason, 'full');
assert.equal(getCompareItems('food').length, 4);
assert.equal(removeCompareIngredient('lecithins', 'food').ok, true);
assert.equal(getCompareItems('food').length, 3);
setHistoryRecordingEnabled(false);
const settingsHtmlWithHistoryDisabled = renderSettingsPage();
assert.match(settingsHtmlWithHistoryDisabled, /data-history-recording-toggle/);
assert.doesNotMatch(settingsHtmlWithHistoryDisabled, /data-history-recording-toggle checked/);
setHistoryRecordingEnabled(true);
saveScanDraft('柠檬酸，山梨酸钾', 'food');
const localSupportRequest = saveSupportRequest({
  topic: 'scan-analysis',
  subject: '扫描草稿反馈',
  message: '扫描页草稿恢复后需要确认分析入口是否正常。',
  contact: '',
  acceptedBoundary: true
}, 'food');
assert.equal(localSupportRequest.ok, true);
const localDataSummary = getLocalDataSummary();
assert.equal(localDataSummary.favorites, 2);
assert.equal(localDataSummary.compareItems, 4);
assert.equal(localDataSummary.history, 1);
assert.equal(localDataSummary.allergens, 2);
assert.equal(localDataSummary.supportRequests, 1);
assert.equal(localDataSummary.scanDrafts, 1);
assert.equal(localDataSummary.totalItems, 11);
const localDataSnapshot = getLocalDataSnapshot();
assert.equal(localDataSnapshot.schemaVersion, 1);
assert.equal(localDataSnapshot.preferences.historyRecordingEnabled, true);
assert.equal(localDataSnapshot.favorites.some((item) => item.id === 'citric-acid' && item.category === 'food'), true);
assert.equal(localDataSnapshot.compareItems.some((item) => item.id === 'citric-acid' && item.category === 'food'), true);
assert.equal(localDataSnapshot.supportRequests.some((item) => item.subject === '扫描草稿反馈'), true);
assert.equal(localDataSnapshot.history[0], '烟酰胺');
assert.equal(localDataSnapshot.scanDrafts.food, '柠檬酸，山梨酸钾');
setHistoryRecordingEnabled(false);
assert.deepEqual(clearLocalUserData(), {
  favorites: 0,
  compareItems: 0,
  history: 0,
  allergens: 0,
  reports: 0,
  supportRequests: 0,
  scanDrafts: 0,
  totalItems: 0
});
assert.deepEqual(getFavoriteItems(), []);
assert.deepEqual(getCompareItems(), []);
assert.deepEqual(getHistory(), []);
assert.deepEqual(getUserAllergens(), []);
assert.deepEqual(getSupportRequests(), []);
assert.equal(getScanDraft('food'), '');
assert.equal(isHistoryRecordingEnabled(), false);
assert.deepEqual(addHistory('清空后仍不记录'), []);
const disabledHistorySnapshot = {
  ...localDataSnapshot,
  preferences: {
    historyRecordingEnabled: false
  }
};
const disabledHistoryImport = importLocalDataSnapshot(disabledHistorySnapshot);
assert.equal(disabledHistoryImport.ok, true);
assert.equal(isHistoryRecordingEnabled(), false);
assert.deepEqual(addHistory('仍不记录'), localDataSnapshot.history);
setHistoryRecordingEnabled(true);
const importResult = importLocalDataSnapshot(localDataSnapshot);
assert.equal(importResult.ok, true);
assert.equal(isHistoryRecordingEnabled(), true);
assert.equal(importResult.summary.totalItems, 11);
assert.deepEqual(getFavoriteItems(), localDataSnapshot.favorites);
assert.deepEqual(getCompareItems(), localDataSnapshot.compareItems);
assert.deepEqual(getHistory(), localDataSnapshot.history);
assert.deepEqual(getUserAllergens(), localDataSnapshot.allergens);
assert.deepEqual(getSupportRequests(), localDataSnapshot.supportRequests);
assert.equal(getScanDraft('food'), '柠檬酸，山梨酸钾');
const overLimitCompareImport = importLocalDataSnapshot({
  ...localDataSnapshot,
  compareItems: [
    { id: 'citric-acid', category: 'food' },
    { id: 'sodium-benzoate', category: 'food' },
    { id: 'potassium-sorbate', category: 'food' },
    { id: 'lecithins', category: 'food' },
    { id: 'acesulfame-potassium', category: 'food' },
    { id: 'niacinamide', category: 'cosmetics' },
    { id: 'hyaluronic-acid', category: 'cosmetics' },
    { id: 'salicylic-acid', category: 'cosmetics' },
    { id: 'retinol', category: 'cosmetics' },
    { id: 'fragrance', category: 'cosmetics' }
  ]
});
assert.equal(overLimitCompareImport.ok, true);
assert.equal(getCompareItems('food').length, 4);
assert.equal(getCompareItems('cosmetics').length, 4);
assert.equal(getCompareItems('food').some((item) => item.id === 'acesulfame-potassium'), false);
assert.equal(getCompareItems('cosmetics').some((item) => item.id === 'fragrance'), false);
const staleCompareImport = importLocalDataSnapshot({
  ...localDataSnapshot,
  compareItems: [
    { id: 'missing-food-1', category: 'food' },
    { id: 'missing-food-2', category: 'food' },
    { id: 'missing-food-3', category: 'food' },
    { id: 'missing-food-4', category: 'food' },
    { id: 'citric-acid', category: 'food' }
  ]
});
assert.equal(staleCompareImport.ok, true);
assert.deepEqual(getCompareItems('food'), [{ id: 'citric-acid', category: 'food' }]);
assert.equal(addCompareIngredient('sodium-benzoate', 'food').ok, true);
const unsupportedCategoryCompareImport = importLocalDataSnapshot({
  ...localDataSnapshot,
  compareItems: [
    { id: 'niacinamide', category: 'cosmetic' },
    { id: 'niacinamide', category: 'cosmetics' }
  ]
});
assert.equal(unsupportedCategoryCompareImport.ok, true);
assert.deepEqual(getCompareItems(), [{ id: 'niacinamide', category: 'cosmetics' }]);
assert.deepEqual(getCompareItems('cosmetics'), [{ id: 'niacinamide', category: 'cosmetics' }]);
assert.deepEqual(getCompareItems('cosmetic'), []);
assert.equal(addCompareIngredient('niacinamide', 'cosmetic').ok, false);
writeJson('compcheck:compare-items', [
  { id: 'stale-food-1', category: 'food' },
  { id: 'stale-food-2', category: 'food' },
  { id: 'stale-food-3', category: 'food' },
  { id: 'stale-food-4', category: 'food' },
  { id: 'niacinamide', category: 'cosmetic' }
]);
assert.deepEqual(getCompareItems('food'), []);
assert.equal(getCompareItems().some((item) => item.category === 'cosmetic'), false);
assert.equal(addCompareIngredient('citric-acid', 'food').ok, true);
assert.deepEqual(getCompareItems('food'), [{ id: 'citric-acid', category: 'food' }]);
const invalidImportResult = importLocalDataSnapshot({ schemaVersion: 999, history: ['不应覆盖'] });
assert.equal(invalidImportResult.ok, false);
assert.deepEqual(getHistory(), localDataSnapshot.history);
assert.match(invalidImportResult.message, /仅支持 schemaVersion/);
assert.equal(importLocalDataSnapshot(null).ok, false);
const maliciousReportImport = importLocalDataSnapshot({
  schemaVersion: 1,
  favorites: [],
  history: [],
  preferences: { historyRecordingEnabled: true },
  allergens: [],
  analysisReports: [{
    id: 'report-bad" onclick="alert(1)',
    category: 'food',
    title: '恶意报告 ID',
    input: '柠檬酸',
    createdAt: '2026-06-11T00:00:00.000Z',
    matchedCount: 1,
    summary: '测试报告',
    matchedIngredientIds: ['citric-acid'],
    highlightIngredientIds: [],
    unknownItems: [],
    riskCounts: { low: 1, medium: 0, high: 0, unknown: 0 },
    userAllergenIds: [],
    ingredientAllergenHits: [],
    textAllergenHits: [],
    schemaVersion: 2
  }],
  scanDrafts: {}
});
assert.equal(maliciousReportImport.ok, true);
const importedReportWithSafeId = getAnalysisReports('food')[0];
assert.match(importedReportWithSafeId.id, /^[a-z0-9][a-z0-9_-]{0,80}$/i);
assert.doesNotMatch(importedReportWithSafeId.id, /["'<>\s]/);
assert.doesNotMatch(renderRoute(resolveRoute('#/food/reports')), /onclick=/);
clearLocalUserData();
const emptyFavoritesHtml = renderRoute(resolveRoute('#/food/favorites'));
assert.match(emptyFavoritesHtml, /data-empty-favorites/);
assert.match(emptyFavoritesHtml, /暂无收藏，去搜索成分并收藏/);
assert.match(emptyFavoritesHtml, /href="#\/food\/search"/);
toggleFavorite('citric-acid', 'food');
toggleFavorite('niacinamide', 'cosmetics');
addHistory('烟酰胺');
setUserAllergens(['milk', 'soybeans']);

const analyzeHtmlWithAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithAllergens, /您当前关注的过敏原档案：/);
assert.match(analyzeHtmlWithAllergens, /data-save-report/);
assert.match(analyzeHtmlWithAllergens, /查看历史报告/);
assert.match(analyzeHtmlWithAllergens, /AI 辅助分析 \/ 本地降级/);
assert.match(analyzeHtmlWithAllergens, /结构化分析协议已就绪/);
assert.match(analyzeHtmlWithAllergens, /协议 v1/);
assert.match(analyzeHtmlWithAllergens, /endpoint：\/api\/ai\/analyze-ingredients/);
assert.match(analyzeHtmlWithAllergens, /解析质量/);
assert.match(analyzeHtmlWithAllergens, /本地匹配覆盖/);
assert.match(analyzeHtmlWithAllergens, /需核对/);
assert.match(analyzeHtmlWithAllergens, /中文名匹配/);
assert.match(analyzeHtmlWithAllergens, /本地库匹配/);
assert.match(analyzeHtmlWithAllergens, /数据边界/);
assert.match(analyzeHtmlWithAllergens, /风险叙述/);
assert.match(analyzeHtmlWithAllergens, /成分笔记/);
assert.match(analyzeHtmlWithAllergens, /下一步/);
assert.match(analyzeHtmlWithAllergens, /使用边界/);
assert.match(analyzeHtmlWithAllergens, /乳及乳制品、大豆/);
assert.match(analyzeHtmlWithAllergens, /发现过敏原成分/);
const mediumConfidenceAnalyzeHtml = renderAnalyzePage('柠檬', 'food');
assert.match(mediumConfidenceAnalyzeHtml, /中等置信/);
assert.match(mediumConfidenceAnalyzeHtml, /需核对/);
assert.match(mediumConfidenceAnalyzeHtml, /请优先核对中\/低置信匹配和暂未收录条目。/);
assert.doesNotMatch(mediumConfidenceAnalyzeHtml, /匹配稳定/);
assert.match(analyzeHtmlWithAllergens, /过敏原：大豆/);
assert.match(analyzeHtmlWithAllergens, /全脂奶粉/);
assert.match(analyzeHtmlWithAllergens, /过敏原：乳及乳制品/);
assert.match(analyzeHtmlWithAllergens, /普通食品原料或标签文本（非添加剂匹配）/);
assert.match(analyzeHtmlWithAllergens, /不作为医疗、健康或诊断建议/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /遵医嘱/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/lecithins"/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/sodium-metabisulfite"/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /您尚未设置关注的过敏原/);
setUserAllergens([]);
const analyzeHtmlWithoutAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithoutAllergens, /您尚未设置关注的过敏原/);
assert.doesNotMatch(analyzeHtmlWithoutAllergens, /发现过敏原成分/);
const emptyAnalyzeHtml = renderAnalyzePage('', 'food');
assert.match(emptyAnalyzeHtml, /data-analyze-status/);
assert.doesNotMatch(emptyAnalyzeHtml, /data-save-report/);
assert.doesNotMatch(emptyAnalyzeHtml, /AI 辅助分析/);
setUserAllergens(originalUserAllergens);

writeJson('compcheck:analysis-reports', []);
setUserAllergens(['milk', 'soybeans']);
const reportDraft = createAnalysisReport(SAMPLES['food-2'], 'food');
assert.equal(reportDraft.category, 'food');
assert.equal(reportDraft.schemaVersion, 2);
assert.equal(reportDraft.matchedIngredientIds.includes('lecithins'), true);
assert.equal(reportDraft.ingredientAllergenHits.some((hit) => hit.id === 'lecithins' && hit.allergenIds.includes('soybeans')), true);
assert.equal(reportDraft.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenIds.includes('milk')), true);
assert.equal(reportDraft.insights.some((insight) => insight.key === 'risk' && insight.title === '风险分布'), true);
assert.equal(reportDraft.insights.some((insight) => insight.key === 'coverage' && /食品添加剂库仍处于草稿审核阶段/.test(insight.summary)), true);
const savedReport = saveAnalysisReport(SAMPLES['food-2'], 'food');
assert.equal(getAnalysisReports('food').length, 1);
assert.equal(getAnalysisReportById(savedReport.id).id, savedReport.id);
const reportsHtml = renderRoute(resolveRoute('#/food/reports'));
assert.match(reportsHtml, /分析报告/);
assert.match(reportsHtml, /data-report-search-form/);
assert.match(reportsHtml, /data-delete-report=/);
assert.match(reportsHtml, /重新分析/);
const filteredReportsHtml = renderRoute(resolveRoute('#/food/reports?q=%E5%8D%B5%E7%A3%B7%E8%84%82'));
assert.match(filteredReportsHtml, /value="卵磷脂"/);
assert.match(filteredReportsHtml, /1 \/ 1 份/);
assert.match(filteredReportsHtml, /data-delete-report=/);
const allergenFilteredReportsHtml = renderRoute(resolveRoute('#/food/reports?q=%E4%B9%B3%E5%8F%8A%E4%B9%B3%E5%88%B6%E5%93%81'));
assert.match(allergenFilteredReportsHtml, /value="乳及乳制品"/);
assert.match(allergenFilteredReportsHtml, /1 \/ 1 份/);
assert.match(allergenFilteredReportsHtml, /data-delete-report=/);
const emptyFilteredReportsHtml = renderRoute(resolveRoute('#/food/reports?q=%E4%B8%8D%E5%AD%98%E5%9C%A8%E6%8A%A5%E5%91%8A'));
assert.match(emptyFilteredReportsHtml, /没有找到匹配的本地报告/);
assert.doesNotMatch(emptyFilteredReportsHtml, /data-delete-report=/);
const reportDetailHtml = renderRoute(resolveRoute(`#/food/reports/${savedReport.id}`));
assert.match(reportDetailHtml, /原始成分表/);
assert.match(reportDetailHtml, /导出报告/);
assert.match(reportDetailHtml, /data-report-markdown/);
assert.match(reportDetailHtml, /data-copy-report=/);
assert.match(reportDetailHtml, /data-share-report=/);
assert.match(reportDetailHtml, /data-download-report="markdown"/);
assert.match(reportDetailHtml, /data-download-report="json"/);
assert.match(reportDetailHtml, /报告解读/);
assert.match(reportDetailHtml, /风险分布/);
assert.match(reportDetailHtml, /数据边界/);
assert.match(reportDetailHtml, /下一步建议/);
assert.match(reportDetailHtml, /数据来源与审核状态/);
assert.match(reportDetailHtml, /草稿数据/);
assert.match(reportDetailHtml, /食品安全国家标准 食品添加剂使用标准/);
assert.match(reportDetailHtml, /覆盖成分：/);
assert.match(reportDetailHtml, /保存时发现过敏原/);
assert.match(reportDetailHtml, /全脂奶粉/);
assert.match(reportDetailHtml, /href="#\/food\/analyze\?text=/);
const reportMarkdown = buildReportMarkdown(savedReport);
assert.match(reportMarkdown, /^# /);
assert.match(reportMarkdown, /## 报告解读/);
assert.match(reportMarkdown, /### 风险分布/);
assert.match(reportMarkdown, /## 原始成分表/);
assert.match(reportMarkdown, /## 已匹配成分/);
assert.match(reportMarkdown, /## 数据来源与审核状态/);
assert.match(reportMarkdown, /草稿（未审核）：/);
assert.match(reportMarkdown, /### 来源引用/);
assert.match(reportMarkdown, /卵磷脂/);
assert.match(reportMarkdown, /过敏原：大豆/);
assert.match(reportMarkdown, /全脂奶粉/);
const reportSharePayload = buildReportSharePayload(savedReport, 'https://example.com/app');
assert.equal(reportSharePayload.url, `https://example.com/app#/food/analyze?text=${encodeURIComponent(savedReport.input)}`);
assert.match(reportSharePayload.text, /食品添加剂分析报告/);
assert.match(reportSharePayload.text, /已匹配：/);
assert.match(reportMarkdown, /不提供医疗诊断或治疗建议/);
const exportPayload = buildReportExportPayload(savedReport);
assert.equal(exportPayload.report.id, savedReport.id);
assert.equal(exportPayload.report.categoryLabel, '食品添加剂');
assert.equal(exportPayload.report.insights.some((insight) => insight.key === 'next-steps'), true);
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'lecithins'), true);
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'lecithins' && item.reviewStatusLabel === '草稿（未审核）'), true);
assert.equal(exportPayload.reviewStatusSummary.draft > 0, true);
assert.equal(exportPayload.sourceReferences.some((source) => source.title === '食品安全国家标准 食品添加剂使用标准' && source.ingredientNames.includes('卵磷脂')), true);
assert.equal(exportPayload.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenNames === '乳及乳制品'), true);
assert.match(buildReportFileName(savedReport, 'md'), /^\d{8}-.+\.md$/);
assert.match(buildReportFileName({ ...savedReport, title: 'A/B:C*D?E"F<G>H|I' }, 'json'), /^\d{8}-ABCDEFGHI\.json$/);
assert.deepEqual(deleteAnalysisReport(savedReport.id), []);
assert.equal(getAnalysisReportById(savedReport.id), null);
writeJson('compcheck:analysis-reports', [{
  id: 'legacy-report',
  category: 'food',
  title: '旧版报告',
  input: '柠檬酸，未知添加剂',
  createdAt: '2026-06-10T00:00:00.000Z',
  matchedCount: 1,
  summary: '旧版报告摘要',
  matchedIngredientIds: ['citric-acid'],
  highlightIngredientIds: [],
  unknownItems: ['未知添加剂'],
  riskCounts: { low: 1, medium: 0, high: 0, unknown: 0 },
  userAllergenIds: [],
  ingredientAllergenHits: [],
  textAllergenHits: [],
  schemaVersion: 1
}]);
const legacyReport = getAnalysisReportById('legacy-report');
assert.equal(legacyReport.schemaVersion, 1);
assert.equal(legacyReport.insights.length, 4);
assert.equal(legacyReport.insights.some((insight) => insight.key === 'coverage' && insight.tone === 'watch'), true);
writeJson('compcheck:analysis-reports', []);
saveAnalysisReport(SAMPLES['food-1'], 'food');
saveAnalysisReport(SAMPLES['cosmetic-1'], 'cosmetics');
clearAnalysisReports('food');
assert.equal(getAnalysisReports('food').length, 0);
assert.equal(getAnalysisReports('cosmetics').length, 1);
writeJson('compcheck:analysis-reports', []);
for (let index = 0; index < 20; index += 1) {
  saveAnalysisReport(`${SAMPLES['food-1']}，批次${index}`, 'food');
}
assert.equal(getAnalysisReports('food').length, 20);
saveAnalysisReport(SAMPLES['cosmetic-1'], 'cosmetics');
assert.equal(getAnalysisReports('food').length, 20);
assert.equal(getAnalysisReports('cosmetics').length, 1);
saveAnalysisReport(`${SAMPLES['food-3']}，额外食品报告`, 'food');
assert.equal(getAnalysisReports('food').length, 20);
assert.equal(getAnalysisReports('cosmetics').length, 1);
writeJson('compcheck:analysis-reports', []);
setUserAllergens(originalUserAllergens);

const foodCardHtml = ingredientCard(getIngredientById('citric-acid', 'food'));
assert.match(foodCardHtml, /href="#\/food\/ingredient\/citric-acid"/);
const emptyHrefCardHtml = ingredientCard(getIngredientById('citric-acid', 'food'), { href: '' });
assert.match(emptyHrefCardHtml, /href=""/);
const noIdCardHtml = ingredientCard({ nameCn: '待确认', description: '暂无说明', riskLevel: 'unknown', category: '未分类' });
assert.doesNotMatch(noIdCardHtml, /href="#\/food\/ingredient\/undefined"/);
assert.match(noIdCardHtml, /<div class="ingredient-card__main">/);

const unsafeAnalyzeHtml = renderAnalyzePage('<img src=x onerror=alert(1)>', 'food');
assert.doesNotMatch(unsafeAnalyzeHtml, /<img src=x onerror=alert\(1\)>/);
assert.match(unsafeAnalyzeHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);

const invalidFoodAdditive = {
  id: 'bad-food-additive',
  kind: 'food-additive',
  nameCn: '测试添加剂',
  description: '测试数据',
  category: '测试',
  gbCode: 'INS 000',
  gbStatus: 'permitted',
  riskLevel: 'unknown',
  aliases: [],
  functions: [],
  suitableFor: [],
  cautionFor: [],
  usageLimits: [],
  foodCategories: [],
  allergenTypes: [],
  cautionGroups: [],
  sourceReferences: [{ title: '测试来源', standard: '测试标准' }],
  reviewStatus: 'draft',
  dataVersion: 'test',
  updatedAt: '2026-06-10'
};
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /sourceNote is required/);
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /dataCategory must be "food"/);
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /sourceReferences\[0\]\.url is required/);
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /sourceReferences\[0\]\.retrievedAt must use YYYY-MM-DD/);
assert.deepEqual(
  getMatchingUserAllergens({ allergenTypes: ['milk', 'soybeans'] }, ['milk']).map((allergen) => allergen.id),
  ['milk']
);
assert.deepEqual(getMatchingUserAllergens({ allergenTypes: cnResults[0].allergenTypes || [] }, ['milk']), []);
assert.deepEqual(getAllergensByIds(null), []);
assert.equal(formatAllergenNames([null, undefined, '', 'milk']), '乳及乳制品');
assert.deepEqual(getMatchingTextAllergens(null, ['milk']), []);
assert.deepEqual(getMatchingTextAllergens('小麦粉', ['cereals-gluten']).map((allergen) => allergen.id), ['cereals-gluten']);
assert.deepEqual(getMatchingTextAllergens('全脂奶粉', ['milk']).map((allergen) => allergen.id), ['milk']);
assert.deepEqual(getMatchingTextAllergens('大豆蛋白', ['soybeans']).map((allergen) => allergen.id), ['soybeans']);
assert.equal(normalizeText('ＡＢＣ １２３'), 'abc 123');
assert.equal(normalizeText('牛奶，鸡蛋。'), '牛奶 鸡蛋');

const foodDetailHtml = renderFoodAdditiveDetails({
  eNumber: 'E330',
  gbCode: 'INS 330',
  gbStatus: 'permitted',
  adi: 'not specified',
  reviewStatus: 'draft',
  foodCategories: ['饮料'],
  usageLimits: [{ foodCategory: '饮料', limit: '按生产需要适量使用', note: '测试说明' }],
  sourceReferences: [
    { title: 'GB 2760', standard: 'GB 2760-2024', region: 'CN', url: 'https://example.com/gb2760' },
    { title: '不安全来源', standard: '测试', region: 'CN', url: 'javascript:alert(1)' }
  ]
});
assert.match(foodDetailHtml, /E330/);
assert.match(foodDetailHtml, /INS 330/);
assert.match(foodDetailHtml, /允许使用/);
assert.match(foodDetailHtml, /草稿（未审核）/);
assert.match(foodDetailHtml, /GB 2760-2024/);
assert.match(foodDetailHtml, /href="https:\/\/example.com\/gb2760"/);
assert.doesNotMatch(foodDetailHtml, /href="javascript:alert/);

assert.equal(renderFoodAdditiveDetails(null), '');
const sparseFoodDetailHtml = renderFoodAdditiveDetails({
  eNumber: null,
  gbCode: undefined,
  gbStatus: undefined,
  adi: 0,
  foodCategories: null,
  usageLimits: [{ foodCategory: null, limit: undefined, note: null }, null],
  sourceReferences: [{ title: undefined, standard: null, region: null }, null]
});
assert.match(sparseFoodDetailHtml, /待确认/);
assert.match(sparseFoodDetailHtml, />0</);
assert.match(sparseFoodDetailHtml, /暂无食品类别/);
assert.match(sparseFoodDetailHtml, /暂无限量信息/);
assert.match(sparseFoodDetailHtml, /暂无来源标题/);
assert.match(sparseFoodDetailHtml, /暂无标准编号/);
assert.doesNotMatch(sparseFoodDetailHtml, /undefined|null/);

// SAMPLES validation and text analysis tests
assert.equal(Object.keys(SAMPLES).length >= 7, true);
assert.equal(typeof SAMPLES['food-2'], 'string');

const biscuitAnalysis = analyzeIngredientText(SAMPLES['food-2'], 'food');
assert.equal(biscuitAnalysis.matchedCount >= 2, true);
assert.equal(biscuitAnalysis.matchedCount, biscuitAnalysis.ingredients.length);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'lecithins'), true);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(biscuitAnalysis.unknownItems.includes('全脂奶粉'), true);

const chiliAnalysis = analyzeIngredientText(SAMPLES['food-4'], 'food');
assert.equal(chiliAnalysis.matchedCount, 4);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-benzoate'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(chiliAnalysis.unknownItems.includes('辣椒'), true);
assert.equal(chiliAnalysis.unknownItems.includes('大蒜'), true);
assert.equal(chiliAnalysis.unknownItems.includes('食盐'), true);

const juiceAnalysis = analyzeIngredientText(SAMPLES['food-3'], 'food');
assert.equal(juiceAnalysis.ingredients.some((item) => item.id === 'potassium-sorbate'), true);

const jellyAnalysis = analyzeIngredientText(SAMPLES['food-5'], 'food');
assert.equal(jellyAnalysis.unknownItems.includes('魔芋粉'), true);

const colaAnalysis = analyzeIngredientText(SAMPLES['food-1'], 'food');
assert.equal(colaAnalysis.ingredients.some((item) => item.id === 'aspartame'), true);

console.log('Tests passed: ingredient search and text analysis behave as expected.');
