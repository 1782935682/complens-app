import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import playwright from 'playwright';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const h5Root = join(projectRoot, 'dist', 'build', 'h5');
const screenshotDir = join(os.tmpdir(), 'complens-user-visual-smoke');
const chromePath = findChromeExecutable();

if (!existsSync(join(h5Root, 'index.html'))) {
  throw new Error('H5 build not found. Run "npm run build:h5" in user-uniapp before visual smoke.');
}

await rm(screenshotDir, { recursive: true, force: true });
mkdirSync(screenshotDir, { recursive: true });

const server = await createStaticServer(h5Root);
const baseUrl = `http://127.0.0.1:${server.port}`;

const { chromium } = playwright;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: chromePath
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await seedLocalData(context);
  await mockIngredientApi(context);

  const pageErrors = [];
  context.on('page', (page) => {
    page.on('pageerror', (error) => pageErrors.push(error.message));
  });

  await verifyPage(context, 'home', '/#/pages/index/index', ['拍照识别']);
  await verifyPage(context, 'capture-pick', '/#/pages/capture/index', ['拍食品标签', '拍照识别', '上传识别', '扫条码/二维码', '手动输入']);
  await verifyPage(context, 'capture', '/#/pages/capture/index?mode=manual', ['补充信息', '配料表', '营养数字', '可选补充', '生成购买建议']);
  await verifyCaptureFilled(context);
  await verifyCaptureOptional(context);
  await verifyPage(context, 'attention', '/#/pages/attention/index', ['关注目标', '可多选', '儿童零食', '过敏 / 忌口']);
  await verifyReport(context);
  await verifyInsufficientReport(context);
  await verifyCompare(context);

  if (pageErrors.length) {
    throw new Error(`Page runtime errors:\n${pageErrors.join('\n')}`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.instance.close(resolve));
}

console.log(`Visual smoke passed. Screenshots: ${screenshotDir}`);

async function verifyPage(context, name, path, expectedTexts) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await assertPageReady(page, name, expectedTexts);
  if (name === 'home') await assertTextAbsent(page, name, ['首页', '我的']);
  await screenshot(page, name);
  await page.close();
}

async function verifyCaptureFilled(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/capture/index?mode=manual`, { waitUntil: 'networkidle' });
  await page.locator('textarea').first().fill('配料：小麦粉、植物油、白砂糖、麦芽糖、食用盐');
  await expectText(page, '生成购买建议');
  await assertPageReady(page, 'capture-filled', ['补充信息', '配料表', '营养数字', '生成购买建议']);
  await screenshot(page, 'capture-filled');
  await page.close();
}

async function verifyCaptureOptional(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/capture/index?mode=manual`, { waitUntil: 'networkidle' });
  await page.getByText('展开可选项', { exact: true }).click();
  await assertPageReady(page, 'capture-optional', ['致敏原提示', '包装声明', '生产日期']);
  await screenshot(page, 'capture-optional');
  await page.close();
}

async function verifyReport(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/report/index?id=visual-smoke-report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await assertPageReady(page, 'report', ['该不该买', '可核对证据', '替代推荐', '命中麸质', '加入避雷']);
  await screenshot(page, 'report');
  await page.close();
}

async function verifyInsufficientReport(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/report/index?id=visual-insufficient-report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await assertPageReady(page, 'report-insufficient', ['补拍后判断', '信息不足', '还不能下购买结论', '补拍配料表', '替代推荐']);
  await screenshot(page, 'report-insufficient');
  await page.close();
}

async function verifyCompare(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/compare/index?left=visual-smoke-report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await assertPageReady(page, 'compare', ['A vs B', '关键差异', '负担更低', '更低风险', '更适合你', 'A', 'B']);
  await screenshot(page, 'compare');
  await page.close();
}

async function assertPageReady(page, name, expectedTexts) {
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const minTextLength = name === 'home' ? 4 : 20;
  if (bodyText.length < minTextLength) {
    throw new Error(`${name} rendered too little text: "${bodyText}"`);
  }
  for (const text of expectedTexts) {
    if (!bodyText.includes(text)) {
      throw new Error(`${name} missing expected text "${text}". Body: ${bodyText.slice(0, 300)}`);
    }
  }
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    height: document.documentElement.clientHeight,
    bodyHeight: document.body.getBoundingClientRect().height
  }));
  if (metrics.scrollWidth > metrics.width + 2) {
    throw new Error(`${name} has horizontal overflow: ${metrics.scrollWidth}px > ${metrics.width}px`);
  }
  if (metrics.bodyHeight < 120 || metrics.height < 120) {
    throw new Error(`${name} rendered an unexpectedly small page.`);
  }
}

async function assertTextAbsent(page, name, texts) {
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  for (const text of texts) {
    if (bodyText.includes(text)) {
      throw new Error(`${name} should not include "${text}". Body: ${bodyText.slice(0, 300)}`);
    }
  }
}

async function expectText(page, text) {
  await page.waitForFunction((value) => document.body.innerText.includes(value), text, { timeout: 5000 });
}

async function screenshot(page, name) {
  const filePath = join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function seedLocalData(context) {
  const reports = [buildSampleReport(), buildSecondSampleReport(), buildInsufficientReport()];
  await context.addInitScript((sampleReports) => {
    if (!/^https?:$/.test(window.location.protocol)) return;
    try {
      localStorage.setItem('complens:user-label-reports', JSON.stringify(sampleReports));
      localStorage.setItem('complens:user-attention-settings', JSON.stringify({
        primaryGoal: 'sugar',
        targetGoals: ['sugar', 'children'],
        isChildrenMode: true,
        allergens: ['gluten'],
        updatedAt: '2026-06-19T00:00:00.000Z'
      }));
    } catch {
      // Some browser bootstrap documents do not allow localStorage. The actual app origin does.
    }
  }, reports);
}

async function mockIngredientApi(context) {
  await context.route('**/api/ingredients**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        items: [{
          id: 'potassium-sorbate',
          nameCn: '山梨酸钾',
          nameEn: 'Potassium Sorbate',
          category: '防腐剂',
          dataStatus: 'verified_regulation',
          sourceName: 'GB 2760-2024',
          sourceType: 'official_standard',
          regulatoryBasis: '食品添加剂使用标准中的防腐剂使用范围记录。',
          aliases: ['山梨酸钾', '山梨酸'],
          functions: ['防腐剂'],
          foodCategories: ['饮料', '调味品']
        }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      })
    });
  });
}

function buildSampleReport() {
  const confirmedIngredient = {
    id: 'msg',
    term: '味精',
    normalizedText: '味精',
    dataStatus: 'common_ingredient',
    dataStatusLabel: '普通配料',
    confidence: 0.88,
    matchType: 'local_attention',
    sourceNote: '本地添加剂规则',
    ingredientId: 'msg',
    ingredientName: '味精',
    isAdditive: true,
    decision: 'confirmed'
  };
  const pendingIngredient = {
    id: 'candidate-flavor',
    term: '海苔粉',
    normalizedText: '海苔粉',
    dataStatus: 'pending_review',
    dataStatusLabel: '待复核来源数据',
    confidence: 0.62,
    matchType: 'fuzzy',
    sourceNote: '已保留为需核对文字',
    ingredientName: '海苔粉',
    isAdditive: false,
    decision: 'pending'
  };
  return {
    id: 'visual-smoke-report',
    title: '购买建议',
    productName: '海苔小麻花',
    createdAt: '2026-06-19T10:00:00.000Z',
    isFavorite: true,
    summarySentence: '识别到 10 项配料，看到 2 种常见食品添加剂，营养数字已整理。',
    attentionHits: [],
    focusItems: ['热量 1950kJ', '脂肪 16.5g', '钠 568mg'],
    ingredientSection: {
      total: 10,
      additiveCount: 2,
      items: [
        {
          id: 'wheat',
          term: '小麦粉',
          normalizedText: '小麦粉',
          dataStatus: 'common_ingredient',
          dataStatusLabel: '普通配料',
          confidence: 0.9,
          matchType: 'exact',
          sourceNote: '普通配料词库',
          ingredientName: '小麦粉',
          isAdditive: false,
          decision: 'confirmed'
        },
        { ...confirmedIngredient, id: 'plant-oil', term: '植物油', normalizedText: '植物油', ingredientName: '植物油', isAdditive: false },
        { ...confirmedIngredient, id: 'rice-flour', term: '大米粉', normalizedText: '大米粉', ingredientName: '大米粉', isAdditive: false },
        { ...confirmedIngredient, id: 'sugar', term: '白砂糖', normalizedText: '白砂糖', ingredientName: '白砂糖', isAdditive: false },
        { ...confirmedIngredient, id: 'maltose', term: '麦芽糖', normalizedText: '麦芽糖', ingredientName: '麦芽糖', isAdditive: false },
        { ...confirmedIngredient, id: 'spice', term: '香辛料', normalizedText: '香辛料', ingredientName: '香辛料', isAdditive: false },
        confirmedIngredient,
        { ...confirmedIngredient, id: 'salt', term: '食用盐', normalizedText: '食用盐', ingredientName: '食用盐', isAdditive: false },
        { ...confirmedIngredient, id: 'calcium-carbonate', term: '碳酸钙', normalizedText: '碳酸钙', ingredientName: '碳酸钙' },
        pendingIngredient
      ]
    },
    nutritionSection: {
      fields: [
        { key: 'energy', label: '热量', value: '1950', unit: 'kJ', confidence: 0.95 },
        { key: 'fat', label: '脂肪', value: '16.5', unit: 'g', confidence: 0.95 },
        { key: 'carbohydrate', label: '碳水', value: '69.0', unit: 'g', confidence: 0.95 },
        { key: 'sodium', label: '钠', value: '568', unit: 'mg', confidence: 0.95 }
      ],
      highlights: ['热量 1950kJ', '脂肪 16.5g', '钠 568mg']
    },
    additiveRecognition: {
      total: 2,
      categoryCount: 2,
      items: [
        {
          id: 'msg',
          name: '味精',
          category: '其他添加剂',
          effect: '常见增鲜成分，会让咸鲜味更明显。',
          reminder: '钠需关注时和份量一起看。',
          displayLevel: 'normal',
          matchedTerms: ['味精'],
          targetNotes: []
        },
        {
          id: 'calcium-carbonate',
          name: '碳酸钙',
          category: '其他添加剂',
          effect: '常见添加剂或营养强化相关成分。',
          reminder: '它不是这包零食的主要问题，重点仍是热量、脂肪和钠。',
          displayLevel: 'normal',
          matchedTerms: ['碳酸钙'],
          targetNotes: []
        }
      ]
    },
    nutritionSnapshot: [
      { key: 'energy', label: '热量', valueText: '1950kJ', level: '较高', note: '零食里属于重点提醒。', percent: 92 },
      { key: 'fat', label: '脂肪', valueText: '16.5g', level: '较高', note: '油炸或膨化零食常见这个特点。', percent: 78 },
      { key: 'carbohydrate', label: '碳水', valueText: '69.0g', level: '较高', note: '主要来自面粉、米粉或糖类。', percent: 86 },
      { key: 'sodium', label: '钠', valueText: '568mg', level: '较高', note: '重口味食物叠加时要看份量。', percent: 82 }
    ],
    foodAnalysis: {
      productName: '海苔小麻花',
      category: '油炸 / 膨化类零食',
      productionDate: '2026-06-18',
      ingredients: ['小麦粉', '植物油', '大米粉', '白砂糖', '麦芽糖', '海苔粉', '香辛料', '味精', '食用盐', '碳酸钙'],
      nutrition: {
        energy: { value: 1950, unit: 'kJ', level: '需关注', text: '1950kJ' },
        fat: { value: 16.5, unit: 'g', level: '需关注', text: '16.5g' },
        carbohydrate: { value: 69, unit: 'g', level: '需关注', text: '69.0g' },
        sodium: { value: 568, unit: 'mg', level: '需关注', text: '568mg' }
      },
      decision: 'caution',
      decisionText: '控糖/儿童零食人群建议关注：碳水、钠、热量',
      riskLevel: 'yellow',
      summary: '偶尔吃更合适，按小份量处理。',
      plainExplanation: '这是油炸 / 膨化类零食，主要提醒是热量、脂肪、碳水和钠。',
      mainReasons: ['热量需关注', '脂肪需关注', '碳水需关注', '钠需关注', '含添加糖来源'],
      suitableFor: ['普通成年人偶尔解馋'],
      notSuitableFor: ['减脂人群', '控糖人群', '高血压/控盐人群', '儿童高频食用', '小麦过敏或麸质敏感人群'],
      ingredientHighlights: [
        { name: '植物油', level: 'yellow', explanation: '提供酥脆口感，也会拉高脂肪和热量。' },
        { name: '白砂糖', level: 'yellow', explanation: '属于添加糖来源，主要影响甜味和碳水。' },
        { name: '麦芽糖', level: 'yellow', explanation: '属于添加糖来源，主要影响甜味和碳水。' },
        { name: '味精', level: 'yellow', explanation: '常见增鲜成分，会让咸鲜味更明显。' },
        { name: '碳酸钙', level: 'green', explanation: '常见添加剂或营养强化相关成分。' }
      ],
      nutritionJudgement: {
        energy: '每100g能量1950kJ，零食里属于重点提醒。',
        fat: '每100g脂肪16.5g，油炸或膨化零食常见这个特点。',
        carbohydrate: '每100g碳水69g，主要来自面粉、米粉或糖类。',
        sodium: '每100g钠568mg，重口味食物叠加时要看份量。'
      },
      eatingAdvice: '重点看每份/每包的碳水、钠、热量数字。',
      confidence: 'high',
      source: {
        ruleBased: true,
        aiEnhanced: false,
        provider: 'rule-only',
        model: ''
      },
      retakeSuggestion: '',
      frontClaims: [],
      uncertainClues: ['海苔粉']
    },
    additiveGroups: [{ label: '其他添加剂', items: [confirmedIngredient] }],
    allergenHints: ['识别到麸质相关标示，已列为过敏原线索。'],
    unknownItems: ['海苔粉'],
    analysisSource: {
      sourceType: 'manual_input',
      sourceLabel: '食品标签文字',
      description: '用户确认的标签文字',
      fromUserCapture: false,
      fromManualInput: true,
      productNameText: '海苔小麻花',
      foodTypeText: '油炸 / 膨化类零食',
      ingredientText: '小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙',
      nutritionText: '能量1950kJ 脂肪16.5g 碳水化合物69.0g 钠568mg',
      productionDateText: '2026-06-18',
      recognition: {
        imageId: 'visual-snack-image',
        detectedType: 'ingredient_list',
        rawContent: '配料表：小麦粉、植物油、大米粉、白砂糖、麦芽糖',
        ocrText: '配料表：小麦粉、植物油、大米粉、白砂糖、麦芽糖',
        normalizedCode: '6901234567892',
        qrContent: '',
        contentType: 'ingredient_list',
        productName: '海苔小麻花',
        brand: '样例品牌',
        sources: ['包装实拍 OCR', '条码识别'],
        recognizedAt: '2026-06-21T09:15:00.000+08:00',
        usedAiSearch: false,
        aiNotice: ''
      },
      normalizedCode: '6901234567892',
      brand: '样例品牌',
      recognitionSources: ['包装实拍 OCR', '条码识别'],
      usedAiSearch: false,
      confidence: 'high',
      inputSourceType: 'manual',
      targetSnapshot: {
        primaryGoal: 'sugar',
        targetGoals: ['sugar', 'children'],
        isChildrenMode: true,
        allergens: ['gluten']
      }
    },
    sources: [{ label: '用户确认文本', detail: '来自手动输入或 OCR 确认', sourceType: 'manual_input' }],
    rawText: '配料：小麦粉、植物油、大米粉、白砂糖、麦芽糖、海苔粉、香辛料、味精、食用盐、碳酸钙。营养成分表：能量1950kJ，脂肪16.5g，碳水化合物69.0g，钠568mg。'
  };
}

function buildSecondSampleReport() {
  const report = JSON.parse(JSON.stringify(buildSampleReport()));
  report.id = 'visual-smoke-report-b';
  report.productName = '低糖酸奶饮品';
  report.createdAt = '2026-06-19T10:05:00.000Z';
  report.isFavorite = false;
  report.summarySentence = '识别到 4 项配料，营养数字已整理。';
  report.focusItems = ['糖 3.1g', '碳水 4.2g', '钠 42mg'];
  report.ingredientSection.total = 4;
  report.ingredientSection.additiveCount = 1;
  report.ingredientSection.items = [
    {
      id: 'raw-milk',
      term: '生牛乳',
      normalizedText: '生牛乳',
      dataStatus: 'common_ingredient',
      dataStatusLabel: '普通配料',
      confidence: 0.9,
      matchType: 'exact',
      sourceNote: '普通配料词库',
      ingredientName: '生牛乳',
      isAdditive: false,
      decision: 'confirmed'
    },
    {
      id: 'erythritol',
      term: '赤藓糖醇',
      normalizedText: '赤藓糖醇',
      dataStatus: 'common_ingredient',
      dataStatusLabel: '普通配料',
      confidence: 0.86,
      matchType: 'local_attention',
      sourceNote: '本地常见配料规则',
      ingredientName: '赤藓糖醇',
      isAdditive: false,
      decision: 'confirmed'
    },
    {
      id: 'pectin',
      term: '果胶',
      normalizedText: '果胶',
      dataStatus: 'common_ingredient',
      dataStatusLabel: '普通配料',
      confidence: 0.82,
      matchType: 'local_attention',
      sourceNote: '本地常见配料规则',
      ingredientName: '果胶',
      isAdditive: true,
      decision: 'confirmed'
    },
    {
      id: 'culture',
      term: '乳酸菌',
      normalizedText: '乳酸菌',
      dataStatus: 'common_ingredient',
      dataStatusLabel: '普通配料',
      confidence: 0.82,
      matchType: 'local_attention',
      sourceNote: '本地常见配料规则',
      ingredientName: '乳酸菌',
      isAdditive: false,
      decision: 'confirmed'
    }
  ];
  report.nutritionSection.fields = [
    { key: 'energy', label: '热量', value: '130', unit: 'kJ', confidence: 0.95 },
    { key: 'fat', label: '脂肪', value: '0.8', unit: 'g', confidence: 0.95 },
    { key: 'carbohydrate', label: '碳水', value: '4.2', unit: 'g', confidence: 0.95 },
    { key: 'sugar', label: '糖', value: '3.1', unit: 'g', confidence: 0.95 },
    { key: 'sodium', label: '钠', value: '42', unit: 'mg', confidence: 0.95 }
  ];
  report.nutritionSection.highlights = ['糖 3.1g', '碳水 4.2g', '钠 42mg'];
  report.nutritionSnapshot = [
    { key: 'energy', label: '热量', valueText: '130kJ', level: '较低', note: '饮品中负担较低。', percent: 28 },
    { key: 'fat', label: '脂肪', valueText: '0.8g', level: '较低', note: '脂肪较低。', percent: 18 },
    { key: 'carbohydrate', label: '碳水', valueText: '4.2g', level: '较低', note: '比高糖饮品更低。', percent: 24 },
    { key: 'sugar', label: '糖', valueText: '3.1g', level: '较低', note: '控糖时更容易控制。', percent: 22 },
    { key: 'sodium', label: '钠', valueText: '42mg', level: '较低', note: '钠负担较低。', percent: 18 }
  ];
  report.analysisSource.productNameText = '低糖酸奶饮品';
  report.analysisSource.ingredientText = '生牛乳、赤藓糖醇、果胶、乳酸菌';
  report.analysisSource.nutritionText = '每100ml 能量130kJ 脂肪0.8g 碳水化合物4.2g 糖3.1g 钠42mg';
  report.analysisSource.normalizedCode = '6901234567809';
  report.analysisSource.recognition.normalizedCode = '6901234567809';
  report.analysisSource.recognition.productName = '低糖酸奶饮品';
  report.foodAnalysis.productName = '低糖酸奶饮品';
  report.foodAnalysis.category = '低糖乳饮品';
  report.foodAnalysis.ingredients = ['生牛乳', '赤藓糖醇', '果胶', '乳酸菌'];
  report.foodAnalysis.nutrition = {
    energy: { value: 130, unit: 'kJ', level: '较低', text: '130kJ' },
    fat: { value: 0.8, unit: 'g', level: '较低', text: '0.8g' },
    carbohydrate: { value: 4.2, unit: 'g', level: '较低', text: '4.2g' },
    sugar: { value: 3.1, unit: 'g', level: '较低', text: '3.1g' },
    sodium: { value: 42, unit: 'mg', level: '较低', text: '42mg' }
  };
  report.rawText = '配料：生牛乳、赤藓糖醇、果胶、乳酸菌。营养成分表：每100ml 能量130kJ，碳水化合物4.2g，糖3.1g，钠42mg。';
  return report;
}

function buildInsufficientReport() {
  return {
    id: 'visual-insufficient-report',
    title: '购买建议',
    productName: '0糖乳酸菌饮料包装正面',
    createdAt: '2026-06-19T09:20:00.000Z',
    isFavorite: false,
    summarySentence: '只识别到包装声明，还缺配料表和营养数字。',
    decision: {
      level: 'insufficient',
      label: '信息不足',
      summary: '只看到包装正面声称，还缺配料表和营养数字。',
      tags: ['补拍配料表', '补拍营养表'],
      watchPoints: ['缺少配料表', '缺少营养数字'],
      allergyWarnings: [],
      suitableFor: [],
      lessSuitableFor: [],
      reasons: ['缺少配料表', '缺少营养数字'],
      suggestions: ['补拍配料表或营养成分表后再生成购买建议。'],
      score: 0
    },
    attentionHits: [],
    focusItems: ['包装声明：0糖', '包装声明：高蛋白'],
    ingredientSection: {
      total: 0,
      additiveCount: 0,
      items: []
    },
    nutritionSection: {
      fields: [],
      highlights: []
    },
    additiveRecognition: {
      total: 0,
      categoryCount: 0,
      items: []
    },
    nutritionSnapshot: [],
    frontClaimsSection: {
      text: '0糖、高蛋白',
      highlights: ['0糖', '高蛋白']
    },
    additiveGroups: [],
    allergenHints: [],
    unknownItems: ['0糖', '高蛋白'],
    analysisSource: {
      sourceType: 'captured_product',
      sourceLabel: '包装正面',
      description: '仅识别到包装正面声称',
      fromUserCapture: true,
      fromManualInput: false,
      productNameText: '0糖乳酸菌饮料',
      frontClaimsText: '0糖、高蛋白',
      recognition: {
        imageId: 'visual-ai-lookup-image',
        detectedType: 'barcode',
        rawContent: '6901234567892',
        ocrText: '',
        normalizedCode: '6901234567892',
        qrContent: '',
        contentType: 'product_code',
        productName: '0糖乳酸菌饮料',
        brand: '样例品牌',
        sources: ['条码识别', 'DeepSeek 联网搜索'],
        recognizedAt: '2026-06-21T09:18:00.000+08:00',
        usedAiSearch: true,
        aiNotice: 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
        aiSearchSummary: 'AI 只补到商品名，未找到配料表或营养成分表。'
      },
      normalizedCode: '6901234567892',
      brand: '样例品牌',
      recognitionSources: ['条码识别', 'DeepSeek 联网搜索'],
      usedAiSearch: true,
      aiNotice: 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
      aiSearchSummary: 'AI 只补到商品名，未找到配料表或营养成分表。',
      confidence: 'low',
      inputSourceType: 'ocr',
      targetSnapshot: {
        primaryGoal: 'sugar',
        targetGoals: ['sugar', 'children'],
        isChildrenMode: true,
        allergens: ['gluten']
      }
    },
    foodAnalysis: {
      productName: '0糖乳酸菌饮料',
      category: '包装正面线索',
      productionDate: '',
      ingredients: [],
      nutrition: {},
      frontClaims: ['0糖', '高蛋白'],
      uncertainClues: ['0糖', '高蛋白'],
      decision: 'unknown',
      decisionText: '信息不足｜补拍配料或营养表',
      riskLevel: 'unknown',
      summary: '只看到包装声称，还缺配料和营养数字。',
      plainExplanation: '先补拍配料表或营养成分表，才能给出是否适合常吃的建议。',
      mainReasons: ['缺少配料表', '缺少营养数字'],
      suitableFor: [],
      notSuitableFor: [],
      ingredientHighlights: [],
      nutritionJudgement: {},
      eatingAdvice: '暂不按这次结果决定购买；补拍配料表或营养表后再看。',
      confidence: 'low',
      source: {
        ruleBased: true,
        aiEnhanced: false,
        provider: 'rule-only',
        model: ''
      },
      retakeSuggestion: '补拍配料表或营养成分表。'
    },
    sources: [{ label: '包装实拍标签', detail: '来自用户拍摄包装', sourceType: 'ocr_input' }],
    rawText: '0糖 高蛋白 乳酸菌饮料'
  };
}

async function createStaticServer(root) {
  const instance = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    let filePath = normalize(join(root, pathname));
    if (!isInsideRoot(root, filePath) || !existsSync(filePath)) {
      filePath = join(root, 'index.html');
    }
    response.setHeader('Content-Type', contentType(filePath));
    createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => instance.listen(0, '127.0.0.1', resolve));
  return {
    instance,
    port: instance.address().port
  };
}

function isInsideRoot(root, filePath) {
  const rel = relative(root, filePath);
  return rel && !rel.startsWith('..') && !rel.startsWith('..\\') && !rel.includes(':');
}

function contentType(filePath) {
  const ext = extname(filePath);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}
