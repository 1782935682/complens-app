import { getProductCategory, isProductCategory } from '../data/categories.js';
import { analyzeIngredientText } from './ingredientService.js';

export const AI_ANALYSIS_PROTOCOL_VERSION = 1;
export const AI_ANALYSIS_ENDPOINT_PATH = '/api/ai/analyze-ingredients';

export const AI_ANALYSIS_RESPONSE_CONTRACT = {
  schemaVersion: AI_ANALYSIS_PROTOCOL_VERSION,
  required: ['summary', 'riskNarrative', 'sections', 'ingredientNotes', 'allergenWarnings', 'nextSteps', 'limitations'],
  sectionTones: ['info', 'watch', 'caution'],
  confidenceLevels: ['low', 'medium', 'high']
};

export async function analyzeIngredientsByAI(input, category = 'food', options = {}) {
  const normalizedInput = String(input || '').trim();
  if (!normalizedInput) {
    return {
      enabled: false,
      message: '请输入成分文本后再尝试 AI 分析。'
    };
  }

  const request = buildAIAnalysisRequest(normalizedInput, category, options);
  return {
    enabled: false,
    endpoint: AI_ANALYSIS_ENDPOINT_PATH,
    protocolVersion: AI_ANALYSIS_PROTOCOL_VERSION,
    request,
    fallback: buildAIAnalysisFallback(request),
    message: 'AI 分析接口已预留，当前未配置服务端代理，仍使用本地成分库结果。'
  };
}

export function buildAIAnalysisRequest(input, category = 'food', options = {}) {
  const normalizedInput = String(input || '').trim();
  const dataCategory = isProductCategory(category) ? category : 'food';
  const productCategory = getProductCategory(dataCategory);
  const localAnalysis = analyzeIngredientText(normalizedInput, dataCategory);
  const localIngredients = Array.isArray(localAnalysis.ingredients) ? localAnalysis.ingredients : [];
  const localHighlights = Array.isArray(localAnalysis.highlights) ? localAnalysis.highlights : [];
  const localUnknownItems = normalizeStringList(localAnalysis.unknownItems);

  return {
    protocolVersion: AI_ANALYSIS_PROTOCOL_VERSION,
    requestType: 'ingredient-analysis',
    category: dataCategory,
    categoryLabel: productCategory.label,
    locale: normalizeLocale(options.locale),
    input: normalizedInput,
    generatedAt: new Date().toISOString(),
    userContext: {
      allergenIds: normalizeStringList(options.userAllergenIds),
      consumerGroups: normalizeStringList(options.consumerGroups)
    },
    localAnalysis: {
      summary: String(localAnalysis.summary || ''),
      matchedCount: Number(localAnalysis.matchedCount) || localIngredients.length,
      unknownItems: localUnknownItems,
      riskCounts: countRisks(localIngredients),
      highlightIngredientIds: localHighlights.map((ingredient) => ingredient.id).filter(Boolean),
      ingredients: localIngredients.map(toAIIngredientSummary)
    },
    outputContract: AI_ANALYSIS_RESPONSE_CONTRACT,
    safetyRules: buildSafetyRules(dataCategory)
  };
}

export function validateAIAnalysisResponse(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: ['response must be an object'],
      value: null
    };
  }

  const schemaVersion = Number(value.schemaVersion);
  if (schemaVersion !== AI_ANALYSIS_PROTOCOL_VERSION) {
    errors.push(`schemaVersion must be ${AI_ANALYSIS_PROTOCOL_VERSION}`);
  }

  const summary = normalizeRequiredString(value.summary, 'summary', errors);
  const riskNarrative = normalizeRequiredString(value.riskNarrative, 'riskNarrative', errors);
  const sections = normalizeSections(value.sections, errors);
  const ingredientNotes = normalizeIngredientNotes(value.ingredientNotes, errors);
  const allergenWarnings = normalizeAllergenWarnings(value.allergenWarnings, errors);
  const nextSteps = normalizeRequiredStringList(value.nextSteps, 'nextSteps', errors);
  const limitations = normalizeRequiredStringList(value.limitations, 'limitations', errors);

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length
      ? null
      : {
        schemaVersion,
        summary,
        riskNarrative,
        sections,
        ingredientNotes,
        allergenWarnings,
        nextSteps,
        limitations
      }
  };
}

export function buildAIAnalysisFallback(request) {
  const safeRequest = isPlainObject(request)
    ? request
    : buildAIAnalysisRequest('', 'food');
  const dataCategory = isProductCategory(safeRequest.category) ? safeRequest.category : 'food';
  const localAnalysis = isPlainObject(safeRequest.localAnalysis) ? safeRequest.localAnalysis : {};
  const riskCounts = normalizeRiskCounts(localAnalysis.riskCounts);
  const unknownItems = normalizeStringList(localAnalysis.unknownItems);
  const ingredients = Array.isArray(localAnalysis.ingredients) ? localAnalysis.ingredients : [];
  const highOrMediumCount = riskCounts.high + riskCounts.medium;

  return {
    schemaVersion: AI_ANALYSIS_PROTOCOL_VERSION,
    summary: String(localAnalysis.summary || '当前使用本地成分库生成基础分析。'),
    riskNarrative: buildFallbackRiskNarrative(riskCounts, highOrMediumCount),
    sections: [
      {
        title: '本地库匹配',
        tone: highOrMediumCount ? 'watch' : 'info',
        body: `本地库匹配 ${Number(localAnalysis.matchedCount) || 0} 项，暂未收录 ${unknownItems.length} 项。`
      },
      {
        title: '数据边界',
        tone: unknownItems.length ? 'watch' : 'info',
        body: getFallbackCoverageText(dataCategory, unknownItems.length)
      }
    ],
    ingredientNotes: ingredients
      .filter((ingredient) => ['high', 'medium'].includes(ingredient.riskLevel))
      .map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.nameCn,
        note: ingredient.riskSummary || ingredient.description || '建议结合使用场景理解该成分。',
        confidence: 'medium'
      })),
    allergenWarnings: [],
    nextSteps: buildFallbackNextSteps(dataCategory, highOrMediumCount, unknownItems.length),
    limitations: buildFallbackLimitations(dataCategory)
  };
}

function toAIIngredientSummary(ingredient) {
  return {
    id: ingredient.id,
    nameCn: ingredient.nameCn,
    nameEn: ingredient.nameEn || '',
    category: ingredient.category || '未分类',
    riskLevel: normalizeRiskLevel(ingredient.riskLevel),
    description: ingredient.description || '',
    riskSummary: ingredient.riskSummary || '',
    gbCode: ingredient.gbCode || '',
    eNumber: ingredient.eNumber || '',
    dataStatus: ingredient.dataStatus || 'unverified',
    sourceScope: ingredient.sourceScope || 'unknown',
    sourceName: ingredient.sourceName || '',
    reviewNote: ingredient.reviewNote || '',
    allergenTypes: normalizeStringList(ingredient.allergenTypes),
    cautionGroups: normalizeStringList(ingredient.cautionGroups)
  };
}

function buildSafetyRules(category) {
  const baseRules = [
    '只基于传入的本地分析结果和用户输入生成解释，不新增未给出的法规限量数值。',
    '不得编造成分、法规来源、GB 2760 使用范围、使用限量、JECFA ADI 或人工审核结论。',
    '必须保留不替代专业判断的边界说明。',
    '对过敏原命中、未知项和高关注项优先给出核对建议。',
    '输出必须符合 outputContract，不能返回 Markdown 字符串代替结构化 JSON。'
  ];
  if (category === 'food') {
    return [
      ...baseRules,
      '食品结论必须区分 verified_regulation、verified_jecfa、mapped_candidate、common_ingredient、unverified 和 unknown_from_ocr；JECFA 只能作为安全评价来源，不能当作中国 GB 2760 使用限制。'
    ];
  }
  return [
    ...baseRules,
    '化妆品结论需要结合使用部位、使用频率和个体耐受进行克制表达。'
  ];
}

function normalizeSections(value, errors) {
  if (!Array.isArray(value) || !value.length) {
    errors.push('sections must be a non-empty array');
    return [];
  }
  return value.map((section, index) => {
    const title = normalizeRequiredString(section?.title, `sections[${index}].title`, errors);
    const body = normalizeRequiredString(section?.body, `sections[${index}].body`, errors);
    const tone = normalizeTone(section?.tone);
    if (!AI_ANALYSIS_RESPONSE_CONTRACT.sectionTones.includes(tone)) {
      errors.push(`sections[${index}].tone is invalid`);
    }
    return { title, body, tone };
  });
}

function normalizeIngredientNotes(value, errors) {
  if (!Array.isArray(value)) {
    errors.push('ingredientNotes must be an array');
    return [];
  }
  return value.map((note, index) => {
    const id = normalizeOptionalString(note?.id);
    const name = normalizeRequiredString(note?.name, `ingredientNotes[${index}].name`, errors);
    const noteText = normalizeRequiredString(note?.note, `ingredientNotes[${index}].note`, errors);
    const confidence = normalizeConfidence(note?.confidence);
    if (!AI_ANALYSIS_RESPONSE_CONTRACT.confidenceLevels.includes(confidence)) {
      errors.push(`ingredientNotes[${index}].confidence is invalid`);
    }
    return { id, name, note: noteText, confidence };
  });
}

function normalizeAllergenWarnings(value, errors) {
  if (!Array.isArray(value)) {
    errors.push('allergenWarnings must be an array');
    return [];
  }
  return value.map((warning, index) => ({
    item: normalizeRequiredString(warning?.item, `allergenWarnings[${index}].item`, errors),
    allergenIds: normalizeStringList(warning?.allergenIds),
    message: normalizeRequiredString(warning?.message, `allergenWarnings[${index}].message`, errors)
  }));
}

function normalizeRequiredStringList(value, fieldName, errors) {
  const list = normalizeStringList(value);
  if (!Array.isArray(value) || !list.length) {
    errors.push(`${fieldName} must be a non-empty array`);
  }
  return list;
}

function normalizeRequiredString(value, fieldName, errors) {
  const text = normalizeOptionalString(value);
  if (!text) errors.push(`${fieldName} must be a non-empty string`);
  return text;
}

function normalizeOptionalString(value) {
  return String(value || '').trim();
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeLocale(value) {
  const locale = String(value || '').trim();
  return locale || 'zh-CN';
}

function countRisks(ingredients) {
  const items = Array.isArray(ingredients) ? ingredients : [];
  return items.reduce((counts, ingredient) => {
    const level = normalizeRiskLevel(ingredient.riskLevel);
    counts[level] += 1;
    return counts;
  }, { low: 0, medium: 0, high: 0, unknown: 0 });
}

function normalizeRiskCounts(value) {
  return {
    low: numberOrZero(value?.low),
    medium: numberOrZero(value?.medium),
    high: numberOrZero(value?.high),
    unknown: numberOrZero(value?.unknown)
  };
}

function normalizeRiskLevel(value) {
  const riskLevel = String(value || '').trim();
  return ['low', 'medium', 'high', 'unknown'].includes(riskLevel) ? riskLevel : 'unknown';
}

function normalizeTone(value) {
  return String(value || 'info').trim();
}

function normalizeConfidence(value) {
  return String(value || 'medium').trim();
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildFallbackRiskNarrative(riskCounts, watchCount) {
  if (riskCounts.high) return `本地库发现 ${riskCounts.high} 项高关注成分，需要优先核对产品标签和适用场景。`;
  if (watchCount) return `本地库发现 ${watchCount} 项需关注成分，建议结合频率、用量和个人情况判断。`;
  return '本地库暂未发现高关注成分，仍需结合完整标签和个人耐受情况判断。';
}

function getFallbackCoverageText(category, unknownCount) {
  const categoryNote = category === 'food'
    ? '食品添加剂数据仍在逐条审核来源、限量和 ADI 原文。'
    : '化妆品数据当前仍是原型库。';
  return unknownCount
    ? `${categoryNote} 暂未收录项可能来自普通原料、复合配料或识别误差。`
    : `${categoryNote} 当前输入均已匹配本地库。`;
}

function buildFallbackNextSteps(category, watchCount, unknownCount) {
  const steps = [];
  if (watchCount) {
    steps.push(category === 'food'
      ? '优先核对重点关注成分对应的食品类别和摄入频率。'
      : '优先核对重点关注成分对应的使用部位和使用频率。');
  }
  if (unknownCount) steps.push('对暂未收录项，尝试拆分复合配料或使用包装上的标准名称重新分析。');
  if (!steps.length) steps.push('保存原始标签文本，后续数据更新后可重新分析。');
  return steps;
}

function buildFallbackLimitations(category) {
  const sourceText = category === 'food'
    ? '食品添加剂数据仍需继续核验具体来源条款和逐食品类别限量。'
    : '化妆品原型数据仍需继续扩充来源和适用场景。';
  return [
    '当前未连接服务端 AI 代理，结果来自本地规则和本地数据库。',
    sourceText,
    '本结果仅用于日常成分理解，不提供医疗诊断或替代专业意见。'
  ];
}
