import type { NormalizedOcrResult } from '@/utils/ocrAdapter';
import { parseNutritionText, type ParsedNutritionSummary, parseNutritionSummary } from '@/utils/nutritionParser';
import type { NutritionField } from '@/types';
import type { OcrSectionClassification } from './ocrSectionClassifier';
import { classifyOcrSections } from './ocrSectionClassifier';

export interface NutritionExtractionResult {
  nutritionText: string;
  fields: NutritionField[];
  summary: ParsedNutritionSummary;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  uncertainText: string[];
}

export function extractNutrition(input: OcrSectionClassification | NormalizedOcrResult | string): NutritionExtractionResult {
  const classification = isClassification(input) ? input : classifyOcrSections(input);
  let nutritionText = rebuildNutritionText(classification.nutritionText);
  let fields = parseNutritionText(nutritionText);
  let populated = countCoreNutritionFields(fields);
  const rawCandidate = rebuildNutritionText(classification.layout.rawText);
  const rawFields = parseNutritionText(rawCandidate);
  const rawPopulated = countCoreNutritionFields(rawFields);
  if (shouldUseRawNutritionFallback({
    currentText: nutritionText,
    currentPopulated: populated,
    rawText: classification.layout.rawText,
    rawCandidate,
    rawPopulated
  })) {
    nutritionText = rawCandidate;
    fields = rawFields;
    populated = rawPopulated;
  }
  const nutrientNameCount = countNutritionNameSignals(nutritionText);
  const hasExplicitNutritionTable = nutritionHeaderPattern.test(nutritionText)
    || nutritionHeaderPattern.test(classification.layout.rawText);
  const effectiveNutritionText = populated >= 3
    ? canonicalizeNutritionText(nutritionText, fields)
    : nutrientNameCount >= 3
      ? nutritionText
      : hasExplicitNutritionTable && (nutrientNameCount >= 2 || populated >= 1)
        ? nutritionText
      : '';
  const reasons = [...classification.reasons];
  if (!effectiveNutritionText) reasons.push('missing_or_uncertain_nutrition');
  if (nutritionText && populated < 3) reasons.push(
    nutrientNameCount >= 3 || hasExplicitNutritionTable
      ? 'nutrition_table_detected_values_need_confirmation'
      : 'sparse_nutrition_fields'
  );
  return {
    nutritionText: effectiveNutritionText,
    fields,
    summary: parseNutritionSummary(nutritionText),
    confidence: populated >= 3
      ? classification.confidence
      : nutrientNameCount >= 3 || populated >= 1 || hasExplicitNutritionTable
        ? 'medium'
        : 'low',
    reasons,
    uncertainText: classification.uncertainText
  };
}

function shouldUseRawNutritionFallback(input: {
  currentText: string;
  currentPopulated: number;
  rawText: string;
  rawCandidate: string;
  rawPopulated: number;
}): boolean {
  if (!input.rawCandidate || input.rawPopulated <= input.currentPopulated) return false;
  if (input.rawPopulated >= 4) return true;
  const rawNameCount = countNutritionNameSignals(input.rawCandidate);
  const hasRawHeader = nutritionHeaderPattern.test(input.rawText);
  if (hasRawHeader && input.rawPopulated >= 2) return true;
  if (!input.currentText && rawNameCount >= 4 && input.rawPopulated >= 2) return true;
  return false;
}

export function rebuildNutritionText(value: string): string {
  const lines = splitLines(value);
  const kept: string[] = [];
  let pendingName = '';
  const usedIndexes = new Set<number>();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (nutritionLinePattern.test(line) || nutritionHeaderPattern.test(line)) {
      kept.push(line);
      pendingName = nutritionNamePattern.test(line) && !nutritionValuePattern.test(line) ? line : '';
      continue;
    }
    if (nutritionNamePattern.test(line)) {
      const paired = pairNutritionValue(lines, index);
      kept.push(paired || line);
      if (paired) {
        usedIndexes.add(index + 1);
        usedIndexes.add(index + 2);
      }
      pendingName = paired ? '' : line;
      continue;
    }
    if (usedIndexes.has(index)) continue;
    if (pendingName && nutritionValuePattern.test(line)) {
      kept[kept.length - 1] = `${pendingName} ${line}`.trim();
      pendingName = '';
      continue;
    }
    if (nutritionValuePattern.test(line) && kept.length && nutritionHeaderPattern.test(kept[kept.length - 1])) {
      kept.push(line);
    }
  }
  return kept.join('\n').trim();
}

function pairNutritionValue(lines: string[], index: number): string {
  const name = lines[index];
  for (let offset = 1; offset <= 3; offset += 1) {
    const candidate = lines[index + offset] || '';
    if (nutritionValuePattern.test(candidate) && !nutritionNamePattern.test(candidate)) {
      return `${name} ${candidate}`.trim();
    }
  }
  return '';
}

function canonicalizeNutritionText(text: string, fields: NutritionField[]): string {
  const canonicalLines = fields
    .filter((field) => field.value && !['perUnit', 'nrvPercent', 'servingSize'].includes(field.key))
    .map((field) => `${field.label} ${field.value}${field.unit || ''}${field.nrvPercent ? ` ${field.nrvPercent}` : ''}`);
  return [...splitLines(text), ...canonicalLines].join('\n').trim();
}

function countCoreNutritionFields(fields: NutritionField[]): number {
  return fields.filter((field) => field.value && !['perUnit', 'nrvPercent', 'servingSize'].includes(field.key)).length;
}

function countNutritionNameSignals(text: string): number {
  const compact = String(text || '').normalize('NFKC').toLowerCase();
  const hits = [
    /能量|热量|energy|calories|energie|energa|enegia|enerqi|brennwert|energia/,
    /蛋白质|protein|proteines|proteínas|proteinas|proteine|eiwei[ßs]|eiweis/,
    /脂肪|fat|fett|fedt|rasva|riebalai|grasas|grass|grassi|lipidos|l[ií]pidos|tiuszc|tluszc|tuky|masti|grasimi/,
    /碳水化合物|碳水|carbohydrat|carbohydrate|kohlenhydrate|glucides|hidratos|carboidrati|cdcd|carb/,
    /糖|sugar|sugars|zucker|sucres|az[uú]cares|zuccheri|a[cç]ucares/,
    /钠|sodium|盐|salt|salz|sale|sal\b|salk|solsu|sel|sare/,
    /膳食纤维|fiber|fibre|fibra|rbre/
  ].filter((pattern) => pattern.test(compact)).length;
  return hits;
}

function splitLines(text: string): string[] {
  return String(text || '')
    .normalize('NFKC')
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isClassification(input: unknown): input is OcrSectionClassification {
  return Boolean(input && typeof input === 'object' && 'nutritionText' in input && 'sections' in input);
}

const nutritionHeaderPattern = /营养成分表|营养标签|项目|每\s*100|NRV|营养素参考值|(?:^|\n)\s*nutrition\s*(?:$|\n)|nutrition\s*(?:facts|information)|nutritional\s*information|nutritioneacts|nutrits|typical\s*val(?:ues|ies)|supplement\s*facts|per\s*100|pour\s*100|pro\s*100|je\s*100|pe\s*100|serving\s*size|per\s*serving|valeurs?\s*nutritionnelles?|[il]?nformation\s*nutritionnelles?|nutritionnelles?|declaration\s+nutritionnelle|dichiarazione\s+nutrizionale|informaci[oó]n\s*nutricional|informacionnutricional|valori\s+nutrizionali|valores?\s+nutricionais|n[äa]hrwerte|naehrwerte|nahrwerte|nahrwertdeklaration/i;
const nutritionNamePattern = /能量|热量|蛋白质|脂肪|碳水化合物|碳水|糖|钠|膳食纤维|盐|energy|lnergy|calories|protein|fat|fat-total|total\s*fat|carbohydrat(?:e|es)?|cabohydrat|glycaemic\s*carbohydrate|sugars?|sodium|sodiun|fiber|fibre|salt|energie|energa|enegia|enerqi|brennwert|fett|kohlenhydrate|konlenhydrate|rohlenhydrate|zucker|eiwei[ßs]|eiweis|salz|safz|mati[eè]res?\s*grasses?|matieres?\s*grasses?|glucides?|sucres?|dont\s*sucres?|dontsucres?|prot[eé]ines?|proteines?|protines?|fibres?|grasas?|grosas|grass|hidratos?\s+de\s+carbono|hidralos\s+de\s+carbono|dratos\s+de\s+carbono|az[uú]cares?|fibra|prote[ií]nas?|energia|valeur\s*energeti\w+|valeurenergeti\w+|grassi|carboidrati|zuccheri|proteine|sale|lipidos?|l[ií]pidos?|tiuszc|tluszc|tuky|masti|grasimi|cdcd\w*|salk|solsu|sare|sel\b|a[cç]ucares?|fed?t|rasva|riebalai|kullrydrat/i;
const nutritionValuePattern = /\d+(?:[\.,]\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|千焦|千卡|%)?/i;
const nutritionLinePattern = new RegExp(`${nutritionNamePattern.source}[\\s\\S]{0,48}${nutritionValuePattern.source}`, 'i');
