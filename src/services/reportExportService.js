import { getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getAllergensByIds } from './allergenService.js';
import { getIngredientById } from './ingredientService.js';
import { getConcernSummaries, getTopIngredientNames, riskGradeLabel } from './reportService.js';
import { dataStatusLabel, normalizeDataStatus } from '../utils/dataStatus.js';

const EXPORT_SCHEMA_VERSION = 1;
const REVIEW_STATUS_LABELS = {
  draft: '草稿（未审核）',
  reviewed: '已复核',
  verified: '已验证'
};
export function buildReportExportPayload(report) {
  if (!report) return null;
  const category = getProductCategory(report.category);
  const matchedIngredients = resolveIngredientSummaries(report.matchedIngredientIds, report.category);
  const highlightIngredients = resolveIngredientSummaries(report.highlightIngredientIds, report.category);
  const missingIngredientIds = report.matchedIngredientIds.filter((id) => !getIngredientById(id, report.category));
  const sourceEvidence = resolveSourceEvidence(report.matchedIngredientIds, report.category);
  const insights = normalizeReportInsights(report.insights);

  return {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    reportSchemaVersion: report.schemaVersion,
    exportedAt: new Date().toISOString(),
    report: {
      id: report.id,
      title: report.title,
      productName: report.productName || '',
      category: report.category,
      categoryLabel: category.label,
      createdAt: report.createdAt,
      summary: report.summary,
      input: report.input,
      originalText: report.originalText || report.input,
      source: report.source || 'manual',
      riskGrade: report.riskGrade || 'C',
      riskGradeLabel: riskGradeLabel(report.riskGrade),
      riskSummary: report.riskSummary || {},
      matchRate: Number(report.matchRate) || 0,
      parsedIngredients: report.parsedIngredients || [],
      matchResults: report.matchResults || [],
      matchedCount: report.matchedCount,
      pendingCount: Number(report.pendingCount) || 0,
      dataStatusCounts: report.dataStatusCounts || {},
      riskCounts: report.riskCounts,
      unknownItems: report.unknownItems,
      unknownItemRecords: report.unknownItemRecords || [],
      unmatchedTerms: report.unmatchedTerms || report.unknownItems,
      lowConfidenceTerms: report.lowConfidenceTerms || [],
      missingIngredientIds,
      insights
    },
    matchedIngredients,
    highlightIngredients,
    reviewStatusSummary: sourceEvidence.reviewStatusSummary,
    sourceReferences: sourceEvidence.sourceReferences,
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
      payload.report.productName ? `- 产品名称：${payload.report.productName}` : '',
      `- 保存时间：${formatExportDate(payload.report.createdAt)}`,
      `- 整体评级：${payload.report.riskGrade}（${payload.report.riskGradeLabel}）`,
      `- 匹配率：${Math.round(payload.report.matchRate * 100)}%`,
      `- 已匹配：${payload.report.matchedCount} 项`,
      `- 待确认：${payload.report.pendingCount} 项`,
      `- 重点关注：${payload.highlightIngredients.length} 项`,
      `- 暂未收录：${payload.report.unknownItems.length + payload.report.missingIngredientIds.length} 项`,
      `- 过敏原命中：${allergenHitCount} 项`
    ].filter(Boolean).join('\n'),
    `## 整体说明\n${payload.report.summary}`,
    `## 关注摘要\n${buildConcernLines(report)}`,
    `## 配料顺序\n配料表中排列越靠前，通常表示添加量或含量越靠前。本报告保存时识别的前三项为：${getTopIngredientNames(report).join('、') || '暂无'}。`,
    `## 原始成分表\n${payload.report.input}`
  ];

  sections.push(buildInsightSection(payload.report.insights));
  sections.push(buildIngredientSection('## 重点关注成分', payload.highlightIngredients));
  sections.push(buildIngredientSection('## 已匹配成分', payload.matchedIngredients));
  sections.push(buildSourceSection(payload));
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
      description: ingredient.description || '',
      reviewStatus: normalizeReviewStatus(ingredient.reviewStatus),
      reviewStatusLabel: reviewStatusLabel(ingredient.reviewStatus),
      dataStatus: normalizeDataStatus(ingredient.dataStatus),
      dataStatusLabel: dataStatusLabel(ingredient.dataStatus),
      dataVersion: ingredient.dataVersion || '',
      sourceName: ingredient.sourceName || '',
      sourceScope: ingredient.sourceScope || '',
      sourceReferenceCount: Array.isArray(ingredient.sourceReferences) ? ingredient.sourceReferences.length : 0
    }));
}

function resolveSourceEvidence(ids, category) {
  const reviewStatusSummary = { draft: 0, reviewed: 0, verified: 0 };
  const sourceMap = new Map();

  for (const id of ids) {
    const ingredient = getIngredientById(id, category);
    if (!ingredient) continue;
    const reviewStatus = normalizeReviewStatus(ingredient.reviewStatus);
    reviewStatusSummary[reviewStatus] += 1;

    for (const source of ingredient.sourceReferences || []) {
      if (!source || typeof source !== 'object') continue;
      const title = valueOrFallback(source.title, '暂无来源标题');
      const standard = valueOrFallback(source.standard, '暂无标准编号');
      const key = [title, standard, source.url].filter(Boolean).join('|');
      const summary = sourceMap.get(key) || {
        title,
        standard,
        region: valueOrFallback(source.region, ''),
        retrievedAt: valueOrFallback(source.retrievedAt, ''),
        url: getSafeHttpUrl(source.url),
        ingredientIds: [],
        ingredientNames: []
      };
      if (!summary.ingredientIds.includes(ingredient.id)) {
        summary.ingredientIds.push(ingredient.id);
        summary.ingredientNames.push(ingredient.nameCn);
      }
      sourceMap.set(key, summary);
    }
  }

  return {
    reviewStatusSummary,
    sourceReferences: [...sourceMap.values()]
      .sort((a, b) => b.ingredientNames.length - a.ingredientNames.length || a.title.localeCompare(b.title, 'zh-Hans-CN'))
  };
}

function buildIngredientSection(title, ingredients) {
  if (!ingredients.length) return '';
  const lines = ingredients.map((ingredient) => {
    const name = ingredient.nameEn ? `${ingredient.nameCn} / ${ingredient.nameEn}` : ingredient.nameCn;
    return `- ${name}：${riskLabelText(ingredient.riskLevel)}，${ingredient.category}，数据状态：${ingredient.dataStatusLabel}。${ingredient.description}`;
  });
  return `${title}\n${lines.join('\n')}`;
}

function buildConcernLines(report) {
  const concerns = getConcernSummaries(report, 3);
  return concerns.length
    ? concerns.map((item) => `- ${item}`).join('\n')
    : '- 当前没有高关注或需关注匹配项，仍建议核对包装原文和数据审核状态。';
}

function buildInsightSection(insights) {
  if (!insights.length) return '';
  const lines = insights.map((insight) => {
    const items = insight.items.map((item) => `- ${item}`).join('\n');
    return [`### ${insight.title}`, insight.summary, items].filter(Boolean).join('\n');
  });
  return `## 报告解读\n${lines.join('\n\n')}`;
}

function buildSourceSection(payload) {
  const statusLines = Object.entries(payload.reviewStatusSummary)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `- ${reviewStatusLabel(status)}：${count} 项`);
  const dataStatusLines = Object.entries(payload.report.dataStatusCounts || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([status, count]) => `- ${dataStatusLabel(status)}：${count} 项`);
  const sourceLines = payload.sourceReferences.map((source) => {
    const sourceMeta = [
      source.standard,
      source.region,
      source.retrievedAt ? `检索：${source.retrievedAt}` : '',
      source.url
    ].filter(Boolean).join('；');
    return `- ${source.title}${sourceMeta ? `（${sourceMeta}）` : ''}；覆盖成分：${source.ingredientNames.join('、')}`;
  });

  if (!statusLines.length && !sourceLines.length) return '';
  return [
    '## 数据来源与审核状态',
    statusLines.join('\n'),
    dataStatusLines.length ? `### 数据状态\n${dataStatusLines.join('\n')}` : '',
    sourceLines.length ? `### 来源引用\n${sourceLines.join('\n')}` : '### 来源引用\n- 当前匹配成分暂无来源信息'
  ].filter(Boolean).join('\n\n');
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
    ...(payload.report.unknownItemRecords.length
      ? payload.report.unknownItemRecords.map((record) => `${record.item} / ${dataStatusLabel(record.dataStatus)}`)
      : payload.report.unknownItems),
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

function normalizeReportInsights(value) {
  return Array.isArray(value)
    ? value
      .map((item) => ({
        key: String(item?.key || '').trim(),
        title: String(item?.title || '').trim(),
        tone: normalizeInsightTone(item?.tone),
        summary: String(item?.summary || '').trim(),
        items: Array.isArray(item?.items)
          ? item.items.map((entry) => String(entry || '').trim()).filter(Boolean)
          : []
      }))
      .filter((item) => item.key && item.title && item.summary)
    : [];
}

function normalizeInsightTone(value) {
  const tone = String(value || '').trim();
  return ['neutral', 'watch', 'caution'].includes(tone) ? tone : 'neutral';
}

function normalizeReviewStatus(status) {
  return Object.hasOwn(REVIEW_STATUS_LABELS, status) ? status : 'draft';
}

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[normalizeReviewStatus(status)];
}

function valueOrFallback(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function getSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
