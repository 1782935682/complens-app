import { getProductCategory, isProductCategory } from '../data/categories.js';
import { getMatchingTextAllergens, getMatchingUserAllergens } from './allergenService.js';
import { analyzeIngredientText, getIngredientById } from './ingredientService.js';
import { matchIngredientsLocal } from './ingredientMatchService.js';
import { parseIngredientList } from '../utils/text.js';

export const REPORT_SCHEMA_VERSION = 4;
export const REPORT_RISK_GRADES = ['A', 'B', 'C', 'D', 'F'];

const defaultCategory = 'food';
const defaultProductName = '未命名产品';
const reportSources = ['ocr', 'manual'];
const LOW_CONFIDENCE_MATCH_MIN = 0.55;
const LOW_CONFIDENCE_MATCH_MAX = 0.9;
const MATCH_REVIEW_DECISIONS = ['confirmed', 'rejected'];

export function isReportMatchRejected(result) {
  return result?.reviewDecision === 'rejected';
}

function hasReportMatch(result) {
  return Boolean(result?.match) && Number(result.confidence) > 0;
}

export function isReportMatchAccepted(result) {
  if (!hasReportMatch(result) || isReportMatchRejected(result)) return false;
  const confidence = Number(result.confidence) || 0;
  if (confidence >= LOW_CONFIDENCE_MATCH_MIN && confidence < LOW_CONFIDENCE_MATCH_MAX) {
    return result.reviewDecision === 'confirmed';
  }
  return true;
}

export function isLowConfidenceReportMatch(result) {
  const confidence = Number(result?.confidence) || 0;
  return hasReportMatch(result) && !isReportMatchRejected(result) && confidence >= LOW_CONFIDENCE_MATCH_MIN && confidence < LOW_CONFIDENCE_MATCH_MAX;
}

export function isPendingReportMatch(result) {
  return isLowConfidenceReportMatch(result) && result.reviewDecision !== 'confirmed';
}

export function buildIngredientReport(input, category = defaultCategory, options = {}) {
  const originalText = String(input || '').trim();
  if (!originalText) return null;

  const reportCategory = isProductCategory(category) ? category : defaultCategory;
  const providedProductName = truncateText(options.productName, 50);
  const productName = providedProductName || defaultProductName;
  const parsedIngredients = parseIngredientList(originalText);
  const reportSource = normalizeReportSource(options.source);
  const matchSummary = normalizeMatchSummary(matchIngredientsLocal(parsedIngredients, reportCategory));
  const matchResults = matchSummary.results;
  const analysis = analyzeIngredientText(originalText, reportCategory);
  const userAllergenIds = normalizeStringList(options.userAllergenIds);
  const matchedIngredientIds = uniqueStrings(matchResults
    .filter(isReportMatchAccepted)
    .map((result) => result.match.id));
  const highlightIngredientIds = uniqueStrings(matchResults
    .filter((result) => isReportMatchAccepted(result) && ['high', 'medium'].includes(result.match?.riskLevel))
    .map((result) => result.match.id));
  const unmatchedTerms = normalizeStringList(matchSummary.unmatchedTerms);
  const lowConfidenceTerms = normalizeStringList(matchSummary.lowConfidenceTerms);
  const riskSummary = buildRiskSummary(matchResults);
  const riskGrade = computeRiskGrade(matchResults);
  const ingredientAllergenHits = buildIngredientAllergenHits(matchResults, userAllergenIds, reportCategory);
  const textAllergenHits = buildTextAllergenHits(unmatchedTerms, userAllergenIds);
  const riskCounts = {
    low: riskSummary.lowRisk,
    medium: riskSummary.mediumRisk,
    high: riskSummary.highRisk,
    unknown: riskSummary.unmatched
  };
  const pendingCount = countPendingMatches(matchResults);
  const dataStatusCounts = buildDataStatusCounts(matchResults, unmatchedTerms, reportSource);
  const unknownItemRecords = buildUnknownItemRecords(unmatchedTerms, reportSource);

  const report = {
    id: createReportId(),
    category: reportCategory,
    productName,
    brandName: truncateText(options.brandName, 60) || undefined,
    imageId: normalizeNullableId(options.imageId),
    title: providedProductName || buildReportTitle(originalText),
    input: originalText,
    originalText,
    source: reportSource,
    createdAt: new Date().toISOString(),
    parsedIngredients,
    matchResults,
    riskGrade,
    riskSummary,
    unmatchedTerms,
    lowConfidenceTerms,
    matchRate: calculateMatchRate(matchResults),
    matchedCount: matchedIngredientIds.length,
    pendingCount,
    summary: buildReportSummary(riskGrade, riskSummary, analysis.summary),
    matchedIngredientIds,
    highlightIngredientIds,
    unknownItems: unmatchedTerms,
    unknownItemRecords,
    dataStatusCounts,
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

export function normalizeIngredientReport(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string') return null;
  const originalText = String(value.originalText || value.input || '').trim();
  if (!originalText) return null;

  const category = isProductCategory(value.category) ? value.category : defaultCategory;
  const parsedIngredients = normalizeParsedIngredients(value.parsedIngredients, originalText);
  const fallbackMatchResults = normalizeMatchSummary(matchIngredientsLocal(parsedIngredients, category)).results;
  const matchResults = normalizeReportMatchResults(value.matchResults).length
    ? normalizeReportMatchResults(value.matchResults)
    : normalizeReportMatchResults(fallbackMatchResults);
  const riskSummary = buildRiskSummary(matchResults);
  const riskGrade = computeRiskGrade(matchResults);
  const unmatchedTerms = uniqueStrings(matchResults
    .filter((result) => !hasReportMatch(result) || isReportMatchRejected(result))
    .map((result) => result.parsedIngredient?.normalizedText || result.term));
  const lowConfidenceTerms = uniqueStrings(matchResults
    .filter(isPendingReportMatch)
    .map((result) => result.parsedIngredient?.normalizedText || result.term));
  const reportSource = normalizeReportSource(value.source);
  const matchedIngredientIds = uniqueStrings(matchResults.filter(isReportMatchAccepted).map((result) => result.match.id));
  const highlightIngredientIds = uniqueStrings(matchResults.filter((result) => isReportMatchAccepted(result) && ['high', 'medium'].includes(result.match?.riskLevel)).map((result) => result.match.id));
  const providedProductName = truncateText(value.productName, 50);
  const productName = providedProductName || defaultProductName;
  const report = {
    id: String(value.id).trim(),
    category,
    productName,
    brandName: truncateText(value.brandName, 60) || undefined,
    imageId: normalizeNullableId(value.imageId),
    title: typeof value.title === 'string' && value.title.trim() ? value.title : providedProductName || buildReportTitle(originalText),
    input: originalText,
    originalText,
    source: reportSource,
    createdAt: normalizeIsoDate(value.createdAt),
    parsedIngredients,
    matchResults,
    riskGrade,
    riskSummary,
    unmatchedTerms,
    lowConfidenceTerms,
    matchRate: calculateMatchRate(matchResults),
    matchedCount: matchedIngredientIds.length,
    pendingCount: countPendingMatches(matchResults),
    summary: buildReportSummary(riskGrade, riskSummary),
    matchedIngredientIds,
    highlightIngredientIds,
    unknownItems: unmatchedTerms,
    unknownItemRecords: normalizeUnknownItemRecords(value.unknownItemRecords, unmatchedTerms, reportSource),
    dataStatusCounts: buildDataStatusCounts(matchResults, unmatchedTerms, reportSource),
    riskCounts: {
      low: riskSummary.lowRisk,
      medium: riskSummary.mediumRisk,
      high: riskSummary.highRisk,
      unknown: riskSummary.unmatched
    },
    userAllergenIds: normalizeStringList(value.userAllergenIds),
    ingredientAllergenHits: normalizeIngredientAllergenHits(value.ingredientAllergenHits),
    textAllergenHits: normalizeTextAllergenHits(value.textAllergenHits),
    schemaVersion: Number.isFinite(value.schemaVersion) ? value.schemaVersion : REPORT_SCHEMA_VERSION
  };
  return {
    ...report,
    insights: buildReportInsights(report)
  };
}

export function applyReportMatchDecision(value, matchIndex, decision, reviewedAt = new Date().toISOString()) {
  const report = normalizeIngredientReport(value);
  const index = Number(matchIndex);
  const normalizedDecision = normalizeReviewDecision(decision);
  if (!report || !Number.isInteger(index) || index < 0 || !normalizedDecision) return null;

  const target = report.matchResults[index];
  if (!isReportMatchDecisionEligible(target)) return null;

  const normalizedReviewedAt = normalizeOptionalIsoDate(reviewedAt) || new Date().toISOString();
  const matchResults = report.matchResults.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    return {
      ...item,
      reviewDecision: normalizedDecision,
      reviewedAt: normalizedReviewedAt
    };
  });

  return rebuildReportSnapshot({
    ...report,
    matchResults
  });
}

function isReportMatchDecisionEligible(result) {
  const confidence = Number(result?.confidence) || 0;
  return Boolean(result?.match) && confidence >= LOW_CONFIDENCE_MATCH_MIN && confidence < LOW_CONFIDENCE_MATCH_MAX;
}

function rebuildReportSnapshot(report) {
  const source = normalizeReportSource(report.source);
  const matchResults = normalizeReportMatchResults(report.matchResults);
  const matchedIngredientIds = uniqueStrings(matchResults
    .filter(isReportMatchAccepted)
    .map((result) => result.match.id));
  const highlightIngredientIds = uniqueStrings(matchResults
    .filter((result) => isReportMatchAccepted(result) && ['high', 'medium'].includes(result.match?.riskLevel))
    .map((result) => result.match.id));
  const unmatchedTerms = uniqueStrings(matchResults
    .filter((result) => !isReportMatchAccepted(result))
    .map((result) => result.parsedIngredient?.normalizedText || result.term));
  const lowConfidenceTerms = uniqueStrings(matchResults
    .filter(isPendingReportMatch)
    .map((result) => result.parsedIngredient?.normalizedText || result.term));
  const riskSummary = buildRiskSummary(matchResults);
  const riskGrade = computeRiskGrade(matchResults);
  const unknownItemRecords = buildSnapshotUnknownItemRecords(report.unknownItemRecords, unmatchedTerms, source, matchResults);
  const dataStatusCounts = buildDataStatusCounts(matchResults, unmatchedTerms, source);
  const riskCounts = {
    low: riskSummary.lowRisk,
    medium: riskSummary.mediumRisk,
    high: riskSummary.highRisk,
    unknown: riskSummary.unmatched
  };
  const next = {
    ...report,
    source,
    matchResults,
    riskGrade,
    riskSummary,
    unmatchedTerms,
    lowConfidenceTerms,
    matchRate: calculateMatchRate(matchResults),
    matchedCount: matchedIngredientIds.length,
    pendingCount: countPendingMatches(matchResults),
    summary: buildReportSummary(riskGrade, riskSummary),
    matchedIngredientIds,
    highlightIngredientIds,
    unknownItems: unmatchedTerms,
    unknownItemRecords,
    dataStatusCounts,
    riskCounts,
    ingredientAllergenHits: buildIngredientAllergenHits(matchResults, report.userAllergenIds, report.category),
    textAllergenHits: buildTextAllergenHits(unmatchedTerms, report.userAllergenIds)
  };

  return {
    ...next,
    insights: buildReportInsights(next)
  };
}

function buildSnapshotUnknownItemRecords(existingRecords = [], unmatchedTerms = [], source = 'manual', matchResults = []) {
  const existing = normalizeUnknownItemRecords(existingRecords, [], source);
  const records = [];
  const genericTerms = new Set(normalizeStringList(unmatchedTerms));

  for (const [index, result] of matchResults.entries()) {
    if (!isReportMatchRejected(result)) continue;
    const record = buildRejectedUnknownItemRecord(result, index, source);
    if (!record) continue;
    records.push(record);
    genericTerms.delete(record.item);
  }

  for (const item of genericTerms) {
    const existingRecord = existing.find((record) => record.item === item && record.reason !== 'low_confidence_rejected');
    records.push(existingRecord || buildUnknownItemRecord(item, source));
  }

  return dedupeUnknownItemRecords(records);
}

function buildRejectedUnknownItemRecord(result, index, source = 'manual') {
  const item = String(result?.parsedIngredient?.normalizedText || result?.term || '').trim();
  if (!item || !result?.match) return null;
  const base = buildUnknownItemRecord(item, source);
  return {
    ...base,
    sourceScope: 'candidate_mapping',
    sourceName: 'User rejected low-confidence candidate match',
    reason: 'low_confidence_rejected',
    matchIndex: index,
    rejectedMatchId: result.match.id,
    rejectedMatchName: result.match.nameCn || result.match.id,
    confidence: clampRate(result.confidence),
    reviewedAt: result.reviewedAt || ''
  };
}

function dedupeUnknownItemRecords(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = [
      record.reason || 'unknown',
      record.item,
      Number.isInteger(record.matchIndex) ? record.matchIndex : '',
      record.rejectedMatchId || ''
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function computeRiskGrade(matchResults = []) {
  const results = Array.isArray(matchResults) ? matchResults : [];
  const acceptedResults = results.filter(isReportMatchAccepted);
  const highCount = acceptedResults.filter((result) => result.match?.riskLevel === 'high').length;
  const mediumCount = acceptedResults.filter((result) => result.match?.riskLevel === 'medium').length;
  if (highCount >= 5) return 'F';
  if (highCount >= 3) return 'D';
  if (highCount >= 1) return 'C';
  if (mediumCount <= 0) return 'A';
  if (mediumCount <= 1) return 'B';
  return 'C';
}

export function buildRiskSummary(matchResults = []) {
  const summary = {
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    unmatched: 0,
    unverifiedData: 0,
    categoryBreakdown: {},
    unmatchedTerms: []
  };

  for (const result of Array.isArray(matchResults) ? matchResults : []) {
    if (isPendingReportMatch(result)) {
      summary.unverifiedData += 1;
      continue;
    }

    if (!isReportMatchAccepted(result)) {
      summary.unmatched += 1;
      if (result.parsedIngredient?.normalizedText) summary.unmatchedTerms.push(result.parsedIngredient.normalizedText);
      continue;
    }

    const match = result.match;
    if (match.riskLevel === 'high') summary.highRisk += 1;
    else if (match.riskLevel === 'medium') summary.mediumRisk += 1;
    else summary.lowRisk += 1;

    if (['mapped_candidate', 'unverified'].includes(getResultDataStatus(result, 'manual'))) {
      summary.unverifiedData += 1;
    }

    const category = match.category || '未分类';
    summary.categoryBreakdown[category] = (summary.categoryBreakdown[category] || 0) + 1;
  }

  return summary;
}

export function buildReportShareSummary(report) {
  if (!report) return '';
  const concern = getConcernSummaries(report, 1)[0];
  const topIngredients = getTopIngredientNames(report);
  const categoryLabel = getProductCategory(report.category).label;
  return [
    `【成分镜分析报告】${report.productName || report.title || defaultProductName}`,
    `整体评级：${report.riskGrade || 'C'}（${riskGradeLabel(report.riskGrade)}）`,
    `共 ${getReportIngredientCount(report)} 种配料，含 ${Number(report.matchedCount) || 0} 种${categoryLabel}`,
    concern ? `主要关注：${concern}` : '',
    `排名前三：${topIngredients.join('、') || '暂无'}`,
    '---',
    '仅供参考，不构成医疗建议',
    '由成分镜 App 生成'
  ].filter(Boolean).join('\n');
}

export function getTopIngredientNames(report, count = 3) {
  const parsedIngredients = Array.isArray(report?.parsedIngredients) && report.parsedIngredients.length
    ? report.parsedIngredients
    : parseIngredientList(getReportText(report));
  return parsedIngredients
    .filter((item) => !item.isDuplicate && item.normalizedText)
    .slice(0, count)
    .map((item) => item.normalizedText);
}

export function getConcernSummaries(report, max = 3) {
  const concerns = [];
  for (const result of report?.matchResults || []) {
    if (!isReportMatchAccepted(result)) continue;
    const match = result.match;
    if (!match || !['high', 'medium'].includes(match.riskLevel)) continue;
    concerns.push(`${match.nameCn || result.parsedIngredient.normalizedText}（${match.category || '未分类'}，${riskLevelLabel(match.riskLevel)}）`);
  }
  if ((Number(report?.riskSummary?.unverifiedData) || 0) > 0) {
    concerns.push(`${report.riskSummary.unverifiedData} 种成分数据仍待审核`);
  }
  if (report?.unmatchedTerms?.length) {
    concerns.push(`${report.unmatchedTerms.length} 种配料暂未收录，需核对包装原文`);
  }
  return concerns.slice(0, max);
}

export function getSpecialPopulationAlerts(report) {
  const alerts = [];
  const seen = new Set();
  for (const result of report?.matchResults || []) {
    if (!isReportMatchAccepted(result)) continue;
    const match = result.match;
    const groups = Array.isArray(match?.cautionGroups) ? match.cautionGroups : [];
    for (const group of groups) {
      const key = `${match.id}:${group}`;
      if (seen.has(key)) continue;
      seen.add(key);
      alerts.push({
        ingredientName: match.nameCn || result.parsedIngredient?.normalizedText || '未命名成分',
        group,
        groupLabel: cautionGroupLabel(group)
      });
    }
  }
  return alerts;
}

export function getCategoryBreakdownEntries(report) {
  return Object.entries(report?.riskSummary?.categoryBreakdown || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
}

export function riskGradeLabel(grade) {
  const labels = {
    A: '低关注',
    B: '较低关注',
    C: '需关注',
    D: '高关注',
    F: '重点核对'
  };
  return labels[grade] || labels.C;
}

export function riskLevelLabel(level) {
  const labels = {
    low: '低关注',
    medium: '需关注',
    high: '高关注',
    unknown: '未知'
  };
  return labels[level] || labels.unknown;
}

export function cautionGroupLabel(group) {
  const labels = {
    pregnant: '孕期或备孕人群',
    infant: '婴幼儿',
    child: '儿童',
    diabetic: '糖尿病相关人群',
    renal: '肾脏疾病相关人群',
    sensitive: '敏感体质人群'
  };
  return labels[group] || group;
}

export function buildReportInsights(report) {
  const riskSummary = normalizeRiskSummary(report?.riskSummary, report?.matchResults);
  const allergenHitCount = (report.ingredientAllergenHits || []).length + (report.textAllergenHits || []).length;
  const categoryLabel = getProductCategory(report?.category).label;
  return [
    {
      key: 'risk',
      title: '风险分布',
      tone: riskSummary.highRisk ? 'caution' : riskSummary.mediumRisk ? 'watch' : 'neutral',
      summary: `整体评级 ${report.riskGrade || computeRiskGrade(report.matchResults)}，高关注 ${riskSummary.highRisk} 项，需关注 ${riskSummary.mediumRisk} 项。`,
      items: [
        `低关注 ${riskSummary.lowRisk} 项`,
        `暂未收录 ${riskSummary.unmatched} 项`,
        `待确认数据 ${Number(report.pendingCount) || riskSummary.unverifiedData} 项`
      ]
    },
    {
      key: 'order',
      title: '配料顺序',
      tone: 'neutral',
      summary: '配料表中排列越靠前，通常表示添加量或含量越靠前。',
      items: [`排名前三：${getTopIngredientNames(report).join('、') || '暂无'}`]
    },
    {
      key: 'coverage',
      title: '数据边界',
      tone: riskSummary.unmatched || riskSummary.unverifiedData ? 'watch' : 'neutral',
      summary: `匹配率 ${Math.round((report.matchRate || 0) * 100)}%，当前按 verified_regulation / verified_jecfa / common_ingredient / unverified 分层展示。`,
      items: riskSummary.unmatched
        ? ['暂未收录项可能是普通原料、复合配料、OCR 误识别文本或数据库尚未覆盖内容。']
        : ['当前输入项均有数据库匹配，但仍需按来源和审核状态理解。']
    },
    {
      key: 'next-steps',
      title: '下一步建议',
      tone: allergenHitCount || riskSummary.highRisk ? 'caution' : riskSummary.mediumRisk || riskSummary.unmatched ? 'watch' : 'neutral',
      summary: '以下建议用于日常决策辅助，不替代专业判断。',
      items: buildNextStepItems(report, allergenHitCount)
    }
  ];
}

function buildNextStepItems(report, allergenHitCount) {
  const items = [];
  const riskSummary = report.riskSummary || {};
  if (allergenHitCount) items.push('先核对包装上的过敏原提示、可能含有声明和配料来源。');
  if (riskSummary.highRisk || riskSummary.mediumRisk) items.push('结合食品类别、摄入频率和单次食用量理解关注项。');
  if (riskSummary.unmatched) items.push('对暂未收录项，可尝试拆分复合配料或换用包装标准名称重新分析。');
  if (!items.length) items.push('保留产品原包装信息，后续可在数据更新后重新分析同一配料表。');
  return items;
}

function buildReportSummary(riskGrade, riskSummary, fallback = '') {
  const summary = normalizeRiskSummary(riskSummary, []);
  const concerns = [];
  if (summary.highRisk) concerns.push(`${summary.highRisk} 项高关注`);
  if (summary.mediumRisk) concerns.push(`${summary.mediumRisk} 项需关注`);
  if (summary.unmatched) concerns.push(`${summary.unmatched} 项暂未收录`);
  if (summary.unverifiedData) concerns.push(`${summary.unverifiedData} 项待确认`);
  if (concerns.length) return `整体评级 ${riskGrade}，包含 ${concerns.join('、')}。`;
  return fallback || `整体评级 ${riskGrade}，当前匹配项以低关注为主。`;
}

function buildIngredientAllergenHits(matchResults, userAllergenIds = [], category) {
  const allergenIds = normalizeStringList(userAllergenIds);
  if (!allergenIds.length) return [];
  return matchResults
    .map((result) => {
      if (!isReportMatchAccepted(result)) return null;
      const match = result.match;
      if (!match) return null;
      const fullIngredient = getIngredientById(match.id, category) || match;
      return {
        id: match.id,
        allergenIds: getMatchingUserAllergens(fullIngredient, allergenIds).map((allergen) => allergen.id)
      };
    })
    .filter((item) => item?.id && item.allergenIds.length);
}

function buildTextAllergenHits(items = [], userAllergenIds = []) {
  const allergenIds = normalizeStringList(userAllergenIds);
  if (!allergenIds.length) return [];
  return normalizeStringList(items)
    .map((item) => ({
      item,
      allergenIds: getMatchingTextAllergens(item, allergenIds).map((allergen) => allergen.id)
    }))
    .filter((item) => item.item && item.allergenIds.length);
}

function normalizeParsedIngredients(value, originalText) {
  const parsed = Array.isArray(value) ? value.map((item, index) => normalizeParsedIngredient(item, index)).filter(Boolean) : [];
  return parsed.length ? parsed : parseIngredientList(originalText);
}

function normalizeParsedIngredient(value, fallbackIndex = 0) {
  if (!value || typeof value !== 'object') return null;
  const normalizedText = String(value.normalizedText || '').trim();
  if (!normalizedText) return null;
  return {
    index: Number.isFinite(value.index) ? value.index : fallbackIndex,
    rawText: String(value.rawText || normalizedText).trim(),
    normalizedText,
    eNumber: value.eNumber ? String(value.eNumber).trim() : null,
    isSubIngredient: value.isSubIngredient === true,
    parentLabel: value.parentLabel ? String(value.parentLabel).trim() : undefined,
    isUnknown: value.isUnknown === true,
    isDuplicate: value.isDuplicate === true
  };
}

function normalizeReportMatchResults(value) {
  return Array.isArray(value)
    ? value.map(normalizeReportMatchResult).filter(Boolean)
    : [];
}

function normalizeMatchSummary(value) {
  return {
    results: normalizeReportMatchResults(value?.results),
    unmatchedTerms: normalizeStringList(value?.unmatchedTerms),
    lowConfidenceTerms: normalizeStringList(value?.lowConfidenceTerms),
    matchRate: clampRate(value?.matchRate)
  };
}

function normalizeReportMatchResult(value) {
  const parsedIngredient = normalizeParsedIngredient(value?.parsedIngredient);
  if (!parsedIngredient) return null;
  const reviewDecision = normalizeReviewDecision(value?.reviewDecision);
  const reviewedAt = normalizeOptionalIsoDate(value?.reviewedAt);
  return {
    parsedIngredient,
    term: String(value.term || parsedIngredient.normalizedText).trim(),
    eNumber: value.eNumber ? String(value.eNumber).trim() : null,
    match: normalizeIngredientMatch(value.match),
    confidence: clampRate(value.confidence),
    matchType: String(value.matchType || 'none').trim() || 'none',
    dataStatus: value?.dataStatus ? normalizeDataStatus(value.dataStatus) : undefined,
    alternates: Array.isArray(value.alternates) ? value.alternates.map(normalizeIngredientMatch).filter(Boolean).slice(0, 2) : [],
    ...(reviewDecision ? { reviewDecision } : {}),
    ...(reviewedAt ? { reviewedAt } : {})
  };
}

function normalizeIngredientMatch(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || '').trim();
  if (!id) return null;
  return {
    id,
    nameCn: String(value.nameCn || id).trim(),
    nameEn: String(value.nameEn || '').trim(),
    aliases: normalizeStringList(value.aliases),
    category: String(value.category || '未分类').trim(),
    riskLevel: ['low', 'medium', 'high', 'unknown'].includes(value.riskLevel) ? value.riskLevel : 'unknown',
    riskSummary: String(value.riskSummary || '').trim(),
    gbCode: String(value.gbCode || '').trim(),
    eNumber: value.eNumber ? String(value.eNumber).trim() : null,
    confidenceLevel: value.confidenceLevel || 'unverified',
    matchConfidence: value.matchConfidence || 'unverified',
    dataStatus: normalizeDataStatus(value.dataStatus),
    sourceScope: String(value.sourceScope || 'unknown').trim(),
    isVerified: value.isVerified === true,
    sourceName: String(value.sourceName || '').trim(),
    sourceVersion: String(value.sourceVersion || '').trim(),
    sourceUrl: String(value.sourceUrl || '').trim(),
    regulatoryBasis: String(value.regulatoryBasis || '').trim(),
    rawSourceText: String(value.rawSourceText || '').trim(),
    reviewStatus: ['draft', 'reviewed', 'verified'].includes(value.reviewStatus) ? value.reviewStatus : 'draft',
    reviewNote: String(value.reviewNote || '').trim(),
    allergenTypes: normalizeStringList(value.allergenTypes),
    cautionGroups: normalizeStringList(value.cautionGroups)
  };
}

function normalizeRiskSummary(value, matchResults) {
  const fallback = buildRiskSummary(matchResults);
  if (!value || typeof value !== 'object') return fallback;
  return {
    highRisk: numberOrFallback(value.highRisk, fallback.highRisk),
    mediumRisk: numberOrFallback(value.mediumRisk, fallback.mediumRisk),
    lowRisk: numberOrFallback(value.lowRisk, fallback.lowRisk),
    unmatched: numberOrFallback(value.unmatched, fallback.unmatched),
    unverifiedData: numberOrFallback(value.unverifiedData, fallback.unverifiedData),
    categoryBreakdown: value.categoryBreakdown && typeof value.categoryBreakdown === 'object' && !Array.isArray(value.categoryBreakdown)
      ? Object.fromEntries(Object.entries(value.categoryBreakdown).map(([key, count]) => [String(key), Number(count) || 0]))
      : fallback.categoryBreakdown,
    unmatchedTerms: normalizeStringList(value.unmatchedTerms).length ? normalizeStringList(value.unmatchedTerms) : fallback.unmatchedTerms
  };
}

function countPendingMatches(matchResults = []) {
  return (Array.isArray(matchResults) ? matchResults : [])
    .filter((result) => {
      if (!hasReportMatch(result) || isReportMatchRejected(result)) return false;
      const status = getResultDataStatus(result, 'manual');
      return (result.reviewDecision !== 'confirmed' && result.confidence < 0.9) || status === 'mapped_candidate' || status === 'unverified';
    }).length;
}

function buildDataStatusCounts(matchResults = [], unmatchedTerms = [], source = 'manual') {
  const counts = {
    verified_regulation: 0,
    verified_jecfa: 0,
    mapped_candidate: 0,
    common_ingredient: 0,
    unverified: 0,
    unknown_from_ocr: 0
  };

  for (const result of Array.isArray(matchResults) ? matchResults : []) {
    const status = getResultDataStatus(result, source);
    counts[status] = (counts[status] || 0) + 1;
  }

  if (!Array.isArray(matchResults) || !matchResults.length) {
    const unknownStatus = source === 'ocr' ? 'unknown_from_ocr' : 'unverified';
    counts[unknownStatus] += normalizeStringList(unmatchedTerms).length;
  }

  return counts;
}

function buildUnknownItemRecords(items = [], source = 'manual') {
  return normalizeStringList(items).map((item) => buildUnknownItemRecord(item, source));
}

function buildUnknownItemRecord(item, source = 'manual') {
  const dataStatus = source === 'ocr' ? 'unknown_from_ocr' : 'unverified';
  const sourceScope = source === 'ocr' ? 'ocr_unmatched' : 'unknown';
  return {
    item,
    dataStatus,
    sourceScope,
    sourceName: source === 'ocr' ? 'OCR recognized text not collected in local dataset' : 'Text not collected in local dataset'
  };
}

function normalizeUnknownItemRecords(value, fallbackItems = [], source = 'manual') {
  const records = Array.isArray(value)
    ? value.map((item) => {
      const text = String(item?.item || '').trim();
      if (!text) return null;
      const matchIndex = Number(item.matchIndex);
      const confidence = Number(item.confidence);
      const reviewedAt = normalizeOptionalIsoDate(item.reviewedAt);
      const record = {
        item: text,
        dataStatus: normalizeDataStatus(item.dataStatus || (source === 'ocr' ? 'unknown_from_ocr' : 'unverified')),
        sourceScope: String(item.sourceScope || (source === 'ocr' ? 'ocr_unmatched' : 'unknown')).trim(),
        sourceName: String(item.sourceName || '').trim()
      };
      const reason = String(item.reason || '').trim();
      const rejectedMatchId = String(item.rejectedMatchId || '').trim();
      const rejectedMatchName = String(item.rejectedMatchName || '').trim();
      if (reason) record.reason = reason;
      if (Number.isInteger(matchIndex)) record.matchIndex = matchIndex;
      if (rejectedMatchId) record.rejectedMatchId = rejectedMatchId;
      if (rejectedMatchName) record.rejectedMatchName = rejectedMatchName;
      if (Number.isFinite(confidence)) record.confidence = clampRate(confidence);
      if (reviewedAt) record.reviewedAt = reviewedAt;
      return record;
    }).filter(Boolean)
    : [];
  return records.length ? records : buildUnknownItemRecords(fallbackItems, source);
}

function getResultDataStatus(result, source = 'manual') {
  if (!isReportMatchAccepted(result)) {
    return source === 'ocr' ? 'unknown_from_ocr' : 'unverified';
  }
  if (result.confidence < 0.9 && result.reviewDecision !== 'confirmed') return 'mapped_candidate';
  return normalizeDataStatus(result.dataStatus || result.match.dataStatus || 'unverified');
}

function normalizeDataStatus(status) {
  const allowed = ['verified_regulation', 'verified_jecfa', 'mapped_candidate', 'common_ingredient', 'unverified', 'unknown_from_ocr'];
  return allowed.includes(status) ? status : 'unverified';
}

function normalizeReviewDecision(value) {
  return MATCH_REVIEW_DECISIONS.includes(value) ? value : '';
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

function calculateMatchRate(matchResults) {
  const total = Array.isArray(matchResults) ? matchResults.length : 0;
  if (!total) return 0;
  return matchResults.filter(isReportMatchAccepted).length / total;
}

function buildReportTitle(input) {
  const compact = String(input || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '未命名报告';
  return compact.length > 28 ? `${compact.slice(0, 28)}...` : compact;
}

function createReportId() {
  if (globalThis.crypto?.randomUUID) return `report-${globalThis.crypto.randomUUID()}`;
  const random = Math.random().toString(36).slice(2).padEnd(10, '0').slice(0, 10);
  return `report-${Date.now().toString(36)}-${random}`;
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeOptionalIsoDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeNullableId(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeReportSource(value) {
  return reportSources.includes(value) ? value : 'manual';
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function uniqueStrings(value) {
  return [...new Set(normalizeStringList(value))];
}

function truncateText(value, maxLength) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function clampRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function numberOrFallback(value, fallback) {
  if (value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getReportIngredientCount(report) {
  if (Array.isArray(report?.parsedIngredients) && report.parsedIngredients.length) {
    return report.parsedIngredients.length;
  }
  return parseIngredientList(getReportText(report)).length;
}

function getReportText(report) {
  return String(report?.originalText || report?.input || '').trim();
}
