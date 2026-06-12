import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const roots = ['src', 'scripts', 'public'];
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
const jsFiles = [];
const textFiles = [];

for (const root of roots) {
  await collectFiles(root);
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${file}\n${result.stderr}`);
  }
}

for (const file of textFiles.filter((path) => path.startsWith('src/'))) {
  const content = await readFile(file, 'utf8');
  for (const phrase of forbiddenPhrases) {
    if (content.includes(phrase)) {
      throw new Error(`Forbidden compliance phrase "${phrase}" found in ${file}`);
    }
  }
}

console.log(`Lint passed: ${jsFiles.length} JavaScript files checked, ${textFiles.length} text files scanned.`);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(path);
    } else if (entry.isFile()) {
      textFiles.push(path);
      if (path.endsWith('.js') || path.endsWith('.mjs')) {
        jsFiles.push(path);
      }
    }
  }
}
