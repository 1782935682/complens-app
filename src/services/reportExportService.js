import { getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getAllergensByIds } from './allergenService.js';
import { getIngredientById } from './ingredientService.js';

const EXPORT_SCHEMA_VERSION = 1;

export function buildReportExportPayload(report) {
  if (!report) return null;
  const category = getProductCategory(report.category);
  const matchedIngredients = resolveIngredientSummaries(report.matchedIngredientIds, report.category);
  const highlightIngredients = resolveIngredientSummaries(report.highlightIngredientIds, report.category);
  const missingIngredientIds = report.matchedIngredientIds.filter((id) => !getIngredientById(id, report.category));

  return {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    reportSchemaVersion: report.schemaVersion,
    exportedAt: new Date().toISOString(),
    report: {
      id: report.id,
      title: report.title,
      category: report.category,
      categoryLabel: category.label,
      createdAt: report.createdAt,
      summary: report.summary,
      input: report.input,
      matchedCount: report.matchedCount,
      riskCounts: report.riskCounts,
      unknownItems: report.unknownItems,
      missingIngredientIds
    },
    matchedIngredients,
    highlightIngredients,
    ingredientAllergenHits: report.ingredientAllergenHits.map((hit) => ({
      id: hit.id,
      name: getIngredientById(hit.id, report.category)?.nameCn || hit.id,
      allergenIds: hit.allergenIds,
      allergenNames: formatAllergenNames(getAllergensByIds(hit.allergenIds))
    })),
    textAllergenHits: report.textAllergenHits.map((hit) => ({
      item: hit.item,
      allergenIds: hit.allergenIds,
      allergenNames: formatAllergenNames(getAllergensByIds(hit.allergenIds))
    }))
  };
}

export function buildReportMarkdown(report) {
  const payload = buildReportExportPayload(report);
  if (!payload) return '';

  const allergenHitCount = payload.ingredientAllergenHits.length + payload.textAllergenHits.length;
  const sections = [
    `# ${payload.report.title}`,
    [
      `- 类别：${payload.report.categoryLabel}`,
      `- 保存时间：${formatExportDate(payload.report.createdAt)}`,
      `- 已匹配：${payload.report.matchedCount} 项`,
      `- 重点关注：${payload.highlightIngredients.length} 项`,
      `- 暂未收录：${payload.report.unknownItems.length + payload.report.missingIngredientIds.length} 项`,
      `- 过敏原命中：${allergenHitCount} 项`
    ].join('\n'),
    `## 整体说明\n${payload.report.summary}`,
    `## 原始成分表\n${payload.report.input}`
  ];

  sections.push(buildIngredientSection('## 重点关注成分', payload.highlightIngredients));
  sections.push(buildIngredientSection('## 已匹配成分', payload.matchedIngredients));
  sections.push(buildAllergenSection(payload));
  sections.push(buildUnknownSection(payload));
  sections.push('## 使用边界\n本报告仅用于日常成分理解，不提供医疗诊断或治疗建议。请结合产品标签、个人耐受情况和专业意见判断。');

  return sections.filter(Boolean).join('\n\n');
}

export function buildReportFileName(report, extension = 'md') {
  const title = String(report?.title || 'analysis-report')
    .normalize('NFKC')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'analysis-report';
  const date = formatFileDate(report?.createdAt);
  const safeExtension = String(extension || 'md').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'md';
  return `${date}-${title}.${safeExtension}`;
}

function resolveIngredientSummaries(ids, category) {
  return ids
    .map((id) => getIngredientById(id, category))
    .filter(Boolean)
    .map((ingredient) => ({
      id: ingredient.id,
      nameCn: ingredient.nameCn,
      nameEn: ingredient.nameEn || '',
      category: ingredient.category || '未分类',
      riskLevel: ingredient.riskLevel || 'unknown',
      description: ingredient.description || ''
    }));
}

function buildIngredientSection(title, ingredients) {
  if (!ingredients.length) return '';
  const lines = ingredients.map((ingredient) => {
    const name = ingredient.nameEn ? `${ingredient.nameCn} / ${ingredient.nameEn}` : ingredient.nameCn;
    return `- ${name}：${riskLabelText(ingredient.riskLevel)}，${ingredient.category}。${ingredient.description}`;
  });
  return `${title}\n${lines.join('\n')}`;
}

function buildAllergenSection(payload) {
  const lines = [
    ...payload.ingredientAllergenHits.map((hit) => `- 成分：${hit.name}；过敏原：${hit.allergenNames || '待确认'}`),
    ...payload.textAllergenHits.map((hit) => `- 标签文本：${hit.item}；过敏原：${hit.allergenNames || '待确认'}`)
  ];
  return lines.length ? `## 过敏原命中\n${lines.join('\n')}` : '';
}

function buildUnknownSection(payload) {
  const unknownItems = [
    ...payload.report.unknownItems,
    ...payload.report.missingIngredientIds.map((id) => `已保存成分 ID：${id}`)
  ];
  return unknownItems.length ? `## 暂未收录 / 数据已变更\n${unknownItems.map((item) => `- ${item}`).join('\n')}` : '';
}

function riskLabelText(level) {
  const labels = {
    low: '低关注',
    medium: '需关注',
    high: '高关注',
    unknown: '未知'
  };
  return labels[level] || labels.unknown;
}

function formatExportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatFileDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'undated';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
