import { isProductCategory } from '../data/categories.js';
import { defaultSupportTopic, isSupportTopic } from '../data/supportTopics.js';
import { getMatchingTextAllergens, getMatchingUserAllergens } from '../services/allergenService.js';
import { analyzeIngredientText, getIngredientById } from '../services/ingredientService.js';
import { readJson, writeJson } from '../services/storageService.js';

const FAVORITES_KEY = 'compcheck:favorites';
const HISTORY_KEY = 'compcheck:history';
const HISTORY_RECORDING_KEY = 'compcheck:history-recording-enabled';
const ALLERGENS_KEY = 'compcheck:allergens';
const ANALYSIS_REPORTS_KEY = 'compcheck:analysis-reports';
const SCAN_DRAFTS_KEY = 'compcheck:scan-drafts';
const SCAN_PENDING_KEY = 'compcheck:scan-pending';
const SCAN_TIPS_SEEN_KEY = 'compcheck:scan-tips-seen';
const ONBOARDING_KEY = 'compcheck:onboarding';
const COMPARE_ITEMS_KEY = 'compcheck:compare-items';
const SUPPORT_REQUESTS_KEY = 'compcheck:support-requests';
const LOCAL_DATA_SCHEMA_VERSION = 1;
const ONBOARDING_SCHEMA_VERSION = 1;
const MAX_HISTORY = 8;
const MAX_ANALYSIS_REPORTS = 20;
const MAX_SUPPORT_REQUESTS = 12;
export const MAX_COMPARE_ITEMS = 4;
const DEFAULT_CATEGORY = 'cosmetics';
const DEFAULT_ONBOARDING_CATEGORY = 'food';
const REPORT_SCHEMA_VERSION = 2;
const ONBOARDING_STATUSES = ['pending', 'completed', 'skipped'];
const ONBOARDING_CATEGORIES = ['food', 'cosmetics'];
const SUPPORT_STATUSES = ['local', 'copied', 'closed'];
const SCAN_STATUSES = ['idle', 'loading', 'success', 'empty', 'error', 'manual'];
const OCR_MODES = ['real', 'manual', 'fallback'];

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

export function getCompareItems(category) {
  const items = normalizeCompareItems(readJson(COMPARE_ITEMS_KEY, []));
  return category ? items.filter((item) => item.category === category) : items;
}

export function getCompareIngredients(category = DEFAULT_CATEGORY) {
  return getCompareItems(category)
    .map((item) => getIngredientById(item.id, item.category))
    .filter(Boolean);
}

export function isInCompare(id, category = DEFAULT_CATEGORY) {
  return getCompareItems(category).some((item) => item.id === id && item.category === category);
}

export function addCompareIngredient(id, category = DEFAULT_CATEGORY) {
  const normalized = normalizeFavoriteItem({ id, category });
  const current = getCompareItems();
  const categoryItems = current.filter((item) => item.category === normalized?.category);
  if (!normalized || !isProductCategory(normalized.category) || !getIngredientById(normalized.id, normalized.category)) {
    return buildCompareResult(false, 'missing', '未找到可加入对比的成分。', category);
  }
  if (categoryItems.some((item) => item.id === normalized.id)) {
    return buildCompareResult(true, 'exists', '已在对比列表中。', normalized.category);
  }
  if (categoryItems.length >= MAX_COMPARE_ITEMS) {
    return buildCompareResult(false, 'full', `最多选择 ${MAX_COMPARE_ITEMS} 个成分对比。`, normalized.category);
  }

  writeJson(COMPARE_ITEMS_KEY, [...current, normalized]);
  return buildCompareResult(true, 'added', `已加入对比（${categoryItems.length + 1}/${MAX_COMPARE_ITEMS}）。`, normalized.category);
}

export function removeCompareIngredient(id, category = DEFAULT_CATEGORY) {
  const normalizedId = String(id || '').trim();
  const current = getCompareItems();
  const next = current.filter((item) => item.id !== normalizedId || item.category !== category);
  writeJson(COMPARE_ITEMS_KEY, next);
  return buildCompareResult(true, 'removed', '已从对比列表移除。', category);
}

export function clearCompareItems(category) {
  const current = getCompareItems();
  const next = category ? current.filter((item) => item.category !== category) : [];
  writeJson(COMPARE_ITEMS_KEY, next);
  return buildCompareResult(true, 'cleared', '已清空当前类别对比列表。', category || DEFAULT_CATEGORY);
}

export function getHistory() {
  return readJson(HISTORY_KEY, []);
}

export function isHistoryRecordingEnabled() {
  return readJson(HISTORY_RECORDING_KEY, true) !== false;
}

export function setHistoryRecordingEnabled(enabled) {
  const next = Boolean(enabled);
  writeJson(HISTORY_RECORDING_KEY, next);
  return next;
}

export function addHistory(query) {
  if (!isHistoryRecordingEnabled()) return getHistory();
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

export function getOnboardingState() {
  return normalizeOnboardingState(readJson(ONBOARDING_KEY, null));
}

export function shouldShowOnboardingPrompt() {
  return getOnboardingState().status === 'pending';
}

export function completeOnboarding(options = {}) {
  const now = new Date().toISOString();
  const allergenIds = setUserAllergens(options.allergenIds);
  const historyRecordingEnabled = setHistoryRecordingEnabled(options.historyRecordingEnabled !== false);
  const next = {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    status: 'completed',
    preferredCategory: normalizeOnboardingCategory(options.preferredCategory),
    acceptedBoundary: options.acceptedBoundary === true,
    allergenCount: allergenIds.length,
    historyRecordingEnabled,
    completedAt: now,
    skippedAt: '',
    updatedAt: now
  };
  writeJson(ONBOARDING_KEY, next);
  return next;
}

export function skipOnboarding(options = {}) {
  const now = new Date().toISOString();
  const next = {
    ...getOnboardingState(),
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    status: 'skipped',
    preferredCategory: normalizeOnboardingCategory(options.preferredCategory),
    skippedAt: now,
    updatedAt: now
  };
  writeJson(ONBOARDING_KEY, next);
  return next;
}

export function resetOnboarding() {
  const next = createDefaultOnboardingState();
  writeJson(ONBOARDING_KEY, next);
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

export function getPendingScan() {
  return normalizePendingScan(readJson(SCAN_PENDING_KEY, null));
}

export function setPendingScan(input = {}) {
  const next = normalizePendingScan({
    ...getPendingScan(),
    ...input,
    updatedAt: new Date().toISOString()
  });
  writeJson(SCAN_PENDING_KEY, next);
  return next;
}

export function clearPendingScan() {
  const next = createDefaultPendingScan();
  writeJson(SCAN_PENDING_KEY, next);
  return next;
}

export function hasSeenScanTips() {
  return readJson(SCAN_TIPS_SEEN_KEY, false) === true;
}

export function markScanTipsSeen() {
  writeJson(SCAN_TIPS_SEEN_KEY, true);
  return true;
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

export function saveAnalysisReport(input, category = DEFAULT_CATEGORY, options = {}) {
  const report = createAnalysisReport(input, category, options);
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

export function getSupportRequests(category) {
  const requests = normalizeSupportRequests(readJson(SUPPORT_REQUESTS_KEY, []));
  const filtered = category ? requests.filter((request) => request.category === category) : requests;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSupportRequest(input = {}, category = DEFAULT_ONBOARDING_CATEGORY) {
  const supportCategory = isProductCategory(category) ? category : DEFAULT_ONBOARDING_CATEGORY;
  const subject = truncateText(input.subject, 80);
  const message = truncateText(input.message, 1000);
  const contact = truncateText(input.contact, 120);
  const topic = isSupportTopic(input.topic) ? input.topic : defaultSupportTopic;

  if (!subject) {
    return buildSupportResult(false, 'subject', '请填写问题标题。', supportCategory);
  }
  if (!message) {
    return buildSupportResult(false, 'message', '请填写问题描述。', supportCategory);
  }
  if (input.acceptedBoundary !== true) {
    return buildSupportResult(false, 'boundary', '请先确认反馈内容的本机保存边界。', supportCategory);
  }

  const request = {
    id: createSupportRequestId(),
    category: supportCategory,
    topic,
    subject,
    message,
    contact,
    status: 'local',
    createdAt: new Date().toISOString()
  };
  const next = [request, ...getSupportRequests().filter((item) => item.id !== request.id)]
    .slice(0, MAX_SUPPORT_REQUESTS);
  writeJson(SUPPORT_REQUESTS_KEY, next);
  return buildSupportResult(true, 'saved', '反馈已保存在本机，可复制后发送给客服。', supportCategory, request);
}

export function deleteSupportRequest(id) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return getSupportRequests();
  const next = getSupportRequests().filter((request) => request.id !== normalizedId);
  writeJson(SUPPORT_REQUESTS_KEY, next);
  return next;
}

export function clearSupportRequests(category) {
  const next = category
    ? getSupportRequests().filter((request) => request.category !== category)
    : [];
  writeJson(SUPPORT_REQUESTS_KEY, next);
  return next;
}

export function getLocalDataSummary() {
  const scanDrafts = normalizeScanDrafts(readJson(SCAN_DRAFTS_KEY, {}));
  const favorites = getFavoriteItems();
  const history = getHistory();
  const allergens = getUserAllergens();
  const reports = getAnalysisReports();
  const compareItems = getCompareItems();
  const supportRequests = getSupportRequests();
  const scanDraftCount = Object.keys(scanDrafts).length;
  const totalItems = favorites.length + history.length + allergens.length + reports.length + compareItems.length + supportRequests.length + scanDraftCount;

  return {
    favorites: favorites.length,
    history: history.length,
    allergens: allergens.length,
    reports: reports.length,
    compareItems: compareItems.length,
    supportRequests: supportRequests.length,
    scanDrafts: scanDraftCount,
    totalItems
  };
}

export function getLocalDataSnapshot() {
  const scanDrafts = normalizeScanDrafts(readJson(SCAN_DRAFTS_KEY, {}));
  return {
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    summary: getLocalDataSummary(),
    preferences: {
      historyRecordingEnabled: isHistoryRecordingEnabled(),
      onboarding: getOnboardingState()
    },
    favorites: getFavoriteItems(),
    compareItems: getCompareItems(),
    history: getHistory(),
    allergens: getUserAllergens(),
    analysisReports: getAnalysisReports(),
    supportRequests: getSupportRequests(),
    scanDrafts
  };
}

export function importLocalDataSnapshot(snapshot) {
  const normalized = normalizeLocalDataSnapshot(snapshot);
  if (!normalized.ok) return normalized;

  writeJson(FAVORITES_KEY, normalized.data.favorites);
  writeJson(COMPARE_ITEMS_KEY, normalized.data.compareItems);
  writeJson(HISTORY_KEY, normalized.data.history);
  writeJson(HISTORY_RECORDING_KEY, normalized.data.preferences.historyRecordingEnabled);
  writeJson(ALLERGENS_KEY, normalized.data.allergens);
  writeJson(ANALYSIS_REPORTS_KEY, normalized.data.analysisReports);
  writeJson(SUPPORT_REQUESTS_KEY, normalized.data.supportRequests);
  writeJson(SCAN_DRAFTS_KEY, normalized.data.scanDrafts);
  writeJson(ONBOARDING_KEY, normalized.data.preferences.onboarding);

  return {
    ok: true,
    message: '本机数据已导入。',
    summary: getLocalDataSummary()
  };
}

export function clearLocalUserData() {
  writeJson(FAVORITES_KEY, []);
  writeJson(COMPARE_ITEMS_KEY, []);
  writeJson(HISTORY_KEY, []);
  writeJson(ALLERGENS_KEY, []);
  writeJson(ANALYSIS_REPORTS_KEY, []);
  writeJson(SUPPORT_REQUESTS_KEY, []);
  writeJson(SCAN_DRAFTS_KEY, {});
  writeJson(SCAN_PENDING_KEY, createDefaultPendingScan());
  resetOnboarding();
  return getLocalDataSummary();
}

export function createAnalysisReport(input, category = DEFAULT_CATEGORY, options = {}) {
  const normalizedInput = String(input || '').trim();
  if (!normalizedInput) return null;

  const reportCategory = typeof category === 'string' && category ? category : DEFAULT_CATEGORY;
  const productName = truncateText(options?.productName, 50);
  const analysis = analyzeIngredientText(normalizedInput, reportCategory);
  const userAllergenIds = getUserAllergens();
  const matchedIngredientIds = analysis.ingredients.map((ingredient) => ingredient.id).filter(Boolean);
  const highlightIngredientIds = analysis.highlights.map((ingredient) => ingredient.id).filter(Boolean);
  const unknownItems = analysis.unknownItems;
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
  const riskCounts = countRisks(analysis.ingredients);

  const report = {
    id: createReportId(),
    category: reportCategory,
    productName,
    title: productName || buildReportTitle(normalizedInput),
    input: normalizedInput,
    createdAt: new Date().toISOString(),
    matchedCount: analysis.matchedCount,
    summary: analysis.summary,
    matchedIngredientIds,
    highlightIngredientIds,
    unknownItems,
    riskCounts,
    userAllergenIds,
    ingredientAllergenHits,
    textAllergenHits,
    schemaVersion: REPORT_SCHEMA_VERSION
  };
  return {
    ...report,
    insights: buildReportInsights(report)
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

function normalizeLocalDataSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {
      ok: false,
      message: '导入失败：JSON 根节点必须是对象。'
    };
  }

  const schemaVersion = Number(snapshot.schemaVersion);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1 || schemaVersion > LOCAL_DATA_SCHEMA_VERSION) {
    return {
      ok: false,
      message: `导入失败：仅支持 schemaVersion 1-${LOCAL_DATA_SCHEMA_VERSION} 的本机数据。`
    };
  }

  return {
    ok: true,
    data: {
      favorites: normalizeFavoriteItems(snapshot.favorites),
      compareItems: normalizeCompareItems(snapshot.compareItems),
      history: normalizeStringList(snapshot.history).slice(0, MAX_HISTORY),
      preferences: normalizeLocalDataPreferences(snapshot.preferences),
      allergens: uniqueStrings(snapshot.allergens),
      analysisReports: normalizeAnalysisReports(snapshot.analysisReports),
      supportRequests: normalizeSupportRequests(snapshot.supportRequests),
      scanDrafts: normalizeScanDrafts(snapshot.scanDrafts)
    }
  };
}

function normalizeLocalDataPreferences(value) {
  const hasOnboarding = value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, 'onboarding');
  return {
    historyRecordingEnabled: value?.historyRecordingEnabled !== false,
    onboarding: hasOnboarding ? normalizeOnboardingState(value.onboarding) : getOnboardingState()
  };
}

function createDefaultOnboardingState() {
  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    status: 'pending',
    preferredCategory: DEFAULT_ONBOARDING_CATEGORY,
    acceptedBoundary: false,
    allergenCount: 0,
    historyRecordingEnabled: true,
    completedAt: '',
    skippedAt: '',
    updatedAt: ''
  };
}

function createDefaultPendingScan() {
  return {
    status: 'idle',
    category: DEFAULT_ONBOARDING_CATEGORY,
    pendingImageId: null,
    pendingText: '',
    pendingProductName: '',
    pendingSource: 'manual',
    pendingOcrMode: 'manual',
    pendingOcrConfidence: 1,
    pendingOcrProvider: 'manual',
    pendingOcrErrorCode: '',
    pendingOcrErrorMsg: '',
    updatedAt: ''
  };
}

function normalizePendingScan(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultPendingScan();
  }

  return {
    status: SCAN_STATUSES.includes(value.status) ? value.status : 'idle',
    category: isProductCategory(value.category) ? value.category : DEFAULT_ONBOARDING_CATEGORY,
    pendingImageId: value.pendingImageId ? String(value.pendingImageId).trim() : null,
    pendingImageMeta: normalizePendingImageMeta(value.pendingImageMeta),
    pendingText: String(value.pendingText || ''),
    pendingProductName: truncateText(value.pendingProductName, 50),
    pendingSource: value.pendingSource === 'ocr' ? 'ocr' : 'manual',
    pendingOcrMode: OCR_MODES.includes(value.pendingOcrMode) ? value.pendingOcrMode : 'manual',
    pendingOcrConfidence: clampConfidence(value.pendingOcrConfidence),
    pendingOcrProvider: String(value.pendingOcrProvider || 'manual').trim() || 'manual',
    pendingOcrErrorCode: String(value.pendingOcrErrorCode || '').trim(),
    pendingOcrErrorMsg: String(value.pendingOcrErrorMsg || '').trim(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : ''
  };
}

function normalizePendingImageMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    originalName: truncateText(value.originalName, 120),
    mimeType: String(value.mimeType || '').trim(),
    width: Number(value.width) || 0,
    height: Number(value.height) || 0,
    originalSize: Number(value.originalSize) || 0,
    compressedSize: Number(value.compressedSize) || 0,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : ''
  };
}

function normalizeOnboardingState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultOnboardingState();
  }
  const status = ONBOARDING_STATUSES.includes(value.status)
    ? value.status
    : value.completed === true
      ? 'completed'
      : 'pending';
  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    status,
    preferredCategory: normalizeOnboardingCategory(value.preferredCategory),
    acceptedBoundary: value.acceptedBoundary === true,
    allergenCount: Number.isFinite(value.allergenCount) && value.allergenCount >= 0 ? value.allergenCount : 0,
    historyRecordingEnabled: value.historyRecordingEnabled !== false,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : '',
    skippedAt: typeof value.skippedAt === 'string' ? value.skippedAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : ''
  };
}

function normalizeOnboardingCategory(value) {
  return ONBOARDING_CATEGORIES.includes(value) ? value : DEFAULT_ONBOARDING_CATEGORY;
}

function buildCompareResult(ok, reason, message, category) {
  return {
    ok,
    reason,
    message,
    items: getCompareItems(category)
  };
}

function buildSupportResult(ok, reason, message, category, request = null) {
  return {
    ok,
    reason,
    message,
    request,
    requests: getSupportRequests(category)
  };
}

function normalizeFavoriteItems(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  for (const item of value) {
    const normalized = normalizeFavoriteItem(item);
    if (!normalized) continue;
    const key = `${normalized.category}:${normalized.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(normalized);
  }
  return items;
}

function normalizeCompareItems(value) {
  const categoryCounts = new Map();
  return normalizeFavoriteItems(value).filter((item) => {
    if (!isProductCategory(item.category)) return false;
    if (!getIngredientById(item.id, item.category)) return false;
    const count = categoryCounts.get(item.category) || 0;
    if (count >= MAX_COMPARE_ITEMS) return false;
    categoryCounts.set(item.category, count + 1);
    return true;
  });
}

function normalizeSupportRequests(value) {
  if (!Array.isArray(value)) return [];
  const requestIds = new Set();
  const requests = [];
  for (const item of value) {
    const normalized = normalizeSupportRequest(item);
    if (!normalized || requestIds.has(normalized.id)) continue;
    requestIds.add(normalized.id);
    requests.push(normalized);
  }
  return requests
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_SUPPORT_REQUESTS);
}

function normalizeSupportRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const subject = truncateText(value.subject, 80);
  const message = truncateText(value.message, 1000);
  if (!subject || !message) return null;
  const category = isProductCategory(value.category) ? value.category : DEFAULT_ONBOARDING_CATEGORY;
  const topic = isSupportTopic(value.topic) ? value.topic : defaultSupportTopic;
  const createdAt = normalizeIsoDate(value.createdAt);
  return {
    id: normalizeSupportRequestId(value.id),
    category,
    topic,
    subject,
    message,
    contact: truncateText(value.contact, 120),
    status: SUPPORT_STATUSES.includes(value.status) ? value.status : 'local',
    createdAt
  };
}

function normalizeAnalysisReports(value) {
  if (!Array.isArray(value)) return [];
  const reports = value
    .map(normalizeAnalysisReport)
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const categoryCounts = new Map();
  const reportIds = new Set();
  const next = [];
  for (const report of reports) {
    if (reportIds.has(report.id)) continue;
    const count = categoryCounts.get(report.category) || 0;
    if (count >= MAX_ANALYSIS_REPORTS) continue;
    reportIds.add(report.id);
    categoryCounts.set(report.category, count + 1);
    next.push(report);
  }
  return next;
}

function normalizeAnalysisReport(value) {
  if (!value || typeof value.id !== 'string' || typeof value.input !== 'string') return null;
  const category = typeof value.category === 'string' ? value.category : DEFAULT_CATEGORY;
  const matchedIngredientIds = normalizeStringList(value.matchedIngredientIds);
  const highlightIngredientIds = normalizeStringList(value.highlightIngredientIds);
  const unknownItems = normalizeStringList(value.unknownItems);
  const userAllergenIds = normalizeStringList(value.userAllergenIds);
  const report = {
    id: normalizeReportId(value.id),
    category,
    productName: truncateText(value.productName, 50),
    title: typeof value.title === 'string' && value.title.trim() ? value.title : buildReportTitle(value.productName || value.input),
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
  const insights = normalizeReportInsights(value.insights);
  return {
    ...report,
    insights: insights.length ? insights : buildReportInsights(report)
  };
}

function normalizeReportId(value) {
  const id = String(value || '').trim();
  return /^[a-z0-9][a-z0-9_-]{0,80}$/i.test(id) ? id : createReportId();
}

function normalizeSupportRequestId(value) {
  const id = String(value || '').trim();
  return /^[a-z0-9][a-z0-9_-]{0,80}$/i.test(id) ? id : createSupportRequestId();
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

function createSupportRequestId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `support-${Date.now().toString(36)}-${random}`;
}

function truncateText(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
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

function uniqueStrings(value) {
  return [...new Set(normalizeStringList(value))];
}

function normalizeScanDrafts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([category, input]) => [String(category || '').trim(), String(input || '').trim()])
      .filter(([category, input]) => category && input)
  );
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
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

function buildReportInsights(report) {
  const matchedCount = numberOrZero(report.matchedCount);
  const unknownCount = Array.isArray(report.unknownItems) ? report.unknownItems.length : 0;
  const ingredientAllergenHitCount = Array.isArray(report.ingredientAllergenHits) ? report.ingredientAllergenHits.length : 0;
  const textAllergenHitCount = Array.isArray(report.textAllergenHits) ? report.textAllergenHits.length : 0;
  const allergenHitCount = ingredientAllergenHitCount + textAllergenHitCount;
  const watchedAllergenCount = Array.isArray(report.userAllergenIds) ? report.userAllergenIds.length : 0;
  const riskCounts = normalizeRiskCounts(report.riskCounts);

  return [
    buildRiskInsight(riskCounts, matchedCount),
    buildAllergenInsight(watchedAllergenCount, ingredientAllergenHitCount, textAllergenHitCount, allergenHitCount),
    buildCoverageInsight(report.category, matchedCount, unknownCount),
    buildNextStepInsight(report.category, riskCounts, allergenHitCount, unknownCount)
  ];
}

function buildRiskInsight(riskCounts, matchedCount) {
  const watchCount = riskCounts.high + riskCounts.medium;
  const tone = riskCounts.high ? 'caution' : riskCounts.medium ? 'watch' : 'neutral';
  const summary = riskCounts.high
    ? `包含 ${riskCounts.high} 项高关注成分，建议优先查看重点关注成分和产品适用场景。`
    : watchCount
      ? `包含 ${watchCount} 项需重点理解的成分，建议结合使用频率、用量和个人情况判断。`
      : matchedCount
        ? '当前匹配项以低关注或未知等级为主，仍需结合完整标签和实际使用场景判断。'
        : '当前未匹配到本地数据库成分，建议先检查原始成分表文本。';
  return {
    key: 'risk',
    title: '风险分布',
    tone,
    summary,
    items: [
      `高关注 ${riskCounts.high} 项`,
      `需关注 ${riskCounts.medium} 项`,
      `低关注 ${riskCounts.low} 项`,
      `未知等级 ${riskCounts.unknown} 项`
    ]
  };
}

function buildAllergenInsight(watchedAllergenCount, ingredientHitCount, textHitCount, totalHitCount) {
  if (!watchedAllergenCount) {
    return {
      key: 'allergens',
      title: '过敏原提醒',
      tone: 'neutral',
      summary: '保存报告时未配置个人过敏原档案，系统仅保留通用成分匹配结果。',
      items: ['可在设置页补充关注过敏原后重新分析同一成分表。']
    };
  }

  if (!totalHitCount) {
    return {
      key: 'allergens',
      title: '过敏原提醒',
      tone: 'neutral',
      summary: `保存报告时关注 ${watchedAllergenCount} 类过敏原，当前未发现明确命中项。`,
      items: ['仍建议以产品包装上的过敏原提示、可能含有声明和生产线提示为准。']
    };
  }

  return {
    key: 'allergens',
    title: '过敏原提醒',
    tone: 'caution',
    summary: `命中 ${totalHitCount} 项关注过敏原，请优先核对包装原文和个人耐受情况。`,
    items: [
      `数据库成分命中 ${ingredientHitCount} 项`,
      `标签文本命中 ${textHitCount} 项`
    ]
  };
}

function buildCoverageInsight(category, matchedCount, unknownCount) {
  const isFood = category === 'food';
  const sourceNote = isFood
    ? '食品添加剂库仍处于草稿审核阶段，逐食品类别限量和 ADI 原文需要继续核验。'
    : '化妆品数据当前为原型库，适合验证交互和基础成分理解。';
  return {
    key: 'coverage',
    title: '数据边界',
    tone: unknownCount ? 'watch' : 'neutral',
    summary: `本地库匹配 ${matchedCount} 项，暂未收录 ${unknownCount} 项。${sourceNote}`,
    items: unknownCount
      ? ['暂未收录项可能是普通原料、复合配料、OCR 误识别文本或数据库尚未覆盖内容。']
      : ['当前输入项均已匹配到本地库，但仍需按数据来源和审核状态理解结果。']
  };
}

function buildNextStepInsight(category, riskCounts, allergenHitCount, unknownCount) {
  const items = [];
  if (allergenHitCount) items.push('先核对包装上的过敏原提示、可能含有声明和配料来源。');
  if (riskCounts.high || riskCounts.medium) {
    items.push(category === 'food'
      ? '结合食品类别、摄入频率和单次食用量判断是否需要减少高频摄入。'
      : '结合使用部位、频率和个人肤质判断是否需要降低使用频次。');
  }
  if (unknownCount) items.push('对暂未收录项，可尝试拆分复合配料或换用包装上的标准名称重新分析。');
  if (!items.length) {
    items.push(category === 'food'
      ? '保留产品原包装信息，后续可在数据更新后重新分析同一配料表。'
      : '继续结合产品说明、使用频率和个人耐受情况判断。');
  }
  return {
    key: 'next-steps',
    title: '下一步建议',
    tone: allergenHitCount || riskCounts.high ? 'caution' : riskCounts.medium || unknownCount ? 'watch' : 'neutral',
    summary: '以下建议用于日常决策辅助，不替代专业判断。',
    items
  };
}

function normalizeReportInsights(value) {
  return Array.isArray(value)
    ? value
      .map((item) => ({
        key: String(item?.key || '').trim(),
        title: String(item?.title || '').trim(),
        tone: normalizeInsightTone(item?.tone),
        summary: String(item?.summary || '').trim(),
        items: normalizeStringList(item?.items)
      }))
      .filter((item) => item.key && item.title && item.summary)
    : [];
}

function normalizeInsightTone(value) {
  const tone = String(value || '').trim();
  return ['neutral', 'watch', 'caution'].includes(tone) ? tone : 'neutral';
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}
