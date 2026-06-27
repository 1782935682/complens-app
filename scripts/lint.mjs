import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const jsRoots = ['scripts'];
const uiFiles = [
  'user-uniapp/src/pages/index/index.vue',
  'user-uniapp/src/pages/report/index.vue',
  'user-uniapp/src/pages/compare/index.vue',
  'user-uniapp/src/services/api/decision.ts',
  'user-uniapp/src/pages.json'
];
const forbiddenUiPhrases = [
  '查单个成分',
  'OCR原文',
  'OCR 原文',
  '识别详情',
  '识别文字',
  '营养重点图',
  '添加剂解释',
  '一句话结论',
  '关键原因',
  'pages/search/index',
  '成分搜索'
];
const requiredUiSnippets = new Map([
  ['user-uniapp/src/pages/index/index.vue', ['拍照识别']],
  ['user-uniapp/src/pages/report/index.vue', ['该不该买', '可核对证据', '替代推荐', '适合', '不适合']],
  ['user-uniapp/src/pages/compare/index.vue', ['负担更低', '更低风险', '更适合你', 'compareReportsWithAdapter']],
  ['user-uniapp/src/services/api/decision.ts', ['/decision/compare']]
]);

const jsFiles = [];
for (const root of jsRoots) {
  await collectJsFiles(root);
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${file}\n${result.stderr}`);
}

for (const file of uiFiles) {
  const content = await readFile(file, 'utf8');
  for (const phrase of forbiddenUiPhrases) {
    if (content.includes(phrase)) throw new Error(`Retired UI phrase "${phrase}" found in ${file}`);
  }
  for (const snippet of requiredUiSnippets.get(file) || []) {
    if (!content.includes(snippet)) throw new Error(`Required decision UI snippet "${snippet}" missing in ${file}`);
  }
}

console.log(`Lint passed: ${jsFiles.length} JavaScript files checked, ${uiFiles.length} decision UI files scanned.`);

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsFiles(path);
      continue;
    }
    if (entry.isFile() && (path.endsWith('.js') || path.endsWith('.mjs'))) {
      jsFiles.push(path);
    }
  }
}
