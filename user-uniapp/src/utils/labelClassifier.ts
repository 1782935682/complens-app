import type { LabelClassification, LabelType } from '@/types';

export function classifyLabelText(text: string): LabelClassification {
  const normalized = normalizeLabelText(text);
  const scores = buildScores(normalized);
  const [labelType, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [LabelType, number];
  const confidence = Math.min(0.95, Math.max(0.2, score));
  const requiresUserSelection = labelType === 'unknown_label' || confidence < getConfidenceGate(labelType);

  return {
    labelType: requiresUserSelection ? 'unknown_label' : labelType,
    confidence,
    requiresUserSelection,
    reasons: buildReasons(labelType, requiresUserSelection)
  };
}

type NormalizedLabelText = {
  raw: string;
  compact: string;
  lines: string[];
  delimiterCount: number;
};

const ingredientHeadingPattern = /(配\s*料\s*表?|原\s*料|成\s*分)\s*[:：]/i;
const strongIngredientTerms = ['水', '白砂糖', '食用盐', '小麦粉', '植物油', '乳粉', '淀粉', '可可粉', '麦芽糖浆', '果葡糖浆', '食品添加剂'];
const ingredientFunctionTerms = ['防腐剂', '甜味剂', '增稠剂', '酸度调节剂', '着色剂', '食用香精', '乳化剂', '膨松剂'];
const nutritionTerms = ['能量', '蛋白质', '脂肪', '碳水化合物', '糖', '钠', 'NRV', '营养素参考值'];
const packageInfoTerms = ['商品名称', '产品名称', '净含量', '生产日期', '保质期', '贮存', '储存', '生产商', '制造商', '委托方', '经销商', '地址', '电话', '食品生产许可证', '执行标准', '条码', '条形码', 'SC'];
const frontClaimTerms = ['0糖', '零糖', '低脂', '高蛋白', '无添加', '非油炸', '粗粮', '低卡', '代餐', '儿童', '每日坚果'];

function normalizeLabelText(text: string): NormalizedLabelText {
  const raw = String(text || '').normalize('NFKC').trim();
  return {
    raw,
    compact: raw.replace(/\s+/g, ''),
    lines: raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    delimiterCount: (raw.match(/[,，、;；]/g) || []).length
  };
}

function buildScores(text: NormalizedLabelText): Record<LabelType, number> {
  if (!text.compact) {
    return {
      ingredient_list: 0,
      nutrition_facts: 0,
      front_claims: 0,
      barcode_or_product: 0,
      unknown_label: 0.7
    };
  }

  const packageScore = scoreByKeywords(text.compact, packageInfoTerms) + (/\bSC\d{8,}\b/i.test(text.compact) ? 0.24 : 0);
  const nutritionTermHits = countKeywordHits(text.compact, nutritionTerms);
  const ingredientTermHits = countKeywordHits(text.compact, [...strongIngredientTerms, ...ingredientFunctionTerms]);
  const hasIngredientHeading = ingredientHeadingPattern.test(text.raw);
  const hasListShape = text.delimiterCount >= 3 || text.lines.some((line) => line.includes('、') || line.includes('，'));
  const ingredientScore =
    (hasIngredientHeading ? 0.72 : 0) +
    (hasListShape && ingredientTermHits >= 3 ? 0.22 : 0) +
    (ingredientTermHits >= 5 ? 0.12 : 0) -
    (packageScore >= 0.4 && !hasIngredientHeading ? 0.24 : 0);

  const nutritionScore =
    (text.compact.includes('营养成分表') ? 0.76 : 0) +
    (nutritionTermHits >= 3 ? 0.28 : nutritionTermHits * 0.08) +
    (/每\s*100\s*(?:g|克|ml|毫升)/i.test(text.raw) ? 0.16 : 0);

  const frontClaimScore =
    scoreByKeywords(text.compact, frontClaimTerms) +
    (!hasIngredientHeading && packageScore < 0.5 && text.compact.length < 120 ? 0.08 : 0);

  return {
    ingredient_list: Math.max(0, ingredientScore),
    nutrition_facts: nutritionScore,
    front_claims: frontClaimScore,
    barcode_or_product: packageScore,
    unknown_label: 0.18
  };
}

function countKeywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function scoreByKeywords(text: string, keywords: string[]): number {
  if (!text) return 0;
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 0.18 : 0), 0);
}

function getConfidenceGate(labelType: LabelType): number {
  if (labelType === 'ingredient_list') return 0.68;
  if (labelType === 'nutrition_facts') return 0.58;
  if (labelType === 'barcode_or_product') return 0.36;
  if (labelType === 'front_claims') return 0.42;
  return 0.55;
}

function buildReasons(labelType: LabelType, requiresUserSelection: boolean): string[] {
  if (requiresUserSelection) return ['文字特征不够明确，将按包装原文整理并提示核对。'];
  if (labelType === 'ingredient_list') return ['识别到明确的配料标题或成分列表。'];
  if (labelType === 'nutrition_facts') return ['识别到营养成分字段。'];
  if (labelType === 'front_claims') return ['识别到包装正面卖点文字。'];
  if (labelType === 'barcode_or_product') return ['识别到产品名、净含量、日期或条码等信息。'];
  return ['文字特征不够明确，将按包装原文整理并提示核对。'];
}
