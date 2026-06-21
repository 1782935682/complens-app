import type { ProductDetectedType, ProductRecognitionContentType } from '@/types';
import type { NormalizedOcrResult } from '@/utils/ocrAdapter';
import { extractLabelText, type LabelTextExtraction } from '@/utils/labelTextExtractor';
import { normalizeOcrResult } from '@/utils/ocrAdapter';
import { extractNormalizedProductCode } from '@/services/recognition/barcodeService';
import { buildOcrLayout, type OcrLayout, type OcrLayoutLine } from './ocrLayoutService';

export type OcrSectionCategory = 'ingredients' | 'nutrition' | 'product' | 'code' | 'other' | 'uncertain';

export interface ClassifiedOcrSection {
  id: string;
  category: OcrSectionCategory;
  text: string;
  confidence: number;
  reasons: string[];
  lines: OcrLayoutLine[];
}

export interface OcrSectionClassification {
  detectedType: ProductDetectedType;
  contentType: ProductRecognitionContentType;
  confidence: 'high' | 'medium' | 'low';
  layout: OcrLayout;
  baselineExtraction: LabelTextExtraction;
  sections: ClassifiedOcrSection[];
  ingredientsText: string;
  nutritionText: string;
  productInfoText: string;
  codeInfoText: string;
  otherText: string[];
  uncertainText: string[];
  normalizedCode: string;
  reasons: string[];
}

export function classifyOcrSections(input: OcrLayout | NormalizedOcrResult | string): OcrSectionClassification {
  const normalized = normalizeInput(input);
  const layout = buildOcrLayout(normalized);
  const baselineExtraction = extractLabelText(normalized);
  const lineAssignments = classifyLines(layout.lines);
  const sections = mergeAssignments(lineAssignments);

  const ingredientsText = buildFieldText(sections, 'ingredients', baselineExtraction.ingredientText);
  const nutritionText = buildFieldText(sections, 'nutrition', baselineExtraction.nutritionText);
  const productInfoText = buildFieldText(sections, 'product', [
    baselineExtraction.productNameText,
    baselineExtraction.foodTypeText
  ].filter(Boolean).join('\n'));
  const codeInfoText = buildFieldText(sections, 'code', '');
  const otherText = buildTextList(sections, 'other', [
    baselineExtraction.frontClaimsText,
    baselineExtraction.allergenText,
    baselineExtraction.productionDateText,
    ...baselineExtraction.ignoredText
  ]);
  const uncertainText = buildTextList(sections, 'uncertain', []);
  const normalizedCode = extractNormalizedProductCode(codeInfoText || layout.rawText);
  const detectedType = resolveDetectedType({ ingredientsText, nutritionText, normalizedCode, sections });
  const contentType = resolveContentType(detectedType);
  const confidence = resolveConfidence({ ingredientsText, nutritionText, normalizedCode, baselineExtraction, uncertainText });

  return {
    detectedType,
    contentType,
    confidence,
    layout,
    baselineExtraction,
    sections,
    ingredientsText,
    nutritionText,
    productInfoText,
    codeInfoText,
    otherText,
    uncertainText,
    normalizedCode,
    reasons: buildClassificationReasons(sections, confidence, detectedType)
  };
}

function normalizeInput(input: OcrLayout | NormalizedOcrResult | string): NormalizedOcrResult {
  if (typeof input === 'string') return normalizeOcrResult(input);
  if ('source' in input && 'rawText' in input && 'blocks' in input) return {
    source: input.source,
    rawText: input.rawText,
    blocks: input.blocks
  };
  return normalizeOcrResult('');
}

function classifyLines(lines: OcrLayoutLine[]): ClassifiedOcrSection[] {
  const result: ClassifiedOcrSection[] = [];
  let forcedCategory: OcrSectionCategory | undefined;

  lines.forEach((line, index) => {
    const features = getLineFeatures(line);
    if (features.startsIngredients) forcedCategory = 'ingredients';
    if (features.startsNutrition) forcedCategory = 'nutrition';
    if (forcedCategory === 'ingredients' && features.stopsIngredients) forcedCategory = undefined;
    if (forcedCategory === 'nutrition' && features.stopsNutrition) forcedCategory = undefined;

    const category = chooseCategory(features, forcedCategory);
    result.push({
      id: `classified-line-${index}`,
      category,
      text: line.text,
      confidence: features.confidence,
      reasons: features.reasons,
      lines: [line]
    });
  });

  return result;
}

function chooseCategory(features: LineFeatures, forcedCategory: OcrSectionCategory | undefined): OcrSectionCategory {
  if (features.code) return 'code';
  if (features.other && !features.startsNutrition) return 'other';
  if (features.startsIngredients && !features.startsNutrition) return 'ingredients';
  if (features.startsIngredients && features.ingredientContent && !features.startsNutrition) return 'ingredients';
  if (forcedCategory === 'nutrition' && !features.startsIngredients && !features.other) return 'nutrition';
  if (forcedCategory === 'ingredients' && !features.startsNutrition && !features.nutrition && !features.other) return 'ingredients';
  if (features.nutrition && !features.ingredients) return 'nutrition';
  if (features.ingredients && !features.nutrition && !features.other) return 'ingredients';
  if (forcedCategory === 'ingredients' && features.ingredientContent && !features.nutrition && !features.other) return 'ingredients';
  if (forcedCategory === 'nutrition' && features.nutritionContent && !features.ingredients) return 'nutrition';
  if (features.product) return 'product';
  if (features.other) return 'other';
  if (features.nutrition) return 'nutrition';
  if (features.ingredients) return 'ingredients';
  return 'uncertain';
}

function mergeAssignments(items: ClassifiedOcrSection[]): ClassifiedOcrSection[] {
  const merged: ClassifiedOcrSection[] = [];
  for (const item of items) {
    const previous = merged[merged.length - 1];
    if (previous && previous.category === item.category) {
      previous.text = [previous.text, item.text].filter(Boolean).join('\n');
      previous.lines.push(...item.lines);
      previous.confidence = Math.max(previous.confidence, item.confidence);
      previous.reasons = uniqueStrings([...previous.reasons, ...item.reasons]);
    } else {
      merged.push({ ...item, id: `section-${merged.length}`, reasons: uniqueStrings(item.reasons) });
    }
  }
  return merged.filter((section) => section.text.trim());
}

function buildFieldText(sections: ClassifiedOcrSection[], category: OcrSectionCategory, fallback: string): string {
  const sectionText = sections
    .filter((section) => section.category === category)
    .map((section) => section.text)
    .join('\n')
    .trim();
  const text = cleanFieldText(sectionText || fallback, category);
  if (category === 'ingredients' && isUnsafeIngredientText(text)) return '';
  if (category === 'nutrition' && !hasNutritionSignal(text)) return '';
  return text;
}

function buildTextList(sections: ClassifiedOcrSection[], category: OcrSectionCategory, extra: string[]): string[] {
  return uniqueStrings([
    ...sections.filter((section) => section.category === category).map((section) => section.text),
    ...extra
  ]).slice(0, 16);
}

function cleanFieldText(value: string, category: OcrSectionCategory): string {
  const lines = splitLines(value).filter((line) => {
    if (category === 'ingredients') return !isOtherLine(line)
      && (!hasNutritionTableLine(line) || isLikelyIngredientPercentLine(line))
      && !isProductOnlyLine(line);
    if (category === 'nutrition') return hasNutritionSignal(line)
      || nutritionHeaderPattern.test(line)
      || isNutritionNameOnlyLine(line)
      || nutritionNutrientPattern.test(line)
      || isNutritionValueOnlyLine(line);
    return true;
  });
  return lines.join('\n').trim();
}

function isLikelyIngredientPercentLine(value: string): boolean {
  const text = normalizeText(value);
  if (!/%/.test(text) || nutritionAnchorPattern.test(text)) return false;
  if (/\b(?:kJ|kj|KJ|kcal|KCAL|mg|克|毫克|千焦|千卡)\b/i.test(text)) return false;
  if (/\b(?:nutrition|calories|protein|sodium|carbohydrate|fiber|fibre|serving|daily\s*value)\b/i.test(text)) return false;
  return ingredientContentPattern.test(text);
}

function isUnsafeIngredientText(value: string): boolean {
  const lines = splitLines(value);
  if (!lines.length) return true;
  const unsafe = lines.filter((line) => isOtherLine(line) || hasNutritionTableLine(line) || isProductOnlyLine(line)).length;
  if (unsafe / lines.length > 0.4) return true;
  return !lines.some((line) => ingredientAnchorPattern.test(line) || ingredientContentPattern.test(line) || hasIngredientListShape(line));
}

function resolveDetectedType(input: {
  ingredientsText: string;
  nutritionText: string;
  normalizedCode: string;
  sections: ClassifiedOcrSection[];
}): ProductDetectedType {
  if (input.ingredientsText) return 'ingredient_list';
  if (input.nutritionText) return 'nutrition_facts';
  if (input.normalizedCode) return 'numeric_code';
  if (input.sections.some((section) => section.category === 'code')) return 'numeric_code';
  return 'unknown';
}

function resolveContentType(detectedType: ProductDetectedType): ProductRecognitionContentType {
  if (detectedType === 'ingredient_list') return 'ingredient_list';
  if (detectedType === 'nutrition_facts') return 'nutrition_facts';
  if (detectedType === 'numeric_code' || detectedType === 'barcode') return 'product_code';
  return 'unknown';
}

function resolveConfidence(input: {
  ingredientsText: string;
  nutritionText: string;
  normalizedCode: string;
  baselineExtraction: LabelTextExtraction;
  uncertainText: string[];
}): OcrSectionClassification['confidence'] {
  if ((input.ingredientsText || input.nutritionText || input.normalizedCode) && input.baselineExtraction.confidence === 'high') return 'high';
  if (input.ingredientsText || input.nutritionText || input.normalizedCode) return input.uncertainText.length > 5 ? 'medium' : 'high';
  return input.uncertainText.length ? 'low' : 'low';
}

function buildClassificationReasons(sections: ClassifiedOcrSection[], confidence: OcrSectionClassification['confidence'], detectedType: ProductDetectedType): string[] {
  return uniqueStrings([
    `detected_type:${detectedType}`,
    `confidence:${confidence}`,
    ...sections.flatMap((section) => section.reasons)
  ]).slice(0, 16);
}

interface LineFeatures {
  startsIngredients: boolean;
  stopsIngredients: boolean;
  startsNutrition: boolean;
  stopsNutrition: boolean;
  ingredients: boolean;
  ingredientContent: boolean;
  nutrition: boolean;
  nutritionContent: boolean;
  product: boolean;
  code: boolean;
  other: boolean;
  confidence: number;
  reasons: string[];
}

function getLineFeatures(line: OcrLayoutLine): LineFeatures {
  const text = line.text;
  const compactText = line.compactText;
  const administrativeLabel = administrativeLabelPattern.test(text);
  const startsIngredients = !administrativeLabel && ingredientAnchorPattern.test(text);
  const startsNutrition = nutritionAnchorPattern.test(text);
  const stopsIngredients = administrativeLabel || ingredientStopPattern.test(text);
  const stopsNutrition = nutritionStopPattern.test(text);
  const nutrition = startsNutrition || (hasNutritionSignal(text) && !isStandaloneNutritionClaim(text));
  const nutritionName = nutritionNutrientPattern.test(text);
  const listShape = hasIngredientListShape(text);
  const standaloneIngredientList = hasStrongStandaloneIngredientEvidence(text);
  const ingredientContent = listShape || ingredientContentPattern.test(text);
  const ingredients = (startsIngredients ? ingredientContent : standaloneIngredientList) && !nutrition && !isOtherLine(text) && !isProductDescriptorLine(text);
  const product = productInfoPattern.test(text) || likelyFrontProductName(line);
  const code = productCodePattern.test(compactText);
  const other = administrativeLabel || isOtherLine(text);
  const reasons = [
    startsIngredients ? 'ingredient_anchor' : '',
    startsNutrition ? 'nutrition_anchor' : '',
    nutrition && !startsNutrition ? 'nutrition_value_signal' : '',
    ingredientContent ? 'ingredient_content_signal' : '',
    administrativeLabel ? 'label_instruction_or_administrative_text' : '',
    product ? 'product_info_signal' : '',
    code ? 'code_signal' : '',
    other ? 'other_or_administrative_text' : ''
  ].filter(Boolean);
  return {
    startsIngredients,
    stopsIngredients,
    startsNutrition,
    stopsNutrition,
    ingredients,
    ingredientContent,
    nutrition,
    nutritionContent: nutrition || nutritionName,
    product,
    code,
    other,
    confidence: Math.min(0.95, 0.45 + reasons.length * 0.12),
    reasons
  };
}

function likelyFrontProductName(line: OcrLayoutLine): boolean {
  const text = line.compactText;
  if (!text || text.length < 3 || text.length > 30) return false;
  if (/[：:，,。；;]/.test(text)) return false;
  if (ingredientContentPattern.test(text) || hasNutritionSignal(text) || isOtherLine(text)) return false;
  return /[A-Za-z\u4e00-\u9fa5]/.test(text) && line.index <= 4;
}

function hasIngredientListShape(value: string): boolean {
  const text = normalizeText(value);
  const separatorCount = (text.match(/[、，,;；]/g) || []).length;
  if (separatorCount >= 2) return true;
  return separatorCount >= 1 && countMatches(text, commonIngredientTerms) >= 2;
}

function hasStrongStandaloneIngredientEvidence(value: string): boolean {
  const text = normalizeText(value);
  const separatorCount = (text.match(/[、，,;；]/g) || []).length;
  if (separatorCount < 2) return false;
  const commonHits = countMatches(text, commonIngredientTerms);
  const latinHits = countMatches(text, standaloneIngredientTerms);
  if (commonHits >= 2 || latinHits >= 3) return true;
  return separatorCount >= 3 && ingredientContentPattern.test(text) && text.replace(/\s+/g, '').length >= 28;
}

function hasNutritionSignal(value: string): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  if (nutritionAnchorPattern.test(text)) return true;
  const hasNutrient = nutritionNutrientPattern.test(text);
  const hasUnit = nutritionUnitPattern.test(text);
  if (hasNutrient && hasUnit) return true;
  return countMatches(text, nutritionNutrients) >= 2 && /\d/.test(text);
}

function hasNutritionTableLine(value: string): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  if (nutritionAnchorPattern.test(text)) return true;
  if (ingredientAnchorPattern.test(text) || hasIngredientListShape(text)) return false;
  return hasNutritionSignal(text);
}

function isStandaloneNutritionClaim(value: string): boolean {
  const text = normalizeText(value);
  const compact = text.replace(/\s+/g, '').toLowerCase();
  if (nutritionHeaderPattern.test(text)) return false;
  if (compact.length > 28) return false;
  return countMatches(text, nutritionNutrients) === 1 && nutritionUnitPattern.test(text);
}

function isNutritionNameOnlyLine(value: string): boolean {
  const text = normalizeText(value);
  const compact = text.replace(/\s+/g, '');
  if (!compact || compact.length > 44) return false;
  if (ingredientAnchorPattern.test(text) || ingredientContentPattern.test(text) || isOtherLine(text)) return false;
  return nutritionNutrientPattern.test(text);
}

function isNutritionValueOnlyLine(value: string): boolean {
  const text = normalizeText(value);
  const compact = text.replace(/\s+/g, '');
  if (!compact || compact.length > 18) return false;
  if (ingredientAnchorPattern.test(text) || ingredientContentPattern.test(text) || isOtherLine(text)) return false;
  return /^(?:kJ|kj|KJ|kcal|KCAL|k|g|mg)?\d+(?:[\.,]\d+)?(?:kJ|kj|KJ|kcal|KCAL|g|mg|克|毫克|千焦|千卡|%)?$/.test(compact);
}

function isOtherLine(value: string): boolean {
  const text = normalizeText(value);
  return frontClaimPattern.test(text)
    || productionPattern.test(text)
    || companyPattern.test(text)
    || standardPattern.test(text)
    || storagePattern.test(text)
    || instructionPattern.test(text)
    || allergenPattern.test(text);
}

function isProductOnlyLine(value: string): boolean {
  const text = normalizeText(value);
  return productInfoPattern.test(text) && !ingredientContentPattern.test(text) && !hasNutritionSignal(text);
}

function isProductDescriptorLine(value: string): boolean {
  return productDescriptorPattern.test(normalizeText(value)) && !hasIngredientListShape(value);
}

function splitLines(text: string): string[] {
  return normalizeText(text)
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function countMatches(text: string, terms: string[]): number {
  const compact = normalizeText(text).replace(/\s+/g, '').toLowerCase();
  return terms.reduce((count, term) => count + (compact.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

const ingredientAnchorPattern = /[配护]\s*料\s*(?:表|衰)?|产品配料|食品配料|原料|ingredients?|ingr[eé]dients?|\[?\s*ngredientes?|ingredlents?|ingrdclents?|ingredientes?|ingredienti|zutaten|sk[lłt]adniki|sktadniki|slo[zž]en[íiyf]?|成\s*[分份]\s*表?/i;
const nutritionAnchorPattern = /营养成分表|营养标签|营养成分|營養成分|^nutrition$|nutrition\s*(?:facts|information|facts?)|nutritional\s*information|nutritioneacts|nutrits|nutritlional|typical\s*val(?:ues|ies)|supplement\s*facts|valeurs?\s*nutritionnelles?|[il]?nformation\s*nutritionnelles?|nutritionnelles?|declaration\s+nutritionnelle|dichiarazione\s+nutrizionale|informaci[oó]n\s*nutricional|informacionnutricional|valores?\s*nutricionales?|valori\s*nutrizionali|valores?\s*nutricionais|n[äa]hrwerte|naehrwerte|nahrwerte|nahrwertdeklaration|besin\s*ogeleri|declaratie\s+nutritionala|wartosc\s*odzywcza|wartoscod|hranjive\s*vrijednosti|hranjivevrijednosti|vyzivove|xpa[hн]mt|每\s*100\s*(?:g|克|ml|毫升)|per\s*100\s*(?:g|ml)|pour\s*100|pro\s*100|je\s*100|pe\s*100|NRV|营养素参考值/i;
const ingredientStopPattern = /营养成分表|营养成分|^nutrition$|nutrition\s*(?:facts|information)|nutritional\s*information|nutritioneacts|nutrits|typical\s*val(?:ues|ies)|supplement\s*facts|valeurs?\s*nutritionnelles?|[il]?nformation\s*nutritionnelles?|nutritionnelles?|declaration\s+nutritionnelle|dichiarazione\s+nutrizionale|informaci[oó]n\s*nutricional|informacionnutricional|n[äa]hrwerte|nahrwertdeklaration|致敏原|过敏原|生产日期|保质期|贮存|储存|产地|厂家|制造商|生产商|执行标准|食品生产许可证|食用方法|净含量|规格|keep\s*refrigerated|conservaci[oó]n|conservar|modo\s*de\s*preparaci[oó]n|lote|consumir\s*preferentemente|envasado|najlepiej|spozyc|przed|przechowywac|skladujte|vyrobeno|puvod/i;
const nutritionStopPattern = /[配护]\s*料\s*(?:表|衰)?|食品配料|原料|ingredients?|ingr[eé]dients?|ingredlents?|ingrdclents?|ingredientes?|ingredienti|zutaten|致敏原|过敏原|生产日期|保质期|贮存|储存|产地|厂家|制造商|生产商|执行标准|食品生产许可证|食用方法|净含量|规格/i;
const ingredientContentPattern = /水|白砂糖|食用盐|食盐|植物油|小麦粉|淀粉|奶粉|乳粉|生牛乳|乳清粉|可可粉|食品添加剂|香精|色素|防腐剂|增稠剂|甜味剂|酸度调节剂|乳化剂|麦芽糖|果葡糖浆|葡萄糖|大豆|黄豆|鸡蛋|酵母|flour|sugar|salt|oil|milk|water|starch|tapioca|maltodextrin|citric|flavou?r|sunflower|citrate|glucose|dextrose|honey|almond|amandes|lait|sucre|sel|huile|farine|ar[oô]me|eau|girasol|vinagre|sal\b|aroma|kukurydza|kukurice|olej|stonecznikowy|slonecznikowy|s[óo6]l|suil/i;
const nutritionHeaderPattern = /项目|每\s*100|NRV|营养素参考值|per\s*100|pour\s*100|pro\s*100|je\s*100|pe\s*100|serving\s*size|per\s*serving|^nutrition$|nutrition\s*(?:facts|information)|nutritional\s*information|nutritioneacts|nutrits|typical\s*val(?:ues|ies)|valeurs?\s*nutritionnelles?|[il]?nformation\s*nutritionnelles?|nutritionnelles?|declaration\s+nutritionnelle|dichiarazione\s+nutrizionale|informaci[oó]n\s*nutricional|informacionnutricional|valori\s*nutrizionali|valores?\s*nutricionais|n[äa]hrwerte|naehrwerte|nahrwerte|nahrwertdeklaration|wartosc\s*odzywcza|wartoscod|hranjive\s*vrijednosti|hranjivevrijednosti|vyzivove|declaratie\s+nutritionala|supplement\s*facts/i;
const nutritionNutrientPattern = /能量|热量|蛋白质|脂肪|碳水化合物|碳水|糖|钠|膳食纤维|盐|energy|lnergy|calories|protein|fat|fat-total|total\s*fat|carbohydrate|glycaemic\s*carbohydrate|sugars?|sodium|sodiun|fiber|fibre|salt|energie|brennwert|fett|kohlenhydrate|konlenhydrate|zucker|eiwei[ßs]|eiweis|salz|safz|mati[eè]res?\s*grasses?|matieres?\s*grasses?|glucides?|sucres?|dont\s*sucres?|dontsucres?|prot[eé]ines?|proteines?|protines?|fibres?|grasas?|hidratos?\s+de\s+carbono|az[uú]cares?|fibra|prote[ií]nas?|energia|valeur\s*energeti\w+|valeurenergeti\w+|grassi|carboidrati|zuccheri|proteine|sale|lipidos?|l[ií]pidos?|tiuszc|tluszc|tuky|masti|grasimi|cdcd\w*|salk|solsu|sare|sel\b|a[cç]ucares?/i;
const nutritionUnitPattern = /\d+(?:[\.,]\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|千焦|千卡|%)|NRV\s*%?/i;
const productInfoPattern = /^(?:品\s*名|产品名称|商品名称|食品名称|品牌|商标|规格|净含量|净重|口味)\s*[:：]?/i;
const productCodePattern = /(?:^|\D)(?:\d{8}|\d{12}|\d{13})(?:\D|$)|(?:GTIN|EAN|UPC|条形码|条码|商品条码)\s*[:：]?\s*\d{8,13}/i;
const frontClaimPattern = /0糖|O糖|零糖|无糖|低糖|少糖|0蔗糖|零蔗糖|无蔗糖|低脂|脱脂|非油炸|高蛋白|低钠|减盐|少盐|无添加|不添加|高钙|甄选原料|营养美味|天然|新鲜|美味|广告|活动|zero\s*(?:added\s*)?sugar|no\s*added\s*sugar|sugar\s*free|high\s*protein|source\s*of\s*vitamin|vitamin|low\s*calorie|simple\s+ingredients?|milk\s*fat|milkfat|nonfat/i;
const productDescriptorPattern = /beverage|drink|ice\s*cream|flavou?r|cocoa|malt|milk\s*beverage|protein|vitamin|zero\s*(?:added\s*)?sugar|no\s*added\s*sugar|calorie|natural|simple\s+ingredients?|milk\s*fat|milkfat|nonfat/i;
const productionPattern = /生产日期|制造日期|保质期|赏味期限|有效期|日期见|见包装|见喷码|批号|批次|MFG|EXP|BBE|best\s*before|use\s*by|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}\s*,?\s*\d{2,4}/i;
const storagePattern = /贮存条件|储存条件|贮存方法|储存方法|常温保存|冷藏|冷冻|阴凉干燥|conservaci[oó]n|conservar|przechowywac|skladujte/i;
const companyPattern = /生产商|制造商|委托方|经销商|厂商|地址|电话|服务热线|邮编|有限公司|产地|原产国|进口商/i;
const standardPattern = /执行标准|产品标准号|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b|GB\/?T|Q\/[A-Z0-9]/i;
const instructionPattern = /食用方法|冲调方法|烹调方法|使用方法|注意事项|温馨提示|modo\s*de\s*preparaci[oó]n|listo\s*para\s*el\s*consumo/i;
const allergenPattern = /致敏原|过敏原|可能含有|含有.*(?:小麦|牛奶|大豆|花生|坚果|鸡蛋|鱼|虾|蟹)|allergen|may\s*contain|puede\s*contener|trazas/i;
const administrativeLabelPattern = /required\s+on\s+labels?|inspection\s*legend|establishment\s*number|company\s*name\s*(?:and|&)?\s*address|net\s*weight\s*statement|safe\s*handling|principal\s+display\s+panel|information\s+panel/i;
const commonIngredientTerms = ['水', '白砂糖', '食用盐', '食盐', '植物油', '小麦粉', '淀粉', '奶粉', '乳粉', '生牛乳', '食品添加剂', '香精', '色素', '防腐剂', '增稠剂', '甜味剂', '酸度调节剂', '乳化剂', '大豆', '鸡蛋', '麦芽糖'];
const nutritionNutrients = ['能量', '热量', '蛋白质', '脂肪', '碳水化合物', '碳水', '糖', '钠', '膳食纤维', 'energy', 'lnergy', 'protein', 'fat', 'fat-total', 'carbohydrate', 'glycaemiccarbohydrate', 'sugar', 'sodium', 'sodiun', 'energie', 'brennwert', 'fett', 'kohlenhydrate', 'konlenhydrate', 'zucker', 'salz', 'safz', 'glucides', 'proteines', 'protines', 'grasas', 'azucares', 'tiuszc', 'tuky', 'masti', 'grasimi', 'cdcd', 'salk', 'solsu', 'sare', 'matieresgrasses', 'valeurenergetigue'];
const standaloneIngredientTerms = ['water', 'sugar', 'salt', 'flour', 'oil', 'milk', 'starch', 'dextrose', 'glucose', 'syrup', 'beef', 'pork', 'wheat', 'corn', 'soy', 'cocoa', 'lecithin', 'erythorbate', 'girasol', 'vinagre', 'aroma', 'kukurydza', 'kukurice', 'olej', 'slonecznikowy', 'stonecznikowy'];
