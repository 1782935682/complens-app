import { getMatchingTextAllergens, getMatchingUserAllergens } from '../services/allergenService.js';
import { analyzeIngredientText, getIngredientById } from '../services/ingredientService.js';
import { readJson, writeJson } from '../services/storageService.js';

const FAVORITES_KEY = 'compcheck:favorites';
const HISTORY_KEY = 'compcheck:history';
const ALLERGENS_KEY = 'compcheck:allergens';
const ANALYSIS_REPORTS_KEY = 'compcheck:analysis-reports';
const SCAN_DRAFTS_KEY = 'compcheck:scan-drafts';
const MAX_HISTORY = 8;
const MAX_ANALYSIS_REPORTS = 20;
const DEFAULT_CATEGORY = 'cosmetics';
const REPORT_SCHEMA_VERSION = 1;

export function getFavoriteItems() {
  return readJson(FAVORITES_KEY, [])
    .map(normalizeFavoriteItem)
    .filter(Boolean);
}

export function getFavoriteIds(category = DEFAULT_CATEGORY) {
  return getFavoriteItems()
    .filter((item) => item.category === category)
    .map((item) => item.id);
}

export function getFavoriteIngredients(category = DEFAULT_CATEGORY) {
  return getFavoriteItems()
    .filter((item) => item.category === category)
    .map((item) => getIngredientById(item.id, item.category))
    .filter(Boolean);
}

export function toggleFavorite(id, category = DEFAULT_CATEGORY) {
  const current = getFavoriteItems();
  const exists = current.some((item) => item.id === id && item.category === category);
  const next = exists
    ? current.filter((item) => item.id !== id || item.category !== category)
    : [{ id, category }, ...current];
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function isFavorite(id, category = DEFAULT_CATEGORY) {
  return getFavoriteItems().some((item) => item.id === id && item.category === category);
}

export function getHistory() {
  return readJson(HISTORY_KEY, []);
}

export function addHistory(query) {
  const normalized = String(query || '').trim();
  if (!normalized) return getHistory();
  const next = [
    normalized,
    ...getHistory().filter((item) => item !== normalized)
  ].slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  writeJson(HISTORY_KEY, []);
}

export function removeHistory(query) {
  const normalized = String(query || '').trim();
  if (!normalized) return getHistory();
  const next = getHistory().filter((item) => item !== normalized);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function getUserAllergens() {
  return readJson(ALLERGENS_KEY, []);
}

export function setUserAllergens(ids) {
  const next = [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
  writeJson(ALLERGENS_KEY, next);
  return next;
}

export function getScanDraft(category = DEFAULT_CATEGORY) {
  const drafts = normalizeScanDrafts(readJson(SCAN_DRAFTS_KEY, {}));
  return drafts[category] || '';
}

export function saveScanDraft(input, category = DEFAULT_CATEGORY) {
  const normalizedInput = String(input || '').trim();
  const drafts = normalizeScanDrafts(readJson(SCAN_DRAFTS_KEY, {}));
  if (normalizedInput) {
    drafts[category] = normalizedInput;
  } else {
    delete drafts[category];
  }
  writeJson(SCAN_DRAFTS_KEY, drafts);
  return normalizedInput;
}

export function clearScanDraft(category = DEFAULT_CATEGORY) {
  const drafts = normalizeScanDrafts(readJson(SCAN_DRAFTS_KEY, {}));
  delete drafts[category];
  writeJson(SCAN_DRAFTS_KEY, drafts);
  return drafts;
}

export function getAnalysisReports(category) {
  const reports = readJson(ANALYSIS_REPORTS_KEY, [])
    .map(normalizeAnalysisReport)
    .filter(Boolean);
  const filtered = category ? reports.filter((report) => report.category === category) : reports;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAnalysisReportById(id) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;
  return getAnalysisReports().find((report) => report.id === normalizedId) || null;
}

export function saveAnalysisReport(input, category = DEFAULT_CATEGORY) {
  const report = createAnalysisReport(input, category);
  if (!report) return null;
  const current = getAnalysisReports().filter((item) => item.id !== report.id);
  const sameCategory = [report, ...current.filter((item) => item.category === report.category)]
    .slice(0, MAX_ANALYSIS_REPORTS);
  const otherCategories = current.filter((item) => item.category !== report.category);
  const next = [...sameCategory, ...otherCategories].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  writeJson(ANALYSIS_REPORTS_KEY, next);
  return report;
}

export function deleteAnalysisReport(id) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return getAnalysisReports();
  const next = getAnalysisReports().filter((report) => report.id !== normalizedId);
  writeJson(ANALYSIS_REPORTS_KEY, next);
  return next;
}

export function clearAnalysisReports(category) {
  const next = category
    ? getAnalysisReports().filter((report) => report.category !== category)
    : [];
  writeJson(ANALYSIS_REPORTS_KEY, next);
  return next;
}

export function createAnalysisReport(input, category = DEFAULT_CATEGORY) {
  const normalizedInput = String(input || '').trim();
  if (!normalizedInput) return null;

  const reportCategory = typeof category === 'string' && category ? category : DEFAULT_CATEGORY;
  const analysis = analyzeIngredientText(normalizedInput, reportCategory);
  const userAllergenIds = getUserAllergens();
  const ingredientAllergenHits = analysis.ingredients
    .map((ingredient) => ({
      id: ingredient.id,
      allergenIds: getMatchingUserAllergens(ingredient, userAllergenIds).map((allergen) => allergen.id)
    }))
    .filter((item) => item.id && item.allergenIds.length);
  const textAllergenHits = analysis.unknownItems
    .map((item) => ({
      item,
      allergenIds: getMatchingTextAllergens(item, userAllergenIds).map((allergen) => allergen.id)
    }))
    .filter((item) => item.item && item.allergenIds.length);

  return {
    id: createReportId(),
    category: reportCategory,
    title: buildReportTitle(normalizedInput),
    input: normalizedInput,
    createdAt: new Date().toISOString(),
    matchedCount: analysis.matchedCount,
    summary: analysis.summary,
    matchedIngredientIds: analysis.ingredients.map((ingredient) => ingredient.id).filter(Boolean),
    highlightIngredientIds: analysis.highlights.map((ingredient) => ingredient.id).filter(Boolean),
    unknownItems: analysis.unknownItems,
    riskCounts: countRisks(analysis.ingredients),
    userAllergenIds,
    ingredientAllergenHits,
    textAllergenHits,
    schemaVersion: REPORT_SCHEMA_VERSION
  };
}

function normalizeFavoriteItem(value) {
  if (typeof value === 'string') {
    return {
      id: value,
      category: DEFAULT_CATEGORY
    };
  }
  if (value && typeof value.id === 'string') {
    return {
      id: value.id,
      category: typeof value.category === 'string' ? value.category : DEFAULT_CATEGORY
    };
  }
  return null;
}

function normalizeAnalysisReport(value) {
  if (!value || typeof value.id !== 'string' || typeof value.input !== 'string') return null;
  const category = typeof value.category === 'string' ? value.category : DEFAULT_CATEGORY;
  const matchedIngredientIds = normalizeStringList(value.matchedIngredientIds);
  const highlightIngredientIds = normalizeStringList(value.highlightIngredientIds);
  const unknownItems = normalizeStringList(value.unknownItems);
  const userAllergenIds = normalizeStringList(value.userAllergenIds);
  return {
    id: value.id,
    category,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : buildReportTitle(value.input),
    input: value.input,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString(),
    matchedCount: Number.isFinite(value.matchedCount) ? value.matchedCount : matchedIngredientIds.length,
    summary: typeof value.summary === 'string' ? value.summary : '',
    matchedIngredientIds,
    highlightIngredientIds,
    unknownItems,
    riskCounts: normalizeRiskCounts(value.riskCounts),
    userAllergenIds,
    ingredientAllergenHits: normalizeIngredientAllergenHits(value.ingredientAllergenHits),
    textAllergenHits: normalizeTextAllergenHits(value.textAllergenHits),
    schemaVersion: Number.isFinite(value.schemaVersion) ? value.schemaVersion : REPORT_SCHEMA_VERSION
  };
}

function buildReportTitle(input) {
  const compact = String(input || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '未命名报告';
  return compact.length > 28 ? `${compact.slice(0, 28)}...` : compact;
}

function createReportId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `report-${Date.now().toString(36)}-${random}`;
}

function countRisks(ingredients) {
  return ingredients.reduce((counts, ingredient) => {
    const level = ['low', 'medium', 'high', 'unknown'].includes(ingredient.riskLevel) ? ingredient.riskLevel : 'unknown';
    counts[level] += 1;
    return counts;
  }, { low: 0, medium: 0, high: 0, unknown: 0 });
}

function normalizeRiskCounts(value) {
  return {
    low: Number.isFinite(value?.low) ? value.low : 0,
    medium: Number.isFinite(value?.medium) ? value.medium : 0,
    high: Number.isFinite(value?.high) ? value.high : 0,
    unknown: Number.isFinite(value?.unknown) ? value.unknown : 0
  };
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeScanDrafts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([category, input]) => [String(category || '').trim(), String(input || '').trim()])
      .filter(([category, input]) => category && input)
  );
}

function normalizeIngredientAllergenHits(value) {
  return Array.isArray(value)
    ? value
      .map((item) => ({
        id: String(item?.id || '').trim(),
        allergenIds: normalizeStringList(item?.allergenIds)
      }))
      .filter((item) => item.id && item.allergenIds.length)
    : [];
}

function normalizeTextAllergenHits(value) {
  return Array.isArray(value)
    ? value
      .map((item) => ({
        item: String(item?.item || '').trim(),
        allergenIds: normalizeStringList(item?.allergenIds)
      }))
      .filter((item) => item.item && item.allergenIds.length)
    : [];
}
