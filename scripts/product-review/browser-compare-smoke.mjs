import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwright = loadPlaywright();

const url = getArg('--url') || 'http://127.0.0.1:5184/';
const firstSample = getArg('--first');
const secondSample = getArg('--second');
const outDir = getArg('--out-dir') || 'reports/product-review/screenshots/compare-smoke';
const outputJson = getArg('--output-json') || path.join(outDir, 'result.json');
const mustInclude = getArgs('--must-include');
const mustNotInclude = getArgs('--must-not-include');
const clickTexts = getArgs('--click-text');
const primaryGoal = getArg('--primary-goal') || 'daily';
const targetGoals = getArg('--target-goals').split(',').map((item) => item.trim()).filter(Boolean);
const allergens = getArg('--allergens').split(',').map((item) => item.trim()).filter(Boolean);

if (!firstSample || !secondSample) {
  throw new Error('Missing --first or --second sample path');
}

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(outputJson), { recursive: true });
await assertApiHealth(url);

const screenshots = [];
const interactions = [];
const consoleErrors = [];
const networkErrors = [];

const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: findChromeExecutable()
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript((settings) => {
    localStorage.setItem('complens:user-attention-settings', JSON.stringify({
      primaryGoal: settings.primaryGoal,
      targetGoals: settings.targetGoals,
      isChildrenMode: settings.targetGoals.includes('children'),
      allergens: settings.allergens,
      updatedAt: new Date().toISOString()
    }));
  }, { primaryGoal, targetGoals, allergens });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    networkErrors.push(`failed ${request.url()} ${request.failure()?.errorText || ''}`.trim());
  });

  await step('open-home', async () => page.goto(url, { waitUntil: 'networkidle' }));
  await screenshot(page, '01-home');
  await uploadFromHome(page, firstSample, 'first');
  await screenshot(page, '02-first-report');
  await clickFirstVisible(page, ['拍第二款对比', '查看两款对比', '上传第二款对比', '添加第二款对比', '再识别一款', '重新拍标签', '再拍一次']);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  await uploadCurrentCapture(page, secondSample, 'second');
  await screenshot(page, '03-second-report');
  if (!page.url().includes('/pages/compare/index')) {
    await step('open-compare', async () => page.getByText(/^对比/u).first().click());
  } else {
    interactions.push({ label: 'open-compare', result: 'already-on-compare-after-second-upload' });
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  await screenshot(page, '04-compare');

  for (const [index, text] of clickTexts.entries()) {
    await step(`click-text-${index + 1}`, async () => clickFirstVisible(page, [text]));
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    await screenshot(page, `05-after-click-${index + 1}`);
  }

  const bodyText = await visibleText(page);
  const textAssertions = {
    mustInclude,
    mustNotInclude,
    missing: mustInclude.filter((item) => !bodyText.includes(item)),
    forbiddenPresent: mustNotInclude.filter((item) => bodyText.includes(item))
  };
  const result = {
    schemaVersion: 'product-review-browser-compare-smoke-v1',
    generatedAt: new Date().toISOString(),
    url,
    firstSample,
    secondSample,
    finalRoute: page.url(),
    bodyText,
    textAssertions,
    interactions,
    consoleErrors,
    networkErrors,
    screenshots,
    passed: page.url().includes('/pages/compare/index')
      && textAssertions.missing.length === 0
      && textAssertions.forbiddenPresent.length === 0
  };
  await writeFile(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    passed: result.passed,
    finalRoute: result.finalRoute,
    outputJson,
    screenshots,
    networkErrors
  }, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  await browser.close();
}

async function uploadFromHome(page, sample, label) {
  await step(`${label}-click-primary`, async () => clickFirstVisible(page, ['开始识别', '拍照识别']));
  await page.waitForTimeout(500);
  await uploadCurrentCapture(page, sample, label);
}

async function uploadCurrentCapture(page, sample, label) {
  await step(`${label}-upload`, async () => {
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
    await page.getByText(/上传识别/u).first().click();
    const chooser = await chooserPromise;
    if (chooser) await chooser.setFiles(sample);
    else await page.locator('input[type="file"]').last().setInputFiles(sample);
  });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await waitForReportOrSettle(page);
}

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function getArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const prefix = `${name}=`;
    if (arg.startsWith(prefix)) values.push(arg.slice(prefix.length));
    if (arg === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values.map((item) => String(item || '').trim()).filter(Boolean);
}

async function clickFirstVisible(page, labels) {
  for (const label of labels) {
    const locator = page.getByText(label, { exact: true }).first();
    if (await locator.count()) {
      await locator.click();
      return;
    }
  }
  throw new Error(`Unable to find visible action: ${labels.join(' / ')}`);
}

async function step(action, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    interactions.push({ action, durationMs: Date.now() - startedAt, ok: true });
  } catch (error) {
    interactions.push({ action, durationMs: Date.now() - startedAt, ok: false, error: error.message });
    throw error;
  }
}

async function screenshot(page, name) {
  const filePath = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push(filePath);
}

async function waitForReportOrSettle(page) {
  await page.waitForURL(/\/pages\/report\/index/u, { timeout: 20_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
}

async function visibleText(page) {
  return page.locator('body').innerText()
    .then((text) => text.replace(/\s+/g, ' ').trim());
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return createRequire(path.resolve('user-uniapp/package.json'))('playwright');
  }
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || undefined;
}

async function assertApiHealth(baseUrl) {
  const healthUrl = new URL('/api/health', baseUrl).toString();
  const response = await fetch(healthUrl).catch((error) => {
    throw new Error(`API health check failed before browser smoke: ${error.message}`);
  });
  if (!response.ok) {
    throw new Error(`API health check failed before browser smoke: ${response.status} ${healthUrl}`);
  }
}
