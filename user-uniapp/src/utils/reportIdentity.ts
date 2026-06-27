import type { LabelReport } from '@/types';

export function isGenericProductName(value: string): boolean {
  const name = normalizeProductName(value);
  return !name || /^(未命名食品|未识别商品|未知食品|这款食品|食品标签|包装正面|购买建议)$/u.test(name);
}

export function isSameProductForCompare(left: LabelReport | undefined, right: LabelReport | undefined): boolean {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;

  const leftCode = productCode(left);
  const rightCode = productCode(right);
  if (leftCode && rightCode && leftCode === rightCode) return true;

  const leftName = comparableProductName(left);
  const rightName = comparableProductName(right);
  if (leftName && rightName && leftName === rightName) return true;

  const leftIngredient = normalizedIngredientSignature(left);
  const rightIngredient = normalizedIngredientSignature(right);
  if (leftIngredient && rightIngredient && leftIngredient === rightIngredient && sameNutritionSignature(left, right)) {
    return true;
  }

  return false;
}

export function orderReportsForCompare(left: LabelReport, right: LabelReport): [LabelReport, LabelReport] {
  if (left.createdAt && right.createdAt && left.createdAt > right.createdAt) return [right, left];
  return [left, right];
}

export function reportDisplayNameForCompare(report: LabelReport | undefined, fallback = '这款食品'): string {
  const name = report?.productName || report?.foodAnalysis?.productName || report?.title || '';
  return name && !isGenericProductName(name) ? name : fallback;
}

export function comparableProductName(report: LabelReport | undefined): string {
  const rawName = report?.productName || report?.foodAnalysis?.productName || report?.title || '';
  const name = normalizeProductName(rawName);
  return isGenericProductName(name) ? '' : name;
}

export function isReportIncompleteForCompare(report: LabelReport | undefined): boolean {
  if (!report) return true;
  return report.purchaseDecision?.recommendation === '信息不足' || report.decision?.level === 'insufficient';
}

function productCode(report: LabelReport): string {
  const source = report.analysisSource;
  return normalizeCode(source?.normalizedCode || source?.recognition?.normalizedCode || source?.qrContent || source?.recognition?.qrContent || '');
}

function normalizedIngredientSignature(report: LabelReport): string {
  const text = [
    report.analysisSource?.ingredientText,
    ...report.ingredientSection.items.map((item) => item.normalizedText || item.ingredientName || item.term || '')
  ].join('');
  const normalized = text
    .normalize('NFKC')
    .replace(/配\s*料\s*表|食品\s*配\s*料|ingredients?/ig, '')
    .replace(/[^\u4e00-\u9fffa-zA-Z0-9]+/g, '')
    .toLowerCase();
  return normalized.length >= 8 ? normalized.slice(0, 120) : '';
}

function sameNutritionSignature(left: LabelReport, right: LabelReport): boolean {
  const keys = ['energy', 'protein', 'fat', 'carbohydrate', 'sugar', 'sodium'];
  let compared = 0;
  let same = 0;
  keys.forEach((key) => {
    const leftValue = nutritionValue(left, key);
    const rightValue = nutritionValue(right, key);
    if (!leftValue || !rightValue) return;
    compared += 1;
    if (leftValue === rightValue) same += 1;
  });
  return compared >= 2 && same >= Math.min(compared, 3);
}

function nutritionValue(report: LabelReport, key: string): string {
  const field = report.nutritionSection.fields.find((item) => item.key === key);
  if (!field?.value) return '';
  return `${String(field.value).replace(/\s+/g, '')}${String(field.unit || '').replace(/\s+/g, '').toLowerCase()}`;
}

function normalizeProductName(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[：:，,。；;]/g, '')
    .trim();
}

function normalizeCode(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').trim().toLowerCase();
}
