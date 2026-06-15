export type LabelType = 'ingredient_list' | 'nutrition_facts' | 'front_claims' | 'barcode_or_product' | 'unknown_label';

export type LabelClassificationResult = {
  labelType: LabelType;
  confidence: number;
  requiresUserSelection: boolean;
  reasons: string[];
};

export type LabelClassifyInput = {
  text?: string;
  imageAssetId?: string;
  userSelectedType?: LabelType;
};

export type LabelService = {
  classifyLabel(input: LabelClassifyInput): LabelClassificationResult;
};

const LABEL_TYPE_LABELS: Record<LabelType, string> = {
  ingredient_list: '配料表',
  nutrition_facts: '营养成分表',
  front_claims: '包装正面',
  barcode_or_product: '产品名/条码',
  unknown_label: '未知标签'
};

const LABEL_KEYWORDS: Record<Exclude<LabelType, 'unknown_label'>, string[]> = {
  ingredient_list: ['配料', '配料表', '原料', '食品添加剂', '白砂糖', '食用盐', '食用香精', '增稠剂', '防腐剂'],
  nutrition_facts: ['营养成分表', '营养成分', '能量', '蛋白质', '脂肪', '碳水化合物', '钠', 'NRV', '每100克', '每100毫升'],
  front_claims: ['0糖', '零糖', '低脂', '高蛋白', '无添加', '非油炸', '粗粮', '低卡', '代餐', '儿童'],
  barcode_or_product: ['条形码', '条码', '商品名称', '产品名称', '净含量', '保质期', '生产日期', '食品生产许可证', 'SC']
};

export function createLabelService(): LabelService {
  return {
    classifyLabel
  };
}

export function isLabelType(value: unknown): value is LabelType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LABEL_TYPE_LABELS, value);
}

function classifyLabel(input: LabelClassifyInput): LabelClassificationResult {
  if (input.userSelectedType) {
    return {
      labelType: input.userSelectedType,
      confidence: 1,
      requiresUserSelection: false,
      reasons: [`已按用户选择设置为${LABEL_TYPE_LABELS[input.userSelectedType]}。`]
    };
  }

  const normalized = normalizeLabelText(input.text);
  if (!normalized) {
    return {
      labelType: 'unknown_label',
      confidence: 0.2,
      requiresUserSelection: true,
      reasons: ['没有可用于判断的文本，需要用户手动选择。']
    };
  }

  const scores = buildScores(normalized);
  const [labelType, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [LabelType, number];
  const confidence = clampConfidence(score);
  const requiresUserSelection = labelType === 'unknown_label' || confidence < 0.55;

  return {
    labelType: requiresUserSelection ? 'unknown_label' : labelType,
    confidence,
    requiresUserSelection,
    reasons: buildReasons(labelType, normalized, requiresUserSelection)
  };
}

function normalizeLabelText(text: unknown): string {
  return String(text || '').replace(/\s+/g, '').trim();
}

function buildScores(text: string): Record<LabelType, number> {
  return {
    ingredient_list: scoreByKeywords(text, LABEL_KEYWORDS.ingredient_list),
    nutrition_facts: scoreByKeywords(text, LABEL_KEYWORDS.nutrition_facts),
    front_claims: scoreByKeywords(text, LABEL_KEYWORDS.front_claims),
    barcode_or_product: scoreByKeywords(text, LABEL_KEYWORDS.barcode_or_product),
    unknown_label: 0.1
  };
}

function scoreByKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 0.2 : 0), 0);
}

function clampConfidence(score: number): number {
  return Math.min(0.95, Math.max(0.2, score));
}

function buildReasons(labelType: LabelType, text: string, requiresUserSelection: boolean): string[] {
  if (requiresUserSelection) return ['当前文本特征不足，需要用户手动选择。'];
  if (labelType === 'ingredient_list') return ['文本中出现配料或食品添加剂相关词。'];
  if (labelType === 'nutrition_facts') return ['文本中出现营养字段或 NRV 标识。'];
  if (labelType === 'front_claims') return ['文本中出现包装正面常见卖点词。'];
  if (labelType === 'barcode_or_product') return ['文本中出现产品名、条码、净含量或日期等包装识别信息。'];
  if (text) return ['当前文本特征不足，需要用户手动选择。'];
  return ['没有可用于判断的文本，需要用户手动选择。'];
}
