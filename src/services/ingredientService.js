import { ingredients, popularIngredientIds } from '../data/ingredients.js';
import { normalizeText, splitIngredientInput, uniqueBy } from '../utils/text.js';

const riskOrder = {
  high: 3,
  medium: 2,
  unknown: 1,
  low: 0
};

export function getAllIngredients() {
  return ingredients;
}

export function getPopularIngredients() {
  return popularIngredientIds
    .map((id) => getIngredientById(id))
    .filter(Boolean);
}

export function getIngredientById(id) {
  return ingredients.find((ingredient) => ingredient.id === id) || null;
}

export function searchIngredients(query) {
  const keyword = normalizeText(query);
  if (!keyword) return [];

  return ingredients
    .map((ingredient) => ({
      ingredient,
      score: getSearchScore(ingredient, keyword)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.ingredient.nameCn.localeCompare(b.ingredient.nameCn, 'zh-Hans-CN'))
    .map(({ ingredient }) => toSearchResult(ingredient));
}

export function analyzeIngredientText(input) {
  const rawItems = splitIngredientInput(input);
  const matched = [];
  const unknownItems = [];

  for (const item of rawItems) {
    const match = findIngredientByLooseName(item);
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

function findIngredientByLooseName(value) {
  const keyword = normalizeText(value).replace(/[().]/g, '');
  return ingredients.find((ingredient) => {
    const names = [ingredient.nameCn, ingredient.nameEn, ...(ingredient.aliases || [])].filter(Boolean);
    return names.some((name) => {
      const normalized = normalizeText(name).replace(/[().]/g, '');
      const canUsePartialMatch = keyword.length >= 2 && normalized.length >= 2;
      return normalized === keyword || (canUsePartialMatch && (normalized.includes(keyword) || keyword.includes(normalized)));
    });
  }) || null;
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
