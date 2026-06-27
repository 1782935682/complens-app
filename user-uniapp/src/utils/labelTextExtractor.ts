import { getActiveFoodAdditiveRules } from './additiveRules';
import type { NormalizedOcrResult } from './ocrAdapter';

export type LabelTextConfidence = 'high' | 'medium' | 'low';
export type LabelTextSourceType = 'ocr' | 'manual' | 'demo';

export interface LabelTextExtraction {
  productNameText: string;
  foodTypeText: string;
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  frontClaimsText: string;
  productionDateText: string;
  ignoredText: string[];
  qualityWarnings: string[];
  confidence: LabelTextConfidence;
  sourceType: LabelTextSourceType;
}

export interface IngredientTextFilterResult {
  text: string;
  ignored: string[];
  qualityWarnings: string[];
}

export function extractLabelText(input: NormalizedOcrResult, sourceTypeOverride?: LabelTextSourceType): LabelTextExtraction {
  const sourceType = sourceTypeOverride || sourceTypeFromOcrSource(input.source);
  const rawText = buildRawText(input);
  const lines = splitLines(rawText);
  const productNameText = extractProductNameText(lines);
  const foodTypeText = extractFoodTypeText(lines);
  const ingredient = extractIngredientText(rawText, lines);
  const nutritionText = extractNutritionText(rawText, lines);
  const allergenText = extractAllergenText(rawText, lines);
  const frontClaimsText = extractFrontClaimText(lines, ingredient.text, nutritionText, allergenText);
  const productionDateText = extractProductionDateText(lines);
  const keptSections = [ingredient.text, nutritionText, allergenText, frontClaimsText, productionDateText, productNameText, foodTypeText];
  const ignoredText = uniqueLines([
    ...ingredient.ignored.filter((line) => !isLinePartOfKeptSections(line, keptSections)),
    ...collectIgnoredLines(lines, ingredient.text, nutritionText, allergenText, frontClaimsText, productionDateText, productNameText, foodTypeText)
  ]);

  return {
    productNameText,
    foodTypeText,
    ingredientText: ingredient.text,
    nutritionText,
    allergenText,
    frontClaimsText,
    productionDateText,
    ignoredText,
    qualityWarnings: ingredient.qualityWarnings,
    confidence: scoreConfidence({
      ingredientText: ingredient.text,
      hadStrongAnchor: ingredient.hadStrongAnchor,
      hadWeakAnchor: ingredient.hadWeakAnchor,
      ignoredCount: ignoredText.length
    }),
    sourceType
  };
}

function extractProductNameText(lines: string[]): string {
  const line = lines.find((item) => /^(?:品\s*名|产品名称|商品名称|食品名称)\s*[:：\s]?/.test(item));
  if (!line) return '';
  return cleanupTargetValue(line, /^(?:品\s*名|产品名称|商品名称|食品名称)\s*[:：\s]?/);
}

function extractFoodTypeText(lines: string[]): string {
  const line = lines.find((item) => /^(?:产品类型|食品类别|食品类型|类别)\s*[:：\s]?/.test(item));
  if (!line) return '';
  return cleanupTargetValue(line, /^(?:产品类型|食品类别|食品类型|类别)\s*[:：\s]?/);
}

function extractProductionDateText(lines: string[]): string {
  const line = lines.find((item) => /生产日期|制造日期|产日期/.test(item));
  if (!line) return '';
  const match = line.match(/(?:生产日期|制造日期|产日期)\s*[:：]?\s*((?:20)?\d{2}[-./年]\d{1,2}[-./月]\d{1,2}日?|见包装|见喷码|见封口|见瓶身|见盒身)/);
  return match ? normalizeText(match[1]) : cleanupTargetValue(line, /(?:生产日期|制造日期|产日期)\s*[:：]?/);
}

function buildRawText(input: NormalizedOcrResult): string {
  const blockText = Array.isArray(input.blocks)
    ? input.blocks.map((block) => normalizeText(block.text)).filter(Boolean).join('\n')
    : '';
  return normalizeText(input.rawText || blockText || '');
}

function sourceTypeFromOcrSource(source: NormalizedOcrResult['source']): LabelTextSourceType {
  if (source === 'manual') return 'manual';
  return 'ocr';
}

function extractIngredientText(rawText: string, lines: string[]): {
  text: string;
  ignored: string[];
  qualityWarnings: string[];
  hadStrongAnchor: boolean;
  hadWeakAnchor: boolean;
} {
  const ignored: string[] = [];
  const qualityWarnings: string[] = [];
  const strong = findStrongIngredientAnchor(rawText);
  if (strong) {
    const candidate = sliceUntilStop(rawText, strong.end, ingredientStopPattern);
    const cleaned = cleanIngredientCandidate(candidate);
    if (cleaned.text) return { ...cleaned, hadStrongAnchor: true, hadWeakAnchor: false };
    ignored.push(...cleaned.ignored);
    qualityWarnings.push(...cleaned.qualityWarnings);
  }

  const weak = findWeakIngredientAnchor(rawText);
  if (weak) {
    const candidate = sliceUntilStop(rawText, weak.end, ingredientStopPattern);
    const cleaned = cleanIngredientCandidate(candidate);
    if (cleaned.text) return { ...cleaned, hadStrongAnchor: false, hadWeakAnchor: true };
    ignored.push(...cleaned.ignored);
    qualityWarnings.push(...cleaned.qualityWarnings);
  }

  const scored = pickBestIngredientLines(lines);
  return {
    text: scored.text,
    ignored: uniqueLines([...ignored, ...scored.ignored]),
    qualityWarnings: uniqueLines([...qualityWarnings, ...scored.qualityWarnings]),
    hadStrongAnchor: false,
    hadWeakAnchor: false
  };
}

function extractNutritionText(rawText: string, lines: string[]): string {
  const anchor = rawText.search(nutritionSectionAnchorPattern);
  if (anchor >= 0) {
    const section = sliceUntilStop(rawText, anchor, nutritionStopPattern);
    const cleaned = splitLines(section)
      .filter(isNutritionLineCandidate)
      .join('\n')
      .trim();
    return cleaned || (hasNutritionValueStructure(section) ? section.trim() : '');
  }
  return lines.filter(isNutritionLineCandidate).join('\n').trim();
}

function extractAllergenText(rawText: string, lines: string[]): string {
  const anchor = rawText.search(allergenAnchorPattern);
  if (anchor >= 0) {
    const section = sliceUntilStop(rawText, anchor, allergenStopPattern);
    const cleaned = splitLines(section)
      .filter(hasAllergenContext)
      .join('\n')
      .trim();
    return cleaned || (hasAllergenContext(section) ? section.trim() : '');
  }
  return lines
    .filter(hasAllergenContext)
    .join('\n')
    .trim();
}

function hasAllergenContext(line: string): boolean {
  if (!allergenKeywordPattern.test(line)) return false;
  return allergenLinePattern.test(line);
}

function extractFrontClaimText(lines: string[], ingredientText: string, nutritionText: string, allergenText: string): string {
  const keptText = normalizeCompact([ingredientText, nutritionText, allergenText].join('\n'));
  return lines
    .filter((line) => {
      const compact = normalizeCompact(line);
      if (!compact || keptText.includes(compact)) return false;
      if (!frontClaimTargetPattern.test(compact)) return false;
      if (productionNoisePattern.test(compact) || companyNoisePattern.test(compact) || standardNoisePattern.test(compact)) return false;
      return !productInfoNoisePattern.test(compact) || frontClaimTargetPattern.test(compact);
    })
    .map(cleanFrontClaimLine)
    .filter(Boolean)
    .slice(0, 3)
    .join('\n')
    .trim();
}

function cleanIngredientCandidate(candidate: string): IngredientTextFilterResult {
  const ignored: string[] = [];
  const repaired = repairIngredientOcrBreaks(candidate);
  const strippedCandidate = splitIngredientLines(repaired)
    .map(stripIngredientPrefix)
    .filter(Boolean)
    .join('\n')
    .trim();
  const candidateFilter = filterIngredientTextForReport(strippedCandidate);
  if (!candidateFilter.text && candidateFilter.qualityWarnings.length) return candidateFilter;
  const cleaned = splitIngredientLines(repaired)
    .map(stripIngredientPrefix)
    .filter(Boolean)
    .filter((line) => {
      if (isIngredientNoiseLine(line)) {
        if (!shouldSuppressIngredientIgnoredLine(line)) ignored.push(line);
        return false;
      }
      return true;
    })
    .join('\n')
    .replace(/(^|\n)[,，、;；]+/g, '$1')
    .replace(/[，,、;；\s]+$/g, '')
    .trim();
  const filtered = filterIngredientTextForReport(cleaned);
  return {
    text: filtered.text,
    ignored: uniqueLines([...ignored, ...filtered.ignored]),
    qualityWarnings: filtered.qualityWarnings
  };
}

function pickBestIngredientLines(lines: string[]): IngredientTextFilterResult {
  const ignored: string[] = [];
  const candidates = lines
    .map((line, index) => ({ line, index, score: scoreIngredientLine(line) }))
    .filter((item) => {
      if (isIngredientNoiseLine(item.line)) {
        if (!shouldSuppressIngredientIgnoredLine(item.line)) ignored.push(item.line);
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
  const filtered = filterIngredientTextForReport(candidates.join('\n').trim());
  return {
    text: filtered.text,
    ignored: uniqueLines([...ignored, ...filtered.ignored]),
    qualityWarnings: filtered.qualityWarnings
  };
}

export function filterIngredientTextForReport(text: string): IngredientTextFilterResult {
  const cleaned = normalizeText(text);
  if (!cleaned) return { text: '', ignored: [], qualityWarnings: [] };
  if (!isLowQualityIngredientOcrText(cleaned)) return { text: cleaned, ignored: [], qualityWarnings: [] };
  return {
    text: '',
    ignored: [cleaned],
    qualityWarnings: [ingredientOcrQualityWarning]
  };
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
  if (isLowQualityIngredientOcrText(text)) score -= 6;
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

function collectIgnoredLines(lines: string[], ingredientText: string, nutritionText: string, allergenText: string, frontClaimsText: string, productionDateText: string, productNameText: string, foodTypeText: string): string[] {
  const keptText = normalizeCompact([ingredientText, nutritionText, allergenText, frontClaimsText, productionDateText, productNameText, foodTypeText].join('\n'));
  return lines.filter((line) => {
    const compact = normalizeCompact(line);
    if (!compact) return false;
    if (keptText.includes(compact)) return false;
    return isIngredientNoiseLine(line);
  });
}

function isLinePartOfKeptSections(line: string, sections: string[]): boolean {
  const compact = normalizeCompact(line);
  if (!compact) return true;
  return sections.some((section) => normalizeCompact(section).includes(compact));
}

function isIngredientNoiseLine(line: string): boolean {
  const text = normalizeCompact(line);
  if (!text) return true;
  if (nutritionSectionAnchorPattern.test(text) || allergenAnchorPattern.test(text)) return true;
  if (ingredientAmountClaimPattern.test(text)) return true;
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

function shouldSuppressIngredientIgnoredLine(line: string): boolean {
  const text = normalizeCompact(line);
  return nutritionSectionAnchorPattern.test(text)
    || isNutritionLineCandidate(line)
    || allergenAnchorPattern.test(text);
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
  if (isLowQualityIngredientOcrText(text)) return false;
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
  if (!nutritionSectionAnchorPattern.test(text) && frontClaimTargetPattern.test(compact)) return false;
  if (nutritionSectionAnchorPattern.test(text)) return hasNutritionValueStructure(text);
  if (!nutritionUnitPattern.test(text)) return false;
  return nutritionNutrientPattern.test(text) || countNutritionNutrientHits(compact) >= 2;
}

function hasNutritionValueStructure(value: string): boolean {
  const text = normalizeText(value);
  const compact = normalizeCompact(text);
  if (!/\d/.test(compact)) return false;
  if (nutritionNutrientPattern.test(text) && nutritionUnitPattern.test(text)) return true;
  return countNutritionNutrientHits(compact) >= 2 && nutritionUnitPattern.test(text);
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
  return line.replace(/^\s*(?:配\s*料\s*(?:表|衰)?|护\s*料\s*(?:表)?|食品\s*配\s*料|原\s*料|ingredients?|成\s*[分份]\s*表?|表)\s*[:：-]?\s*/i, '').trim();
}

function repairIngredientOcrBreaks(text: string): string {
  return String(text || '')
    .replace(/姜\s*\n\s*黄粉/g, '姜黄粉')
    .replace(/脱脂乳\s*\n\s*粉/g, '脱脂乳粉')
    .replace(/谷氨酸\s*\n\s*钠/g, '谷氨酸钠')
    .replace(/木糖\s*\n\s*醇/g, '木糖醇')
    .replace(/果\s*\n\s*胶/g, '果胶')
    .replace(/明胶\s*\n\s*[(（]\s*来源于牛骨\s*[)）]/g, '明胶(来源于牛骨)')
    .replace(/5\s*[-－']?\s*肌苷酸二\s*\n\s*钠/g, "5'-肌苷酸二钠")
    .replace(/5\s*[一-]\s*呈味核苷酸二\s*\n\s*钠/g, "5'-呈味核苷酸二钠")
    .replace(/食用\s*\n\s*焦糖色/g, '焦糖色');
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

function cleanFrontClaimLine(line: string): string {
  return normalizeText(line)
    .replace(/^(?:包装文字|正面文字|卖点|宣称|标签声明)\s*[:：-]?\s*/i, '')
    .replace(/^O(?=糖|蔗糖)/i, '0')
    .replace(/[，,、;；\s]+$/g, '')
    .trim();
}

function cleanupTargetValue(line: string, prefix: RegExp): string {
  return normalizeText(line)
    .replace(prefix, '')
    .replace(/[，,、;；\s]+$/g, '')
    .trim()
    .slice(0, 40);
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

function isLowQualityIngredientOcrText(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const compact = normalizeCompact(normalized);
  const chineseCount = (compact.match(/[\u4e00-\u9fff]/g) || []).length;
  if (chineseCount > 0) return false;
  const latinLetters = normalized.match(/[A-Za-z]/g) || [];
  if (latinLetters.length < 40) return false;
  const latinTokens = normalized.match(/[A-Za-z]{3,}/g) || [];
  if (latinTokens.length < 2) return false;
  const separatorCount = (normalized.match(/[、，,;；]/g) || []).length;
  const longTokenCount = latinTokens.filter((token) => token.length >= 18).length;
  const veryLongTokenCount = latinTokens.filter((token) => token.length >= 28).length;
  const averageTokenLength = latinTokens.reduce((sum, token) => sum + token.length, 0) / latinTokens.length;
  const readableHits = countEnglishIngredientHits(normalized);
  if (latinLetters.length >= 80 && longTokenCount >= 3 && separatorCount < 5) return true;
  if (veryLongTokenCount >= 1 && longTokenCount >= 2 && separatorCount < 3) return true;
  if (veryLongTokenCount >= 1 && readableHits < 4 && separatorCount < 3) return true;
  return latinTokens.length >= 4 && averageTokenLength >= 14 && separatorCount < 3 && readableHits < 4;
}

function countEnglishIngredientHits(text: string): number {
  const compact = normalizeCompact(text).toLowerCase();
  return englishIngredientTerms.reduce((count, term) => count + (compact.includes(term) ? 1 : 0), 0);
}

function countNutritionNutrientHits(text: string): number {
  return nutritionNutrientTerms.reduce((count, term) => count + (text.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0);
}

function uniqueLines(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].slice(0, 12);
}

const strongIngredientAnchorPattern = /配\s*料\s*(?:表|衰)\s*[:：]?|配\s*料\s*[:：]|食品\s*配\s*料\s*[:：]?|原\s*料\s*[:：]|ingredients?\s*[:：]?/i;
const looseIngredientAnchorGlobalPattern = /配\s*料|护\s*料|原\s*料/g;
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
const ingredientAmountClaimPattern = /(?:添加量|含量)[≥>=]?\s*\d+(?:\.\d+)?\s*(?:g|克|mg|毫克|ml|mL|毫升|%|g\/L|mg\/L)/i;
const adNoisePattern = /0蔗糖|零蔗糖|低脂|高蛋白|非油炸|无添加|天然|健\s*康|新鲜|美味|儿童优选|轻负担|饱腹/;
const frontClaimTargetPattern = /0糖|O糖|零糖|无糖|低糖|少糖|0蔗糖|O蔗糖|零蔗糖|无蔗糖|不添加蔗糖|0脂|O脂|零脂|低脂|脱脂|少油|减\s*\d+(?:\.\d+)?\s*%?\s*脂肪|非油炸|高蛋白|低钠|减盐|少盐|无添加|不添加|膳食纤维|粗粮|全麦|high\s*protein|low\s*fat|no\s*fat|zero\s*sugar|sugar\s*free/i;
const invalidLinePattern = /^(?:\d+|[A-Z0-9\-./]+|[^\u4e00-\u9fa5A-Za-z0-9]+)$/i;
const commonIngredientTerms = ['水', '白砂糖', '食用盐', '食盐', '植物油', '精炼植物油', '氢化菜籽油', '果葡糖浆', '食用香精', '葡萄糖浆', '麦芽糖浆', '大豆', '黄豆', '乳粉', '脱脂乳粉', '生牛乳', '浓缩牛奶蛋白', '明胶', '小麦', '小麦粉', '淀粉', '鸡蛋', '牛奶', '奶粉', '草菇', '姜黄粉', '咖喱粉', '味精', '谷氨酸钠', '焦糖色', '木糖醇', '聚葡萄糖', '果胶', '黄原胶', '三氯蔗糖'];
const englishIngredientTerms = ['water', 'sugar', 'salt', 'flour', 'milk', 'egg', 'oil', 'cheese', 'vanilla', 'xanthan', 'gum', 'wheat', 'soy', 'cocoa', 'butter', 'cream', 'oat', 'rice', 'corn', 'starch'];
const ingredientOcrQualityWarning = '配料表 OCR 疑似粘连乱码，未作为购买判断依据；请补拍清晰配料表或手动补充。';
const nutritionNutrientTerms = ['energy', 'calories', 'protein', 'fat', 'carbohydrate', 'sugar', 'sugars', 'sodium', 'salt', '能量', '热量', '熱量', '蛋白质', '蛋白質', '脂肪', '碳水化合物', '碳水', '糖', '钠', '鈉', '盐', '鹽'];
const commonIngredientPattern = /水|白砂糖|食用盐|食盐|植物油|精炼植物油|氢化菜籽油|果葡糖浆|食用香精|葡萄糖浆|麦芽糖浆|大豆|黄豆|乳粉|脱脂乳粉|生牛乳|浓缩牛奶蛋白|明胶|小麦|小麦粉|淀粉|鸡蛋|牛奶|奶粉|草菇|姜黄粉|咖喱粉|味精|谷氨酸钠|焦糖色|木糖醇|聚葡萄糖|果胶|黄原胶|三氯蔗糖/;
