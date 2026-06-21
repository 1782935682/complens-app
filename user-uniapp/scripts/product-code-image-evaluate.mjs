import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const QrCode = require('qrcode-reader');
const execFileAsync = promisify(execFile);

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const samplesDir = join(repoRoot, 'datasets', 'product_code_image_samples');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reportJsonPath = join(reportsDir, 'product-code-image-evaluation-report.json');
const reportMdPath = join(reportsDir, 'product-code-image-evaluation-report.md');
const productCodeJsonPath = join(reportsDir, 'product-code-evaluation-report.json');
const targetCasesPerImageType = Math.max(500, Number(process.env.PRODUCT_CODE_IMAGE_EVAL_TARGET_PER_TYPE || process.env.PRODUCT_CODE_IMAGE_EVAL_TARGET || '500'));

const eanL = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const eanG = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const eanR = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const firstDigitParity = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const parityToFirstDigit = Object.fromEntries(firstDigitParity.map((item, index) => [item, String(index)]));
const lPatterns = Object.fromEntries(eanL.map((item, index) => [item, String(index)]));
const gPatterns = Object.fromEntries(eanG.map((item, index) => [item, String(index)]));
const rPatterns = Object.fromEntries(eanR.map((item, index) => [item, String(index)]));

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
  await mkdir(join(samplesDir, 'barcode'), { recursive: true });
  await mkdir(join(samplesDir, 'qrcode'), { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  const service = await server.ssrLoadModule('/src/services/recognition/barcodeService.ts');
  const environment = {
    qrencodeAvailable: await commandAvailable('qrencode'),
    browserBarcodeDetectorAvailable: typeof globalThis.BarcodeDetector === 'function',
    nativeOcrAvailable: false
  };
  const printedCodeParsing = await readPrintedCodeParsingSummary();
  const cases = [
    ...buildBarcodeCases(targetCasesPerImageType),
    ...buildQrCases(targetCasesPerImageType)
  ];
  const results = [];
  for (const testCase of cases) {
    results.push(await evaluateCase(testCase, service, environment));
    if (results.length % 200 === 0) {
      console.warn(`Product-code image evaluation progress: ${results.length}/${cases.length}`);
    }
  }

  const failed = results.filter((item) => !item.pass);
  const byType = summarizeByType(results);
  const imageAccuracy = ratio(results.length - failed.length, results.length);
  const syntheticImageGatePass = results.length >= targetCasesPerImageType * 2
    && imageAccuracy >= 0.95
    && byType.every((item) => item.total >= targetCasesPerImageType && item.accuracy >= 0.95);
  const printedCodeParsingPass = Boolean(printedCodeParsing?.pass)
    && Number(printedCodeParsing?.printedCode?.total || 0) >= targetCasesPerImageType
    && Number(printedCodeParsing?.printedCode?.accuracy || 0) >= 0.95;
  const summary = {
    totalImageCases: results.length,
    passedImageCases: results.length - failed.length,
    failedImageCases: failed.length,
    imageAccuracy,
    targetCasesPerImageType,
    targetAccuracy: 0.95,
    syntheticImageGatePass,
    printedCodeParsingPass,
    combinedBarcodeQrPrintedGatePass: syntheticImageGatePass && printedCodeParsingPass,
    realDeviceImageGatePass: false,
    byType,
    linkedPrintedCodeParsing: printedCodeParsing
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    scope: '条形码 / 二维码图片级合成样本解码评测，并链接商品数字码 500 解析级门禁',
    activationRule: '食品包装 OCR 500 样本稳定且商品码解析级门禁通过后执行。',
    environment,
    limitations: [
      '本报告使用可重复生成的 PNG 图片样本验证图片级解码链路，不等同于微信真机扫码或真实包装照片验收。',
      '当前 Chromium 环境没有 BarcodeDetector，本脚本使用本地 PNG 读码器验证生成图片；微信小程序原生扫码 Provider 仍需真机补充。',
      '本机 RapidOCR / tesseract 不可用时，包装印刷商品数字码的图片 OCR 不在本报告内声明通过；其 500 门禁继续引用 product-code:evaluate 的文本解析结果。'
    ],
    summary,
    failedCases: failed.slice(0, 80),
    results
  };
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(reportMdPath, buildMarkdown(payload), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Product-code image evaluation report written to ${reportMdPath}`);
  if (!summary.combinedBarcodeQrPrintedGatePass) process.exitCode = 1;
} finally {
  await server.close();
}

async function evaluateCase(testCase, service, environment) {
  try {
    if (testCase.type === 'barcode_image') {
      await writeBarcodePng(testCase.imagePath, testCase.expected.normalizedCode, testCase.format, testCase.variant);
      const decoded = await decodeEanFromPng(testCase.imagePath);
      const detection = decoded ? service.normalizeBarcodeDetection(decoded.code, decoded.format) : undefined;
      const actual = detection ? toActual(detection) : unknownActual();
      return {
        ...testCase,
        actual,
        pass: actual.kind === 'barcode'
          && actual.normalizedCode === testCase.expected.normalizedCode
          && actual.contentType === 'product_code'
      };
    }

    if (!environment.qrencodeAvailable) {
      return {
        ...testCase,
        actual: unknownActual(),
        pass: false,
        errors: ['missing_qrencode']
      };
    }
    await execFileAsync('qrencode', ['-o', testCase.imagePath, '-s', String(testCase.variant.moduleSize), '-m', String(testCase.variant.margin), '-l', testCase.variant.level, testCase.rawValue], { timeout: 5000 });
    const decodedRaw = await decodeQrPng(testCase.imagePath);
    const detection = decodedRaw ? service.normalizeBarcodeDetection(decodedRaw, 'qr_code') : undefined;
    const actual = detection ? toActual(detection) : unknownActual();
    return {
      ...testCase,
      actual,
      pass: actual.kind === 'qrcode'
        && actual.normalizedCode === testCase.expected.normalizedCode
        && actual.contentType === testCase.expected.contentType
    };
  } catch (error) {
    return {
      ...testCase,
      actual: unknownActual(),
      pass: false,
      errors: [String(error?.message || error)]
    };
  }
}

function buildBarcodeCases(target) {
  const cases = [];
  for (let index = 0; index < target; index += 1) {
    const format = index % 5 === 0 ? 'ean_8' : 'ean_13';
    const length = format === 'ean_8' ? 8 : 13;
    const base = format === 'ean_8'
      ? String(2100000 + index).slice(0, 7)
      : String(690500000000 + index).slice(0, 12);
    const code = completeGtin(base, length);
    const variant = barcodeVariant(index);
    cases.push({
      caseId: `barcode-image-${index}`,
      type: 'barcode_image',
      format,
      rawValue: code,
      imagePath: join(samplesDir, 'barcode', `${format}-${index}-${code}.png`),
      variant,
      expected: {
        kind: 'barcode',
        normalizedCode: code,
        contentType: 'product_code'
      }
    });
  }
  return cases;
}

function buildQrCases(target) {
  const cases = [];
  for (let index = 0; index < target; index += 1) {
    const code = completeGtin(String(691600000000 + index).slice(0, 12), 13);
    const mode = index % 5;
    const rawValue = mode === 0
      ? `https://d.l/${code}`
      : mode === 1
        ? `GTIN:${code}`
        : mode === 2
          ? `https://d.l/q?g=${code}&b=${String(index).padStart(4, '0')}`
          : mode === 3
            ? `TRACE-${String(index).padStart(6, '0')}`
            : `PACK-TRACE-${index}`;
    const expected = {
      kind: 'qrcode',
      normalizedCode: mode <= 2 ? code : '',
      contentType: mode === 0 || mode === 2 ? 'url' : mode === 1 ? 'product_code' : 'text'
    };
    cases.push({
      caseId: `qrcode-image-${index}`,
      type: 'qrcode_image',
      format: 'qr_code',
      rawValue,
      imagePath: join(samplesDir, 'qrcode', `qr-${index}.png`),
      variant: qrVariant(index),
      expected
    });
  }
  return cases;
}

async function writeBarcodePng(path, code, format, variant) {
  const bits = format === 'ean_8' ? buildEan8Bits(code) : buildEan13Bits(code);
  const quietModules = variant.quietModules;
  const width = (bits.length + quietModules * 2) * variant.moduleWidth;
  const height = variant.height;
  const png = new PNG({ width, height });
  fillPng(png, variant.background);
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex += 1) {
    if (bits[bitIndex] !== '1') continue;
    drawRect(
      png,
      (quietModules + bitIndex) * variant.moduleWidth,
      variant.topPadding,
      variant.moduleWidth,
      height - variant.topPadding - variant.bottomPadding,
      variant.foreground
    );
  }
  await writeFile(path, PNG.sync.write(png));
}

async function decodeEanFromPng(path) {
  const png = PNG.sync.read(await readFile(path));
  return decodeEan13(png) || decodeEan8(png);
}

function decodeEan13(png) {
  const bits = readModuleBits(png, 95);
  if (!bits || bits.slice(0, 3) !== '101' || bits.slice(45, 50) !== '01010' || bits.slice(92, 95) !== '101') return undefined;
  const leftDigits = [];
  let parity = '';
  for (let index = 0; index < 6; index += 1) {
    const pattern = bits.slice(3 + index * 7, 10 + index * 7);
    const left = decodeLeftPattern(pattern);
    if (!left) return undefined;
    leftDigits.push(left.digit);
    parity += left.parity;
  }
  const first = parityToFirstDigit[parity];
  if (first === undefined) return undefined;
  const rightDigits = [];
  for (let index = 0; index < 6; index += 1) {
    const pattern = bits.slice(50 + index * 7, 57 + index * 7);
    const digit = rPatterns[pattern];
    if (digit === undefined) return undefined;
    rightDigits.push(digit);
  }
  const code = `${first}${leftDigits.join('')}${rightDigits.join('')}`;
  return isValidGtin(code) ? { code, format: 'ean_13' } : undefined;
}

function decodeEan8(png) {
  const bits = readModuleBits(png, 67);
  if (!bits || bits.slice(0, 3) !== '101' || bits.slice(31, 36) !== '01010' || bits.slice(64, 67) !== '101') return undefined;
  const leftDigits = [];
  for (let index = 0; index < 4; index += 1) {
    const pattern = bits.slice(3 + index * 7, 10 + index * 7);
    const digit = lPatterns[pattern];
    if (digit === undefined) return undefined;
    leftDigits.push(digit);
  }
  const rightDigits = [];
  for (let index = 0; index < 4; index += 1) {
    const pattern = bits.slice(36 + index * 7, 43 + index * 7);
    const digit = rPatterns[pattern];
    if (digit === undefined) return undefined;
    rightDigits.push(digit);
  }
  const code = `${leftDigits.join('')}${rightDigits.join('')}`;
  return isValidGtin(code) ? { code, format: 'ean_8' } : undefined;
}

function readModuleBits(png, moduleCount) {
  const scanYs = [0.35, 0.45, 0.55, 0.65].map((ratioValue) => Math.max(0, Math.min(png.height - 1, Math.round(png.height * ratioValue))));
  for (const y of scanYs) {
    const row = [];
    let min = 255;
    let max = 0;
    for (let x = 0; x < png.width; x += 1) {
      const value = luminanceAt(png, x, y);
      row.push(value);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    if (max - min < 30) continue;
    const threshold = (min + max) / 2;
    const binary = row.map((value) => value < threshold);
    const first = binary.findIndex(Boolean);
    const last = binary.length - 1 - [...binary].reverse().findIndex(Boolean);
    if (first < 0 || last <= first) continue;
    const span = last - first + 1;
    const moduleWidth = span / moduleCount;
    if (moduleWidth < 1) continue;
    const bits = Array.from({ length: moduleCount }, (_, index) => {
      const x = Math.max(0, Math.min(png.width - 1, Math.round(first + (index + 0.5) * moduleWidth)));
      return row[x] < threshold ? '1' : '0';
    }).join('');
    if (bits.startsWith('101') && bits.endsWith('101')) return bits;
  }
  return '';
}

function buildEan13Bits(code) {
  const digits = String(code).split('').map(Number);
  const first = digits[0];
  const left = digits.slice(1, 7);
  const right = digits.slice(7);
  const parity = firstDigitParity[first];
  return [
    '101',
    ...left.map((digit, index) => parity[index] === 'L' ? eanL[digit] : eanG[digit]),
    '01010',
    ...right.map((digit) => eanR[digit]),
    '101'
  ].join('');
}

function buildEan8Bits(code) {
  const digits = String(code).split('').map(Number);
  return [
    '101',
    ...digits.slice(0, 4).map((digit) => eanL[digit]),
    '01010',
    ...digits.slice(4).map((digit) => eanR[digit]),
    '101'
  ].join('');
}

function decodeLeftPattern(pattern) {
  if (lPatterns[pattern] !== undefined) return { digit: lPatterns[pattern], parity: 'L' };
  if (gPatterns[pattern] !== undefined) return { digit: gPatterns[pattern], parity: 'G' };
  return undefined;
}

async function decodeQrPng(path) {
  const png = PNG.sync.read(await readFile(path));
  return await new Promise((resolvePromise, reject) => {
    const reader = new QrCode();
    reader.callback = (error, value) => {
      if (error) reject(error);
      else resolvePromise(value?.result || '');
    };
    reader.decode({ width: png.width, height: png.height, data: png.data });
  });
}

async function readPrintedCodeParsingSummary() {
  try {
    const payload = JSON.parse(await readFile(productCodeJsonPath, 'utf8'));
    const printedCode = (payload.summary?.byType || []).find((item) => item.type === 'printed_code');
    return {
      sourceReport: 'reports/ocr/product-code-evaluation-report.json',
      total: payload.summary?.totalCases || 0,
      pass: Boolean(payload.summary?.pass && printedCode?.accuracy >= 0.95),
      printedCode: printedCode || { type: 'printed_code', total: 0, passed: 0, failed: 0, accuracy: 0 }
    };
  } catch {
    return {
      sourceReport: 'reports/ocr/product-code-evaluation-report.json',
      total: 0,
      pass: false,
      printedCode: { type: 'printed_code', total: 0, passed: 0, failed: 0, accuracy: 0 }
    };
  }
}

async function commandAvailable(command) {
  try {
    await execFileAsync(command, ['--version'], { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function summarizeByType(results) {
  return ['barcode_image', 'qrcode_image'].map((type) => {
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

function barcodeVariant(index) {
  return {
    moduleWidth: 2 + (index % 4),
    quietModules: 10 + (index % 3),
    height: 92 + (index % 5) * 8,
    topPadding: 8 + (index % 4),
    bottomPadding: 12 + (index % 3),
    foreground: index % 7 === 0 ? 35 : 0,
    background: index % 7 === 0 ? 238 : 255
  };
}

function qrVariant(index) {
  return {
    moduleSize: 5 + (index % 2),
    margin: 4,
    level: index % 3 === 0 ? 'M' : 'L'
  };
}

function completeGtin(base, length) {
  const digits = String(base).replace(/\D/g, '').padStart(length - 1, '0').slice(0, length - 1);
  const reversed = digits.split('').map(Number).reverse();
  const sum = reversed.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return `${digits}${check}`;
}

function isValidGtin(value) {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(value)) return false;
  const digits = value.split('').map((item) => Number(item));
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function ratio(numerator, denominator) {
  if (!denominator) return 1;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function toActual(detection) {
  return {
    kind: detection.kind,
    normalizedCode: detection.normalizedCode,
    contentType: detection.contentType
  };
}

function unknownActual() {
  return {
    kind: 'unknown',
    normalizedCode: '',
    contentType: 'unknown'
  };
}

function fillPng(png, value) {
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = value;
    png.data[index + 1] = value;
    png.data[index + 2] = value;
    png.data[index + 3] = 255;
  }
}

function drawRect(png, x, y, width, height, value) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const index = (row * png.width + column) * 4;
      png.data[index] = value;
      png.data[index + 1] = value;
      png.data[index + 2] = value;
      png.data[index + 3] = 255;
    }
  }
}

function luminanceAt(png, x, y) {
  const index = (y * png.width + x) * 4;
  return Math.round((png.data[index] + png.data[index + 1] + png.data[index + 2]) / 3);
}

function buildMarkdown(payload) {
  const { summary } = payload;
  return `# Product Code Image-Level Evaluation

Generated: ${payload.generatedAt}

Scope: ${payload.scope}

Activation: ${payload.activationRule}

## Metrics

- totalImageCases: ${summary.totalImageCases}
- passedImageCases: ${summary.passedImageCases}
- failedImageCases: ${summary.failedImageCases}
- imageAccuracy: ${formatPercent(summary.imageAccuracy)}
- targetCasesPerImageType: ${summary.targetCasesPerImageType}
- targetAccuracy: ${formatPercent(summary.targetAccuracy)}
- syntheticImageGatePass: ${summary.syntheticImageGatePass ? 'yes' : 'no'}
- printedCodeParsingPass: ${summary.printedCodeParsingPass ? 'yes' : 'no'}
- combinedBarcodeQrPrintedGatePass: ${summary.combinedBarcodeQrPrintedGatePass ? 'yes' : 'no'}
- realDeviceImageGatePass: ${summary.realDeviceImageGatePass ? 'yes' : 'no'}

## By Image Type

${summary.byType.map((item) => `- ${item.type}: ${item.passed}/${item.total}, accuracy ${formatPercent(item.accuracy)}`).join('\n')}

## Linked Printed Code Parsing

- sourceReport: ${summary.linkedPrintedCodeParsing.sourceReport}
- printed_code: ${summary.linkedPrintedCodeParsing.printedCode.passed}/${summary.linkedPrintedCodeParsing.printedCode.total}, accuracy ${formatPercent(summary.linkedPrintedCodeParsing.printedCode.accuracy)}

## Environment

- qrencodeAvailable: ${payload.environment.qrencodeAvailable ? 'yes' : 'no'}
- browserBarcodeDetectorAvailable: ${payload.environment.browserBarcodeDetectorAvailable ? 'yes' : 'no'}
- nativeOcrAvailable: ${payload.environment.nativeOcrAvailable ? 'yes' : 'no'}

## Limitations

${payload.limitations.map((item) => `- ${item}`).join('\n')}

## Failed Cases

${payload.failedCases.map((item) => `- ${item.caseId}: expected ${JSON.stringify(item.expected)}, actual ${JSON.stringify(item.actual)}, errors ${JSON.stringify(item.errors || [])}`).join('\n') || '- none'}
`;
}
