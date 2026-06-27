import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import playwright from '../../user-uniapp/node_modules/playwright/index.js';

const { chromium } = playwright;

const round = Number.parseInt(getArg('--round') || '1', 10);
const h5Url = getArg('--url') || 'http://127.0.0.1:5179/';
const apiBaseUrl = getArg('--api-base') || 'http://127.0.0.1:3100/api';
const catalogPath = getArg('--catalog') || `reports/product-review/fixtures/round-${round}/sample-catalog-public.json`;
const outputDir = getArg('--output-dir') || `reports/product-review/raw/deepseek/round-${round}`;
const screenshotsDir = getArg('--screenshots-dir') || `reports/product-review/screenshots/round-${round}/deepseek`;
const checkpointPath = '.codex/state/product-review-checkpoint.json';
const maxSteps = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_MAX_STEPS || '30', 10);
const actionMaxTokens = Math.max(Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_ACTION_TOKENS || '512', 10), 512);
const finalMaxTokens = Math.max(Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_FINAL_TOKENS || '2200', 10), 2200);
const apiTimeoutMs = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_TIMEOUT_MS || '60000', 10);
const apiJsonBodyTimeoutMs = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_JSON_TIMEOUT_MS || String(Math.max(apiTimeoutMs * 2, 120000)), 10);
const finalTranscriptSteps = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_FINAL_STEPS || '14', 10);
const personaTimeoutMs = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_PERSONA_TIMEOUT_MS || '240000', 10);
const finalReviewTimeoutMs = Number.parseInt(process.env.PRODUCT_REVIEW_DEEPSEEK_FINAL_REVIEW_TIMEOUT_MS || String(Math.max(apiJsonBodyTimeoutMs, 240000)), 10);
const unlimitedTokens = process.env.PRODUCT_REVIEW_DEEPSEEK_UNLIMITED_TOKENS === '1';
const onlyPersonas = getArg('--only')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const overwriteExisting = process.argv.includes('--overwrite');
const skipCheckpoint = process.argv.includes('--no-checkpoint');
const configuredModel = (process.env.DEEPSEEK_MODEL || '').trim();
let model = configuredModel;
let fallbackModel = '';
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/u, '');

const personas = [
  {
    slug: 'first-time-consumer',
    persona: '首次使用的普通消费者，不懂配料、营养和食品标准，只想快速知道是否值得购买'
  },
  {
    slug: 'time-pressed-consumer',
    persona: '超市中时间紧张的消费者，希望30秒内完成判断，不愿阅读长文'
  },
  {
    slug: 'parent-child-snack',
    persona: '为儿童挑选零食的家长，关注糖、钠、过敏原和添加剂，需要理解推荐依据'
  },
  {
    slug: 'sugar-control',
    persona: '控糖用户，需要比较两款饮料或酸奶，关注糖、碳水和甜味剂'
  },
  {
    slug: 'allergy-sensitive',
    persona: '食物过敏用户，需要确认过敏原，对错误结论和模糊表述高度敏感'
  },
  {
    slug: 'generic-ai-skeptic',
    persona: '怀疑产品价值的用户，熟悉通用AI拍照，专门判断为什么不用普通AI直接拍照询问'
  }
];

const tasks = [
  '任务1 首次打开：在没有说明的情况下判断产品是做什么的，找到并开始一次食品识别。',
  '任务2 单商品决策：上传或拍摄一个食品包装，找到是否值得购买的结论，并说明主要证据。',
  '任务3 信息不足：使用只有包装正面、没有配料表的图片，判断系统是否正确说明信息不足以及下一步。',
  '任务4 异常恢复：使用模糊或识别失败图片，尝试恢复并完成后续操作。',
  '任务5 商品对比：比较两个同类商品，判断哪个更适合当前用户角色并说明原因。',
  '任务6 个性化：设置或切换用户画像，检查同一商品的结论是否发生合理变化。',
  '任务7 留存能力：尝试收藏、加入避雷、查看历史或再次比较，判断是否值得下次打开。',
  '任务8 产品替代性：回答与直接把图片发给通用AI相比，成分镜有什么不可替代或明显更方便的价值。'
];

if (process.argv.includes('--validate-summary-merge')) {
  await validateSummaryMerge();
  process.exit(0);
}

if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is missing');
  process.exit(2);
}

await mkdir(outputDir, { recursive: true });
await mkdir(screenshotsDir, { recursive: true });

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const sampleCatalog = catalog.samples.map(({ id, title, path }) => ({ id, title, path }));
const publicSampleCatalog = sampleCatalog.map(({ id, title }) => ({ id, title }));
const modelCheck = await fetchModels();
if (!model) {
  model = chooseDefaultModel(modelCheck.availableModels || []);
  modelCheck.selectedModel = model || '';
  modelCheck.selectionReason = model
    ? 'DEEPSEEK_MODEL was not set; selected from provider model list.'
    : 'DEEPSEEK_MODEL was not set and provider model list did not expose a usable chat model.';
}
if (!model) {
  console.error('DEEPSEEK_MODEL is missing and no usable model was found via /models');
  process.exit(2);
}
if (!configuredModel && /reasoner|reason|r1/i.test(model) && modelCheck.availableModels?.includes('deepseek-chat')) {
  fallbackModel = 'deepseek-chat';
  modelCheck.fallbackModel = fallbackModel;
  modelCheck.fallbackReason = 'Use chat model only when JSON content is empty or malformed after retries.';
}
if (modelCheck.availableModels?.length && !modelCheck.availableModels.includes(model)) {
  console.error(`Configured DEEPSEEK_MODEL is not present in /models: ${model}`);
  process.exit(2);
}
const configuredFallbackModel = (process.env.DEEPSEEK_FALLBACK_MODEL || '').trim();
if (configuredFallbackModel && modelCheck.availableModels?.includes(configuredFallbackModel) && configuredFallbackModel !== model) {
  fallbackModel = configuredFallbackModel;
  modelCheck.fallbackModel = fallbackModel;
  modelCheck.fallbackReason = 'Use DEEPSEEK_FALLBACK_MODEL only after empty JSON content retries.';
}
if (!fallbackModel && modelCheck.availableModels?.includes('deepseek-chat') && model !== 'deepseek-chat') {
  fallbackModel = 'deepseek-chat';
  modelCheck.fallbackModel = fallbackModel;
  modelCheck.fallbackReason = 'Use deepseek-chat only when the selected model returns empty JSON content or invalid final-review schema.';
}
if (!fallbackModel && modelCheck.availableModels?.includes('deepseek-v4-flash') && model !== 'deepseek-v4-flash') {
  fallbackModel = 'deepseek-v4-flash';
  modelCheck.fallbackModel = fallbackModel;
  modelCheck.fallbackReason = 'Use deepseek-v4-flash only when the selected model returns empty JSON content or invalid final-review schema.';
}
if (!fallbackModel && modelCheck.availableModels?.length) {
  const candidate = modelCheck.availableModels.find((id) => id !== model && /flash|chat|v3|v4/i.test(id));
  if (candidate) {
    fallbackModel = candidate;
    modelCheck.fallbackModel = fallbackModel;
    modelCheck.fallbackReason = 'Use an alternate listed chat-capable model only after empty JSON content or invalid final-review schema retries.';
  }
}
const personasToRun = onlyPersonas.length
  ? personas.filter((persona) => onlyPersonas.includes(persona.slug))
  : personas;

for (const persona of personasToRun) {
  const outputPath = `${outputDir}/${persona.slug}.json`;
  if (!overwriteExisting && existsSync(outputPath)) {
    continue;
  }
  const result = await runPersona(persona);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

const summarySessions = await readDeepseekRoundSummarySessions(outputDir);
const summary = {
  schemaVersion: 'deepseek-blackbox-summary-v1',
  round,
  reviewMode: 'text-black-box-interaction',
  model,
  modelCheck,
  generatedAt: new Date().toISOString(),
  maxSteps,
  actionMaxTokens,
  finalMaxTokens,
  apiJsonBodyTimeoutMs,
  finalTranscriptSteps,
  personaTimeoutMs,
  finalReviewTimeoutMs,
  sessions: summarySessions
};
await writeFile(`${outputDir}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
if (!skipCheckpoint) await updateCheckpoint(summary);
console.log(`DeepSeek black-box sessions complete: ${outputDir}/summary.json`);

async function readDeepseekRoundSummarySessions(rawDir) {
  if (!existsSync(rawDir)) return [];
  const entries = await readdir(rawDir, { withFileTypes: true });
  const order = new Map(personas.map((persona, index) => [persona.slug, index]));
  const rawFiles = entries
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.endsWith('.json') && entry.name !== 'summary.json')
    .map((entry) => path.join(rawDir, entry.name))
    .sort((left, right) => {
      const leftSlug = path.basename(left, '.json');
      const rightSlug = path.basename(right, '.json');
      const leftOrder = order.has(leftSlug) ? order.get(leftSlug) : Number.MAX_SAFE_INTEGER;
      const rightOrder = order.has(rightSlug) ? order.get(rightSlug) : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || leftSlug.localeCompare(rightSlug);
    });
  const sessions = [];
  for (const filePath of rawFiles) {
    const raw = JSON.parse(await readFile(filePath, 'utf8'));
    sessions.push(summarySessionFromRaw(filePath, raw));
  }
  return sessions;
}

function summarySessionFromRaw(filePath, raw) {
  const tasksValue = Array.isArray(raw.tasks) ? raw.tasks : [];
  return {
    sessionId: raw.sessionId || '',
    persona: raw.persona || path.basename(filePath, '.json'),
    filePath,
    verdict: raw.verdict,
    scores: raw.scores || {},
    completedTasks: tasksValue.filter((task) => task.completed).length,
    failedTasks: tasksValue.filter((task) => !task.completed).length
  };
}

async function validateSummaryMerge() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'compcheck-deepseek-summary-merge-'));
  const reportPath = getArg('--report') || 'reports/product-review/deepseek-summary-merge-validation.json';
  const result = {
    schemaVersion: 'deepseek-summary-merge-validation-v1',
    generatedAt: new Date().toISOString(),
    round,
    passed: false,
    tempRoot,
    reportPath,
    assertions: [],
    output: null,
    error: null
  };

  try {
    const rawDir = path.join(tempRoot, `reports/product-review/raw/deepseek/round-${round}`);
    await mkdir(rawDir, { recursive: true });
    for (const persona of personas) {
      await writeFile(path.join(rawDir, `${persona.slug}.json`), `${JSON.stringify({
        provider: 'deepseek',
        persona: persona.persona,
        sessionId: `fixture-${persona.slug}`,
        verdict: 'usable',
        scores: { overallValue: 4 },
        tasks: [{ taskId: 'task-1', completed: true }]
      }, null, 2)}\n`, 'utf8');
    }
    await writeFile(path.join(rawDir, 'summary.json'), `${JSON.stringify({
      schemaVersion: 'deepseek-blackbox-summary-v1',
      round,
      sessions: [{ filePath: path.join(rawDir, `${personas[0].slug}.json`) }]
    }, null, 2)}\n`, 'utf8');

    const sessions = await readDeepseekRoundSummarySessions(rawDir);
    const sessionSlugs = sessions.map((session) => path.basename(session.filePath, '.json'));
    result.output = {
      sessionCount: sessions.length,
      sessionSlugs,
      filePaths: sessions.map((session) => session.filePath)
    };

    assertValidation(sessions.length === personas.length, 'summary merge keeps all existing raw DeepSeek sessions', result);
    assertValidation(!sessions.some((session) => session.filePath.endsWith('/summary.json')), 'summary.json is never counted as a raw session', result);
    assertValidation(
      JSON.stringify(sessionSlugs) === JSON.stringify(personas.map((persona) => persona.slug)),
      'summary sessions use stable persona order instead of only the most recent --only run',
      result
    );
    assertValidation(
      sessions.every((session) => session.completedTasks === 1 && session.failedTasks === 0),
      'summary session task counts are derived from raw task completion flags',
      result
    );

    result.passed = true;
  } catch (error) {
    result.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : ''
    };
  } finally {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    if (!process.argv.includes('--keep-temp')) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }

  if (!result.passed) {
    console.error(`DeepSeek summary merge validation failed. Report: ${reportPath}`);
    if (result.error?.message) console.error(result.error.message);
    process.exit(1);
  }
  console.log(`DeepSeek summary merge validation passed. Report: ${reportPath}`);
}

function assertValidation(condition, message, target) {
  target.assertions.push({
    message,
    passed: Boolean(condition)
  });
  if (!condition) throw new Error(message);
}

async function runPersona(personaConfig) {
  const sessionId = `deepseek-r${round}-${personaConfig.slug}-${Date.now().toString(36)}`;
  const startedAt = Date.now();
  const deadlineAt = startedAt + personaTimeoutMs;
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN'
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];
  const interactions = [];
  const stateHistory = [];
  let lastResult = 'session_start';
  let loopCount = 0;
  let previousActionKey = '';

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleErrors.push(`${message.type()}: ${message.text()}`.slice(0, 500));
    }
  });
  page.on('requestfailed', (request) => {
    networkErrors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || 'request_failed'}`.slice(0, 500));
  });

  const messages = [
    {
      role: 'system',
      content: [
        '你是独立黑盒用户评审代理。你不能读取代码、设计文档、checkpoint、测试答案、旧评测或其他代理输出。',
        '产品信息只允许知道：成分镜是一款帮助普通消费者了解和选择食品的微信小程序。请像第一次使用它的真实用户一样完成给定任务。',
        `你的用户角色：${personaConfig.persona}`,
        '每一步只能输出严格 JSON，不要输出推理：{"action":"click|input|back|scroll|selectImage|wait|quit","elementId":"","value":"","sampleId":"","reason":""}',
        '不要索要提示。卡住就按真实用户行为等待、返回或退出。',
        '可选 sampleId 只来自页面状态里的 sampleCatalog；sampleId 是不含预期答案的机械文件编号。',
        '如果你要从本地选择一张样本图片，请直接使用 selectImage(sampleId)，不要只点击系统文件选择器。'
      ].join('\n')
    },
    {
      role: 'user',
      content: `用户任务：\n${tasks.join('\n')}`
    }
  ];

  try {
    await assertReviewEnvironmentAvailable();
    await page.goto(h5Url, { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => localStorage.setItem('complens:user-api-base-url', value), apiBaseUrl);
    await page.reload({ waitUntil: 'networkidle' });

    for (let step = 1; step <= maxSteps; step += 1) {
      assertPersonaTimeRemaining(deadlineAt, personaConfig.slug, `before_step_${step}`);
      const state = await withPersonaTimeout(captureState(page, personaConfig.slug, step, lastResult), deadlineAt, personaConfig.slug, `capture_step_${step}`);
      stateHistory.push(state);
      messages.push({
        role: 'user',
        content: JSON.stringify({
          step,
          maxSteps,
          lastResult,
          currentPageState: slimState(state),
          sampleCatalog: publicSampleCatalog
        })
      });
      const rawAction = await withPersonaTimeout(chat(messages, { maxTokens: actionMaxTokens }), deadlineAt, personaConfig.slug, `action_step_${step}`);
      const action = await withPersonaTimeout(parseOrRetryAction(messages, rawAction), deadlineAt, personaConfig.slug, `parse_action_step_${step}`);
      interactions.push({
        step,
        rawAction,
        action,
        before: {
          route: state.route,
          visibleText: state.visibleText.slice(0, 600)
        },
        at: new Date().toISOString()
      });
      messages.push({ role: 'assistant', content: JSON.stringify(action) });
      const actionKey = JSON.stringify(action);
      loopCount = actionKey === previousActionKey ? loopCount + 1 : 0;
      previousActionKey = actionKey;
      if (loopCount >= 2) {
        lastResult = 'failure: repeated same action three times';
        break;
      }
      const execution = await withPersonaTimeout(executeAction(page, action), deadlineAt, personaConfig.slug, `execute_step_${step}`);
      interactions[interactions.length - 1].execution = execution;
      lastResult = execution.result;
      if (page.isClosed()) {
        lastResult = 'failure: page closed during interaction';
        break;
      }
      if (action.action === 'quit') break;
    }

    const finalState = await withPersonaTimeout(captureState(page, personaConfig.slug, 'final', lastResult), deadlineAt, personaConfig.slug, 'capture_final');
    stateHistory.push(finalState);
    const finalReview = await withFixedTimeout(buildFinalReview({
      personaConfig,
      sessionId,
      interactions,
      stateHistory,
      consoleErrors,
      networkErrors
    }), finalReviewTimeoutMs, `final_review_timeout_${finalReviewTimeoutMs}ms:${personaConfig.slug}`);
    return normalizeReview(finalReview, {
      sessionId,
      persona: personaConfig.persona,
      interactions,
      stateHistory,
      consoleErrors,
      networkErrors
    });
  } catch (error) {
    return buildRuntimeFailure({
      sessionId,
      persona: personaConfig.persona,
      error: error instanceof Error ? error.message : String(error),
      interactions,
      stateHistory,
      consoleErrors,
      networkErrors
    });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function assertPersonaTimeRemaining(deadlineAt, personaSlug, stage) {
  if (!Number.isFinite(personaTimeoutMs) || personaTimeoutMs <= 0) return;
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) {
    throw new Error(`persona_timeout_${personaTimeoutMs}ms:${personaSlug}:${stage}`);
  }
}

async function withPersonaTimeout(promise, deadlineAt, personaSlug, stage) {
  if (!Number.isFinite(personaTimeoutMs) || personaTimeoutMs <= 0) return promise;
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new Error(`persona_timeout_${personaTimeoutMs}ms:${personaSlug}:${stage}`);
  let timeout;
  const guarded = Promise.resolve(promise);
  guarded.catch(() => undefined);
  try {
    return await Promise.race([
      guarded,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`persona_timeout_${personaTimeoutMs}ms:${personaSlug}:${stage}`)), remainingMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function withFixedTimeout(promise, timeoutMs, message) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timeout;
  const guarded = Promise.resolve(promise);
  guarded.catch(() => undefined);
  try {
    return await Promise.race([
      guarded,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function captureState(page, personaSlug, step, lastResult) {
  await page.waitForTimeout(350).catch(() => undefined);
  if (page.isClosed()) {
    return {
      title: '',
      route: 'page_closed',
      visibleText: '页面已关闭，无法继续交互。',
      clickableElements: [],
      inputs: [],
      loading: false,
      emptyState: false,
      errorState: true,
      lastResult,
      screenshotPath: ''
    };
  }
  await annotateCandidates(page);
  const screenshotPath = `${screenshotsDir}/${personaSlug}-step-${String(step).padStart(2, '0')}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return await page.evaluate(({ screenshotPath, lastResult }) => {
    const visibleText = document.body?.innerText?.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() || '';
    const candidates = Array.from(document.querySelectorAll('[data-blackbox-id]')).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        elementId: element.getAttribute('data-blackbox-id'),
        tag: element.tagName.toLowerCase(),
        text: (element.innerText || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        type: element.getAttribute('type') || element.getAttribute('role') || element.className || '',
        disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
        position: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      };
    }).filter((item) => item.visible);
    const inputs = Array.from(document.querySelectorAll('input, textarea')).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        elementId: element.getAttribute('data-blackbox-id') || '',
        tag: element.tagName.toLowerCase(),
        placeholder: element.getAttribute('placeholder') || '',
        valueLength: String(element.value || '').length,
        disabled: Boolean(element.disabled),
        position: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    });
    return {
      title: document.title || '',
      route: location.href,
      visibleText,
      clickableElements: candidates.slice(0, 40),
      inputs: inputs.slice(0, 12),
      loading: /正在|加载|识别中|处理中/.test(visibleText),
      emptyState: /没有|暂无|还不能|未识别|信息不足/.test(visibleText),
      errorState: /错误|失败|不可用|请重试|不够清楚/.test(visibleText),
      lastResult,
      screenshotPath
    };
  }, { screenshotPath, lastResult });
}

async function annotateCandidates(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-blackbox-id]').forEach((element) => element.removeAttribute('data-blackbox-id'));
    const selectors = [
      'button',
      '[role="button"]',
      'a',
      'input',
      'textarea',
      '.scan-button',
      '.app-button',
      '.link',
      '.option-card',
      '.allergen-option',
      '.feedback-option',
      '.image-uploader__action',
      '.product-cell',
      '.segment',
      '.quick-action',
      '.goal-chip',
      '.filter-chip',
      '.recent-item',
      '.profile-strip',
      '.profile-edit',
      '.top-action',
      '.action-links .link',
      'uni-button'
    ].join(',');
    Array.from(document.querySelectorAll(selectors)).forEach((element, index) => {
      element.setAttribute('data-blackbox-id', `e${index + 1}`);
    });
  });
}

function slimState(state) {
  return {
    title: state.title,
    route: state.route,
    visibleText: state.visibleText.slice(0, 1600),
    clickableElements: state.clickableElements,
    inputs: state.inputs,
    loading: state.loading,
    emptyState: state.emptyState,
    errorState: state.errorState,
    lastResult: state.lastResult
  };
}

async function executeAction(page, action) {
  const started = Date.now();
  try {
    if (action.action === 'wait') {
      await page.waitForTimeout(1200);
      return { ok: true, result: 'waited', durationMs: Date.now() - started };
    }
    if (action.action === 'quit') {
      return { ok: true, result: `quit: ${action.reason || ''}`.trim(), durationMs: Date.now() - started };
    }
    if (action.action === 'back') {
      await page.goBack({ waitUntil: 'networkidle', timeout: 4000 }).catch(() => page.evaluate(() => history.back()));
      await page.waitForTimeout(800);
      return { ok: true, result: 'went back', durationMs: Date.now() - started };
    }
    if (action.action === 'scroll') {
      const delta = action.value === 'up' || action.direction === 'up' ? -520 : 520;
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(500);
      return { ok: true, result: `scrolled ${delta < 0 ? 'up' : 'down'}`, durationMs: Date.now() - started };
    }
    if (action.action === 'selectImage') {
      return await selectImage(page, action.sampleId || action.value, started);
    }
    if (action.action === 'click') {
      const elementId = String(action.elementId || action.value || '').trim();
      if (!elementId) return { ok: false, result: 'invalid click: missing elementId', durationMs: Date.now() - started };
      const locator = page.locator(`[data-blackbox-id="${cssEscape(elementId)}"]`).first();
      if (await locator.count() === 0) return { ok: false, result: `invalid click: ${elementId} not found`, durationMs: Date.now() - started };
      const elementText = ((await locator.innerText({ timeout: 1000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      await locator.click({ timeout: 3000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(900);
      if (/上传识别|拍照识别|选择图片|相册/u.test(elementText)) {
        return {
          ok: true,
          result: `clicked ${elementId}; file picker action needs selectImage(sampleId) to choose a test image`,
          durationMs: Date.now() - started
        };
      }
      return { ok: true, result: `clicked ${elementId}`, durationMs: Date.now() - started };
    }
    if (action.action === 'input') {
      const elementId = String(action.elementId || '').trim();
      const value = String(action.value || '');
      if (!elementId) return { ok: false, result: 'invalid input: missing elementId', durationMs: Date.now() - started };
      const locator = page.locator(`[data-blackbox-id="${cssEscape(elementId)}"]`).first();
      if (await locator.count() === 0) return { ok: false, result: `invalid input: ${elementId} not found`, durationMs: Date.now() - started };
      await locator.fill(value, { timeout: 3000 });
      await page.waitForTimeout(500);
      return { ok: true, result: `filled ${elementId}`, durationMs: Date.now() - started };
    }
    return { ok: false, result: `invalid action: ${action.action || 'unknown'}`, durationMs: Date.now() - started };
  } catch (error) {
    return { ok: false, result: `action error: ${error instanceof Error ? error.message : String(error)}`.slice(0, 500), durationMs: Date.now() - started };
  }
}

async function selectImage(page, sampleId, started) {
  const sample = sampleCatalog.find((item) => item.id === sampleId);
  if (!sample) return { ok: false, result: `invalid sampleId: ${sampleId || ''}`, durationMs: Date.now() - started };
  const filePath = resolve(sample.path);
  if (!existsSync(filePath)) return { ok: false, result: `sample file not found: ${sampleId}`, durationMs: Date.now() - started };
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  const upload = page.locator('text=上传识别').first();
  const scan = page.locator('text=拍照识别').first();
  if (await upload.count()) {
    await upload.click({ timeout: 2000 }).catch(() => undefined);
  } else if (await scan.count()) {
    await scan.click({ timeout: 2000 }).catch(() => undefined);
  }
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(filePath);
  } else {
    const input = page.locator('input[type=file]').last();
    if (await input.count() === 0) return { ok: false, result: 'no file chooser available on current page', durationMs: Date.now() - started };
    await input.setInputFiles(filePath);
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(1800);
  return { ok: true, result: `selected image ${sampleId}`, durationMs: Date.now() - started };
}

async function buildFinalReview(input) {
  const evidence = input.stateHistory.flatMap((state) => [
    { type: 'screenshot', pathOrValue: state.screenshotPath },
    { type: 'route', pathOrValue: state.route }
  ]);
  const compactTranscript = {
    persona: input.personaConfig.persona,
    sessionId: input.sessionId,
    reviewMode: 'text-black-box-interaction',
    taskEvidence: tasks.map((taskLabel, index) => buildFinalTaskEvidence(input, evidence, taskLabel, index)),
    finalState: compactStateForFinalReview(input.stateHistory[input.stateHistory.length - 1]),
    runtime: {
      totalSteps: input.interactions.length,
      consoleErrors: input.consoleErrors.slice(-5),
      networkErrors: input.networkErrors.slice(-5)
    }
  };
  const messages = [
    {
      role: 'system',
      content: [
        '你是同一个黑盒用户评审代理。只基于刚才的页面状态和操作记录输出最终结构化评审。',
        '不要输出内部推理。不要美化失败。不要因为环境是测试环境就给高分。',
        '评分范围1到5；任何问题必须包含 severity/page/reproSteps/userImpact/evidence/suggestedDirection。',
        'tasks 必须正好包含 task-1 到 task-8。每个任务必须有 completed、assistanceUsed、stepCount、durationMs、failureStep、confusionPoints、evidence。',
        '如果页面交互记录不能证明任务完成，completed 必须为 false，failureStep 写清卡住位置或 not_confirmed_by_structured_review。',
        '输出严格 JSON，字段必须符合用户要求的 schema。'
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify(compactTranscript)
    }
  ];
  let raw = '';
  try {
    raw = await chat(messages, { maxTokens: finalMaxTokens });
  } catch (error) {
    return finalReviewInfrastructureFailure(error);
  }
  const parsed = parseJson(raw);
  if (isUsableFinalReview(parsed)) return parsed;
  let retryRaw = '';
  try {
    retryRaw = await chat([
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: [
          '上一条最终评审不是可用 schema。',
          '只返回一个完整 JSON 对象，不要解释，不要包含 markdown。',
          '必须包含 tasks 数组，且必须正好有 task-1 到 task-8；每个 task 必须包含 completed、assistanceUsed、stepCount、durationMs、failureStep、confusionPoints、evidence。'
        ].join('\n')
      }
    ], { maxTokens: finalMaxTokens * 2 });
  } catch (error) {
    return finalReviewInfrastructureFailure(error);
  }
  const retryParsed = parseJson(retryRaw);
  if (isUsableFinalReview(retryParsed)) return retryParsed;
  if (fallbackModel && fallbackModel !== model) {
    try {
      const fallbackRaw = await chat([
        messages[0],
        {
          role: 'user',
          content: [
            '请只根据这个压缩证据包输出最终评审 JSON。',
            '必须返回 JSON 对象，必须包含 tasks 数组，taskId 必须为 task-1 到 task-8。',
            '不要输出说明，不要输出 markdown。',
            JSON.stringify(compactTranscript)
          ].join('\n')
        }
      ], { maxTokens: finalMaxTokens * 2, modelOverride: fallbackModel });
      const fallbackParsed = parseJson(fallbackRaw);
      if (isUsableFinalReview(fallbackParsed)) return fallbackParsed;
    } catch {
      // Keep the explicit schema failure below; the failed raw session remains preserved.
    }
  }
  const taskLevelReview = await buildTaskLevelFinalReview(compactTranscript);
  if (isUsableFinalReview(taskLevelReview) && taskLevelReview.taskLevelParsedCount > 0) return taskLevelReview;
  return finalReviewInfrastructureFailure(new Error('Final DeepSeek review JSON missing required task-1..task-8 schema after retry'));
}

async function buildTaskLevelFinalReview(compactTranscript) {
  const taskReviews = [];
  const errors = [];
  let parsedCount = 0;
  for (const taskEvidence of compactTranscript.taskEvidence) {
    const prompt = {
      persona: compactTranscript.persona,
      sessionId: compactTranscript.sessionId,
      reviewMode: compactTranscript.reviewMode,
      task: taskEvidence,
      finalState: compactTranscript.finalState,
      runtime: compactTranscript.runtime
    };
    let parsed = null;
    try {
      const raw = await chat(singleTaskFinalReviewMessages(prompt), { maxTokens: Math.max(1100, Math.floor(finalMaxTokens / 2)) });
      parsed = parseJson(raw);
      let task = extractSingleTaskReview(parsed, taskEvidence.taskId);
      if (!task && fallbackModel && fallbackModel !== model) {
        const fallbackRaw = await chat(singleTaskFinalReviewMessages(prompt), {
          maxTokens: Math.max(1100, Math.floor(finalMaxTokens / 2)),
          modelOverride: fallbackModel
        });
        parsed = parseJson(fallbackRaw);
        task = extractSingleTaskReview(parsed, taskEvidence.taskId);
      }
      if (task) {
        parsedCount += 1;
        taskReviews.push(task);
        continue;
      }
      errors.push(`${taskEvidence.taskId}: invalid single-task final-review schema`);
    } catch (error) {
      errors.push(`${taskEvidence.taskId}: ${error instanceof Error ? error.message : String(error)}`);
    }
    taskReviews.push(singleTaskInfrastructureFailure(taskEvidence, 'task_level_final_review_schema_failure'));
  }
  return {
    runnerFinalReviewError: errors.length
      ? `Whole final review schema invalid; task-level fallback parsed ${parsedCount}/${tasks.length}. ${errors.slice(0, 4).join('; ')}`
      : 'Whole final review schema invalid; task-level fallback used.',
    finalReviewMode: 'task-level-fallback',
    taskLevelParsedCount: parsedCount,
    taskLevelFinalReviewErrors: errors,
    tasks: taskReviews,
    verdict: parsedCount >= tasks.length ? undefined : 'major_revision'
  };
}

function singleTaskFinalReviewMessages(prompt) {
  return [
    {
      role: 'system',
      content: [
        '你是同一个黑盒用户评审代理。只基于给定页面状态和操作记录评审一个任务。',
        '不要输出内部推理。不要补全没有证据的成功。不要因为环境是测试环境就给高分。',
        '只返回 JSON 对象，不要 markdown。',
        '字段必须包含 taskId、completed、assistanceUsed、stepCount、durationMs、failureStep、confusionPoints、evidence、score。',
        'score 为 1 到 5；如果记录不能证明完成，completed 必须为 false，failureStep 写清卡住位置。'
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify(prompt)
    }
  ];
}

function extractSingleTaskReview(value, taskId) {
  const candidates = [];
  if (isPlainObject(value)) {
    candidates.push(findRawTask(normalizeRawTasks(value.tasks), Number(taskId.replace('task-', '')) - 1));
    candidates.push(value.task, value.review, value.result, value);
  }
  const candidate = candidates.find((item) => isPlainObject(item));
  if (!candidate) return null;
  const hasCompletion = typeof candidate.completed === 'boolean'
    || /completed|complete|done|success|通过|完成|failed|失败|未完成/u.test(String(candidate.status || candidate.result || candidate.completion || ''));
  const hasEvidence = Array.isArray(candidate.evidence) && candidate.evidence.length > 0;
  const hasScore = Number.isFinite(Number(candidate.score || candidate.rating || candidate.taskScore));
  const hasFailure = Boolean(candidate.failureStep || candidate.failure);
  if (!hasCompletion && !hasEvidence && !hasScore && !hasFailure) return null;
  const completionText = String(candidate.status || candidate.result || candidate.completion || '').toLowerCase();
  const derivedCompleted = /completed|complete|done|success|通过|完成/u.test(completionText)
    && !/failed|失败|未完成|not_confirmed|partial|部分/u.test(completionText);
  const completed = typeof candidate.completed === 'boolean' ? candidate.completed : derivedCompleted;
  return {
    ...candidate,
    taskId,
    completed,
    assistanceUsed: Boolean(candidate.assistanceUsed),
    stepCount: Number(candidate.stepCount || 0),
    durationMs: Number(candidate.durationMs || 0),
    failureStep: String(completed ? '' : candidate.failureStep || candidate.failure || 'not_confirmed_by_structured_review'),
    confusionPoints: normalizeStringList(candidate.confusionPoints || candidate.confusions || candidate.issues || []),
    evidence: normalizeEvidence(candidate.evidence, [])
  };
}

function singleTaskInfrastructureFailure(taskEvidence, failureStep) {
  return {
    taskId: taskEvidence.taskId,
    completed: false,
    assistanceUsed: false,
    stepCount: taskEvidence.actions.length,
    durationMs: taskEvidence.actions.reduce((sum, action) => sum + Number(action.durationMs || 0), 0),
    failureStep,
    confusionPoints: [],
    evidence: normalizeEvidence(taskEvidence.evidence, [])
  };
}

function isUsableFinalReview(value) {
  if (!isPlainObject(value)) return false;
  const rawTasks = normalizeRawTasks(value.tasks);
  if (rawTasks.length < tasks.length) return false;
  return tasks.every((_, index) => Boolean(findRawTask(rawTasks, index)));
}

function buildFinalTaskEvidence(input, evidence, taskLabel, index) {
  const interactionWindow = windowForIndex(input.interactions, index, Math.min(4, finalTranscriptSteps));
  const stateWindow = windowForIndex(input.stateHistory, index, Math.min(3, finalTranscriptSteps));
  return {
    taskId: `task-${index + 1}`,
    taskLabel,
    actions: interactionWindow.map((item) => ({
      step: item.step,
      action: item.action,
      result: item.execution?.result || '',
      ok: item.execution?.ok !== false,
      durationMs: item.execution?.durationMs || 0,
      routeBefore: item.before?.route || '',
      visibleTextBefore: compactVisibleText(item.before?.visibleText || '')
    })),
    states: stateWindow.map(compactStateForFinalReview),
    evidence: evidenceForTask(evidence, index).slice(0, 6)
  };
}

function windowForIndex(items, index, windowSize) {
  if (!items.length) return [];
  const size = Math.max(1, windowSize);
  const offset = Math.max(0, Math.floor((items.length - size) * (index / Math.max(1, tasks.length - 1))));
  const selected = items.slice(offset, offset + size);
  const last = items.slice(-1);
  const seen = new Set();
  return [...selected, ...last].filter((item) => {
    const key = JSON.stringify([
      item.step,
      item.route,
      item.screenshotPath,
      item.execution?.result,
      item.before?.route
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactStateForFinalReview(state) {
  if (!state) {
    return {
      route: '',
      visibleText: '',
      clickableCount: 0,
      inputCount: 0,
      loading: false,
      emptyState: false,
      errorState: false,
      lastResult: '',
      screenshotPath: ''
    };
  }
  return {
    route: state.route,
    visibleText: compactVisibleText(state.visibleText),
    clickableCount: state.clickableElements?.length || 0,
    inputCount: state.inputs?.length || 0,
    loading: Boolean(state.loading),
    emptyState: Boolean(state.emptyState),
    errorState: Boolean(state.errorState),
    lastResult: state.lastResult,
    screenshotPath: state.screenshotPath
  };
}

function compactVisibleText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= 420) return text;
  const keywords = ['该不该买', '推荐', '谨慎', '不建议', '信息不足', '补拍', '配料', '营养', '过敏', '忌口', '对比', '收藏', '避雷', '通用 AI'];
  const snippets = [];
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index >= 0) snippets.push(text.slice(Math.max(0, index - 60), Math.min(text.length, index + 180)));
    if (snippets.join(' ').length > 420) break;
  }
  const compact = snippets.length ? snippets.join(' | ') : text.slice(0, 420);
  return compact.slice(0, 520);
}

function finalReviewInfrastructureFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    runnerFinalReviewError: message,
    bugs: [{
      severity: 'P1',
      page: 'blackbox-runner',
      reproSteps: ['DeepSeek completed page interaction', 'Runner requested final structured review JSON.'],
      userImpact: message,
      evidence: 'Final DeepSeek review JSON was not returned.',
      suggestedDirection: 'Reduce final transcript size, retry JSON body reads, and rerun this persona in a fresh session.'
    }],
    verdict: 'reject',
    scores: {
      visualQuality: 1,
      easeOfUse: 1,
      decisionClarity: 1,
      trust: 1,
      comparisonValue: 1,
      retentionValue: 1,
      overallValue: 1
    }
  };
}

function normalizeReview(review, fallback) {
  const rawReview = isPlainObject(review) ? review : {};
  const evidence = fallback.stateHistory.flatMap((state) => [
    { type: 'screenshot', pathOrValue: state.screenshotPath },
    { type: 'route', pathOrValue: state.route }
  ]);
  const normalizedTasks = normalizeReviewTasks(rawReview.tasks, fallback, evidence, rawReview.runnerFinalReviewError);
  const derivedScores = deriveScores(rawReview, normalizedTasks);
  const derivedIssues = issuesFromTasks(normalizedTasks);
  const base = {
    provider: 'deepseek',
    persona: fallback.persona,
    reviewMode: 'text-black-box-interaction',
    sessionId: fallback.sessionId,
    tasks: buildTaskFallback(fallback, evidence),
    firstImpression: '',
    understoodProductWithin5Seconds: false,
    foundPrimaryActionWithoutHelp: false,
    understoodDecision: false,
    trustedDecision: false,
    understoodEvidenceSource: false,
    comparisonWasUseful: false,
    valueBeyondGenericAi: false,
    wouldUseAgain: false,
    wouldRecommend: false,
    scores: {
      visualQuality: 1,
      easeOfUse: 1,
      decisionClarity: 1,
      trust: 1,
      comparisonValue: 1,
      retentionValue: 1,
      overallValue: 1
    },
    bugs: [],
    uiProblems: [],
    interactionProblems: [],
    missingFeatures: [],
    lowValueFeatures: [],
    trustRisks: [],
    topReasonsToAbandon: [],
    topImprovements: [],
    verdict: 'reject'
  };
  return {
    ...base,
    ...rawReview,
    provider: 'deepseek',
    persona: fallback.persona,
    reviewMode: 'text-black-box-interaction',
    sessionId: fallback.sessionId,
    tasks: normalizedTasks,
    firstImpression: stringOrDefault(rawReview.firstImpression, base.firstImpression),
    understoodProductWithin5Seconds: booleanOrDerived(rawReview.understoodProductWithin5Seconds, normalizedTasks[0]?.completed),
    foundPrimaryActionWithoutHelp: booleanOrDerived(rawReview.foundPrimaryActionWithoutHelp, normalizedTasks[0]?.completed),
    understoodDecision: booleanOrDerived(rawReview.understoodDecision, normalizedTasks[1]?.completed),
    trustedDecision: booleanOrDerived(rawReview.trustedDecision, normalizedTasks[1]?.completed && derivedScores.trust >= 3),
    understoodEvidenceSource: booleanOrDerived(rawReview.understoodEvidenceSource, normalizedTasks[1]?.completed && derivedScores.trust >= 3),
    comparisonWasUseful: booleanOrDerived(rawReview.comparisonWasUseful, normalizedTasks[4]?.completed),
    valueBeyondGenericAi: booleanOrDerived(rawReview.valueBeyondGenericAi, normalizedTasks[7]?.completed && derivedScores.overallValue >= 4),
    wouldUseAgain: booleanOrDerived(rawReview.wouldUseAgain, derivedScores.retentionValue >= 4 && derivedScores.overallValue >= 4),
    wouldRecommend: booleanOrDerived(rawReview.wouldRecommend, derivedScores.overallValue >= 4 && derivedScores.trust >= 4),
    scores: derivedScores,
    bugs: normalizeIssueList(rawReview.bugs || []),
    uiProblems: normalizeIssueList(rawReview.uiProblems || []),
    interactionProblems: normalizeIssueList([...(rawReview.interactionProblems || []), ...derivedIssues.interactionProblems]),
    missingFeatures: normalizeIssueList([...(rawReview.missingFeatures || []), ...derivedIssues.missingFeatures]),
    lowValueFeatures: normalizeIssueList(rawReview.lowValueFeatures || []),
    trustRisks: normalizeIssueList([...(rawReview.trustRisks || []), ...derivedIssues.trustRisks]),
    topReasonsToAbandon: normalizeStringList(rawReview.topReasonsToAbandon || derivedIssues.topReasonsToAbandon),
    topImprovements: normalizeStringList(rawReview.topImprovements || derivedIssues.topImprovements),
    verdict: normalizeVerdict(rawReview.verdict, derivedScores, normalizedTasks),
    runtime: {
      stepCount: fallback.interactions.length,
      maxSteps,
      consoleErrors: fallback.consoleErrors,
      networkErrors: fallback.networkErrors,
      interactionLog: fallback.interactions
    }
  };
}

function normalizeReviewTasks(value, fallback, evidence, runnerFinalReviewError = '') {
  const rawTasks = normalizeRawTasks(value);
  const fallbackStepCount = fallback.interactions.length || 0;
  const fallbackDurationMs = totalInteractionDuration(fallback.interactions);
  return tasks.map((taskLabel, index) => {
    const raw = findRawTask(rawTasks, index);
    const score = clampScore(raw?.score ?? raw?.rating ?? raw?.taskScore);
    const completionText = String(raw?.completion || raw?.status || raw?.result || '').toLowerCase();
    const explicitlyCompleted = raw?.completed === true
      || /completed|complete|done|success|通过|完成/u.test(completionText);
    const explicitlyPartial = /partial|partially|部分/u.test(completionText);
    const completed = raw?.completed === false
      ? false
      : explicitlyCompleted && !explicitlyPartial
        ? true
        : score >= 4 && !explicitlyPartial;
    const issues = Array.isArray(raw?.issues) ? raw.issues : [];
    const fallbackFailureDetail = normalizeStringList(
      raw?.confusionPoints
        || issues.map((item) => item.userImpact || item.evidence || item.suggestedDirection)
    )[0] || '';
    return {
      taskId: `task-${index + 1}`,
      completed,
      assistanceUsed: Boolean(raw?.assistanceUsed),
      stepCount: Number(raw?.stepCount || fallbackStepCount),
      durationMs: Number(raw?.durationMs || fallbackDurationMs),
      failureStep: completed ? '' : normalizeTaskFailureStep(
        raw?.failureStep || raw?.failure || runnerFinalReviewError || (explicitlyPartial ? 'partial' : 'not_confirmed_by_recorded_interaction'),
        fallbackFailureDetail
      ),
      confusionPoints: normalizeStringList(raw?.confusionPoints || issues.map((item) => item.userImpact || item.evidence || item.suggestedDirection)),
      evidence: normalizeEvidence(raw?.evidence, evidenceForTask(evidence, index))
    };
  });
}

function normalizeTaskFailureStep(value, fallbackDetail = '') {
  const text = String(value || 'not_confirmed_by_recorded_interaction')
    .replace(/^not_confirmed_by_structured_review\s*:?\s*/iu, 'not_confirmed_by_recorded_interaction: ')
    .trim();
  if (/^not_confirmed_by_recorded_interaction\s*:?\s*$/iu.test(text) && fallbackDetail) {
    return `not_confirmed_by_recorded_interaction: ${fallbackDetail}`;
  }
  return text;
}

function findRawTask(rawTasks, index) {
  const tasks = normalizeRawTasks(rawTasks);
  return tasks.find((item) => {
    const value = String(item?.taskId || item?.taskName || item?.id || '').toLowerCase();
    return value === `task-${index + 1}`
      || value === `task${index + 1}`
      || value === String(index + 1)
      || value.includes(`任务${index + 1}`)
      || value.includes(`task-${index + 1}`)
      || value.includes(`task${index + 1}`);
  }) || tasks[index];
}

function normalizeRawTasks(value) {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return [];
  const entries = Object.entries(value);
  const numericEntries = entries
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, item]) => item);
  if (numericEntries.length) return numericEntries;
  return entries.map(([key, item]) => (
    isPlainObject(item) ? { taskId: key, ...item } : { taskId: key, value: item }
  ));
}

function deriveScores(review, normalizedTasks) {
  const raw = review.scores || {};
  const rawTasks = normalizeRawTasks(review.tasks || []);
  const taskScores = rawTasks.map((task) => Number(task?.score)).filter(Number.isFinite);
  const taskScore = (index, fallback = average(taskScores, 1)) => {
    const rawTask = findRawTask(rawTasks, index);
    const value = Number(rawTask?.score);
    return Number.isFinite(value) ? clampScore(value) : fallback;
  };
  const completionAverage = normalizedTasks.length
    ? normalizedTasks.filter((task) => task.completed).length / normalizedTasks.length
    : 0;
  const overall = clampScore(raw.overallValue ?? raw.overall ?? review.overallScore ?? average(taskScores, 1 + completionAverage * 4));
  return normalizeScores({
    visualQuality: raw.visualQuality ?? 1,
    easeOfUse: raw.easeOfUse ?? average([taskScore(0), taskScore(2), taskScore(3), taskScore(6)], overall),
    decisionClarity: raw.decisionClarity ?? taskScore(1, overall),
    trust: raw.trust ?? average([taskScore(1), taskScore(2), taskScore(7)], overall),
    comparisonValue: raw.comparisonValue ?? taskScore(4, overall),
    retentionValue: raw.retentionValue ?? taskScore(6, overall),
    overallValue: raw.overallValue ?? raw.overall ?? review.overallScore ?? overall
  });
}

function average(values, fallback = 1) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return fallback;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function issuesFromTasks(normalizedTasks) {
  const failed = normalizedTasks.filter((task) => !task.completed);
  const makeIssue = (task) => {
    const infraFailure = /DeepSeek API|JSON body timeout|runnerFinalReview|final structured review|task_level_final_review_schema_failure/i.test(task.failureStep);
    return {
      severity: task.failureStep === 'partial' ? 'P2' : 'P1',
      page: infraFailure ? 'DeepSeek review runner' : 'DeepSeek text-black-box interaction',
      reproSteps: [`Run ${task.taskId} in the recorded DeepSeek session.`],
      userImpact: task.confusionPoints[0] || task.failureStep || 'The task was not completed by the black-box user.',
      evidence: task.evidence.slice(0, 6).map((item) => item.pathOrValue).join('; '),
      suggestedDirection: infraFailure
        ? 'Fix structured final-review capture or rerun this persona with a smaller final transcript; keep the failed session as evidence.'
        : 'Use the recorded interaction evidence to improve the product flow, wording, or task affordance.'
    };
  };
  return {
    interactionProblems: failed.map(makeIssue),
    missingFeatures: [],
    trustRisks: failed
      .filter((task) => ['task-2', 'task-3', 'task-5', 'task-8'].includes(task.taskId))
      .map(makeIssue),
    topReasonsToAbandon: failed.map((task) => `${task.taskId}: ${task.failureStep}`).slice(0, 5),
    topImprovements: failed.map((task) => `Improve ${task.taskId} completion without assistance.`).slice(0, 5)
  };
}

function normalizeIssueList(value) {
  return (Array.isArray(value) ? value : [])
    .filter(Boolean)
    .map((item) => {
      const severity = normalizeSeverity(item?.severity);
      return {
        severity,
        page: String(item?.page || 'unknown'),
        reproSteps: Array.isArray(item?.reproSteps)
          ? item.reproSteps.map(String)
          : Array.isArray(item?.steps)
            ? item.steps.map(String)
            : [String(item?.reproSteps || item?.steps || 'Replay recorded interaction.')],
        userImpact: String(item?.userImpact || item?.impact || item?.summary || ''),
        evidence: Array.isArray(item?.evidence) ? item.evidence.map(String).join('; ') : String(item?.evidence || ''),
        suggestedDirection: String(item?.suggestedDirection || item?.suggestion || item?.suggestionDirection || '')
      };
    })
    .filter((item) => item.userImpact || item.evidence || item.suggestedDirection);
}

function normalizeSeverity(value) {
  const text = String(value || '').toUpperCase();
  if (['P0', 'P1', 'P2', 'P3'].includes(text)) return text;
  if (/HIGH|严重|高/.test(text)) return 'P1';
  if (/MEDIUM|中/.test(text)) return 'P2';
  if (/LOW|轻|低/.test(text)) return 'P3';
  return 'P2';
}

function normalizeEvidence(value, fallbackEvidence) {
  if (!Array.isArray(value) || !value.length) return fallbackEvidence;
  return value.map((item) => ({
    type: ['screenshot', 'route', 'console', 'network', 'interaction'].includes(item?.type) ? item.type : 'interaction',
    pathOrValue: String(item?.pathOrValue || item?.value || item || '')
  })).filter((item) => item.pathOrValue).slice(0, 16);
}

function normalizeStringList(value) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function booleanOrDerived(value, derived) {
  return typeof value === 'boolean' ? value : Boolean(derived);
}

function stringOrDefault(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function totalInteractionDuration(interactions) {
  return interactions.reduce((sum, item) => sum + Number(item.execution?.durationMs || 0), 0);
}

function evidenceForTask(evidence, index) {
  if (!evidence.length) return [];
  const windowSize = 6;
  const offset = Math.max(0, Math.floor((evidence.length - windowSize) * (index / Math.max(1, tasks.length - 1))));
  const selected = evidence.slice(offset, offset + windowSize);
  const first = evidence.slice(0, 2);
  const last = evidence.slice(-2);
  const seen = new Set();
  return [...first, ...selected, ...last]
    .filter((item) => {
      const key = `${item.type}:${item.pathOrValue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function normalizeVerdict(value, scores, normalizedTasks) {
  const text = String(value || '').trim();
  if (/reject|major_revision|minor_revision|usable/u.test(text)) return text;
  if (normalizedTasks.some((task) => !task.completed) || scores.overallValue < 3) return 'major_revision';
  if (scores.overallValue >= 4 && scores.trust >= 4) return 'usable';
  return 'minor_revision';
}

async function parseOrRetryAction(messages, rawAction) {
  let action = parseAction(rawAction);
  if (!isInvalidJsonAction(action)) return action;
  const retryMessages = [
    ...messages,
    { role: 'assistant', content: rawAction },
    {
      role: 'user',
      content: '上一条动作不是完整 JSON。只返回一个可解析 JSON 对象，字段只能是 action、elementId、value、sampleId、direction、reason；不要解释。'
    }
  ];
  const retryRaw = await chat(retryMessages, { maxTokens: actionMaxTokens * 2 });
  action = parseAction(retryRaw);
  if (!isInvalidJsonAction(action)) return action;
  return {
    action: 'quit',
    elementId: '',
    value: '',
    sampleId: '',
    direction: '',
    reason: `invalid_json_action_after_retry: ${retryRaw.slice(0, 120)}`
  };
}

function isInvalidJsonAction(action) {
  return action.action === 'quit' && String(action.reason || '').startsWith('invalid_json_action:');
}

function buildRuntimeFailure(input) {
  const evidence = input.stateHistory.flatMap((state) => [
    { type: 'screenshot', pathOrValue: state.screenshotPath },
    { type: 'route', pathOrValue: state.route }
  ]);
  const evidenceText = evidence.slice(0, 8).map((item) => item.pathOrValue).join('; ');
  const environmentFailure = isEnvironmentFailure(input.error);
  return {
    provider: 'deepseek',
    persona: input.persona,
    reviewMode: 'text-black-box-interaction',
    sessionId: input.sessionId,
    tasks: buildTaskFallback(input, evidence),
    firstImpression: '运行器未能完成 DeepSeek 会话。',
    understoodProductWithin5Seconds: false,
    foundPrimaryActionWithoutHelp: false,
    understoodDecision: false,
    trustedDecision: false,
    understoodEvidenceSource: false,
    comparisonWasUseful: false,
    valueBeyondGenericAi: false,
    wouldUseAgain: false,
    wouldRecommend: false,
    scores: {
      visualQuality: 1,
      easeOfUse: 1,
      decisionClarity: 1,
      trust: 1,
      comparisonValue: 1,
      retentionValue: 1,
      overallValue: 1
    },
    bugs: [{
      severity: environmentFailure ? 'P0' : 'P1',
      page: environmentFailure ? 'Round black-box environment' : 'blackbox-runner',
      reproSteps: environmentFailure
        ? ['启动 DeepSeek 黑盒会话', '运行器访问 H5 URL 和 API health。']
        : ['启动 DeepSeek 黑盒会话'],
      userImpact: input.error,
      evidence: evidenceText,
      suggestedDirection: environmentFailure
        ? '先保证 H5/API 在整轮评审期间持续可用，再重新创建全新 DeepSeek 会话。'
        : '修复运行环境或降低单次状态体积后重跑该会话。'
    }],
    uiProblems: [],
    interactionProblems: [],
    missingFeatures: [],
    lowValueFeatures: [],
    trustRisks: [],
    topReasonsToAbandon: [input.error],
    topImprovements: [environmentFailure ? '修复评审环境服务稳定性' : '修复 DeepSeek 黑盒运行器阻塞'],
    verdict: 'reject',
    runtime: {
      error: input.error,
      stepCount: input.interactions.length,
      consoleErrors: input.consoleErrors,
      networkErrors: input.networkErrors,
      interactionLog: input.interactions
    }
  };
}

async function assertReviewEnvironmentAvailable() {
  const checks = [
    { label: 'h5', url: h5Url },
    { label: 'api-health', url: healthUrlForApiBase(apiBaseUrl) }
  ].filter((item) => item.url);
  for (const check of checks) {
    const response = await fetchWithTimeout(check.url, 5000).catch((error) => {
      throw new Error(`environment_unavailable:${check.label}:${check.url}:${error instanceof Error ? error.message : String(error)}`);
    });
    if (!response.ok) {
      throw new Error(`environment_unavailable:${check.label}:${check.url}:HTTP ${response.status}`);
    }
  }
}

function healthUrlForApiBase(value) {
  try {
    const url = new URL(value);
    return `${url.origin}/api/health`;
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isEnvironmentFailure(value) {
  return /environment_unavailable|ERR_CONNECTION_REFUSED|ECONNREFUSED|connection refused|page\.goto/i.test(String(value || ''));
}

function buildTaskFallback(input, evidence) {
  const stepCount = input.interactions.length;
  const durationMs = totalInteractionDuration(input.interactions);
  return tasks.map((task, index) => ({
    taskId: `task-${index + 1}`,
    completed: false,
    assistanceUsed: false,
    stepCount,
    durationMs,
    failureStep: 'not_confirmed_by_structured_review',
    confusionPoints: [],
    evidence: evidenceForTask(evidence, index)
  }));
}

function normalizeScores(scores) {
  const keys = ['visualQuality', 'easeOfUse', 'decisionClarity', 'trust', 'comparisonValue', 'retentionValue', 'overallValue'];
  return Object.fromEntries(keys.map((key) => [key, clampScore(scores?.[key])]));
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(5, Math.round(numeric)));
}

async function chat(messages, options = {}) {
  let sawEmptyContent = false;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const baseTokens = options.maxTokens || 256;
    const requestModel = options.modelOverride || (fallbackModel && sawEmptyContent && attempt >= 1 ? fallbackModel : model);
    const requestBody = {
      model: requestModel,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    };
    if (!unlimitedTokens) {
      requestBody.max_tokens = Math.min(8000, baseTokens * (attempt + 1));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), apiTimeoutMs);
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (error) {
      lastError = error;
      clearTimeout(timeout);
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 700 * (attempt + 1)));
      continue;
    } finally {
      clearTimeout(timeout);
    }
    let payload;
    try {
      payload = await readJsonWithTimeout(response);
    } catch (error) {
      lastError = error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 900 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      throw new Error(`DeepSeek API ${response.status}: ${redactDeepSeekPayload(payload)}`);
    }
    const content = String(payload?.choices?.[0]?.message?.content || '').trim();
    if (content) return content;
    sawEmptyContent = true;
    await new Promise((resolveRetry) => setTimeout(resolveRetry, 500));
  }
  if (lastError) throw new Error(`DeepSeek API request failed after retries: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  throw new Error('DeepSeek API returned empty content after retries; reasoning_content redacted');
}

async function readJsonWithTimeout(response) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiJsonBodyTimeoutMs);
  try {
    return await Promise.race([
      response.json().catch(() => null),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('DeepSeek API JSON body timeout')), { once: true });
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function redactDeepSeekPayload(payload) {
  if (!payload) return 'empty_payload';
  try {
    const clean = JSON.parse(JSON.stringify(payload, (key, value) => (
      key === 'reasoning_content' ? '[redacted]' : value
    )));
    return JSON.stringify(clean).slice(0, 500);
  } catch {
    return 'unserializable_payload';
  }
}

async function fetchModels() {
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  }).catch((error) => ({ ok: false, status: 0, error }));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status || 0,
      configuredModel: model,
      note: response.error instanceof Error ? response.error.message : 'model list request failed'
    };
  }
  const payload = await response.json().catch(() => ({}));
  const ids = Array.isArray(payload.data) ? payload.data.map((item) => item.id).filter(Boolean) : [];
  return {
    ok: model ? ids.includes(model) : true,
    configuredModel: model,
    availableModels: ids
  };
}

function chooseDefaultModel(ids) {
  const preferred = [
    'deepseek-reasoner',
    'deepseek-chat',
    'deepseek-v3.1',
    'deepseek-v3',
    'deepseek-r1'
  ];
  return preferred.find((id) => ids.includes(id))
    || ids.find((id) => /reason|r1|chat|v3|v4/i.test(id))
    || '';
}

function parseAction(rawAction) {
  const parsed = parseJson(rawAction);
  if (!parsed || typeof parsed !== 'object') return { action: 'quit', reason: `invalid_json_action: ${rawAction.slice(0, 120)}` };
  const action = String(parsed.action || '').trim();
  if (!['click', 'input', 'back', 'scroll', 'selectImage', 'wait', 'quit'].includes(action)) {
    return { action: 'quit', reason: `unsupported_action: ${action}` };
  }
  return {
    action,
    elementId: String(parsed.elementId || '').trim(),
    value: String(parsed.value || '').trim(),
    sampleId: String(parsed.sampleId || '').trim(),
    direction: String(parsed.direction || '').trim(),
    reason: String(parsed.reason || '').trim()
  };
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/u);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function updateCheckpoint(summary) {
  const checkpoint = existsSync(checkpointPath)
    ? JSON.parse(await readFile(checkpointPath, 'utf8'))
    : { round, completedSessions: [], failedSessions: [], openIssues: [], fixedIssues: [] };
  checkpoint.phase = 'deepseek_limited_blackbox_complete';
  checkpoint.deepseekMetrics = {
    reviewMode: 'text-black-box-interaction',
    sessions: summary.sessions.length,
    maxSteps,
    model
  };
  checkpoint.round = round;
  checkpoint.completedSessions = [
    ...new Set([
      ...(checkpoint.completedSessions || []).filter((filePath) => isCurrentRoundSession(filePath)),
      ...summary.sessions.map((item) => item.filePath).filter(Boolean)
    ])
  ];
  checkpoint.nextAction = 'collect_codex_user_agent_outputs_and_aggregate';
  checkpoint.updatedAt = new Date().toISOString();
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

function isCurrentRoundSession(filePath) {
  const value = String(filePath || '').replace(/\\/g, '/');
  if (round === 1 && !/\/round-\d+\//u.test(value)) return true;
  return value.includes(`/round-${round}/`);
}

function cssEscape(value) {
  return value.replace(/["\\]/g, '\\$&');
}

function getArg(name) {
  const item = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}
