import type { NormalizedOcrResult } from '@/utils/ocrAdapter';
import type { OcrSectionClassification } from './ocrSectionClassifier';
import { classifyOcrSections } from './ocrSectionClassifier';

export interface IngredientsExtractionResult {
  ingredientsText: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  uncertainText: string[];
}

export function extractIngredients(input: OcrSectionClassification | NormalizedOcrResult | string): IngredientsExtractionResult {
  const classification = isClassification(input) ? input : classifyOcrSections(input);
  const classifiedIngredientsText = cleanIngredientsText(classification.ingredientsText);
  const rawIngredientsText = cleanIngredientsText(rebuildIngredientsTextFromRaw(classification.layout.rawText));
  const ingredientsText = chooseBetterIngredientsText(classifiedIngredientsText, rawIngredientsText);
  const reasons = [...classification.reasons];
  if (!ingredientsText) reasons.push('missing_or_uncertain_ingredients');
  if (ingredientsText && hasOnlyWeakIngredientEvidence(ingredientsText)) reasons.push('weak_ingredient_evidence');
  return {
    ingredientsText,
    confidence: ingredientsText && !hasOnlyWeakIngredientEvidence(ingredientsText) ? classification.confidence : 'low',
    reasons,
    uncertainText: classification.uncertainText
  };
}

function chooseBetterIngredientsText(classifiedText: string, rawText: string): string {
  if (!rawText) return classifiedText;
  if (!classifiedText) return rawText;
  const classifiedCompact = compact(classifiedText);
  const rawCompact = compact(rawText);
  if (rawCompact.length > classifiedCompact.length * 1.25 && hasIngredientAnchorOrTerms(rawText)) return rawText;
  const missingRawLines = splitLines(rawText).filter((line) => {
    const normalizedLine = compact(stripIngredientPrefix(line));
    return normalizedLine.length >= 8 && !classifiedCompact.includes(normalizedLine);
  });
  if (!missingRawLines.length) return classifiedText;
  return cleanIngredientsText([
    classifiedText,
    ...missingRawLines
  ].join('\n'));
}

function rebuildIngredientsTextFromRaw(value: string): string {
  const lines = splitLines(value);
  const startIndex = lines.findIndex((line) => ingredientAnchorPattern.test(line));
  if (startIndex < 0) return '';
  const kept: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > startIndex && ingredientBoundaryPattern.test(line)) break;
    if (index > startIndex && nutritionLinePattern.test(line) && !ingredientContentPattern.test(line)) break;
    kept.push(line);
  }
  return kept.join('\n');
}

function cleanIngredientsText(value: string): string {
  return splitLines(value)
    .map(stripIngredientPrefix)
    .map(stripTrailingIngredientBoundary)
    .filter((line) => line && !blockedIngredientLinePattern.test(line))
    .join('\n')
    .replace(/[，,、;；\s]+$/g, '')
    .trim();
}

function stripIngredientPrefix(value: string): string {
  return value
    .replace(/^\s*(?:[配护]\s*料\s*(?:表|衰)?|表|产品配料|食品配料|原料|statement\s+of\s+ingredients?|ingredients?|ingr[eé]dients?|\[?\s*ngredientes?|ingredientes?|sk[lłt]adniki|sktadniki|slo[zž]en[íiyf]?|成\s*[分份]\s*表?)\s*[:：-]?\s*/i, '')
    .trim();
}

function stripTrailingIngredientBoundary(value: string): string {
  return value
    .replace(/\s*(?:致敏原|过敏原|可能含有|puede\s*contener|puedecontener|trazas|may\s*contain|conservaci[oó]n|conservar|modo\s*de\s*preparaci[oó]n|lote|consumir\s*preferentemente|envasado|najlepiej|spozyc|przed|przechowywac|skladujte|vyrobeno|puvod|生产日期|保质期|贮存|储存|产地|生产商|执行标准|食用方法).*$/i, '')
    .trim();
}

function hasOnlyWeakIngredientEvidence(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  const separatorCount = (compact.match(/[、，,;；]/g) || []).length;
  const commonHits = commonIngredientTerms.filter((term) => compact.includes(term)).length;
  return compact.length < 12 || (separatorCount < 1 && commonHits < 2);
}

function hasIngredientAnchorOrTerms(value: string): boolean {
  const text = value.replace(/\s+/g, '');
  return ingredientAnchorPattern.test(value) || commonIngredientTerms.some((term) => text.includes(term));
}

function compact(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function splitLines(text: string): string[] {
  return String(text || '')
    .normalize('NFKC')
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isClassification(input: unknown): input is OcrSectionClassification {
  return Boolean(input && typeof input === 'object' && 'ingredientsText' in input && 'sections' in input);
}

const ingredientAnchorPattern = /^\s*(?:[配护]\s*料\s*(?:表|衰)?|产品配料|食品配料|原料|statement\s+of\s+ingredients?|ingredients?|ingr[eé]dients?|\[?\s*ngredientes?|ingredientes?|sk[lłt]adniki|sktadniki|slo[zž]en[íiyf]?|成\s*[分份]\s*表?)\s*[:：-]?/i;
const ingredientBoundaryPattern = /营养成分|营养标签|nutrition\s*(?:facts|information)|nutritional\s*information|typical\s*values?|valeurs?\s*nutritionnelles?|n[äa]hrwerte|生产日期|保质期|贮存|储存|产地|生产商|制造商|地址|电话|执行标准|食品生产许可证|食用方法|注意事项|净含量|规格|MFG|EXP|BBE|best\s*before/i;
const nutritionLinePattern = /(?:能量|蛋白质|脂肪|碳水|钠|energy|calories|protein|fat|carbohydrate|sodium)[^\n]{0,32}\d+(?:[\.,]\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|%)/i;
const ingredientContentPattern = /水|白砂糖|食用盐|食盐|植物油|小麦粉|淀粉|奶粉|乳粉|生牛乳|乳清粉|食品添加剂|香精|色素|防腐剂|增稠剂|甜味剂|酸度调节剂|乳化剂|麦芽糖|flour|sugar|salt|oil|milk|water|starch|tapioca|whey|almond|coconut|cocoa|lecithin|flavou?r/i;
const blockedIngredientLinePattern = /营养成分|nutrition|能量|蛋白质|脂肪|碳水|钠|NRV|生产日期|保质期|贮存|储存|产地|生产商|制造商|地址|电话|执行标准|食品生产许可证|食用方法|注意事项|净含量|规格|0蔗糖|零蔗糖|低脂|高钙|非油炸|甄选原料|营养美味|zero\s*(?:added\s*)?sugar|no\s*added\s*sugar|sugar\s*free|high\s*protein|source\s*of\s*vitamin|milk\s*beverage|ice\s*cream|calorie|simple\s+ingredients?|milk\s*fat|milkfat|nonfat|MFG|EXP|BBE|best\s*before|keep\s*refrigerated|required\s+on\s+labels?|inspection\s*legend|establishment\s*number|company\s*name\s*(?:and|&)?\s*address|net\s*weight\s*statement|safe\s*handling|principal\s+display\s*panel|information\s+panel|conservaci[oó]n|conservar|modo\s*de\s*preparaci[oó]n|lote|consumir\s*preferentemente|envasado|najlepiej|spozyc|przed|przechowywac|skladujte|vyrobeno|puvod|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}|D['’]INGREDIENTS/i;
const commonIngredientTerms = ['水', '白砂糖', '食用盐', '食盐', '植物油', '小麦粉', '淀粉', '奶粉', '乳粉', '生牛乳', '食品添加剂', '香精', '色素', '防腐剂', '增稠剂', '甜味剂', '酸度调节剂', '乳化剂', '大豆', '鸡蛋', '麦芽糖'];
