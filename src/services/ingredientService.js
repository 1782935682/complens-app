import { ingredients, popularIngredientIds } from '../data/ingredients.js';
import { foodAdditives, popularFoodAdditiveIds } from '../data/foodAdditives.js';
import { normalizeText, splitIngredientInput, uniqueBy } from '../utils/text.js';

const riskOrder = {
  high: 3,
  medium: 2,
  unknown: 1,
  low: 0
};

const riskFilterOrder = ['high', 'medium', 'low', 'unknown'];
const datasetAuditTargets = {
  food: {
    minimum: 50,
    target: 100
  }
};

export function getAllIngredients(category = 'cosmetics') {
  return getDatasetByCategory(category).items;
}

export function getPopularIngredients(category = 'cosmetics') {
  const dataset = getDatasetByCategory(category);
  return dataset.popularIds
    .map((id) => getIngredientById(id, category))
    .filter(Boolean);
}

export function getIngredientById(id, category = 'cosmetics') {
  const dataset = getDatasetByCategory(category);
  return dataset.items.find((ingredient) => ingredient.id === id) || null;
}

export function getSearchFilterOptions(category = 'cosmetics') {
  const items = getDatasetByCategory(category).items;
  const riskLevels = [...new Set(items.map((ingredient) => ingredient.riskLevel).filter(Boolean))]
    .sort((a, b) => riskFilterOrder.indexOf(a) - riskFilterOrder.indexOf(b));
  const categories = [...new Set(items.map((ingredient) => ingredient.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

  return { riskLevels, categories };
}

export function getIngredientCategorySummaries(category = 'cosmetics') {
  const summaries = new Map();

  for (const ingredient of getDatasetByCategory(category).items) {
    const name = ingredient.category;
    if (!name) continue;
    const summary = summaries.get(name) || {
      name,
      count: 0,
      riskCounts: { high: 0, medium: 0, low: 0, unknown: 0 }
    };
    summary.count += 1;
    const riskKey = ingredient.riskLevel || 'unknown';
    summary.riskCounts[riskKey] = (summary.riskCounts[riskKey] || 0) + 1;
    summaries.set(name, summary);
  }

  return [...summaries.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export function getDatasetAuditSummary(category = 'cosmetics') {
  const items = getDatasetByCategory(category).items;
  const categoryNames = new Set();
  const reviewCounts = { draft: 0, reviewed: 0, verified: 0, unknown: 0 };
  let withSourcesCount = 0;
  let withUsageLimitsCount = 0;
  let restrictedCount = 0;

  for (const ingredient of items) {
    if (ingredient.category) categoryNames.add(ingredient.category);
    const reviewStatus = ['draft', 'reviewed', 'verified'].includes(ingredient.reviewStatus) ? ingredient.reviewStatus : 'unknown';
    reviewCounts[reviewStatus] += 1;
    if (Array.isArray(ingredient.sourceReferences) && ingredient.sourceReferences.length) withSourcesCount += 1;
    if (Array.isArray(ingredient.usageLimits) && ingredient.usageLimits.length) withUsageLimitsCount += 1;
    if (ingredient.gbStatus === 'restricted') restrictedCount += 1;
  }

  const totalCount = items.length;
  const target = datasetAuditTargets[category] || { minimum: 0, target: 0 };
  return {
    category,
    totalCount,
    categoryCount: categoryNames.size,
    reviewCounts,
    draftCount: reviewCounts.draft,
    reviewedCount: reviewCounts.reviewed,
    verifiedCount: reviewCounts.verified,
    reviewedOrVerifiedCount: reviewCounts.reviewed + reviewCounts.verified,
    withSourcesCount,
    withUsageLimitsCount,
    missingUsageLimitsCount: Math.max(0, totalCount - withUsageLimitsCount),
    restrictedCount,
    mvpMinimum: target.minimum,
    mvpTarget: target.target,
    mvpMinimumReached: target.minimum ? totalCount >= target.minimum : false,
    sourceCoveragePercent: getPercent(withSourcesCount, totalCount),
    usageLimitCoveragePercent: getPercent(withUsageLimitsCount, totalCount)
  };
}

export function searchIngredients(query, category = 'cosmetics', filters = {}) {
  const keyword = normalizeText(query);
  const activeFilters = normalizeSearchFilters(filters);
  if (!keyword && !hasActiveSearchFilters(activeFilters)) return [];

  return getDatasetByCategory(category).items
    .map((ingredient) => ({
      ingredient,
      score: keyword ? getSearchScore(ingredient, keyword) : 1
    }))
    .filter((item) => item.score > 0)
    .filter((item) => matchesSearchFilters(item.ingredient, activeFilters))
    .sort((a, b) => b.score - a.score || a.ingredient.nameCn.localeCompare(b.ingredient.nameCn, 'zh-Hans-CN'))
    .map(({ ingredient }) => toSearchResult(ingredient));
}

export function getSearchSuggestions(query, category = 'cosmetics', limit = 6) {
  const maxItems = Math.max(1, Number(limit) || 6);
  const keyword = normalizeText(query);

  if (!keyword) {
    return getPopularIngredients(category)
      .slice(0, maxItems)
      .map((ingredient) => toSearchSuggestion(ingredient, {
        matchedText: ingredient.eNumber || ingredient.gbCode || ingredient.category || '',
        matchLabel: '热门'
      }));
  }

  return getDatasetByCategory(category).items
    .map((ingredient) => ({
      ingredient,
      match: getSuggestionMatch(ingredient, keyword)
    }))
    .filter((item) => item.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || a.ingredient.nameCn.localeCompare(b.ingredient.nameCn, 'zh-Hans-CN'))
    .slice(0, maxItems)
    .map(({ ingredient, match }) => toSearchSuggestion(ingredient, match));
}

export function getRelatedIngredients(id, category = 'cosmetics', limit = 4) {
  const ingredient = getIngredientById(id, category);
  if (!ingredient) return [];

  const maxItems = Math.max(1, Number(limit) || 4);
  return getDatasetByCategory(category).items
    .filter((candidate) => candidate.id !== ingredient.id)
    .map((candidate) => ({
      ingredient: candidate,
      relation: getRelatedScore(ingredient, candidate)
    }))
    .filter((item) => item.relation.score > 0)
    .sort((a, b) => b.relation.score - a.relation.score || a.ingredient.nameCn.localeCompare(b.ingredient.nameCn, 'zh-Hans-CN'))
    .slice(0, maxItems)
    .map(({ ingredient: relatedIngredient, relation }) => ({
      ...toSearchResult(relatedIngredient),
      relationReasons: relation.reasons
    }));
}

export function analyzeIngredientText(input, category = 'cosmetics') {
  const rawItems = splitIngredientInput(input);
  const matched = [];
  const unknownItems = [];

  for (const item of rawItems) {
    const match = findIngredientByLooseName(item, category);
    if (match) {
      matched.push(match);
    } else {
      unknownItems.push(item);
    }
  }

  const ingredientsMatched = uniqueBy(matched, (ingredient) => ingredient.id);
  const highlights = ingredientsMatched
    .filter((ingredient) => ['medium', 'high'].includes(ingredient.riskLevel))
    .sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

  return {
    ingredients: ingredientsMatched,
    matchedCount: ingredientsMatched.length,
    unknownItems: uniqueBy(unknownItems, normalizeText),
    highlights,
    summary: buildAnalysisSummary(ingredientsMatched, unknownItems, rawItems.length, category)
  };
}

function getSearchScore(ingredient, keyword) {
  const names = getSearchableNames(ingredient);
  const exact = names.some((name) => normalizeText(name) === keyword);
  if (exact) return 100;

  const startsWith = names.some((name) => normalizeText(name).startsWith(keyword));
  if (startsWith) return 70;

  const includesName = names.some((name) => normalizeText(name).includes(keyword));
  if (includesName) return 50;

  const haystack = normalizeText([
    ingredient.category,
    ingredient.description,
    ingredient.riskSummary,
    ingredient.gbCode,
    ingredient.eNumber,
    ...(ingredient.functions || [])
  ].join(' '));
  return haystack.includes(keyword) ? 20 : 0;
}

function normalizeSearchFilters(filters) {
  return {
    risk: typeof filters.risk === 'string' ? filters.risk.trim() : '',
    ingredientCategory: typeof filters.ingredientCategory === 'string' ? filters.ingredientCategory.trim() : ''
  };
}

function hasActiveSearchFilters(filters) {
  return Boolean(filters.risk || filters.ingredientCategory);
}

function matchesSearchFilters(ingredient, filters) {
  if (filters.risk && ingredient.riskLevel !== filters.risk) return false;
  if (filters.ingredientCategory && ingredient.category !== filters.ingredientCategory) return false;
  return true;
}

function findIngredientByLooseName(value, category) {
  const keyword = normalizeText(value).replace(/[().]/g, '');
  return getDatasetByCategory(category).items.find((ingredient) => {
    const names = getSearchableNames(ingredient);
    return names.some((name) => {
      const normalized = normalizeText(name).replace(/[().]/g, '');
      const canUsePartialMatch = keyword.length >= 2 && normalized.length >= 2;
      return normalized === keyword || (canUsePartialMatch && (normalized.includes(keyword) || keyword.includes(normalized)));
    });
  }) || null;
}

function getSearchableNames(ingredient) {
  return [
    ingredient.nameCn,
    ingredient.nameEn,
    ingredient.gbCode,
    ingredient.eNumber,
    ...(ingredient.aliases || [])
  ].filter(Boolean);
}

function getSuggestionMatch(ingredient, keyword) {
  const fields = [
    { label: '中文名', value: ingredient.nameCn, weight: 100 },
    { label: '英文名', value: ingredient.nameEn, weight: 96 },
    { label: 'GB/INS', value: ingredient.gbCode, weight: 94 },
    { label: 'E-number', value: ingredient.eNumber, weight: 94 },
    ...(ingredient.aliases || []).map((value) => ({ label: '别名', value, weight: 90 })),
    { label: '分类', value: ingredient.category, weight: 60 },
    ...(ingredient.functions || []).map((value) => ({ label: '功能', value, weight: 52 }))
  ].filter((field) => field.value);

  let best = { score: 0, matchedText: '', matchLabel: '' };
  for (const field of fields) {
    const normalized = normalizeText(field.value);
    const score = getFieldMatchScore(normalized, keyword, field.weight);
    if (score > best.score) {
      best = {
        score,
        matchedText: field.value,
        matchLabel: field.label
      };
    }
  }

  if (best.score) return best;

  const haystack = normalizeText([ingredient.description, ingredient.riskSummary].join(' '));
  if (haystack.includes(keyword)) {
    return { score: 20, matchedText: '成分说明', matchLabel: '说明' };
  }
  return best;
}

function getFieldMatchScore(value, keyword, weight) {
  if (value === keyword) return weight + 20;
  if (value.startsWith(keyword)) return weight;
  return value.includes(keyword) ? weight - 20 : 0;
}

function getRelatedScore(source, candidate) {
  const reasons = [];
  let score = 0;

  if (source.category && source.category === candidate.category) {
    score += 50;
    reasons.push(`同属${source.category}`);
  }

  const sharedFunctions = getSharedValues(source.functions, candidate.functions);
  if (sharedFunctions.length) {
    score += 18 * Math.min(sharedFunctions.length, 3);
    reasons.push(formatRelationReason('共同功能', sharedFunctions));
  }

  const sharedFoodCategories = getSharedValues(source.foodCategories, candidate.foodCategories);
  if (sharedFoodCategories.length) {
    score += 8 * Math.min(sharedFoodCategories.length, 3);
    reasons.push(formatRelationReason('适用食品', sharedFoodCategories));
  }

  const sharedAllergens = getSharedValues(source.allergenTypes, candidate.allergenTypes);
  if (sharedAllergens.length) {
    score += 20;
    reasons.push('过敏原标注相近');
  }

  const sharedCautionGroups = getSharedValues(source.cautionGroups, candidate.cautionGroups);
  if (sharedCautionGroups.length) {
    score += 10;
    reasons.push('关注人群相近');
  }

  const sharedCautions = getSharedValues(source.cautionFor, candidate.cautionFor);
  if (sharedCautions.length) {
    score += 6 * Math.min(sharedCautions.length, 3);
    reasons.push(formatRelationReason('共同提醒', sharedCautions));
  }

  if (score > 0 && source.riskLevel && source.riskLevel === candidate.riskLevel) {
    score += 4;
    reasons.push(`同为${relationRiskLabel(source.riskLevel)}级别`);
  }

  return {
    score,
    reasons: uniqueBy(reasons.filter(Boolean), normalizeText).slice(0, 3)
  };
}

function getSharedValues(sourceValues, candidateValues) {
  const sourceList = Array.isArray(sourceValues) ? sourceValues.filter(Boolean) : [];
  const candidateKeys = new Set((Array.isArray(candidateValues) ? candidateValues : []).map(normalizeText));
  return uniqueBy(sourceList.filter((value) => candidateKeys.has(normalizeText(value))), normalizeText);
}

function formatRelationReason(label, values) {
  return `${label}：${values.slice(0, 2).join('、')}`;
}

function relationRiskLabel(level) {
  const labels = {
    low: '低关注',
    medium: '需关注',
    high: '高关注',
    unknown: '未知'
  };
  return labels[level] || labels.unknown;
}

function getPercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function getDatasetByCategory(category) {
  if (category === 'food') {
    return {
      items: foodAdditives,
      popularIds: popularFoodAdditiveIds
    };
  }
  return {
    items: ingredients,
    popularIds: popularIngredientIds
  };
}

function toSearchResult(ingredient) {
  return {
    id: ingredient.id,
    nameCn: ingredient.nameCn,
    nameEn: ingredient.nameEn,
    description: ingredient.description,
    riskLevel: ingredient.riskLevel,
    category: ingredient.category,
    gbCode: ingredient.gbCode,
    eNumber: ingredient.eNumber,
    allergenTypes: ingredient.allergenTypes || []
  };
}

function toSearchSuggestion(ingredient, match) {
  return {
    ...toSearchResult(ingredient),
    matchedText: match.matchedText,
    matchLabel: match.matchLabel
  };
}

function buildAnalysisSummary(matched, unknownItems, totalCount, category = 'cosmetics') {
  if (!totalCount) {
    return '请输入成分表文本，系统会优先匹配本地成分库并标出需要关注的项目。';
  }

  if (!matched.length) {
    return '暂未匹配到本地成分库中的项目，建议检查分隔符或换用更完整的成分名称。';
  }

  const watchCount = matched.filter((ingredient) => ['medium', 'high'].includes(ingredient.riskLevel)).length;
  const unknownText = unknownItems.length ? `，另有 ${unknownItems.length} 项暂未收录` : '';
  const contextText = category === 'food' ? '摄入频率、食品类别和个人情况' : '肤质和使用场景';
  if (watchCount) {
    return `已匹配 ${matched.length} 项成分，其中 ${watchCount} 项可能需要结合${contextText}重点关注${unknownText}。`;
  }
  if (category === 'food') {
    return `已匹配 ${matched.length} 项成分，当前未发现高关注项${unknownText}。仍建议结合摄入量、食品类别和产品标签判断。`;
  }
  return `已匹配 ${matched.length} 项成分，当前未发现高关注项${unknownText}。仍建议结合自身耐受和产品说明判断。`;
}
