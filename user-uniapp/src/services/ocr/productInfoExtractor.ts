import type { NormalizedOcrResult } from '@/utils/ocrAdapter';
import type { OcrSectionClassification } from './ocrSectionClassifier';
import { classifyOcrSections } from './ocrSectionClassifier';

export interface ProductInfoExtractionResult {
  productName: string;
  brand: string;
  specification: string;
  productInfoText: string;
  codeInfo: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export function extractProductInfo(input: OcrSectionClassification | NormalizedOcrResult | string): ProductInfoExtractionResult {
  const classification = isClassification(input) ? input : classifyOcrSections(input);
  const text = classification.productInfoText || classification.layout.rawText;
  const productName = extractLabeledValue(text, /(?:品\s*名|产品名称|商品名称|食品名称)\s*[:：]?\s*([^\n，,。；;]{2,40})/i)
    || pickLikelyProductName(classification);
  const brand = extractLabeledValue(text, /(?:品牌|商标)\s*[:：]?\s*([^\n，,。；;]{2,28})/i)
    || extractLabeledValue(classification.layout.rawText, /(?:品牌|商标)\s*[:：]?\s*([^\n，,。；;]{2,28})/i);
  const specification = extractLabeledValue(classification.layout.rawText, /(?:规格|净含量|净重)\s*[:：]?\s*([^\n，,。；;]{1,24})/i);
  const reasons = [
    ...classification.reasons,
    productName ? 'product_name_detected' : 'product_name_uncertain',
    brand ? 'brand_detected' : '',
    specification ? 'specification_detected' : ''
  ].filter(Boolean);
  return {
    productName,
    brand,
    specification,
    productInfoText: classification.productInfoText,
    codeInfo: classification.codeInfoText || classification.normalizedCode,
    confidence: productName ? (brand || specification ? 'high' : 'medium') : 'low',
    reasons
  };
}

function pickLikelyProductName(classification: OcrSectionClassification): string {
  const candidate = classification.sections
    .filter((section) => section.category === 'product')
    .flatMap((section) => section.lines)
    .map((line) => cleanProductName(line.text))
    .find(isStructuredProductNameLine);
  if (candidate) return candidate;

  return splitProductCandidateLines(classification.layout.rawText)
    .map(cleanProductName)
    .find(isLooseProductNameLine) || '';
}

function extractLabeledValue(text: string, pattern: RegExp): string {
  const match = String(text || '').match(pattern);
  return cleanProductName(match?.[1] || '');
}

function cleanProductName(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/^\s*(?:品\s*名|产品名称|商品名称|食品名称|品牌|商标|规格|净含量|净重)\s*[:：]?\s*/i, '')
    .replace(/[，,、;；\s]+$/g, '')
    .trim();
}

function splitProductCandidateLines(value: string): string[] {
  return String(value || '')
    .normalize('NFKC')
    .split(/\r?\n|[\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function isLooseProductNameLine(value: string): boolean {
  const text = cleanProductName(value);
  if (text.length < 3 || text.length > 40) return false;
  if (blockedProductLinePattern.test(text)) return false;
  if (/^(?:高纤维|低负担|低糖|少糖|无糖|零糖|0糖|高蛋白|低脂|低钠|无添加)$/i.test(text)) return false;
  return looseProductNamePattern.test(text);
}

function isStructuredProductNameLine(value: string): boolean {
  const text = cleanProductName(value);
  if (text.length < 2 || text.length > 60) return false;
  if (blockedProductLinePattern.test(text)) return false;
  if (/^(?:高纤维|低负担|低糖|少糖|无糖|零糖|0糖|高蛋白|低脂|低钠|无添加)$/i.test(text)) return false;
  return true;
}

function isClassification(input: unknown): input is OcrSectionClassification {
  return Boolean(input && typeof input === 'object' && 'productInfoText' in input && 'sections' in input);
}

const blockedProductLinePattern = /配料|营养成分|能量|蛋白质|脂肪|碳水|钠|生产日期|保质期|贮存|储存|地址|电话|执行标准|食品生产许可证|条码|二维码/i;
const looseProductNamePattern = /饮料|饮品|酸奶|牛奶|乳酸菌|奶昔|果汁|茶|咖啡|谷物|能量棒|饼干|蛋糕|面包|麦片|燕麦|坚果|零食|薯片|巧克力|糖果|酱|调味|beverage|drink|yogurt|milk|juice|tea|coffee|bar|cookie|biscuit|cake|bread|cereal|snack/i;
