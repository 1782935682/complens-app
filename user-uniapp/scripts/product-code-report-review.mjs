import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const ocrReportsDir = join(repoRoot, 'reports', 'ocr');
const reviewReportsDir = join(repoRoot, 'reports', 'ocr_reviews');
const productCodeJsonPath = join(ocrReportsDir, 'product-code-evaluation-report.json');
const productCodeMdPath = join(ocrReportsDir, 'product-code-evaluation-report.md');
const finalOcrReportPath = join(ocrReportsDir, 'final-ocr-maturity-report.md');
const deepseekReviewPath = join(reviewReportsDir, 'product-code-deepseek-review.json');
const codexSubagentReviewPath = join(reviewReportsDir, 'product-code-codex-subagent-review.json');
const combinedReviewPath = join(reviewReportsDir, 'product-code-review-summary.md');

const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

await mkdir(reviewReportsDir, { recursive: true });

if (!existsSync(productCodeJsonPath)) {
  console.error(`Missing product code evaluation report: ${productCodeJsonPath}`);
  process.exit(2);
}

if (!apiKey) {
  const payload = {
    provider: 'deepseek-product-code-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: ['missing_deepseek_api_key'],
    suggestions: ['Set DEEPSEEK_API_KEY before running product-code report review.'],
    aiOptimizationDecision: {
      readyForProductCodeGate: false,
      readyForImageLevelScanGate: false,
      priorityFixes: ['Run product-code report review with a configured API key.']
    },
    launchReadiness: 'not_reviewed_missing_deepseek_api_key'
  };
  await writeFile(deepseekReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  console.error(`DeepSeek product-code review not run: missing DEEPSEEK_API_KEY. Wrote ${deepseekReviewPath}`);
  process.exit(2);
}

const report = JSON.parse(await readFile(productCodeJsonPath, 'utf8'));
const prompt = buildPrompt({
  report,
  productCodeMd: await readSnippet(productCodeMdPath, 6000),
  finalOcrReport: await readSnippet(finalOcrReportPath, 6000)
});

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是严谨的商品条码、二维码、印刷商品码识别门禁评审。只输出 JSON，不输出 Markdown。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0,
    max_tokens: 2200
  })
});

const body = await response.json().catch(() => null);
if (!response.ok) {
  const payload = {
    provider: 'deepseek-product-code-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: [`deepseek_request_failed:${response.status}:${body?.error?.message || response.statusText}`],
    suggestions: ['Retry after DeepSeek API availability is restored.'],
    aiOptimizationDecision: {
      readyForProductCodeGate: false,
      readyForImageLevelScanGate: false,
      priorityFixes: ['Complete product-code report review before claiming the product-code gate is passed.']
    },
    launchReadiness: 'not_reviewed_deepseek_request_failed'
  };
  await writeFile(deepseekReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  throw new Error(`DeepSeek product-code review failed: ${response.status} ${body?.error?.message || response.statusText}`);
}

const review = normalizeReview(parseJson(body?.choices?.[0]?.message?.content || ''));
await writeFile(deepseekReviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
await writeCombinedSummary(review);
console.log(JSON.stringify(review, null, 2));
console.log(`Product-code DeepSeek review written to ${deepseekReviewPath}`);
console.log(`Product-code review summary written to ${combinedReviewPath}`);

function buildPrompt(input) {
  const summary = input.report.summary || {};
  return `
请对“商品条码 / 二维码 / 包装印刷商品数字码各 500 用例门禁”做报告级深度 Review。

评审目标：
1. 判断当前是否通过 barcode、qrcode、printed_code 各 500 用例、每类和整体 >=95% 正确率门禁。
2. 判断当前结果是否只证明“解析级/分类级”能力，而不是“真实图片级扫码解码”能力。
3. 判断是否可以把本阶段标记为通过，并列出进入真实图片级扫码或真机验收前的风险。

门槛：
- totalCases >= 1500。
- barcode/qrcode/printed_code 各 >= 500。
- overall accuracy >= 95%。
- 每类 accuracy >= 95%。
- 二维码 URL 必须保留为 url 类型，不得伪装成包装实拍 OCR 或官方法规/配料证据。
- 必须清楚标注当前评测限制：图片级扫码识别需由浏览器 BarcodeDetector、小程序扫码能力或真机补充。

最新 summary：
${JSON.stringify(summary, null, 2)}

报告 JSON scope/limitation：
${JSON.stringify({
  scope: input.report.scope,
  limitation: input.report.limitation,
  activationRule: input.report.activationRule
}, null, 2)}

失败样本：
${JSON.stringify((input.report.failedCases || []).slice(0, 50), null, 2)}

Product-code markdown：
${input.productCodeMd}

OCR final maturity report：
${input.finalOcrReport}

请只输出严格 JSON：
{
  "provider": "deepseek-product-code-report",
  "pass": true,
  "score": 0,
  "riskLevel": "low|medium|high",
  "issues": [],
  "suggestions": [],
  "aiOptimizationDecision": {
    "readyForProductCodeGate": false,
    "readyForImageLevelScanGate": false,
    "priorityFixes": []
  },
  "launchReadiness": "string"
}
`;
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('DeepSeek product-code review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`DeepSeek product-code review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

function normalizeReview(value) {
  return {
    provider: 'deepseek-product-code-report',
    pass: Boolean(value.pass),
    score: clampScore(Number(value.score)),
    riskLevel: ['low', 'medium', 'high'].includes(value.riskLevel) ? value.riskLevel : 'medium',
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions.map(String) : [],
    aiOptimizationDecision: value.aiOptimizationDecision && typeof value.aiOptimizationDecision === 'object'
      ? {
        readyForProductCodeGate: Boolean(value.aiOptimizationDecision.readyForProductCodeGate),
        readyForImageLevelScanGate: Boolean(value.aiOptimizationDecision.readyForImageLevelScanGate),
        priorityFixes: Array.isArray(value.aiOptimizationDecision.priorityFixes)
          ? value.aiOptimizationDecision.priorityFixes.map(String)
          : []
      }
      : {
        readyForProductCodeGate: false,
        readyForImageLevelScanGate: false,
        priorityFixes: []
      },
    launchReadiness: String(value.launchReadiness || '')
  };
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function writeCombinedSummary(review) {
  const report = JSON.parse(await readFile(productCodeJsonPath, 'utf8'));
  const codexReview = await readJsonIfExists(codexSubagentReviewPath);
  const summary = report.summary || {};
  const lines = [
    '# Product Code Deep Review Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Gate Metrics',
    '',
    `- totalCases: ${summary.totalCases ?? 'unknown'}`,
    `- passedCases: ${summary.passedCases ?? 'unknown'}`,
    `- failedCases: ${summary.failedCases ?? 'unknown'}`,
    `- accuracy: ${formatPercent(summary.accuracy)}`,
    `- pass: ${summary.pass ? 'yes' : 'no'}`,
    '',
    '## By Type',
    '',
    ...(summary.byType || []).map((item) => `- ${item.type}: ${item.passed}/${item.total}, accuracy ${formatPercent(item.accuracy)}`),
    '',
    '## Codex Sub Agent Review',
    '',
    formatReview(codexReview, 'readyForProductCodeGate', 'readyForImageLevelScanGate'),
    '',
    '## DeepSeek Report Review',
    '',
    formatReview(review, 'readyForProductCodeGate', 'readyForImageLevelScanGate'),
    '',
    '## Combined Decision',
    '',
    `- readyForProductCodeGate: ${Boolean((codexReview?.aiOptimizationDecision?.readyForProductCodeGate ?? true) && review.aiOptimizationDecision.readyForProductCodeGate) ? 'yes' : 'no'}`,
    `- readyForImageLevelScanGate: ${Boolean((codexReview?.aiOptimizationDecision?.readyForImageLevelScanGate ?? false) && review.aiOptimizationDecision.readyForImageLevelScanGate) ? 'yes' : 'no'}`
  ];
  await writeFile(combinedReviewPath, `${lines.join('\n')}\n`, 'utf8');
}

function formatReview(review, productGateKey, imageGateKey) {
  if (!review) return '- missing';
  return [
    `- pass: ${review.pass ? 'yes' : 'no'}`,
    `- score: ${review.score ?? 'unknown'}`,
    `- riskLevel: ${review.riskLevel || 'unknown'}`,
    `- ${productGateKey}: ${review.aiOptimizationDecision?.[productGateKey] ? 'yes' : 'no'}`,
    `- ${imageGateKey}: ${review.aiOptimizationDecision?.[imageGateKey] ? 'yes' : 'no'}`,
    `- launchReadiness: ${review.launchReadiness || 'unknown'}`,
    '- issues:',
    ...(review.issues || []).slice(0, 12).map((issue) => `  - ${issue}`),
    '- suggestions:',
    ...(review.suggestions || []).slice(0, 12).map((suggestion) => `  - ${suggestion}`)
  ].join('\n');
}

async function readSnippet(path, maxLength) {
  try {
    return (await readFile(path, 'utf8')).slice(0, maxLength);
  } catch (error) {
    return `读取失败：${error.message}`;
  }
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    return { readError: error.message };
  }
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'unknown';
  return `${Math.round(Number(value) * 10000) / 100}%`;
}
