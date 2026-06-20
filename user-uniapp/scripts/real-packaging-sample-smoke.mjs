import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createServer } from 'vite';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = process.env.REAL_PACKAGING_SAMPLE_OUTPUT || join(os.tmpdir(), 'complens-real-packaging-samples');
const imageDir = join(outputDir, 'images');
const reportPath = join(outputDir, 'report.json');
const summaryPath = join(outputDir, 'summary.md');
const shouldFetchImages = process.env.REAL_PACKAGING_SAMPLE_FETCH !== '0';
const ocrServiceUrl = normalizeOcrServiceUrl(process.env.OCR_SMOKE_SERVICE_URL || process.env.OCR_LOCAL_URL || 'http://127.0.0.1:18080');

const attention = {
  primaryGoal: 'daily',
  isChildrenMode: false,
  allergens: [],
  updatedAt: '2026-06-21T00:00:00.000+08:00'
};

const samples = [
  {
    id: 'vita-ingredients',
    product: '维他柠檬味茶饮料',
    role: '配料表',
    expected: 'ingredient',
    sourcePage: 'https://world.openfoodfacts.org/product/4891028706656',
    imageUrl: 'https://images.openfoodfacts.org/images/products/489/102/870/6656/ingredients_zh.9.400.jpg',
    fileName: 'vita_ingredients.jpg'
  },
  {
    id: 'vita-nutrition',
    product: '维他柠檬味茶饮料',
    role: '营养成分表',
    expected: 'nutrition',
    sourcePage: 'https://world.openfoodfacts.org/product/4891028706656',
    imageUrl: 'https://images.openfoodfacts.org/images/products/489/102/870/6656/nutrition_zh.12.400.jpg',
    fileName: 'vita_nutrition.jpg'
  },
  {
    id: 'soy-ingredients',
    product: '海天草菇老抽',
    role: '调味品配料表',
    expected: 'ingredient',
    sourcePage: 'https://world.openfoodfacts.org/product/6902265210504',
    imageUrl: 'https://images.openfoodfacts.org/images/products/690/226/521/0504/ingredients_zh.10.400.jpg',
    fileName: 'soy_ingredients.jpg'
  },
  {
    id: 'curry-ingredients',
    product: '好侍百梦多咖喱',
    role: '长配料表',
    expected: 'ingredient',
    sourcePage: 'https://world.openfoodfacts.org/product/6936749501109',
    imageUrl: 'https://images.openfoodfacts.org/images/products/693/674/950/1109/ingredients_zh.4.400.jpg',
    fileName: 'curry_ingredients.jpg'
  },
  {
    id: 'curry-nutrition',
    product: '好侍百梦多咖喱',
    role: '营养成分表',
    expected: 'nutrition',
    sourcePage: 'https://world.openfoodfacts.org/product/6936749501109',
    imageUrl: 'https://images.openfoodfacts.org/images/products/693/674/950/1109/nutrition_zh.7.400.jpg',
    fileName: 'curry_nutrition.jpg'
  },
  {
    id: 'yogurt-front-claim',
    product: '君乐宝简醇',
    role: '酸奶包装正面声明',
    expected: 'front_claim',
    sourcePage: 'https://world.openfoodfacts.org/product/6922577790068',
    imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/front_zh.3.400.jpg',
    fileName: 'yogurt_front_claim.jpg'
  },
  {
    id: 'yogurt-ingredients',
    product: '君乐宝简醇',
    role: '酸奶配料表',
    expected: 'ingredient',
    sourcePage: 'https://world.openfoodfacts.org/product/6922577790068',
    imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/ingredients_zh.5.400.jpg',
    fileName: 'yogurt_ingredients.jpg'
  },
  {
    id: 'yogurt-nutrition',
    product: '君乐宝简醇',
    role: '酸奶营养成分表',
    expected: 'nutrition',
    sourcePage: 'https://world.openfoodfacts.org/product/6922577790068',
    imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/nutrition_zh.7.400.jpg',
    fileName: 'yogurt_nutrition.jpg'
  },
  {
    id: 'gmw-back-label',
    product: '新闻样本食品背标',
    role: '背标局部',
    expected: 'mixed_or_insufficient',
    sourcePage: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
    imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/7326432166791366016.jpg',
    fileName: 'gmw_back_label.jpg'
  },
  {
    id: 'gmw-date-code',
    product: '新闻样本日期喷码',
    role: '只有喷码日期',
    expected: 'date_code_only',
    sourcePage: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
    imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/2228264118440736172.jpg',
    fileName: 'gmw_date_code.jpg'
  },
  {
    id: 'gmw-front-date',
    product: '新闻样本正面日期',
    role: '正面包装日期',
    expected: 'date_code_only',
    sourcePage: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
    imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/1878967348235225011.jpg',
    fileName: 'gmw_front_date.jpg'
  }
];

await mkdir(imageDir, { recursive: true });

const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: {
    disabled: true,
    entries: []
  },
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  }
});

try {
  const { extractLabelText } = await server.ssrLoadModule('/src/utils/labelTextExtractor.ts');
  const { normalizeOcrResult } = await server.ssrLoadModule('/src/utils/ocrAdapter.ts');
  const { buildLocalLabelAnalysis } = await server.ssrLoadModule('/src/utils/localLabelAnalysis.ts');

  const startedAt = new Date().toISOString();
  const results = [];

  for (const sample of samples) {
    results.push(await runSample(sample, { extractLabelText, normalizeOcrResult, buildLocalLabelAnalysis }));
  }

  const summary = summarizeResults(results);
  const payload = {
    generatedAt: startedAt,
    ocrServiceUrl,
    imageDir,
    sourcePolicy: 'Network images are downloaded to /tmp for smoke testing only; image binaries are not stored in the repo.',
    summary,
    results
  };

  await writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(summaryPath, buildMarkdown(payload), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Real packaging sample report written to ${reportPath}`);
  console.log(`Real packaging sample summary written to ${summaryPath}`);
} finally {
  await server.close();
}

async function runSample(sample, modules) {
  const imagePath = join(imageDir, sample.fileName);
  try {
    await ensureImage(sample, imagePath);
    const imageInfo = await stat(imagePath);
    const ocr = await runOcr(imagePath);
    const ocrBlocks = normalizeBlocks(ocr.blocks);
    const normalized = modules.normalizeOcrResult({
      rawText: String(ocr.rawText || ocr.text || ''),
      text: String(ocr.rawText || ocr.text || ''),
      blocks: ocrBlocks,
      provider: 'rapidocr'
    });
    const extraction = modules.extractLabelText(normalized);
    const ocrResult = {
      mode: 'real',
      text: normalized.rawText,
      confidence: normalizeConfidence(ocr.confidence),
      provider: 'rapidocr',
      blocks: ocrBlocks,
      requiresUserConfirmation: true
    };
    const analysis = modules.buildLocalLabelAnalysis({
      productName: extraction.productNameText,
      foodTypeText: extraction.foodTypeText,
      ingredientText: extraction.ingredientText,
      nutritionText: extraction.nutritionText,
      allergenText: extraction.allergenText,
      frontClaimsText: extraction.frontClaimsText,
      productionDateText: extraction.productionDateText,
      unconfirmedText: extraction.ignoredText,
      confidence: extraction.confidence,
      attention,
      sourceType: 'ocr',
      ocr: ocrResult,
      image: {
        id: `real-sample-${sample.id}`,
        tempFilePath: imagePath,
        name: sample.fileName,
        mimeType: 'image/jpeg',
        size: imageInfo.size,
        storage: 'temp-file'
      }
    });
    const quality = evaluateQuality(sample, extraction, analysis);
    return {
      sample,
      imagePath,
      imageSize: imageInfo.size,
      productName: {
        manifest: sample.product,
        ocr: extraction.productNameText,
        report: analysis.report.productName
      },
      ocr: {
        provider: 'rapidocr',
        confidence: normalizeConfidence(ocr.confidence),
        rawText: normalized.rawText,
        blockCount: ocrBlocks.length
      },
      extraction,
      analysis: summarizeAnalysis(analysis),
      quality
    };
  } catch (error) {
    return {
      sample,
      imagePath,
      imageSize: 0,
      productName: {
        manifest: sample.product,
        ocr: '',
        report: ''
      },
      ocr: {
        provider: 'rapidocr',
        confidence: 0,
        rawText: '',
        blockCount: 0,
        error: error instanceof Error ? error.message : String(error)
      },
      extraction: emptyExtraction(),
      analysis: null,
      quality: {
        state: 'ocr_failed',
        canAutoGenerateReport: false,
        issues: [issue('medium', 'ocr_failed', '该样本 OCR 失败，已记录并继续跑后续样本。')]
      }
    };
  }
}

async function ensureImage(sample, imagePath) {
  if (existsSync(imagePath)) return;
  if (!shouldFetchImages) {
    throw new Error(`Missing sample image ${imagePath}. Re-run with REAL_PACKAGING_SAMPLE_FETCH=1 or download ${sample.imageUrl}`);
  }
  const response = await fetch(sample.imageUrl, {
    headers: {
      'User-Agent': 'CompLensRealPackagingSampleSmoke/1.0'
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${sample.id}: HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(imagePath));
}

async function runOcr(imagePath) {
  const image = await readFile(imagePath);
  const body = new FormData();
  body.append('file', new Blob([image], { type: 'image/jpeg' }), basename(imagePath));
  const response = await fetch(`${ocrServiceUrl}/ocr`, {
    method: 'POST',
    body
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`RapidOCR failed for ${imagePath}: HTTP ${response.status} ${payload?.detail || payload?.error || response.statusText}`);
  }
  return payload || {};
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => {
    const bounds = boundsFromBox(block.box || block.bounds);
    return {
      text: String(block.text || '').trim(),
      confidence: normalizeConfidence(block.confidence),
      ...(bounds || {})
    };
  }).filter((block) => block.text);
}

function boundsFromBox(value) {
  const points = Array.isArray(value?.points) ? value.points : value;
  if (!Array.isArray(points)) return undefined;
  const normalized = points
    .map((point) => Array.isArray(point)
      ? { x: Number(point[0]), y: Number(point[1]) }
      : { x: Number(point?.x), y: Number(point?.y) })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!normalized.length) return undefined;
  const xs = normalized.map((point) => point.x);
  const ys = normalized.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function evaluateQuality(sample, extraction, analysis) {
  const issues = [];
  const hasIngredient = Boolean(extraction.ingredientText.trim());
  const hasNutrition = Boolean(extraction.nutritionText.trim());
  const hasFrontClaim = Boolean(extraction.frontClaimsText.trim());
  const nutritionValues = analysis.nutrition.filter(isNutritionValueField).length;
  const unconfirmedText = extraction.ignoredText || [];
  const lowConfidence = extraction.confidence === 'low';

  if (sample.expected === 'ingredient' && !hasIngredient) {
    issues.push(issue('high', 'expected_ingredient_missing', '样本应识别配料表，但未提取到配料表。'));
  }
  if (sample.expected === 'ingredient' && analysis.ingredients.length < 2) {
    issues.push(issue('medium', 'ingredient_too_short', '配料表样本提取出的配料项少于 2 项，需要检查 OCR 裁切或分段。'));
  }
  if (sample.expected === 'ingredient' && lowConfidence) {
    issues.push(issue('medium', 'ingredient_low_confidence', '配料表提取置信度低，不应自动进入可决策报告。'));
  }
  if (sample.expected === 'ingredient' && /^[,，、;；]/.test(extraction.ingredientText.trim())) {
    issues.push(issue('medium', 'ingredient_fragmented', '配料文本以前导标点开头，说明 OCR 或拼接结果残缺。'));
  }
  if (sample.expected === 'nutrition' && !hasNutrition) {
    issues.push(issue('high', 'expected_nutrition_missing', '样本应识别营养表，但未提取到营养表。'));
  }
  if (sample.expected === 'nutrition' && hasNutrition && nutritionValues < 2) {
    issues.push(issue('medium', 'nutrition_too_sparse', '营养表只解析到很少数字，应进入补拍或手动确认。'));
  }
  if (sample.expected === 'date_code_only' && (hasIngredient || hasNutrition || hasFrontClaim)) {
    issues.push(issue('high', 'date_code_over_interpreted', '只有日期/正面局部的样本不应被当成可完整分析的配料或营养表。'));
  }
  if (sample.expected === 'date_code_only' && !unconfirmedText.length && !extraction.productionDateText) {
    issues.push(issue('medium', 'date_code_not_preserved', '日期喷码未作为确定日期，也没有进入未确认线索。'));
  }
  if (sample.expected === 'front_claim' && !hasFrontClaim && !unconfirmedText.length) {
    issues.push(issue('medium', 'front_claim_not_preserved', '包装正面声明样本没有进入包装声明或未确认线索。'));
  }
  if (sample.expected === 'front_claim' && (hasIngredient || hasNutrition)) {
    issues.push(issue('high', 'front_claim_over_interpreted', '包装正面声明不应被当成完整配料表或营养成分表。'));
  }
  if (sample.expected === 'mixed_or_insufficient' && !hasIngredient && !hasNutrition && !extraction.productionDateText && !unconfirmedText.length) {
    issues.push(issue('medium', 'mixed_sample_lost', '背标局部样本没有保留任何可用字段或未确认线索。'));
  }

  const hasSparseNutrition = sample.expected === 'nutrition' && nutritionValues < 2;
  const ingredientReady = hasIngredient && !lowConfidence;
  const nutritionReady = hasNutrition && nutritionValues >= 2;
  const frontClaimReady = hasFrontClaim && !lowConfidence;
  const shouldAutoReport = (ingredientReady || nutritionReady || frontClaimReady) && !hasSparseNutrition;
  return {
    state: issues.some((item) => item.severity === 'high') ? 'needs_fix' : shouldAutoReport ? 'report_ready' : 'manual_or_retake',
    canAutoGenerateReport: shouldAutoReport && !issues.some((item) => item.code === 'date_code_over_interpreted'),
    issues
  };
}

function issue(severity, code, message) {
  return { severity, code, message };
}

function summarizeAnalysis(analysis) {
  const report = analysis.report;
  return {
    labelType: analysis.labelType,
    confirmedText: analysis.confirmedText,
    ingredientCount: analysis.ingredients.length,
    nutritionValueCount: analysis.nutrition.filter(isNutritionValueField).length,
    report: {
      productName: report.productName,
      summarySentence: report.summarySentence,
      decisionLevel: report.decision?.level || '',
      decisionSummary: report.decision?.summary || '',
      reasons: report.decision?.reasons || [],
      suitableFor: report.decision?.suitableFor || [],
      lessSuitableFor: report.decision?.lessSuitableFor || [],
      nutritionSnapshot: report.nutritionSnapshot || [],
      unknownItems: report.unknownItems || [],
      unconfirmedText: report.analysisSource?.unconfirmedText || []
    }
  };
}

function summarizeResults(results) {
  const issueList = results.flatMap((result) => result.quality.issues.map((item) => ({
    sampleId: result.sample.id,
    ...item
  })));
  return {
    sampleCount: results.length,
    reportReadyCount: results.filter((result) => result.quality.state === 'report_ready').length,
    manualOrRetakeCount: results.filter((result) => result.quality.state === 'manual_or_retake').length,
    ocrFailedCount: results.filter((result) => result.quality.state === 'ocr_failed').length,
    needsFixCount: results.filter((result) => result.quality.state === 'needs_fix').length,
    highIssueCount: issueList.filter((item) => item.severity === 'high').length,
    mediumIssueCount: issueList.filter((item) => item.severity === 'medium').length,
    issues: issueList
  };
}

function buildMarkdown(payload) {
  const rows = payload.results.map((result) => [
    result.sample.id,
    result.sample.role,
    result.quality.state,
    result.ocr.confidence.toFixed(2),
    result.extraction.confidence,
    result.productName?.ocr || '-',
    result.extraction.ingredientText ? 'yes' : 'no',
    result.extraction.nutritionText ? 'yes' : 'no',
    result.extraction.productionDateText || '-',
    result.analysis?.report?.decisionLevel || '-',
    result.quality.issues.map((item) => `${item.severity}:${item.code}`).join('<br>') || '-'
  ].join(' | '));
  const sources = payload.results
    .map((result) => `- ${result.sample.id}: ${result.sample.sourcePage} (${result.sample.imageUrl})`)
    .join('\n');
  const details = payload.results.map((result) => `## ${result.sample.id}

- 角色：${result.sample.role}
- 状态：${result.quality.state}
- 商品名：OCR=${result.productName?.ocr || '-'}；manifest=${result.productName?.manifest || '-'}；报告=${result.productName?.report || '-'}
- OCR 文本：

\`\`\`text
${truncate(result.ocr.rawText, 900)}
\`\`\`

- 提取：配料=${inlineText(result.extraction.ingredientText)}；营养=${inlineText(result.extraction.nutritionText)}；生产日期=${inlineText(result.extraction.productionDateText)}；未确认=${(result.extraction.ignoredText || []).join(' / ') || '-'}
- 报告：${result.analysis?.report?.decisionSummary || result.analysis?.report?.summarySentence || '-'}
`).join('\n');
  return `# 成分镜真实网络包装样本 OCR 回归

生成时间：${payload.generatedAt}

OCR 服务：${payload.ocrServiceUrl}

图片策略：${payload.sourcePolicy}

## 总览

- 样本数：${payload.summary.sampleCount}
- 可生成报告：${payload.summary.reportReadyCount}
- 需要补拍/手动补充：${payload.summary.manualOrRetakeCount}
- OCR 失败但不中断：${payload.summary.ocrFailedCount}
- 需要修复：${payload.summary.needsFixCount}
- 高优先级问题：${payload.summary.highIssueCount}
- 中优先级问题：${payload.summary.mediumIssueCount}

sample | role | state | ocr | extraction | ocrProduct | ingredient | nutrition | productionDate | decision | issues
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
${rows.join('\n')}

## 来源

${sources}

${details}
`;
}

function normalizeOcrServiceUrl(value) {
  return String(value || '').trim().replace(/\/ocr\/?$/u, '').replace(/\/+$/u, '');
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function inlineText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text ? truncate(text, 120) : '-';
}

function isNutritionValueField(field) {
  return !['perUnit', 'servingSize', 'nrvPercent'].includes(field.key) && String(field.value || '').trim();
}

function emptyExtraction() {
  return {
    productNameText: '',
    foodTypeText: '',
    ingredientText: '',
    nutritionText: '',
    allergenText: '',
    frontClaimsText: '',
    productionDateText: '',
    ignoredText: [],
    confidence: 'low',
    sourceType: 'ocr'
  };
}
