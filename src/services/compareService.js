import { getProductCategory } from '../data/categories.js';
import { standardAllergens } from '../data/allergens.js';
import { getCompareIngredients, MAX_COMPARE_ITEMS } from '../store/userStore.js';

export function getCompareOverview(category = 'food') {
  const currentCategory = getProductCategory(category);
  const ingredients = getCompareIngredients(currentCategory.id);
  return {
    category: currentCategory.id,
    categoryLabel: currentCategory.label,
    ingredients,
    count: ingredients.length,
    maxItems: MAX_COMPARE_ITEMS,
    isEmpty: ingredients.length === 0,
    needsMoreItems: ingredients.length === 1,
    isFull: ingredients.length >= MAX_COMPARE_ITEMS,
    rows: buildCompareRows(ingredients, currentCategory.id)
  };
}

function buildCompareRows(ingredients, category) {
  const rows = [
    {
      key: 'risk',
      label: '关注等级',
      type: 'risk',
      values: ingredients.map((ingredient) => ingredient.riskLevel || 'unknown')
    },
    {
      key: 'category',
      label: '成分分类',
      values: ingredients.map((ingredient) => ingredient.category || '未分类')
    },
    {
      key: 'functions',
      label: '主要功能',
      values: ingredients.map((ingredient) => listValue(ingredient.functions))
    },
    {
      key: 'cautions',
      label: '使用提醒',
      values: ingredients.map((ingredient) => listValue(ingredient.cautionFor))
    },
    {
      key: 'allergens',
      label: '过敏原标注',
      values: ingredients.map((ingredient) => allergenValue(ingredient.allergenTypes))
    }
  ];

  if (category === 'food') {
    rows.push(
      {
        key: 'codes',
        label: '编码',
        values: ingredients.map((ingredient) => [ingredient.eNumber, ingredient.gbCode].filter(Boolean).join(' / ') || '暂无')
      },
      {
        key: 'gbStatus',
        label: 'GB 状态',
        values: ingredients.map((ingredient) => ingredient.gbStatus || 'unknown')
      },
      {
        key: 'review',
        label: '数据状态',
        values: ingredients.map((ingredient) => ingredient.reviewStatus || 'draft')
      }
    );
  }

  return rows;
}

function listValue(value) {
  if (!Array.isArray(value) || !value.length) return '暂无';
  return value.filter(Boolean).join(' / ') || '暂无';
}

function allergenValue(value) {
  if (!Array.isArray(value) || !value.length) return '暂无';
  const labels = value
    .map((id) => standardAllergens.find((allergen) => allergen.id === id)?.nameCn || '')
    .filter(Boolean);
  return labels.length ? labels.join(' / ') : '暂无';
}
