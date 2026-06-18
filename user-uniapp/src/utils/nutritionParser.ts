import type { NutritionField, NutritionKey } from '@/types';

export type ParsedNutritionSummary = {
  energyKj?: number;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  sugarG?: number;
  sodiumMg?: number;
  saltMg?: number;
  unitBase?: 'per100g' | 'per100ml' | 'perServing' | 'unknown';
};

export const nutritionDefinitions: Array<{ key: NutritionKey; label: string; aliases: string[]; unitFallback: string }> = [
  { key: 'energy', label: '能量', aliases: ['能量', '热量', '熱量', 'Energy', 'Calories', 'Calorie'], unitFallback: 'kJ' },
  { key: 'protein', label: '蛋白质', aliases: ['蛋白质', '蛋白質', 'Protein'], unitFallback: 'g' },
  { key: 'fat', label: '脂肪', aliases: ['脂肪', 'Fat', 'Total Fat'], unitFallback: 'g' },
  { key: 'saturatedFat', label: '饱和脂肪', aliases: ['饱和脂肪', 'Saturated Fat'], unitFallback: 'g' },
  { key: 'transFat', label: '反式脂肪', aliases: ['反式脂肪', 'Trans Fat'], unitFallback: 'g' },
  { key: 'carbohydrate', label: '碳水化合物', aliases: ['碳水化合物', '碳水', 'Carbohydrate', 'Total Carbohydrate'], unitFallback: 'g' },
  { key: 'sugar', label: '糖', aliases: ['糖', 'Sugars', 'Sugar'], unitFallback: 'g' },
  { key: 'sodium', label: '钠', aliases: ['钠', '鈉', 'Sodium'], unitFallback: 'mg' },
  { key: 'salt', label: '盐', aliases: ['盐', '鹽', 'Salt'], unitFallback: 'g' },
  { key: 'dietaryFiber', label: '膳食纤维', aliases: ['膳食纤维', 'Dietary Fiber', 'Fibre', 'Fiber'], unitFallback: 'g' },
  { key: 'servingSize', label: '每份', aliases: ['每份', '份量', '食用份量', 'Serving Size', 'per serving'], unitFallback: '' },
  { key: 'perUnit', label: '标示单位', aliases: ['每100g', '每100ml', '每 100g', '每 100ml', 'per 100g', 'per 100ml', 'per serving'], unitFallback: '' },
  { key: 'nrvPercent', label: 'NRV%', aliases: ['NRV', '营养素参考值', 'NRV%'], unitFallback: '%' }
];

export function parseNutritionText(text: string): NutritionField[] {
  const source = String(text || '');
  return nutritionDefinitions.map((definition) => {
    const match = findNutritionMatch(source, definition.aliases, definition.key);
    return {
      key: definition.key,
      label: definition.label,
      value: match.value,
      unit: match.unit || definition.unitFallback,
      nrvPercent: match.nrvPercent,
      sourceText: match.sourceText,
      confidence: match.value ? 0.76 : 0
    };
  });
}

export function parseNutritionSummary(text: string): ParsedNutritionSummary {
  const fields = parseNutritionText(text);
  const energy = getField(fields, 'energy');
  const summary: ParsedNutritionSummary = {
    unitBase: detectUnitBase(text)
  };
  if (energy) {
    const energyValue = Number(energy.value);
    if (normalizeUnit(energy.unit) === 'kcal') {
      summary.energyKcal = energyValue;
      summary.energyKj = Math.round(energyValue * 4.184);
    } else {
      summary.energyKj = energyValue;
      summary.energyKcal = Math.round((energyValue / 4.184) * 10) / 10;
    }
  }
  assignNumber(summary, 'proteinG', getField(fields, 'protein'));
  assignNumber(summary, 'fatG', getField(fields, 'fat'));
  assignNumber(summary, 'carbohydrateG', getField(fields, 'carbohydrate'));
  assignNumber(summary, 'sugarG', getField(fields, 'sugar'));
  const sodium = getField(fields, 'sodium');
  if (sodium) summary.sodiumMg = normalizeUnit(sodium.unit) === 'g' ? Number(sodium.value) * 1000 : Number(sodium.value);
  const salt = getField(fields, 'salt');
  if (salt) summary.saltMg = normalizeUnit(salt.unit) === 'mg' ? Number(salt.value) : Number(salt.value) * 1000;
  return summary;
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

function findNutritionMatch(text: string, aliases: string[], key: NutritionKey) {
  for (const alias of [...aliases].sort((left, right) => right.length - left.length)) {
    const unitMatch = findUnitMarker(text, alias);
    if (unitMatch) return unitMatch;
    const pattern = new RegExp(`${escapeRegExp(alias)}[^\\d]{0,18}(\\d+(?:\\.\\d+)?)\\s*(kJ|kj|KJ|kcal|KCAL|千焦|千卡|大卡|g|mg|克|毫克|%)?[^\\d%]{0,12}(\\d+(?:\\.\\d+)?\\s*%)?`, 'i');
    const match = text.match(pattern);
    if (!match) continue;
    const unit = normalizeUnit(match[2]) || defaultUnitForKey(key);
    return {
      value: match[1] || '',
      unit,
      sourceText: match[0],
      nrvPercent: match[3] || ''
    };
  }
  return { value: '', unit: '', sourceText: '', nrvPercent: '' };
}

function findUnitMarker(text: string, alias: string) {
  const markers = [
    { pattern: /每\s*100\s*g|每\s*100\s*克|per\s*100\s*g/i, value: '每100g' },
    { pattern: /每\s*100\s*ml|每\s*100\s*毫升|per\s*100\s*ml/i, value: '每100ml' },
    { pattern: /每份|per\s*serving/i, value: '每份' }
  ];
  if (!/每100g|每100ml|每 100g|每 100ml|per 100g|per 100ml|per serving|每份/i.test(alias)) return undefined;
  const marker = markers.find((item) => item.pattern.test(text));
  if (!marker) return undefined;
  return { value: marker.value, unit: '', sourceText: marker.value, nrvPercent: '' };
}

function detectUnitBase(text: string): ParsedNutritionSummary['unitBase'] {
  if (/每\s*100\s*g|每\s*100\s*克|per\s*100\s*g/i.test(text)) return 'per100g';
  if (/每\s*100\s*ml|每\s*100\s*毫升|per\s*100\s*ml/i.test(text)) return 'per100ml';
  if (/每份|per\s*serving/i.test(text)) return 'perServing';
  return 'unknown';
}

function getField(fields: NutritionField[], key: NutritionKey): NutritionField | undefined {
  const field = fields.find((item) => item.key === key && item.value);
  if (!field || !Number.isFinite(Number(field.value))) return undefined;
  return field;
}

function assignNumber(summary: ParsedNutritionSummary, key: keyof ParsedNutritionSummary, field: NutritionField | undefined) {
  if (!field) return;
  (summary as Record<string, unknown>)[key] = Number(field.value);
}

function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  const lower = unit.toLowerCase();
  if (unit === '克') return 'g';
  if (unit === '毫克') return 'mg';
  if (unit === '千焦') return 'kJ';
  if (unit === '千卡' || unit === '大卡') return 'kcal';
  if (lower === 'kj') return 'kJ';
  return lower;
}

function defaultUnitForKey(key: NutritionKey): string {
  if (key === 'energy') return 'kJ';
  if (key === 'sodium') return 'mg';
  return 'g';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
