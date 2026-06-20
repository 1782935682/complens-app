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
  { key: 'saturatedFat', label: '饱和脂肪', aliases: ['饱和脂肪酸', '饱和脂肪', 'Saturated Fat'], unitFallback: 'g' },
  { key: 'transFat', label: '反式脂肪', aliases: ['反式脂肪酸', '反式脂肪', 'Trans Fat'], unitFallback: 'g' },
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
  const index = buildNutritionIndex(source);
  return nutritionDefinitions.map((definition) => {
    const match = findNutritionMatch(source, definition, index);
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
        unit: match.unit || defaultUnitForKey(definition.key),
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
  const source = normalizeSourceText(text);
  const candidates = nutritionDefinitions
    .filter((definition) => !['perUnit', 'servingSize', 'nrvPercent'].includes(definition.key))
    .flatMap((definition) => definition.aliases.map((alias) => {
      const tokens: NutritionToken[] = [];
      const pattern = new RegExp(escapeRegExp(alias), 'ig');
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
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
  const markers = [
    { pattern: /每\s*100\s*g|每\s*100\s*克|per\s*100\s*g/i, value: '每100g' },
    { pattern: /每\s*100\s*ml|每\s*100\s*毫升|per\s*100\s*ml/i, value: '每100ml' },
    { pattern: /每份|per\s*serving/i, value: '每份' }
  ];
  if (!aliases.some((alias) => /每100g|每100ml|每 100g|每 100ml|per 100g|per 100ml|per serving|每份/i.test(alias))) return undefined;
  const marker = markers.find((item) => item.pattern.test(text));
  if (!marker) return undefined;
  return { value: marker.value, unit: '', sourceText: marker.value, nrvPercent: '' };
}

function findValueInChunk(chunk: string, key: NutritionKey): { value: string; unit: string; end: number } | null {
  const trimmed = chunk.slice(0, 80);
  const match = trimmed.match(/(-?\d+(?:\.\d+)?)\s*(kJ|kj|KJ|kcal|KCAL|千焦|千卡|大卡|g|mg|克|毫克|%)?/i);
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
  const match = normalizeSourceText(text).match(/(\d+(?:\.\d+)?)\s*(kJ|kj|KJ|kcal|KCAL|千焦|千卡|大卡)/i);
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
  if (key === 'salt') return value <= 100;
  return true;
}

function normalizeSourceText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function defaultUnitForKey(key: NutritionKey): string {
  if (key === 'energy') return 'kJ';
  if (key === 'sodium') return 'mg';
  return 'g';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
