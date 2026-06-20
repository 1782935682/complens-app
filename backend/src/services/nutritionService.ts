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
  const text = normalizeSourceText(input.text || '');
  const index = buildNutritionIndex(text);
  const warnings: string[] = [];
  const fields = nutritionDefinitions.map((definition) => {
    const explicit = getExplicitField(definition.key, input);
    const match = explicit || findNutritionMatch(text, definition, index);
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

type NutritionMatch = {
  value: string;
  unit: string;
  sourceText: string;
  nrvPercent: string;
};

type NutritionToken = {
  key: NutritionKey;
  alias: string;
  index: number;
  end: number;
};

function findNutritionMatch(text: string, definition: typeof nutritionDefinitions[number], index: NutritionToken[]): NutritionMatch {
  const unitMatch = findUnitMarker(text, definition.aliases);
  if (unitMatch) return unitMatch;

  const token = index.find((item) => item.key === definition.key);
  if (token) {
    const nextToken = index.find((item) => item.index >= token.end);
    const chunk = text.slice(token.end, nextToken?.index ?? text.length);
    const match = findValueInChunk(chunk, definition.key);
    if (match) {
      return {
        value: match.value,
        unit: match.unit || definition.unitFallback,
        sourceText: normalizeSourceText(`${token.alias}${chunk.slice(0, match.end)}`),
        nrvPercent: findNrvPercent(chunk.slice(match.end))
      };
    }
  }

  if (definition.key === 'energy') {
    const looseEnergy = findLooseEnergyValue(text);
    if (looseEnergy) return looseEnergy;
  }

  return { value: '', unit: '', sourceText: '', nrvPercent: '' };
}

function buildNutritionIndex(text: string): NutritionToken[] {
  const candidates = nutritionDefinitions
    .filter((definition) => !['perUnit', 'servingSize', 'nrvPercent'].includes(definition.key))
    .flatMap((definition) => definition.aliases.map((alias) => {
      const tokens: NutritionToken[] = [];
      const pattern = new RegExp(escapeRegExp(alias), 'ig');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        tokens.push({
          key: definition.key,
          alias: match[0],
          index: match.index,
          end: match.index + match[0].length
        });
      }
      return tokens;
    }).flat())
    .sort((left, right) => left.index === right.index ? right.alias.length - left.alias.length : left.index - right.index);

  const accepted: NutritionToken[] = [];
  let occupiedEnd = -1;
  for (const candidate of candidates) {
    if (candidate.index < occupiedEnd) continue;
    accepted.push(candidate);
    occupiedEnd = candidate.end;
  }
  return accepted;
}

function findUnitMarker(text: string, aliases: string[]): NutritionMatch | undefined {
  const marker = [
    { pattern: /每\s*100\s*g|每\s*100\s*克/i, value: '每100g' },
    { pattern: /每\s*100\s*ml|每\s*100\s*毫升/i, value: '每100ml' },
    { pattern: /每份/i, value: '每份' }
  ].find((item) => item.pattern.test(text));
  if (!aliases.some((alias) => ['每100g', '每100ml', '每100克', '每100毫升', '每份'].includes(alias)) || !marker) return undefined;
  return { value: marker.value, unit: '', sourceText: marker.value, nrvPercent: '' };
}

function findValueInChunk(chunk: string, key: NutritionKey): { value: string; unit: string; end: number } | null {
  const match = chunk.slice(0, 80).match(/(-?\d+(?:\.\d+)?)\s*(kJ|kj|KJ|kcal|KCAL|千焦|千卡|大卡|g|mg|克|毫克|%)?/i);
  if (!match || match.index === undefined) return null;
  const unit = normalizeUnit(match[2]) || defaultUnitForKey(key);
  if (!isUnitAllowedForKey(key, unit)) return null;
  if (!isPlausibleNutritionValue(key, Number(match[1]), unit)) return null;
  return {
    value: match[1] || '',
    unit,
    end: match.index + match[0].length
  };
}

function findLooseEnergyValue(text: string): NutritionMatch | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kJ|kj|KJ|kcal|KCAL|千焦|千卡|大卡)/i);
  if (!match) return null;
  return {
    value: match[1] || '',
    unit: normalizeUnit(match[2]) || 'kJ',
    sourceText: match[0],
    nrvPercent: ''
  };
}

function findNrvPercent(chunk: string): string {
  const match = chunk.slice(0, 24).match(/(\d+(?:\.\d+)?\s*%)/);
  return match?.[1] || '';
}

function normalizeExplicit(value?: string) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  if (unit === '克') return 'g';
  if (unit === '毫克') return 'mg';
  if (unit === '千焦') return 'kJ';
  if (unit === '千卡' || unit === '大卡') return 'kcal';
  if (unit.toLowerCase() === 'kj') return 'kJ';
  if (unit.toLowerCase() === 'kcal') return 'kcal';
  return unit;
}

function defaultUnitForKey(key: NutritionKey): string {
  if (key === 'energy') return 'kJ';
  if (key === 'sodium') return 'mg';
  if (key === 'nrvPercent') return '%';
  return 'g';
}

function isUnitAllowedForKey(key: NutritionKey, unit: string): boolean {
  if (key === 'energy') return unit === 'kJ' || unit === 'kcal';
  if (key === 'sodium') return unit === 'mg' || unit === 'g';
  if (key === 'perUnit' || key === 'servingSize') return true;
  if (key === 'nrvPercent') return unit === '%';
  return unit === 'g';
}

function isPlausibleNutritionValue(key: NutritionKey, value: number, unit: string): boolean {
  if (!Number.isFinite(value) || value < 0) return false;
  if (key === 'energy') return unit === 'kcal' ? value <= 1200 : value <= 5000;
  if (key === 'sodium') return unit === 'g' ? value <= 20 : value <= 10000;
  if (key === 'protein') return value <= 100;
  if (key === 'fat' || key === 'saturatedFat' || key === 'transFat') return value <= 100;
  if (key === 'carbohydrate' || key === 'sugar' || key === 'dietaryFiber') return value <= 100;
  return true;
}

function normalizeSourceText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
