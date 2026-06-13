import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AI_ANALYSIS_ENDPOINT_PATH, AI_ANALYSIS_PROTOCOL_VERSION, buildAIAnalysisFallback, buildAIAnalysisRequest, validateAIAnalysisResponse, analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { formatAllergenNames, getAllergensByIds, getMatchingTextAllergens, getMatchingUserAllergens } from '../src/services/allergenService.js';
import { analyzeIngredientText, getCategoryStats, getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientById, getIngredientCategorySummaries, getRelatedIngredients, getSearchFilterOptions, getSearchSuggestions, searchIngredients } from '../src/services/ingredientService.js';
import { categoryPath } from '../src/data/categories.js';
import { OCR_ENDPOINT_PATH, OCR_PROTOCOL_VERSION, buildOCRFallback, buildOCRRequest, extractIngredientsFromImage, getOcrEndpointUrl, recognizeImage, validateOCRResponse } from '../src/services/ocrService.js';
import { getCompareOverview } from '../src/services/compareService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from '../src/services/reportExportService.js';
import { computeRiskGrade, getTopIngredientNames } from '../src/services/reportService.js';
import { buildSupportPrefillFromParams, buildSupportPrefillUrl, buildSupportRequestMarkdown } from '../src/services/supportService.js';
import { renderComparePage } from '../src/pages/comparePage.js';
import { renderDataPage } from '../src/pages/dataPage.js';
import { renderDetailPage, renderFoodAdditiveDetails } from '../src/pages/detailPage.js';
import { renderAnalyzePage } from '../src/pages/analyzePage.js';
import { renderAuthPage } from '../src/pages/authPage.js';
import { renderHistoryPage } from '../src/pages/historyPage.js';
import { renderHomePage } from '../src/pages/homePage.js';
import { renderLegalPage } from '../src/pages/legalPage.js';
import { renderMembershipPage } from '../src/pages/membershipPage.js';
import { renderOnboardingPage } from '../src/pages/onboardingPage.js';
import { renderScanPage } from '../src/pages/scanPage.js';
import { renderOcrConfirmPage } from '../src/pages/ocrConfirmPage.js';
import { renderProductArchiveListPage, renderProductArchivePage } from '../src/pages/productArchivePage.js';
import { renderSearchPage } from '../src/pages/searchPage.js';
import { renderSettingsPage } from '../src/pages/settingsPage.js';
import { renderSupportPage } from '../src/pages/supportPage.js';
import { ingredientCard } from '../src/components/render.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from '../src/router/router.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { gb2760OfficialStagingGenerationCoverage, gb2760OfficialStagingRecords, getGb2760OfficialStagingSummary } from '../src/data/gb2760OfficialStaging.js';
import { gb2760OfficialFullTextPages, getGb2760OfficialFullTextSummary } from '../src/data/gb2760OfficialFullText.js';
import { gb2760OfficialA2ExceptionFoodCategories, gb2760OfficialB1Footnotes, gb2760OfficialB1NoFlavorFoodCategories, gb2760OfficialB2NaturalFlavorRows, gb2760OfficialB3SyntheticFlavorRows, gb2760OfficialC1ProcessingAidRows, gb2760OfficialC2ProcessingAidRows, gb2760OfficialC3EnzymePreparationRows, gb2760OfficialDFunctionCategoryRows, gb2760OfficialE1FoodCategoryRows, gb2760OfficialFAdditiveIndexRows, gb2760OfficialReferenceRows, getGb2760OfficialReferenceTableSummary } from '../src/data/gb2760OfficialReferenceTables.js';
import { formatBytes, SCAN_IMAGE_MAX_BYTES, validateScanImageFile } from '../src/utils/imageFile.js';
import { compressImage } from '../src/utils/imageProcessor.js';
import { AUTH_ERROR_MESSAGES, USER_KEY, getCurrentUser as getAuthCurrentUser, isLoggedIn as isAuthLoggedIn, logout as authLogout, syncLocalDataToServer, validateAuthInput } from '../src/services/authService.js';
import { AUTH_TOKEN_KEY, isLoggedIn as isStorageLoggedIn, readJson, writeJson } from '../src/services/storageService.js';
import { getMembershipActionMessage, getMembershipOverview } from '../src/services/membershipService.js';
import { addAvoidIngredient, addWatchIngredient, clearAvoidIngredients, clearWatchIngredients, getAvoidIngredientIds, getPersonalIngredientHit, getPersonalProfile, getReportPersonalHits, getWatchIngredientIds, removeAvoidIngredient, removeWatchIngredient } from '../src/services/personalProfileService.js';
import { clearProductArchives, createProductArchiveFromReport, getProductArchiveById, getProductArchiveByReportId, getProductArchives, MAX_PRODUCT_ARCHIVES, PRODUCT_ARCHIVES_KEY, saveProductArchiveFromReport, toggleProductArchiveFavorite } from '../src/services/productArchiveService.js';
import { buildCompareSharePayload, buildIngredientSharePayload, buildReportSharePayload, buildShareUrl, formatShareText, isShareAbort, isShareTypeError, sanitizeNativeSharePayload, sharePayloadWithFallback } from '../src/services/shareService.js';
import { getBase64ByteSize, getNativeCameraPhoto, getNativePhoto, isNativePlatform } from '../src/services/nativeBridgeService.js';
import { addCompareIngredient, addHistory, clearAnalysisReports, clearCompareItems, clearLocalUserData, clearPendingScan, clearScanDraft, clearSupportRequests, completeOnboarding, createAnalysisReport, deleteAnalysisReport, deleteSupportRequest, getAnalysisReportById, getAnalysisReports, getCompareIngredients, getCompareItems, getFavoriteIngredients, getFavoriteItems, getHistory, getLocalDataSnapshot, getLocalDataSummary, getOnboardingState, getPendingScan, getScanDraft, getSupportRequests, getUserAllergens, importLocalDataSnapshot, isHistoryRecordingEnabled, removeCompareIngredient, removeHistory, resetOnboarding, saveAnalysisReport, saveScanDraft, saveSupportRequest, setHistoryRecordingEnabled, setPendingScan, setUserAllergens, shouldShowOnboardingPrompt, skipOnboarding, toggleFavorite } from '../src/store/userStore.js';
import { clearMatchCache, matchIngredients, matchIngredientsLocal } from '../src/services/ingredientMatchService.js';
import { normalizeText, parseIngredientList, splitIngredientInput, SAMPLES } from '../src/utils/text.js';

const seedSourceName = '国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台';
import { getGb2760OfficialFullTextQualityReport, getGb2760OfficialReferenceTableQualityReport, getGb2760OfficialSeedCoverageReport, getGb2760OfficialStagingQualityReport, validateFoodAdditives, validateGb2760OfficialFullText, validateGb2760OfficialReferenceTables, validateGb2760OfficialSeedCoverage, validateGb2760OfficialStaging } from './validate-data.mjs';

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
assert.deepEqual(resolveRoute('#/food/analyze?text=%E6%9F%A0%E6%AA%AC%E9%85%B8&productName=%E6%B5%8B%E8%AF%95%E9%A5%BC%E5%B9%B2'), {
  view: 'analyze',
  category: 'food',
  input: '柠檬酸',
  productName: '测试饼干'
});
assert.deepEqual(resolveRoute('#/food/scan'), { view: 'scan', category: 'food', input: '' });
assert.deepEqual(resolveRoute('#/food/scan?text=%E6%9F%A0%E6%AA%AC%E9%85%B8'), { view: 'scan', category: 'food', input: '柠檬酸' });
assert.deepEqual(resolveRoute('#/food/ocr-confirm'), { view: 'ocr-confirm', category: 'food' });
assert.deepEqual(resolveRoute('#/food/data'), { view: 'data', category: 'food', filters: { source: '', confidenceLevel: '', dataStatus: '' } });
assert.deepEqual(resolveRoute(`#/food/data?source=${encodeURIComponent(seedSourceName)}&confidenceLevel=unverified`), {
  view: 'data',
  category: 'food',
  filters: {
    source: seedSourceName,
    confidenceLevel: 'unverified',
    dataStatus: ''
  }
});
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
assert.deepEqual(resolveRoute('#/login?mode=register&redirect=%2Ffood%2Fsettings'), {
  view: 'auth',
  category: 'food',
  mode: 'register',
  redirect: '/food/settings'
});
assert.deepEqual(resolveRoute('#/food/login?mode=login&redirect=%2Ffood%2Fhistory'), {
  view: 'auth',
  category: 'food',
  mode: 'login',
  redirect: '/food/history'
});
assert.deepEqual(resolveRoute('#/food/reports'), { view: 'reports', category: 'food', query: '' });
assert.deepEqual(resolveRoute('#/food/reports?q=%E5%8D%B5%E7%A3%B7%E8%84%82'), { view: 'reports', category: 'food', query: '卵磷脂' });
assert.deepEqual(resolveRoute('#/food/reports/report-123'), { view: 'report-detail', category: 'food', id: 'report-123' });
assert.deepEqual(resolveRoute('#/food/report/report-123'), { view: 'report-detail', category: 'food', id: 'report-123' });
assert.deepEqual(resolveRoute('#/report/report-123'), { view: 'report-detail', category: 'food', id: 'report-123' });
assert.deepEqual(resolveRoute('#/food/products'), { view: 'products', category: 'food', query: '', page: 1 });
assert.deepEqual(resolveRoute('#/food/products?q=%E9%A5%BC%E5%B9%B2&page=2'), { view: 'products', category: 'food', query: '饼干', page: 2 });
assert.deepEqual(resolveRoute('#/food/history'), { view: 'history', category: 'food', query: '', filter: 'all' });
assert.deepEqual(resolveRoute('#/food/history?q=%E9%A5%BC%E5%B9%B2&filter=favorite'), { view: 'history', category: 'food', query: '饼干', filter: 'favorite' });
assert.deepEqual(resolveRoute('#/history'), { view: 'history', category: 'food', query: '', filter: 'all' });
assert.deepEqual(resolveRoute('#/food/product/product-123'), { view: 'product-detail', category: 'food', id: 'product-123' });
assert.deepEqual(resolveRoute('#/product/product-123'), { view: 'product-detail', category: 'food', id: 'product-123' });
assert.deepEqual(resolveRoute('#/food/favorites?tab=products'), { view: 'favorites', category: 'food', tab: 'products' });
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
assert.equal(getRouteTitle(resolveRoute('#/food/ocr-confirm')), '确认配料表 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/data')), '数据来源 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/onboarding')), '首次设置 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/legal')), '隐私与条款 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/legal/privacy')), '隐私 - 隐私与条款 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/membership')), '会员中心 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/login')), '账号登录 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/support')), '支持中心 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/ingredient/citric-acid')), '柠檬酸 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/reports/report-123')), '报告详情 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/reports?q=%E5%8D%B5%E7%A3%B7%E8%84%82')), '卵磷脂 报告检索 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/products')), '产品档案 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/history')), '分析历史 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/settings')), '个人成分档案 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/not-a-real-page')), '页面不存在 - 食品添加剂 - CompCheck 成分小查');
assert.deepEqual(getNavigationLinks(resolveRoute('#/food/search?q=E330')), [
  { key: 'search', href: '#/food/search', active: true },
  { key: 'compare', href: '#/food/compare', active: false },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'analyze', href: '#/food/analyze', active: false },
  { key: 'data', href: '#/food/data', active: false },
  { key: 'reports', href: '#/food/reports', active: false },
  { key: 'history', href: '#/food/history', active: false },
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
  { key: 'history', href: '#/cosmetics/history', active: false },
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
  { key: 'history', href: '#/food/history', active: false },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'membership', href: '#/food/membership', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.equal(getNavigationLinks(resolveRoute('#/food/products')).find((item) => item.key === 'history').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/product/product-123')).find((item) => item.key === 'history').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/history')).find((item) => item.key === 'history').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/onboarding')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/legal')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/membership')).find((item) => item.key === 'membership').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/support')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/login')).find((item) => item.key === 'settings').active, true);
assert.equal(getNavigationLinks(resolveRoute('#/food/compare')).find((item) => item.key === 'compare').active, true);
assert.deepEqual(getMobileNavigationLinks(resolveRoute('#/food')), [
  { key: 'home', href: '#/food', active: true },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'search', href: '#/food/search', active: false },
  { key: 'history', href: '#/food/history', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.deepEqual(getMobileNavigationLinks(resolveRoute('#/cosmetics/settings')), [
  { key: 'home', href: '#/cosmetics', active: false },
  { key: 'scan', href: '#/cosmetics/scan', active: false },
  { key: 'search', href: '#/cosmetics/search', active: false },
  { key: 'history', href: '#/cosmetics/history', active: false },
  { key: 'settings', href: '#/cosmetics/settings', active: true }
]);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/membership')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/legal/privacy')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/support')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/login')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/history')).find((item) => item.key === 'history').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/ingredient/citric-acid')).find((item) => item.key === 'search').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/compare')).find((item) => item.key === 'search').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/reports/report-1')).find((item) => item.key === 'history').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/favorites')).find((item) => item.key === 'settings').active, true);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/ingredient/citric-acid')).filter((item) => item.active).length, 1);
assert.equal(getMobileNavigationLinks(resolveRoute('#/food/not-a-real-page')).filter((item) => item.active).length, 0);
assert.equal(getMobileNavigationLinks({ view: 'future-view', category: 'food' }).filter((item) => item.active).length, 0);
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
assert.match(backendAppSource, /createLazyUserService\(config\.databaseUrl\)/);
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
assert.match(backendDbSchema, /export const gb2760OfficialRecords = pgTable\('gb2760_official_records'/);
assert.match(backendDbSchema, /export const gb2760OfficialPages = pgTable\('gb2760_official_pages'/);
assert.match(backendDbSchema, /pdfSha256: text\('pdf_sha256'\)\.notNull\(\)/);
assert.match(backendDbSchema, /reviewStatus: text\('review_status'\)\.notNull\(\)/);
assert.match(backendDbSchema, /export const users = pgTable\('users'/);
assert.match(backendDbSchema, /uniqueIndex\('users_email_unique_idx'\)/);
assert.match(backendDbSchema, /export const sessions = pgTable\('sessions'/);
assert.match(backendDbSchema, /references\(\(\) => users\.id, \{ onDelete: 'cascade' \}\)/);
assert.match(backendDbSchema, /export const userFavorites = pgTable\('user_favorites'/);
assert.match(backendDbSchema, /export const userHistory = pgTable\('user_history'/);
assert.match(backendDbSchema, /export const userAllergens = pgTable\('user_allergens'/);
assert.match(backendDbSchema, /export const userProfileIngredients = pgTable\('user_profile_ingredients'/);
assert.match(backendDbSchema, /export const userReports = pgTable\('user_reports'/);
assert.match(backendDbSchema, /export const productArchives = pgTable\('product_archives'/);
assert.match(backendDbSchema, /thumbnailUrl: text\('thumbnail_url'\)/);
assert.match(backendDbSchema, /primaryKey\(\{ columns: \[table\.userId, table\.id\] \}\)/);
assert.match(backendDbSchema, /ingredients_description_trgm_idx/);
assert.match(backendDbSchema, /ingredients_aliases_gin_idx/);
assert.match(backendDbSchema, /sourceName: text\('source_name'\)\.notNull\(\)/);
assert.match(backendDbSchema, /confidenceLevel: text\('confidence_level'\)\.notNull\(\)/);
assert.match(backendDbSchema, /reviewedBy: text\('reviewed_by'\)\.notNull\(\)\.default\('system'\)/);
assert.match(backendDbSchema, /reviewedAt: timestamp\('reviewed_at', \{ withTimezone: true \}\)\.notNull\(\)\.defaultNow\(\)/);
assert.match(backendDbSchema, /changeNote: text\('change_note'\)\.notNull\(\)\.default\('seed import'\)/);
assert.match(backendDbSchema, /isVerified: boolean\('is_verified'\)\.notNull\(\)\.default\(false\)/);
const backendIngredientsRoute = await readFile(new URL('../backend/src/routes/ingredients.ts', import.meta.url), 'utf8');
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients'/);
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients\/categories'/);
assert.match(backendIngredientsRoute, /route\.post\('\/ingredients\/batch-search'/);
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients\/search'/);
assert.match(backendIngredientsRoute, /route\.get\('\/ingredients\/:id'/);
assert.equal(backendIngredientsRoute.indexOf("route.get('/ingredients/search'") < backendIngredientsRoute.indexOf("route.get('/ingredients/:id'"), true);
assert.match(backendIngredientsRoute, /never interpreted as an ingredient id/);
assert.match(backendIngredientsRoute, /invalid_parameter/);
assert.match(backendIngredientsRoute, /sort must be one of relevance, risk, name/);
assert.match(backendIngredientsRoute, /confidenceLevel must be one of high, medium, low, unverified/);
const backendIngredientServiceSource = await readFile(new URL('../backend/src/services/ingredientService.ts', import.meta.url), 'utf8');
assert.match(backendIngredientServiceSource, /eq\(ingredients\.confidenceLevel, params\.confidenceLevel\)/);
assert.match(backendIngredientServiceSource, /upsertGb2760OfficialRecords/);
assert.match(backendIngredientServiceSource, /gb2760OfficialRecords/);
assert.match(backendIngredientServiceSource, /updateAuditFields\?: boolean/);
assert.match(backendIngredientServiceSource, /const auditUpdateCondition = options\.updateAuditFields/);
assert.match(backendIngredientServiceSource, /reviewedBy: sql`case when \$\{auditUpdateCondition\} then excluded\.reviewed_by else \$\{ingredients\.reviewedBy\} end`/);
assert.match(backendIngredientServiceSource, /reviewedAt: sql`case when \$\{auditUpdateCondition\} then excluded\.reviewed_at else \$\{ingredients\.reviewedAt\} end`/);
assert.match(backendIngredientServiceSource, /changeNote: sql`case when \$\{auditUpdateCondition\} then excluded\.change_note else \$\{ingredients\.changeNote\} end`/);
assert.doesNotMatch(backendIngredientServiceSource, /1970-01-01T00:00:00\.000Z/);
const backendSeedScriptSource = await readFile(new URL('../backend/scripts/seed.ts', import.meta.url), 'utf8');
assert.match(backendSeedScriptSource, /updateAuditFields: hasReviewedBy \|\| hasChangeNote/);
assert.equal(backendIngredientServiceSource.split(String.raw`ESCAPE '\\'`).length - 1, 4);
assert.match(backendIngredientServiceSource, /validSearchSorts = \['relevance', 'risk', 'name'\]/);
assert.match(backendIngredientServiceSource, /batchSearch\(params\)/);
assert.match(backendIngredientServiceSource, /const eNumberPattern = eNumber/);
assert.match(backendIngredientServiceSource, /ilikeEscaped\(ingredients\.eNumber, eNumberPattern\)/);
assert.match(backendIngredientServiceSource, /\.orderBy\(\.\.\.buildIngredientOrderBy\(params\.sort\)\)[\s\S]*\.limit\(params\.limit\)/);
assert.match(backendIngredientServiceSource, /when 'high' then 0[\s\S]*when 'medium' then 1[\s\S]*when 'low' then 2/);
assert.match(backendIngredientServiceSource, /riskFacets,/);
assert.match(backendIngredientServiceSource, /categoryFacets/);
assert.match(backendIngredientServiceSource, /buildIngredientWhere\(\{ \.\.\.params, riskLevel: undefined \}\)/);
assert.match(backendIngredientServiceSource, /buildIngredientWhere\(\{ \.\.\.params, category: undefined \}\)/);
const ingredientApiServiceSource = await readFile(new URL('../src/services/ingredientApiService.js', import.meta.url), 'utf8');
assert.match(ingredientApiServiceSource, /params\.set\('sort', normalizedSort\)/);
const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainSource, /sort: route\.sort/);
assert.match(mainSource, /riskFacets: result\.riskFacets \|\| \[\]/);
assert.match(mainSource, /categoryFacets: result\.categoryFacets \|\| \[\]/);
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
const backendUserRoute = await readFile(new URL('../backend/src/routes/user.ts', import.meta.url), 'utf8');
assert.match(backendUserRoute, /route\.get\('\/user\/favorites'/);
assert.match(backendUserRoute, /route\.post\('\/user\/history'/);
assert.match(backendUserRoute, /route\.put\('\/user\/allergens'/);
assert.match(backendUserRoute, /route\.get\('\/user\/profile\/:kind'/);
assert.match(backendUserRoute, /route\.put\('\/user\/profile\/:kind'/);
assert.match(backendUserRoute, /route\.delete\('\/user\/reports'/);
assert.match(backendUserRoute, /route\.get\('\/user\/products'/);
assert.match(backendUserRoute, /route\.get\('\/user\/products\/:id'/);
assert.match(backendUserRoute, /route\.patch\('\/user\/products\/:id'/);
const backendUserServiceSource = await readFile(new URL('../backend/src/services/userService.ts', import.meta.url), 'utf8');
assert.match(backendUserServiceSource, /userFavorites/);
assert.match(backendUserServiceSource, /replaceFavorites/);
assert.match(backendUserServiceSource, /replaceAllergens/);
assert.match(backendUserServiceSource, /replaceProfileIngredients/);
assert.match(backendUserServiceSource, /replaceReports/);
assert.match(backendUserServiceSource, /productArchives/);
assert.match(backendUserServiceSource, /replaceProducts/);
const backendSeedScript = await readFile(new URL('../backend/scripts/seed.ts', import.meta.url), 'utf8');
assert.match(backendSeedScript, /src\/data\/foodAdditives\.js/);
assert.match(backendSeedScript, /Array\.isArray\(module\.foodIngredients\)/);
assert.match(backendSeedScript, /Array\.isArray\(module\.foodAdditives\)/);
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
const backendUserDataMigrationSql = await readFile(new URL('../backend/src/db/migrations/0003_ordinary_mad_thinker.sql', import.meta.url), 'utf8');
assert.match(backendUserDataMigrationSql, /CREATE TABLE "user_favorites"/);
assert.match(backendUserDataMigrationSql, /CREATE TABLE "user_history"/);
assert.match(backendUserDataMigrationSql, /CREATE TABLE "user_allergens"/);
assert.match(backendUserDataMigrationSql, /CREATE TABLE "user_reports"/);
const backendProductArchiveMigrationSql = await readFile(new URL('../backend/src/db/migrations/0005_wooden_kid_colt.sql', import.meta.url), 'utf8');
assert.match(backendProductArchiveMigrationSql, /CREATE TABLE "product_archives"/);
assert.match(backendProductArchiveMigrationSql, /"thumbnail_url" text/);
assert.match(backendProductArchiveMigrationSql, /CONSTRAINT "product_archives_user_id_id_pk" PRIMARY KEY\("user_id","id"\)/);
const backendProfileMigrationSql = await readFile(new URL('../backend/src/db/migrations/0007_tricky_marvel_zombies.sql', import.meta.url), 'utf8');
assert.match(backendProfileMigrationSql, /CREATE TABLE "user_profile_ingredients"/);
assert.match(backendProfileMigrationSql, /"kind" text NOT NULL/);
assert.match(backendProfileMigrationSql, /user_profile_ingredients_kind_check/);
const backendVitestConfig = await readFile(new URL('../backend/vitest.config.ts', import.meta.url), 'utf8');
assert.match(backendVitestConfig, /include: \['tests\/\*\*\/\*\.test\.ts'\]/);
const viteConfigJs = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
assert.match(viteConfigJs, /root: 'src'/);
assert.match(viteConfigJs, /base: '\.\/'/);
assert.match(viteConfigJs, /publicDir: '\.\.\/public'/);
assert.match(viteConfigJs, /define: \{ __APP_NAME__: JSON\.stringify\(process\.env\.APP_NAME \|\| '成分小查'\) \}/);
assert.match(viteConfigJs, /outDir: '\.\.\/dist'/);
assert.match(viteConfigJs, /target: process\.env\.API_ORIGIN \|\| 'http:\/\/127\.0\.0\.1:3000'/);
const commandsMd = await readFile(new URL('../COMMANDS.md', import.meta.url), 'utf8');
assert.match(commandsMd, /compcheck:api-base-url/);
assert.match(commandsMd, /不保存用户数据/);
const ciWorkflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
assert.match(ciWorkflow, /node-version: '20\.19'/);
assert.match(ciWorkflow, /npm ci/);
const indexHtml = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
assert.match(indexHtml, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(indexHtml, /name="apple-mobile-web-app-capable" content="yes"/);
assert.match(indexHtml, /name="apple-mobile-web-app-title" content="成分镜"/);
assert.match(indexHtml, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
assert.match(indexHtml, /rel="apple-touch-icon" href="\.\/icons\/icon-192\.png"/);
assert.match(indexHtml, /data-connection-banner/);
assert.match(indexHtml, /当前离线，部分功能不可用/);
assert.match(indexHtml, /data-install-prompt/);
assert.match(indexHtml, /data-install-prompt-action/);
assert.match(indexHtml, /data-mobile-nav-key="home"/);
assert.match(indexHtml, /data-mobile-nav-key="scan"/);
assert.match(indexHtml, /data-mobile-nav-key="history"/);
assert.match(indexHtml, /data-mobile-nav-key="scan">识别/);
assert.match(indexHtml, /data-nav-key="compare"/);
assert.match(indexHtml, /data-nav-key="scan"/);
assert.match(indexHtml, /data-nav-key="data"/);
assert.match(indexHtml, /data-nav-key="reports"/);
assert.match(indexHtml, /data-nav-key="history"/);
assert.match(indexHtml, /data-nav-key="membership"/);
assert.match(indexHtml, /href="#\/food\/legal"/);
assert.match(indexHtml, /data-shell-legal-link/);
const stylesCss = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(stylesCss, /padding-bottom: max\(env\(safe-area-inset-bottom, 0px\), 1rem\)/);
assert.match(stylesCss, /\.scan-source-button/);
assert.match(stylesCss, /touch-action: pan-y/);
assert.match(stylesCss, /@keyframes skeleton-shimmer/);
assert.match(stylesCss, /\.skeleton-card/);
assert.match(stylesCss, /\.empty-state-title/);
assert.match(stylesCss, /\.error-state/);
assert.match(stylesCss, /\.page-enter/);
assert.match(stylesCss, /\.chip-list\.home-category-list/);
assert.match(stylesCss, /animation: slide-in-right 150ms ease-out/);
assert.match(stylesCss, /--color-nav-inactive: #9ca3af/);
assert.match(stylesCss, /\.full-height[\s\S]*100dvh/);
assert.match(stylesCss, /font-size: max\(16px, 1rem\)/);
assert.match(stylesCss, /\.connection-banner/);
assert.match(stylesCss, /--connection-banner-height: 0px/);
assert.match(stylesCss, /top: var\(--connection-banner-height\)/);
assert.match(stylesCss, /safe-area-inset-top/);
assert.match(stylesCss, /\.install-prompt/);
assert.match(stylesCss, /\.offline-capability-list/);
const appManifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(appManifest.name, '成分镜');
assert.equal(appManifest.short_name, '成分镜');
assert.equal(appManifest.display, 'standalone');
assert.deepEqual(appManifest.display_override, ['standalone', 'minimal-ui', 'browser']);
assert.equal(appManifest.orientation, 'portrait');
assert.equal(appManifest.start_url, './#/food');
assert.equal(appManifest.icons.find((icon) => icon.sizes === '192x192').src, './icons/icon-192.png');
assert.equal(appManifest.icons.find((icon) => icon.sizes === '512x512').purpose, 'any maskable');
assert.equal(appManifest.icons.at(-1).src, './app-icon.svg');
assert.equal(appManifest.shortcuts[0].url, './#/food/scan');
assert.equal(appManifest.shortcuts[0].icons[0].src, './icons/icon-192.png');
assert.equal(appManifest.shortcuts[1].url, './#/food/search');
const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainJs, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
assert.match(mainJs, /function getInitialHash\(\)/);
assert.match(mainJs, /playPageEnterAnimation\(\)/);
assert.doesNotMatch(mainJs, /aria-selected/);
assert.match(mainJs, /data-route-retry/);
assert.match(mainJs, /setupConnectionStatus\(\)/);
assert.match(mainJs, /setupPwaInstallPrompt\(\)/);
assert.match(mainJs, /beforeinstallprompt/);
assert.match(mainJs, /compcheck:pwa-open-count/);
assert.match(mainJs, /data-install-prompt-message/);
assert.match(mainJs, /navigator\.onLine === false/);
assert.match(mainJs, /--connection-banner-height/);
assert.match(mainJs, /banner\.offsetHeight/);
assert.doesNotMatch(mainJs, /addEventListener\('resize', update\)/);
assert.match(mainJs, /new ResizeObserver\(update\)\.observe\(banner\)/);
assert.match(mainJs, /if \(!isIosSafari\(\)\) \{\s*writeLocalFlag\(PWA_INSTALL_DISMISSED_KEY, 'true'\);/);
assert.match(mainJs, /categoryPath\(onboardingState\.preferredCategory, '\/onboarding'\)/);
assert.match(mainJs, /categoryPath\(onboardingState\.preferredCategory\)/);
assert.match(mainJs, /categoryPath\(route\.category, '\/legal'\)/);
assert.match(mainJs, /bindAuthEvents\(route\)/);
assert.match(mainJs, /validateAuthInput\(email, password\)/);
assert.match(mainJs, /data-auth-password-toggle/);
assert.match(mainJs, /data-auth-logout/);
assert.match(mainJs, /history\.replaceState\(null, '', `#\$\{categoryPath\(route\.category, '\/support'\)\}`\)/);
assert.match(mainJs, /if \(requestedPage > totalPages\)/);
assert.match(mainJs, /requestIngredientSearchPage\(route, totalPages\)/);
assert.match(mainJs, /page: responsePage/);
assert.match(mainJs, /sharePayloadWithFallback\(payload, \{ copyText, updateStatus \}\)/);
assert.match(mainJs, /getNativePhoto\(source\)/);
assert.match(mainJs, /isNativePlatform\(\)/);
assert.match(mainJs, /compressImage\(file, \{ maxWidth: 1200, maxBytes: 800_000 \}\)/);
assert.match(mainJs, /saveImage\(processed\.blob, meta\)/);
assert.match(mainJs, /async function clearPendingScanImage\(\)[\s\S]*clearPendingScan\(\)[\s\S]*deleteImage\(pending\.pendingImageId\)/);
assert.match(mainJs, /previousPending\.pendingImageId[\s\S]*deleteImage\(previousPending\.pendingImageId\)/);
assert.match(mainJs, /pendingImageId: imageId[\s\S]*pendingImageMeta: meta[\s\S]*pendingText: ''[\s\S]*pendingProductName: ''[\s\S]*pendingOcrErrorCode: ''[\s\S]*pendingOcrErrorMsg: ''/);
assert.match(mainJs, /getImage\(pending\.pendingImageId\)/);
assert.match(mainJs, /saveProductArchiveFromReport\(report\)/);
assert.match(mainJs, /getPendingScanForReport\(route\)/);
assert.match(mainJs, /imageId: pending\?\.pendingImageId/);
assert.match(mainJs, /clearPendingScan\(\)/);
assert.match(mainJs, /hydrateProductArchiveImage\(route, renderVersion\)/);
assert.match(mainJs, /data-history-search-form/);
assert.match(mainJs, /data-clear-product-history/);
assert.match(mainJs, /bindHistorySwipeActions\(\)/);
assert.match(mainJs, /\['cancelled', 'empty'\]\.includes\(result\.reason\)/);
assert.match(mainJs, /dataUrlToBlob\(result\.dataUrl, result\.mimeType\)/);
assert.match(mainJs, /new File\(\[blob\], fileName/);
assert.match(mainJs, /validateScanImageFile\(file\)/);
assert.match(mainJs, /openScanFilePicker\(fileInput\)/);
assert.match(mainJs, /recognizeImage\(image\?\.blob, \{ category: route\.category \}\)/);
assert.match(mainJs, /categoryPath\(route\.category, '\/ocr-confirm'\)/);
assert.match(mainJs, /function updateOcrIngredientCount\(text\)/);
assert.match(mainJs, /parseIngredientList\(text\)\.length/);
assert.match(mainJs, /请先输入成分表文字/);
assert.match(mainJs, /function updateAnalyzeStatus\(message\)/);
const imageProcessorJs = await readFile(new URL('../src/utils/imageProcessor.js', import.meta.url), 'utf8');
assert.match(imageProcessorJs, /createImageBitmap\(file, \{ imageOrientation: 'none' \}\)/);
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
assert.match(nativeBridgeServiceJs, /CameraSource\.Camera/);
assert.match(nativeBridgeServiceJs, /CameraSource\.Photos/);
assert.match(nativeBridgeServiceJs, /getBase64ByteSize\(photo\.base64String\)/);
assert.match(nativeBridgeServiceJs, /Share\.share/);
assert.match(nativeBridgeServiceJs, /if \(payload\.url\) shareOptions\.url = payload\.url/);
const serviceWorkerJs = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
assert.match(serviceWorkerJs, /CACHE_VERSION_SUFFIX = 'v24'/);
assert.match(serviceWorkerJs, /CACHE_VERSION = `compcheck-shell-\$\{CACHE_VERSION_SUFFIX\}`/);
assert.match(serviceWorkerJs, /RUNTIME_CACHE = `compcheck-runtime-\$\{CACHE_VERSION_SUFFIX\}`/);
assert.match(serviceWorkerJs, /IMAGE_CACHE = `compcheck-images-\$\{CACHE_VERSION_SUFFIX\}`/);
assert.match(serviceWorkerJs, /warmAppShellBundles\(cache\)/);
assert.match(serviceWorkerJs, /function extractAppShellBundleUrls\(html\)/);
assert.match(serviceWorkerJs, /function cacheHtmlWithBundles\(cache, cacheKey, response\)/);
assert.match(serviceWorkerJs, /function cacheAppShellBundlesFromHtml\(cache, html\)/);
assert.match(serviceWorkerJs, /shouldWarmBundlesBeforeCache\(cacheKey\)/);
assert.match(serviceWorkerJs, /src\|href/);
assert.match(serviceWorkerJs, /js\|css/);
assert.match(serviceWorkerJs, /\.\/index\.html/);
assert.match(serviceWorkerJs, /\.\/manifest\.webmanifest/);
assert.match(serviceWorkerJs, /\.\/app-icon\.svg/);
assert.match(serviceWorkerJs, /\.\/icons\/icon-512\.png/);
assert.doesNotMatch(serviceWorkerJs, /\.\/data\/foodAdditives\.js/);
assert.match(serviceWorkerJs, /request\.mode === 'navigate'/);
assert.match(serviceWorkerJs, /staleWhileRevalidate\('\.\/index\.html', '\.\/index\.html', CACHE_VERSION\)/);
assert.match(serviceWorkerJs, /cacheHtmlWithBundles\(cache, cacheKey, networkResponse\)/);
assert.match(serviceWorkerJs, /isIngredientApi\(url\)/);
assert.match(serviceWorkerJs, /isAuthApi\(url\)/);
assert.match(serviceWorkerJs, /isUserDataApi\(url\)/);
assert.match(serviceWorkerJs, /isOcrApi\(url\)/);
assert.match(serviceWorkerJs, /networkFirst\(request, RUNTIME_CACHE\)/);
assert.match(serviceWorkerJs, /event\.respondWith\(networkOnlyJson\(request\)\)/);
assert.match(serviceWorkerJs, /function networkOnlyJson\(request\)/);
assert.match(serviceWorkerJs, /offlineJsonResponse\(request, true\)/);
assert.match(serviceWorkerJs, /cacheFirst\(request, IMAGE_CACHE, CACHE_VERSION\)/);
assert.match(serviceWorkerJs, /function matchFallbackCache\(request, cacheName\)/);
assert.match(serviceWorkerJs, /offlineJsonResponse/);
const pwaOfflineDoc = await readFile(new URL('../docs/pwa-offline-capability.md', import.meta.url), 'utf8');
assert.match(pwaOfflineDoc, /查看本机历史报告/);
assert.match(pwaOfflineDoc, /OCR API/);
assert.match(pwaOfflineDoc, /Network First/);
assert.match(pwaOfflineDoc, /Shell Cache 回退/);
assert.match(pwaOfflineDoc, /先缓存新 HTML 引用的 Vite JS\/CSS/);
assert.match(pwaOfflineDoc, /Lighthouse PWA/);
const notFoundHtml = renderRoute(resolveRoute('#/food/not-a-real-page'));
assert.match(notFoundHtml, /页面不存在/);
assert.match(notFoundHtml, /没有找到这个页面/);
assert.match(notFoundHtml, /href="#\/food"/);
assert.match(notFoundHtml, /href="#\/food\/search"/);
assert.equal(categoryPath('food', '/search'), '/food/search');
const authLoginHtml = renderAuthPage('food', 'login', '/food/settings');
assert.match(authLoginHtml, /账号登录/);
assert.match(authLoginHtml, /data-auth-form/);
assert.match(authLoginHtml, /data-auth-mode="login"/);
assert.match(authLoginHtml, /href="#\/food\/login\?mode=register&redirect=%2Ffood%2Fsettings"/);
assert.match(authLoginHtml, /name="email"/);
assert.match(authLoginHtml, /type="password"/);
assert.match(authLoginHtml, /data-auth-password-toggle/);
assert.match(authLoginHtml, /暂不登录，以访客模式继续/);
assert.match(authLoginHtml, /href="#\/food\/settings"/);
const authRegisterHtml = renderRoute(resolveRoute('#/food/login?mode=register&redirect=%2Ffood%2Fhistory'));
assert.match(authRegisterHtml, /注册账号/);
assert.match(authRegisterHtml, /data-auth-mode="register"/);
assert.match(authRegisterHtml, /注册并登录/);
assert.match(authRegisterHtml, /autocomplete="new-password"/);
assert.equal(validateAuthInput('bad-email', 'strong-pass').message, AUTH_ERROR_MESSAGES.invalidEmail);
assert.equal(validateAuthInput('test@example.com', 'short').message, AUTH_ERROR_MESSAGES.shortPassword);
assert.deepEqual(validateAuthInput(' Test@Example.COM ', 'strong-pass').value, {
  email: 'test@example.com',
  password: 'strong-pass'
});

const scanHtml = renderRoute(resolveRoute('#/food/scan?text=%E6%9F%A0%E6%AA%AC%E9%85%B8'));
assert.match(scanHtml, /拍照识别配料表/);
assert.match(scanHtml, /data-open-scan-camera/);
assert.match(scanHtml, /data-open-scan-photos/);
assert.match(scanHtml, /data-scan-camera-input/);
assert.match(scanHtml, /data-scan-photos-input/);
assert.match(scanHtml, /capture="environment"/);
assert.match(scanHtml, /accept="image\/\*"/);
assert.match(scanHtml, /data-scan-preview/);
assert.match(scanHtml, /data-clear-scan-image/);
assert.match(scanHtml, /data-confirm-scan-image/);
assert.match(scanHtml, /data-start-manual-confirm/);
assert.match(scanHtml, /确认并识别/);
assert.match(scanHtml, /手动输入配料表/);
assert.match(scanHtml, /OCR 协议 v2 已就绪/);
assert.match(scanHtml, /未配置 OCR Key 时会进入手动确认模式/);
assert.doesNotMatch(scanHtml, /\/api\/ocr\/extract-ingredients/);
assert.match(scanHtml, /单张不超过 8 MB/);
assert.match(scanHtml, /柠檬酸/);
assert.match(scanHtml, /链接带入文本/);
assert.match(scanHtml, /href="#\/food\/ocr-confirm"/);
assert.match(renderScanPage('', 'cosmetics'), /化妆品成分/);
setPendingScan({
  status: 'success',
  category: 'food',
  pendingImageId: 'scan-test-image',
  pendingImageMeta: { compressedSize: 2048, width: 1200, height: 900 },
  pendingText: '配料：水、食品添加剂（柠檬酸、山梨酸钾）',
  pendingProductName: '测试饼干',
  pendingSource: 'ocr',
  pendingOcrMode: 'fallback',
  pendingOcrConfidence: 0,
  pendingOcrProvider: 'none'
});
const confirmHtml = renderOcrConfirmPage('food');
assert.match(confirmHtml, /确认配料表内容/);
assert.match(confirmHtml, /data-ocr-confirm-image/);
assert.match(confirmHtml, /data-ocr-confirm-form/);
assert.match(confirmHtml, /配料：水、食品添加剂/);
assert.match(confirmHtml, /测试饼干/);
assert.match(confirmHtml, /OCR 降级/);
assert.match(confirmHtml, /开始分析配料/);
assert.match(confirmHtml, /3 项/);
const crossCategoryConfirmHtml = renderOcrConfirmPage('cosmetics');
assert.match(crossCategoryConfirmHtml, /手动输入/);
assert.doesNotMatch(crossCategoryConfirmHtml, /图片读取中/);
assert.doesNotMatch(crossCategoryConfirmHtml, /测试饼干/);
clearPendingScan();
const iosPlistAdditions = await readFile(new URL('../docs/ios-plist-additions.md', import.meta.url), 'utf8');
assert.match(iosPlistAdditions, /NSCameraUsageDescription = "用于扫描食品成分表"/);
assert.match(iosPlistAdditions, /NSPhotoLibraryUsageDescription = "用于从相册选择食品包装图片"/);
writeJson('compcheck:scan-drafts', {});
assert.equal(getScanDraft('food'), '');
assert.equal(saveScanDraft(' 柠檬酸，山梨酸钾 ', 'food'), '柠檬酸，山梨酸钾');
assert.equal(getScanDraft('food'), '柠檬酸，山梨酸钾');
assert.doesNotMatch(renderScanPage('', 'food'), /柠檬酸，山梨酸钾/);
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
  message: '请选择图片文件（JPG/PNG/WebP/HEIC）。'
});
assert.deepEqual(validateScanImageFile({ type: 'image/png', size: SCAN_IMAGE_MAX_BYTES + 1 }), {
  ok: false,
  reason: 'size',
  message: '图片过大，请选择 8 MB 以内的图片或重新拍摄。'
});
assert.deepEqual(validateScanImageFile({ type: 'image/jpeg', size: 2048 }), {
  ok: true,
  reason: '',
  message: '已选择图片，大小 2 KB。'
});
const originalCreateImageBitmap = globalThis.createImageBitmap;
globalThis.createImageBitmap = async () => {
  throw new Error('decode failed');
};
const unsupportedHeicBlob = new Blob(['heic bytes'], { type: 'image/heic' });
const unsupportedHeicResult = await compressImage(unsupportedHeicBlob, { maxWidth: 1200, maxBytes: 800_000 });
assert.equal(unsupportedHeicResult.blob, unsupportedHeicBlob);
assert.equal(unsupportedHeicResult.fallback, 'canvas_unavailable');
if (originalCreateImageBitmap) {
  globalThis.createImageBitmap = originalCreateImageBitmap;
} else {
  delete globalThis.createImageBitmap;
}

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
assert.deepEqual(await getNativePhoto('photos'), nativePhotoResult);
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
assert.equal(getIngredientById('xylitol', 'food').confidenceLevel, 'unverified');
assert.equal(getIngredientById('xylitol', 'food').isVerified, false);
assert.match(getIngredientById('xylitol', 'food').sourceName, /食品安全国家标准数据检索平台/);
assert.match(getIngredientById('xylitol', 'food').sourceVersion, /GB 2760-2024/);
assert.match(getIngredientById('xylitol', 'food').rawSourceText, /file_guid=43C9B75E-3D84-4577-80FC-0F7D77D36407/);
const reviewedCitricAcid = getIngredientById('citric-acid', 'food');
assert.equal(reviewedCitricAcid.reviewStatus, 'verified');
assert.equal(reviewedCitricAcid.dataStatus, 'verified_regulation');
assert.equal(reviewedCitricAcid.sourceScope, 'gb_2760_regulation');
assert.equal(reviewedCitricAcid.confidenceLevel, 'high');
assert.equal(reviewedCitricAcid.isVerified, true);
assert.deepEqual(reviewedCitricAcid.functions, ['酸度调节剂', '抗氧化剂']);
assert.equal(reviewedCitricAcid.sourceName, seedSourceName);
assert.match(reviewedCitricAcid.sourceUrl, /sppt\.cfsa\.net\.cn/);
assert.match(reviewedCitricAcid.adi, /NOT LIMITED/);
assert.doesNotMatch(reviewedCitricAcid.adi, /GB 2760 限量未导入/);
assert.equal(reviewedCitricAcid.usageLimits.length, 1);
assert.match(reviewedCitricAcid.usageLimits[0].foodCategory, /表 A\.2/);
assert.match(reviewedCitricAcid.usageLimits[0].limit, /按生产需要适量使用/);
assert.match(reviewedCitricAcid.rawSourceText, /GB 2760-2024 表 A\.1/);
assert.equal(reviewedCitricAcid.sourceReferences.some((source) => /Home\/Chemical\/3594$/.test(source.url || '')), true);
const verifiedSodiumCitrate = getIngredientById('sodium-citrate', 'food');
assert.deepEqual(verifiedSodiumCitrate.functions, ['酸度调节剂', '稳定剂']);
const verifiedXanthanGum = getIngredientById('xanthan-gum', 'food');
assert.equal(verifiedXanthanGum.reviewStatus, 'verified');
assert.equal(verifiedXanthanGum.dataStatus, 'verified_regulation');
assert.equal(verifiedXanthanGum.category, '稳定剂');
assert.deepEqual(verifiedXanthanGum.functions, ['稳定剂', '增稠剂']);
assert.equal(verifiedXanthanGum.usageLimits.length, 6);
assert.equal(verifiedXanthanGum.usageLimits.some((limit) => limit.foodCategory.includes('13.01.03') && limit.limit === '9.0 g/kg'), true);
const verifiedSodiumBicarbonate = getIngredientById('sodium-bicarbonate', 'food');
assert.equal(verifiedSodiumBicarbonate.usageLimits.length, 2);
assert.equal(verifiedSodiumBicarbonate.dataStatus, 'verified_regulation');
assert.deepEqual(verifiedSodiumBicarbonate.functions, ['膨松剂', '酸度调节剂', '稳定剂']);
assert.doesNotMatch(verifiedSodiumBicarbonate.adi, /GB 2760 限量未导入/);
const verifiedCalciumCarbonate = getIngredientById('calcium-carbonate', 'food');
assert.equal(verifiedCalciumCarbonate.category, '膨松剂');
assert.deepEqual(verifiedCalciumCarbonate.functions, ['膨松剂', '面粉处理剂', '稳定剂']);
assert.equal(verifiedCalciumCarbonate.usageLimits.length, 3);
assert.equal(verifiedCalciumCarbonate.usageLimits.some((limit) => limit.foodCategory.includes('07.03') && limit.limit === '按生产需要适量使用'), true);
const reviewedPotassiumCitrate = getIngredientById('potassium-citrate', 'food');
assert.equal(reviewedPotassiumCitrate.reviewStatus, 'reviewed');
assert.equal(reviewedPotassiumCitrate.confidenceLevel, 'medium');
assert.match(reviewedPotassiumCitrate.sourceUrl, /Home\/Chemical\/1875$/);
assert.match(reviewedPotassiumCitrate.adi, /NOT LIMITED/);
const reviewedSodiumNitrite = getIngredientById('sodium-nitrite', 'food');
assert.equal(reviewedSodiumNitrite.reviewStatus, 'reviewed');
assert.match(reviewedSodiumNitrite.adi, /as nitrite ion/);
assert.match(reviewedSodiumNitrite.adi, /does not apply to infants below 3 months/);
assert.match(reviewedSodiumNitrite.regulatoryBasis, /as nitrite ion/);
assert.match(reviewedSodiumNitrite.rawSourceText, /infants below 3 months/);
const reviewedPotassiumNitrate = getIngredientById('potassium-nitrate', 'food');
assert.equal(reviewedPotassiumNitrate.reviewStatus, 'reviewed');
assert.match(reviewedPotassiumNitrate.adi, /as nitrate ion/);
assert.match(reviewedPotassiumNitrate.adi, /does not apply to infants below 3 months/);
assert.match(reviewedPotassiumNitrate.regulatoryBasis, /as nitrate ion/);
assert.match(reviewedPotassiumNitrate.rawSourceText, /infants below 3 months/);
const gb2760StagingSummary = getGb2760OfficialStagingSummary();
assert.equal(gb2760StagingSummary.totalCount, 2404);
assert.equal(gb2760StagingSummary.ingredientCount, 91);
assert.equal(gb2760StagingSummary.statusCounts.verified, 13);
assert.equal(gb2760StagingSummary.statusCounts.needs_review, 2391);
assert.deepEqual(gb2760StagingSummary.sourceNames, [seedSourceName]);
assert.equal(gb2760OfficialStagingGenerationCoverage.pdfPageStart, 8);
assert.equal(gb2760OfficialStagingGenerationCoverage.pdfPageEnd, 148);
assert.equal(gb2760OfficialStagingGenerationCoverage.generatedRowCount, 2310);
assert.equal(gb2760OfficialStagingRecords.every((record) => record.sourceType === 'official_standard'), true);
assert.equal(gb2760OfficialStagingRecords.every((record) => /sppt\.cfsa\.net\.cn/.test(record.sourceUrl)), true);
assert.equal(gb2760OfficialStagingRecords.every((record) => record.pdfSha256 === '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-benzoate-jam' && record.reviewStatus === 'needs_review' && record.maxUseLevel === '1.0'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-potassium-sorbate-cheese-products' && record.note.includes('山梨酸')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-acesulfame-potassium-flavored-fermented-milk' && record.pdfPage === 21), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sulfur-dioxide-dried-fruit' && record.note.includes('二氧化硫残留量')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sunset-yellow-fcf-jam' && record.maxUseLevel === '0.5'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-allura-red-ac-meat-sausage' && record.maxUseLevel === '0.015'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-pectin-juice' && record.reviewStatus === 'needs_review' && record.pdfPage === 45 && record.maxUseLevel === '3.0'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-potassium-citrate-general' && record.ingredientId === 'potassium-citrate'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-carboxymethyl-cellulose-general' && record.foodCategoryName.includes('表 A.2')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-calcium-silicate-solid-beverage' && record.ingredientId === 'calcium-silicate'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-gellan-gum-general' && record.foodCategoryName.includes('各类食品')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-propylene-glycol-alginate-wet-noodles' && record.maxUseLevel === '5.0'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-alginate-medical-formula-child' && record.maxUseLevel === '按生产需要适量使用'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-carrageenan-infant-formula' && record.unit === 'g/L'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-calcium-chloride-other-drinking-water' && record.note.includes('Ca 计')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-natamycin-fermented-wine' && record.unit === 'g/L'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-nisin-beverages' && record.note.includes('即饮状态')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-calcium-disodium-edta-compound-seasoning' && record.maxUseLevel === '0.075'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-acetate-compound-seasoning' && record.maxUseLevel === '10.0'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sucralose-microwave-popcorn' && record.maxUseLevel === '5.0'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sucralose-beverages' && record.note.includes('即饮状态')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-disodium-ribonucleotides-general' && record.ingredientId === 'disodium-ribonucleotides'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-propionate-bread' && record.note.includes('丙酸计')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-lecithins-general' && record.additiveNameCn === '磷脂'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-phosphoric-acid-milk-products' && record.note.includes('磷酸根')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-dimethylpolysiloxane-surface-treated-fresh-fruit' && record.maxUseLevel === '0.0009'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-4-hexylresorcinol-fresh-aquatic-shrimp' && !record.ingredientId && record.note.includes('残留量')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-disodium-inosinate-general' && record.insNumber === '631'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-disodium-guanylate-general' && record.cnsNumber === '12.002'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-d-mannitol-candy' && record.foodCategoryCode === '05.02'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-dl-malate-general' && !record.ingredientId), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-tartaric-acids-wine' && record.unit === 'g/L'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-beta-apo-8-carotenal-beverages' && record.note.includes('即饮状态')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-beta-carotene-jelly' && record.note.includes('果冻粉')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-aspartame-bread' && record.pdfPage === 19 && record.note.includes('苯丙氨酸')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-advantame-jelly' && !record.ingredientId && record.pdfPage === 21), true);
assert.equal(gb2760OfficialStagingRecords.every((record) => !/[^\d]\d+\)$/u.test(record.additiveNameCn)), true);
assert.deepEqual(gb2760OfficialStagingRecords
  .filter((record) => record.id.includes('-generated-') && (
    /[A-Za-z]-?$/u.test(record.additiveNameCn)
    || /[\[【][^\]】)]*$/u.test(record.additiveNameCn)
    || /又名(?:吐温|司盘)$/u.test(record.additiveNameCn)
    || /^时允许/u.test(record.additiveNameCn)
  ))
  .map((record) => record.id), []);
assert.deepEqual(gb2760OfficialStagingRecords
  .filter((record) => record.id.includes('-generated-') && (
    /^(?:物油|缩黄油)/u.test(record.foodCategoryName)
    || /熟肉制品蛋制品|焙烤食品调味品/u.test(record.foodCategoryName)
    || /(?:植|浓|脱|香)$/u.test(record.foodCategoryName)
  ))
  .map((record) => record.id), []);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.pdfPage === 20 && record.foodCategoryCode === '01.02.02' && record.additiveNameCn.startsWith('爱德万甜')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p107-r007' && record.additiveNameCn.includes('DA-TEM')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p110-r001' && record.additiveNameCn.includes('司盘80')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p120-r001' && record.additiveNameCn.includes('吐温60') && record.additiveNameCn.includes('吐温80')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p106-r015' && record.insNumber === '262(ii)' && !record.ingredientId), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p113-r005' && record.insNumber === '500(i)' && !record.ingredientId), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-sodium-bicarbonate-general' && record.insNumber === '500(ii)' && record.ingredientId === 'sodium-bicarbonate'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.pdfPage === 16 && record.foodCategoryCode === '04.0' && record.foodCategoryName.includes('食用菌和藻类罐头') && /除外[)）]$/u.test(record.foodCategoryName)), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p052-r002' && record.foodCategoryName.includes('脱水蛋制品') && record.foodCategoryName.endsWith('除外]')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p063-r004' && record.foodCategoryName === '调味品(12.01盐及代盐制品、12.09香辛料类除外)(仅限用于膨化食品的调味料)'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p110-r003' && record.foodCategoryName.startsWith('脂肪、油和乳化脂肪制品') && record.foodCategoryName.includes('缩黄油除外')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p073-r014' && record.foodCategoryCode === '06.05.02.04' && record.foodCategoryName === '粉圆'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p033-r005' && record.ingredientId === 'butylated-hydroxyanisole'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-benzoic-acid-carbonated-beverages' && record.note.includes('苯甲酸计')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-tea-polyphenols-puffed-foods' && record.note.includes('油脂中儿茶素')), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-butylated-hydroxyanisole-chewing-gum' && record.ingredientId === 'butylated-hydroxyanisole'), true);
assert.equal(gb2760OfficialStagingRecords.some((record) => record.id === 'gb2760-2024-a1-generated-p148-r015' && record.additiveNameCn === '紫胶红(又名虫胶红)' && record.foodCategoryCode === '15.02'), true);
assert.deepEqual(validateGb2760OfficialStaging(), []);
assert.deepEqual(validateGb2760OfficialSeedCoverage(), []);
const gb2760SeedCoverageReport = getGb2760OfficialSeedCoverageReport();
assert.equal(gb2760SeedCoverageReport.seedCount, 100);
assert.equal(gb2760SeedCoverageReport.matchingSeedCount, 91);
assert.equal(gb2760SeedCoverageReport.matchingCoveredSeedCount, 91);
assert.equal(gb2760SeedCoverageReport.notApplicableSeedCount, 9);
assert.deepEqual(gb2760SeedCoverageReport.unexpectedUncoveredSeedIds, []);
assert.deepEqual(gb2760SeedCoverageReport.notApplicableSeedIds, [
  'calcium-citrate',
  'citral',
  'ethyl-maltol',
  'ethyl-vanillin',
  'isomalt',
  'konjac-gum',
  'menthol',
  'potassium-benzoate',
  'vanillin'
]);
const gb2760StagingQualityReport = getGb2760OfficialStagingQualityReport();
assert.equal(gb2760StagingQualityReport.totalCount, 2404);
assert.equal(gb2760StagingQualityReport.linkedIngredientCount, 91);
assert.equal(gb2760StagingQualityReport.unlinkedCount, 1447);
assert.equal(gb2760StagingQualityReport.pdfPageCount, 141);
const gb2760FullTextSummary = getGb2760OfficialFullTextSummary();
assert.equal(gb2760FullTextSummary.totalPages, 264);
assert.equal(gb2760FullTextSummary.textSha256Count, 264);
assert.deepEqual(gb2760FullTextSummary.emptyTextPages, []);
assert.equal(gb2760OfficialFullTextPages[0].pdfPage, 1);
assert.match(gb2760OfficialFullTextPages[0].text, /食品添加剂使用标准/);
assert.equal(gb2760OfficialFullTextPages[254].pdfPage, 255);
assert.match(gb2760OfficialFullTextPages[254].text, /附录 A 中食品添加剂使用规定索引/);
assert.equal(gb2760OfficialFullTextPages.at(-1).pdfPage, 264);
assert.match(gb2760OfficialFullTextPages.at(-1).text, /紫胶红/);
assert.deepEqual(validateGb2760OfficialFullText(), []);
const gb2760FullTextQualityReport = getGb2760OfficialFullTextQualityReport();
assert.equal(gb2760FullTextQualityReport.totalPages, 264);
assert.equal(gb2760FullTextQualityReport.textSha256Count, 264);
assert.deepEqual(gb2760FullTextQualityReport.emptyTextPages, []);
assert.deepEqual(validateGb2760OfficialReferenceTables(), []);
assert.equal(gb2760OfficialA2ExceptionFoodCategories.length, 68);
assert.equal(gb2760OfficialB1NoFlavorFoodCategories.length, 29);
assert.equal(gb2760OfficialB2NaturalFlavorRows.length, 388);
assert.equal(gb2760OfficialB3SyntheticFlavorRows.length, 1504);
assert.equal(gb2760OfficialC1ProcessingAidRows.length, 37);
assert.equal(gb2760OfficialC2ProcessingAidRows.length, 80);
assert.equal(gb2760OfficialC3EnzymePreparationRows.length, 66);
assert.equal(gb2760OfficialDFunctionCategoryRows.length, 23);
assert.equal(gb2760OfficialE1FoodCategoryRows.length, 318);
assert.equal(gb2760OfficialFAdditiveIndexRows.length, 286);
assert.equal(gb2760OfficialReferenceRows.length, 2799);
assert.equal(gb2760OfficialA2ExceptionFoodCategories[0].exceptionNumber, 1);
assert.equal(gb2760OfficialA2ExceptionFoodCategories[0].foodCategoryCode, '01.01.01');
assert.equal(gb2760OfficialA2ExceptionFoodCategories[0].foodCategoryName, '巴氏杀菌乳');
assert.equal(gb2760OfficialA2ExceptionFoodCategories.at(-1).exceptionNumber, 68);
assert.equal(gb2760OfficialA2ExceptionFoodCategories.at(-1).foodCategoryCode, '16.02.01');
assert.equal(gb2760OfficialA2ExceptionFoodCategories.at(-1).foodCategoryName, '茶叶、咖啡');
assert.equal(gb2760OfficialA2ExceptionFoodCategories.some((row) => row.exceptionNumber === 67 && row.foodCategoryCode === '15.03.01.04' && row.foodCategoryName.includes('浓缩葡萄汁')), true);
assert.equal(gb2760OfficialB1NoFlavorFoodCategories[0].foodCategoryCode, '01.01.01');
assert.equal(gb2760OfficialB1NoFlavorFoodCategories[0].foodCategoryName, '巴氏杀菌乳');
assert.equal(gb2760OfficialB1NoFlavorFoodCategories.at(-1).foodCategoryCode, '16.02.01');
assert.equal(gb2760OfficialB1NoFlavorFoodCategories.at(-1).foodCategoryName, '茶叶、咖啡');
assert.equal(gb2760OfficialB1NoFlavorFoodCategories.some((row) => row.foodCategoryCode === '13.01' && row.footnoteMarker === 'a'), true);
const b1FootnotedSourceRow = gb2760OfficialB1NoFlavorFoodCategories.find((row) => row.foodCategoryCode === '13.01');
assert.match(b1FootnotedSourceRow.rawSourceText, /5 mg\/100 mL/);
assert.match(b1FootnotedSourceRow.rawSourceText, /7 mg\/100g/);
assert.match(b1FootnotedSourceRow.rawSourceText, /0~6个月婴幼儿配方食品不得添加任何食用香料/);
assert.doesNotMatch(b1FootnotedSourceRow.rawSourceText, /。。/);
assert.equal(gb2760OfficialB1Footnotes.a.exceptionUses.length, 4);
assert.equal(gb2760OfficialB1Footnotes.a.exceptionUses.some((item) => item.foodCategoryCode === '13.02.01' && item.maxUseLevel === '7 mg/100g'), true);
assert.equal(gb2760OfficialB2NaturalFlavorRows[0].flavorCode, 'N001');
assert.equal(gb2760OfficialB2NaturalFlavorRows[0].flavorNameCn, '丁香叶油');
assert.equal(gb2760OfficialB2NaturalFlavorRows.at(-1).flavorCode, 'N404');
assert.equal(gb2760OfficialB2NaturalFlavorRows.at(-1).femaNumber, '4831');
assert.equal(gb2760OfficialB3SyntheticFlavorRows[0].flavorCode, 'S0001');
assert.equal(gb2760OfficialB3SyntheticFlavorRows.at(-1).flavorCode, 'S1506');
assert.equal(gb2760OfficialB3SyntheticFlavorRows.at(-1).flavorNameCn, '2-己基吡啶');
const b3SyntheticFlavorRow1363 = gb2760OfficialB3SyntheticFlavorRows.find((row) => row.rowNumber === 1363);
assert.equal(b3SyntheticFlavorRow1363.flavorNameCn, '对-烷醇-2(又名对-薄荷烷醇-2)');
assert.equal(gb2760OfficialC1ProcessingAidRows[0].processingAidNameCn, '氨水及液氨');
const c1ProcessingAidRow17 = gb2760OfficialC1ProcessingAidRows.find((row) => row.rowNumber === 17);
assert.equal(c1ProcessingAidRow17.processingAidNameCn, '氯化钾');
assert.equal(c1ProcessingAidRow17.processingAidNameEn, 'potassiumchloride');
assert.equal(gb2760OfficialC1ProcessingAidRows.some((row) => /[A-Za-z]/u.test(row.processingAidNameCn)), false);
const c2ProcessingAidRow1 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 1);
assert.equal(c2ProcessingAidRow1.processingAidNameCn, '1-丁醇');
assert.equal(c2ProcessingAidRow1.processingAidNameEn, '1-butanol');
const c2ProcessingAidRow11 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 11);
assert.match(c2ProcessingAidRow11.useScope, /^薯类的加工工艺、油脂加工工艺/u);
assert.doesNotMatch(c2ProcessingAidRow11.useScope, /^艺/u);
const c2ProcessingAidRow12 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 12);
assert.match(c2ProcessingAidRow12.useScope, /^啤酒、葡萄酒、果酒、黄酒、配制酒/u);
const c2ProcessingAidRow34 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 34);
assert.match(c2ProcessingAidRow34.processingAidNameCn, /^聚氧乙烯\(20\)山梨醇酐单月桂酸酯/u);
assert.match(c2ProcessingAidRow34.useScope, /^制糖工艺、发酵工艺、提取工艺/u);
const c2ProcessingAidRow37 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 37);
assert.equal(c2ProcessingAidRow37.useScope, '啤酒加工工艺');
const c2ProcessingAidRow38 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 38);
assert.match(c2ProcessingAidRow38.useScope, /^啤酒、葡萄酒、果酒、配制酒、黄酒/u);
const c2ProcessingAidRow43 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 43);
assert.equal(c2ProcessingAidRow43.processingAidNameCn, '磷酸二氢钠');
assert.equal(c2ProcessingAidRow43.processingAidNameEn, 'sodiumdihydrogenphosphate');
assert.doesNotMatch(c2ProcessingAidRow43.rawSourceText, /包括磷酸|磷酸湿法/u);
const c2ProcessingAidRow77 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 77);
assert.equal(c2ProcessingAidRow77.useScope, '制糖工艺、豆制品加工工艺');
const c2ProcessingAidRow78 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 78);
assert.match(c2ProcessingAidRow78.useScope, /^啤酒、葡萄酒、果酒和配制酒的加工工艺/u);
assert.doesNotMatch(c2ProcessingAidRow78.useScope, /^的加工工艺/u);
const c2ProcessingAidRow79 = gb2760OfficialC2ProcessingAidRows.find((row) => row.rowNumber === 79);
assert.equal(c2ProcessingAidRow79.processingAidNameCn, '正己烷');
assert.equal(c2ProcessingAidRow79.processingAidNameEn, 'n-hexane');
assert.equal(gb2760OfficialC2ProcessingAidRows.at(-1).processingAidNameCn, '植物活性炭(稻壳来源)');
assert.equal(gb2760OfficialC2ProcessingAidRows.at(-1).useScope, '油脂加工工艺');
const c3EnzymeRow2 = gb2760OfficialC3EnzymePreparationRows.find((row) => row.rowNumber === 2);
assert.deepEqual(c3EnzymeRow2.pdfPages, [233]);
assert.doesNotMatch(c3EnzymeRow2.rawSourceText, /热解蛋白无氧芽孢杆菌|雪白根霉|calf,kid,orlamb/u);
assert.match(c3EnzymeRow2.rawSourceText, /Geobacillusstearothermophilus/u);
const c3EnzymeRow3 = gb2760OfficialC3EnzymePreparationRows.find((row) => row.rowNumber === 3);
assert.equal(c3EnzymeRow3.enzymeName, 'α-淀粉酶Alpha-amylase');
assert.doesNotMatch(c3EnzymeRow3.source, /^misstearothermoph/u);
const c3EnzymeRow50 = gb2760OfficialC3EnzymePreparationRows.find((row) => row.rowNumber === 50);
assert.equal(c3EnzymeRow50.enzymeName, '乳糖酶(β-半乳糖苷酶)Lactase(beta-galactosidase)');
assert.match(c3EnzymeRow50.source, /Bifidobacteriumbifidum/u);
assert.doesNotMatch(c3EnzymeRow50.source, /^tis/u);
assert.equal(gb2760OfficialC3EnzymePreparationRows.at(-1).enzymeName, '转葡糖苷酶Transglucosidase');
assert.equal(gb2760OfficialDFunctionCategoryRows.find((row) => row.rowNumber === 21).functionCategoryName, '食品用香料');
assert.match(gb2760OfficialDFunctionCategoryRows.find((row) => row.rowNumber === 21).definition, /产生香味/);
assert.equal(gb2760OfficialE1FoodCategoryRows[0].foodCategoryCode, '01.0');
assert.equal(gb2760OfficialE1FoodCategoryRows.at(-1).foodCategoryCode, '16.07');
assert.equal(gb2760OfficialFAdditiveIndexRows[0].additiveNameCn, '4-己基间苯二酚');
const appendixFAdditiveIndexRow16 = gb2760OfficialFAdditiveIndexRows.find((row) => row.rowNumber === 16);
assert.equal(appendixFAdditiveIndexRow16.additiveNameCn, 'β-胡萝卜素');
assert.equal(appendixFAdditiveIndexRow16.insNumber, '160a(i),160a(iii),160a(iv)');
const appendixFAdditiveIndexRow134 = gb2760OfficialFAdditiveIndexRows.find((row) => row.rowNumber === 134);
assert.equal(appendixFAdditiveIndexRow134.additiveNameCn, '磷酸化二淀粉磷酸酯');
assert.equal(appendixFAdditiveIndexRow134.insNumber, '1413');
const appendixFAdditiveIndexRow135 = gb2760OfficialFAdditiveIndexRows.find((row) => row.rowNumber === 135);
assert.match(appendixFAdditiveIndexRow135.additiveNameCn, /磷酸及磷酸盐\[包括磷酸/u);
assert.doesNotMatch(appendixFAdditiveIndexRow135.additiveNameCn, /(?:338|339|340|341|342|450|451|452)\(/u);
assert.equal(appendixFAdditiveIndexRow135.insNumber, '338,450(i),450(iii),341(i),340(i),342(ii),340(ii),341(ii),341(iii),340(iii),339(iii),452(i),451(i),339(i),339(ii),450(v),450(ii),452(ii),450(vii)');
const appendixFAdditiveIndexRow205 = gb2760OfficialFAdditiveIndexRows.find((row) => row.rowNumber === 205);
assert.match(appendixFAdditiveIndexRow205.additiveNameCn, /^司盘类\[包括/u);
assert.equal(appendixFAdditiveIndexRow205.insNumber, '493,495,491,492,494');
const appendixFAdditiveIndexRow206 = gb2760OfficialFAdditiveIndexRows.find((row) => row.rowNumber === 206);
assert.equal(appendixFAdditiveIndexRow206.additiveNameCn, '松香季戊四醇酯');
assert.equal(appendixFAdditiveIndexRow206.insNumber, '—');
assert.equal(gb2760OfficialFAdditiveIndexRows.at(-1).additiveNameCn, '紫胶红(又名虫胶红)');
assert.equal(gb2760OfficialReferenceRows.every((row) => row.reviewStatus === 'needs_review'), true);
assert.equal(gb2760OfficialReferenceRows.some((row) => row.rowCode === '67' && row.rowData.foodCategoryCode === '15.03.01.04'), true);
const b1FootnotedReferenceRow = gb2760OfficialReferenceRows.find((row) => row.tableName === '表 B.1' && row.rowCode === '13.02');
assert.equal(b1FootnotedReferenceRow.rowData.flavorUseRestriction, 'no_added_food_flavor_with_footnote_exceptions');
assert.equal(b1FootnotedReferenceRow.rowData.footnote.text, gb2760OfficialB1Footnotes.a.text);
assert.equal(b1FootnotedReferenceRow.rowData.footnote.exceptionUses.some((item) => item.flavorName === '乙基香兰素' && item.maxUseLevel === '5 mg/100 mL'), true);
assert.match(validateGb2760OfficialReferenceTables(gb2760OfficialReferenceRows.slice(1), gb2760OfficialA2ExceptionFoodCategories).join('\n'), /must cover all 表 A\.2 rows/);
assert.match(validateGb2760OfficialReferenceTables(gb2760OfficialReferenceRows.filter((row) => row.id !== 'gb2760-2024-b1-no-flavor-001'), gb2760OfficialA2ExceptionFoodCategories, gb2760OfficialB1NoFlavorFoodCategories).join('\n'), /must cover all 表 B\.1 rows/);
assert.match(validateGb2760OfficialReferenceTables(gb2760OfficialReferenceRows.map((row) => (
  row.id === 'gb2760-2024-b1-no-flavor-025'
    ? { ...row, rowData: { ...row.rowData, footnote: undefined } }
    : row
)), gb2760OfficialA2ExceptionFoodCategories, gb2760OfficialB1NoFlavorFoodCategories).join('\n'), /footnote\.text must preserve B\.1 footnote a/);
assert.match(validateGb2760OfficialReferenceTables(gb2760OfficialReferenceRows.map((row) => (
  row.id === 'gb2760-2024-b1-no-flavor-025'
    ? { ...row, rowData: { ...row.rowData, flavorUseRestriction: 'no_added_food_flavor', footnoteMarker: '', footnote: undefined } }
    : row
)), gb2760OfficialA2ExceptionFoodCategories, gb2760OfficialB1NoFlavorFoodCategories).join('\n'), /footnoteMarker must match the B\.1 source footnote marker/);
const gb2760ReferenceSummary = getGb2760OfficialReferenceTableSummary();
assert.equal(gb2760ReferenceSummary.totalRows, 2799);
assert.equal(gb2760ReferenceSummary.b1NoFlavorFoodCategoryCount, 29);
assert.equal(gb2760ReferenceSummary.b2NaturalFlavorCount, 388);
assert.equal(gb2760ReferenceSummary.b3SyntheticFlavorCount, 1504);
assert.equal(gb2760ReferenceSummary.c3EnzymePreparationCount, 66);
assert.equal(gb2760ReferenceSummary.e1FoodCategoryCount, 318);
assert.equal(gb2760ReferenceSummary.fAdditiveIndexCount, 286);
assert.deepEqual(gb2760ReferenceSummary.tableNames, ['表 A.2', '表 B.1', '表 B.2', '表 B.3', '表 C.1', '表 C.2', '表 C.3', '附录 D', '表 E.1', '附录 F']);
assert.equal(gb2760ReferenceSummary.pdfPages[0], 149);
assert.equal(gb2760ReferenceSummary.pdfPages.at(-1), 264);
assert.equal(gb2760ReferenceSummary.pdfPages.length, 115);
const gb2760ReferenceQualityReport = getGb2760OfficialReferenceTableQualityReport();
assert.equal(gb2760ReferenceQualityReport.totalRows, 2799);
assert.equal(gb2760ReferenceQualityReport.a2ExceptionFoodCategoryCount, 68);
assert.equal(gb2760ReferenceQualityReport.b1NoFlavorFoodCategoryCount, 29);
assert.equal(gb2760ReferenceQualityReport.b2NaturalFlavorCount, 388);
assert.equal(gb2760ReferenceQualityReport.b3SyntheticFlavorCount, 1504);
assert.equal(gb2760ReferenceQualityReport.c1ProcessingAidCount, 37);
assert.equal(gb2760ReferenceQualityReport.c2ProcessingAidCount, 80);
assert.equal(gb2760ReferenceQualityReport.c3EnzymePreparationCount, 66);
assert.equal(gb2760ReferenceQualityReport.dFunctionCategoryCount, 23);
assert.equal(gb2760ReferenceQualityReport.e1FoodCategoryCount, 318);
assert.equal(gb2760ReferenceQualityReport.fAdditiveIndexCount, 286);
assert.equal(gb2760ReferenceQualityReport.pdfPageCount, 115);
assert.match(validateGb2760OfficialStaging([{ ...gb2760OfficialStagingRecords[0], sourceName: '第三方镜像站' }]).join('\n'), /sourceName must be the official/);
assert.match(validateGb2760OfficialStaging([{ ...gb2760OfficialStagingRecords[0], reviewStatus: 'verified', extractionStatus: 'extracted' }]).join('\n'), /verified reviewStatus requires extractionStatus/);
const foodAuditSummary = getDatasetAuditSummary('food');
assert.equal(foodAuditSummary.totalCount, 112);
assert.equal(foodAuditSummary.categoryCount, 16);
assert.equal(foodAuditSummary.draftCount, 80);
assert.equal(foodAuditSummary.reviewedCount, 27);
assert.equal(foodAuditSummary.verifiedCount, 5);
assert.equal(foodAuditSummary.reviewedOrVerifiedCount, 32);
assert.equal(foodAuditSummary.dataStatusCounts.verified_regulation, 5);
assert.equal(foodAuditSummary.dataStatusCounts.verified_jecfa, 27);
assert.equal(foodAuditSummary.dataStatusCounts.common_ingredient, 12);
assert.equal(foodAuditSummary.dataStatusCounts.unverified, 68);
assert.equal(foodAuditSummary.confidenceCounts.high, 5);
assert.equal(foodAuditSummary.confidenceCounts.medium, 27);
assert.equal(foodAuditSummary.confidenceCounts.low, 12);
assert.equal(foodAuditSummary.confidenceCounts.unverified, 68);
assert.equal(foodAuditSummary.withUsageLimitsCount, 5);
assert.equal(foodAuditSummary.missingUsageLimitsCount, 95);
assert.equal(foodAuditSummary.mvpMinimumReached, true);
const foodSourceSummaries = getDatasetSourceSummaries('food');
assert.equal(foodSourceSummaries.length, 38);
assert.equal(foodSourceSummaries[0].recordCount, 73);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'GB 2760-2024'), true);
assert.equal(foodSourceSummaries.some((item) => item.title.includes('2024年 第1号') && item.standard === 'GB 2760-2024'), true);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'FAO/WHO JECFA'), true);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'Internal common ingredient lexicon' && item.recordCount === 12), true);
const foodVersionSummaries = getDatasetVersionSummaries('food');
assert.deepEqual(foodVersionSummaries, [{ version: 'food-authority-foundation-v1', count: 112, latestUpdatedAt: '2026-06-12' }]);
const foodCategorySummaries = getIngredientCategorySummaries('food');
assert.deepEqual(getCategoryStats('food').slice(0, 3).map((item) => item.name), foodCategorySummaries.slice(0, 3).map((item) => item.name));
assert.equal(foodCategorySummaries.find((item) => item.name === '酸度调节剂').count, 9);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').count, 12);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.medium, 11);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.high, 1);
assert.equal(foodCategorySummaries.find((item) => item.name === '着色剂').count, 12);
assert.equal(foodCategorySummaries.find((item) => item.name === '增味剂').count, 2);
assert.equal(foodCategorySummaries.find((item) => item.name === '甜味剂').count, 11);
assert.equal(foodCategorySummaries.find((item) => item.name === '增稠剂').count, 11);
assert.equal(foodCategorySummaries.find((item) => item.name === '乳化剂').count, 8);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗氧化剂').count, 9);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗结剂').count, 1);
assert.equal(foodCategorySummaries.find((item) => item.name === '膨松剂').count, 7);
assert.equal(foodCategorySummaries.find((item) => item.name === '稳定剂').count, 3);
assert.equal(foodCategorySummaries.find((item) => item.name === '香料类').count, 5);
assert.equal(foodCategorySummaries.find((item) => item.name === '其他').count, 7);
assert.equal(foodCategorySummaries.find((item) => item.name === '普通食品配料').count, 12);
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
assert.doesNotMatch(detailHtmlWithRelatedIngredients, /data-food-audit-note/);
assert.match(detailHtmlWithRelatedIngredients, /data-provenance-details/);
assert.match(detailHtmlWithRelatedIngredients, /来源与可信等级/);
assert.match(detailHtmlWithRelatedIngredients, /GB 2760 已验证/);
assert.match(detailHtmlWithRelatedIngredients, /高可信/);
assert.match(detailHtmlWithRelatedIngredients, /JECFA 3594/);
assert.match(detailHtmlWithRelatedIngredients, /可信来源确认[\s\S]*是/);
assert.match(detailHtmlWithRelatedIngredients, /使用限量/);
assert.match(detailHtmlWithRelatedIngredients, /按生产需要适量使用/);
assert.match(detailHtmlWithRelatedIngredients, /PDF page 89 \/ 标准页 68/);
assert.match(detailHtmlWithRelatedIngredients, /相关成分/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/ingredient\/sodium-citrate"/);
assert.match(detailHtmlWithRelatedIngredients, /同属酸度调节剂/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/search\?q=%E6%8A%97%E6%B0%A7%E5%8C%96%E5%89%82"/);
assert.match(detailHtmlWithRelatedIngredients, /data-support-correction-link/);
assert.match(detailHtmlWithRelatedIngredients, /href="#\/food\/support\?topic=data-correction/);
assert.match(detailHtmlWithRelatedIngredients, /%E6%9F%A0%E6%AA%AC%E9%85%B8\+%E6%95%B0%E6%8D%AE%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9/);
const missingIngredientHtml = renderRoute(resolveRoute('#/food/ingredient/not-in-dataset'));
assert.match(missingIngredientHtml, /data-missing-ingredient/);
assert.match(missingIngredientHtml, /该成分暂未收录/);
assert.match(missingIngredientHtml, /href="#\/food\/search\?q=not-in-dataset"/);
assert.match(missingIngredientHtml, /data-support-correction-link/);
assert.match(missingIngredientHtml, /href="#\/food\/support\?topic=data-correction/);
const emptyLoadingDetailHtml = renderDetailPage('', 'food', { status: 'loading' });
assert.match(emptyLoadingDetailHtml, /data-missing-ingredient/);
assert.doesNotMatch(emptyLoadingDetailHtml, /data-detail-loading/);
const loadingDetailHtml = renderDetailPage('citric-acid', 'food', { status: 'loading' });
assert.match(loadingDetailHtml, /data-detail-loading/);
assert.match(loadingDetailHtml, /skeleton-card/);
const errorDetailHtml = renderDetailPage('citric-acid', 'food', { status: 'error' });
assert.match(errorDetailHtml, /data-api-error/);
assert.match(errorDetailHtml, /data-route-retry/);

const filteredSearchHtml = renderSearchPage('', 'food', { risk: 'medium', ingredientCategory: '防腐剂' });
assert.match(filteredSearchHtml, /筛选结果/);
assert.match(filteredSearchHtml, /data-badge--unverified/);
assert.match(filteredSearchHtml, /未验证/);
assert.match(filteredSearchHtml, /value="medium" selected/);
assert.match(filteredSearchHtml, /value="防腐剂" selected/);
assert.match(filteredSearchHtml, /关注等级：需关注/);
assert.match(filteredSearchHtml, /成分分类：防腐剂/);
assert.match(filteredSearchHtml, /href="#\/food\/search"/);
const cosmeticSearchHtml = renderSearchPage('retinol', 'cosmetics');
assert.doesNotMatch(cosmeticSearchHtml, /data-badge--unverified/);
const homeHtmlWithCategoryFilters = renderHomePage('food');
assert.match(homeHtmlWithCategoryFilters, /data-home-hero/);
assert.match(homeHtmlWithCategoryFilters, /data-home-primary-scan/);
assert.match(homeHtmlWithCategoryFilters, /href="#\/food\/scan"/);
assert.match(homeHtmlWithCategoryFilters, /data-home-search/);
assert.match(homeHtmlWithCategoryFilters, /data-home-categories/);
assert.match(homeHtmlWithCategoryFilters, /拍照识别配料表/);
assert.match(homeHtmlWithCategoryFilters, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(homeHtmlWithCategoryFilters, /href="#\/food\/data"/);
assert.match(homeHtmlWithCategoryFilters, /查看来源与审核/);
assert.match(homeHtmlWithCategoryFilters, /酸度调节剂[\s\S]*9 项/);
assert.match(homeHtmlWithCategoryFilters, /data-dataset-audit/);
assert.match(homeHtmlWithCategoryFilters, /112 条[\s\S]*当前记录/);
assert.match(homeHtmlWithCategoryFilters, /32 条[\s\S]*已复核\/验证/);
assert.match(homeHtmlWithCategoryFilters, /5%[\s\S]*限量覆盖/);
const dataPageHtml = renderRoute(resolveRoute('#/food/data'));
assert.match(dataPageHtml, /数据来源与审核状态/);
assert.match(dataPageHtml, /data-dataset-detail/);
assert.match(dataPageHtml, /data-review-queue/);
assert.match(dataPageHtml, /人工校验队列/);
assert.match(dataPageHtml, /112 条[\s\S]*当前记录/);
assert.match(dataPageHtml, /data-data-filter-form/);
assert.match(dataPageHtml, /name="source"/);
assert.match(dataPageHtml, /name="confidenceLevel"/);
assert.match(dataPageHtml, /name="dataStatus"/);
assert.match(await readFile(new URL('../src/pages/dataPage.js', import.meta.url), 'utf8'), /<p class="filter-summary">\$\{escapeHtml\(renderDataFilterSummary/);
assert.match(dataPageHtml, /61%[\s\S]*待审核/);
assert.match(dataPageHtml, /可信等级/);
assert.match(dataPageHtml, /待审核/);
assert.match(dataPageHtml, /中可信/);
assert.match(dataPageHtml, /数据状态/);
assert.match(dataPageHtml, /verified_regulation/);
assert.match(dataPageHtml, /verified_jecfa/);
assert.match(dataPageHtml, /common_ingredient/);
assert.match(dataPageHtml, /38 个来源/);
assert.match(dataPageHtml, /食品安全国家标准 食品添加剂使用标准/);
assert.match(dataPageHtml, /GB 2760/);
assert.match(dataPageHtml, /food-authority-foundation-v1/);
assert.match(dataPageHtml, /缺逐食品类别限量/);
assert.match(dataPageHtml, /静态待复核/);
assert.match(dataPageHtml, /68 项[\s\S]*静态待复核/);
assert.match(dataPageHtml, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(dataPageHtml, /data-dataset-correction-link/);
assert.match(dataPageHtml, /href="#\/food\/support\?topic=data-correction/);
assert.match(dataPageHtml, /%E6%95%B0%E6%8D%AE%E6%9D%A5%E6%BA%90%E6%88%96%E5%AE%A1%E6%A0%B8%E7%8A%B6%E6%80%81%E9%9C%80%E8%A6%81%E6%A0%B8%E5%AF%B9/);
const ocrQueueReport = createAnalysisReport('神秘配料', 'food', { source: 'ocr', productName: 'OCR队列样本' });
writeJson('compcheck:analysis-reports', [ocrQueueReport]);
const dataPageWithOcrQueueHtml = renderRoute(resolveRoute('#/food/data'));
assert.match(dataPageWithOcrQueueHtml, /OCR 未收录/);
assert.match(dataPageWithOcrQueueHtml, /神秘配料/);
assert.match(dataPageWithOcrQueueHtml, /OCR队列样本/);
assert.match(dataPageWithOcrQueueHtml, /来源范围：OCR 未匹配/);
assert.match(dataPageWithOcrQueueHtml, /提交校验线索/);
writeJson('compcheck:analysis-reports', []);
const filteredDataPageHtml = renderRoute(resolveRoute(`#/food/data?source=${encodeURIComponent(seedSourceName)}&confidenceLevel=unverified`));
assert.match(filteredDataPageHtml, /当前筛选 68 \/ 112 条记录/);
assert.match(filteredDataPageHtml, /value="国家卫生健康委公告（2024年第1号）\/ 食品安全国家标准数据检索平台" selected/);
assert.match(filteredDataPageHtml, /value="unverified" selected/);
assert.match(filteredDataPageHtml, /href="#\/food\/data"[\s\S]*清除/);
const filteredReviewedDataPageHtml = renderRoute(resolveRoute('#/food/data?source=WHO%20JECFA%20Food%20Additives%20and%20Contaminants%20Database&confidenceLevel=medium'));
assert.match(filteredReviewedDataPageHtml, /当前筛选 27 \/ 112 条记录/);
assert.match(filteredReviewedDataPageHtml, /value="medium" selected/);
const filteredVerifiedRegulationDataPageHtml = renderRoute(resolveRoute(`#/food/data?source=${encodeURIComponent(seedSourceName)}&confidenceLevel=high&dataStatus=verified_regulation`));
assert.match(filteredVerifiedRegulationDataPageHtml, /当前筛选 5 \/ 112 条记录/);
assert.match(filteredVerifiedRegulationDataPageHtml, /value="high" selected/);
assert.match(filteredVerifiedRegulationDataPageHtml, /value="verified_regulation" selected/);
const filteredCommonDataPageHtml = renderRoute(resolveRoute('#/food/data?dataStatus=common_ingredient'));
assert.match(filteredCommonDataPageHtml, /当前筛选 12 \/ 112 条记录/);
assert.match(filteredCommonDataPageHtml, /value="common_ingredient" selected/);
assert.match(renderDataPage('cosmetics'), /当前类别含 8 条原型数据/);
const searchHtmlWithSuggestions = renderSearchPage('E330', 'food');
assert.match(searchHtmlWithSuggestions, /data-search-suggestions/);
assert.match(searchHtmlWithSuggestions, /suggestion-item/);
assert.match(searchHtmlWithSuggestions, /柠檬酸/);
assert.match(searchHtmlWithSuggestions, /E-number：E330/);
assert.match(searchHtmlWithSuggestions, /data-dataset-audit-note/);
assert.match(searchHtmlWithSuggestions, /112 条记录/);
assert.match(searchHtmlWithSuggestions, /使用限量和 ADI 原文仍在审核中/);
const apiLoadingSearchHtml = renderSearchPage('E330', 'food', {}, 1, 'relevance', { status: 'loading' });
assert.match(apiLoadingSearchHtml, /data-search-loading/);
assert.match(apiLoadingSearchHtml, /正在从后端数据库读取成分数据/);
assert.match(apiLoadingSearchHtml, /skeleton-card/);
const apiErrorSearchHtml = renderSearchPage('E330', 'food', {}, 1, 'relevance', { status: 'error' });
assert.match(apiErrorSearchHtml, /data-api-error/);
assert.match(apiErrorSearchHtml, /已降级为本地草稿数据/);
assert.match(apiErrorSearchHtml, /data-route-retry/);
const apiSuccessSearchHtml = renderSearchPage('E330', 'food', {}, 1, 'relevance', {
  status: 'success',
  page: 1,
  total: 1,
  totalPages: 1,
  items: [getIngredientById('citric-acid', 'food')]
});
assert.match(apiSuccessSearchHtml, /data-api-success/);
assert.match(apiSuccessSearchHtml, /当前结果来自后端数据库/);
const apiRiskSortedHtml = renderSearchPage('', 'food', {}, 1, 'risk', {
  status: 'success',
  page: 1,
  total: 2,
  totalPages: 1,
  items: [getIngredientById('citric-acid', 'food'), getIngredientById('sodium-benzoate', 'food')]
});
assert.equal(apiRiskSortedHtml.indexOf('苯甲酸钠') < apiRiskSortedHtml.indexOf('柠檬酸'), true);
const apiFacetSourceHtml = renderSearchPage('', 'food', {}, 1, 'relevance', {
  status: 'success',
  page: 1,
  total: 1,
  totalPages: 1,
  items: [getIngredientById('sodium-benzoate', 'food')],
  riskFacets: [
    { level: 'high', count: 1 },
    { level: 'medium', count: 3 }
  ],
  categoryFacets: [
    { name: '后端新增分类', count: 2 },
    { name: '防腐剂', count: 1 }
  ]
});
assert.match(apiFacetSourceHtml, /后端新增分类[\s\S]*2/);
assert.match(apiFacetSourceHtml, /防腐剂[\s\S]*1/);
assert.match(apiFacetSourceHtml, /高关注[\s\S]*1/);
assert.match(apiFacetSourceHtml, /需关注[\s\S]*3/);
assert.doesNotMatch(apiFacetSourceHtml, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82" data-route>[\s\S]*<span>酸度调节剂<\/span>/);
const apiClampedPageHtml = renderSearchPage('', 'food', {}, 999, 'relevance', {
  status: 'success',
  page: 2,
  total: 7,
  totalPages: 2,
  items: [getIngredientById('sodium-benzoate', 'food')]
});
assert.match(apiClampedPageHtml, /显示第 7-7 项，共 7 项/);
const apiNullItemsSearchHtml = renderSearchPage('E330', 'food', {}, 1, 'relevance', {
  status: 'success',
  total: 0,
  totalPages: 1,
  items: null
});
assert.match(apiNullItemsSearchHtml, /data-api-success/);
assert.match(apiNullItemsSearchHtml, /未找到相关成分/);
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
assert.match(firstPageSearchHtml, /显示第 1-6 项，共 112 项/);
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
assert.match(pagedSearchHtml, /显示第 7-12 项，共 112 项/);
assert.match(pagedSearchHtml, /aria-current="page">2</);
assert.match(pagedSearchHtml, /href="#\/food\/search\?q=%E5%89%82"/);
assert.doesNotMatch(pagedSearchHtml, /<h3>阿斯巴甜<\/h3>/);

assert.deepEqual(splitIngredientInput('水，烟酰胺; 香精\n水杨酸'), ['水', '烟酰胺', '香精', '水杨酸']);
assert.deepEqual(splitIngredientInput('苯氧乙醇(防腐剂)，香精（香料）'), ['苯氧乙醇', '香精']);
assert.deepEqual(splitIngredientInput('单，双甘油脂肪酸酯，甘油'), ['单，双甘油脂肪酸酯', '甘油']);
assert.deepEqual(splitIngredientInput('配料：水，食品添加剂（柠檬酸、山梨酸钾），黄原胶0.1%'), ['水', '柠檬酸', '山梨酸钾', '黄原胶']);
assert.deepEqual(splitIngredientInput('配料：水，食品添加剂（柠檬酸钠），山梨酸钾'), ['水', '柠檬酸钠', '山梨酸钾']);
assert.deepEqual(splitIngredientInput('水，食品添加剂：柠檬酸，山梨酸钾'), ['水', '柠檬酸', '山梨酸钾']);
assert.deepEqual(splitIngredientInput('食品添加剂（山梨酸钾（E202）、苯甲酸钠（E211））'), ['山梨酸钾', '苯甲酸钠']);
const nestedAdditiveItems = parseIngredientList('食品添加剂（山梨酸钾（E202）、苯甲酸钠（E211））');
assert.deepEqual(nestedAdditiveItems.map((item) => item.normalizedText), ['山梨酸钾', '苯甲酸钠']);
assert.deepEqual(nestedAdditiveItems.map((item) => item.eNumber), ['E202', 'E211']);
assert.deepEqual(nestedAdditiveItems.map((item) => item.parentLabel), ['食品添加剂', '食品添加剂']);
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
assert.equal(packagedFoodAnalysis.matchedCount, 4);
assert.deepEqual(packagedFoodAnalysis.ingredients.map((item) => item.id), ['common-water', 'citric-acid', 'potassium-sorbate', 'xanthan-gum']);
assert.equal(packagedFoodAnalysis.quality.totalCount, 5);
assert.equal(packagedFoodAnalysis.quality.unknownCount, 1);
assert.equal(packagedFoodAnalysis.quality.coveragePercent, 80);
assert.equal(packagedFoodAnalysis.quality.needsReview, true);
const nestedENumberFoodAnalysis = analyzeIngredientText('配料：水，食品添加剂（山梨酸钾（E202）、苯甲酸钠（E211））', 'food');
assert.equal(nestedENumberFoodAnalysis.matchedCount, 3);
assert.deepEqual(nestedENumberFoodAnalysis.ingredients.map((item) => item.id), ['common-water', 'potassium-sorbate', 'sodium-benzoate']);
assert.deepEqual(nestedENumberFoodAnalysis.unknownItems, []);
const singleWrappedFoodAnalysis = analyzeIngredientText('配料：水，食品添加剂（柠檬酸钠），山梨酸钾', 'food');
assert.deepEqual(singleWrappedFoodAnalysis.ingredients.map((item) => item.id), ['common-water', 'sodium-citrate', 'potassium-sorbate']);
assert.deepEqual(singleWrappedFoodAnalysis.unknownItems, []);
assert.equal(singleWrappedFoodAnalysis.quality.coveragePercent, 100);
const colonLabeledFoodAnalysis = analyzeIngredientText('水，食品添加剂：柠檬酸，山梨酸钾', 'food');
assert.deepEqual(colonLabeledFoodAnalysis.ingredients.map((item) => item.id), ['common-water', 'citric-acid', 'potassium-sorbate']);
assert.deepEqual(colonLabeledFoodAnalysis.unknownItems, []);
assert.equal(colonLabeledFoodAnalysis.quality.coveragePercent, 100);
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
const singleCharFoodMatch = matchIngredientsLocal(parseIngredientList('糖'), 'food');
assert.equal(singleCharFoodMatch.results[0].match, null);
assert.deepEqual(singleCharFoodMatch.unmatchedTerms, ['糖']);
const singleCharCosmeticsMatch = matchIngredientsLocal(parseIngredientList('水'), 'cosmetics');
assert.equal(singleCharCosmeticsMatch.results[0].match, null);
assert.deepEqual(singleCharCosmeticsMatch.unmatchedTerms, ['水']);
clearMatchCache();
const foodCitricMatch = await matchIngredients(parseIngredientList('柠檬酸'), 'food');
assert.equal(foodCitricMatch.results[0].match?.id, 'citric-acid');
const cosmeticsCitricMatch = await matchIngredients(parseIngredientList('柠檬酸'), 'cosmetics');
assert.equal(cosmeticsCitricMatch.results[0].match, null);
assert.deepEqual(cosmeticsCitricMatch.unmatchedTerms, ['柠檬酸']);
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
assert.equal(OCR_ENDPOINT_PATH, '/ocr');
assert.equal(getOcrEndpointUrl(), '/api/ocr');
assert.equal(ocrRequest.protocolVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrRequest.requestType, 'ingredient-image-ocr');
assert.equal(ocrRequest.endpoint, OCR_ENDPOINT_PATH);
assert.equal(ocrRequest.validation.ok, true);
assert.equal(ocrRequest.image.name, 'ingredient-list.png');
assert.equal(ocrRequest.image.sizeLabel, '4 KB');
assert.equal(ocrRequest.processingHints.requireUserCorrectionBeforeAnalysis, true);
assert.equal(ocrRequest.outputContract.schemaVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrRequest.safetyRules.some((rule) => /可编辑确认页/.test(rule)), true);
const ocrFallback = buildOCRFallback(ocrRequest);
assert.equal(ocrFallback.schemaVersion, OCR_PROTOCOL_VERSION);
assert.equal(ocrFallback.text, '');
assert.equal(ocrFallback.confidence, 0);
assert.equal(ocrFallback.provider, 'manual');
assert.equal(ocrFallback.warnings.some((warning) => /未连接真实 OCR 服务/.test(warning)), true);
assert.equal(ocrFallback.nextSteps.some((step) => /确认页/.test(step)), true);
const validOCRResponse = {
  text: '水，柠檬酸，山梨酸钾',
  confidence: 0.88,
  provider: 'aliyun',
  blocks: [
    { text: '水，柠檬酸，山梨酸钾', confidence: 0.88, bounds: { x: 0, y: 0, width: 10, height: 10 } }
  ]
};
assert.deepEqual(validateOCRResponse(validOCRResponse), {
  ok: true,
  errors: [],
  value: validOCRResponse
});
const invalidOCRResponse = validateOCRResponse({
  text: 123,
  confidence: 2,
  provider: '',
  blocks: [{ text: '', confidence: -1 }]
});
assert.equal(invalidOCRResponse.ok, false);
assert.equal(invalidOCRResponse.value, null);
assert.equal(invalidOCRResponse.errors.some((error) => /confidence/.test(error)), true);
assert.equal(invalidOCRResponse.errors.some((error) => /provider/.test(error)), true);
assert.equal(invalidOCRResponse.errors.some((error) => /blocks\[0\]\.text/.test(error)), true);
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
assert.equal(ocrResult.result.mode, 'manual');
assert.match(ocrResult.message, /手动输入模式/);
assert.deepEqual(await recognizeImage(ocrFile, { category: 'food' }), {
  mode: 'manual',
  rawText: '',
  confidence: 1,
  provider: 'manual',
  requiresConfirm: true,
  blocks: []
});

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

const originalFetch = globalThis.fetch;
let storageFetchCalls = 0;
globalThis.fetch = async () => {
  storageFetchCalls += 1;
  return { ok: true, json: async () => ({ items: [] }) };
};
writeJson('compcheck:favorites', [{ id: 'citric-acid', category: 'food' }]);
assert.equal(isStorageLoggedIn(), false);
assert.equal(storageFetchCalls, 0);
assert.deepEqual(readJson('compcheck:favorites', []), [{ id: 'citric-acid', category: 'food' }]);
assert.equal(storageFetchCalls, 0);

const storageMap = new Map();
const makeTestJwt = (exp, claims = {}) => `header.${Buffer.from(JSON.stringify({ ...claims, exp })).toString('base64url')}.signature`;
storageMap.set(AUTH_TOKEN_KEY, makeTestJwt(Math.floor(Date.now() / 1000) + 60, { sub: 'sync-add-user' }));
globalThis.window = {
  localStorage: {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    },
    removeItem(key) {
      storageMap.delete(key);
    }
  }
};
const syncCalls = [];
const serverSyncItemsByUrl = {
  '/api/user/favorites': [{ id: 'server-favorite', category: 'food' }],
  '/api/user/profile/watch': [],
  '/api/user/profile/avoid': []
};
globalThis.fetch = async (url, options = {}) => {
  syncCalls.push({ url, options });
  if (options.method === 'POST' || options.method === 'PUT') {
    return {
      ok: true,
      json: async () => JSON.parse(options.body)
    };
  }

  return {
    ok: true,
    json: async () => ({
      items: serverSyncItemsByUrl[url] || []
    })
  };
};
assert.equal(isStorageLoggedIn(), true);
writeJson('compcheck:favorites', [{ id: 'local-favorite', category: 'food' }]);
await new Promise((resolve) => setTimeout(resolve, 0));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(syncCalls[0].url, '/api/user/favorites');
assert.equal(syncCalls[0].options.method, undefined);
assert.equal(syncCalls.some((call) => call.url === '/api/user/favorites' && call.options.method === 'POST'), true);
assert.deepEqual(JSON.parse(syncCalls.find((call) => call.options.method === 'POST').options.body).items, [
  { id: 'local-favorite', category: 'food' },
  { id: 'server-favorite', category: 'food' }
]);
assert.deepEqual(readJson('compcheck:favorites', []), [
  { id: 'local-favorite', category: 'food' },
  { id: 'server-favorite', category: 'food' }
]);
syncCalls.length = 0;
writeJson('compcheck:watch-ingredients', ['sodium-bicarbonate']);
writeJson('compcheck:avoid-ingredients', ['sodium-metabisulfite']);
await new Promise((resolve) => setTimeout(resolve, 0));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(JSON.parse(syncCalls.find((call) => call.url === '/api/user/profile/watch' && call.options.method === 'PUT').options.body).items, ['sodium-bicarbonate']);
assert.deepEqual(JSON.parse(syncCalls.find((call) => call.url === '/api/user/profile/avoid' && call.options.method === 'PUT').options.body).items, ['sodium-metabisulfite']);
assert.deepEqual(getWatchIngredientIds('food'), ['sodium-bicarbonate']);
assert.deepEqual(getAvoidIngredientIds('food'), ['sodium-metabisulfite']);
storageMap.set(AUTH_TOKEN_KEY, makeTestJwt(Math.floor(Date.now() / 1000) + 120, { sub: 'sync-delete-user' }));
const activeSyncFetch = globalThis.fetch;
globalThis.fetch = undefined;
writeJson('compcheck:favorites', [
  { id: 'remove-me', category: 'food' },
  { id: 'keep-me', category: 'food' }
]);
globalThis.fetch = activeSyncFetch;
serverSyncItemsByUrl['/api/user/favorites'] = [
  { id: 'remove-me', category: 'food' },
  { id: 'keep-me', category: 'food' }
];
syncCalls.length = 0;
writeJson('compcheck:favorites', [{ id: 'keep-me', category: 'food' }]);
await new Promise((resolve) => setTimeout(resolve, 0));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(JSON.parse(syncCalls.find((call) => call.options.method === 'POST').options.body).items, [
  { id: 'keep-me', category: 'food' }
]);
assert.deepEqual(readJson('compcheck:favorites', []), [{ id: 'keep-me', category: 'food' }]);
const accountAToken = makeTestJwt(Math.floor(Date.now() / 1000) + 180, { sub: 'account-a' });
const accountBToken = makeTestJwt(Math.floor(Date.now() / 1000) + 180, { sub: 'account-b' });
storageMap.set(AUTH_TOKEN_KEY, accountAToken);
globalThis.fetch = undefined;
writeJson('compcheck:favorites', [{ id: 'account-a-favorite', category: 'food' }]);
addWatchIngredient('sodium-bicarbonate', 'food');
addAvoidIngredient('sodium-metabisulfite', 'food');
globalThis.fetch = activeSyncFetch;
storageMap.delete(AUTH_TOKEN_KEY);
assert.deepEqual(getWatchIngredientIds('food'), []);
assert.deepEqual(getAvoidIngredientIds('food'), []);
storageMap.set(AUTH_TOKEN_KEY, accountAToken);
assert.deepEqual(getWatchIngredientIds('food'), ['sodium-bicarbonate']);
assert.deepEqual(getAvoidIngredientIds('food'), ['sodium-metabisulfite']);
storageMap.set('compcheck:favorites', JSON.stringify([{ id: 'stale-shared-favorite', category: 'food' }]));
serverSyncItemsByUrl['/api/user/favorites'] = [{ id: 'account-b-server-favorite', category: 'food' }];
serverSyncItemsByUrl['/api/user/profile/watch'] = ['citric-acid'];
serverSyncItemsByUrl['/api/user/profile/avoid'] = ['sodium-benzoate'];
syncCalls.length = 0;
storageMap.set(AUTH_TOKEN_KEY, accountBToken);
assert.deepEqual(readJson('compcheck:favorites', []), []);
assert.deepEqual(getWatchIngredientIds('food'), []);
assert.deepEqual(getAvoidIngredientIds('food'), []);
await new Promise((resolve) => setTimeout(resolve, 0));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(syncCalls[0].url, '/api/user/favorites');
assert.equal(syncCalls[0].options.method, undefined);
assert.deepEqual(readJson('compcheck:favorites', []), [{ id: 'account-b-server-favorite', category: 'food' }]);
assert.deepEqual(readJson('compcheck:watch-ingredients', []), ['citric-acid']);
assert.deepEqual(readJson('compcheck:avoid-ingredients', []), ['sodium-benzoate']);
globalThis.fetch = undefined;
storageMap.set(AUTH_TOKEN_KEY, accountAToken);
assert.deepEqual(readJson('compcheck:favorites', []), [{ id: 'account-a-favorite', category: 'food' }]);
assert.deepEqual(getWatchIngredientIds('food'), ['sodium-bicarbonate']);
assert.deepEqual(getAvoidIngredientIds('food'), ['sodium-metabisulfite']);
globalThis.fetch = activeSyncFetch;
storageMap.set(AUTH_TOKEN_KEY, makeTestJwt(Math.floor(Date.now() / 1000) - 10, { sub: 'expired-auth-user' }));
storageMap.set(USER_KEY, JSON.stringify({ id: 'expired-auth-user', email: 'expired@example.com', createdAt: '2026-06-12T00:00:00.000Z' }));
assert.equal(isAuthLoggedIn(), false);
assert.equal(storageMap.has(AUTH_TOKEN_KEY), false);
assert.equal(storageMap.has(USER_KEY), false);
assert.equal(getAuthCurrentUser(), null);
const authSyncToken = makeTestJwt(Math.floor(Date.now() / 1000) + 240, { sub: 'auth-sync-user' });
storageMap.set(AUTH_TOKEN_KEY, authSyncToken);
storageMap.set(USER_KEY, JSON.stringify({ id: 'auth-sync-user', email: 'sync@example.com', createdAt: '2026-06-12T00:00:00.000Z' }));
assert.equal(isAuthLoggedIn(), true);
assert.equal(getAuthCurrentUser().email, 'sync@example.com');
globalThis.fetch = undefined;
const authSyncResult = await syncLocalDataToServer({
  schemaVersion: 1,
  favorites: [{ id: 'citric-acid', category: 'food' }],
  compareItems: [],
  history: ['柠檬酸'],
  allergens: ['milk'],
  watchIngredients: ['sodium-bicarbonate'],
  avoidIngredients: ['sodium-metabisulfite'],
  analysisReports: [],
  products: [],
  supportRequests: [],
  scanDrafts: {}
});
assert.equal(authSyncResult.ok, true);
assert.deepEqual(readJson('compcheck:favorites', []), [{ id: 'citric-acid', category: 'food' }]);
assert.deepEqual(readJson('compcheck:history', []), ['柠檬酸']);
assert.deepEqual(readJson('compcheck:allergens', []), ['milk']);
assert.deepEqual(getWatchIngredientIds('food'), ['sodium-bicarbonate']);
assert.deepEqual(getAvoidIngredientIds('food'), ['sodium-metabisulfite']);
let authLogoutCalled = false;
globalThis.fetch = async (url, options = {}) => {
  if (url === '/api/auth/logout') {
    authLogoutCalled = true;
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${authSyncToken}`);
    return { ok: true, json: async () => ({ ok: true }) };
  }
  return activeSyncFetch(url, options);
};
await authLogout();
assert.equal(authLogoutCalled, true);
assert.equal(storageMap.has(AUTH_TOKEN_KEY), false);
assert.equal(storageMap.has(USER_KEY), false);
assert.equal(isAuthLoggedIn(), false);
globalThis.fetch = originalFetch;
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
assert.deepEqual(clearWatchIngredients(), []);
assert.deepEqual(clearAvoidIngredients(), []);
assert.deepEqual(addWatchIngredient('sodium-bicarbonate', 'food'), ['sodium-bicarbonate']);
assert.deepEqual(addWatchIngredient('sodium-bicarbonate', 'food'), ['sodium-bicarbonate']);
assert.deepEqual(getWatchIngredientIds('food'), ['sodium-bicarbonate']);
assert.deepEqual(removeWatchIngredient('sodium-bicarbonate'), []);
assert.deepEqual(addWatchIngredient('sodium-bicarbonate', 'food'), ['sodium-bicarbonate']);
assert.deepEqual(addAvoidIngredient('sodium-metabisulfite', 'food'), ['sodium-metabisulfite']);
assert.deepEqual(addAvoidIngredient('sodium-metabisulfite', 'food'), ['sodium-metabisulfite']);
assert.deepEqual(getAvoidIngredientIds('food'), ['sodium-metabisulfite']);
assert.deepEqual(removeAvoidIngredient('sodium-metabisulfite'), []);
assert.deepEqual(addAvoidIngredient('sodium-metabisulfite', 'food'), ['sodium-metabisulfite']);
assert.deepEqual(getPersonalProfile('food'), {
  allergenIds: ['milk', 'soybeans'],
  watchIds: ['sodium-bicarbonate'],
  avoidIds: ['sodium-metabisulfite']
});
const settingsHtml = renderSettingsPage();
assert.match(settingsHtml, /个人成分档案/);
assert.match(settingsHtml, /4 项个人设置/);
assert.match(settingsHtml, /已选 2 种过敏原/);
assert.match(settingsHtml, /value="milk" checked/);
assert.match(settingsHtml, /value="soybeans" checked/);
assert.match(settingsHtml, /value="peanuts"/);
assert.match(settingsHtml, /我的关注成分/);
assert.match(settingsHtml, /添加后在分析报告中重点展示，不代表有害/);
assert.match(settingsHtml, /data-remove-personal-ingredient="watch" data-ingredient-id="sodium-bicarbonate"/);
assert.match(settingsHtml, /data-add-personal-ingredient="watch"/);
assert.match(settingsHtml, /我的忌口项/);
assert.match(settingsHtml, /不构成医疗建议/);
assert.match(settingsHtml, /data-remove-personal-ingredient="avoid" data-ingredient-id="sodium-metabisulfite"/);
assert.match(settingsHtml, /data-add-personal-ingredient="avoid"/);
assert.match(settingsHtml, /账号与云同步/);
assert.match(settingsHtml, /访客模式/);
assert.match(settingsHtml, /登录账号，开启云同步/);
assert.match(settingsHtml, /href="#\/food\/login\?redirect=%2Ffood%2Fsettings"/);
assert.match(settingsHtml, /会员中心/);
assert.match(settingsHtml, /href="#\/food\/membership"/);
assert.match(settingsHtml, /href="#\/food\/support"/);
assert.match(settingsHtml, /隐私与条款/);
assert.match(settingsHtml, /href="#\/food\/legal"/);
assert.match(settingsHtml, /data-pwa-offline-settings/);
assert.match(settingsHtml, /离线与安装/);
assert.match(settingsHtml, /本机历史、报告、收藏和已缓存页面可离线打开/);
assert.match(settingsHtml, /可离线：本机历史报告/);
assert.match(settingsHtml, /需联网：OCR 识别/);
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
assert.match(settingsHtml, /data-local-data-count="products">0</);
assert.match(settingsHtml, /data-local-data-count="supportRequests">0</);
assert.match(settingsHtml, /data-local-data-count="allergens">2</);
assert.match(settingsHtml, /data-local-data-count="watchIngredients">1</);
assert.match(settingsHtml, /data-local-data-count="avoidIngredients">1</);
assert.match(settingsHtml, /data-history-recording-toggle checked/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/membership"/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/support"/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/legal"/);
assert.match(renderSettingsPage('cosmetics'), /href="#\/cosmetics\/login\?redirect=%2Fcosmetics%2Fsettings"/);
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
assert.equal(localDataSummary.watchIngredients, 1);
assert.equal(localDataSummary.avoidIngredients, 1);
assert.equal(localDataSummary.products, 0);
assert.equal(localDataSummary.supportRequests, 1);
assert.equal(localDataSummary.scanDrafts, 1);
assert.equal(localDataSummary.totalItems, 13);
const localDataSnapshot = getLocalDataSnapshot();
assert.equal(localDataSnapshot.schemaVersion, 1);
assert.equal(localDataSnapshot.preferences.historyRecordingEnabled, true);
assert.equal(localDataSnapshot.favorites.some((item) => item.id === 'citric-acid' && item.category === 'food'), true);
assert.equal(localDataSnapshot.compareItems.some((item) => item.id === 'citric-acid' && item.category === 'food'), true);
assert.equal(localDataSnapshot.supportRequests.some((item) => item.subject === '扫描草稿反馈'), true);
assert.deepEqual(localDataSnapshot.products, []);
assert.equal(localDataSnapshot.history[0], '烟酰胺');
assert.deepEqual(localDataSnapshot.watchIngredients, ['sodium-bicarbonate']);
assert.deepEqual(localDataSnapshot.avoidIngredients, ['sodium-metabisulfite']);
assert.equal(localDataSnapshot.scanDrafts.food, '柠檬酸，山梨酸钾');
setHistoryRecordingEnabled(false);
assert.deepEqual(clearLocalUserData(), {
  favorites: 0,
  compareItems: 0,
  history: 0,
  allergens: 0,
  watchIngredients: 0,
  avoidIngredients: 0,
  reports: 0,
  products: 0,
  supportRequests: 0,
  scanDrafts: 0,
  totalItems: 0
});
assert.deepEqual(getFavoriteItems(), []);
assert.deepEqual(getCompareItems(), []);
assert.deepEqual(getHistory(), []);
assert.deepEqual(getUserAllergens(), []);
assert.deepEqual(getWatchIngredientIds(), []);
assert.deepEqual(getAvoidIngredientIds(), []);
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
assert.equal(importResult.summary.totalItems, 13);
assert.deepEqual(getFavoriteItems(), localDataSnapshot.favorites);
assert.deepEqual(getCompareItems(), localDataSnapshot.compareItems);
assert.deepEqual(getHistory(), localDataSnapshot.history);
assert.deepEqual(getUserAllergens(), localDataSnapshot.allergens);
assert.deepEqual(getWatchIngredientIds(), localDataSnapshot.watchIngredients);
assert.deepEqual(getAvoidIngredientIds(), localDataSnapshot.avoidIngredients);
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
assert.match(emptyFavoritesHtml, /暂无收藏成分/);
assert.match(emptyFavoritesHtml, /empty-state-title/);
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
assert.match(analyzeHtmlWithAllergens, /common_ingredient \/ 普通配料/);
assert.match(analyzeHtmlWithAllergens, /不作为医疗、健康或诊断建议/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /遵医嘱/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/lecithins"/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/sodium-metabisulfite"/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /您尚未设置关注的过敏原/);
setUserAllergens([]);
const analyzeHtmlWithoutAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithoutAllergens, /您尚未设置关注的过敏原/);
assert.doesNotMatch(analyzeHtmlWithoutAllergens, /发现过敏原成分/);
assert.match(renderAnalyzePage('柠檬酸', 'food', '测试饼干'), /产品名称：测试饼干/);
const emptyAnalyzeHtml = renderAnalyzePage('', 'food');
assert.match(emptyAnalyzeHtml, /data-analyze-status/);
assert.doesNotMatch(emptyAnalyzeHtml, /data-save-report/);
assert.doesNotMatch(emptyAnalyzeHtml, /AI 辅助分析/);
setUserAllergens(originalUserAllergens);

writeJson('compcheck:analysis-reports', []);
setUserAllergens(['milk', 'soybeans']);
clearWatchIngredients();
clearAvoidIngredients();
addWatchIngredient('sodium-bicarbonate', 'food');
addAvoidIngredient('sodium-metabisulfite', 'food');
const fakeParsedIngredient = { rawText: '测试', normalizedText: '测试', index: 0 };
let fakeMatchIndex = 0;
const fakeMatch = (riskLevel) => ({
  parsedIngredient: fakeParsedIngredient,
  term: '测试',
  eNumber: null,
  match: { id: `fake-${riskLevel}-${fakeMatchIndex += 1}`, nameCn: '测试', riskLevel, category: '测试分类', confidenceLevel: 'reviewed', isVerified: true, reviewStatus: 'reviewed' },
  confidence: 1,
  matchType: 'exact',
  alternates: []
});
assert.equal(computeRiskGrade([]), 'A');
assert.equal(computeRiskGrade([fakeMatch('medium')]), 'B');
assert.equal(computeRiskGrade([fakeMatch('high')]), 'C');
assert.equal(computeRiskGrade([fakeMatch('high'), fakeMatch('high'), fakeMatch('high')]), 'D');
assert.equal(computeRiskGrade([fakeMatch('high'), fakeMatch('high'), fakeMatch('high'), fakeMatch('high'), fakeMatch('high')]), 'F');
const reportDraft = createAnalysisReport(SAMPLES['food-2'], 'food');
assert.equal(reportDraft.category, 'food');
assert.equal(reportDraft.schemaVersion, 4);
assert.equal(reportDraft.productName, '未命名产品');
assert.equal(reportDraft.originalText, SAMPLES['food-2']);
assert.equal(Array.isArray(reportDraft.parsedIngredients), true);
assert.equal(Array.isArray(reportDraft.matchResults), true);
assert.equal(['A', 'B', 'C', 'D', 'F'].includes(reportDraft.riskGrade), true);
assert.equal(typeof reportDraft.riskSummary.highRisk, 'number');
assert.equal(reportDraft.matchRate > 0, true);
assert.deepEqual(getTopIngredientNames(reportDraft).slice(0, 2), ['小麦粉', '白砂糖']);
assert.equal(reportDraft.matchedIngredientIds.includes('lecithins'), true);
assert.equal(reportDraft.pendingCount, 2);
assert.equal(reportDraft.dataStatusCounts.common_ingredient, 5);
assert.equal(reportDraft.dataStatusCounts.unverified, 2);
assert.equal(reportDraft.dataStatusCounts.verified_regulation, 1);
assert.equal(reportDraft.ingredientAllergenHits.some((hit) => hit.id === 'lecithins' && hit.allergenIds.includes('soybeans')), true);
assert.equal(reportDraft.ingredientAllergenHits.some((hit) => hit.id === 'common-whole-milk-powder' && hit.allergenIds.includes('milk')), true);
assert.equal(reportDraft.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenIds.includes('milk')), false);
assert.equal(reportDraft.insights.some((insight) => insight.key === 'risk' && insight.title === '风险分布'), true);
assert.equal(reportDraft.insights.some((insight) => insight.key === 'coverage' && /verified_regulation \/ verified_jecfa \/ common_ingredient \/ unverified/.test(insight.summary)), true);
const savedReport = saveAnalysisReport(SAMPLES['food-2'], 'food', { productName: '测试饼干' });
assert.equal(savedReport.productName, '测试饼干');
assert.equal(savedReport.title, '测试饼干');
assert.equal(getAnalysisReports('food').length, 1);
assert.equal(getAnalysisReportById(savedReport.id).id, savedReport.id);
const reportPersonalProfile = getPersonalProfile('food');
assert.equal(getPersonalIngredientHit(getIngredientById('lecithins', 'food'), 'food', reportPersonalProfile).type, 'allergen');
assert.equal(getPersonalIngredientHit(getIngredientById('sodium-metabisulfite', 'food'), 'food', reportPersonalProfile).type, 'avoid');
assert.equal(getPersonalIngredientHit(getIngredientById('sodium-bicarbonate', 'food'), 'food', reportPersonalProfile).type, 'watch');
const reportPersonalHits = getReportPersonalHits(savedReport, reportPersonalProfile);
assert.equal(reportPersonalHits.some((hit) => hit.id === 'lecithins' && hit.type === 'allergen'), true);
assert.equal(reportPersonalHits.some((hit) => hit.id === 'sodium-metabisulfite' && hit.type === 'avoid'), true);
assert.equal(reportPersonalHits.some((hit) => hit.id === 'sodium-bicarbonate' && hit.type === 'watch'), true);
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
const productFilteredReportsHtml = renderRoute(resolveRoute('#/food/reports?q=%E6%B5%8B%E8%AF%95%E9%A5%BC%E5%B9%B2'));
assert.match(productFilteredReportsHtml, /value="测试饼干"/);
assert.match(productFilteredReportsHtml, /1 \/ 1 份/);
assert.match(productFilteredReportsHtml, /data-delete-report=/);
const emptyFilteredReportsHtml = renderRoute(resolveRoute('#/food/reports?q=%E4%B8%8D%E5%AD%98%E5%9C%A8%E6%8A%A5%E5%91%8A'));
assert.match(emptyFilteredReportsHtml, /没有找到匹配的本地报告/);
assert.doesNotMatch(emptyFilteredReportsHtml, /data-delete-report=/);
const reportDetailHtml = renderRoute(resolveRoute(`#/food/reports/${savedReport.id}`));
assert.match(reportDetailHtml, /整体评级/);
assert.match(reportDetailHtml, /关注摘要/);
assert.match(reportDetailHtml, /个人命中摘要/);
assert.match(reportDetailHtml, /含过敏原/);
assert.match(reportDetailHtml, /你的忌口项/);
assert.match(reportDetailHtml, /你关注的/);
assert.match(reportDetailHtml, /配料顺序说明/);
assert.match(reportDetailHtml, /食品添加剂/);
assert.match(reportDetailHtml, /common_ingredient \/ 普通配料/);
assert.match(reportDetailHtml, /待确认 2/);
assert.match(reportDetailHtml, /原始配料表/);
assert.match(reportDetailHtml, /导出报告/);
assert.match(reportDetailHtml, /data-report-markdown/);
assert.match(reportDetailHtml, /data-copy-report=/);
assert.match(reportDetailHtml, /data-share-report=/);
assert.match(reportDetailHtml, /data-download-report="markdown"/);
assert.match(reportDetailHtml, /data-download-report="json"/);
assert.match(reportDetailHtml, /风险分布/);
assert.match(reportDetailHtml, /数据边界/);
assert.match(reportDetailHtml, /下一步建议/);
assert.match(reportDetailHtml, /来源与审核状态/);
assert.match(reportDetailHtml, /待审核/);
assert.match(reportDetailHtml, /verified_regulation \/ GB 2760 已验证/);
assert.match(reportDetailHtml, /GB 2760 法规依据/);
assert.match(reportDetailHtml, /食品安全国家标准 食品添加剂使用标准/);
assert.match(reportDetailHtml, /覆盖成分：/);
assert.match(reportDetailHtml, /过敏原命中/);
assert.match(reportDetailHtml, /全脂奶粉/);
assert.match(reportDetailHtml, /href="#\/food\/analyze\?text=/);
assert.match(reportDetailHtml, /productName=/);
const legacyScopeReport = createAnalysisReport('焦亚硫酸钠', 'food', { productName: '旧报告来源范围' });
legacyScopeReport.id = 'legacy-source-scope-report';
legacyScopeReport.title = '旧报告来源范围';
legacyScopeReport.matchResults = legacyScopeReport.matchResults.map((item) => ({
  ...item,
  match: item.match?.id === 'sodium-metabisulfite'
    ? { ...item.match, sourceScope: 'unknown' }
    : item.match
}));
writeJson('compcheck:analysis-reports', [legacyScopeReport, savedReport]);
const legacyScopeReportHtml = renderRoute(resolveRoute(`#/food/reports/${legacyScopeReport.id}`));
assert.match(legacyScopeReportHtml, /来源范围：种子参考/);
assert.doesNotMatch(legacyScopeReportHtml, /来源范围：未知/);
writeJson('compcheck:analysis-reports', [savedReport]);
const personalSearchHtml = renderSearchPage('碳酸氢钠', 'food');
assert.match(personalSearchHtml, /personal-badge--watch/);
assert.match(personalSearchHtml, /你关注的/);
const personalDetailHtml = renderDetailPage('sodium-metabisulfite', 'food');
assert.match(personalDetailHtml, /personal-alert--avoid/);
assert.match(personalDetailHtml, /你的忌口项/);
clearWatchIngredients();
clearAvoidIngredients();
setUserAllergens([]);
const clearedPersonalReportHtml = renderRoute(resolveRoute(`#/food/reports/${savedReport.id}`));
assert.doesNotMatch(clearedPersonalReportHtml, /个人命中摘要/);
assert.doesNotMatch(clearedPersonalReportHtml, /personal-badge--(?:allergen|avoid|watch)/);
assert.doesNotMatch(renderSearchPage('碳酸氢钠', 'food'), /personal-badge--watch/);
assert.doesNotMatch(renderDetailPage('sodium-metabisulfite', 'food'), /personal-alert--avoid/);
setUserAllergens(['milk', 'soybeans']);
addWatchIngredient('sodium-bicarbonate', 'food');
addAvoidIngredient('sodium-metabisulfite', 'food');
assert.deepEqual(resolveRoute(`#/food/report/${savedReport.id}`), { view: 'report-detail', category: 'food', id: savedReport.id });
writeJson(PRODUCT_ARCHIVES_KEY, []);
const productDraft = createProductArchiveFromReport(savedReport, {
  thumbnailDataUrl: 'data:image/jpeg;base64,AAA='
});
assert.equal(productDraft.productName, '测试饼干');
assert.equal(productDraft.reportId, savedReport.id);
assert.equal(productDraft.originalText, savedReport.originalText);
assert.equal(productDraft.imageId, null);
assert.equal(productDraft.thumbnailDataUrl, 'data:image/jpeg;base64,AAA=');
assert.equal(Object.hasOwn(productDraft, 'imageDataUrl'), false);
const archivedProduct = await saveProductArchiveFromReport(savedReport, {
  thumbnailDataUrl: 'data:image/jpeg;base64,AAA='
});
assert.equal(getProductArchives('food').length, 1);
assert.equal(getProductArchiveById(archivedProduct.id).id, archivedProduct.id);
assert.equal(getProductArchiveByReportId(savedReport.id).id, archivedProduct.id);
assert.equal(readJson(PRODUCT_ARCHIVES_KEY, [])[0].imageId, null);
assert.equal(Object.hasOwn(readJson(PRODUCT_ARCHIVES_KEY, [])[0], 'blob'), false);
const productListHtml = renderProductArchiveListPage('food');
assert.match(productListHtml, /产品档案/);
assert.match(productListHtml, /data-product-card/);
assert.match(productListHtml, /data:image\/jpeg;base64,AAA=/);
assert.match(productListHtml, /href="#\/food\/product\//);
assert.match(renderRoute(resolveRoute('#/food/products?q=%E9%A5%BC%E5%B9%B2')), /1 条匹配/);
const productDetailHtml = renderProductArchivePage(archivedProduct.id, 'food');
assert.match(productDetailHtml, /测试饼干/);
assert.match(productDetailHtml, /data-product-image=/);
assert.match(productDetailHtml, new RegExp(`href="#/food/reports/${savedReport.id}"`));
assert.match(productDetailHtml, /完整图片仅保存在本机 IndexedDB/);
assert.match(getRouteTitle(resolveRoute(`#/food/product/${archivedProduct.id}`)), /测试饼干 - 食品添加剂 - CompCheck 成分小查/);
const reportDetailWithProductHtml = renderRoute(resolveRoute(`#/food/reports/${savedReport.id}`));
assert.match(reportDetailWithProductHtml, /查看产品档案/);
assert.doesNotMatch(reportDetailWithProductHtml, /保存为产品档案/);
assert.equal(toggleProductArchiveFavorite(archivedProduct.id).isFavorite, true);
assert.equal(getProductArchives({ category: 'food', isFavorite: true }).length, 1);
const historyHtml = renderHistoryPage('food');
assert.match(historyHtml, /分析历史/);
assert.match(historyHtml, /data-history-swipe=/);
assert.match(historyHtml, /data-delete-product-archive=/);
assert.match(historyHtml, /测试饼干/);
assert.match(historyHtml, /data:image\/jpeg;base64,AAA=/);
assert.match(historyHtml, /项需关注/);
assert.match(historyHtml, /filter=favorite/);
assert.match(historyHtml, /filter=concern/);
assert.match(renderHistoryPage('food', '饼干'), /1 条匹配/);
assert.match(renderHistoryPage('food', '', 'favorite'), /测试饼干/);
assert.match(renderRoute(resolveRoute('#/food/history?q=%E9%A5%BC%E5%B9%B2&filter=favorite')), /测试饼干/);
const emptyHistoryHtml = renderHistoryPage('food', '不存在产品');
assert.match(emptyHistoryHtml, /data-empty-history/);
assert.match(emptyHistoryHtml, /去拍照识别/);
const favoriteProductsHtml = renderRoute(resolveRoute('#/food/favorites?tab=products'));
assert.match(favoriteProductsHtml, /收藏产品/);
assert.match(favoriteProductsHtml, /data-favorite-product-card/);
assert.match(favoriteProductsHtml, /测试饼干/);
const homeHtmlWithProducts = renderHomePage('food');
assert.match(homeHtmlWithProducts, /data-recent-products/);
assert.match(homeHtmlWithProducts, /查看全部历史 →/);
assert.match(homeHtmlWithProducts, /href="#\/food\/history"/);
assert.match(homeHtmlWithProducts, /测试饼干/);
clearProductArchives();
const overLimitProducts = Array.from({ length: MAX_PRODUCT_ARCHIVES + 2 }, (_, index) => ({
  ...archivedProduct,
  id: `product-limit-${index}`,
  reportId: `report-limit-${index}`,
  productName: `产品 ${index}`,
  isFavorite: index === 0,
  createdAt: new Date(2026, 0, index + 1).toISOString(),
  updatedAt: new Date(2026, 0, index + 1).toISOString()
}));
writeJson(PRODUCT_ARCHIVES_KEY, overLimitProducts);
const cappedProducts = getProductArchives();
assert.equal(cappedProducts.length, MAX_PRODUCT_ARCHIVES);
assert.equal(cappedProducts.some((item) => item.id === 'product-limit-0' && item.isFavorite), true);
assert.equal(cappedProducts.some((item) => item.id === 'product-limit-1'), false);
clearProductArchives();
const cosmeticReport = saveAnalysisReport(SAMPLES['cosmetic-1'], 'cosmetics', { productName: '测试面霜' });
const cosmeticReportHtml = renderRoute(resolveRoute(`#/cosmetics/reports/${cosmeticReport.id}`));
assert.match(cosmeticReportHtml, /化妆品成分/);
assert.doesNotMatch(cosmeticReportHtml, /当前报告没有匹配到食品添加剂数据库成分/);
deleteAnalysisReport(cosmeticReport.id);
const reportMarkdown = buildReportMarkdown(savedReport);
assert.match(reportMarkdown, /^# /);
assert.match(reportMarkdown, /产品名称：测试饼干/);
assert.match(reportMarkdown, /整体评级：/);
assert.match(reportMarkdown, /## 关注摘要/);
assert.match(reportMarkdown, /## 配料顺序/);
assert.match(reportMarkdown, /## 报告解读/);
assert.match(reportMarkdown, /### 风险分布/);
assert.match(reportMarkdown, /## 原始成分表/);
assert.match(reportMarkdown, /## 已匹配成分/);
assert.match(reportMarkdown, /## 数据来源与审核状态/);
assert.match(reportMarkdown, /草稿（未审核）：/);
assert.match(reportMarkdown, /待确认：2/);
assert.match(reportMarkdown, /数据状态：普通配料/);
assert.match(reportMarkdown, /数据状态：GB 2760 已验证/);
assert.match(reportMarkdown, /### 来源引用/);
assert.match(reportMarkdown, /卵磷脂/);
assert.match(reportMarkdown, /过敏原：大豆/);
assert.match(reportMarkdown, /全脂奶粉/);
const reportSharePayload = buildReportSharePayload(savedReport, 'https://example.com/app');
assert.equal(reportSharePayload.url, `https://example.com/app#/food/analyze?text=${encodeURIComponent(savedReport.input)}&productName=${encodeURIComponent(savedReport.productName)}`);
assert.match(reportSharePayload.text, /【成分镜分析报告】测试饼干/);
assert.match(reportSharePayload.text, /整体评级：/);
assert.match(reportSharePayload.text, /排名前三：/);
assert.match(reportMarkdown, /不提供医疗诊断或治疗建议/);
const exportPayload = buildReportExportPayload(savedReport);
assert.equal(exportPayload.report.id, savedReport.id);
assert.equal(exportPayload.report.categoryLabel, '食品添加剂');
assert.equal(exportPayload.report.productName, '测试饼干');
assert.equal(exportPayload.report.riskGrade, savedReport.riskGrade);
assert.equal(Array.isArray(exportPayload.report.parsedIngredients), true);
assert.equal(Array.isArray(exportPayload.report.matchResults), true);
assert.equal(exportPayload.report.insights.some((insight) => insight.key === 'next-steps'), true);
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'lecithins'), true);
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'lecithins' && item.reviewStatusLabel === '草稿（未审核）'), true);
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'common-whole-milk-powder' && item.dataStatus === 'common_ingredient'), true);
assert.equal(exportPayload.report.pendingCount, 2);
assert.equal(exportPayload.reviewStatusSummary.draft > 0, true);
assert.equal(exportPayload.sourceReferences.some((source) => source.title === '食品安全国家标准 食品添加剂使用标准' && source.ingredientNames.includes('卵磷脂')), true);
assert.equal(exportPayload.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenNames === '乳及乳制品'), false);
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
for (let index = 20; index < 50; index += 1) {
  saveAnalysisReport(`${SAMPLES['food-1']}，批次${index}`, 'food');
}
assert.equal(getAnalysisReports('food').length, 50);
saveAnalysisReport(SAMPLES['cosmetic-1'], 'cosmetics');
assert.equal(getAnalysisReports('food').length, 50);
assert.equal(getAnalysisReports('cosmetics').length, 1);
saveAnalysisReport(`${SAMPLES['food-3']}，额外食品报告`, 'food');
assert.equal(getAnalysisReports('food').length, 50);
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
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /sourceName is required/);
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /confidenceLevel must be one of/);
assert.match(validateFoodAdditives([{ ...invalidFoodAdditive, riskSummary: '绝对安全' }]).join('\n'), /absolute medical claim/);
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
assert.equal(biscuitAnalysis.matchedCount, 8);
assert.equal(biscuitAnalysis.matchedCount, biscuitAnalysis.ingredients.length);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'lecithins'), true);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'common-whole-milk-powder' && item.dataStatus === 'common_ingredient'), true);
assert.deepEqual(biscuitAnalysis.unknownItems, []);

const chiliAnalysis = analyzeIngredientText(SAMPLES['food-4'], 'food');
assert.equal(chiliAnalysis.matchedCount, 8);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-benzoate'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'common-chili-pepper'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'common-garlic'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'common-edible-salt'), true);
assert.deepEqual(chiliAnalysis.unknownItems, []);

const juiceAnalysis = analyzeIngredientText(SAMPLES['food-3'], 'food');
assert.equal(juiceAnalysis.ingredients.some((item) => item.id === 'potassium-sorbate'), true);

const jellyAnalysis = analyzeIngredientText(SAMPLES['food-5'], 'food');
assert.equal(jellyAnalysis.ingredients.some((item) => item.id === 'common-konjac-flour'), true);
assert.deepEqual(jellyAnalysis.unknownItems, []);

const colaAnalysis = analyzeIngredientText(SAMPLES['food-1'], 'food');
assert.equal(colaAnalysis.ingredients.some((item) => item.id === 'aspartame'), true);

console.log('Tests passed: ingredient search and text analysis behave as expected.');
