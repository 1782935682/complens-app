import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const labelsDir = join(repoRoot, 'datasets', 'ocr_samples', 'labels');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const manifestPath = join(labelsDir, 'samples.json');
const blocklistPath = join(labelsDir, 'blocked-samples.json');
const qualityPath = join(reportsDir, 'sample-quality-report.json');
const reportPath = join(reportsDir, 'sample-curation-report.md');

await mkdir(labelsDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

if (!existsSync(qualityPath)) {
  console.error(`Missing sample quality report: ${qualityPath}`);
  process.exit(2);
}
if (!existsSync(manifestPath)) {
  console.error(`Missing sample manifest: ${manifestPath}`);
  process.exit(2);
}

const quality = JSON.parse(await readFile(qualityPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const previousBlocklist = existsSync(blocklistPath)
  ? JSON.parse(await readFile(blocklistPath, 'utf8'))
  : { entries: [] };

const qualityGroups = quality.groups || {};
const rejected = [
  ...(Array.isArray(qualityGroups.invalid) ? qualityGroups.invalid : []),
  ...(Array.isArray(qualityGroups.weakOcr) ? qualityGroups.weakOcr : [])
];
const previousEntries = Array.isArray(previousBlocklist.entries) ? previousBlocklist.entries : [];
const entries = dedupeEntries([
  ...previousEntries,
  ...rejected.map((item) => ({
    sampleId: item.sampleId,
    sourceUrl: item.sourceUrl,
    imageUrl: item.imageUrl,
    imagePath: item.imagePath,
    sha256: item.sha256,
    category: item.category,
    role: item.role,
    qualityStatus: item.qualityStatus,
    qualityReasons: item.qualityReasons || [],
    blockedAt: new Date().toISOString()
  }))
]);

const blockedIds = new Set(entries.map((item) => item.sampleId).filter(Boolean));
const blockedImages = new Set(entries.map((item) => item.imageUrl).filter(Boolean));
const originalSamples = Array.isArray(manifest.samples) ? manifest.samples : [];
const keptSamples = originalSamples.filter((sample) => !blockedIds.has(sample.sampleId) && !blockedImages.has(sample.imageUrl));
const updatedManifest = {
  ...manifest,
  curatedAt: new Date().toISOString(),
  removedByCuration: originalSamples.length - keptSamples.length,
  samples: keptSamples
};
const blocklist = {
  generatedAt: new Date().toISOString(),
  policy: 'invalid_sample and weak_ocr samples are blocked from gold-set reuse; source URLs are kept for audit.',
  entries
};

await writeFile(blocklistPath, `${JSON.stringify(blocklist, null, 2)}\n`, 'utf8');
await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`, 'utf8');
await writeFile(reportPath, buildMarkdown({
  originalCount: originalSamples.length,
  keptCount: keptSamples.length,
  rejectedCount: rejected.length,
  blocklistCount: entries.length,
  rejected
}), 'utf8');

console.log(JSON.stringify({
  originalCount: originalSamples.length,
  keptCount: keptSamples.length,
  removedNow: originalSamples.length - keptSamples.length,
  blocklistCount: entries.length
}, null, 2));
console.log(`Sample curation report written to ${reportPath}`);

function dedupeEntries(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.sampleId || item.imageUrl || item.sha256;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildMarkdown(input) {
  return `# OCR Sample Curation Report

Generated: ${new Date().toISOString()}

## Summary

- originalSamples: ${input.originalCount}
- keptSamples: ${input.keptCount}
- rejectedThisRun: ${input.rejectedCount}
- blocklistTotal: ${input.blocklistCount}

## Rejected This Run

${input.rejected.map((item) => `- ${item.sampleId} (${item.category}, ${item.role}): ${item.qualityStatus}; reasons ${(item.qualityReasons || []).join(', ') || 'none'}; source ${item.sourceUrl}`).join('\n') || '- none'}

## Next Step

- Run \`npm run ocr:evaluate\` again. If the manifest has fewer than the target samples, it will rebuild from public sources while avoiding blocked samples.
`;
}
