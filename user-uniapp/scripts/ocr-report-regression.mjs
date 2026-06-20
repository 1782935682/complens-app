import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true },
  resolve: {
    alias: {
      '@': resolve(root, 'src')
    }
  }
});

try {
  const { extractLabelText } = await server.ssrLoadModule('/src/utils/labelTextExtractor.ts');
  const { buildLabelReport } = await server.ssrLoadModule('/src/utils/reportBuilder.ts');
  const { normalizeOcrResult } = await server.ssrLoadModule('/src/utils/ocrAdapter.ts');

  assertExtractionBoundaries(extractLabelText, normalizeOcrResult);
  assertReportBoundaries(buildLabelReport);

  console.log('OCR/report regression passed: 7 scenarios checked.');
} finally {
  await server.close();
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

function assertReportBoundaries(buildLabelReport) {
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

function sourceMeta(overrides = {}) {
  return {
    sourceType: 'captured_nutrition',
    sourceLabel: '食品标签文字',
    description: '测试样本',
    fromUserCapture: false,
    fromManualInput: true,
    ocrText: '',
    ingredientText: '',
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    confidence: 'medium',
    inputSourceType: 'manual',
    targetSnapshot: {
      primaryGoal: 'daily',
      isChildrenMode: false,
      allergens: []
    },
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
