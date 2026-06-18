import { getActiveFoodAdditiveRules } from './additiveRules';
import type { NormalizedOcrResult } from './ocrAdapter';

export type LabelTextConfidence = 'high' | 'medium' | 'low';
export type LabelTextSourceType = 'ocr' | 'manual' | 'demo';

export interface LabelTextExtraction {
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  ignoredText: string[];
  confidence: LabelTextConfidence;
  sourceType: LabelTextSourceType;
}

export function extractLabelText(input: NormalizedOcrResult, sourceTypeOverride?: LabelTextSourceType): LabelTextExtraction {
  const sourceType = sourceTypeOverride || sourceTypeFromOcrSource(input.source);
  const rawText = buildRawText(input);
  const lines = splitLines(rawText);
  const ingredient = extractIngredientText(rawText, lines);
  const nutritionText = extractNutritionText(rawText, lines);
  const allergenText = extractAllergenText(rawText, lines);
  const ignoredText = uniqueLines([
    ...ingredient.ignored,
    ...collectIgnoredLines(lines, ingredient.text, nutritionText, allergenText)
  ]);

  return {
    ingredientText: ingredient.text,
    nutritionText,
    allergenText,
    ignoredText,
    confidence: scoreConfidence({
      ingredientText: ingredient.text,
      hadStrongAnchor: ingredient.hadStrongAnchor,
      hadWeakAnchor: ingredient.hadWeakAnchor,
      ignoredCount: ignoredText.length
    }),
    sourceType
  };
}

function buildRawText(input: NormalizedOcrResult): string {
  const blockText = Array.isArray(input.blocks)
    ? input.blocks.map((block) => normalizeText(block.text)).filter(Boolean).join('\n')
    : '';
  return normalizeText(blockText || input.rawText || '');
}

function sourceTypeFromOcrSource(source: NormalizedOcrResult['source']): LabelTextSourceType {
  if (source === 'manual') return 'manual';
  return 'ocr';
}

function extractIngredientText(rawText: string, lines: string[]): {
  text: string;
  ignored: string[];
  hadStrongAnchor: boolean;
  hadWeakAnchor: boolean;
} {
  const strong = findStrongIngredientAnchor(rawText);
  if (strong) {
    const candidate = sliceUntilStop(rawText, strong.end, ingredientStopPattern);
    const cleaned = cleanIngredientCandidate(candidate);
    if (cleaned.text) return { ...cleaned, hadStrongAnchor: true, hadWeakAnchor: false };
  }

  const weak = findWeakIngredientAnchor(rawText);
  if (weak) {
    const candidate = sliceUntilStop(rawText, weak.end, ingredientStopPattern);
    const cleaned = cleanIngredientCandidate(candidate);
    if (cleaned.text) return { ...cleaned, hadStrongAnchor: false, hadWeakAnchor: true };
  }

  const scored = pickBestIngredientLines(lines);
  return { text: scored.text, ignored: scored.ignored, hadStrongAnchor: false, hadWeakAnchor: false };
}

function extractNutritionText(rawText: string, lines: string[]): string {
  const anchor = rawText.search(nutritionSectionAnchorPattern);
  if (anchor >= 0) {
    const section = sliceUntilStop(rawText, anchor, nutritionStopPattern);
    const cleaned = splitLines(section)
      .filter(isNutritionLineCandidate)
      .join('\n')
      .trim();
    return cleaned || section.trim();
  }
  return lines.filter(isNutritionLineCandidate).join('\n').trim();
}

function extractAllergenText(rawText: string, lines: string[]): string {
  const anchor = rawText.search(allergenAnchorPattern);
  if (anchor >= 0) {
    const section = sliceUntilStop(rawText, anchor, allergenStopPattern);
    const cleaned = splitLines(section)
      .filter((line) => allergenLinePattern.test(line) || allergenKeywordPattern.test(line))
      .join('\n')
      .trim();
    return cleaned || section.trim();
  }
  return lines
    .filter((line) => allergenLinePattern.test(line) && allergenKeywordPattern.test(line))
    .join('\n')
    .trim();
}

function cleanIngredientCandidate(candidate: string): { text: string; ignored: string[] } {
  const ignored: string[] = [];
  const cleaned = splitIngredientLines(candidate)
    .map(stripIngredientPrefix)
    .filter(Boolean)
    .filter((line) => {
      if (isIngredientNoiseLine(line)) {
        ignored.push(line);
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/[，,、;；\s]+$/g, '')
    .trim();
  return { text: cleaned, ignored };
}

function pickBestIngredientLines(lines: string[]): { text: string; ignored: string[] } {
  const ignored: string[] = [];
  const candidates = lines
    .map((line, index) => ({ line, index, score: scoreIngredientLine(line) }))
    .filter((item) => {
      if (isIngredientNoiseLine(item.line)) {
        ignored.push(item.line);
        return false;
      }
      if (!isIngredientFallbackCandidate(item.line, item.score)) {
        if (isProductInfoLine(item.line) || isAdOnlyLine(item.line)) ignored.push(item.line);
        return false;
      }
      return true;
    })
    .sort((left, right) => left.index - right.index)
    .slice(0, 3)
    .map((item) => item.line);
  return { text: candidates.join('\n').trim(), ignored };
}

function scoreConfidence(options: {
  ingredientText: string;
  hadStrongAnchor: boolean;
  hadWeakAnchor: boolean;
  ignoredCount: number;
}): LabelTextConfidence {
  const text = options.ingredientText;
  if (!text) return 'low';
  const score = scoreIngredientText(text)
    + (options.hadStrongAnchor ? 5 : 0)
    + (options.hadWeakAnchor ? 2 : 0)
    - Math.min(2, Math.floor(options.ignoredCount / 4));
  if (options.hadStrongAnchor && score >= 7) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function scoreIngredientText(text: string): number {
  const compact = normalizeCompact(text);
  let score = 0;
  const separatorCount = (text.match(/[、，,;；]/g) || []).length;
  if (separatorCount >= 2) score += 2;
  if (separatorCount >= 5) score += 1;
  if (countAdditiveTermHits(compact) >= 1) score += 2;
  if (countCommonIngredientHits(compact) >= 2) score += 2;
  if (text.length >= 24) score += 1;
  if (text.length < 8) score -= 2;
  if (invalidLinePattern.test(text)) score -= 2;
  if (isProductInfoLine(text)) score -= 4;
  if (isAdOnlyLine(text)) score -= 3;
  return score;
}

function scoreIngredientLine(line: string): number {
  const compact = normalizeCompact(line);
  let score = scoreIngredientText(line);
  if (strongIngredientAnchorPattern.test(line)) score += 4;
  if (weakIngredientAnchorPattern.test(line) && !nutritionSectionAnchorPattern.test(line)) score += 1;
  if (/配\s*料\s*衰/.test(line)) score += 2;
  if (productionNoisePattern.test(compact) || standardNoisePattern.test(compact) || companyNoisePattern.test(compact)) score -= 4;
  if (contentSpecNoisePattern.test(compact) || adNoisePattern.test(compact)) score -= 2;
  return score;
}

function collectIgnoredLines(lines: string[], ingredientText: string, nutritionText: string, allergenText: string): string[] {
  const keptText = normalizeCompact([ingredientText, nutritionText, allergenText].join('\n'));
  return lines.filter((line) => {
    const compact = normalizeCompact(line);
    if (!compact) return false;
    if (keptText.includes(compact)) return false;
    return isIngredientNoiseLine(line);
  });
}

function isIngredientNoiseLine(line: string): boolean {
  const text = normalizeCompact(line);
  if (!text) return true;
  if (nutritionSectionAnchorPattern.test(text) || allergenAnchorPattern.test(text)) return true;
  if (invalidLinePattern.test(text)) return true;
  if (productionNoisePattern.test(text)) return true;
  if (companyNoisePattern.test(text)) return true;
  if (standardNoisePattern.test(text)) return true;
  if (productInfoNoisePattern.test(text) && !hasIngredientLikeSignal(text)) return true;
  if (contentSpecNoisePattern.test(text) && !hasIngredientLikeSignal(text)) return true;
  if (adNoisePattern.test(text) && !hasIngredientLikeSignal(text)) return true;
  if (text.length <= 4 && !hasIngredientLikeSignal(text)) return true;
  if (/^[a-z]+$/i.test(text) && !/ingredients?/i.test(text)) return true;
  return false;
}

function hasIngredientLikeSignal(text: string): boolean {
  return /[、，,;；]/.test(text) || commonIngredientPattern.test(text) || containsAdditiveTerm(text);
}

function isIngredientFallbackCandidate(line: string, score: number): boolean {
  const compact = normalizeCompact(line);
  if (score < 4) return false;
  if (isProductInfoLine(line) || isAdOnlyLine(line)) return false;
  return hasIngredientListShape(compact);
}

function hasIngredientListShape(text: string): boolean {
  const separatorCount = (text.match(/[、，,;；]/g) || []).length;
  if (separatorCount >= 2) return true;
  if (/食品\s*添加剂\s*[(（]/.test(text)) return true;
  if (separatorCount >= 1 && countCommonIngredientHits(text) + countAdditiveTermHits(text) >= 2) return true;
  if (countAdditiveTermHits(text) >= 2 && text.length >= 8) return true;
  if (/water|sugar|salt|flour|milk|oil|sucralose|sorbate|benzoate|xanthan|ingredients?/i.test(text) && separatorCount >= 1) return true;
  return false;
}

function isProductInfoLine(line: string): boolean {
  const text = normalizeCompact(line);
  if (!text) return false;
  if (strongIngredientAnchorPattern.test(line) || /ingredients?/i.test(line)) return false;
  if (productInfoNoisePattern.test(text)) return true;
  if (contentSpecNoisePattern.test(text) && !hasIngredientListShape(text)) return true;
  return false;
}

function isAdOnlyLine(line: string): boolean {
  const text = normalizeCompact(line);
  if (!text) return false;
  return adNoisePattern.test(text) && !hasIngredientListShape(text);
}

function isNutritionLineCandidate(line: string): boolean {
  const text = normalizeText(line);
  const compact = normalizeCompact(text);
  if (!compact) return false;
  if (nutritionSectionAnchorPattern.test(text)) return true;
  if (!nutritionUnitPattern.test(text)) return false;
  return nutritionNutrientPattern.test(text) || countNutritionNutrientHits(compact) >= 2;
}

function findStrongIngredientAnchor(text: string): { start: number; end: number } | undefined {
  const strict = findAnchor(text, strongIngredientAnchorPattern);
  if (strict) return strict;
  const matches = [...text.matchAll(looseIngredientAnchorGlobalPattern)];
  const match = matches.find((item) => {
    const index = item.index || 0;
    const tail = text.slice(index, index + 48);
    return !nutritionSectionAnchorPattern.test(tail) && hasIngredientListShape(tail);
  });
  if (!match || match.index === undefined) return undefined;
  return {
    start: match.index,
    end: consumeAnchorTail(text, match.index + match[0].length)
  };
}

function findAnchor(text: string, pattern: RegExp): { start: number; end: number } | undefined {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return undefined;
  return {
    start: match.index,
    end: consumeAnchorTail(text, match.index + match[0].length)
  };
}

function findWeakIngredientAnchor(text: string): { start: number; end: number } | undefined {
  const matches = [...text.matchAll(weakIngredientAnchorGlobalPattern)];
  const match = matches.find((item) => {
    const index = item.index || 0;
    const nearby = text.slice(Math.max(0, index - 4), index + 8);
    return !nutritionSectionAnchorPattern.test(nearby);
  });
  if (!match || match.index === undefined) return undefined;
  return {
    start: match.index,
    end: consumeAnchorTail(text, match.index + match[0].length)
  };
}

function sliceUntilStop(text: string, start: number, stopPattern: RegExp): string {
  const rest = text.slice(start);
  const stop = rest.search(stopPattern);
  return (stop >= 0 ? rest.slice(0, stop) : rest).trim();
}

function consumeAnchorTail(text: string, index: number): number {
  let cursor = index;
  while (/[\s:：\-—,，]/.test(text[cursor] || '')) cursor += 1;
  return cursor;
}

function stripIngredientPrefix(line: string): string {
  return line.replace(/^\s*(?:配\s*料\s*(?:表|衰)?|食品\s*配\s*料|原\s*料|ingredients?|成\s*[分份]\s*表?)\s*[:：-]?\s*/i, '').trim();
}

function splitIngredientLines(text: string): string[] {
  const lines = splitLines(text);
  if (lines.length > 1) return lines;
  return text
    .split(/(?=营养成分表|致敏原提示|过敏原提示|产品名称|商品名称|品名|生产日期|保质期|贮存条件|储存方法|执行标准|食品生产许可证|净含量|净重|规格|地址|电话|条码|二维码)/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function normalizeCompact(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function containsAdditiveTerm(text: string): boolean {
  return countAdditiveTermHits(text) > 0;
}

function countAdditiveTermHits(text: string): number {
  const compactText = normalizeCompact(text).toLowerCase();
  const matched = new Set<string>();
  getActiveFoodAdditiveRules().forEach((rule) => {
    const terms = [...rule.keywords, ...rule.aliases, rule.name];
    terms.forEach((keyword) => {
      const normalized = normalizeCompact(keyword).toLowerCase();
      if (normalized && compactText.includes(normalized)) matched.add(normalized);
    });
  });
  return matched.size;
}

function countCommonIngredientHits(text: string): number {
  const compact = normalizeCompact(text);
  return commonIngredientTerms.reduce((count, term) => count + (compact.includes(term) ? 1 : 0), 0);
}

function countNutritionNutrientHits(text: string): number {
  return nutritionNutrientTerms.reduce((count, term) => count + (text.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0);
}

function uniqueLines(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].slice(0, 12);
}

const strongIngredientAnchorPattern = /配\s*料\s*(?:表|衰)\s*[:：]?|配\s*料\s*[:：]|食品\s*配\s*料\s*[:：]?|原\s*料\s*[:：]|ingredients?\s*[:：]?/i;
const looseIngredientAnchorGlobalPattern = /配\s*料|原\s*料/g;
const weakIngredientAnchorPattern = /成\s*[分份]\s*表?/;
const weakIngredientAnchorGlobalPattern = /成\s*[分份]\s*表?/g;

const ingredientStopPattern = /营养成分表|营养成分|營養成分表|營養成分|nutrition\s*(?:facts|information)|致敏原提示|过敏原提示|致敏原|過敏原|allergen|allergy\s*(?:advice|information)|产品名称|產品名稱|商品名称|商品名稱|品名|生产日期|保质期|贮存条件|储存方法|產品標準號|产品标准号|执行标准|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b|产地|厂家|制造商|委托方|地址|电话|服务热线|条形码|条码|二维码|净含量|净重|规格|食用方法|注意事项/i;

const nutritionSectionAnchorPattern = /营养成分表|营养成分|營養成分表|營養成分|每\s*100\s*(?:g|克|ml|毫升)|per\s*100\s*(?:g|ml)|per\s*serving|NRV|营养素参考值|營養素參考值|nutrition\s*(?:facts|information)/i;
const nutritionNutrientPattern = /energy|calories|protein|total\s*fat|fat|carbohydrate|sugars?|sodium|salt|能量|热量|熱量|蛋白质|蛋白質|脂肪|碳水化合物|碳水|糖|钠|鈉|盐|鹽/i;
const nutritionUnitPattern = /\d+(?:\.\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|%)|NRV\s*%?/i;
const nutritionStopPattern = /致敏原提示|过敏原提示|致敏原|過敏原|allergen|allergy\s*(?:advice|information)|配\s*料\s*(?:表|衰)?|食品\s*配\s*料|原\s*料|ingredients?|生产日期|保质期|贮存条件|储存方法|產品標準號|产品标准号|执行标准|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b|产地|厂家|制造商|委托方|地址|电话|服务热线|条形码|条码|净含量|规格|食用方法|注意事项/i;

const allergenAnchorPattern = /致敏原提示|过敏原提示|致敏原|過敏原|可能含有微量|可能含有|本品含有|含有|contains\s*traces\s*of|may\s*contain|contains|allergen|allergy\s*(?:advice|information)/i;
const allergenKeywordPattern = /花生|坚果|牛奶|乳制品|大豆|麸质|小麦|鸡蛋|鱼类|鱼|虾|蟹|贝类|peanut|nuts?|milk|soy|gluten|wheat|egg|fish|shrimp|crab|shellfish/i;
const allergenLinePattern = /致敏原提示|过敏原提示|致敏原|過敏原|可能含有微量|可能含有|本品含有|含有|contains\s*traces\s*of|may\s*contain|contains|allergen|allergy\s*(?:advice|information)/i;
const allergenStopPattern = /营养成分表|营养成分|營養成分表|營養成分|nutrition\s*(?:facts|information)|配\s*料\s*(?:表|衰)?|食品\s*配\s*料|原\s*料|ingredients?|生产日期|保质期|贮存条件|储存方法|產品標準號|产品标准号|执行标准|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b|产地|厂家|制造商|委托方|地址|电话|服务热线|条形码|条码|净含量|规格|食用方法|注意事项/i;

const productionNoisePattern = /生产日期|保质期|见包装|贮存条件|储存方法|贮存|储存/;
const companyNoisePattern = /地址|邮编|电话|有限公司|生产商|制造商|委托方|经销商|厂家|服务热线/;
const standardNoisePattern = /执行标准|产品标准号|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b/;
const productInfoNoisePattern = /产品名称|產品名稱|商品名称|商品名稱|品名|品牌|商标|口味|净含量|净重|规格|规格型号|条码|条形码|二维码|生产日期|保质期|贮存|储存|产地|厂家|生产商|制造商|委托方|经销商|地址|邮编|电话|服务热线|执行标准|产品标准号|食品生产许可证|生产许可证编号|\bSC\s*\d{6,}\b|食用方法|注意事项|配料请见|营养成分请见/i;
const contentSpecNoisePattern = /净含量|净重|规格|(?:^|[^\u4e00-\u9fa5])\d+(?:\.\d+)?\s*(?:g|克|ml|mL|毫升|升|kg|千克)(?:$|[^\u4e00-\u9fa5])/i;
const adNoisePattern = /0蔗糖|零蔗糖|低脂|高蛋白|非油炸|无添加|天然|健\s*康|新鲜|美味|儿童优选|轻负担|饱腹/;
const invalidLinePattern = /^(?:\d+|[A-Z0-9\-./]+|[^\u4e00-\u9fa5A-Za-z0-9]+)$/i;
const commonIngredientTerms = ['水', '白砂糖', '食用盐', '食盐', '植物油', '果葡糖浆', '食用香精', '葡萄糖浆', '麦芽糖浆', '大豆', '乳粉', '小麦', '小麦粉', '淀粉', '鸡蛋', '牛奶', '奶粉'];
const nutritionNutrientTerms = ['energy', 'calories', 'protein', 'fat', 'carbohydrate', 'sugar', 'sugars', 'sodium', 'salt', '能量', '热量', '熱量', '蛋白质', '蛋白質', '脂肪', '碳水化合物', '碳水', '糖', '钠', '鈉', '盐', '鹽'];
const commonIngredientPattern = /水|白砂糖|食用盐|食盐|植物油|果葡糖浆|食用香精|葡萄糖浆|麦芽糖浆|大豆|乳粉|小麦|小麦粉|淀粉|鸡蛋|牛奶|奶粉/;
