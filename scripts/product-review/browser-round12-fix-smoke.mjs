import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import playwright from '../../user-uniapp/node_modules/playwright/index.js';

const { chromium } = playwright;

const round = Number.parseInt(getArg('--round') || '12', 10);
const h5Url = (getArg('--url') || 'http://127.0.0.1:5192/').replace(/\/+$/u, '');
const apiBaseUrl = getArg('--api-base') || 'http://127.0.0.1:3112/api';
const catalogPath = getArg('--catalog') || `reports/product-review/fixtures/round-${round}/sample-catalog-public.json`;
const outPath = getArg('--out') || `reports/product-review/round-${round}/fix-smoke-round12-report-compare-allergy.json`;
const screenshotDir = getArg('--screenshots') || `reports/product-review/screenshots/round-${round}/fix-round12-report-compare-allergy`;

await mkdir(screenshotDir, { recursive: true });
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const sampleById = new Map(catalog.samples.map((sample) => [sample.id, resolve(sample.path)]));
const highSugarSample = sampleById.get('sample-08');
const lowSugarMilkSample = sampleById.get('sample-09');
if (!highSugarSample || !existsSync(highSugarSample)) throw new Error('Missing sample-08 high sugar comparison sample.');
if (!lowSugarMilkSample || !existsSync(lowSugarMilkSample)) throw new Error('Missing sample-09 low sugar milk comparison sample.');

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
const consoleErrors = [];
const networkErrors = [];
const steps = [];
let fatalError = '';

try {
  await runStrictMissingReportCheck();
  await runReportToCompareCheck();
  await runAllergyReportCheck();
} catch (error) {
  fatalError = error instanceof Error ? error.stack || error.message : String(error);
  steps.push({
    id: 'fatal_error',
    passed: false,
    error: fatalError
  });
} finally {
  await browser.close();
}

const result = {
  schemaVersion: 'round12-fix-smoke-v1',
  round,
  generatedAt: new Date().toISOString(),
  h5Url,
  apiBaseUrl,
  passed: !fatalError && steps.every((step) => step.passed) && consoleErrors.length === 0 && networkErrors.length === 0,
  steps,
  fatalError,
  consoleErrors,
  networkErrors,
  screenshots: steps.flatMap((step) => step.screenshots || [])
};

await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
if (!result.passed) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(`Round 12 fix smoke passed: ${outPath}`);

async function runStrictMissingReportCheck() {
  const context = await newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${h5Url}/#/pages/report/index?id=missing-round12-report`, { waitUntil: 'networkidle' });
    await expectText(page, '没有找到结果', 'missing report empty state');
    await expectTextAbsent(page, '该不该买', 'missing report must not show stale decision');
    const shot = await screenshot(page, 'missing-report-id');
    steps.push({
      id: 'strict_missing_report_id',
      passed: true,
      route: await route(page),
      assertions: ['missing id shows empty state', 'stale latest report is not shown'],
      screenshots: [shot]
    });
  } finally {
    await context.close();
  }
}

async function runReportToCompareCheck() {
  const context = await newContext({ allergens: [], primaryGoal: 'sugar', targetGoals: ['sugar'] });
  const page = await context.newPage();
  try {
    await page.goto(`${h5Url}/#/pages/capture/index`, { waitUntil: 'networkidle' });
    await uploadSample(page, highSugarSample);
    await waitForRoute(page, '/pages/report/index');
    await expectText(page, '上传第二款对比', 'report primary compare continuation');
    await expectText(page, '糖≤5g', 'specific sugar alternative threshold');
    const reportShot = await screenshot(page, 'high-sugar-report-specific-alternative');

    await page.getByText('上传第二款对比', { exact: true }).first().click();
    await waitForRoute(page, '/pages/capture/index');
    await expectText(page, '拍第二款做对比', 'second product capture title');
    await expectText(page, '上传识别第二款', 'second product upload CTA');
    const secondCaptureShot = await screenshot(page, 'second-product-capture-mode');

    await uploadSample(page, lowSugarMilkSample);
    await waitForRoute(page, '/pages/compare/index');
    await expectText(page, 'A vs B', 'compare page');
    await expectText(page, '糖', 'compare sugar row');
    await expectText(page, '更适合你', 'profile-aware compare result');
    const compareShot = await screenshot(page, 'auto-compare-after-second-upload');

    steps.push({
      id: 'report_primary_action_auto_compare',
      passed: true,
      route: await route(page),
      assertions: [
        'report primary action clearly says upload second product for comparison',
        'capture page switches to second-product wording',
        'second upload automatically opens compare page',
        'specific replacement thresholds are visible'
      ],
      screenshots: [reportShot, secondCaptureShot, compareShot]
    });
  } finally {
    await context.close();
  }
}

async function runAllergyReportCheck() {
  const context = await newContext({ allergens: ['milk'], primaryGoal: 'daily', targetGoals: [] });
  const page = await context.newPage();
  try {
    await page.goto(`${h5Url}/#/pages/capture/index`, { waitUntil: 'networkidle' });
    await uploadSample(page, lowSugarMilkSample);
    await waitForRoute(page, '/pages/report/index');
    await expectText(page, '不要购买', 'allergy conclusion avoid wording');
    await expectText(page, '过敏', 'allergy risk wording');
    await expectText(page, '配料表', 'allergy source field');
    const shot = await screenshot(page, 'milk-allergy-report-first-screen');
    steps.push({
      id: 'allergy_first_screen_priority',
      passed: true,
      route: await route(page),
      assertions: ['configured milk allergy produces first-screen avoid wording', 'allergy source is visible'],
      screenshots: [shot]
    });
  } finally {
    await context.close();
  }
}

async function newContext(overrides = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN'
  });
  context.on('page', (page) => {
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || 'request_failed'}`);
    });
  });
  await context.addInitScript(({ apiBase, settings }) => {
    localStorage.clear();
    localStorage.setItem('complens:user-api-base-url', apiBase);
    localStorage.setItem('complens:user-attention-settings', JSON.stringify(settings));
  }, {
    apiBase: apiBaseUrl,
    settings: {
      primaryGoal: overrides.primaryGoal || 'daily',
      targetGoals: overrides.targetGoals || [],
      isChildrenMode: Boolean(overrides.targetGoals?.includes('children')),
      allergens: overrides.allergens || [],
      updatedAt: '2026-06-25T00:00:00.000Z'
    }
  });
  return context;
}

async function uploadSample(page, samplePath) {
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await page.getByText(/上传识别/u).first().click();
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(samplePath);
    return;
  }
  await page.locator('input[type="file"]').last().setInputFiles(samplePath);
}

async function waitForRoute(page, expectedRoute) {
  await page.waitForFunction((value) => location.hash.includes(value), expectedRoute, { timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

async function expectText(page, text, label) {
  await page.waitForFunction((value) => document.body.innerText.includes(value), text, { timeout: 20000 })
    .catch(async () => {
      throw new Error(`${label} missing "${text}". Body: ${(await bodyText(page)).slice(0, 800)}`);
    });
}

async function expectTextAbsent(page, text, label) {
  const value = await bodyText(page);
  if (value.includes(text)) throw new Error(`${label} unexpectedly found "${text}". Body: ${value.slice(0, 800)}`);
}

async function screenshot(page, name) {
  const path = `${screenshotDir}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function route(page) {
  return page.evaluate(() => location.hash);
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
}

function getArg(name) {
  const prefix = `${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}
