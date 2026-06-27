import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaultReportJsonPath = 'reports/evaluation/review-agent-report.json';
const defaultReportMdPath = 'reports/evaluation/review-agent-report.md';

export async function runReviewAgent(context = {}) {
  const files = await readReviewFiles();
  const metrics = context.metrics || (await readJsonIfExists('reports/evaluation/eval-all-report.json'))?.metrics || {};
  const decisionCaseReport = context.decisionCaseReport || await readJsonIfExists('reports/evaluation/decision-cases-report.json');
  const previousCheckpoint = context.previousCheckpoint || await readJsonIfExists('.codex/state/checkpoint.json');
  const ocrReport = context.ocrReport || await readJsonIfExists('reports/ocr/ocr-evaluation-report.json');
  const uiContract = context.uiContract || { matchRate: 0, checks: [] };
  const regressionDetection = detectRegression(metrics, previousCheckpoint, { ocrReport });
  const uiReview = evaluateUiClarity(files, uiContract);
  const functionReview = evaluateFunctionValue(files, decisionCaseReport);
  const outputReview = evaluateDecisionOutput(files);
  const decisionQuality = evaluateDecisionQuality(metrics, decisionCaseReport, outputReview);
  const stability = evaluateStability(metrics, regressionDetection, uiReview, functionReview, outputReview);
  const allChecks = [
    ...uiReview.checks,
    ...functionReview.checks,
    ...outputReview.checks
  ];
  const failedCases = [
    ...allChecks.filter((item) => !item.ok).map((item) => ({
      id: item.id,
      label: item.label,
      severity: item.severity || 'high'
    })),
    ...regressionDetection.regressions.map((item) => ({
      id: `regression_${item.metric}`,
      label: `${item.metric} regressed from ${item.previous} to ${item.current}`,
      severity: 'high'
    }))
  ];
  const report = {
    schemaVersion: 'review-agent-report-v1',
    agent: 'review-agent',
    product: '成分镜',
    generatedAt: new Date().toISOString(),
    reviewLoop: 'PLAN -> IMPLEMENT -> TEST -> EVALUATE -> REVIEW -> FIX -> LOOP',
    summary: {
      ok: failedCases.length === 0,
      ui_clarity_score: uiReview.score,
      decision_quality_score: decisionQuality.score,
      stability_score: stability.score,
      regression_detection: regressionDetection.ok ? 1 : 0
    },
    ui_state: uiReview.state,
    decision_quality: decisionQuality,
    stability,
    regression_detection: regressionDetection,
    function_value: functionReview,
    output_value: outputReview,
    failed_cases: failedCases,
    next_actions: failedCases.length
      ? failedCases.map((item) => `fix:${item.id}`)
      : [
        'continue UI-first decision visualization',
        'keep fixing blocking OCR samples without weakening decision quality'
      ]
  };

  await writeJson(defaultReportJsonPath, report);
  await writeFile(defaultReportMdPath, renderReviewMarkdown(report), 'utf8');
  return report;
}

async function readReviewFiles() {
  return {
    home: await readFile('user-uniapp/src/pages/index/index.vue', 'utf8'),
    capture: await readFile('user-uniapp/src/pages/capture/index.vue', 'utf8'),
    report: await readFile('user-uniapp/src/pages/report/index.vue', 'utf8'),
    compare: await readFile('user-uniapp/src/pages/compare/index.vue', 'utf8'),
    imageUploader: await readFile('user-uniapp/src/components/ImageUploader.vue', 'utf8'),
    decisionRules: await readFile('user-uniapp/src/utils/decisionRules.ts', 'utf8'),
    scanStore: await readFile('user-uniapp/src/stores/scanStore.ts', 'utf8'),
    pages: await readFile('user-uniapp/src/pages.json', 'utf8'),
    decisionApi: await readFile('user-uniapp/src/services/api/decision.ts', 'utf8'),
    decisionService: await readFile('backend/src/services/decisionAgentService.ts', 'utf8'),
    decisionRoute: await readFile('backend/src/routes/decision.ts', 'utf8')
  };
}

function evaluateUiClarity(files, uiContract) {
  const hasUiContract = Array.isArray(uiContract.checks) && uiContract.checks.length > 0;
  const hasSaveOrAvoidAction = (files.report.includes('保存报告') || files.report.includes('保存记录') || files.report.includes('收藏建议'))
    && files.report.includes('加入避雷');
  const order = [
    files.report.indexOf('该不该买'),
    files.report.indexOf('fast-summary-panel'),
    files.report.indexOf('替代推荐')
  ];
  const checks = [
    check('ui_home_single_action', '首页只有拍照识别主入口', files.home.includes('拍照识别') && !/"tabBar"\s*:/u.test(files.pages)),
    check('ui_three_second_result', '结果页首屏先给结论、分数和行动', files.report.includes('decision-card--conclusion') && files.report.includes('decision-badge') && files.report.includes('fast-summary-panel')),
    check('ui_three_card_order', '结果页按结论、快速依据、替代推荐排序', order.every((item) => item >= 0) && order[0] < order[1] && order[1] < order[2]),
    check('ui_no_information_overload', '快速依据最多三条且有视觉刻度', files.report.includes('decisionProofRows') && files.report.includes('.slice(0, 3)') && files.report.includes('risk-meter') && files.report.includes('risk-dot')),
    check('ui_image_text_combined', '拍照入口用图形信号表达配料/营养/条码', files.imageUploader.includes('image-uploader__signals') && !files.imageUploader.includes('image-uploader__checklist')),
    check('ui_compare_visual', '对比页用 A/B 分段条和推荐徽标', files.compare.includes('segment-strip') && files.compare.includes('product-decision--')),
    check('ui_repeat_use_action', '结果页支持保存报告或加入避雷', hasSaveOrAvoidAction),
    check('ui_contract_passed', 'UI 合同审计通过', !hasUiContract || Number(uiContract.matchRate || 0) === 1)
  ];
  return {
    score: scoreChecks(checks),
    checks,
    state: {
      home: 'single_photo_action',
      result: 'three_card_decision_ui',
      compare: 'visual_ab_decision',
      repeat_use: hasSaveOrAvoidAction ? 'save_or_avoid_enabled' : 'missing'
    }
  };
}

function evaluateFunctionValue(files, decisionCaseReport) {
  const agents = ['product-agent', 'ui-agent', 'ocr-agent', 'nutrition-agent', 'rule-agent', 'decision-agent', 'compare-agent', 'eval-agent', 'fix-agent', 'review-agent'];
  const decisionSummary = decisionCaseReport?.summary || {};
  const checks = [
    ...agents.map((agent) => check(`agent_${agent}`, `${agent} 已登记`, files.decisionService.includes(`'${agent}'`))),
    check('function_decision_api', '存在单品购买决策 API', files.decisionRoute.includes('/decision/analyze')),
    check('function_compare_api', '存在 A/B 对比 API', files.decisionRoute.includes('/decision/compare') && files.decisionApi.includes('/decision/compare')),
    check('function_profile_cases', '用户画像评测全通过', Number(decisionSummary.matchRate || 0) === 1),
    check('function_compare_cases', '对比评测全通过', Number(decisionSummary.comparisonMatchRate || 0) === 1),
    check('function_purchase_not_ocr', '输出是购买建议而不是识别详情', files.decisionRules.includes('PurchaseDecision') && !/OCR\s*原文|识别详情|对照包装原文/u.test(files.report))
  ];
  return {
    score: scoreChecks(checks),
    checks
  };
}

function evaluateDecisionOutput(files) {
  const runtimeText = [
    files.home,
    files.capture,
    files.report,
    files.compare,
    files.imageUploader,
    files.scanStore,
    files.pages
  ].join('\n');
  const checks = [
    check('output_clear_recommendation', '明确推荐/谨慎/不建议/信息不足', ['推荐', '谨慎', '不建议', '信息不足'].every((item) => files.decisionRules.includes(item) || files.decisionService.includes(item))),
    check('output_risk_max_three', '判断依据最多三条', files.decisionRules.includes('.slice(0, 3)') && files.decisionService.includes('.slice(0, 3)')),
    check('output_has_alternatives', '必须给替代推荐', files.report.includes('替代推荐') && files.decisionRules.includes('alternatives')),
    check('output_bounded_evidence_text', '展示可核对证据且避免技术字段堆叠', files.report.includes('可核对证据') && files.report.includes('完整标签文字') && files.report.includes('复制完整文本') && !/OCR\s*原文|识别详情|识别文字|rawLabelText|技术字段|对照包装原文/u.test(runtimeText)),
    check('output_not_legacy_report', '运行态不再使用旧报告型文案', !/食品标签解读|生成参考报告|参考报告/u.test(runtimeText)),
    check('output_compare_core_diff', '对比输出营养负担、风险、画像适配', files.compare.includes('负担更低') && files.compare.includes('更低风险') && files.compare.includes('更适合你'))
  ];
  return {
    score: scoreChecks(checks),
    checks
  };
}

function evaluateDecisionQuality(metrics, decisionCaseReport, outputReview) {
  const summary = decisionCaseReport?.summary || {};
  const ingredients = Number(metrics.ingredientRecognitionAccuracy || 0);
  const nutrition = Number(metrics.nutritionParsingAccuracy || 0);
  const decision = Number(metrics.decisionConsistency ?? summary.matchRate ?? 0);
  const profile = Number(metrics.evaluationCasePassRate ?? summary.matchRate ?? 0);
  const comparison = Number(summary.comparisonMatchRate || 0);
  const output = Number(outputReview.score || 0);
  const score = roundMetric((decision + profile + comparison + output) / 4);
  return {
    score,
    recognitionSupport: {
      ingredients,
      nutrition
    },
    decisionConsistency: decision,
    profileMatch: profile,
    comparisonMatch: comparison,
    outputValue: output
  };
}

function evaluateStability(metrics, regressionDetection, uiReview, functionReview, outputReview) {
  const checks = [
    check('stability_no_metric_regression', '核心指标无回归', regressionDetection.ok),
    check('stability_ocr_gate', 'OCR 决策可用率达到 95%', Number(metrics.ocrAccuracy || 0) >= 0.95),
    check('stability_ingredient_gate', '配料识别达到 95%', Number(metrics.ingredientRecognitionAccuracy || 0) >= 0.95),
    check('stability_nutrition_gate', '营养解析达到 95%', Number(metrics.nutritionParsingAccuracy || 0) >= 0.95),
    check('stability_decision_gate', '决策一致性达到 100%', Number(metrics.decisionConsistency || 0) === 1),
    check('stability_ui_gate', 'UI 清晰度通过', uiReview.score === 1),
    check('stability_function_gate', '功能价值通过', functionReview.score === 1),
    check('stability_output_gate', '输出价值通过', outputReview.score === 1)
  ];
  return {
    score: scoreChecks(checks),
    checks
  };
}

function detectRegression(metrics, previousCheckpoint, context = {}) {
  const previous = previousCheckpoint?.current_metrics || previousCheckpoint?.metrics || {};
  const tracked = [
    'ocrAccuracy',
    'ingredientRecognitionAccuracy',
    'nutritionParsingAccuracy',
    'barcodeQrAccuracy',
    'decisionConsistency',
    'evaluationCasePassRate',
    'userBehaviorMatchRate'
  ];
  const regressions = tracked
    .map((metric) => ({
      metric,
      previous: Number(previous[metric]),
      current: Number(metrics[metric])
    }))
    .filter((item) => Number.isFinite(item.previous) && Number.isFinite(item.current) && item.current + 0.0001 < item.previous);
  const acceptedRegressions = regressions.filter((item) => isAcceptedReportSafetyRegression(item, context.ocrReport));
  const blockingRegressions = regressions.filter((item) => !acceptedRegressions.includes(item));
  return {
    ok: blockingRegressions.length === 0,
    regressions: blockingRegressions,
    acceptedRegressions,
    baselineIteration: previousCheckpoint?.iteration || previousCheckpoint?.iteration_id || null
  };
}

function isAcceptedReportSafetyRegression(regression, ocrReport) {
  if (regression.metric !== 'ingredientRecognitionAccuracy') return false;
  if (Number(regression.current) < 0.99) return false;
  const samples = Array.isArray(ocrReport?.samples) ? ocrReport.samples : [];
  const blockingIngredientFailures = samples.filter((sample) => {
    const errors = Array.isArray(sample.errors) ? sample.errors : [];
    const hasIngredientError = errors.some((error) => (
      ['high', 'medium'].includes(error.severity)
      && /ingredient/i.test(String(error.code || ''))
    ));
    return hasIngredientError && (sample.expected?.ingredientsText || /ingredients/i.test(String(sample.category || '')));
  });
  if (!blockingIngredientFailures.length) return false;
  return blockingIngredientFailures.every((sample) => {
    const summary = String(sample.reportSummary || '');
    return /信息不足/.test(summary)
      && /补拍配料表|手动补充/.test(summary)
      && !/识别到\s*\d+\s*项配料/.test(summary);
  });
}

function check(id, label, ok, severity = 'high') {
  return { id, label, ok: Boolean(ok), severity };
}

function scoreChecks(checks) {
  return roundMetric(checks.filter((item) => item.ok).length / Math.max(1, checks.length));
}

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(4));
}

function renderReviewMarkdown(report) {
  const failedRows = report.failed_cases.length
    ? report.failed_cases.map((item) => `- ${item.id}: ${item.label}`).join('\n')
    : '- none';
  return [
    '# review-agent report',
    '',
    `- product: ${report.product}`,
    `- generatedAt: ${report.generatedAt}`,
    `- ok: ${report.summary.ok ? 'yes' : 'no'}`,
    '',
    '## Scores',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| ui_clarity_score | ${report.summary.ui_clarity_score} |`,
    `| decision_quality_score | ${report.summary.decision_quality_score} |`,
    `| stability_score | ${report.summary.stability_score} |`,
    `| regression_detection | ${report.summary.regression_detection} |`,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runReviewAgent();
  console.log(`review-agent ${report.summary.ok ? 'passed' : 'failed'} | report: ${defaultReportJsonPath}`);
  if (!report.summary.ok) process.exitCode = 1;
}
