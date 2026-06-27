import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwright = loadPlaywright();

const url = getArg('--url') || 'http://127.0.0.1:5204/';
const failureSample = getArg('--failure');
const recoverySample = getArg('--recovery');
const outDir = getArg('--out-dir') || 'reports/product-review/screenshots/recovery-smoke';
const outputJson = getArg('--output-json') || path.join(outDir, 'result.json');
const mustIncludeInitial = getArgs('--initial-must-include');
const mustIncludeFinal = getArgs('--final-must-include');
const mustNotIncludeFinal = getArgs('--final-must-not-include');

if (!failureSample || !recoverySample) {
  throw new Error('Missing --failure or --recovery sample path');
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
  await uploadFromHome(page, failureSample, 'failure');
  await screenshot(page, '02-failure-report');
  const initialText = await visibleText(page);

  await step('click-recovery-action', async () => clickFirstVisible(page, [
    '补拍标签',
    '补拍配料表',
    '补拍营养表',
    '重新拍标签',
    '再拍一次',
    '上传识别'
  ]));
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  await screenshot(page, '03-after-recovery-click');
  await uploadCurrentCapture(page, recoverySample, 'recovery');
  await screenshot(page, '04-recovered-report');

  const finalText = await visibleText(page);
  const textAssertions = {
    initialMustInclude: mustIncludeInitial,
    initialMissing: mustIncludeInitial.filter((item) => !initialText.includes(item)),
    finalMustInclude: mustIncludeFinal,
    finalMissing: mustIncludeFinal.filter((item) => !finalText.includes(item)),
    finalMustNotInclude: mustNotIncludeFinal,
    finalForbiddenPresent: mustNotIncludeFinal.filter((item) => finalText.includes(item))
  };
  const result = {
    schemaVersion: 'product-review-browser-recovery-smoke-v1',
    generatedAt: new Date().toISOString(),
    url,
    failureSample,
    recoverySample,
    finalRoute: page.url(),
    initialText,
    finalText,
    textAssertions,
    interactions,
    consoleErrors,
    networkErrors,
    screenshots,
    passed: page.url().includes('/pages/report/index')
      && textAssertions.initialMissing.length === 0
      && textAssertions.finalMissing.length === 0
      && textAssertions.finalForbiddenPresent.length === 0
      && networkErrors.length === 0
  };
  await writeFile(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    passed: result.passed,
    finalRoute: result.finalRoute,
    outputJson,
    screenshots,
    networkErrors,
    initialMissing: textAssertions.initialMissing,
    finalMissing: textAssertions.finalMissing,
    finalForbiddenPresent: textAssertions.finalForbiddenPresent
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
    await clickFirstVisible(page, ['上传识别', '拍照识别', '开始识别']);
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
