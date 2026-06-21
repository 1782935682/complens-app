import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const datasetRoot = join(repoRoot, 'datasets', 'ocr_samples');
const labelsDir = join(datasetRoot, 'labels');
const rawDir = join(datasetRoot, 'raw');
const resultsDir = join(datasetRoot, 'results');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const manifestPath = join(labelsDir, 'samples.json');
const blocklistPath = join(labelsDir, 'blocked-samples.json');
const reportPath = join(reportsDir, 'sample-recovery-report.md');

await mkdir(labelsDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const manifest = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { samples: [] };
const blocklist = await loadBlocklist();
const currentSamples = Array.isArray(manifest.samples) ? manifest.samples : [];
const recoveredSamples = await recoverSamplesFromResults();
const merged = dedupeSamples([
  ...currentSamples,
  ...recoveredSamples
]).filter((sample) => !blocklist.sampleIds.has(sample.sampleId) && !blocklist.imageUrls.has(sample.imageUrl));

const payload = {
  ...manifest,
  recoveredAt: new Date().toISOString(),
  recoveryPolicy: 'Recovered only cached samples whose previous sampleQuality.status was ok. Invalid and weak OCR samples remain blocked.',
  samples: merged
};

await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(reportPath, buildMarkdown({
  previousCount: currentSamples.length,
  recoveredCandidates: recoveredSamples.length,
  finalCount: merged.length,
  summary: summarize(merged)
}), 'utf8');

console.log(JSON.stringify({
  previousCount: currentSamples.length,
  recoveredCandidates: recoveredSamples.length,
  finalCount: merged.length,
  summary: summarize(merged)
}, null, 2));
console.log(`Sample recovery report written to ${reportPath}`);

async function loadBlocklist() {
  if (!existsSync(blocklistPath)) return { sampleIds: new Set(), imageUrls: new Set() };
  const payload = JSON.parse(await readFile(blocklistPath, 'utf8'));
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  return {
    sampleIds: new Set(entries.map((item) => item.sampleId).filter(Boolean)),
    imageUrls: new Set(entries.map((item) => item.imageUrl).filter(Boolean))
  };
}

async function recoverSamplesFromResults() {
  if (!existsSync(resultsDir)) return [];
  const files = (await readdir(resultsDir)).filter((file) => file.endsWith('.json'));
  const recovered = [];
  for (const file of files) {
    try {
      const result = JSON.parse(await readFile(join(resultsDir, file), 'utf8'));
      if (result.sampleQuality?.status !== 'ok') continue;
      if (!result.sampleId || !result.sourceUrl || !result.imageUrl || !result.category || !result.expected) continue;
      const imagePath = result.imagePath || join(rawDir, `${result.sampleId}.jpg`);
      if (!existsSync(imagePath)) continue;
      recovered.push({
        sampleId: result.sampleId,
        sourceUrl: result.sourceUrl,
        imageUrl: result.imageUrl,
        imagePath,
        category: result.category,
        expected: normalizeExpected(result.expected)
      });
    } catch {
      // Ignore corrupt result artifacts; they are not gold-set evidence.
    }
  }
  return recovered;
}

function normalizeExpected(expected) {
  return {
    ingredientsText: String(expected.ingredientsText || ''),
    nutritionText: String(expected.nutritionText || ''),
    productName: String(expected.productName || ''),
    brand: String(expected.brand || ''),
    codeInfo: String(expected.codeInfo || ''),
    otherText: Array.isArray(expected.otherText) ? expected.otherText.map(String) : []
  };
}

function dedupeSamples(samples) {
  const seen = new Set();
  return samples.filter((sample) => {
    const key = `${sample.sampleId}:${sample.imageUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarize(samples) {
  const ingredients = samples.filter((sample) => sample.expected?.ingredientsText).length;
  const nutrition = samples.filter((sample) => sample.expected?.nutritionText).length;
  const front = samples.filter((sample) => /front_or_claims/.test(sample.category)).length;
  const categories = new Set(samples.map((sample) => sample.category).filter(Boolean)).size;
  return {
    total: samples.length,
    ingredients,
    nutrition,
    front,
    categories
  };
}

function buildMarkdown(input) {
  return `# OCR Sample Recovery Report

Generated: ${new Date().toISOString()}

## Summary

- previousManifestSamples: ${input.previousCount}
- recoveredCandidates: ${input.recoveredCandidates}
- finalManifestSamples: ${input.finalCount}
- categories: ${input.summary.categories}
- ingredientsSamples: ${input.summary.ingredients}
- nutritionSamples: ${input.summary.nutrition}
- frontOrClaimSamples: ${input.summary.front}

## Policy

- Recovered only cached samples whose previous \`sampleQuality.status\` was \`ok\`.
- Blocked sample IDs and image URLs remain excluded.
- Product source URLs are retained for audit but do not block other valid images from the same product.
`;
}
