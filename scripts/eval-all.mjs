import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { runReviewAgent } from './review-agent.mjs';

const checkpointPath = '.codex/state/checkpoint.json';
const reportJsonPath = 'reports/evaluation/eval-all-report.json';
const reportMdPath = 'reports/evaluation/eval-all-report.md';
const iterationReportLatestJsonPath = 'reports/evaluation/iteration-report.json';
const iterationReportLatestMdPath = 'reports/evaluation/iteration-report.md';
const loopMode = process.argv.includes('--loop');
const maxLoopIterations = Number(process.env.CODEX_LOOP_MAX || (loopMode ? 3 : 1));

let finalExitCode = 0;
for (let loopIndex = 0; loopIndex < maxLoopIterations; loopIndex += 1) {
  const result = await runIteration(loopIndex + 1);
  finalExitCode = result.failedTasks.length ? 1 : 0;
  if (!loopMode || !result.failedTasks.length) break;
}

process.exit(finalExitCode);

async function runIteration(loopIteration) {
  const previousCheckpoint = await readJsonIfExists(checkpointPath);
  const startedAt = new Date().toISOString();
  const nextIteration = Number(previousCheckpoint?.iteration || 0) + 1;
  const iterationId = `chengfenjing-iteration-${String(nextIteration).padStart(4, '0')}`;
  const iterationReportJsonPath = `reports/evaluation/iterations/${iterationId}.json`;
  const iterationReportMdPath = `reports/evaluation/iterations/${iterationId}.md`;
  const commands = [
    {
      id: 'backend-decision-tests',
      label: 'decision/nutrition route tests',
      command: 'npm',
      args: ['--prefix', 'backend', 'run', 'test', '--', 'tests/decisionAgent.test.ts', 'tests/foodAnalyze.test.ts', 'tests/nutrition.test.ts']
    },
    {
      id: 'decision-evaluation-cases',
      label: 'profile decision evaluation cases',
      command: 'npm',
      args: ['--prefix', 'backend', 'run', 'decision:evaluate']
    },
    {
      id: 'backend-typecheck',
      label: 'backend typecheck',
      command: 'npm',
      args: ['--prefix', 'backend', 'run', 'typecheck']
    },
    {
      id: 'miniapp-typecheck',
      label: 'miniapp typecheck',
      command: 'npm',
      args: ['--prefix', 'user-uniapp', 'run', 'typecheck']
    },
    {
      id: 'miniapp-decision-ui-audit',
      label: 'miniapp decision UI audit',
      command: 'npm',
      args: ['--prefix', 'user-uniapp', 'run', 'audit:product-output']
    }
  ];
  const commandResults = commands.map(runCommand);
  const ocrMetrics = await collectOcrMetrics();
  const decisionCaseReport = await readJsonIfExists('reports/evaluation/decision-cases-report.json');
  const uiContract = await evaluateUiContract();
  const decisionCasesOk = commandResults.find((item) => item.id === 'decision-evaluation-cases')?.ok;
  const decisionConsistency = decisionCasesOk ? Number(decisionCaseReport?.summary?.matchRate ?? 0) : 0;
  const baseMetrics = {
    ocrAccuracy: roundMetric(ocrMetrics.ocrAccuracy),
    ocrStrictAccuracy: roundMetric(ocrMetrics.ocrStrictAccuracy),
    ingredientRecognitionAccuracy: roundMetric(ocrMetrics.ingredientRecognitionAccuracy),
    ingredientStrictAccuracy: roundMetric(ocrMetrics.ingredientStrictAccuracy),
    nutritionParsingAccuracy: roundMetric(ocrMetrics.nutritionParsingAccuracy),
    nutritionStrictAccuracy: roundMetric(ocrMetrics.nutritionStrictAccuracy),
    barcodeQrAccuracy: roundMetric(ocrMetrics.barcodeQrAccuracy),
    decisionConsistency,
    evaluationCasePassRate: roundMetric(decisionCaseReport?.summary?.matchRate),
    comparisonMatchRate: roundMetric(decisionCaseReport?.summary?.comparisonMatchRate),
    userBehaviorMatchRate: roundMetric(uiContract.matchRate)
  };
  const reviewAgent = await runReviewAgent({
    metrics: baseMetrics,
    decisionCaseReport,
    previousCheckpoint,
    uiContract
  });
  const metrics = {
    ...baseMetrics,
    stability_score: roundMetric(reviewAgent.summary.stability_score),
    regression_detection: roundMetric(reviewAgent.summary.regression_detection),
    decision_quality_score: roundMetric(reviewAgent.summary.decision_quality_score),
    ui_clarity_score: roundMetric(reviewAgent.summary.ui_clarity_score)
  };
  const failedTasks = [
    ...commandResults.filter((item) => !item.ok).map((item) => ({
      id: item.id,
      label: item.label,
      exitCode: item.status,
      stderr: item.stderr.slice(-4000)
    })),
    ...uiContract.failures.map((message) => ({
      id: 'miniapp-decision-ui-contract',
      label: 'miniapp decision UI contract',
      exitCode: 1,
      stderr: message
    })),
    ...reviewAgent.failed_cases.map((item) => ({
      id: `review-agent:${item.id}`,
      label: 'review-agent independent product review',
      exitCode: 1,
      stderr: item.label
    }))
  ];
  const completedTasks = mergeCompleted(previousCheckpoint?.completed_tasks, [
      'product-agent contract',
      'decision-agent contract',
      'compare-agent contract',
      'miniapp single-entry home',
      'miniapp three-card result page',
      'miniapp A/B compare flow',
      'miniapp compare backend adapter',
      'backend data namespace migration',
      'legacy vite/capacitor cleanup',
      ...(decisionConsistency === 1 ? ['profile-specific evaluation_case fixtures'] : []),
      ...(Number(decisionCaseReport?.summary?.comparisonMatchRate || 0) === 1 ? ['comparison evaluation_case fixtures'] : []),
      ...(reviewAgent.summary.ok ? ['review-agent independent gate'] : []),
      'ui-first visual decision cards',
      ...commandResults.filter((item) => item.ok).map((item) => item.id)
  ]);
  const nextTasks = failedTasks.length
    ? failedTasks.map((item) => `fix:${item.id}`)
    : reviewAgent.next_actions.length ? reviewAgent.next_actions : [
      'continue UI-first decision visualization and reduce dense text',
      'fix remaining blocking OCR samples while preserving decision metrics'
    ];
  const currentStage = failedTasks.length ? 'FIX' : 'CHECKPOINT';
  const uiChanges = [
    'home remains one photo-recognition entry',
    'result page keeps conclusion/risk/alternative three-card decision UI',
    'risk card uses nutrition tiles and risk-meter visuals instead of long analysis',
    'result page supports save recommendation / avoid-list behavior',
    'compare page keeps visual A/B status badges and segmented winners'
  ];
  const functionChanges = [
    'review-agent added to backend agent trace',
    'comparison evaluation cases added for sugar, children, and allergy profiles',
    'eval:all now records stability_score, regression_detection, decision_quality_score, and ui_clarity_score',
    'checkpoint now records iteration_id, ui_state, decision_quality, failed_cases, and next_actions'
  ];
  const report = {
    schemaVersion: 'eval-all-v1',
    product: '成分镜',
    loop: 'PLAN -> IMPLEMENT -> TEST -> EVALUATE -> REVIEW -> FIX -> LOOP',
    iterationId,
    loopIteration,
    startedAt,
    finishedAt: new Date().toISOString(),
    resumedFromCheckpoint: Boolean(previousCheckpoint),
    commandResults: commandResults.map(({ stdout, stderr, ...item }) => ({
      ...item,
      stdoutTail: stdout.slice(-4000),
      stderrTail: stderr.slice(-4000)
    })),
    metrics,
    ocrMetricSource: ocrMetrics.source,
    uiContract,
    reviewAgent,
    uiChanges,
    functionChanges,
    completedTasks,
    failedTasks,
    nextTasks,
    iterationReport: {
      json: iterationReportJsonPath,
      markdown: iterationReportMdPath
    }
  };
  const iterationReport = {
    schemaVersion: 'iteration-report-v1',
    product: report.product,
    iteration_id: iterationId,
    iteration: nextIteration,
    loop: report.loop,
    startedAt,
    finishedAt: report.finishedAt,
    resumedFromCheckpoint: report.resumedFromCheckpoint,
    ui_changes: uiChanges,
    function_changes: functionChanges,
    metrics,
    review_summary: reviewAgent.summary,
    ui_state: reviewAgent.ui_state,
    decision_quality: reviewAgent.decision_quality,
    regression_detection: reviewAgent.regression_detection,
    failed_cases: failedTasks,
    next_actions: nextTasks
  };
  const checkpoint = {
    schemaVersion: 'checkpoint-v1',
    product: '成分镜',
    current_stage: currentStage,
    loop: report.loop,
    iteration: nextIteration,
    iteration_id: iterationId,
    completed_tasks: completedTasks,
    failed_tasks: failedTasks,
    failed_cases: failedTasks,
    current_metrics: metrics,
    metrics,
    ui_state: reviewAgent.ui_state,
    decision_quality: reviewAgent.decision_quality,
    regression_detection: reviewAgent.regression_detection,
    next_step_tasks: nextTasks,
    next_actions: nextTasks,
    iteration_report: iterationReportJsonPath,
    updatedAt: report.finishedAt
  };

  await writeJson(reportJsonPath, report);
  await writeFile(reportMdPath, renderMarkdownReport(report), 'utf8');
  await writeJson(iterationReportJsonPath, iterationReport);
  await writeFile(iterationReportMdPath, renderIterationMarkdown(iterationReport), 'utf8');
  await writeJson(iterationReportLatestJsonPath, iterationReport);
  await writeFile(iterationReportLatestMdPath, renderIterationMarkdown(iterationReport), 'utf8');
  await writeJson(checkpointPath, checkpoint);

  console.log(`eval:all ${failedTasks.length ? 'failed' : 'passed'} | report: ${reportJsonPath} | checkpoint: ${checkpointPath}`);
  return { failedTasks };
}

function runCommand(item) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(item.command, item.args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: process.env
  });
  return {
    id: item.id,
    label: item.label,
    command: [item.command, ...item.args].join(' '),
    ok: result.status === 0,
    status: result.status ?? 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

async function collectOcrMetrics() {
  const ocrReport = await readJsonIfExists('reports/ocr/ocr-evaluation-report.json');
  const productCodeReport = await readJsonIfExists('reports/ocr/product-code-evaluation-report.json');
  const samples = Array.isArray(ocrReport?.samples) ? ocrReport.samples : [];
  const reportMetrics = ocrReport?.summary?.metrics || {};
  const hasBlockingOcrError = (sample) => (Array.isArray(sample.errors) ? sample.errors : [])
    .some((error) => ['high', 'medium'].includes(error.severity));
  const samplePass = (sample) => sample.reviewStatus === 'pass' && !hasBlockingOcrError(sample);
  const strictSamplePass = (sample) => sample.reviewStatus === 'pass' && (!Array.isArray(sample.errors) || sample.errors.length === 0);
  const ingredientSamples = samples.filter((sample) => Boolean(sample.expected?.ingredientsText || String(sample.category || '').includes('ingredients')));
  const nutritionSamples = samples.filter((sample) => Boolean(sample.expected?.nutritionText || String(sample.category || '').includes('nutrition')));
  const strictCounts = {
    passedSamples: samples.filter(strictSamplePass).length,
    ingredientPassedSamples: ingredientSamples.filter(strictSamplePass).length,
    nutritionPassedSamples: nutritionSamples.filter(strictSamplePass).length
  };
  return {
    source: {
      ocrReport: 'reports/ocr/ocr-evaluation-report.json',
      productCodeReport: 'reports/ocr/product-code-evaluation-report.json',
      sampleCount: samples.length,
      generatedAt: ocrReport?.generatedAt || '',
      passedSamples: Number(reportMetrics.passedSamples ?? samples.filter(samplePass).length),
      failedSamples: Number(reportMetrics.failedSamples ?? samples.length - samples.filter(samplePass).length),
      strictPassedSamples: strictCounts.passedSamples,
      strictFailedSamples: samples.length - strictCounts.passedSamples
    },
    ocrAccuracy: Number(reportMetrics.overallPassRate ?? ratio(samples.filter(samplePass).length, samples.length)),
    ocrStrictAccuracy: ratio(strictCounts.passedSamples, samples.length),
    ingredientRecognitionAccuracy: Number(reportMetrics.ingredientsAccuracy ?? ratio(ingredientSamples.filter(samplePass).length, ingredientSamples.length)),
    ingredientStrictAccuracy: ratio(strictCounts.ingredientPassedSamples, ingredientSamples.length),
    nutritionParsingAccuracy: Number(reportMetrics.nutritionAccuracy ?? ratio(nutritionSamples.filter(samplePass).length, nutritionSamples.length)),
    nutritionStrictAccuracy: ratio(strictCounts.nutritionPassedSamples, nutritionSamples.length),
    barcodeQrAccuracy: Number(productCodeReport?.summary?.accuracy ?? 0)
  };
}

async function evaluateUiContract() {
  const files = {
    home: await readFile('user-uniapp/src/pages/index/index.vue', 'utf8'),
    capture: await readFile('user-uniapp/src/pages/capture/index.vue', 'utf8'),
    report: await readFile('user-uniapp/src/pages/report/index.vue', 'utf8'),
    compare: await readFile('user-uniapp/src/pages/compare/index.vue', 'utf8'),
    imageUploader: await readFile('user-uniapp/src/components/ImageUploader.vue', 'utf8'),
    decisionApi: await readFile('user-uniapp/src/services/api/decision.ts', 'utf8'),
    scanStore: await readFile('user-uniapp/src/stores/scanStore.ts', 'utf8'),
    pages: await readFile('user-uniapp/src/pages.json', 'utf8')
  };
  const reportHasSaveOrAvoidAction = (files.report.includes('保存报告') || files.report.includes('保存记录') || files.report.includes('收藏建议'))
    && files.report.includes('加入避雷');
  const checks = [
    ['home_has_single_photo_entry', files.home.includes('拍照识别')],
    ['home_no_search_entry', !files.home.includes('查单个成分') && !files.pages.includes('pages/search/index')],
    ['home_no_tab_bar_secondary_entry', !/"tabBar"\s*:/u.test(files.pages)],
    ['capture_uses_purchase_wording', files.capture.includes('生成购买建议') && !files.capture.includes('生成参考报告')],
    ['capture_exposes_profile_chips_off_home', files.capture.includes('profile-strip') && files.capture.includes('调整')],
    ['capture_uses_compact_visual_scan_hints', files.imageUploader.includes('image-uploader__signals') && !files.imageUploader.includes('image-uploader__checklist')],
    ['report_has_conclusion_card', files.report.includes('该不该买')],
    ['report_has_fast_decision_proof_panel', files.report.includes('fast-summary-panel') && files.report.includes('decisionProofRows')],
    ['report_caps_fast_decision_proof_to_key_items', files.report.includes('decisionProofRows') && files.report.includes('.slice(0, 3)')],
    ['report_visualizes_risk_instead_of_text_pile', files.report.includes('risk-meter') && files.report.includes('risk-dot')],
    ['report_has_alternative_card', files.report.includes('替代推荐')],
    ['report_supports_repeat_use_save_or_avoid_action', reportHasSaveOrAvoidAction],
    ['report_has_suitable_groups', files.report.includes('适合') && files.report.includes('不适合')],
    ['report_exposes_bounded_evidence_text', files.report.includes('可核对证据') && files.report.includes('完整标签文字') && files.report.includes('复制完整文本') && files.report.includes('纠错后重算')],
    ['report_avoids_legacy_raw_text_dump', !/OCR\s*原文|识别详情|识别文字|rawLabelText|对照包装原文/u.test(files.report)],
    ['report_no_technical_sections', !/营养重点图|添加剂解释|技术字段/u.test(files.report)],
    ['compare_page_registered', files.pages.includes('pages/compare/index')],
    ['compare_page_has_core_outputs', files.compare.includes('负担更低') && files.compare.includes('更低风险') && files.compare.includes('更适合你')],
    ['compare_page_uses_visual_decision_badges', files.compare.includes('product-decision--') && files.compare.includes('segment-strip')],
    ['compare_page_uses_backend_adapter', files.compare.includes('compareReportsWithAdapter') && files.decisionApi.includes('/decision/compare')],
    ['runtime_pages_avoid_legacy_report_wording', !/食品标签解读|生成参考报告|参考报告/u.test([
      files.home,
      files.capture,
      files.report,
      files.compare,
      files.imageUploader,
      files.scanStore,
      files.pages
    ].join('\n'))]
  ];
  const passed = checks.filter(([, ok]) => ok).length;
  return {
    checks: checks.map(([id, ok]) => ({ id, ok })),
    matchRate: ratio(passed, checks.length),
    failures: checks.filter(([, ok]) => !ok).map(([id]) => `UI contract failed: ${id}`)
  };
}

function renderMarkdownReport(report) {
  const metricRows = Object.entries(report.metrics)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');
  const failedRows = report.failedTasks.length
    ? report.failedTasks.map((item) => `- ${item.id}: ${item.stderr || `exit ${item.exitCode}`}`).join('\n')
    : '- none';
  return [
    '# eval:all report',
    '',
    `- product: ${report.product}`,
    `- iterationId: ${report.iterationId}`,
    `- finishedAt: ${report.finishedAt}`,
    `- resumedFromCheckpoint: ${report.resumedFromCheckpoint}`,
    `- reviewAgent: ${report.reviewAgent.summary.ok ? 'passed' : 'failed'}`,
    `- iterationReport: ${report.iterationReport.markdown}`,
    '',
    '## Metrics',
    '',
    '| metric | value |',
    '| --- | ---: |',
    metricRows,
    '',
    '## Failed Tasks',
    '',
    failedRows,
    '',
    '## UI Changes',
    '',
    ...report.uiChanges.map((item) => `- ${item}`),
    '',
    '## Function Changes',
    '',
    ...report.functionChanges.map((item) => `- ${item}`),
    '',
    '## Next Tasks',
    '',
    ...report.nextTasks.map((item) => `- ${item}`)
  ].join('\n');
}

function renderIterationMarkdown(report) {
  const metricRows = Object.entries(report.metrics)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');
  const failedRows = report.failed_cases.length
    ? report.failed_cases.map((item) => `- ${item.id}: ${item.stderr || `exit ${item.exitCode}`}`).join('\n')
    : '- none';
  return [
    '# iteration report',
    '',
    `- product: ${report.product}`,
    `- iteration_id: ${report.iteration_id}`,
    `- loop: ${report.loop}`,
    `- finishedAt: ${report.finishedAt}`,
    `- resumedFromCheckpoint: ${report.resumedFromCheckpoint}`,
    '',
    '## Metrics',
    '',
    '| metric | value |',
    '| --- | ---: |',
    metricRows,
    '',
    '## Review Summary',
    '',
    `- ui_clarity_score: ${report.review_summary.ui_clarity_score}`,
    `- decision_quality_score: ${report.review_summary.decision_quality_score}`,
    `- stability_score: ${report.review_summary.stability_score}`,
    `- regression_detection: ${report.review_summary.regression_detection}`,
    '',
    '## UI Changes',
    '',
    ...report.ui_changes.map((item) => `- ${item}`),
    '',
    '## Function Changes',
    '',
    ...report.function_changes.map((item) => `- ${item}`),
    '',
    '## Failed Cases',
    '',
    failedRows,
    '',
    '## Next Actions',
    '',
    ...report.next_actions.map((item) => `- ${item}`)
  ].join('\n');
}

function ratio(pass, total) {
  return total > 0 ? pass / total : 0;
}

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(4));
}

function mergeCompleted(previous, next) {
  return [...new Set([...(Array.isArray(previous) ? previous : []), ...next])];
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
