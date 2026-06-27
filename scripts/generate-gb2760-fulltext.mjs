import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const defaultPdfPath = resolve('docs/source-materials/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf');
const pdfPath = process.argv[2] ? resolve(process.argv[2]) : defaultPdfPath;
const outputPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve('backend/src/data/gb2760OfficialFullText.js');

const result = spawnSync('pdftotext', ['-layout', pdfPath, '-'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024
});
if ((!result.stdout || result.stdout.length === 0) && (result.error || result.status !== 0)) {
  throw result.error || new Error(result.stderr || `pdftotext exited with status ${result.status}`);
}
const pdfText = result.stdout;

const pages = pdfText.replace(/\f+$/u, '').split('\f').map((text, index) => {
  const normalizedText = text.replace(/[ \t]+$/gmu, '').trimEnd();
  return {
    id: `gb2760-2024-pdf-page-${String(index + 1).padStart(3, '0')}`,
    pdfPage: index + 1,
    standardPageLabel: detectStandardPageLabel(normalizedText),
    textSha256: createHash('sha256').update(normalizedText, 'utf8').digest('hex'),
    text: normalizedText
  };
});

const fileContent = `import { gb2760OfficialStagingSource } from './gb2760OfficialStaging.js';

export const gb2760OfficialFullTextSource = {
  ...gb2760OfficialStagingSource,
  extractionTool: 'pdftotext -layout (poppler-utils)',
  extractionScope: 'full_pdf_text_by_page',
  generatedAt: '2026-06-13'
};

export const gb2760OfficialFullTextPages = ${JSON.stringify(pages, null, 2)}.map((page) => ({
  ...gb2760OfficialFullTextSource,
  ...page
}));

export function getGb2760OfficialFullTextSummary(pages = gb2760OfficialFullTextPages) {
  const safePages = Array.isArray(pages) ? pages : [];
  return {
    totalPages: safePages.length,
    pdfPages: safePages.map((page) => page.pdfPage),
    textSha256Count: new Set(safePages.map((page) => page.textSha256).filter(Boolean)).size,
    emptyTextPages: safePages.filter((page) => !String(page.text || '').trim()).map((page) => page.pdfPage)
  };
}
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${pages.length} GB 2760 full-text pages at ${outputPath}`);

function detectStandardPageLabel(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= Math.max(0, lines.length - 20); index -= 1) {
    if (/^\d{1,3}$/u.test(lines[index])) return lines[index];
  }
  return '';
}
