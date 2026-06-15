import type { NutritionField, NutritionKey } from '@/types';

export const nutritionDefinitions: Array<{ key: NutritionKey; label: string; aliases: string[]; unitFallback: string }> = [
  { key: 'energy', label: '能量', aliases: ['能量', '热量'], unitFallback: 'kJ' },
  { key: 'protein', label: '蛋白质', aliases: ['蛋白质'], unitFallback: 'g' },
  { key: 'fat', label: '脂肪', aliases: ['脂肪'], unitFallback: 'g' },
  { key: 'saturatedFat', label: '饱和脂肪', aliases: ['饱和脂肪'], unitFallback: 'g' },
  { key: 'transFat', label: '反式脂肪', aliases: ['反式脂肪'], unitFallback: 'g' },
  { key: 'carbohydrate', label: '碳水化合物', aliases: ['碳水化合物', '碳水'], unitFallback: 'g' },
  { key: 'sugar', label: '糖', aliases: ['糖'], unitFallback: 'g' },
  { key: 'sodium', label: '钠', aliases: ['钠'], unitFallback: 'mg' },
  { key: 'dietaryFiber', label: '膳食纤维', aliases: ['膳食纤维'], unitFallback: 'g' },
  { key: 'servingSize', label: '每份', aliases: ['每份', '份量', '食用份量'], unitFallback: '' },
  { key: 'perUnit', label: '标示单位', aliases: ['每100g', '每100ml', '每份'], unitFallback: '' },
  { key: 'nrvPercent', label: 'NRV%', aliases: ['NRV', '营养素参考值'], unitFallback: '%' }
];

export function parseNutritionText(text: string): NutritionField[] {
  const source = String(text || '');
  return nutritionDefinitions.map((definition) => {
    const match = findNutritionMatch(source, definition.aliases);
    return {
      key: definition.key,
      label: definition.label,
      value: match.value,
      unit: match.unit || definition.unitFallback,
      nrvPercent: match.nrvPercent,
      sourceText: match.sourceText,
      confidence: match.value ? 0.72 : 0
    };
  });
}

export function getEditableNutritionFields(fields: NutritionField[]): NutritionField[] {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  return nutritionDefinitions.map((definition) => byKey.get(definition.key) || {
    key: definition.key,
    label: definition.label,
    value: '',
    unit: definition.unitFallback,
    confidence: 0
  });
}

function findNutritionMatch(text: string, aliases: string[]) {
  for (const alias of aliases) {
    if (alias === '每100g' || alias === '每100ml') {
      if (text.includes(alias)) return { value: alias, unit: '', sourceText: alias, nrvPercent: '' };
      continue;
    }
    const pattern = new RegExp(`${escapeRegExp(alias)}[^\\d]{0,8}(\\d+(?:\\.\\d+)?)\\s*(kJ|kj|KJ|kcal|g|mg|克|毫克|%)?[^\\d%]{0,8}(\\d+(?:\\.\\d+)?\\s*%)?`);
    const match = text.match(pattern);
    if (match) {
      return {
        value: match[1] || '',
        unit: normalizeUnit(match[2]),
        sourceText: match[0],
        nrvPercent: match[3] || ''
      };
    }
  }
  return { value: '', unit: '', sourceText: '', nrvPercent: '' };
}

function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  if (unit === '克') return 'g';
  if (unit === '毫克') return 'mg';
  return unit;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
