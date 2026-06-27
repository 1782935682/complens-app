import { extractLabelText } from './labelTextExtractor';
import { normalizeOcrResult } from './ocrAdapter';

export type ManualInputParts = {
  productNameText?: string;
  foodTypeText: string;
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  frontClaimsText: string;
  productionDateText: string;
  unconfirmedText: string[];
};

export function normalizeManualInputParts(input: ManualInputParts): ManualInputParts {
  const base = trimParts(input);
  const combined = [
    base.productNameText,
    base.foodTypeText,
    base.ingredientText,
    base.nutritionText,
    base.allergenText,
    base.frontClaimsText,
    base.productionDateText
  ].filter(Boolean).join('\n');
  if (!combined) return base;

  const extraction = extractLabelText(normalizeOcrResult({
    text: combined,
    rawText: combined,
    mode: 'manual',
    provider: 'manual'
  }, 'manual'));

  const nutritionFromIngredient = extractNutritionSection(base.ingredientText);
  const strippedIngredient = stripManualNonIngredientText(base.ingredientText);
  const normalizedIngredient = preferLongerSection(extraction.ingredientText, strippedIngredient || base.ingredientText);
  const normalizedNutrition = mergeSections([
    base.nutritionText,
    extraction.nutritionText,
    nutritionFromIngredient
  ]);
  const normalizedAllergen = mergeSections([base.allergenText, extraction.allergenText]);
  const normalizedFrontClaims = mergeSections([base.frontClaimsText, extraction.frontClaimsText]);
  const normalizedProductionDate = mergeSections([base.productionDateText, extraction.productionDateText]);
  const productNameText = base.productNameText || extraction.productNameText || inferProductName(combined);
  const unconfirmedText = [
    ...base.unconfirmedText,
    ...extraction.ignoredText,
    nutritionFromIngredient && !base.nutritionText ? '已从手动粘贴内容中拆出营养成分表。' : '',
    productNameText && !base.productNameText ? `已识别商品名：${productNameText}` : ''
  ].filter(Boolean);

  return {
    productNameText,
    foodTypeText: base.foodTypeText || extraction.foodTypeText,
    ingredientText: normalizedIngredient,
    nutritionText: normalizedNutrition,
    allergenText: normalizedAllergen,
    frontClaimsText: normalizedFrontClaims,
    productionDateText: normalizedProductionDate,
    unconfirmedText: uniqueStrings(unconfirmedText)
  };
}

function trimParts(input: ManualInputParts): ManualInputParts {
  return {
    productNameText: cleanText(input.productNameText || ''),
    foodTypeText: cleanText(input.foodTypeText),
    ingredientText: cleanText(input.ingredientText),
    nutritionText: cleanText(input.nutritionText),
    allergenText: cleanText(input.allergenText),
    frontClaimsText: cleanText(input.frontClaimsText),
    productionDateText: cleanText(input.productionDateText),
    unconfirmedText: uniqueStrings(input.unconfirmedText || [])
  };
}

function cleanText(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\r\n/g, '\n').trim();
}

function stripManualNonIngredientText(value: string): string {
  const source = cleanText(value);
  if (!source) return '';
  const beforeNutrition = cutBeforePattern(source, /(?:营养成分表|营养成分|營養成分表|營養成分|NRV|每\s*100\s*(?:g|克|ml|毫升)|nutrition\s*(?:facts|information))/i);
  const beforeAllergen = cutBeforePattern(beforeNutrition, /(?:致敏原提示|过敏原提示|致敏原|过敏原|allergen)/i);
  return beforeAllergen
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !isProductNameLine(line) && !isNutritionLine(line))
    .join('\n')
    .replace(/(?:产品名称|商品名称|品名)\s*[:：]?\s*[^\n，,。；;]+/g, '')
    .trim();
}

function extractNutritionSection(value: string): string {
  const source = cleanText(value);
  if (!source) return '';
  const heading = source.search(/(?:营养成分表|营养成分|營養成分表|營養成分|nutrition\s*(?:facts|information))/i);
  if (heading >= 0) return source.slice(heading).trim();
  const lines = source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(isNutritionLine);
  return lines.join('\n');
}

function cutBeforePattern(value: string, pattern: RegExp): string {
  const index = value.search(pattern);
  return index > 0 ? value.slice(0, index) : value;
}

function isNutritionLine(value: string): boolean {
  const line = value.replace(/\s+/g, ' ').trim();
  if (!line) return false;
  if (/营养成分|營養成分|NRV|每\s*100|nutrition\s*(?:facts|information)/i.test(line)) return true;
  const hasNutritionKey = /能量|热量|蛋白质|脂肪|碳水化合物|碳水|(?:^|[^白砂])糖|钠|鈉|盐|sodium|sugars?|carbohydrate|protein|fat/i.test(line);
  const hasNumberAndUnit = /\d+(?:[.,]\d+)?\s*(?:kJ|kj|kcal|g|mg|克|毫克|千焦|千卡|%)/i.test(line);
  return hasNutritionKey && hasNumberAndUnit;
}

function isProductNameLine(value: string): boolean {
  return /^(?:产品名称|商品名称|品名|商品名)\s*[:：]?/u.test(value.trim());
}

function inferProductName(value: string): string {
  const source = cleanText(value);
  const explicit = source.match(/(?:产品名称|商品名称|品名|商品名)\s*[:：]?\s*([^\n，,。；;]+)/u)?.[1];
  if (explicit) return normalizeProductNameCandidate(explicit);
  const lines = source
    .split(/\n+/)
    .map((line) => normalizeProductNameCandidate(line))
    .filter(Boolean);
  for (const line of lines) {
    if (/配\s*料|营养成分|致敏原|过敏原|生产日期|保质期|净含量|条码|二维码/i.test(line)) break;
    if (isLikelyProductName(line)) return line;
  }
  return '';
}

function normalizeProductNameCandidate(value: string): string {
  return String(value || '')
    .replace(/^(?:产品名称|商品名称|品名|商品名)\s*[:：]?\s*/u, '')
    .replace(/\s+/g, '')
    .trim()
    .slice(0, 32);
}

function isLikelyProductName(value: string): boolean {
  if (value.length < 2 || value.length > 24) return false;
  if (/[，,、；;：:]/.test(value)) return false;
  if (isNutritionLine(value)) return false;
  if (/^(?:配料表|营养成分表|致敏原提示|过敏原提示|每100|NRV)/i.test(value)) return false;
  if (/\d+(?:[.,]\d+)?\s*(?:g|mg|ml|克|毫克|毫升|%)/i.test(value)) return false;
  return true;
}

function preferLongerSection(primary: string, fallback: string): string {
  const first = cleanText(primary);
  const second = cleanText(fallback);
  if (!first) return second;
  if (!second) return first;
  return first.length >= Math.min(second.length, 12) ? first : second;
}

function mergeSections(values: string[]): string {
  return uniqueStrings(values)
    .filter(Boolean)
    .join('\n');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}
