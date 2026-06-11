import { categoryPath, getProductCategory } from '../data/categories.js';
import { riskLabel } from '../components/render.js';

export function buildIngredientSharePayload(ingredient, category = 'food', baseUrl = '') {
  if (!ingredient) return null;
  const currentCategory = getProductCategory(category);
  const title = `${ingredient.nameCn || ingredient.nameEn || '成分详情'} - CompCheck`;
  const lines = [
    `${currentCategory.label}成分：${ingredient.nameCn || ingredient.nameEn || '未命名成分'}`,
    ingredient.nameEn ? `英文名：${ingredient.nameEn}` : '',
    `关注等级：${riskLabel(ingredient.riskLevel || 'unknown')}`,
    ingredient.category ? `分类：${ingredient.category}` : '',
    ingredient.description || '',
    '仅供日常成分理解，请结合产品标签、个人情况和专业意见判断。'
  ].filter(Boolean);

  return {
    title,
    text: lines.join('\n'),
    url: buildShareUrl(category, `/ingredient/${ingredient.id}`, baseUrl)
  };
}

export function buildReportSharePayload(report, baseUrl = '') {
  if (!report) return null;
  const currentCategory = getProductCategory(report.category);
  const allergenHitCount = (report.ingredientAllergenHits || []).length + (report.textAllergenHits || []).length;
  const lines = [
    `${currentCategory.label}分析报告：${report.title}`,
    report.summary,
    `已匹配：${report.matchedCount || 0} 项`,
    `重点关注：${(report.highlightIngredientIds || []).length} 项`,
    `暂未收录：${(report.unknownItems || []).length} 项`,
    `过敏原命中：${allergenHitCount} 项`,
    '报告保存在本机，分享内容不代表数据已完成正式审核。'
  ].filter(Boolean);

  return {
    title: `${report.title} - CompCheck`,
    text: lines.join('\n'),
    url: buildShareUrl(report.category, `/reports/${report.id}`, baseUrl)
  };
}

export function buildCompareSharePayload(overview, baseUrl = '') {
  if (!overview) return null;
  const names = (overview.ingredients || [])
    .map((ingredient) => `${ingredient.nameCn}（${riskLabel(ingredient.riskLevel || 'unknown')}）`)
    .filter(Boolean);
  const lines = [
    `${overview.categoryLabel}成分对比`,
    `当前对比：${overview.count || 0} / ${overview.maxItems || 0}`,
    names.length ? `成分：${names.join('、')}` : '还没有加入对比的成分。',
    '对比列表只保存在本机，分享内容仅用于日常成分理解。'
  ];

  return {
    title: `${overview.categoryLabel}成分对比 - CompCheck`,
    text: lines.join('\n'),
    url: buildShareUrl(overview.category, '/compare', baseUrl)
  };
}

export function formatShareText(payload) {
  if (!payload) return '';
  return [
    payload.title,
    payload.text,
    payload.url
  ].filter(Boolean).join('\n\n');
}

export function buildShareUrl(category = 'food', path = '/', baseUrl = '') {
  const route = `#${categoryPath(category, path)}`;
  const normalizedBase = String(baseUrl || '').split('#')[0];
  return normalizedBase ? `${normalizedBase}${route}` : route;
}
