import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwright = loadPlaywright();

const url = getArg('--url') || 'http://127.0.0.1:5210/';
const outDir = getArg('--out-dir') || 'reports/product-review/screenshots/invalid-upload-smoke';
const outputJson = getArg('--output-json') || path.join(outDir, 'result.json');
const expectedText = getArg('--expected-text') || '这不是可识别的图片文件';

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(outputJson), { recursive: true });

const invalidFile = path.join(outDir, 'invalid-upload.txt');
await writeFile(invalidFile, 'not an image\n', 'utf8');

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
  await step('click-primary', async () => page.getByText('拍照识别', { exact: true }).first().click());
  await page.waitForTimeout(500);
  await screenshot(page, '02-capture');
  await step('upload-invalid-file', async () => {
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
    await page.getByText('上传识别', { exact: true }).first().click();
    const chooser = await chooserPromise;
    if (chooser) await chooser.setFiles(invalidFile);
    else await page.locator('input[type="file"]').last().setInputFiles(invalidFile);
  });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  await screenshot(page, '03-invalid-feedback');

  const bodyText = await visibleText(page);
  const result = {
    schemaVersion: 'product-review-browser-invalid-upload-smoke-v1',
    generatedAt: new Date().toISOString(),
    url,
    invalidFile,
    finalRoute: page.url(),
    bodyText,
    interactions,
    consoleErrors,
    networkErrors,
    screenshots,
    expectedText,
    passed: bodyText.includes(expectedText) && !page.url().includes('/pages/report/index')
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
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || undefined;
}
