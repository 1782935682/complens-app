import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reportJsonPath = join(reportsDir, 'product-code-evaluation-report.json');
const reportMdPath = join(reportsDir, 'product-code-evaluation-report.md');
const targetCasesPerType = Math.max(500, Number(process.env.PRODUCT_CODE_EVAL_TARGET_PER_TYPE || process.env.PRODUCT_CODE_EVAL_TARGET || '500'));

await mkdir(reportsDir, { recursive: true });

const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { disabled: true, entries: [] },
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  }
});

try {
  const service = await server.ssrLoadModule('/src/services/recognition/barcodeService.ts');
  const cases = buildEvaluationCases(targetCasesPerType);
  const results = cases.map((item) => evaluateCase(item, service));
  const failed = results.filter((item) => !item.pass);
  const byType = summarizeByType(results);
  const accuracy = ratio(results.length - failed.length, results.length);
  const summary = {
    totalCases: results.length,
    passedCases: results.length - failed.length,
    failedCases: failed.length,
    accuracy,
    targetCasesPerType,
    targetTotalCases: targetCasesPerType * 3,
    targetAccuracy: 0.95,
    pass: results.length >= targetCasesPerType * 3
      && accuracy >= 0.95
      && byType.every((item) => item.total >= targetCasesPerType && item.accuracy >= 0.95),
    byType
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    scope: '二维码 / 条形码 / 商品数字码解析与分类评测',
    limitation: '当前命令评测扫码结果解析、二维码内容分类和印刷数字编码提取；图片级扫码识别需在浏览器 BarcodeDetector、小程序扫码能力或真机环境中补充。',
    activationRule: '必须在食品包装 OCR 分区 500 样本稳定 95% 后，作为下一阶段上线门禁执行。',
    summary,
    failedCases: failed.slice(0, 80),
    results
  };
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(reportMdPath, buildMarkdown(payload), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Product code evaluation report written to ${reportMdPath}`);
  if (!summary.pass) process.exitCode = 1;
} finally {
  await server.close();
}

function buildEvaluationCases(targetPerType) {
  const cases = [];
  const barcodeTarget = targetPerType;
  const qrcodeTarget = targetPerType;
  const printedTarget = targetPerType;
  const barcodeFormats = ['ean_13', 'ean_8', 'upc_a', 'code_128'];
  for (let index = 0; index < barcodeTarget; index += 1) {
    const format = barcodeFormats[index % barcodeFormats.length];
    const code = format === 'ean_8'
      ? completeGtin(String(2000000 + index).slice(0, 7), 8)
      : format === 'upc_a'
        ? completeGtin(String(30000000000 + index).slice(0, 11), 12)
        : completeGtin(String(690100000000 + index).slice(0, 12), 13);
    cases.push({
      caseId: `barcode-${cases.length}`,
      type: 'barcode',
      rawValue: index % 5 === 0 ? `GTIN ${code}` : code,
      format,
      expected: {
        kind: 'barcode',
        normalizedCode: code,
        contentType: 'product_code'
      }
    });
  }

  for (let index = 0; index < qrcodeTarget; index += 1) {
    const code = completeGtin(String(691200000000 + index).slice(0, 12), 13);
    const mode = index % 4;
    const rawValue = mode === 0
      ? `https://example.com/product/${code}?utm_source=pack`
      : mode === 1
        ? `商品码:${code}`
        : mode === 2
          ? `TRACE-${String(index).padStart(6, '0')}`
          : `包装溯源文本 ${index}`;
    cases.push({
      caseId: `qrcode-${index}`,
      type: 'qrcode',
      rawValue,
      format: 'qr_code',
      expected: {
        kind: 'qrcode',
        normalizedCode: mode <= 1 ? code : '',
        contentType: mode === 0 ? 'url' : mode === 1 ? 'product_code' : 'text'
      }
    });
  }

  for (let index = 0; index < printedTarget; index += 1) {
    const length = index % 3 === 0 ? 8 : index % 3 === 1 ? 12 : 13;
    const base = length === 8
      ? String(4000000 + index).slice(0, 7)
      : length === 12
        ? String(50000000000 + index).slice(0, 11)
        : String(692300000000 + index).slice(0, 12);
    const code = completeGtin(base, length);
    cases.push({
      caseId: `printed-code-${index}`,
      type: 'printed_code',
      rawValue: index % 4 === 0
        ? `商品条码：${code.slice(0, 4)} ${code.slice(4, 8)} ${code.slice(8)}`
        : index % 4 === 1
          ? `EAN ${code}`
          : index % 4 === 2
            ? `包装喷码 LOT20260621 ${code} EXP202712`
            : code,
      format: 'printed_text',
      expected: {
        kind: 'printed_code',
        normalizedCode: code,
        contentType: 'product_code'
      }
    });
  }

  return cases;
}

function evaluateCase(testCase, service) {
  if (testCase.type === 'printed_code') {
    const actualCode = service.extractPrintedProductCode(testCase.rawValue);
    return {
      ...testCase,
      actual: {
        kind: 'printed_code',
        normalizedCode: actualCode,
        contentType: actualCode ? 'product_code' : 'unknown'
      },
      pass: actualCode === testCase.expected.normalizedCode
    };
  }

  const detection = service.normalizeBarcodeDetection(testCase.rawValue, testCase.format);
  const actual = detection ? {
    kind: detection.kind,
    normalizedCode: detection.normalizedCode,
    contentType: detection.contentType
  } : {
    kind: 'unknown',
    normalizedCode: '',
    contentType: 'unknown'
  };
  return {
    ...testCase,
    actual,
    pass: actual.kind === testCase.expected.kind
      && actual.normalizedCode === testCase.expected.normalizedCode
      && actual.contentType === testCase.expected.contentType
  };
}

function summarizeByType(results) {
  return ['barcode', 'qrcode', 'printed_code'].map((type) => {
    const items = results.filter((item) => item.type === type);
    const passed = items.filter((item) => item.pass).length;
    return {
      type,
      total: items.length,
      passed,
      failed: items.length - passed,
      accuracy: ratio(passed, items.length)
    };
  });
}

function completeGtin(base, length) {
  const digits = String(base).replace(/\D/g, '').padStart(length - 1, '0').slice(0, length - 1);
  const reversed = digits.split('').map(Number).reverse();
  const sum = reversed.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return `${digits}${check}`;
}

function ratio(numerator, denominator) {
  if (!denominator) return 1;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function buildMarkdown(payload) {
  const { summary } = payload;
  return `# Product Code Recognition Evaluation

Generated: ${payload.generatedAt}

Scope: ${payload.scope}

Activation: ${payload.activationRule}

Limitation: ${payload.limitation}

## Metrics

- totalCases: ${summary.totalCases}
- passedCases: ${summary.passedCases}
- failedCases: ${summary.failedCases}
- accuracy: ${formatPercent(summary.accuracy)}
- targetCasesPerType: ${summary.targetCasesPerType}
- targetTotalCases: ${summary.targetTotalCases}
- targetAccuracy: ${formatPercent(summary.targetAccuracy)}
- pass: ${summary.pass ? 'yes' : 'no'}

## By Type

${summary.byType.map((item) => `- ${item.type}: ${item.passed}/${item.total}, accuracy ${formatPercent(item.accuracy)}`).join('\n')}

## Failed Cases

${payload.failedCases.map((item) => `- ${item.caseId}: expected ${JSON.stringify(item.expected)}, actual ${JSON.stringify(item.actual)}`).join('\n') || '- none'}
`;
}
