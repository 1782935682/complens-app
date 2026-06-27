import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwright = loadPlaywright();

const url = getArg('--url') || 'http://127.0.0.1:5207/';
const sample = getArg('--sample');
const outDir = getArg('--out-dir') || 'reports/product-review/screenshots/profile-priority-smoke';
const outputJson = getArg('--output-json') || path.join(outDir, 'result.json');

if (!sample) throw new Error('Missing --sample');

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(outputJson), { recursive: true });

const scenarios = [
  {
    id: 'sugar',
    settings: { primaryGoal: 'sugar', targetGoals: ['sugar'], isChildrenMode: false, allergens: [], updatedAt: new Date().toISOString() },
    expectedFirst: /糖|碳水|甜味剂/u,
    forbiddenFirst: /过敏|忌口|致敏|牛奶|乳制品/u
  },
  {
    id: 'milk-allergy',
    settings: { primaryGoal: 'daily', targetGoals: [], isChildrenMode: false, allergens: ['milk'], updatedAt: new Date().toISOString() },
    expectedFirst: /过敏|忌口|牛奶|乳制品/u,
    forbiddenFirst: /^$/u
  }
];

const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: findChromeExecutable()
});

const results = [];

try {
  for (const scenario of scenarios) {
    results.push(await runScenario(browser, scenario));
  }
} finally {
  await browser.close();
}

const passed = results.every((result) => result.passed);
const output = {
  schemaVersion: 'product-review-browser-profile-priority-smoke-v1',
  generatedAt: new Date().toISOString(),
  url,
  sample,
  results,
  passed
};
await writeFile(outputJson, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  passed,
  outputJson,
  results: results.map((result) => ({
    id: result.id,
    firstProof: result.firstProof,
    finalRoute: result.finalRoute,
    passed: result.passed,
    screenshots: result.screenshots
  }))
}, null, 2));
if (!passed) process.exitCode = 1;

async function runScenario(browserInstance, scenario) {
  const screenshots = [];
  const interactions = [];
  const consoleErrors = [];
  const networkErrors = [];
  const context = await browserInstance.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await context.addInitScript((settings) => {
    window.localStorage.setItem('complens:user-attention-settings', JSON.stringify(settings));
  }, scenario.settings);
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

  try {
    await step(interactions, 'open-home', async () => page.goto(url, { waitUntil: 'networkidle' }));
    await screenshot(page, screenshots, scenario.id, '01-home');
    await step(interactions, 'enter-capture', async () => page.getByText('拍照识别', { exact: true }).first().click());
    await page.waitForURL(/\/pages\/capture\/index/u, { timeout: 8_000 });
    await screenshot(page, screenshots, scenario.id, '02-capture');
    await step(interactions, 'upload-sample', async () => {
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 3_000 });
      await page.getByText('选择包装标签图片', { exact: true }).first().click();
      const chooser = await chooserPromise;
      await chooser.setFiles(sample);
    });
    await page.waitForURL(/\/pages\/report\/index/u, { timeout: 25_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    await screenshot(page, screenshots, scenario.id, '03-report');
    const bodyText = await visibleText(page);
    const proofRows = await page.locator('.fast-summary-row').evaluateAll((rows) => rows.map((row) => ({
      tag: row.querySelector('.fast-summary-row__tag')?.textContent?.trim() || '',
      text: row.querySelector('.fast-summary-row__text')?.textContent?.trim() || '',
      source: row.querySelector('.fast-summary-row__source')?.textContent?.trim() || ''
    }))).catch(() => []);
    const firstProof = proofRows[0] ? `${proofRows[0].tag} ${proofRows[0].text}`.trim() : '';
    const conclusionOk = scenario.id === 'milk-allergy'
      ? /不要购买|不建议|命中.*过敏|忌口/u.test(bodyText)
      : /按控糖判断|控糖/u.test(bodyText);
    const passed = page.url().includes('/pages/report/index')
      && scenario.expectedFirst.test(firstProof)
      && !scenario.forbiddenFirst.test(firstProof)
      && conclusionOk
      && consoleErrors.length === 0
      && networkErrors.length === 0;
    return {
      id: scenario.id,
      settings: scenario.settings,
      finalRoute: page.url(),
      firstProof,
      proofRows,
      bodyText,
      interactions,
      consoleErrors,
      networkErrors,
      screenshots,
      passed
    };
  } finally {
    await context.close();
  }
}

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

async function step(interactions, action, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    interactions.push({ action, durationMs: Date.now() - startedAt, ok: true });
  } catch (error) {
    interactions.push({ action, durationMs: Date.now() - startedAt, ok: false, error: error.message });
    throw error;
  }
}

async function screenshot(page, screenshots, scenarioId, name) {
  const filePath = path.join(outDir, `${scenarioId}-${name}.png`);
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
