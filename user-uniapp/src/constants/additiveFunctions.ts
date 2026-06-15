const gb2760FunctionLabels = [
  '酸度调节剂',
  '抗结剂',
  '消泡剂',
  '抗氧化剂',
  '漂白剂',
  '膨松剂',
  '胶基糖果中基础剂物质',
  '胶姆糖基础剂',
  '着色剂',
  '护色剂',
  '乳化剂',
  '酶制剂',
  '增味剂',
  '面粉处理剂',
  '被膜剂',
  '水分保持剂',
  '营养强化剂',
  '防腐剂',
  '稳定剂',
  '凝固剂',
  '稳定剂和凝固剂',
  '甜味剂',
  '增稠剂',
  '食品用香料',
  '食品工业用加工助剂'
] as const;

const categoryAliasLabels = ['色素', '食用香精', '香精', '香料', '香料类', '加工助剂', '保湿剂', '其他食品添加剂'] as const;
const genericAdditiveCategoryLabels = ['食品添加剂', '添加剂'] as const;
const exactCategoryAliasLabels = ['其他'] as const;
const additiveWrapperLabels = [
  ...genericAdditiveCategoryLabels,
  ...gb2760FunctionLabels,
  ...categoryAliasLabels,
  ...exactCategoryAliasLabels
] as const;
const wrapperModifierPrefixes = [
  '食品工业用',
  '食品用',
  '复配型',
  '水溶性',
  '油溶性',
  '复配',
  '复合',
  '混合',
  '天然',
  '食用',
  '高倍',
  '低倍'
] as const;

export function hasAdditiveFunctionLabel(value: unknown): boolean {
  const label = normalizeFunctionLabel(value);
  if (!label) return false;
  if (exactCategoryAliasLabels.some((candidate) => label === candidate)) return true;
  if (genericAdditiveCategoryLabels.some((candidate) => label === candidate)) return true;
  return [...gb2760FunctionLabels, ...categoryAliasLabels].some((candidate) => label.includes(candidate));
}

export function isAdditiveWrapperLabel(value: unknown): boolean {
  const label = normalizeFunctionLabel(value);
  if (!label) return false;
  return additiveWrapperLabels.some((candidate) => isPlainOrModifiedWrapper(label, candidate));
}

function normalizeFunctionLabel(value: unknown): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').trim();
}

function isPlainOrModifiedWrapper(label: string, candidate: string): boolean {
  if (label === candidate) return true;
  if (!label.endsWith(candidate)) return false;

  const modifier = label.slice(0, -candidate.length);
  return isAllowedWrapperModifier(modifier);
}

function isAllowedWrapperModifier(value: string): boolean {
  let remaining = value;
  while (remaining) {
    const prefix = wrapperModifierPrefixes.find((candidate) => remaining.startsWith(candidate));
    if (!prefix) return false;
    remaining = remaining.slice(prefix.length);
  }
  return true;
}
