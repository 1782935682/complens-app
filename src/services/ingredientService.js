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
    summary: buildAnalysisSummary(ingredientsMatched, unknownItems, rawItems.length)
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

function buildAnalysisSummary(matched, unknownItems, totalCount) {
  if (!totalCount) {
    return '请输入成分表文本，系统会优先匹配本地成分库并标出需要关注的项目。';
  }

  if (!matched.length) {
    return '暂未匹配到本地成分库中的项目，建议检查分隔符或换用更完整的成分名称。';
  }

  const watchCount = matched.filter((ingredient) => ['medium', 'high'].includes(ingredient.riskLevel)).length;
  const unknownText = unknownItems.length ? `，另有 ${unknownItems.length} 项暂未收录` : '';
  if (watchCount) {
    return `已匹配 ${matched.length} 项成分，其中 ${watchCount} 项可能需要结合肤质和使用场景重点关注${unknownText}。`;
  }
  return `已匹配 ${matched.length} 项成分，当前未发现高关注项${unknownText}。仍建议结合自身耐受和产品说明判断。`;
}
