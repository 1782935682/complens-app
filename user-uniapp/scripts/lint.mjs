import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src'];
const scannedExtensions = ['.vue', '.ts', '.json', '.css'];
const forbiddenPhrases = [
  ['绝对', '安全'],
  ['绝对', '有害'],
  ['一定', '致敏'],
  ['一定', '不能吃'],
  ['一定', '有效'],
  ['致癌'],
  ['有毒'],
  ['治疗', '疾病'],
  ['医学', '诊断']
].map((parts) => parts.join(''));

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
