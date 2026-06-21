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
    .find((line) => line && !blockedProductLinePattern.test(line));
  return candidate || '';
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
    .trim()
    .slice(0, 40);
}

function isClassification(input: unknown): input is OcrSectionClassification {
  return Boolean(input && typeof input === 'object' && 'productInfoText' in input && 'sections' in input);
}

const blockedProductLinePattern = /配料|营养成分|能量|蛋白质|脂肪|碳水|钠|生产日期|保质期|贮存|储存|地址|电话|执行标准|食品生产许可证|条码|二维码/i;
