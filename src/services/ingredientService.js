import { ingredients, popularIngredientIds } from '../data/ingredients.js';
import { foodAdditives, popularFoodAdditiveIds } from '../data/foodAdditives.js';
import { normalizeText, splitIngredientInput, uniqueBy } from '../utils/text.js';

const riskOrder = {
  high: 3,
  medium: 2,
  unknown: 1,
  low: 0
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

export function searchIngredients(query, category = 'cosmetics') {
  const keyword = normalizeText(query);
  if (!keyword) return [];

  return getDatasetByCategory(category).items
    .map((ingredient) => ({
      ingredient,
      score: getSearchScore(ingredient, keyword)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.ingredient.nameCn.localeCompare(b.ingredient.nameCn, 'zh-Hans-CN'))
    .map(({ ingredient }) => toSearchResult(ingredient));
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
  const names = [ingredient.nameCn, ingredient.nameEn, ...(ingredient.aliases || [])].filter(Boolean);
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
    ...(ingredient.functions || [])
  ].join(' '));
  return haystack.includes(keyword) ? 20 : 0;
}

function findIngredientByLooseName(value, category) {
  const keyword = normalizeText(value).replace(/[().]/g, '');
  return getDatasetByCategory(category).items.find((ingredient) => {
    const names = [ingredient.nameCn, ingredient.nameEn, ...(ingredient.aliases || [])].filter(Boolean);
    return names.some((name) => {
      const normalized = normalizeText(name).replace(/[().]/g, '');
      const canUsePartialMatch = keyword.length >= 2 && normalized.length >= 2;
      return normalized === keyword || (canUsePartialMatch && (normalized.includes(keyword) || keyword.includes(normalized)));
    });
  }) || null;
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
    category: ingredient.category
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
