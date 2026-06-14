const dataStatusDefinitions = [
  { status: 'verified_regulation', label: '官方标准已验证', colorVar: '--color-risk-low' },
  { status: 'verified_jecfa', label: '安全评价已匹配（非中国法规范围）', colorVar: '--color-watch' },
  { status: 'pending_review', label: '待复核来源数据', colorVar: '--color-unverified' },
  { status: 'mapped_candidate', label: '疑似匹配，待确认', colorVar: '--color-risk-medium' },
  { status: 'common_ingredient', label: '普通配料', colorVar: '--color-risk-low' },
  { status: 'unverified', label: '未验证', colorVar: '--color-unverified' },
  { status: 'unknown_from_ocr', label: '暂未收录', colorVar: '--color-unknown' }
];

export const dataStatusOrder = dataStatusDefinitions.map((item) => item.status);
export const dataStatusLabels = Object.fromEntries(dataStatusDefinitions.map((item) => [item.status, item.label]));
export const dataStatusColorVars = Object.fromEntries(dataStatusDefinitions.map((item) => [item.status, item.colorVar]));

export function isKnownDataStatus(status) {
  return Object.hasOwn(dataStatusLabels, status);
}

export function normalizeDataStatus(status, fallback = 'unverified') {
  const value = String(status || '').trim();
  if (isKnownDataStatus(value)) return value;
  return isKnownDataStatus(fallback) ? fallback : 'unverified';
}

export function dataStatusLabel(status, options = {}) {
  const normalized = normalizeDataStatus(status, options.fallback || 'unverified');
  const label = dataStatusLabels[normalized] || dataStatusLabels.unverified;
  return options.includeCode ? `${normalized} / ${label}` : label;
}

export function dataStatusColorVar(status) {
  return dataStatusColorVars[normalizeDataStatus(status)] || dataStatusColorVars.unverified;
}

export function dataStatusBadgeClass(status) {
  return `data-badge--${normalizeDataStatus(status).replace(/_/g, '-')}`;
}
