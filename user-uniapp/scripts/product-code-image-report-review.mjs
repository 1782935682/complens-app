import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const ocrReportsDir = join(repoRoot, 'reports', 'ocr');
const reviewReportsDir = join(repoRoot, 'reports', 'ocr_reviews');
const imageReportJsonPath = join(ocrReportsDir, 'product-code-image-evaluation-report.json');
const imageReportMdPath = join(ocrReportsDir, 'product-code-image-evaluation-report.md');
const parsingReportMdPath = join(ocrReportsDir, 'product-code-evaluation-report.md');
const deepseekReviewPath = join(reviewReportsDir, 'product-code-image-deepseek-review.json');
const codexSubagentReviewPath = join(reviewReportsDir, 'product-code-image-codex-subagent-review.json');
const combinedReviewPath = join(reviewReportsDir, 'product-code-image-review-summary.md');

const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

await mkdir(reviewReportsDir, { recursive: true });

if (!existsSync(imageReportJsonPath)) {
  console.error(`Missing product-code image evaluation report: ${imageReportJsonPath}`);
  process.exit(2);
}

if (!apiKey) {
  const payload = {
    provider: 'deepseek-product-code-image-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: ['missing_deepseek_api_key'],
    suggestions: ['Set DEEPSEEK_API_KEY before running product-code image report review.'],
    aiOptimizationDecision: {
      readyForSyntheticImageGate: false,
      readyForRealDeviceImageGate: false,
      readyForProductCodeStage: false,
      priorityFixes: ['Run image-level report review with a configured API key.']
    },
    launchReadiness: 'not_reviewed_missing_deepseek_api_key'
  };
  await writeFile(deepseekReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  console.error(`DeepSeek product-code image review not run: missing DEEPSEEK_API_KEY. Wrote ${deepseekReviewPath}`);
  process.exit(2);
}

const report = JSON.parse(await readFile(imageReportJsonPath, 'utf8'));
const prompt = buildPrompt({
  report,
  imageReportMd: await readSnippet(imageReportMdPath, 7000),
  parsingReportMd: await readSnippet(parsingReportMdPath, 5000)
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
        content: '你是严谨的商品条码、二维码图片级识别门禁评审。只输出 JSON，不输出 Markdown。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0,
    max_tokens: 2400
  })
});

const body = await response.json().catch(() => null);
if (!response.ok) {
  const payload = {
    provider: 'deepseek-product-code-image-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: [`deepseek_request_failed:${response.status}:${body?.error?.message || response.statusText}`],
    suggestions: ['Retry after DeepSeek API availability is restored.'],
    aiOptimizationDecision: {
      readyForSyntheticImageGate: false,
      readyForRealDeviceImageGate: false,
      readyForProductCodeStage: false,
      priorityFixes: ['Complete product-code image report review before claiming this gate is passed.']
    },
    launchReadiness: 'not_reviewed_deepseek_request_failed'
  };
  await writeFile(deepseekReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  throw new Error(`DeepSeek product-code image review failed: ${response.status} ${body?.error?.message || response.statusText}`);
}

const review = normalizeReview(parseJson(body?.choices?.[0]?.message?.content || ''));
await writeFile(deepseekReviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
await writeCombinedSummary(review);
console.log(JSON.stringify(review, null, 2));
console.log(`Product-code image DeepSeek review written to ${deepseekReviewPath}`);
console.log(`Product-code image review summary written to ${combinedReviewPath}`);

function buildPrompt(input) {
  const summary = input.report.summary || {};
  return `
请对“条形码 / 二维码图片级合成样本解码 + 商品数字码解析门禁链接”做报告级深度 Review。

评审目标：
1. 判断当前是否通过 barcode_image、qrcode_image 各 500 PNG 图片样本、每类和整体 >=95% 正确率门禁。
2. 判断 linked printed_code 500 解析门禁是否已通过。
3. 判断报告是否明确区分“可重复合成图片级验证”和“微信真机 / 真实包装照片扫码验收”。
4. 判断是否可以把 product-code stage 标记为工程门禁通过，同时不能把真实设备扫码门禁标记为通过。

门槛：
- totalImageCases >= 1000。
- barcode_image/qrcode_image 各 >= 500。
- imageAccuracy >= 95%，每类 accuracy >= 95%。
- linked printed_code parsing >= 500 且 accuracy >= 95%。
- 必须清楚标注当前限制：合成 PNG 不是微信真机扫码，也不是真实包装照片。
- 如果报告把 realDeviceImageGatePass 标记为 true，应判为高风险。

最新 summary：
${JSON.stringify(summary, null, 2)}

环境和限制：
${JSON.stringify({
  environment: input.report.environment,
  limitations: input.report.limitations
}, null, 2)}

失败样本：
${JSON.stringify((input.report.failedCases || []).slice(0, 50), null, 2)}

Image-level markdown：
${input.imageReportMd}

Parsing-level markdown：
${input.parsingReportMd}

请只输出严格 JSON：
{
  "provider": "deepseek-product-code-image-report",
  "pass": true,
  "score": 0,
  "riskLevel": "low|medium|high",
  "issues": [],
  "suggestions": [],
  "aiOptimizationDecision": {
    "readyForSyntheticImageGate": false,
    "readyForRealDeviceImageGate": false,
    "readyForProductCodeStage": false,
    "priorityFixes": []
  },
  "launchReadiness": "string"
}
`;
}

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('DeepSeek product-code image review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`DeepSeek product-code image review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

function normalizeReview(value) {
  return {
    provider: 'deepseek-product-code-image-report',
    pass: Boolean(value.pass),
    score: clampScore(Number(value.score)),
    riskLevel: ['low', 'medium', 'high'].includes(value.riskLevel) ? value.riskLevel : 'medium',
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions.map(String) : [],
    aiOptimizationDecision: value.aiOptimizationDecision && typeof value.aiOptimizationDecision === 'object'
      ? {
        readyForSyntheticImageGate: Boolean(value.aiOptimizationDecision.readyForSyntheticImageGate),
        readyForRealDeviceImageGate: Boolean(value.aiOptimizationDecision.readyForRealDeviceImageGate),
        readyForProductCodeStage: Boolean(value.aiOptimizationDecision.readyForProductCodeStage),
        priorityFixes: Array.isArray(value.aiOptimizationDecision.priorityFixes)
          ? value.aiOptimizationDecision.priorityFixes.map(String)
          : []
      }
      : {
        readyForSyntheticImageGate: false,
        readyForRealDeviceImageGate: false,
        readyForProductCodeStage: false,
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
  const report = JSON.parse(await readFile(imageReportJsonPath, 'utf8'));
  const codexReview = await readJsonIfExists(codexSubagentReviewPath);
  const summary = report.summary || {};
  const lines = [
    '# Product Code Image-Level Deep Review Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Gate Metrics',
    '',
    `- totalImageCases: ${summary.totalImageCases ?? 'unknown'}`,
    `- passedImageCases: ${summary.passedImageCases ?? 'unknown'}`,
    `- failedImageCases: ${summary.failedImageCases ?? 'unknown'}`,
    `- imageAccuracy: ${formatPercent(summary.imageAccuracy)}`,
    `- syntheticImageGatePass: ${summary.syntheticImageGatePass ? 'yes' : 'no'}`,
    `- printedCodeParsingPass: ${summary.printedCodeParsingPass ? 'yes' : 'no'}`,
    `- combinedBarcodeQrPrintedGatePass: ${summary.combinedBarcodeQrPrintedGatePass ? 'yes' : 'no'}`,
    `- realDeviceImageGatePass: ${summary.realDeviceImageGatePass ? 'yes' : 'no'}`,
    '',
    '## By Image Type',
    '',
    ...(summary.byType || []).map((item) => `- ${item.type}: ${item.passed}/${item.total}, accuracy ${formatPercent(item.accuracy)}`),
    '',
    '## Codex Sub Agent Review',
    '',
    formatReview(codexReview),
    '',
    '## DeepSeek Report Review',
    '',
    formatReview(review),
    '',
    '## Combined Decision',
    '',
    `- readyForSyntheticImageGate: ${Boolean((codexReview?.aiOptimizationDecision?.readyForSyntheticImageGate ?? true) && review.aiOptimizationDecision.readyForSyntheticImageGate) ? 'yes' : 'no'}`,
    `- readyForRealDeviceImageGate: ${Boolean((codexReview?.aiOptimizationDecision?.readyForRealDeviceImageGate ?? false) && review.aiOptimizationDecision.readyForRealDeviceImageGate) ? 'yes' : 'no'}`,
    `- readyForProductCodeStage: ${Boolean((codexReview?.aiOptimizationDecision?.readyForProductCodeStage ?? true) && review.aiOptimizationDecision.readyForProductCodeStage) ? 'yes' : 'no'}`
  ];
  await writeFile(combinedReviewPath, `${lines.join('\n')}\n`, 'utf8');
}

function formatReview(review) {
  if (!review) return '- missing';
  return [
    `- pass: ${review.pass ? 'yes' : 'no'}`,
    `- score: ${review.score ?? 'unknown'}`,
    `- riskLevel: ${review.riskLevel || 'unknown'}`,
    `- readyForSyntheticImageGate: ${review.aiOptimizationDecision?.readyForSyntheticImageGate ? 'yes' : 'no'}`,
    `- readyForRealDeviceImageGate: ${review.aiOptimizationDecision?.readyForRealDeviceImageGate ? 'yes' : 'no'}`,
    `- readyForProductCodeStage: ${review.aiOptimizationDecision?.readyForProductCodeStage ? 'yes' : 'no'}`,
    `- launchReadiness: ${review.launchReadiness || 'unknown'}`,
    '- issues:',
    ...(review.issues || []).slice(0, 12).map((issue) => `  - ${formatIssue(issue)}`),
    '- suggestions:',
    ...(review.suggestions || []).slice(0, 12).map((suggestion) => `  - ${suggestion}`)
  ].join('\n');
}

function formatIssue(issue) {
  if (!issue || typeof issue !== 'object') return String(issue || '');
  return [
    issue.severity ? `[${issue.severity}]` : '',
    issue.file ? `${issue.file}:` : '',
    issue.message || JSON.stringify(issue)
  ].filter(Boolean).join(' ');
}

async function readSnippet(path, maxLength) {
  try {
    return (await readFile(path, 'utf8')).slice(0, maxLength);
  } catch {
    return '';
  }
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}
