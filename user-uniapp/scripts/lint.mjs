import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src'];
const scannedExtensions = ['.vue', '.ts', '.json', '.css'];
const forbiddenPhrases = [
  '可以买',
  '不能买',
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
  '有毒'
];

let checked = 0;

for (const root of roots) {
  await collectFiles(root);
}

console.log(`User uni-app lint passed: ${checked} files scanned.`);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(filePath);
      continue;
    }
    if (!entry.isFile() || !scannedExtensions.some((extension) => filePath.endsWith(extension))) continue;
    checked += 1;
    const content = await readFile(filePath, 'utf8');
    for (const phrase of forbiddenPhrases) {
      if (content.includes(phrase)) {
        throw new Error(`Forbidden compliance phrase "${phrase}" found in ${filePath}`);
      }
    }
  }
}
