import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readOfficialSourceManifest } from './ingredient-knowledge-common.js';
import { getPipelinePaths } from './ingredient-official-data-pipeline.js';

const shouldDownload = process.argv.includes('--download');
const outDir = readOption('--out-dir') || getPipelinePaths().downloadedDir;
const manifest = await readOfficialSourceManifest();

if (!shouldDownload) {
  console.log(`Loaded ${manifest.length} official ingredient source manifest item(s).`);
  for (const source of manifest) {
    console.log(`${source.id}: ${source.standardNo} ${source.title} hash=${source.contentHash}`);
  }
  console.log('Use --download to fetch official attachments into docs/source-materials/downloaded/ for hash verification.');
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
for (const source of manifest) {
  const body = new URLSearchParams({
    task: source.downloadTask || 'd_p',
    file_guid: source.fileGuid
  });
  const response = await fetch(source.downloadEndpoint, {
    method: 'POST',
    body
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${source.id}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (hash !== source.contentHash) {
    throw new Error(`Hash mismatch for ${source.id}: expected ${source.contentHash}, got ${hash}`);
  }
  const outputPath = join(outDir, source.factName);
  await writeFile(outputPath, buffer);
  console.log(`Downloaded ${source.id} to ${outputPath} (${buffer.length} bytes, sha256=${hash})`);
}

function readOption(name: string) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || '';
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : '';
}
