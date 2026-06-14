import type { DataStatus } from '@/types';

export const dataStatusLabels: Record<DataStatus, string> = {
  verified_regulation: '官方标准已验证',
  verified_jecfa: '安全评价已匹配（非中国法规范围）',
  pending_review: '待复核来源数据',
  mapped_candidate: '疑似匹配，待确认',
  common_ingredient: '普通配料',
  unverified: '未验证',
  unknown_from_ocr: '暂未收录'
};

export const dataStatusClasses: Record<DataStatus, string> = {
  verified_regulation: 'status--verified',
  verified_jecfa: 'status--info',
  pending_review: 'status--unverified',
  mapped_candidate: 'status--candidate',
  common_ingredient: 'status--verified',
  unverified: 'status--unverified',
  unknown_from_ocr: 'status--unknown'
};

export const dataStatusOrder: DataStatus[] = [
  'verified_regulation',
  'verified_jecfa',
  'common_ingredient',
  'mapped_candidate',
  'pending_review',
  'unverified',
  'unknown_from_ocr'
];

export function normalizeDataStatus(value: unknown, fallback: DataStatus = 'unverified'): DataStatus {
  const status = String(value || '').trim() as DataStatus;
  return dataStatusOrder.includes(status) ? status : fallback;
}

export function dataStatusLabel(value: unknown): string {
  return dataStatusLabels[normalizeDataStatus(value)];
}

export function dataStatusClass(value: unknown): string {
  return dataStatusClasses[normalizeDataStatus(value)];
}
