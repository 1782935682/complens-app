import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { formatAllergenNames, getAllergensByIds, getMatchingTextAllergens, getMatchingUserAllergens } from '../src/services/allergenService.js';
import { analyzeIngredientText, getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientById, getIngredientCategorySummaries, getRelatedIngredients, getSearchFilterOptions, getSearchSuggestions, searchIngredients } from '../src/services/ingredientService.js';
import { categoryPath } from '../src/data/categories.js';
import { extractIngredientsFromImage } from '../src/services/ocrService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from '../src/services/reportExportService.js';
import { renderDataPage } from '../src/pages/dataPage.js';
import { renderFoodAdditiveDetails } from '../src/pages/detailPage.js';
import { renderAnalyzePage } from '../src/pages/analyzePage.js';
import { renderHomePage } from '../src/pages/homePage.js';
import { renderScanPage } from '../src/pages/scanPage.js';
import { renderSearchPage } from '../src/pages/searchPage.js';
import { renderSettingsPage } from '../src/pages/settingsPage.js';
import { ingredientCard } from '../src/components/render.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from '../src/router/router.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { formatBytes, SCAN_IMAGE_MAX_BYTES, validateScanImageFile } from '../src/utils/imageFile.js';
import { readJson, writeJson } from '../src/services/storageService.js';
import { addHistory, clearAnalysisReports, clearLocalUserData, clearScanDraft, createAnalysisReport, deleteAnalysisReport, getAnalysisReportById, getAnalysisReports, getFavoriteIngredients, getFavoriteItems, getHistory, getLocalDataSnapshot, getLocalDataSummary, getScanDraft, getUserAllergens, removeHistory, saveAnalysisReport, saveScanDraft, setUserAllergens, toggleFavorite } from '../src/store/userStore.js';
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
assert.deepEqual(resolveRoute('#/food/scan'), { view: 'scan', category: 'food', input: '' });
assert.deepEqual(resolveRoute('#/food/scan?text=%E6%9F%A0%E6%AA%AC%E9%85%B8'), { view: 'scan', category: 'food', input: '柠檬酸' });
assert.deepEqual(resolveRoute('#/food/data'), { view: 'data', category: 'food' });
assert.deepEqual(resolveRoute('#/food/reports'), { view: 'reports', category: 'food' });
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
assert.equal(getRouteTitle(resolveRoute('#/food/scan')), '扫描识别 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/data')), '数据来源 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/ingredient/citric-acid')), '柠檬酸 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/food/reports/report-123')), '报告详情 - 食品添加剂 - CompCheck 成分小查');
assert.equal(getRouteTitle(resolveRoute('#/not-a-real-page')), '页面不存在 - 食品添加剂 - CompCheck 成分小查');
assert.deepEqual(getNavigationLinks(resolveRoute('#/food/search?q=E330')), [
  { key: 'search', href: '#/food/search', active: true },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'analyze', href: '#/food/analyze', active: false },
  { key: 'data', href: '#/food/data', active: false },
  { key: 'reports', href: '#/food/reports', active: false },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
assert.deepEqual(getNavigationLinks(resolveRoute('#/cosmetics/analyze')), [
  { key: 'search', href: '#/cosmetics/search', active: false },
  { key: 'scan', href: '#/cosmetics/scan', active: false },
  { key: 'analyze', href: '#/cosmetics/analyze', active: true },
  { key: 'data', href: '#/cosmetics/data', active: false },
  { key: 'reports', href: '#/cosmetics/reports', active: false },
  { key: 'favorites', href: '#/cosmetics/favorites', active: false },
  { key: 'settings', href: '#/cosmetics/settings', active: false }
]);
assert.deepEqual(getNavigationLinks(resolveRoute('#/food/reports/report-123')), [
  { key: 'search', href: '#/food/search', active: false },
  { key: 'scan', href: '#/food/scan', active: false },
  { key: 'analyze', href: '#/food/analyze', active: false },
  { key: 'data', href: '#/food/data', active: false },
  { key: 'reports', href: '#/food/reports', active: true },
  { key: 'favorites', href: '#/food/favorites', active: false },
  { key: 'settings', href: '#/food/settings', active: false }
]);
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
const indexHtml = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(indexHtml, /name="apple-mobile-web-app-capable" content="yes"/);
assert.match(indexHtml, /data-mobile-nav-key="home"/);
assert.match(indexHtml, /data-mobile-nav-key="scan"/);
assert.match(indexHtml, /data-nav-key="scan"/);
assert.match(indexHtml, /data-nav-key="data"/);
assert.match(indexHtml, /data-nav-key="reports"/);
const appManifest = JSON.parse(await readFile(new URL('../src/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(appManifest.display, 'standalone');
assert.equal(appManifest.start_url, './#/food');
assert.equal(appManifest.icons[0].src, './app-icon.svg');
assert.equal(appManifest.shortcuts[1].url, './#/food/scan');
const mainJs = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainJs, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
const serviceWorkerJs = await readFile(new URL('../src/sw.js', import.meta.url), 'utf8');
assert.match(serviceWorkerJs, /CACHE_VERSION = 'compcheck-shell-v2'/);
assert.match(serviceWorkerJs, /\.\/index\.html/);
assert.match(serviceWorkerJs, /\.\/main\.js/);
assert.match(serviceWorkerJs, /\.\/data\/foodAdditives\.js/);
assert.match(serviceWorkerJs, /\.\/pages\/dataPage\.js/);
assert.match(serviceWorkerJs, /\.\/utils\/imageFile\.js/);
assert.match(serviceWorkerJs, /request\.mode === 'navigate'/);
assert.match(serviceWorkerJs, /caches\.match\('\.\/index\.html'\)/);
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
assert.match(scanHtml, /accept="image\/png,image\/jpeg,image\/webp,image\/gif,image\/bmp,image\/avif"/);
assert.match(scanHtml, /capture="environment"/);
assert.match(scanHtml, /data-scan-preview/);
assert.match(scanHtml, /data-rotate-scan-image/);
assert.match(scanHtml, /data-clear-scan-image/);
assert.match(scanHtml, /旋转预览/);
assert.match(scanHtml, /移除图片/);
assert.match(scanHtml, /data-scan-draft-status/);
assert.match(scanHtml, /单张不超过 8 MB/);
assert.match(scanHtml, /柠檬酸/);
assert.match(scanHtml, /已从链接带入待分析文本/);
assert.match(scanHtml, /href="#\/food\/analyze"/);
assert.match(renderScanPage('', 'cosmetics'), /化妆品成分/);
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

const enResults = searchIngredients('BHA');
assert.equal(enResults[0].id, 'salicylic-acid');
assert.equal(searchIngredients('E330', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('INS 211', 'food')[0].id, 'sodium-benzoate');
assert.equal(searchIngredients('E621', 'food')[0].id, 'monosodium-glutamate');
assert.equal(searchIngredients('E950', 'food')[0].id, 'acesulfame-potassium');
assert.equal(searchIngredients('E282', 'food')[0].id, 'calcium-propionate');
assert.equal(getSearchSuggestions('', 'food')[0].id, 'citric-acid');
assert.equal(getSearchSuggestions('E330', 'food')[0].id, 'citric-acid');
assert.equal(getSearchSuggestions('INS 211', 'food')[0].id, 'sodium-benzoate');
assert.equal(getSearchSuggestions('INS 102', 'food')[0].id, 'tartrazine');
assert.equal(getSearchSuggestions('INS 250', 'food')[0].id, 'sodium-nitrite');
assert.equal(getSearchSuggestions('INS 551', 'food')[0].id, 'silicon-dioxide');
assert.equal(getSearchSuggestions('防腐剂', 'food')[0].matchLabel, '分类');
assert.equal(getSearchSuggestions('BHA', 'cosmetics')[0].id, 'salicylic-acid');
assert.equal(getSearchSuggestions('not-found-term', 'food').length, 0);
assert.deepEqual(searchIngredients('40 mg', 'food'), []);
assert.deepEqual(searchIngredients('', 'food'), []);
assert.deepEqual(
  searchIngredients('', 'food', { risk: 'medium', ingredientCategory: '防腐剂' }).map((item) => item.id).sort(),
  ['calcium-propionate', 'natamycin', 'nisin', 'potassium-nitrate', 'potassium-sorbate', 'sodium-benzoate'].sort()
);
assert.deepEqual(
  searchIngredients('防腐剂', 'food', { ingredientCategory: '防腐剂' }).map((item) => item.id).sort(),
  ['calcium-propionate', 'natamycin', 'nisin', 'potassium-nitrate', 'potassium-sorbate', 'sodium-benzoate', 'sodium-nitrite'].sort()
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
const foodAuditSummary = getDatasetAuditSummary('food');
assert.equal(foodAuditSummary.totalCount, 50);
assert.equal(foodAuditSummary.categoryCount, 13);
assert.equal(foodAuditSummary.draftCount, 50);
assert.equal(foodAuditSummary.reviewedOrVerifiedCount, 0);
assert.equal(foodAuditSummary.withUsageLimitsCount, 0);
assert.equal(foodAuditSummary.missingUsageLimitsCount, 50);
assert.equal(foodAuditSummary.mvpMinimumReached, true);
const foodSourceSummaries = getDatasetSourceSummaries('food');
assert.equal(foodSourceSummaries.length, 4);
assert.equal(foodSourceSummaries[0].recordCount, 50);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'GB 2760'), true);
assert.equal(foodSourceSummaries.some((item) => item.standard === 'FAO/WHO JECFA'), true);
const foodVersionSummaries = getDatasetVersionSummaries('food');
assert.deepEqual(foodVersionSummaries, [{ version: 'food-additives-seed-v4', count: 50, latestUpdatedAt: '2026-06-10' }]);
const foodCategorySummaries = getIngredientCategorySummaries('food');
assert.equal(foodCategorySummaries.find((item) => item.name === '酸度调节剂').count, 9);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').count, 7);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.medium, 6);
assert.equal(foodCategorySummaries.find((item) => item.name === '防腐剂').riskCounts.high, 1);
assert.equal(foodCategorySummaries.find((item) => item.name === '着色剂').count, 5);
assert.equal(foodCategorySummaries.find((item) => item.name === '增味剂').count, 2);
assert.equal(foodCategorySummaries.find((item) => item.name === '甜味剂').count, 6);
assert.equal(foodCategorySummaries.find((item) => item.name === '增稠剂').count, 7);
assert.equal(foodCategorySummaries.find((item) => item.name === '乳化剂').count, 3);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗氧化剂').count, 4);
assert.equal(foodCategorySummaries.find((item) => item.name === '抗结剂').count, 1);
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
assert.match(homeHtmlWithCategoryFilters, /50 条[\s\S]*草稿数据/);
assert.match(homeHtmlWithCategoryFilters, /0 条[\s\S]*已复核\/验证/);
assert.match(homeHtmlWithCategoryFilters, /0%[\s\S]*限量覆盖/);
const dataPageHtml = renderRoute(resolveRoute('#/food/data'));
assert.match(dataPageHtml, /数据来源与审核状态/);
assert.match(dataPageHtml, /data-dataset-detail/);
assert.match(dataPageHtml, /50 条[\s\S]*当前记录/);
assert.match(dataPageHtml, /4 个来源/);
assert.match(dataPageHtml, /食品安全国家标准 食品添加剂使用标准/);
assert.match(dataPageHtml, /GB 2760/);
assert.match(dataPageHtml, /food-additives-seed-v4/);
assert.match(dataPageHtml, /缺逐食品类别限量/);
assert.match(dataPageHtml, /href="#\/food\/search\?ingredientCategory=%E9%85%B8%E5%BA%A6%E8%B0%83%E8%8A%82%E5%89%82"/);
assert.match(renderDataPage('cosmetics'), /当前类别含 8 条原型数据/);
const searchHtmlWithSuggestions = renderSearchPage('E330', 'food');
assert.match(searchHtmlWithSuggestions, /data-search-suggestions/);
assert.match(searchHtmlWithSuggestions, /suggestion-item/);
assert.match(searchHtmlWithSuggestions, /柠檬酸/);
assert.match(searchHtmlWithSuggestions, /E-number：E330/);
assert.match(searchHtmlWithSuggestions, /data-dataset-audit-note/);
assert.match(searchHtmlWithSuggestions, /50 条草稿数据/);
assert.match(searchHtmlWithSuggestions, /使用限量和 ADI 原文仍在审核中/);
const firstPageSearchHtml = renderSearchPage('剂', 'food');
assert.match(firstPageSearchHtml, /显示第 1-6 项，共 50 项/);
assert.match(firstPageSearchHtml, /href="#\/food\/search\?q=%E5%89%82&page=2"/);
const riskSortedSearchHtml = renderSearchPage('剂', 'food', {}, 1, 'risk');
assert.match(riskSortedSearchHtml, /value="risk" selected/);
assert.match(riskSortedSearchHtml, /排序：关注等级优先/);
assert.match(riskSortedSearchHtml, /risk-facets/);
assert.match(riskSortedSearchHtml, /category-facets/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&risk=medium&sort=risk"/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=risk"/);
assert.match(riskSortedSearchHtml, /href="#\/food\/search\?q=%E5%89%82&sort=risk&page=2"/);
const riskSortedSweetenerHtml = renderSearchPage('', 'food', { ingredientCategory: '甜味剂' }, 1, 'risk');
assert.equal(riskSortedSweetenerHtml.indexOf('阿斯巴甜') < riskSortedSweetenerHtml.indexOf('三氯蔗糖'), true);
assert.match(riskSortedSweetenerHtml, /href="#\/food\/search\?ingredientCategory=%E7%94%9C%E5%91%B3%E5%89%82&sort=risk"/);
assert.match(riskSortedSweetenerHtml, /href="#\/food\/search\?risk=medium&ingredientCategory=%E7%94%9C%E5%91%B3%E5%89%82&sort=risk"/);
const mediumNameSortedHtml = renderSearchPage('', 'food', { risk: 'medium' }, 1, 'name');
assert.match(mediumNameSortedHtml, /href="#\/food\/search\?risk=medium&ingredientCategory=%E9%98%B2%E8%85%90%E5%89%82&sort=name"/);
const highRiskSearchHtml = renderSearchPage('', 'food', { risk: 'high' });
assert.match(highRiskSearchHtml, /高关注/);
assert.match(highRiskSearchHtml, /亚硝酸钠/);
const pagedSearchHtml = renderSearchPage('剂', 'food', {}, 2);
assert.match(pagedSearchHtml, /显示第 7-12 项，共 50 项/);
assert.match(pagedSearchHtml, /aria-current="page">2</);
assert.match(pagedSearchHtml, /href="#\/food\/search\?q=%E5%89%82"/);
assert.doesNotMatch(pagedSearchHtml, /<h3>阿斯巴甜<\/h3>/);

assert.deepEqual(splitIngredientInput('水，烟酰胺; 香精\n水杨酸'), ['水', '烟酰胺', '香精', '水杨酸']);
assert.deepEqual(splitIngredientInput('苯氧乙醇(防腐剂)，香精（香料）'), ['苯氧乙醇', '香精']);
assert.deepEqual(splitIngredientInput('单，双甘油脂肪酸酯，甘油'), ['单，双甘油脂肪酸酯', '甘油']);

const analysis = analyzeIngredientText('水，烟酰胺，透明质酸钠，水杨酸，香精，未知成分');
assert.equal(analysis.matchedCount, 4);
assert.deepEqual(analysis.highlights.map((item) => item.id), ['salicylic-acid', 'fragrance']);
assert.deepEqual(analysis.unknownItems, ['水', '未知成分']);
assert.match(analysis.summary, /已匹配 4 项成分/);

const foodAnalysis = analyzeIngredientText('柠檬酸，山梨酸钾，焦亚硫酸钠，未知添加剂', 'food');
assert.equal(foodAnalysis.matchedCount, 3);
assert.deepEqual(foodAnalysis.highlights.map((item) => item.id), ['potassium-sorbate', 'sodium-metabisulfite']);
assert.deepEqual(foodAnalysis.unknownItems, ['未知添加剂']);
assert.match(foodAnalysis.summary, /摄入频率、食品类别和个人情况/);
assert.doesNotMatch(foodAnalysis.summary, /肤质/);
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

const aiResult = await analyzeIngredientsByAI('烟酰胺');
assert.equal(aiResult.enabled, false);
assert.match(aiResult.message, /服务端代理/);

const ocrResult = await extractIngredientsFromImage({ name: 'ingredient-list.png' });
assert.equal(ocrResult.enabled, false);
assert.equal(ocrResult.text, '');
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

const originalUserAllergens = getUserAllergens();
assert.deepEqual(setUserAllergens(['milk', 'milk', '', 'soybeans']), ['milk', 'soybeans']);
assert.deepEqual(getUserAllergens(), ['milk', 'soybeans']);
const settingsHtml = renderSettingsPage();
assert.match(settingsHtml, /过敏原档案/);
assert.match(settingsHtml, /2 项已关注/);
assert.match(settingsHtml, /value="milk" checked/);
assert.match(settingsHtml, /value="soybeans" checked/);
assert.match(settingsHtml, /value="peanuts"/);
assert.match(settingsHtml, /数据与隐私/);
assert.match(settingsHtml, /data-export-local-data/);
assert.match(settingsHtml, /data-clear-local-data/);
assert.match(settingsHtml, /data-local-data-count="favorites">2</);
assert.match(settingsHtml, /data-local-data-count="history">1</);
assert.match(settingsHtml, /data-local-data-count="allergens">2</);
saveScanDraft('柠檬酸，山梨酸钾', 'food');
const localDataSummary = getLocalDataSummary();
assert.equal(localDataSummary.favorites, 2);
assert.equal(localDataSummary.history, 1);
assert.equal(localDataSummary.allergens, 2);
assert.equal(localDataSummary.scanDrafts, 1);
assert.equal(localDataSummary.totalItems, 6);
const localDataSnapshot = getLocalDataSnapshot();
assert.equal(localDataSnapshot.schemaVersion, 1);
assert.equal(localDataSnapshot.favorites.some((item) => item.id === 'citric-acid' && item.category === 'food'), true);
assert.equal(localDataSnapshot.history[0], '烟酰胺');
assert.equal(localDataSnapshot.scanDrafts.food, '柠檬酸，山梨酸钾');
assert.deepEqual(clearLocalUserData(), {
  favorites: 0,
  history: 0,
  allergens: 0,
  reports: 0,
  scanDrafts: 0,
  totalItems: 0
});
assert.deepEqual(getFavoriteItems(), []);
assert.deepEqual(getHistory(), []);
assert.deepEqual(getUserAllergens(), []);
assert.equal(getScanDraft('food'), '');
toggleFavorite('citric-acid', 'food');
toggleFavorite('niacinamide', 'cosmetics');
addHistory('烟酰胺');
setUserAllergens(['milk', 'soybeans']);

const analyzeHtmlWithAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithAllergens, /您当前关注的过敏原档案：/);
assert.match(analyzeHtmlWithAllergens, /data-save-report/);
assert.match(analyzeHtmlWithAllergens, /查看历史报告/);
assert.match(analyzeHtmlWithAllergens, /乳及乳制品、大豆/);
assert.match(analyzeHtmlWithAllergens, /发现过敏原成分/);
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
assert.doesNotMatch(emptyAnalyzeHtml, /data-save-report/);
setUserAllergens(originalUserAllergens);

writeJson('compcheck:analysis-reports', []);
setUserAllergens(['milk', 'soybeans']);
const reportDraft = createAnalysisReport(SAMPLES['food-2'], 'food');
assert.equal(reportDraft.category, 'food');
assert.equal(reportDraft.matchedIngredientIds.includes('lecithins'), true);
assert.equal(reportDraft.ingredientAllergenHits.some((hit) => hit.id === 'lecithins' && hit.allergenIds.includes('soybeans')), true);
assert.equal(reportDraft.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenIds.includes('milk')), true);
const savedReport = saveAnalysisReport(SAMPLES['food-2'], 'food');
assert.equal(getAnalysisReports('food').length, 1);
assert.equal(getAnalysisReportById(savedReport.id).id, savedReport.id);
const reportsHtml = renderRoute(resolveRoute('#/food/reports'));
assert.match(reportsHtml, /分析报告/);
assert.match(reportsHtml, /data-delete-report=/);
assert.match(reportsHtml, /重新分析/);
const reportDetailHtml = renderRoute(resolveRoute(`#/food/reports/${savedReport.id}`));
assert.match(reportDetailHtml, /原始成分表/);
assert.match(reportDetailHtml, /导出报告/);
assert.match(reportDetailHtml, /data-report-markdown/);
assert.match(reportDetailHtml, /data-copy-report=/);
assert.match(reportDetailHtml, /data-download-report="markdown"/);
assert.match(reportDetailHtml, /data-download-report="json"/);
assert.match(reportDetailHtml, /保存时发现过敏原/);
assert.match(reportDetailHtml, /全脂奶粉/);
assert.match(reportDetailHtml, /href="#\/food\/analyze\?text=/);
const reportMarkdown = buildReportMarkdown(savedReport);
assert.match(reportMarkdown, /^# /);
assert.match(reportMarkdown, /## 原始成分表/);
assert.match(reportMarkdown, /## 已匹配成分/);
assert.match(reportMarkdown, /卵磷脂/);
assert.match(reportMarkdown, /过敏原：大豆/);
assert.match(reportMarkdown, /全脂奶粉/);
assert.match(reportMarkdown, /不提供医疗诊断或治疗建议/);
const exportPayload = buildReportExportPayload(savedReport);
assert.equal(exportPayload.report.id, savedReport.id);
assert.equal(exportPayload.report.categoryLabel, '食品添加剂');
assert.equal(exportPayload.matchedIngredients.some((item) => item.id === 'lecithins'), true);
assert.equal(exportPayload.textAllergenHits.some((hit) => hit.item === '全脂奶粉' && hit.allergenNames === '乳及乳制品'), true);
assert.match(buildReportFileName(savedReport, 'md'), /^\d{8}-.+\.md$/);
assert.match(buildReportFileName({ ...savedReport, title: 'A/B:C*D?E"F<G>H|I' }, 'json'), /^\d{8}-ABCDEFGHI\.json$/);
assert.deepEqual(deleteAnalysisReport(savedReport.id), []);
assert.equal(getAnalysisReportById(savedReport.id), null);
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
