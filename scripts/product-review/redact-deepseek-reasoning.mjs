import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || 'reports/product-review/raw/deepseek';
let changed = 0;

for (const file of await walk(root)) {
  if (!file.endsWith('.json')) continue;
  const raw = await readFile(file, 'utf8');
  let redacted = raw;
  try {
    const parsed = JSON.parse(raw);
    const next = redactValue(parsed);
    redacted = `${JSON.stringify(next, null, 2)}\n`;
  } catch {
    redacted = raw
      .replace(/\\"reasoning_content\\":\\"(?:\\\\.|[^\\"])*\\"/gu, '\\"reasoning_content\\":\\"[redacted]\\"')
      .replace(/"reasoning_content"\s*:\s*"(?:\\.|[^"])*"/gu, '"reasoning_content":"[redacted]"');
  }
  if (redacted !== raw) {
    await writeFile(file, redacted, 'utf8');
    changed += 1;
  }
}

console.log(`redacted reasoning_content in ${changed} file(s) under ${root}`);

async function walk(path) {
  if (!existsSync(path)) return [];
  const entries = await readdir(path, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const next = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await walk(next));
    else result.push(next);
  }
  return result;
}

function redactValue(value) {
  if (typeof value === 'string') {
    return value.includes('reasoning_content')
      ? 'DeepSeek API returned empty content; reasoning_content redacted'
      : value;
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      key === 'reasoning_content' ? '[redacted]' : redactValue(child)
    ]));
  }
  return value;
}
