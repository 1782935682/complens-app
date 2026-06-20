import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const scannedExtensions = ['.vue', '.ts', '.json', '.css'];
const forbiddenOutputPhrases = [
  '健康',
  '不健康',
  '安全',
  '有害',
  '致癌',
  '治疗',
  '诊断',
  '一定过敏',
  '绝对安全',
  '绝对有害',
  '一定致敏',
  '一定不能吃',
  '有毒',
  '核验',
  '阈值',
  '判断依据',
  '营养表原值',
  '标识偏差',
  '少选',
  '换成',
  '适合当前',
  '可以偶尔选',
  '决定频率',
  '不用过度担心',
  '无需担心',
  '不必担心',
  '可以放心',
  '普通人偶尔',
  '普通人通常',
  '用人话',
  '更偏向',
  '不建议长期',
  '可以避免',
  '避免高频',
  '不能判断',
  '可用于判断',
  '再判断',
  '是否合规',
  '没有添加剂',
  '无添加剂',
  '暂未识别到明显食品添加剂',
  '不单独下结论',
  '结合目标',
  '结合你的关注目标',
  '结合个人目标',
  '建议结合个人目标',
  '建议根据自己的关注目标',
  '配料雷达',
  '对照包装原文',
  '结合包装原文',
  '核对原文',
  '请对照',
  '以包装原文为准',
  '包装原文为准',
  '先看',
  '怎么核对',
  '待核对线索',
  '分享卡片',
  '大白话'
];

let checkedFiles = 0;

await scanSourceTree('src');
await assertFileIncludes('src/pages/search/index.vue', [
  '为什么看',
  '标签写法',
  '结果用途',
  'buildWhyCareText',
  'buildTrustNote',
  'buildUseAdvice'
]);
await assertFileExcludes('src/pages/search/index.vue', [
  '常见用途',
  '需要注意',
  '常见食品',
  '来源线索',
  'rawSourceText',
  'regulatoryBasis',
  'reviewNote'
]);
await assertFileIncludes('src/pages/report/index.vue', [
  '信息不足',
  '还需要补充',
  '未确认线索',
  '一句话结论',
  '关键原因',
  '适合谁 / 不适合谁',
  '建议吃法',
  '识别详情',
  '营养表',
  '配料表里容易漏看的点',
  'shareCard',
  'shouldShowAdditiveSection',
  '未拿到配料表，暂不查看添加剂',
  '当前配料表未匹配到本地常见添加剂规则',
  '营养数字',
  '添加剂作用',
  'nutritionBars',
  'buildNutritionFindingDetail',
  'nutritionFocusText'
]);
await assertFileExcludes('src/pages.json', [
  'pages/settings/index',
  '设置与说明'
]);
await assertFileIncludes('src/utils/labelTextExtractor.ts', [
  'frontClaimTargetPattern',
  'productInfoNoisePattern',
  'hasNutritionValueStructure',
  'hasAllergenContext',
  'ignoredText'
]);
await assertFileIncludes('src/utils/decisionRules.ts', [
  'buildDecisionSignalText',
  'isNormalAdditiveMatch'
]);
await assertFileIncludes('src/platform/share.ts', [
  'buildReportShareText',
  '仅供标签信息参考'
]);
await assertFunctionExcludes('src/utils/decisionRules.ts', 'buildConsumerDecision', ['report.rawText']);
await assertFunctionExcludes('src/utils/decisionRules.ts', 'buildAdditiveRecognitions', ['report.rawText', 'rawText']);
await assertFunctionExcludes('src/utils/decisionRules.ts', 'buildConfiguredAllergyWarnings', ['report.rawText', 'rawText']);
await assertFunctionExcludes('src/utils/reportBuilder.ts', 'buildAttentionHits', ['input.rawText', 'rawText']);

console.log(`Product output audit passed: ${checkedFiles} source files scanned.`);

async function scanSourceTree(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanSourceTree(filePath);
      continue;
    }
    if (!entry.isFile() || !scannedExtensions.some((extension) => filePath.endsWith(extension))) continue;
    checkedFiles += 1;
    const content = await readFile(filePath, 'utf8');
    forbiddenOutputPhrases.forEach((phrase) => {
      if (content.includes(phrase)) {
        throw new Error(`Unsuitable product output phrase "${phrase}" found in ${filePath}`);
      }
    });
  }
}

async function assertFileIncludes(filePath, requiredSnippets) {
  const content = await readFile(filePath, 'utf8');
  const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));
  if (missing.length) {
    throw new Error(`${filePath} is missing required product-output snippets: ${missing.join(', ')}`);
  }
}

async function assertFileExcludes(filePath, blockedSnippets) {
  const content = await readFile(filePath, 'utf8');
  const found = blockedSnippets.filter((snippet) => content.includes(snippet));
  if (found.length) {
    throw new Error(`${filePath} still includes retired product-output snippets: ${found.join(', ')}`);
  }
}

async function assertFunctionExcludes(filePath, functionName, blockedSnippets) {
  const content = await readFile(filePath, 'utf8');
  const block = extractFunctionBlock(content, functionName);
  const found = blockedSnippets.filter((snippet) => block.includes(snippet));
  if (found.length) {
    throw new Error(`${filePath}#${functionName} includes blocked signal source snippets: ${found.join(', ')}`);
  }
}

function extractFunctionBlock(content, functionName) {
  const functionPattern = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\b`);
  const match = content.match(functionPattern);
  if (!match || typeof match.index !== 'number') {
    throw new Error(`Unable to find function ${functionName}`);
  }
  const braceStart = content.indexOf('{', match.index);
  if (braceStart < 0) throw new Error(`Unable to find body for function ${functionName}`);

  let depth = 0;
  for (let index = braceStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return content.slice(braceStart, index + 1);
  }
  throw new Error(`Unable to close function ${functionName}`);
}
