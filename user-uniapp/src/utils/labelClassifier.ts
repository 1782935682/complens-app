import type { LabelClassification, LabelType } from '@/types';

export function classifyLabelText(text: string): LabelClassification {
  const normalized = String(text || '').replace(/\s+/g, '');
  const scores: Record<LabelType, number> = {
    ingredient_list: scoreByKeywords(normalized, ['配料', '原料', '食品添加剂', '白砂糖', '食用盐', '香精']),
    nutrition_facts: scoreByKeywords(normalized, ['营养成分表', '能量', '蛋白质', '脂肪', '碳水化合物', '钠', 'NRV']),
    front_claims: scoreByKeywords(normalized, ['0糖', '零糖', '低脂', '高蛋白', '无添加', '非油炸', '粗粮']),
    unknown_label: normalized.length ? 0.1 : 0.6
  };
  const [labelType, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [LabelType, number];
  const confidence = Math.min(0.95, Math.max(0.2, score));
  const requiresUserSelection = labelType === 'unknown_label' || confidence < 0.55;

  return {
    labelType: requiresUserSelection ? 'unknown_label' : labelType,
    confidence,
    requiresUserSelection,
    reasons: buildReasons(labelType, normalized)
  };
}

function scoreByKeywords(text: string, keywords: string[]): number {
  if (!text) return 0;
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 0.18 : 0), 0);
}

function buildReasons(labelType: LabelType, text: string): string[] {
  if (!text) return ['没有可用于判断的文本。'];
  if (labelType === 'ingredient_list') return ['文本中出现配料或食品添加剂相关词。'];
  if (labelType === 'nutrition_facts') return ['文本中出现营养字段或 NRV 标识。'];
  if (labelType === 'front_claims') return ['文本中出现包装正面常见卖点词。'];
  return ['当前文本特征不足，需要用户手动选择。'];
}
