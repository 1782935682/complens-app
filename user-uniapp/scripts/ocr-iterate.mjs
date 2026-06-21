import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reportJsonPath = join(reportsDir, 'ocr-evaluation-report.json');
const maxRounds = Math.min(10, Math.max(1, Number(process.env.OCR_ITERATE_MAX_ROUNDS || '10')));
const baseTargetSamples = Math.max(100, Number(process.env.OCR_ITERATE_BASE_TARGET || process.env.OCR_EVAL_TARGET || '100'));
const finalTargetSamples = Math.max(500, Number(process.env.OCR_ITERATE_FINAL_TARGET || '500'));

await mkdir(reportsDir, { recursive: true });

let previousMetrics = null;
let reached = false;
let blocked = false;
let currentTargetSamples = baseTargetSamples;

for (let round = 1; round <= maxRounds; round += 1) {
  const startedAt = new Date().toISOString();
  const code = await runEvaluation(round, currentTargetSamples);
  const payload = await readEvaluationPayload();
  const metrics = payload?.summary?.metrics || emptyMetrics();
  const topErrors = payload?.summary?.errorsByCode || [];
  blocked = metrics.totalSamples === 0 || topErrors.some((item) => item.code === 'ocr_service_unreachable');
  reached = Boolean(metrics.acceptancePass);
  const shouldExpandNext = Boolean(metrics.expansionReady) && currentTargetSamples < finalTargetSamples;
  await writeIterationReport({
    round,
    startedAt,
    exitCode: code,
    currentTargetSamples,
    nextTargetSamples: shouldExpandNext ? finalTargetSamples : currentTargetSamples,
    metrics,
    previousMetrics,
    topErrors,
    reached,
    blocked,
    shouldExpandNext
  });
  previousMetrics = metrics;
  if (reached || blocked) break;
  if (shouldExpandNext) currentTargetSamples = finalTargetSamples;
}

if (!reached) process.exitCode = 1;

async function runEvaluation(round, targetSamples) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/ocr-evaluate.mjs'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        OCR_EVAL_TARGET: String(targetSamples),
        OCR_EVAL_REFRESH_SAMPLES: round === 1 && process.env.OCR_EVAL_REFRESH_SAMPLES ? process.env.OCR_EVAL_REFRESH_SAMPLES : '0'
      }
    });
    child.on('close', (code) => resolve(code || 0));
  });
}

async function readEvaluationPayload() {
  if (!existsSync(reportJsonPath)) return null;
  return JSON.parse(await readFile(reportJsonPath, 'utf8'));
}

async function writeIterationReport(input) {
  const delta = buildMetricDelta(input.previousMetrics, input.metrics);
  const suggestedFixes = suggestFixes(input.topErrors);
  const content = `# OCR Iteration ${input.round}

Started: ${input.startedAt}

Exit code: ${input.exitCode}

## Metrics

- 样本数量：${input.metrics.totalSamples}
- 当前评测目标样本数：${input.currentTargetSamples}
- 下一轮目标样本数：${input.nextTargetSamples}
- 通过数量：${input.metrics.passedSamples}
- 失败数量：${input.metrics.failedSamples}
- 分类覆盖：${input.metrics.categoryCount}
- 当前成熟度阶段：${formatMaturityStage(input.metrics.maturityStage)}
- 是否达到扩样门槛：${input.metrics.expansionReady ? '是' : '否'}
- 最终稳定目标样本数：${input.metrics.finalTargetSamples || finalTargetSamples}
- 核心有效样本：${input.metrics.coreSamples}
- 核心有效配料样本：${input.metrics.coreIngredientSamples}
- 核心有效营养样本：${input.metrics.coreNutritionSamples}
- 无效样本：${input.metrics.invalidSampleCount}
- 弱 OCR 样本：${input.metrics.weakOcrSampleCount}
- ingredientsText 准确率：${formatPercent(input.metrics.ingredientsAccuracy)}
- nutritionText 准确率：${formatPercent(input.metrics.nutritionAccuracy)}
- 核心有效 ingredientsText 准确率：${formatPercent(input.metrics.coreIngredientsAccuracy)}
- 核心有效 nutritionText 准确率：${formatPercent(input.metrics.coreNutritionAccuracy)}
- 配料表误判率：${formatPercent(input.metrics.ingredientFalsePositiveRate)}
- 营养误入配料率：${formatPercent(input.metrics.nutritionAsIngredientRate)}
- other 误入配料率：${formatPercent(input.metrics.otherAsIngredientRate)}
- ChatGPT Review：${input.metrics.chatgptAverageScore ?? 'skipped'}
- DeepSeek Review：${input.metrics.deepseekAverageScore ?? 'skipped'}

## Metrics Change

${delta}

## 本轮修复内容

- 本命令执行本地评测并输出失败归因；源码修复由 Codex 根据失败报告实施，避免自动脚本盲目改业务逻辑。

## 失败原因 Top 10

${input.topErrors.slice(0, 10).map((item) => `- ${item.code}: ${item.count}`).join('\n') || '- none'}

## 下一轮修复方向

${suggestedFixes}

## 是否达到验收标准

${input.reached ? '是' : '否'}

## 扩样状态

${input.shouldExpandNext ? '- 本轮已达到 100 样本 95% 门槛；下一轮自动切换到 500 样本验证。' : '- 本轮未触发扩样；继续停留在当前样本规模修复失败原因。'}

${input.blocked ? '\n## Blocker\n\n- OCR 服务不可用或样本数为 0，需要先恢复 OCR 服务或网络样本下载。\n' : ''}
`;
  await writeFile(join(reportsDir, `iteration-${input.round}.md`), content, 'utf8');
}

function buildMetricDelta(previous, current) {
  if (!previous) return '- 首轮评测，无上一轮对比。';
  return [
    `- ingredientsText 准确率变化：${formatDelta(current.ingredientsAccuracy - previous.ingredientsAccuracy)}`,
    `- nutritionText 准确率变化：${formatDelta(current.nutritionAccuracy - previous.nutritionAccuracy)}`,
    `- 配料误判率变化：${formatDelta(current.ingredientFalsePositiveRate - previous.ingredientFalsePositiveRate)}`,
    `- 失败样本变化：${current.failedSamples - previous.failedSamples}`
  ].join('\n');
}

function suggestFixes(topErrors) {
  const suggestions = [];
  const codes = new Set(topErrors.map((item) => item.code));
  if (codes.has('ingredients_missing') || codes.has('ingredients_low_overlap')) {
    suggestions.push('- 扩展配料起点、OCR 断行修复和配料结束边界，重点看失败样本原文。');
  }
  if (codes.has('nutrition_missing') || codes.has('nutrition_low_overlap')) {
    suggestions.push('- 增强营养表行列重组，支持表格 OCR 打散后的字段和值拼接。');
  }
  if (codes.has('ingredients_false_positive') || codes.has('advertising_in_ingredients') || codes.has('production_info_in_ingredients')) {
    suggestions.push('- 收紧配料 fallback，广告语、生产信息、标准号、净含量必须先归 otherText。');
  }
  if (codes.has('nutrition_in_ingredients')) {
    suggestions.push('- 在配料抽取前优先剥离营养表块，营养关键词命中时禁止进入 ingredientsText。');
  }
  if (!suggestions.length) suggestions.push('- 继续审查失败样本截图和 OCR 原文，补充对应边界规则。');
  return suggestions.join('\n');
}

function emptyMetrics() {
  return {
    totalSamples: 0,
    passedSamples: 0,
    failedSamples: 0,
    categoryCount: 0,
    maturityStage: 'build_100_gold',
    expansionReady: false,
    finalTargetSamples,
    coreSamples: 0,
    coreIngredientSamples: 0,
    coreNutritionSamples: 0,
    invalidSampleCount: 0,
    weakOcrSampleCount: 0,
    ingredientsAccuracy: 0,
    nutritionAccuracy: 0,
    coreIngredientsAccuracy: 0,
    coreNutritionAccuracy: 0,
    ingredientFalsePositiveRate: 1,
    nutritionAsIngredientRate: 1,
    otherAsIngredientRate: 1,
    chatgptAverageScore: null,
    deepseekAverageScore: null,
    acceptancePass: false
  };
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function formatDelta(value) {
  const rounded = Math.round(Number(value || 0) * 10000) / 100;
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function formatMaturityStage(stage) {
  const labels = {
    build_100_gold: '清洗 100 样本 gold set',
    ready_to_expand_500: '已达 95%，准备扩样到 500',
    validate_500: '500 样本验证中',
    stable_500: '500 样本稳定达标'
  };
  return labels[stage] || stage || 'unknown';
}
