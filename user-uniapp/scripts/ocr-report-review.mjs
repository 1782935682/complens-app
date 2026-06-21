import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reviewReportsDir = join(repoRoot, 'reports', 'ocr_reviews');
const evaluationJsonPath = join(reportsDir, 'ocr-evaluation-report.json');
const evaluationMdPath = join(reportsDir, 'ocr-evaluation-report.md');
const finalReportPath = join(reportsDir, 'final-ocr-maturity-report.md');
const qualityReportPath = join(reportsDir, 'sample-quality-report.md');
const reviewSummaryPath = join(reviewReportsDir, 'ocr-review-summary.md');
const subagentReviewPath = join(reviewReportsDir, 'chatgpt-subagent-review.json');
const deepseekReportReviewPath = join(reviewReportsDir, 'deepseek-report-review.json');
const combinedReviewPath = join(reviewReportsDir, 'ocr-deep-review-summary.md');

const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

await mkdir(reviewReportsDir, { recursive: true });

if (!existsSync(evaluationJsonPath)) {
  console.error(`Missing OCR evaluation report: ${evaluationJsonPath}`);
  process.exit(2);
}

if (!apiKey) {
  const payload = {
    provider: 'deepseek-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: ['missing_deepseek_api_key'],
    suggestions: ['Set DEEPSEEK_API_KEY before running report-level DeepSeek review.'],
    aiOptimizationDecision: {
      readyFor500Gate: false,
      readyForBarcodeQrCodeStage: false,
      priorityFixes: ['Run report-level DeepSeek review with a configured API key.']
    },
    launchReadiness: 'not_reviewed_missing_deepseek_api_key'
  };
  await writeFile(deepseekReportReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  console.error(`DeepSeek report review not run: missing DEEPSEEK_API_KEY. Wrote ${deepseekReportReviewPath}`);
  process.exit(2);
}

const evaluation = JSON.parse(await readFile(evaluationJsonPath, 'utf8'));
const subagentReview = await readJsonIfExists(subagentReviewPath);
const prompt = buildPrompt({
  evaluation,
  evaluationMd: await readSnippet(evaluationMdPath, 6000),
  finalReport: await readSnippet(finalReportPath, 6000),
  qualityReport: await readSnippet(qualityReportPath, 6000),
  reviewSummary: await readSnippet(reviewSummaryPath, 6000),
  subagentReview
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
        content: '你是严谨的食品包装 OCR 成熟度门禁评审。只输出 JSON，不输出 Markdown。'
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
    provider: 'deepseek-report',
    pass: false,
    score: 0,
    riskLevel: 'high',
    issues: [`deepseek_request_failed:${response.status}:${body?.error?.message || response.statusText}`],
    suggestions: ['Retry after DeepSeek API availability is restored.'],
    aiOptimizationDecision: {
      readyFor500Gate: false,
      readyForBarcodeQrCodeStage: false,
      priorityFixes: ['Complete report-level DeepSeek review before claiming the OCR gate is passed.']
    },
    launchReadiness: 'not_reviewed_deepseek_request_failed'
  };
  await writeFile(deepseekReportReviewPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCombinedSummary(payload);
  throw new Error(`DeepSeek report review failed: ${response.status} ${body?.error?.message || response.statusText}`);
}

const review = normalizeReview(parseJson(body?.choices?.[0]?.message?.content || ''));
await writeFile(deepseekReportReviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
await writeCombinedSummary(review);
console.log(JSON.stringify(review, null, 2));
console.log(`DeepSeek report review written to ${deepseekReportReviewPath}`);
console.log(`Combined OCR deep review summary written to ${combinedReviewPath}`);

function buildPrompt(input) {
  const metrics = input.evaluation.summary?.metrics || {};
  const errorsByCode = input.evaluation.summary?.errorsByCode || [];
  const failedSamples = (input.evaluation.summary?.failedSamples || input.evaluation.samples?.filter((sample) => sample.reviewStatus !== 'pass') || [])
    .slice(0, 40)
    .map((sample) => ({
      sampleId: sample.sampleId,
      category: sample.category,
      quality: sample.sampleQuality,
      detectedType: sample.detectedType,
      errors: (sample.errors || []).map((error) => ({ code: error.code, severity: error.severity, evidence: error.evidence || '' })),
      expected: compactExpected(sample.expected),
      actual: compactActual(sample.actual),
      ocrTextPreview: String(sample.ocrText || '').slice(0, 700)
    }));
  const highRiskAiSamples = (input.evaluation.aiReviews || [])
    .filter((review) => review.riskLevel === 'high' || review.score < 85)
    .slice(0, 12)
    .map((review) => ({
      sampleId: review.sampleId,
      provider: review.provider,
      score: review.score,
      riskLevel: review.riskLevel,
      issues: review.issues
    }));

  return `
请对“食品包装非条码/二维码 OCR 成熟度 500 样本门禁”做报告级深度 Review。

评审目标：
1. 判断当前是否通过 500 唯一样本、配料/营养/其他区域支持、95% 正确率门禁。
2. 判断是否允许进入条形码、二维码、商品码各 500 用例阶段。
3. 深入审查 DeepSeek 样本 Review 与 Codex 子 agent Review 是否足以支撑结论。
4. 找出下一轮最优先的修复/换样本动作。

门槛：
- totalSamples >= 500。
- overallPassRate >= 95%。
- ingredientsAccuracy >= 95%、nutritionAccuracy >= 95%。
- coreIngredientsAccuracy >= 95%、coreNutritionAccuracy >= 95%。
- coreIngredientSamples >= 150、coreNutritionSamples >= 150。
- invalidSampleCount = 0、weakOcrSampleCount = 0。
- DeepSeek 和 Codex 子 agent report review 均通过，平均分或报告级分数 >= 85，且无 high risk。
- 未达标时不得进入条码/二维码/商品码阶段。

最新 metrics：
${JSON.stringify(metrics, null, 2)}

errorsByCode：
${JSON.stringify(errorsByCode, null, 2)}

失败样本摘要：
${JSON.stringify(failedSamples, null, 2)}

AI Review 高风险/低分样本：
${JSON.stringify(highRiskAiSamples, null, 2)}

Codex 子 agent report review：
${JSON.stringify(input.subagentReview, null, 2)}

OCR evaluation markdown 摘要：
${input.evaluationMd}

Final maturity report：
${input.finalReport}

Sample quality report：
${input.qualityReport}

AI review summary：
${input.reviewSummary}

请只输出严格 JSON：
{
  "provider": "deepseek-report",
  "pass": true,
  "score": 0,
  "riskLevel": "low|medium|high",
  "issues": [],
  "suggestions": [],
  "aiOptimizationDecision": {
    "readyFor500Gate": false,
    "readyForBarcodeQrCodeStage": false,
    "priorityFixes": []
  },
  "launchReadiness": "string"
}
`;
}

function compactExpected(value = {}) {
  return {
    ingredientsText: String(value.ingredientsText || '').slice(0, 260),
    nutritionText: String(value.nutritionText || '').slice(0, 260),
    productName: value.productName || '',
    brand: value.brand || '',
    codeInfo: value.codeInfo || ''
  };
}

function compactActual(value = {}) {
  return {
    ingredientsText: String(value.ingredientsText || '').slice(0, 260),
    nutritionText: String(value.nutritionText || '').slice(0, 260),
    productName: value.productName || '',
    brand: value.brand || '',
    codeInfo: value.codeInfo || '',
    otherText: Array.isArray(value.otherText) ? value.otherText.slice(0, 4) : []
  };
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

function parseJson(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('DeepSeek report review returned empty text.');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error(`DeepSeek report review returned non-JSON text: ${text.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

function normalizeReview(value) {
  return {
    provider: 'deepseek-report',
    pass: Boolean(value.pass),
    score: clampScore(Number(value.score)),
    riskLevel: ['low', 'medium', 'high'].includes(value.riskLevel) ? value.riskLevel : 'medium',
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions.map(String) : [],
    aiOptimizationDecision: value.aiOptimizationDecision && typeof value.aiOptimizationDecision === 'object'
      ? {
        readyFor500Gate: Boolean(value.aiOptimizationDecision.readyFor500Gate),
        readyForBarcodeQrCodeStage: Boolean(value.aiOptimizationDecision.readyForBarcodeQrCodeStage),
        priorityFixes: Array.isArray(value.aiOptimizationDecision.priorityFixes)
          ? value.aiOptimizationDecision.priorityFixes.map(String)
          : []
      }
      : {
        readyFor500Gate: false,
        readyForBarcodeQrCodeStage: false,
        priorityFixes: []
      },
    launchReadiness: String(value.launchReadiness || '')
  };
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function writeCombinedSummary(deepseekReview) {
  const subagentReview = await readJsonIfExists(subagentReviewPath);
  const evaluation = JSON.parse(await readFile(evaluationJsonPath, 'utf8'));
  const metrics = evaluation.summary?.metrics || {};
  const lines = [
    '# OCR Deep Review Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Gate Metrics',
    '',
    `- totalSamples: ${metrics.totalSamples ?? 'unknown'}`,
    `- overallPassRate: ${formatPercent(metrics.overallPassRate)}`,
    `- ingredientsAccuracy: ${formatPercent(metrics.ingredientsAccuracy)}`,
    `- nutritionAccuracy: ${formatPercent(metrics.nutritionAccuracy)}`,
    `- coreIngredientsAccuracy: ${formatPercent(metrics.coreIngredientsAccuracy)}`,
    `- coreNutritionAccuracy: ${formatPercent(metrics.coreNutritionAccuracy)}`,
    `- invalidSampleCount: ${metrics.invalidSampleCount ?? 'unknown'}`,
    `- weakOcrSampleCount: ${metrics.weakOcrSampleCount ?? 'unknown'}`,
    `- acceptancePass: ${metrics.acceptancePass ? 'yes' : 'no'}`,
    '',
    '## Codex Sub Agent Review',
    '',
    formatReview(subagentReview),
    '',
    '## DeepSeek Report Review',
    '',
    formatReview(deepseekReview),
    '',
    '## Combined Decision',
    '',
    `- readyFor500Gate: ${Boolean(subagentReview?.aiOptimizationDecision?.readyFor500Gate && deepseekReview.aiOptimizationDecision.readyFor500Gate) ? 'yes' : 'no'}`,
    `- readyForBarcodeQrCodeStage: ${Boolean(subagentReview?.aiOptimizationDecision?.readyForBarcodeQrCodeStage && deepseekReview.aiOptimizationDecision.readyForBarcodeQrCodeStage) ? 'yes' : 'no'}`
  ];
  await writeFile(combinedReviewPath, `${lines.join('\n')}\n`, 'utf8');
}

function formatReview(review) {
  if (!review) return '- missing';
  return [
    `- pass: ${review.pass ? 'yes' : 'no'}`,
    `- score: ${review.score ?? 'unknown'}`,
    `- riskLevel: ${review.riskLevel || 'unknown'}`,
    `- launchReadiness: ${review.launchReadiness || 'unknown'}`,
    '- issues:',
    ...(review.issues || []).slice(0, 12).map((issue) => `  - ${issue}`),
    '- suggestions:',
    ...(review.suggestions || []).slice(0, 12).map((suggestion) => `  - ${suggestion}`)
  ].join('\n');
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'unknown';
  return `${Math.round(Number(value) * 10000) / 100}%`;
}
