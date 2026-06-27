import { readFile } from 'node:fs/promises';

const files = {
  home: await readFile('src/pages/index/index.vue', 'utf8'),
  capture: await readFile('src/pages/capture/index.vue', 'utf8'),
  report: await readFile('src/pages/report/index.vue', 'utf8'),
  compare: await readFile('src/pages/compare/index.vue', 'utf8'),
  imageUploader: await readFile('src/components/ImageUploader.vue', 'utf8'),
  decisionApi: await readFile('src/services/api/decision.ts', 'utf8'),
  pages: await readFile('src/pages.json', 'utf8'),
  decisionRules: await readFile('src/utils/decisionRules.ts', 'utf8'),
  scanStore: await readFile('src/stores/scanStore.ts', 'utf8')
};

const reportHasSaveOrAvoidAction = (files.report.includes('保存报告') || files.report.includes('保存记录') || files.report.includes('收藏建议'))
  && files.report.includes('加入避雷');

const checks = [
  ['home keeps one visible action', files.home.includes('拍照识别')],
  ['home removes ingredient search entry', !files.home.includes('查单个成分') && !files.pages.includes('pages/search/index')],
  ['home has no tab bar secondary entry', !/"tabBar"\s*:/u.test(files.pages)],
  ['capture uses purchase-decision wording', files.capture.includes('生成购买建议') && !files.capture.includes('生成参考报告')],
  ['capture exposes profile chips off home', files.capture.includes('profile-strip') && files.capture.includes('调整')],
  ['capture uses compact visual scan hints', files.imageUploader.includes('image-uploader__signals') && !files.imageUploader.includes('image-uploader__checklist')],
  ['capture blocks mock OCR from purchase advice', files.capture.includes('mock OCR') && files.capture.includes('shouldTreatAutoRecognitionAsInsufficient')],
  ['report has purchase conclusion card', files.report.includes('该不该买')],
  ['report has fast decision proof panel', files.report.includes('fast-summary-panel') && files.report.includes('decisionProofRows')],
  ['report exposes source status on first screen', files.report.includes('sourceStatusText') && files.report.includes('source-status')],
  ['report caps decision proof to key items', files.report.includes('decisionProofRows') && files.report.includes('.slice(0, 3)')],
  ['report prioritizes allergen warnings', files.decisionRules.includes('...allergyWarnings') && files.decisionRules.includes('来源：${sourceLabel}')],
  ['report carries degraded data warnings', files.decisionRules.includes('getQualityWarnings') && files.decisionRules.includes('degraded_backend')],
  ['report visualizes risk instead of text pile', files.report.includes('risk-meter') && files.report.includes('risk-dot')],
  ['report has alternative card', files.report.includes('替代推荐')],
  ['report supports repeat-use save or avoid action', reportHasSaveOrAvoidAction],
  ['report exposes suitable and unsuitable groups', files.report.includes('适合') && files.report.includes('不适合')],
  ['report exposes bounded evidence text', files.report.includes('可核对证据') && files.report.includes('完整标签文字') && files.report.includes('复制完整文本') && files.report.includes('纠错后重算')],
  ['report avoids legacy raw-text dumping labels', !/OCR\s*原文|识别详情|对照包装原文/u.test(files.report)],
  ['report hides technical analysis sections', !/营养重点图|添加剂解释|技术字段|对照包装原文/u.test(files.report)],
  ['decision output uses purchase recommendations', files.decisionRules.includes('推荐') && files.decisionRules.includes('谨慎') && files.decisionRules.includes('不建议')],
  ['compare page is registered', files.pages.includes('pages/compare/index')],
  ['compare page outputs three purchase differences', files.compare.includes('负担更低') && files.compare.includes('更低风险') && files.compare.includes('更适合你')],
  ['compare page shows nutrition/allergen/additive differences', files.compare.includes('关键差异') && files.compare.includes('buildNutritionDifference') && files.compare.includes('buildAllergenDifference') && files.compare.includes('buildAdditiveDifference')],
  ['compare page uses visual decision badges', files.compare.includes('product-decision--') && files.compare.includes('segment-strip')],
  ['compare page uses decision compare API adapter', files.compare.includes('compareReportsWithAdapter') && files.decisionApi.includes('/decision/compare')],
  ['runtime pages avoid legacy report wording', !/食品标签解读|生成参考报告|参考报告/u.test([
    files.home,
    files.capture,
    files.report,
    files.compare,
    files.imageUploader,
    files.pages,
    files.scanStore
  ].join('\n'))]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  throw new Error(`Decision product audit failed:\n${failed.map(([name]) => `- ${name}`).join('\n')}`);
}

console.log(`Decision product audit passed: ${checks.length} checks.`);
