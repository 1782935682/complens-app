import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reportJsonPath = join(reportsDir, 'ocr-evaluation-report.json');
const qualityJsonPath = join(reportsDir, 'sample-quality-report.json');
const qualityMdPath = join(reportsDir, 'sample-quality-report.md');

await mkdir(reportsDir, { recursive: true });

if (!existsSync(reportJsonPath)) {
  console.error(`Missing OCR evaluation report: ${reportJsonPath}`);
  process.exit(2);
}

const payload = JSON.parse(await readFile(reportJsonPath, 'utf8'));
const samples = Array.isArray(payload.samples) ? payload.samples : [];
const quality = buildQualityReport(samples, payload.summary?.metrics || {});

await writeFile(qualityJsonPath, `${JSON.stringify(quality, null, 2)}\n`, 'utf8');
await writeFile(qualityMdPath, buildMarkdown(quality), 'utf8');

console.log(JSON.stringify(quality.summary, null, 2));
console.log(`Sample quality report written to ${qualityMdPath}`);

function buildQualityReport(items, metrics) {
  const groups = {
    invalid: [],
    weakOcr: [],
    coreFailures: [],
    corePasses: [],
    nonCore: []
  };
  for (const sample of items) {
    const role = sample.sampleQuality?.role || inferRole(sample);
    const entry = {
      sampleId: sample.sampleId,
      category: sample.category,
      role,
      sourceUrl: sample.sourceUrl,
      imageUrl: sample.imageUrl,
      imagePath: sample.imagePath,
      sha256: sample.sampleQuality?.sha256 || '',
      imageBytes: sample.sampleQuality?.imageBytes || 0,
      qualityStatus: sample.sampleQuality?.status || 'unknown',
      qualityReasons: sample.sampleQuality?.reasons || [],
      detectedType: sample.detectedType || sample.classification?.detectedType || 'unknown',
      reviewStatus: sample.reviewStatus,
      errors: (sample.errors || []).map((error) => error.code),
      ocrLength: String(sample.ocrText || '').length
    };
    if (entry.qualityStatus === 'invalid_sample') groups.invalid.push(entry);
    else if (entry.qualityStatus === 'weak_ocr') groups.weakOcr.push(entry);
    else if (['ingredients', 'nutrition'].includes(role) && sample.reviewStatus === 'pass') groups.corePasses.push(entry);
    else if (['ingredients', 'nutrition'].includes(role)) groups.coreFailures.push(entry);
    else groups.nonCore.push(entry);
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSamples: items.length,
      maturityStage: metrics.maturityStage || 'unknown',
      expansionReady: Boolean(metrics.expansionReady),
      finalTargetSamples: metrics.finalTargetSamples || 500,
      invalidSamples: groups.invalid.length,
      weakOcrSamples: groups.weakOcr.length,
      corePasses: groups.corePasses.length,
      coreFailures: groups.coreFailures.length,
      nonCoreSamples: groups.nonCore.length,
      recommendedGoldAction: groups.invalid.length || groups.weakOcr.length
        ? '先剔除或人工替换 invalid/weak OCR 样本，再扩充同类核心样本。'
        : '当前样本质量可进入核心抽取规则优化。'
    },
    groups
  };
}

function inferRole(sample) {
  if (sample.expected?.ingredientsText) return 'ingredients';
  if (sample.expected?.nutritionText) return 'nutrition';
  if (/front_or_claims/i.test(sample.category || '')) return 'front_or_claims';
  return 'other';
}

function buildMarkdown(report) {
  const { summary, groups } = report;
  return `# OCR Sample Quality Report

Generated: ${report.generatedAt}

## Summary

- totalSamples: ${summary.totalSamples}
- maturityStage: ${summary.maturityStage}
- expansionReady: ${summary.expansionReady ? 'yes' : 'no'}
- finalTargetSamples: ${summary.finalTargetSamples}
- invalidSamples: ${summary.invalidSamples}
- weakOcrSamples: ${summary.weakOcrSamples}
- corePasses: ${summary.corePasses}
- coreFailures: ${summary.coreFailures}
- nonCoreSamples: ${summary.nonCoreSamples}
- recommendedGoldAction: ${summary.recommendedGoldAction}

## Invalid Samples

${formatEntries(groups.invalid)}

## Weak OCR Samples

${formatEntries(groups.weakOcr)}

## Core Failures

${formatEntries(groups.coreFailures.slice(0, 80))}
`;
}

function formatEntries(items) {
  return items.length
    ? items.map((item) => `- ${item.sampleId} (${item.category}, ${item.role}): ${item.errors.join(', ') || 'no_error'}; quality=${item.qualityStatus}; reasons=${item.qualityReasons.join(', ') || 'none'}; ocrLength=${item.ocrLength}; sha256=${item.sha256 || 'missing'}`).join('\n')
    : '- none';
}
