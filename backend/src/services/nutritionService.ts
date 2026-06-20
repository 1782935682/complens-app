export type NutritionKey = 'energy' | 'protein' | 'fat' | 'saturatedFat' | 'transFat' | 'carbohydrate' | 'sugar' | 'sodium' | 'dietaryFiber' | 'servingSize' | 'perUnit' | 'nrvPercent';

export type NutritionField = {
  key: NutritionKey;
  label: string;
  value: string;
  unit: string;
  nrvPercent: string;
  sourceText: string;
  confidence: number;
};

export type NutritionParseInput = {
  text: string;
  servingSize?: string;
  perUnit?: string;
};

export type NutritionParseResult = {
  nutrition: NutritionField[];
  warnings: string[];
};

export type NutritionService = {
  parseNutritionText(input: NutritionParseInput): NutritionParseResult;
};

const nutritionDefinitions: Array<{ key: NutritionKey; label: string; aliases: string[]; unitFallback: string }> = [
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
  { key: 'perUnit', label: '标示单位', aliases: ['每100g', '每100ml', '每份', '每100克', '每100毫升'], unitFallback: '' },
  { key: 'nrvPercent', label: 'NRV%', aliases: ['NRV', '营养素参考值'], unitFallback: '%' }
];

export function createNutritionService(): NutritionService {
  return {
    parseNutritionText
  };
}

export function parseNutritionText(input: NutritionParseInput): NutritionParseResult {
  const text = String(input.text || '').replace(/\s+/g, '');
  const warnings: string[] = [];
  const fields = nutritionDefinitions.map((definition) => {
    const explicit = getExplicitField(definition.key, input);
    const match = explicit || findNutritionMatch(text, definition.aliases);
    if (explicit) {
      warnings.push(`字段"${definition.label}"使用手动修订值。`);
    }

    if (!match.value && !match.unit && definition.key !== 'nrvPercent') {
      warnings.push(`未识别到 "${definition.label}"，该字段暂未进入结果。`);
    }
    return {
      key: definition.key,
      label: definition.label,
      value: match.value,
      unit: match.unit || definition.unitFallback,
      nrvPercent: match.nrvPercent,
      sourceText: match.sourceText,
      confidence: match.value ? (explicit ? 0.98 : 0.72) : 0
    };
  });

  return { nutrition: fields, warnings };
}

function getExplicitField(field: NutritionKey, input: NutritionParseInput) {
  if (field === 'servingSize') {
    const value = normalizeExplicit(input.servingSize);
    if (value) {
      return {
        value,
        unit: '',
        sourceText: value,
        nrvPercent: ''
      };
    }
  }

  if (field === 'perUnit') {
    const value = normalizeExplicit(input.perUnit);
    if (value) {
      return {
        value,
        unit: '',
        sourceText: value,
        nrvPercent: ''
      };
    }
  }

  return null;
}

function findNutritionMatch(text: string, aliases: string[]) {
  for (const alias of aliases) {
    if (alias === '每100g' || alias === '每100ml' || alias === '每100克' || alias === '每100毫升') {
      if (text.includes(alias)) return { value: alias, unit: '', sourceText: alias, nrvPercent: '' };
      continue;
    }

    const pattern = new RegExp(
      `${escapeRegExp(alias)}[^\\d]{0,8}(\\d+(?:\\.\\d+)?)\\s*(kJ|kj|KJ|kcal|g|mg|克|毫克|%)?[^\\d%]{0,8}(\\d+(?:\\.\\d+)?\\s*%)?`
    );
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

function normalizeExplicit(value?: string) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
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
