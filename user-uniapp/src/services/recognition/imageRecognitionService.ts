import type {
  LabelType,
  LocalImageAsset,
  ProductDetectedType,
  ProductRecognitionContentType,
  ProductRecognitionInfo,
  ProductRecognitionSource
} from '@/types';
import { buildManualOcrResult } from '@/services/api/ocr';
import { classifyLabelText } from '@/utils/labelClassifier';
import type { LabelTextExtraction } from '@/utils/labelTextExtractor';
import { decodeBarcodeFromImage, extractPrintedProductCode, classifyQrContent, type BarcodeDetection } from './barcodeService';
import { recognizeFoodLabelText, emptyOcrExtraction, type OcrRecognitionResult } from './ocrService';
import { lookupProductInfo, type ProductLookupResult } from './productLookupService';

export interface ProductImageRecognitionResult {
  image: LocalImageAsset;
  scanInfo: ProductRecognitionInfo;
  ocrResult: OcrRecognitionResult;
  extraction: LabelTextExtraction;
  labelType: LabelType;
  lookup: ProductLookupResult;
  barcodeDetections: BarcodeDetection[];
  message: string;
}

export async function recognizeProductImage(asset: LocalImageAsset): Promise<ProductImageRecognitionResult> {
  const recognizedAt = new Date().toISOString();
  const barcodeDetections = await decodeBarcodeFromImage(asset);
  const ocrResult = await recognizeWithFallback(asset);
  const printedCode = extractPrintedProductCode(ocrResult.rawText);
  const primaryBarcode = choosePrimaryBarcode(barcodeDetections);
  const hasLabelText = Boolean(ocrResult.extraction.ingredientText.trim() || ocrResult.extraction.nutritionText.trim());
  const scanInfo = buildScanInfo({
    asset,
    recognizedAt,
    primaryBarcode,
    printedCode,
    ocrText: ocrResult.rawText,
    extraction: ocrResult.extraction,
    lookup: undefined
  });
  const lookup = await lookupProductInfo(scanInfo, { hasLabelText });
  const mergedExtraction = mergeLookupIntoExtraction(ocrResult.extraction, lookup);
  const mergedScanInfo = buildScanInfo({
    asset,
    recognizedAt,
    primaryBarcode,
    printedCode,
    ocrText: ocrResult.rawText,
    extraction: mergedExtraction,
    lookup
  });
  const labelType = toLabelType(mergedScanInfo.detectedType, mergedExtraction);
  return {
    image: asset,
    scanInfo: mergedScanInfo,
    ocrResult,
    extraction: mergedExtraction,
    labelType,
    lookup,
    barcodeDetections,
    message: buildRecognitionMessage(mergedScanInfo, mergedExtraction, lookup)
  };
}

async function recognizeWithFallback(asset: LocalImageAsset): Promise<OcrRecognitionResult> {
  try {
    return await recognizeFoodLabelText(asset);
  } catch {
    return {
      ocr: buildManualOcrResult(),
      rawText: '',
      extraction: emptyOcrExtraction(),
      detectedLabelType: 'unknown_label'
    };
  }
}

function buildScanInfo(input: {
  asset: LocalImageAsset;
  recognizedAt: string;
  primaryBarcode?: BarcodeDetection;
  printedCode: string;
  ocrText: string;
  extraction: LabelTextExtraction;
  lookup?: ProductLookupResult;
}): ProductRecognitionInfo {
  const sources = buildSources(input.primaryBarcode, input.ocrText, input.lookup);
  const normalizedCode = input.primaryBarcode?.normalizedCode || input.printedCode || '';
  const qrContent = input.primaryBarcode?.kind === 'qrcode' ? input.primaryBarcode.rawValue : '';
  const detectedType = resolveDetectedType({
    primaryBarcode: input.primaryBarcode,
    printedCode: input.printedCode,
    extraction: input.extraction
  });
  const contentType = resolveContentType({
    detectedType,
    primaryBarcode: input.primaryBarcode,
    normalizedCode,
    extraction: input.extraction
  });
  return {
    imageId: input.asset.id,
    detectedType,
    rawContent: buildRawContent(input.primaryBarcode, input.ocrText, input.extraction),
    ocrText: input.ocrText,
    normalizedCode,
    qrContent,
    contentType,
    productName: input.extraction.productNameText || input.lookup?.productName || '',
    brand: input.lookup?.brand || extractBrandFromText(input.ocrText),
    sources,
    recognizedAt: input.recognizedAt,
    usedAiSearch: Boolean(input.lookup?.usedAiSearch),
    aiNotice: input.lookup?.aiNotice || '',
    aiSearchSummary: input.lookup?.aiSearchSummary,
    aiSearchErrorCode: input.lookup?.errorCode
  };
}

export function mergeLookupIntoExtraction(extraction: LabelTextExtraction, lookup: ProductLookupResult): LabelTextExtraction {
  const canReuseLabelText = lookup.fromHistory || lookup.usedAiSearch;
  return {
    ...extraction,
    productNameText: extraction.productNameText || lookup.productName,
    ingredientText: extraction.ingredientText || (canReuseLabelText ? lookup.ingredientsText : ''),
    nutritionText: extraction.nutritionText || (canReuseLabelText ? lookup.nutritionText : ''),
    ignoredText: [
      ...extraction.ignoredText,
      lookup.usedAiSearch && !lookup.ingredientsText && !lookup.nutritionText
        ? 'AI 搜索未找到可用配料表或营养成分表'
        : '',
      lookup.usedAiSearch && (lookup.ingredientsText || lookup.nutritionText)
        ? 'AI 搜索返回了公开配料或营养线索，已用于生成参考报告，但不是包装实拍 OCR'
        : ''
    ].filter(Boolean)
  };
}

function choosePrimaryBarcode(detections: BarcodeDetection[]): BarcodeDetection | undefined {
  return detections.find((item) => item.kind === 'barcode' && item.normalizedCode)
    || detections.find((item) => item.kind === 'qrcode')
    || detections[0];
}

function resolveDetectedType(input: {
  primaryBarcode?: BarcodeDetection;
  printedCode: string;
  extraction: LabelTextExtraction;
}): ProductDetectedType {
  if (input.extraction.ingredientText.trim()) return 'ingredient_list';
  if (input.extraction.nutritionText.trim()) return 'nutrition_facts';
  if (input.primaryBarcode?.kind === 'barcode' && input.primaryBarcode.normalizedCode) return 'barcode';
  if (input.primaryBarcode?.kind === 'qrcode') return 'qrcode';
  if (input.printedCode) return 'numeric_code';
  return 'unknown';
}

function resolveContentType(input: {
  detectedType: ProductDetectedType;
  primaryBarcode?: BarcodeDetection;
  normalizedCode: string;
  extraction: LabelTextExtraction;
}): ProductRecognitionContentType {
  if (input.detectedType === 'ingredient_list') return 'ingredient_list';
  if (input.detectedType === 'nutrition_facts') return 'nutrition_facts';
  if (input.primaryBarcode?.kind === 'qrcode') return classifyQrContent(input.primaryBarcode.rawValue);
  if (input.normalizedCode) return 'product_code';
  return 'unknown';
}

function buildSources(primaryBarcode: BarcodeDetection | undefined, ocrText: string, lookup?: ProductLookupResult): ProductRecognitionSource[] {
  const sources: ProductRecognitionSource[] = [];
  if (primaryBarcode?.kind === 'barcode') sources.push('条码识别');
  if (primaryBarcode?.kind === 'qrcode') sources.push('二维码识别');
  if (ocrText.trim()) sources.push('包装实拍 OCR');
  if (lookup?.sources.length) sources.push(...lookup.sources);
  return Array.from(new Set(sources));
}

function buildRawContent(primaryBarcode: BarcodeDetection | undefined, ocrText: string, extraction: LabelTextExtraction): string {
  if (primaryBarcode?.rawValue) return primaryBarcode.rawValue;
  const summary = [
    extraction.productNameText,
    extraction.ingredientText,
    extraction.nutritionText,
    extraction.frontClaimsText
  ].filter(Boolean).join('\n');
  return (summary || ocrText).trim().slice(0, 220);
}

function toLabelType(detectedType: ProductDetectedType, extraction: LabelTextExtraction): LabelType {
  if (detectedType === 'ingredient_list') return 'ingredient_list';
  if (detectedType === 'nutrition_facts') return 'nutrition_facts';
  if (extraction.frontClaimsText.trim()) return 'front_claims';
  if (detectedType === 'barcode' || detectedType === 'qrcode' || detectedType === 'numeric_code') return 'barcode_or_product';
  const local = classifyLabelText(buildRawContent(undefined, '', extraction));
  return local.labelType || 'unknown_label';
}

function buildRecognitionMessage(scanInfo: ProductRecognitionInfo, extraction: LabelTextExtraction, lookup: ProductLookupResult): string {
  if (extraction.ingredientText.trim()) return '已识别到配料表，会优先按配料生成报告。';
  if (extraction.nutritionText.trim()) return '已识别到营养成分表，会先整理营养重点。';
  if (lookup.usedAiSearch && (lookup.ingredientsText || lookup.nutritionText)) return '已通过 AI 联网搜索找到公开标签线索，正在生成参考报告。';
  if (lookup.usedAiSearch && (lookup.productName || lookup.brand)) return '已查到商品名称线索，未找到公开配料或营养信息时会生成信息不足报告。';
  if (scanInfo.normalizedCode || scanInfo.qrContent) return '已识别到商品身份信息，还需要配料表或营养表才能给出完整判断。';
  return '暂未判断出图片内容，请重拍配料表、营养成分表或商品条码区域。';
}

function extractBrandFromText(text: string): string {
  return String(text || '').match(/(?:品牌|商标)[:：\s]*([^\n，,。；;]{2,24})/)?.[1]?.trim() || '';
}
