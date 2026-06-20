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

  await verifyPage(context, 'home', '/#/pages/index/index', ['拍包装', '值不值得常吃', '查单个成分']);
  await verifyPage(context, 'capture', '/#/pages/capture/index?mode=manual', ['手动输入标签文字', '配料表', '营养数字']);
  await verifySearch(context);
  await verifyPage(context, 'attention', '/#/pages/attention/index', ['关注目标', '儿童模式', '过敏 / 忌口']);
  await verifyPage(context, 'report', '/#/pages/report/index?id=visual-smoke-report', ['食品标签解读', '一句话结论', '关键原因', '适合谁 / 不适合谁', '建议吃法', '识别详情', '营养表', '添加剂作用', '未确认线索', '识别文字']);
  await verifyPage(context, 'history', '/#/pages/history/index', ['历史记录', '样例酸奶', '收藏']);

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
  await screenshot(page, name);
  await page.close();
}

async function verifySearch(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/pages/search/index`, { waitUntil: 'networkidle' });
  await page.locator('input').first().fill('山梨酸钾');
  await page.getByText('搜索', { exact: true }).last().click();
  await expectText(page, '为什么看');
  await assertPageReady(page, 'search', ['成分搜索', '山梨酸钾', '为什么看', '标签写法', '结果用途', '官方标准记录']);
  await screenshot(page, 'search');
  await page.close();
}

async function assertPageReady(page, name, expectedTexts) {
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  if (bodyText.length < 20) {
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

async function expectText(page, text) {
  await page.waitForFunction((value) => document.body.innerText.includes(value), text, { timeout: 5000 });
}

async function screenshot(page, name) {
  const filePath = join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function seedLocalData(context) {
  const report = buildSampleReport();
  await context.addInitScript((sampleReport) => {
    if (!/^https?:$/.test(window.location.protocol)) return;
    try {
      localStorage.setItem('complens:user-label-reports', JSON.stringify([sampleReport]));
      localStorage.setItem('complens:user-attention-settings', JSON.stringify({
        primaryGoal: 'sugar',
        isChildrenMode: true,
        allergens: ['milk'],
        updatedAt: '2026-06-19T00:00:00.000Z'
      }));
    } catch {
      // Some browser bootstrap documents do not allow localStorage. The actual app origin does.
    }
  }, report);
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
    id: 'potassium-sorbate',
    term: '山梨酸钾',
    normalizedText: '山梨酸钾',
    dataStatus: 'verified_regulation',
    dataStatusLabel: '官方标准已验证',
    confidence: 0.99,
    matchType: 'exact',
    sourceNote: 'GB 2760-2024',
    ingredientId: 'potassium-sorbate',
    ingredientName: '山梨酸钾',
    isAdditive: true,
    decision: 'confirmed'
  };
  const pendingIngredient = {
    id: 'candidate-flavor',
    term: '复合风味配料',
    normalizedText: '复合风味配料',
    dataStatus: 'pending_review',
    dataStatusLabel: '待复核来源数据',
    confidence: 0.62,
    matchType: 'fuzzy',
    sourceNote: '已保留为识别文字',
    ingredientName: '复合风味配料',
    isAdditive: false,
    decision: 'pending'
  };
  return {
    id: 'visual-smoke-report',
    title: '食品标签解读',
    productName: '样例酸奶',
    createdAt: '2026-06-19T10:00:00.000Z',
    isFavorite: true,
    summarySentence: '识别到 6 项配料，看到 1 种常见食品添加剂，营养数字已整理。',
    attentionHits: [],
    focusItems: ['糖 12g', '山梨酸钾'],
    ingredientSection: {
      total: 6,
      additiveCount: 1,
      items: [
        {
          id: 'milk',
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
        confirmedIngredient,
        pendingIngredient
      ]
    },
    nutritionSection: {
      fields: [
        { key: 'sugar', label: '糖', value: '12', unit: 'g', confidence: 0.95 },
        { key: 'sodium', label: '钠', value: '80', unit: 'mg', confidence: 0.95 },
        { key: 'fat', label: '脂肪', value: '3.2', unit: 'g', confidence: 0.92 },
        { key: 'energy', label: '热量', value: '420', unit: 'kJ', confidence: 0.92 }
      ],
      highlights: ['糖 12g', '钠 80mg']
    },
    additiveRecognition: {
      total: 1,
      categoryCount: 1,
      items: [{
        id: 'potassium-sorbate',
        name: '山梨酸钾',
        category: '防腐剂',
        effect: '帮助延长保质期。',
        reminder: '常见食品添加剂，重点看种类、数量和你是否介意添加剂。',
        displayLevel: 'normal',
        matchedTerms: ['山梨酸钾'],
        targetNotes: []
      }]
    },
    nutritionSnapshot: [
      { key: 'sugar', label: '糖', valueText: '12g', level: '中等', note: '介意糖时，糖相关数字已进入提醒。', percent: 50 },
      { key: 'sodium', label: '钠', valueText: '80mg', level: '较低', note: '本次不是主要提醒。', percent: 15 },
      { key: 'fat', label: '脂肪', valueText: '3.2g', level: '一般', note: '结合一份吃多少看。', percent: 35 },
      { key: 'energy', label: '热量', valueText: '420kJ', level: '一般', note: '结合一份大小看。', percent: 35 }
    ],
    foodAnalysis: {
      productName: '样例酸奶',
      category: '酸奶 / 乳制品',
      productionDate: '2026-06-18',
      ingredients: ['生牛乳', '白砂糖', '山梨酸钾', '复合风味配料'],
      nutrition: {
        sugar: { value: 12, unit: 'g', level: '中等', text: '12g' },
        sodium: { value: 80, unit: 'mg', level: '较低', text: '80mg' },
        fat: { value: 3.2, unit: 'g', level: '中等', text: '3.2g' },
        energy: { value: 420, unit: 'kJ', level: '中等', text: '420kJ' }
      },
      decision: 'caution',
      decisionText: '谨慎购买｜偶尔吃可以',
      riskLevel: 'yellow',
      summary: '可以偶尔吃，介意糖和添加剂时要看份量。',
      plainExplanation: '主要提醒是糖和防腐剂，适合当普通零食少量吃。',
      mainReasons: ['糖中等', '含常见防腐剂', '含乳制品过敏线索'],
      suitableFor: ['普通成年人偶尔吃', '不严格控糖的人'],
      notSuitableFor: ['严格控糖人群', '乳制品过敏人群', '儿童高频食用'],
      ingredientHighlights: [{
        name: '山梨酸钾',
        level: 'yellow',
        explanation: '常见防腐剂，用于帮助延长保质期。'
      }],
      nutritionJudgement: {
        sugar: '糖 12g，介意糖时要看一份吃多少。'
      },
      eatingAdvice: '一次少量吃，和正餐分开，不要连续多份。',
      confidence: 'high',
      source: {
        ruleBased: true,
        aiEnhanced: false,
        provider: 'rule-only',
        model: ''
      },
      retakeSuggestion: ''
    },
    additiveGroups: [{ label: '防腐剂', items: [confirmedIngredient] }],
    allergenHints: ['含乳制品线索，已列为过敏/忌口重点提醒。'],
    unknownItems: [],
    analysisSource: {
      sourceType: 'manual_input',
      sourceLabel: '食品标签文字',
      description: '用户确认的标签文字',
      fromUserCapture: false,
      fromManualInput: true,
      ingredientText: '生牛乳、白砂糖、山梨酸钾、复合风味配料',
      nutritionText: '糖 12g 钠 80mg 脂肪 3.2g 能量 420kJ',
      confidence: 'high',
      inputSourceType: 'manual',
      targetSnapshot: {
        primaryGoal: 'sugar',
        isChildrenMode: true,
        allergens: ['milk']
      }
    },
    sources: [{ label: '用户确认文本', detail: '来自手动输入或 OCR 确认', sourceType: 'manual_input' }],
    rawText: '配料：生牛乳、白砂糖、山梨酸钾、复合风味配料。营养成分表：糖 12g，钠 80mg，脂肪 3.2g，能量 420kJ。'
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
