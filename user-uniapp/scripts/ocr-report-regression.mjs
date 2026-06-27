import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const root = process.cwd();
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: {
    disabled: true,
    entries: []
  },
  define: {
    __COMPLENS_USER_API_BASE_URL__: JSON.stringify('')
  },
  resolve: {
    alias: {
      '@': resolve(root, 'src')
    }
  }
});

try {
  const { extractLabelText } = await server.ssrLoadModule('/src/utils/labelTextExtractor.ts');
  const { buildLabelReport } = await server.ssrLoadModule('/src/utils/reportBuilder.ts');
  const { buildLabelReportWithAdapter } = await server.ssrLoadModule('/src/services/api/labels.ts');
  const { buildLocalLabelAnalysis } = await server.ssrLoadModule('/src/utils/localLabelAnalysis.ts');
  const { normalizeOcrResult, extractOcrSourceLine, extractOcrTextSnippet } = await server.ssrLoadModule('/src/utils/ocrAdapter.ts');
  const { parseNutritionText } = await server.ssrLoadModule('/src/utils/nutritionParser.ts');
  const { classifyOcrSections } = await server.ssrLoadModule('/src/services/ocr/ocrSectionClassifier.ts');
  const { extractIngredients } = await server.ssrLoadModule('/src/services/ocr/ingredientsExtractor.ts');
  const { extractNutrition } = await server.ssrLoadModule('/src/services/ocr/nutritionExtractor.ts');
  const barcodeService = await server.ssrLoadModule('/src/services/recognition/barcodeService.ts');
  const imageRecognitionService = await server.ssrLoadModule('/src/services/recognition/imageRecognitionService.ts');
  const productLookupService = await server.ssrLoadModule('/src/services/recognition/productLookupService.ts');
  const scanStore = await server.ssrLoadModule('/src/stores/scanStore.ts');
  const autoGeneratePolicy = await server.ssrLoadModule('/src/services/recognition/autoGeneratePolicy.ts');
  const manualInputNormalizer = await server.ssrLoadModule('/src/utils/manualInputNormalizer.ts');
  const reportIdentity = await server.ssrLoadModule('/src/utils/reportIdentity.ts');
  const attentionStore = await server.ssrLoadModule('/src/stores/attentionStore.ts');

  assertSourceLineBoundaries({ extractOcrSourceLine, extractOcrTextSnippet });
  assertExtractionBoundaries(extractLabelText, normalizeOcrResult);
  assertMultiRegionOcrBoundaries({ normalizeOcrResult, classifyOcrSections, extractIngredients, extractNutrition });
  assertNutritionParsingBoundaries(parseNutritionText);
  assertManualInputNormalization(manualInputNormalizer, parseNutritionText);
  assertReportBoundaries(buildLabelReport, buildLocalLabelAnalysis);
  assertReportIdentity(reportIdentity);
  await assertAdapterReportBoundaries(buildLabelReport, buildLabelReportWithAdapter);
  assertRecognitionBoundaries(barcodeService);
  await assertAttentionNormalization(attentionStore);
  assertLookupMergeBoundaries(imageRecognitionService);
  await assertProductLookupHistoryBoundaries(productLookupService, scanStore);
  assertAutoGeneratePolicy(autoGeneratePolicy);
  assertCaptureAutoGenerateWiring();

  console.log('OCR/report regression passed: 47 scenarios checked.');
} finally {
  await server.close();
}

function assertSourceLineBoundaries({ extractOcrSourceLine, extractOcrTextSnippet }) {
  const sourceLine = extractOcrSourceLine([
    '配料表：水、白砂糖、浓缩果汁',
    '营养成分表 每100ml 糖 12.8g 钠 48mg'
  ].join('\n'), ['糖 12.8g']);
  assertEqual(sourceLine.found, true, 'source line lookup should mark an exact risk line as found');
  assertEqual(sourceLine.lineNumber, 2, 'source line lookup should preserve one-based line number');
  assertEqual(sourceLine.text, '营养成分表 每100ml 糖 12.8g 钠 48mg', 'source line lookup should preserve the full source line');

  const snippet = extractOcrTextSnippet('这是一段没有命中词但明显超过十个字的完整标签文字', ['不存在'], 10);
  assert(snippet.endsWith('...'), 'unmatched OCR snippets should make truncation explicit');
  assert(snippet.length <= 10, 'unmatched OCR snippets should respect the caller preview length');
}

function assertCaptureAutoGenerateWiring() {
  const captureSource = readFileSync(resolve(root, 'src/pages/capture/index.vue'), 'utf8');
  const labelsSource = readFileSync(resolve(root, 'src/services/api/labels.ts'), 'utf8');
  const barcodeSource = readFileSync(resolve(root, 'src/services/recognition/barcodeService.ts'), 'utf8');
  const toastSource = readFileSync(resolve(root, 'src/components/Toast.vue'), 'utf8');
  assertIncludes(captureSource, 'const autoGenerateAfterOcr = ref(true);', 'capture should attempt auto report generation by default');
  assertIncludes(captureSource, 'hasRecognitionResult.value', 'capture should allow any recognition result to become an information-insufficient report');
  assert(!captureSource.includes('shouldReturnToPick'), 'capture should not return to pick after recognition ends');
  assertIncludes(captureSource, 'async function generateAutoResult()', 'capture should centralize automatic report generation recovery');
  assertIncludes(captureSource, "if (!generated) stage.value = 'pick';", 'failed automatic report generation should return to pick state');
  assertIncludes(captureSource, 'buildInsufficientRecognitionInfo', 'recognition failure should synthesize an insufficient report source');
  assertIncludes(captureSource, "stage.value = 'manualInput';", 'manual entry should use explicit manual input state instead of confirmation state');
  assertIncludes(captureSource, 'buildReportInputParts', 'capture should normalize auto-report fields before report generation');
  assertIncludes(captureSource, "extractionConfidence.value === 'low'", 'low-confidence auto-recognition should be detected before report generation');
  assertIncludes(captureSource, '低置信配料线索', 'low-confidence OCR ingredient text should be retained only as an unconfirmed clue');
  assertIncludes(captureSource, "manualOverride.value && extractionSourceType.value === 'manual'", 'manual override should not promote auto OCR confidence');
  assert(!captureSource.includes("stage.value = 'confirm'"), 'capture should not use confirmation stage after recognition changes');
  assertIncludes(barcodeSource, 'readStoredImageBlob', 'barcode decoder should read H5 images persisted outside localStorage');
  assertIncludes(toastSource, "emit('dismiss')", 'toast should clear parent message after auto-dismiss so repeated messages can show');
  assertIncludes(labelsSource, 'sources.filter((item) => !isDefaultOcrConfirmedSource(item))', 'adapter should remove backend default OCR source for AI/identity reports');
  assertIncludes(labelsSource, "['captured_ingredient', 'captured_nutrition', 'captured_product'].includes(sourceMeta.sourceType)", 'adapter should replace backend default OCR source for captured OCR reports');
  assertIncludes(labelsSource, "detail.includes('用户确认后的食品标签文本')", 'adapter should filter backend OCR source even when sourceType is missing');
  assertIncludes(labelsSource, "sourceMeta?.sourceType === 'ai_search_product_label'", 'adapter should branch AI label source');
  assertIncludes(labelsSource, "sourceMeta?.sourceType === 'product_identity'", 'adapter should branch product identity source');
}

async function assertAdapterReportBoundaries(buildLabelReport, buildLabelReportWithAdapter) {
  const source = sourceMeta({
    sourceType: 'captured_ingredient',
    sourceLabel: '用户拍摄的配料表',
    description: '本次分析依据：你拍摄的配料表 OCR 识别文字；请结合包装文字确认。',
    fromUserCapture: true,
    fromManualInput: false,
    ingredientText: '燕麦片、白砂糖',
    inputSourceType: 'ocr'
  });
  const backendReport = buildLabelReport({
    productName: '后端返回样本',
    rawText: '配料表：燕麦片、白砂糖',
    ingredients: [
      { id: 'ingredient-1', rawText: '燕麦片', normalizedText: '燕麦片', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '白砂糖', normalizedText: '白砂糖', isSubIngredient: false, isUnknown: false }
    ],
    matches: [],
    nutrition: [],
    attention: attention(),
    labelType: 'ingredient_list',
    sourceMeta: source
  });
  backendReport.sources = [
    {
      label: 'OCR / 手动确认文本',
      detail: '结果基于用户确认后的食品标签文本生成，OCR 识别文字不是权威来源。',
      sourceType: 'ocr_input'
    }
  ];
  const previousUni = globalThis.uni;
  globalThis.uni = {
    getStorageSync: () => '',
    setStorageSync: () => undefined,
    removeStorageSync: () => undefined,
    request(options) {
      if (String(options.url || '').endsWith('/food/analyze')) {
        options.fail?.({ errMsg: 'mock food analysis unavailable' });
        return;
      }
      if (String(options.url || '').endsWith('/reports/label')) {
        options.success?.({ statusCode: 200, data: backendReport });
        return;
      }
      options.fail?.({ errMsg: 'unexpected request' });
    }
  };
  try {
    const report = await buildLabelReportWithAdapter({
      productName: '后端返回样本',
      rawText: '配料表：燕麦片、白砂糖',
      ingredients: backendReport.ingredientSection.items.map((item, index) => ({
        id: `ingredient-${index}`,
        rawText: item.term,
        normalizedText: item.normalizedText,
        isSubIngredient: false,
        isUnknown: false
      })),
      matches: [],
      nutrition: [],
      attention: attention(),
      labelType: 'ingredient_list',
      sourceMeta: source
    });
    assert(report.sources.some((item) => item.label === '包装 OCR 识别文本'), 'adapter should add captured OCR source after backend success');
    assert(!report.sources.some((item) => item.detail.includes('用户确认后的食品标签文本')), 'adapter should remove backend user-confirmed OCR wording after backend success');
  } finally {
    globalThis.uni = previousUni;
  }
}

function assertAutoGeneratePolicy(autoGeneratePolicy) {
  const base = {
    enabled: true,
    canGenerate: true,
    hasAnyLabelText: true,
    hasRecognizedIdentity: false,
    hasRecognitionResult: true,
    hasAiSearchLabelText: false,
    isNutritionOnly: false,
    isFrontOnly: false,
    confidence: 'high',
    sourceType: 'ocr',
    ocrMode: 'success'
  };
  assert(autoGeneratePolicy.shouldAutoGenerateRecognitionResult(base), 'clear OCR label text should auto-generate report');
  assert(!autoGeneratePolicy.shouldAutoGenerateRecognitionResult({ ...base, enabled: false }), 'disabled auto mode should not auto-generate');
  assert(autoGeneratePolicy.shouldAutoGenerateRecognitionResult({ ...base, confidence: 'low', isNutritionOnly: false, isFrontOnly: false }), 'low-confidence image recognition should generate an information-insufficient report instead of confirmation');
  assert(!autoGeneratePolicy.shouldAutoGenerateRecognitionResult({ ...base, sourceType: 'manual' }), 'manual input should stay on manual input page');
  assert(autoGeneratePolicy.shouldAutoGenerateRecognitionResult({
    ...base,
    hasAnyLabelText: false,
    hasRecognizedIdentity: true,
    hasRecognitionResult: true,
    confidence: 'low',
    ocrMode: 'fallback'
  }), 'low-confidence identity-only result should generate an information-insufficient report');
  assert(autoGeneratePolicy.shouldAutoGenerateRecognitionResult({
    ...base,
    hasAnyLabelText: false,
    hasRecognizedIdentity: false,
    hasRecognitionResult: true,
    confidence: 'low',
    ocrMode: 'fallback'
  }), 'empty image recognition result should still generate an information-insufficient report');
  assert(!autoGeneratePolicy.shouldAutoGenerateRecognitionResult({
    ...base,
    hasAnyLabelText: false,
    hasRecognizedIdentity: false,
    hasRecognitionResult: false
  }), 'auto policy should require at least one image recognition result or label clue');
  assert(autoGeneratePolicy.shouldAutoGenerateRecognitionResult({
    ...base,
    hasAiSearchLabelText: true,
    confidence: 'low',
    ocrMode: 'fallback'
  }), 'AI public label clues may auto-generate a reference report');
}

function assertManualInputNormalization(manualInputNormalizer, parseNutritionText) {
  const normalized = manualInputNormalizer.normalizeManualInputParts({
    productNameText: '',
    foodTypeText: '',
    ingredientText: [
      '低糖乳酸菌饮料',
      '配料表：水、赤藓糖醇、脱脂乳粉、乳酸菌',
      '营养成分表 每100ml 能量 85kJ 蛋白质 2.9g 脂肪 0g 碳水化合物 3.1g 糖 2.5g 钠 42mg'
    ].join('\n'),
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    productionDateText: '',
    unconfirmedText: []
  });
  assertEqual(normalized.productNameText, '低糖乳酸菌饮料', 'manual mixed paste should preserve product name');
  assertIncludes(normalized.ingredientText, '赤藓糖醇', 'manual mixed paste should preserve ingredient text');
  assert(!normalized.ingredientText.includes('能量 85kJ'), 'manual mixed paste should remove nutrition table from ingredient text');
  assertIncludes(normalized.nutritionText, '钠 42mg', 'manual mixed paste should move sodium number to nutrition text');
  const fields = parseNutritionText(normalized.nutritionText);
  const sodium = fields.find((field) => field.key === 'sodium');
  const sugar = fields.find((field) => field.key === 'sugar');
  assertEqual(sodium?.value, '42', 'manual mixed nutrition should parse sodium 42mg');
  assertEqual(sugar?.value, '2.5', 'manual mixed nutrition should parse sugar 2.5g');
}

function assertReportIdentity(reportIdentity) {
  const first = minimalReport({
    id: 'first',
    productName: '高糖乳酸菌饮料',
    code: '6901234567890',
    ingredientText: '配料表：水、白砂糖、乳粉、乳酸菌',
    nutrition: { sugar: '12.8', carbohydrate: '15.2', sodium: '80' }
  });
  const same = minimalReport({
    id: 'second',
    productName: '高糖乳酸菌饮料',
    code: '6901234567890',
    ingredientText: '配料表：水、白砂糖、乳粉、乳酸菌',
    nutrition: { sugar: '12.8', carbohydrate: '15.2', sodium: '80' }
  });
  const other = minimalReport({
    id: 'third',
    productName: '橙味饮料',
    code: '6900000000001',
    ingredientText: '配料表：水、浓缩橙汁、柠檬酸',
    nutrition: { sugar: '3.1', carbohydrate: '4.0', sodium: '18' }
  });
  assert(reportIdentity.isSameProductForCompare(first, same), 'same barcode/name/label should be blocked as self-comparison');
  assert(!reportIdentity.isSameProductForCompare(first, other), 'different comparable products should remain eligible for comparison');
}

function assertLookupMergeBoundaries(imageRecognitionService) {
  const extraction = emptyExtraction();
  const aiLookup = lookupResult({
    usedAiSearch: true,
    fromHistory: false,
    productName: 'AI 只作名称线索',
    ingredientsText: '配料表：水、白砂糖',
    nutritionText: '营养成分表 能量 200kJ'
  });
  const aiMerged = imageRecognitionService.mergeLookupIntoExtraction(extraction, aiLookup);
  assertEqual(aiMerged.productNameText, 'AI 只作名称线索', 'AI lookup may fill product-name clue');
  assertIncludes(aiMerged.ingredientText, '白砂糖', 'AI lookup ingredients may feed a reference report');
  assertIncludes(aiMerged.nutritionText, '200kJ', 'AI lookup nutrition may feed a reference report');
  assert(aiMerged.ignoredText.some((item) => item.includes('不是包装实拍 OCR')), 'AI lookup label text should be marked as non-OCR evidence');

  const cachedMerged = imageRecognitionService.mergeLookupIntoExtraction(extraction, lookupResult({
    fromHistory: true,
    productName: '历史确认商品',
    ingredientsText: '配料表：生牛乳、乳酸菌',
    nutritionText: '营养成分表 能量 300kJ'
  }));
  assertIncludes(cachedMerged.ingredientText, '生牛乳', 'history cache may reuse previously confirmed ingredient text');
  assertIncludes(cachedMerged.nutritionText, '300kJ', 'history cache may reuse previously confirmed nutrition text');
}

async function assertProductLookupHistoryBoundaries(productLookupService, scanStore) {
  const aiCached = await withRecognitionHistory([
    recognitionHistoryItem({
      id: 'ai-cache',
      productName: 'AI 历史商品',
      ingredientsText: '配料表：AI 缓存配料',
      nutritionText: '营养成分表 能量 999kJ',
      source: ['DeepSeek 联网搜索'],
      usedAiSearch: true
    })
  ], () => productLookupService.lookupProductInfo(recognitionInfo({
    productName: 'AI 历史商品',
    normalizedCode: '',
    sources: []
  }), { hasLabelText: false }));
  assertEqual(aiCached.productName, 'AI 历史商品', 'AI history cache may reuse product identity');
  assertEqual(aiCached.ingredientsText, '', 'AI history cache must not reuse ingredient text');
  assertEqual(aiCached.nutritionText, '', 'AI history cache must not reuse nutrition text');
  assertEqual(aiCached.usedAiSearch, false, 'AI history cache should not mark reused identity as fresh AI label evidence');

  const confirmedCached = await withRecognitionHistory([
    recognitionHistoryItem({
      id: 'confirmed-cache',
      productName: '已确认历史商品',
      ingredientsText: '配料表：生牛乳、乳酸菌',
      nutritionText: '营养成分表 能量 300kJ',
      source: ['包装实拍 OCR'],
      usedAiSearch: false
    })
  ], () => productLookupService.lookupProductInfo(recognitionInfo({
    productName: '已确认历史商品',
    normalizedCode: '',
    sources: []
  }), { hasLabelText: false }));
  assertIncludes(confirmedCached.ingredientsText, '生牛乳', 'non-AI history cache may reuse confirmed ingredient text');
  assertIncludes(confirmedCached.nutritionText, '300kJ', 'non-AI history cache may reuse confirmed nutrition text');

  const mergedAfterConfirmed = await withRecognitionHistory([], async () => {
    scanStore.saveRecognitionHistory(recognitionHistoryItem({
      id: 'product-code-6900000000001',
      imageId: 'ai-image',
      normalizedCode: '6900000000001',
      productName: '先 AI 后确认商品',
      ingredientsText: '',
      nutritionText: '',
      source: ['DeepSeek 联网搜索'],
      usedAiSearch: true
    }));
    scanStore.saveRecognitionHistory(recognitionHistoryItem({
      id: 'product-code-6900000000001',
      imageId: 'ocr-image',
      normalizedCode: '6900000000001',
      productName: '先 AI 后确认商品',
      ingredientsText: '配料表：生牛乳、乳酸菌',
      nutritionText: '营养成分表 能量 300kJ',
      source: ['包装实拍 OCR'],
      usedAiSearch: false,
      createdAt: '2026-06-21T00:01:00.000Z',
      updatedAt: '2026-06-21T00:01:00.000Z'
    }));
    const history = scanStore.getRecognitionHistory();
    return {
      history,
      lookup: await productLookupService.lookupProductInfo(recognitionInfo({
        normalizedCode: '6900000000001',
        productName: '先 AI 后确认商品',
        sources: []
      }), { hasLabelText: false })
    };
  });
  assertEqual(mergedAfterConfirmed.history[0].usedAiSearch, false, 'non-AI confirmed history should clear previous AI cache flag when merged');
  assertIncludes(mergedAfterConfirmed.lookup.ingredientsText, '生牛乳', 'confirmed OCR text after an AI cache should become reusable');
  assertIncludes(mergedAfterConfirmed.lookup.nutritionText, '300kJ', 'confirmed nutrition after an AI cache should become reusable');
}

function assertRecognitionBoundaries(barcodeService) {
  const barcode = barcodeService.normalizeBarcodeDetection('6901234567892', 'ean_13');
  assertEqual(barcode.kind, 'barcode', 'EAN image detection should become barcode');
  assertEqual(barcode.normalizedCode, '6901234567892', 'EAN image detection should keep normalized product code');
  assertEqual(barcode.contentType, 'product_code', 'EAN image detection should be product code content');

  const qr = barcodeService.normalizeBarcodeDetection('https://example.com/product?id=6901234567892', 'qr_code');
  assertEqual(qr.kind, 'qrcode', 'QR image detection should become qrcode');
  assertEqual(qr.contentType, 'url', 'QR URL should stay URL content until the dedicated product-code stage resolves it');

  assertEqual(barcodeService.classifyQrContent('https://brand.example/product/abc'), 'url', 'QR URL without GTIN should stay URL content');
  assertEqual(barcodeService.extractPrintedProductCode('条码：6901234567892'), '6901234567892', 'printed numeric package code should be extracted from OCR text');
  assertEqual(
    barcodeService.extractPrintedProductCode('营养成分表 每100ml 能量160kJ 碳水化合物9.5g 糖9.1g 钠42mg'),
    '',
    'nutrition values should not be stitched into a fake printed product code'
  );
}

async function assertAttentionNormalization(attentionStore) {
  await withStorage({}, () => {
    const saved = attentionStore.saveAttentionSettings({
      primaryGoal: 'daily',
      targetGoals: [],
      isChildrenMode: false,
      allergens: ['牛奶', 'milk', '乳清'],
      updatedAt: '2026-06-26T00:00:00.000Z'
    });
    assertEqual(saved.allergens.join(','), 'milk', 'allergen labels and keywords should normalize to canonical keys');
  });

  await withStorage({
    'complens:user-attention-settings': JSON.stringify({
      primaryGoal: 'daily',
      targetGoals: [],
      allergens: ['牛奶'],
      customTerms: ['花生'],
      updatedAt: '2026-06-26T00:00:00.000Z'
    })
  }, () => {
    const settings = attentionStore.getAttentionSettings();
    assert(settings.allergens.includes('milk'), 'stored milk label should be read as canonical milk key');
    assert(settings.allergens.includes('peanut'), 'legacy custom peanut term should be read as canonical peanut key');
  });
}

function assertExtractionBoundaries(extractLabelText, normalizeOcrResult) {
  const packageOnly = extractText(extractLabelText, [
    '产品名称：草莓味发酵乳',
    '本品含有维生素C',
    '净含量：200g',
    '生产日期：见包装',
    '地址：某某工业园',
    '条码：6900000000000'
  ].join('\n'));
  assertEqual(packageOnly.ingredientText, '', 'package-only text should not become ingredient text');
  assertEqual(packageOnly.nutritionText, '', 'package-only text should not become nutrition text');
  assertEqual(packageOnly.allergenText, '', 'bare 含有 without allergen keyword should not become allergen text');
  assertEqual(packageOnly.frontClaimsText, '', 'product info should not become front claims text');
  assertIncludes(packageOnly.productionDateText, '见包装', 'package production date should enter production date field');
  assertIncludes(packageOnly.productNameText, '草莓味发酵乳', 'package product name should enter product name field');

  const nutritionOnly = extractText(extractLabelText, '营养成分表 每100g 能量 900kJ 蛋白质 6g 脂肪 8g 碳水化合物 22g 糖 12g 钠 300mg');
  assertIncludes(nutritionOnly.nutritionText, '能量', 'nutrition-only text should keep nutrition fields');
  assertEqual(nutritionOnly.ingredientText, '', 'nutrition-only text should not become ingredient text');
  assertEqual(nutritionOnly.allergenText, '', 'nutrition-only text should not become allergen text');

  const allergen = extractText(extractLabelText, '致敏原提示：含有小麦、牛奶和大豆，可能含有花生。');
  assertIncludes(allergen.allergenText, '小麦', 'explicit allergen section should be retained');

  const wholePackage = extractText(extractLabelText, [
    '品 名 小麻花(海苔味)',
    '配 料 小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙',
    '产品类型 膨化食品 执行标准 GB17401',
    '营养成分表 项目 每100克 营养素参考值%',
    '能量 1950千焦 23%',
    '蛋白质 9.8克 16%',
    '脂肪 16.5克 28%',
    '碳水化合物 69.0克 23%',
    '钠 568毫克 28%'
  ].join('\n'));
  assertIncludes(wholePackage.ingredientText, '小麦粉', 'whole-package OCR should extract ingredient list after spaced 配料 label');
  assertIncludes(wholePackage.ingredientText, '碳酸钙', 'whole-package OCR should keep additive/mineral tail before product noise');
  assertIncludes(wholePackage.nutritionText, '1950千焦', 'whole-package OCR should extract nutrition table values');

  const garbledEnglishIngredient = extractText(extractLabelText, [
    'INGREDIENTS',
    'OTTAEESECUUREDSKMMKRAMSATWHTESOOSES CTRICAITOPRESREWATERATUSUARONRLESSOUVEMK',
    'BLTRCEESHSOAMREFNTDHERFCHFKMCTRPLEUROOCHSXCHKIYEIL',
    'EXTRACTIVESIXANTHANGUM CONTAINSMILK,EOG.',
    'Nutrition Facts Energy 100kcal Protein 10g Fat 2g Sodium 100mg'
  ].join('\n'));
  assertEqual(garbledEnglishIngredient.ingredientText, '', 'garbled English OCR should not become confirmed ingredient text');
  assertIncludes(garbledEnglishIngredient.ignoredText.join(' '), 'OTTAEESECUUREDSKMMKRAMSATWHTESOOSES', 'garbled ingredient OCR should remain as unconfirmed evidence');
  assertIncludes(garbledEnglishIngredient.qualityWarnings.join(' '), '疑似粘连乱码', 'garbled ingredient OCR should emit a report quality warning');

  const blockPackage = extractLabelText(normalizeOcrResult({
    source: 'external',
    rawText: '',
    blocks: [
      block('品 名', 10, 10), block('小麻花(海苔味)', 80, 10),
      block('配 料', 10, 48), block('小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙', 80, 48),
      block('产品类型', 10, 86), block('膨化食品', 90, 86),
      block('营养成分表', 10, 128), block('项目', 120, 128), block('每100克', 190, 128),
      block('能量', 10, 164), block('1950千焦', 120, 164), block('23%', 230, 164),
      block('蛋白质', 10, 198), block('9.8克', 120, 198), block('16%', 230, 198),
      block('脂肪', 10, 232), block('16.5克', 120, 232), block('28%', 230, 232),
      block('碳水化合物', 10, 266), block('69.0克', 120, 266), block('23%', 230, 266),
      block('钠', 10, 300), block('568毫克', 120, 300), block('28%', 230, 300)
    ]
  }));
  assertIncludes(blockPackage.ingredientText, '小麦粉', 'block OCR should merge same-row ingredient blocks');
  assertIncludes(blockPackage.nutritionText, '能量 1950千焦', 'block OCR should merge nutrient name and value into one line');
  assertIncludes(blockPackage.nutritionText, '钠 568毫克', 'block OCR should keep sodium row after block grouping');
}

function assertMultiRegionOcrBoundaries({ normalizeOcrResult, classifyOcrSections, extractIngredients, extractNutrition }) {
  const normalized = normalizeOcrResult({
    source: 'external',
    rawText: '',
    blocks: [
      block('营养成分表', 12, 12), block('配料表：小麦粉、植物油、白砂糖、食用盐、酵母', 520, 12),
      block('项目', 12, 48), block('每100克', 110, 48), block('NRV%', 220, 48), block('过敏原提示：含有小麦', 520, 48),
      block('能量', 12, 84), block('1950千焦', 110, 84), block('23%', 220, 84), block('生产日期：见喷码', 520, 84),
      block('蛋白质', 12, 120), block('9.8克', 110, 120), block('16%', 220, 120), block('保质期：9个月', 520, 120),
      block('脂肪', 12, 156), block('16.5克', 110, 156), block('28%', 220, 156), block('贮存条件：阴凉干燥处保存', 520, 156),
      block('碳水化合物', 12, 192), block('69.0克', 110, 192), block('23%', 220, 192), block('执行标准：GB/T 20980', 520, 192),
      block('钠', 12, 228), block('568毫克', 110, 228), block('28%', 220, 228), block('食用方法：开袋即食', 520, 228)
    ]
  });
  const classification = classifyOcrSections(normalized);
  const ingredients = extractIngredients(classification);
  const nutrition = extractNutrition(classification);

  assertIncludes(ingredients.ingredientsText, '小麦粉', 'multi-region OCR should keep right-column ingredients');
  assertIncludes(ingredients.ingredientsText, '酵母', 'multi-region OCR should keep ingredient tail before other sections');
  assert(!ingredients.ingredientsText.includes('生产日期'), 'multi-region OCR should not put production date into ingredients');
  assert(!ingredients.ingredientsText.includes('营养成分表'), 'multi-region OCR should not put nutrition header into ingredients');
  assertIncludes(nutrition.nutritionText, '能量', 'multi-region OCR should keep left-column nutrition table');
  assertIncludes(nutrition.nutritionText, '568毫克', 'multi-region OCR should keep nutrition row values');
  assert(classification.otherText.some((item) => item.includes('生产日期')), 'multi-region OCR should classify production info as otherText');
  assert(classification.otherText.some((item) => item.includes('执行标准')), 'multi-region OCR should classify standard info as otherText');
}

function assertNutritionParsingBoundaries(parseNutritionText) {
  const sparse = parseNutritionText([
    '每100毫升 营养素参考值%',
    '项目',
    '能量',
    '221kJ',
    '蛋白质',
    '脂肪',
    '碳水化合物',
    '10mg',
    '钠'
  ].join('\n'));
  assertField(sparse, 'energy', '221', 'sparse OCR should keep energy value paired with kJ');
  assertField(sparse, 'protein', '', 'sparse OCR should not assign orphan 10mg to protein');
  assertField(sparse, 'fat', '', 'sparse OCR should not assign orphan 10mg to fat');
  assertField(sparse, 'carbohydrate', '', 'sparse OCR should not assign mg value to carbohydrate');
  assertField(sparse, 'sodium', '', 'sparse OCR should not assign a value that appears before sodium label');

  const full = parseNutritionText([
    '营养成分表',
    '每100g',
    'NRV%',
    '2264kJ',
    '27%',
    '蛋白质',
    '5.2g',
    '9%',
    '脂肪',
    '39.1g',
    '65%',
    '-反式脂肪酸',
    '0.4g',
    '碳水化合物',
    '42.2g',
    '14%',
    '钠',
    '4070mg',
    '204%'
  ].join('\n'));
  assertField(full, 'energy', '2264', 'nutrition table without energy label should keep first kJ as energy');
  assertField(full, 'fat', '39.1', 'full nutrition table should pair fat with value');
  assertField(full, 'transFat', '0.4', 'full nutrition table should pair trans fat with value');
  assertField(full, 'sodium', '4070', 'full nutrition table should pair sodium with mg value');

  const noisyYogurt = parseNutritionText([
    '营养成分表',
    '每100克',
    '营养素参考值%',
    '250千焦',
    '3%',
    '能量',
    '5022350',
    '蛋白质',
    '3.0克',
    '脂肪',
    '1.4克',
    '碳水化合物',
    '9.3克',
    '95毫克',
    '1',
    '90毫克',
    '蔗糖含量:未检出(依据GB5009.8第一法)'
  ].join('\n'));
  assertField(noisyYogurt, 'energy', '250', 'noisy table should use plausible loose kJ energy instead of OCR column noise');
  assertField(noisyYogurt, 'protein', '3.0', 'noisy table should keep plausible protein value');
  assertField(noisyYogurt, 'sugar', '', 'noisy table should not treat GB5009.8 as sugar grams');
}

function assertReportBoundaries(buildLabelReport, buildLocalLabelAnalysis) {
  const nutritionOnlyReport = buildLabelReport({
    productName: '山梨酸钾牛奶高糖饮料',
    rawText: [
      '产品名称：山梨酸钾牛奶高糖饮料',
      '本品含有维生素C',
      '营养成分表 每100g 能量 900kJ 糖 12g 钠 300mg'
    ].join('\n'),
    ingredients: [],
    matches: [],
    nutrition: [
      nutritionField('energy', '能量', '900', 'kJ'),
      nutritionField('sugar', '糖', '12', 'g'),
      nutritionField('sodium', '钠', '300', 'mg')
    ],
    attention: attention({ allergens: ['milk'] }),
    labelType: 'nutrition_facts',
    sourceMeta: sourceMeta({
      nutritionText: '营养成分表 每100g 能量 900kJ 糖 12g 钠 300mg'
    })
  });
  assertEqual(nutritionOnlyReport.ingredientSection.additiveCount, 0, 'nutrition-only report should not count additives from product name');
  assertEqual(nutritionOnlyReport.additiveRecognition?.items?.length || 0, 0, 'nutrition-only report should not explain additives');
  assertEqual(nutritionOnlyReport.decision?.allergyWarnings?.length || 0, 0, 'product name milk should not trigger allergen warning');

  const allergyReport = buildLabelReport({
    productName: '花生牛奶饮品',
    rawText: '配料表：生牛乳、花生酱。\n致敏原提示：含有牛奶、花生。',
    ingredients: [
      { id: 'ingredient-1', rawText: '生牛乳', normalizedText: '生牛乳', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '花生酱', normalizedText: '花生酱', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      confirmedCommonMatch('生牛乳'),
      confirmedCommonMatch('花生酱')
    ],
    nutrition: [],
    attention: attention({ allergens: ['milk', 'peanut'] }),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({
      ingredientText: '配料表：生牛乳、花生酱。',
      allergenText: '致敏原提示：含有牛奶、花生。'
    })
  });
  assertEqual(allergyReport.purchaseDecision?.recommendation, '不建议', 'configured allergen hit should become avoid recommendation');
  assertIncludes(allergyReport.purchaseDecision?.riskReasons[0] || '', '过敏原', 'configured allergen warning should be first risk reason');
  assertIncludes(allergyReport.purchaseDecision?.riskReasons[0] || '', '来源：致敏原提示', 'allergen warning should name evidence source');

  const rawMilkAllergyReport = buildLabelReport({
    productName: '低糖酸奶饮品',
    rawText: '配料表：生牛乳、乳酸菌。\n营养成分表 每100ml 糖 3g 钠 48mg',
    ingredients: [
      { id: 'ingredient-1', rawText: '生牛乳', normalizedText: '生牛乳', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '乳酸菌', normalizedText: '乳酸菌', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      confirmedCommonMatch('生牛乳'),
      confirmedCommonMatch('乳酸菌')
    ],
    nutrition: [
      nutritionField('sugar', '糖', '3', 'g'),
      nutritionField('sodium', '钠', '48', 'mg')
    ],
    attention: attention({ allergens: ['milk'] }),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({
      ingredientText: '配料表：生牛乳、乳酸菌。',
      nutritionText: '营养成分表 每100ml 糖 3g 钠 48mg'
    })
  });
  assertEqual(rawMilkAllergyReport.purchaseDecision?.recommendation, '不建议', 'raw milk term should match configured milk allergen');

  const completeOneNutritionReport = buildLabelReport({
    productName: '燕麦牛奶饮品',
    rawText: '配料表：燕麦片、白砂糖。\n营养成分表 每100ml 糖 2g',
    ingredients: [
      { id: 'ingredient-1', rawText: '燕麦片', normalizedText: '燕麦片', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '白砂糖', normalizedText: '白砂糖', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      confirmedCommonMatch('燕麦片'),
      confirmedCommonMatch('白砂糖')
    ],
    nutrition: [
      nutritionField('sugar', '糖', '2', 'g')
    ],
    attention: attention(),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({
      ingredientText: '配料表：燕麦片、白砂糖。',
      nutritionText: '营养成分表 每100ml 糖 2g',
      confidence: 'high'
    })
  });
  assert(!completeOneNutritionReport.summarySentence.includes('补拍'), 'partial nutrition report should still summarize captured ingredient and sugar evidence without turning the summary into a retake prompt');
  assertEqual(completeOneNutritionReport.purchaseDecision?.recommendation, '信息不足', 'one nutrition number should not become a full purchase recommendation');
  const partialNutritionReasons = (completeOneNutritionReport.purchaseDecision?.riskReasons || []).join(' ');
  assertIncludes(partialNutritionReasons, '信息不足', 'partial nutrition report should tell the user the decision is blocked');
  assertIncludes(partialNutritionReasons, '营养成分表关键数字不完整', 'partial nutrition report should explain the evidence gap');

  const highSugarReport = buildLabelReport({
    productName: '高糖饮品',
    rawText: '配料表：水、白砂糖。\n营养成分表 每100ml 碳水化合物 13.2g 糖 12.8g 钠 48mg',
    ingredients: [
      { id: 'ingredient-1', rawText: '水', normalizedText: '水', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '白砂糖', normalizedText: '白砂糖', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      confirmedCommonMatch('水'),
      confirmedCommonMatch('白砂糖')
    ],
    nutrition: [
      nutritionField('sugar', '糖', '12.8', 'g'),
      nutritionField('carbohydrate', '碳水化合物', '13.2', 'g'),
      nutritionField('sodium', '钠', '48', 'mg')
    ],
    attention: attention({ primaryGoal: 'sugar', targetGoals: ['sugar'] }),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({
      ingredientText: '配料表：水、白砂糖。',
      nutritionText: '营养成分表 每100ml 碳水化合物 13.2g 糖 12.8g 钠 48mg',
      confidence: 'high'
    })
  });
  const topRiskSource = highSugarReport.sources.find((item) => item.label === 'Top risk 1 source line');
  assert(topRiskSource, 'top risk should keep a source-line evidence source');
  assertIncludes(topRiskSource?.detail, 'Source line', 'top risk source should explicitly name source line');
  assertIncludes(topRiskSource?.detail, '糖 12.8g', 'top risk source should keep the matching nutrition source line');
  assertIncludes(topRiskSource?.detail, 'Crop placeholder', 'top risk source should expose crop placeholder instead of fake image highlight');
  assertIncludes(topRiskSource?.detail, '原图高亮暂未接入', 'top risk source should state that real image highlight is not available');

  const blurryLowConfidenceReport = buildLabelReport({
    productName: '',
    rawText: '',
    ingredients: [],
    matches: [],
    nutrition: [
      nutritionField('sugar', '糖', '9.1', 'g'),
      nutritionField('sodium', '钠', '42', 'mg')
    ],
    attention: attention(),
    labelType: 'unknown_label',
    sourceMeta: sourceMeta({
      confidence: 'low',
      nutritionText: '糖9.1g 钠42mg',
      unconfirmedText: ['图片可能模糊、倾斜、反光或遮挡，需补拍确认。']
    })
  });
  assertEqual(blurryLowConfidenceReport.purchaseDecision?.recommendation, '信息不足', 'blurry low-confidence partial OCR must not become a purchase recommendation');
  assertEqual(blurryLowConfidenceReport.purchaseDecision?.score, 0, 'insufficient blurry OCR should not show a positive purchase score');

  const degradedReport = buildLabelReport({
    productName: '降级样本',
    rawText: '配料表：燕麦片、白砂糖。',
    ingredients: [
      { id: 'ingredient-1', rawText: '燕麦片', normalizedText: '燕麦片', isSubIngredient: false, isUnknown: false },
      { id: 'ingredient-2', rawText: '白砂糖', normalizedText: '白砂糖', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      degradedMatch('燕麦片'),
      degradedMatch('白砂糖')
    ],
    nutrition: [],
    attention: attention(),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({
      ingredientText: '配料表：燕麦片、白砂糖。',
      qualityWarnings: ['成分库接口暂不可用，当前仅保留未确认配料线索。']
    })
  });
  assertEqual(degradedReport.purchaseDecision?.recommendation, '信息不足', 'degraded ingredient source without nutrition evidence should not produce a purchase recommendation');
  const degradedReasons = (degradedReport.purchaseDecision?.riskReasons || []).join(' ');
  assertIncludes(degradedReasons, '成分库接口', 'degraded source warning should be visible in top risks');
  assertIncludes(degradedReasons, '缺少营养成分表', 'degraded source should still explain the missing evidence');

  const pendingAdditiveReport = buildLabelReport({
    productName: '未确认样本',
    rawText: '配料表：山梨酸钾。',
    ingredients: [
      { id: 'ingredient-1', rawText: '山梨酸钾', normalizedText: '山梨酸钾', isSubIngredient: false, isUnknown: false }
    ],
    matches: [
      {
        id: 'match-1',
        term: '山梨酸钾',
        normalizedText: '山梨酸钾',
        dataStatus: 'pending_review',
        dataStatusLabel: '未确认',
        confidence: 0.68,
        matchType: 'fuzzy',
        sourceNote: '待复核线索',
        ingredientName: '山梨酸钾',
        isAdditive: true,
        decision: 'confirmed'
      }
    ],
    nutrition: [],
    attention: attention(),
    labelType: 'ingredient_list',
    sourceMeta: sourceMeta({ ingredientText: '配料表：山梨酸钾。' })
  });
  assertEqual(pendingAdditiveReport.ingredientSection.additiveCount, 0, 'pending additive should not count as confirmed additive');
  assertEqual(pendingAdditiveReport.additiveRecognition?.items?.length || 0, 0, 'pending additive should not enter additive explanation list');
  assert(pendingAdditiveReport.focusItems.some((item) => item.includes('待确认') || item.includes('暂未收录')), 'pending ingredient should remain a review clue');

  const capturedOcrAnalysis = buildLocalLabelAnalysis({
    productName: '拍照识别样本',
    ingredientText: '燕麦片、白砂糖',
    nutritionText: '',
    attention: attention(),
    sourceType: 'ocr',
    confidence: 'high',
    recognition: recognitionInfo({
      detectedType: 'ingredient_list',
      ocrText: '配料表：燕麦片、白砂糖',
      rawContent: '配料表：燕麦片、白砂糖',
      normalizedCode: '',
      sources: ['包装实拍 OCR']
    })
  });
  assert(capturedOcrAnalysis.report.sources.some((item) => item.label === '包装 OCR 识别文本'), 'captured OCR report should use OCR recognition text source label');
  assert(!capturedOcrAnalysis.report.sources.some((item) => item.detail.includes('用户确认后的食品标签文本')), 'captured OCR auto report should not claim user-confirmed text');

  const aiAnalysis = buildLocalLabelAnalysis({
    productName: 'AI 商品线索',
    ingredientText: '燕麦片、白砂糖、食用盐',
    nutritionText: '每100g 能量 1600kJ 钠 220mg',
    attention: attention(),
    sourceType: 'ocr',
    recognition: recognitionInfo({
      usedAiSearch: true,
      productName: 'AI 商品线索',
      sources: ['DeepSeek 联网搜索']
    })
  });
  assertEqual(aiAnalysis.report.analysisSource?.sourceType, 'ai_search_product_label', 'AI label clues should keep ai_search_product_label source type');
  assert(!aiAnalysis.report.sources.some((item) => item.label === 'OCR / 手动确认文本'), 'AI label clue report should not claim OCR/manual confirmed text source');
  assert(aiAnalysis.report.sources.some((item) => item.sourceType === 'ai_search'), 'AI label clue report should expose AI source');

  const identityAnalysis = buildLocalLabelAnalysis({
    productName: '只识别到商品名',
    ingredientText: '',
    nutritionText: '',
    attention: attention(),
    sourceType: 'ocr',
    recognition: recognitionInfo({
      usedAiSearch: false,
      productName: '只识别到商品名',
      aiSearchErrorCode: 'deepseek_failed',
      sources: ['包装实拍 OCR']
    })
  });
  assertEqual(identityAnalysis.report.analysisSource?.sourceType, 'product_identity', 'identity-only report should use product_identity source type');
  assert(!identityAnalysis.report.sources.some((item) => item.label === 'OCR / 手动确认文本'), 'identity-only report should not claim ingredient OCR source');
  assert(identityAnalysis.report.sources.some((item) => item.detail.includes('AI 未获取到完整标签信息')), 'identity-only report should explain incomplete AI public-label clue');
  assert(!identityAnalysis.report.sources.some((item) => item.detail.includes('deepseek_failed')), 'identity-only report should not expose provider error codes to users');

  const emptyRecognitionAnalysis = buildLocalLabelAnalysis({
    productName: '',
    ingredientText: '',
    nutritionText: '',
    attention: attention(),
    sourceType: 'ocr',
    recognition: recognitionInfo({
      detectedType: 'unknown',
      rawContent: '',
      normalizedCode: '',
      productName: '',
      sources: []
    })
  });
  assertEqual(emptyRecognitionAnalysis.report.analysisSource?.sourceType, 'product_identity', 'empty recognition report should use information-insufficient source type');
  assertEqual(emptyRecognitionAnalysis.report.analysisSource?.sourceLabel, '识别信息不足', 'empty recognition source label should not claim product identity');
  assertIncludes(emptyRecognitionAnalysis.report.summarySentence, '未识别到可分析', 'empty recognition report should explain insufficient information');
  assert(emptyRecognitionAnalysis.report.sources.some((item) => item.detail.includes('未识别到可用标签文字')), 'empty recognition source should explain no usable label or identity clue');
  assert(emptyRecognitionAnalysis.report.sources.some((item) => item.sourceType === 'recognition_insufficient'), 'empty recognition source should not be marked as barcode or QR evidence');
  assert(!emptyRecognitionAnalysis.report.sources.some((item) => item.label === '商品身份线索'), 'empty recognition source should not claim product identity evidence');

  const lowQualityOcrAnalysis = buildLocalLabelAnalysis({
    productName: 'Cottage Cheese Bar',
    ingredientText: '',
    nutritionText: 'Nutrition Facts Per 100g Energy 900kJ Protein 10g Fat 8g Carbohydrate 22g Sodium 300mg',
    unconfirmedText: ['OTTAEESECUUREDSKMMKRAMSATWHTESOOSES CTRICAITOPRESREWATERATUSUARONRLESSOUVEMK'],
    qualityWarnings: ['配料表 OCR 疑似粘连乱码，未作为购买判断依据；请补拍清晰配料表或手动补充。'],
    confidence: 'low',
    attention: attention(),
    sourceType: 'ocr'
  });
  assertEqual(lowQualityOcrAnalysis.report.decision?.level, 'insufficient', 'report should stay information-insufficient when ingredient OCR was rejected as garbled');
  assertIncludes(lowQualityOcrAnalysis.report.analysisSource?.qualityWarnings?.join(' ') || '', '疑似粘连乱码', 'report source should retain garbled ingredient warning');
}

function extractText(extractLabelText, rawText) {
  return extractLabelText({
    source: 'manual',
    rawText,
    blocks: []
  }, 'manual');
}

function attention(overrides = {}) {
  return {
    primaryGoal: 'daily',
    targetGoals: [],
    isChildrenMode: false,
    allergens: [],
    updatedAt: '2026-06-19T00:00:00.000Z',
    ...overrides
  };
}

function nutritionField(key, label, value, unit) {
  return {
    key,
    label,
    value,
    unit,
    sourceText: `${label} ${value}${unit}`,
    confidence: 0.95
  };
}

function minimalReport(options) {
  const nutrition = options.nutrition || {};
  return {
    id: options.id,
    title: '食品标签解读',
    productName: options.productName,
    createdAt: '2026-06-25T00:00:00.000Z',
    summarySentence: '',
    attentionHits: [],
    focusItems: [],
    ingredientSection: {
      total: 1,
      additiveCount: 0,
      items: [{ term: options.ingredientText, normalizedText: options.ingredientText, ingredientName: options.ingredientText }]
    },
    nutritionSection: {
      fields: [
        nutritionField('sugar', '糖', nutrition.sugar || '', 'g'),
        nutritionField('carbohydrate', '碳水化合物', nutrition.carbohydrate || '', 'g'),
        nutritionField('sodium', '钠', nutrition.sodium || '', 'mg')
      ],
      highlights: []
    },
    additiveGroups: [],
    allergenHints: [],
    unknownItems: [],
    analysisSource: {
      normalizedCode: options.code,
      ingredientText: options.ingredientText,
      nutritionText: `糖 ${nutrition.sugar || ''}g 碳水化合物 ${nutrition.carbohydrate || ''}g 钠 ${nutrition.sodium || ''}mg`
    },
    sources: [],
    rawText: options.ingredientText
  };
}

function block(text, x, y) {
  return {
    text,
    x,
    y,
    width: Math.max(30, String(text).length * 14),
    height: 24,
    confidence: 0.96
  };
}

function confirmedCommonMatch(term) {
  return {
    id: `common-${term}`,
    term,
    normalizedText: term,
    dataStatus: 'common_ingredient',
    dataStatusLabel: '常见配料',
    confidence: 0.95,
    matchType: 'local_attention',
    sourceName: '本地常见配料规则',
    sourceType: 'local_rule',
    sourceNote: '测试确认配料。',
    ingredientName: term,
    isAdditive: false,
    decision: 'confirmed'
  };
}

function degradedMatch(term) {
  return {
    id: `degraded-${term}`,
    term,
    normalizedText: term,
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: '暂未收录',
    confidence: 0,
    matchType: 'none',
    sourceName: '成分库接口降级',
    sourceType: 'degraded_backend',
    sourceNote: '成分库接口暂不可用，已保留为未确认配料线索。',
    ingredientName: term,
    isAdditive: false,
    decision: 'pending'
  };
}

function sourceMeta(overrides = {}) {
  return {
    sourceType: 'captured_nutrition',
    sourceLabel: '食品标签文字',
    description: '测试样本',
    fromUserCapture: false,
    fromManualInput: true,
    ocrText: '',
    productNameText: '',
    foodTypeText: '',
    ingredientText: '',
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    productionDateText: '',
    confidence: 'medium',
    inputSourceType: 'manual',
    targetSnapshot: {
      primaryGoal: 'daily',
      targetGoals: [],
      isChildrenMode: false,
      allergens: []
    },
    ...overrides
  };
}

function recognitionInfo(overrides = {}) {
  return {
    imageId: 'test-image',
    detectedType: 'barcode',
    rawContent: '6901234567892',
    ocrText: '',
    normalizedCode: '6901234567892',
    qrContent: '',
    contentType: 'product_code',
    productName: '',
    brand: '',
    sources: [],
    recognizedAt: '2026-06-21T00:00:00.000Z',
    usedAiSearch: false,
    aiNotice: '',
    aiSearchSummary: '',
    aiSearchErrorCode: '',
    ...overrides
  };
}

function recognitionHistoryItem(overrides = {}) {
  return {
    id: 'history-item',
    imageId: 'history-image',
    detectedType: 'barcode',
    rawContent: '',
    ocrText: '',
    normalizedCode: '',
    qrContent: '',
    productName: '',
    brand: '',
    ingredientsText: '',
    nutritionText: '',
    source: [],
    reportSummary: '',
    usedAiSearch: false,
    aiNotice: '',
    aiSearchErrorCode: '',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...overrides
  };
}

async function withRecognitionHistory(items, callback) {
  return withStorage({
    'complens:user-recognition-history': JSON.stringify(items)
  }, callback);
}

async function withStorage(initialStorage, callback) {
  const previousUni = globalThis.uni;
  const storage = { ...initialStorage };
  globalThis.uni = {
    getStorageSync(key) {
      return storage[key] || '';
    },
    setStorageSync(key, value) {
      storage[key] = String(value || '');
    },
    removeStorageSync(key) {
      delete storage[key];
    },
    request(options) {
      options.fail?.({ errMsg: 'network disabled in storage regression' });
    }
  };
  try {
    return await callback();
  } finally {
    globalThis.uni = previousUni;
  }
}

function emptyExtraction(overrides = {}) {
  return {
    productNameText: '',
    foodTypeText: '',
    ingredientText: '',
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    productionDateText: '',
    ignoredText: [],
    confidence: 'low',
    sourceType: 'ocr',
    ...overrides
  };
}

function lookupResult(overrides = {}) {
  return {
    productName: '',
    brand: '',
    ingredientsText: '',
    nutritionText: '',
    sources: [],
    usedAiSearch: false,
    aiNotice: '',
    aiSearchSummary: '',
    fromHistory: false,
    ...overrides
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, message) {
  if (!String(actual || '').includes(expected)) {
    throw new Error(`${message}. Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertField(fields, key, expected, message) {
  const field = fields.find((item) => item.key === key);
  assertEqual(field?.value || '', expected, message);
}
