import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwright = loadPlaywright();

const url = getArg('--url') || 'http://127.0.0.1:5207/';
const sample = getArg('--sample');
const outDir = getArg('--out-dir') || 'reports/product-review/screenshots/retention-avoid-smoke';
const outputJson = getArg('--output-json') || path.join(outDir, 'result.json');

if (!sample) throw new Error('Missing --sample');

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(outputJson), { recursive: true });

const interactions = [];
const screenshots = [];
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
  await context.addInitScript(() => {
    window.localStorage.setItem('complens:user-attention-settings', JSON.stringify({
      primaryGoal: 'daily',
      targetGoals: [],
      isChildrenMode: false,
      allergens: ['milk'],
      updatedAt: new Date().toISOString()
    }));
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
  await step('enter-capture', async () => page.getByText('拍照识别', { exact: true }).first().click());
  await page.waitForURL(/\/pages\/capture\/index/u, { timeout: 8_000 });
  await step('upload-sample', async () => {
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 3_000 });
    await page.getByText('选择包装标签图片', { exact: true }).first().click();
    const chooser = await chooserPromise;
    await chooser.setFiles(sample);
  });
  await page.waitForURL(/\/pages\/report\/index/u, { timeout: 25_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  await screenshot(page, '02-report');
  await step('save-avoid', async () => page.getByText('加入避雷', { exact: true }).first().click());
  await page.waitForTimeout(700);
  await screenshot(page, '03-avoid-toast');
  await step('back-home', async () => page.goto(url, { waitUntil: 'networkidle' }));
  await screenshot(page, '04-home-after-avoid');
  await step('open-avoid-list', async () => page.getByText('已保存', { exact: true }).first().click());
  await page.waitForTimeout(500);
  await screenshot(page, '05-avoid-list');

  const bodyText = await visibleText(page);
  const passed = /0\s*收藏\s*\/\s*1\s*避雷/u.test(bodyText)
    && /已避雷|避雷记录|不再买/u.test(bodyText)
    && !/还没有加入避雷/u.test(bodyText)
    && consoleErrors.length === 0
    && networkErrors.length === 0;
  const result = {
    schemaVersion: 'product-review-browser-retention-avoid-smoke-v1',
    generatedAt: new Date().toISOString(),
    url,
    sample,
    finalRoute: page.url(),
    bodyText,
    interactions,
    consoleErrors,
    networkErrors,
    screenshots,
    passed
  };
  await writeFile(outputJson, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    passed,
    finalRoute: result.finalRoute,
    outputJson,
    screenshots,
    networkErrors
  }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await browser.close();
}

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
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
