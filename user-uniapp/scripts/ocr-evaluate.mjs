import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { reviewOcrSampleWithProviders, summarizeAiReviews } from './ocr/aiReviewService.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const datasetRoot = join(repoRoot, 'datasets', 'ocr_samples');
const rawDir = join(datasetRoot, 'raw');
const ocrTextDir = join(datasetRoot, 'ocr_text');
const labelsDir = join(datasetRoot, 'labels');
const resultsDir = join(datasetRoot, 'results');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const reviewReportsDir = join(repoRoot, 'reports', 'ocr_reviews');
const manifestPath = join(labelsDir, 'samples.json');
const reportJsonPath = join(reportsDir, 'ocr-evaluation-report.json');
const reportMdPath = join(reportsDir, 'ocr-evaluation-report.md');
const reviewSummaryPath = join(reviewReportsDir, 'ocr-review-summary.md');
const chatgptSubagentReviewPath = join(reviewReportsDir, 'chatgpt-subagent-review.json');
const finalReportPath = join(reportsDir, 'final-ocr-maturity-report.md');
const sampleCacheJsonPath = join(reportsDir, 'sample-cache-report.json');
const sampleCacheMdPath = join(reportsDir, 'sample-cache-report.md');
const sampleCacheFailuresPath = join(labelsDir, 'sample-cache-failures.json');
const sampleBlocklistPath = join(labelsDir, 'blocked-samples.json');
const ocrServiceUrl = normalizeOcrServiceUrl(process.env.OCR_SMOKE_SERVICE_URL || process.env.OCR_LOCAL_URL || 'http://127.0.0.1:18080');
const targetSamples = Number(process.env.OCR_EVAL_TARGET || '100');
const reviewLimit = Number(process.env.OCR_EVAL_REVIEW_LIMIT || '8');
const ocrRequestTimeoutMs = Number(process.env.OCR_EVAL_OCR_TIMEOUT_MS || '20000');
const hasAnyAiReviewKey = Boolean(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY);
const reviewSampleLimit = hasAnyAiReviewKey ? reviewLimit : targetSamples;
const refreshSamples = process.env.OCR_EVAL_REFRESH_SAMPLES === '1';
const disableNetworkSamples = process.env.OCR_EVAL_DISABLE_NETWORK_SAMPLES === '1';
const cacheOnly = process.env.OCR_EVAL_CACHE_ONLY === '1' || process.argv.includes('--cache-only');
const imageDownloadTimeoutMs = Number(process.env.OCR_EVAL_IMAGE_TIMEOUT_MS || '12000');
const sampleFetchTimeoutMs = Number(process.env.OCR_EVAL_SAMPLE_FETCH_TIMEOUT_MS || '15000');
const sampleFetchDelayMs = Number(process.env.OCR_EVAL_SAMPLE_FETCH_DELAY_MS || (cacheOnly ? '750' : '6500'));
const maxCacheRounds = Number(process.env.OCR_EVAL_CACHE_MAX_ROUNDS || '10');
const minCachedImageBytes = Number(process.env.OCR_EVAL_MIN_IMAGE_BYTES || '5000');
const tryOriginalOpenFoodFactsImageHost = process.env.OCR_EVAL_TRY_ORIGINAL_IMAGE_HOST === '1';
const userAgent = 'CompLensOcrEvaluation/1.0 (local maturity evaluation; contact: local)';
const sampleFetchErrors = [];

const openFoodFactsSampleQueries = [
  { bucket: 'off_ingredients_selected', pageSize: 24, pages: 4, legacy: true, params: { tagtype_0: 'states', tag_contains_0: 'contains', tag_0: 'ingredients-photo-selected' } },
  { bucket: 'off_nutrition_selected', pageSize: 24, pages: 4, legacy: true, params: { tagtype_0: 'states', tag_contains_0: 'contains', tag_0: 'nutrition-photo-selected' } },
  { bucket: 'beverage', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'categories', tag_contains_0: 'contains', tag_0: 'beverages' } },
  { bucket: 'dairy_yogurt', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'categories', tag_contains_0: 'contains', tag_0: 'dairies' } },
  { bucket: 'biscuits_bread', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'categories', tag_contains_0: 'contains', tag_0: 'biscuits-and-cakes' } },
  { bucket: 'puffed_snack', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'categories', tag_contains_0: 'contains', tag_0: 'snacks' } },
  { bucket: 'instant_noodle', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'instant noodles' } },
  { bucket: 'condiment', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'categories', tag_contains_0: 'contains', tag_0: 'condiments' } },
  { bucket: 'frozen_food', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'frozen food' } },
  { bucket: 'children_food', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'baby food' } },
  { bucket: 'imported_food', pageSize: 18, pages: 2, legacy: true, params: { tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: 'france' } },
  { bucket: 'mixed_language', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'milk' } },
  { bucket: 'breakfast_cereal', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'breakfast cereal' } },
  { bucket: 'chocolate', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'chocolate' } },
  { bucket: 'candy', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'candy sweets' } },
  { bucket: 'pasta', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'pasta noodles' } },
  { bucket: 'sauce', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'tomato sauce' } },
  { bucket: 'cheese', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'cheese' } },
  { bucket: 'ice_cream', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'ice cream' } },
  { bucket: 'soup', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'soup' } },
  { bucket: 'coffee_tea', pageSize: 18, pages: 2, legacy: true, params: { search_terms: 'coffee tea' } }
];

const ocrCategoryRules = [
  { category: 'beverage', pattern: /beverage|drink|tea|juice|soda|water|饮料|茶|果汁/ },
  { category: 'dairy_yogurt', pattern: /dairy|milk|yogurt|cheese|牛奶|酸奶|乳/ },
  { category: 'biscuits_bread', pattern: /biscuit|cookie|bread|cake|cracker|饼干|面包|蛋糕/ },
  { category: 'puffed_snack', pattern: /snack|crisps|chips|puffed|膨化|薯片|零食/ },
  { category: 'instant_noodle', pattern: /noodle|ramen|方便面|面/ },
  { category: 'condiment', pattern: /condiment|sauce|soy|vinegar|seasoning|调味|酱油|醋|酱/ },
  { category: 'frozen_food', pattern: /frozen|速冻|冷冻/ },
  { category: 'children_food', pattern: /baby|infant|children|kids|儿童|婴幼儿|婴儿/ },
  { category: 'imported_food', pattern: /france|united states|germany|italy|spain|imported|进口/ },
  { category: 'mixed_language', pattern: /english|zh|milk|chocolate|coffee/ }
];

const attention = {
  primaryGoal: 'daily',
  isChildrenMode: false,
  allergens: [],
  updatedAt: '2026-06-21T00:00:00.000+08:00'
};

await ensureDirs();

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
  const startedAt = new Date().toISOString();
  const samples = await loadOrBuildSampleManifest();
  const activeSamples = samples.slice(0, targetSamples);
  if (cacheOnly) {
    const cachePayload = await cacheSamplesUntilTarget(samples, targetSamples, startedAt);
    await writeSampleCacheReports(cachePayload);
    console.log(JSON.stringify({
      targetSamples: cachePayload.targetSamples,
      manifestSamples: cachePayload.manifestSamples,
      cachedSamples: cachePayload.cachedSamples,
      failedSamples: cachePayload.failedSamples,
      categoryCount: cachePayload.categoryCount,
      reachedTarget: cachePayload.reachedTarget
    }, null, 2));
    console.log(`Sample cache report written to ${sampleCacheMdPath}`);
    if (!cachePayload.reachedTarget) process.exitCode = 1;
  } else {
    const modules = await loadModules(server);
    const health = await checkOcrHealth();
    if (!health.ok) {
      await writeBlockedReports({
        startedAt,
        samples: activeSamples,
        blocker: health.error || 'ocr_service_unreachable'
      });
      console.error(`OCR evaluation blocked: ${health.error}`);
      process.exit(2);
    }

    const results = [];
    const aiReviews = [];
    let evaluatedCount = 0;
    for (const sample of activeSamples) {
      evaluatedCount += 1;
      const result = await evaluateNetworkSample(sample, modules);
      results.push(result);
      await writeFile(join(resultsDir, `${sample.sampleId}.json`), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
      await writeFile(join(ocrTextDir, `${sample.sampleId}.txt`), `${result.ocrText}\n`, 'utf8');

      if (aiReviews.length < reviewSampleLimit * 2) {
        const reviewResults = await reviewOcrSampleWithProviders(result);
        aiReviews.push(...reviewResults.map((review) => ({ sampleId: sample.sampleId, ...review })));
      }
      if (evaluatedCount % 25 === 0 || evaluatedCount === activeSamples.length) {
        console.warn(`OCR evaluation progress: ${evaluatedCount}/${activeSamples.length}`);
      }
    }

    const chatgptSubagentReview = process.env.OCR_EVAL_INCLUDE_CHATGPT_SUBAGENT === '1'
      ? await readChatgptSubagentReview()
      : null;
    if (chatgptSubagentReview) aiReviews.push(chatgptSubagentReview);
    const reviewScores = {
      chatgpt: aiReviews.filter((review) => ['chatgpt', 'chatgpt-subagent'].includes(review.provider) && !review.skipped && !review.pendingSubagentReview).map((review) => review.score),
      deepseek: aiReviews.filter((review) => review.provider === 'deepseek' && !review.skipped).map((review) => review.score)
    };
    const aiReviewSummaryWithExternal = summarizeAiReviews(aiReviews);
    const summary = modules.summarizeEvaluation(results, reviewScores);
    const payload = {
      generatedAt: startedAt,
      sourcePolicy: {
        primarySource: 'Open Food Facts public API and product image URLs',
        imageStorage: 'Image binaries are cached under datasets/ocr_samples/raw/ and ignored by git.',
        sourceUrl: 'https://openfoodfacts.github.io/openfoodfacts-server/api/'
      },
      ocrServiceUrl,
      targetSamples,
      sampleCount: activeSamples.length,
      sampleFetchErrors,
      samples: results,
      summary,
      aiReviews,
      aiReviewSummary: aiReviewSummaryWithExternal
    };

    await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeFile(reportMdPath, buildEvaluationMarkdown(payload), 'utf8');
    await writeFile(reviewSummaryPath, buildReviewMarkdown(aiReviewSummaryWithExternal, aiReviews), 'utf8');
    await writeFile(finalReportPath, buildFinalMaturityReport(payload), 'utf8');

    console.log(JSON.stringify(summary.metrics, null, 2));
    console.log(`OCR evaluation report written to ${reportMdPath}`);
    console.log(`AI review summary written to ${reviewSummaryPath}`);
    console.log(`Final maturity report written to ${finalReportPath}`);
    if (!summary.metrics.acceptancePass) process.exitCode = 1;
  }
} finally {
  await server.close();
}

async function loadModules(viteServer) {
  const evaluation = await viteServer.ssrLoadModule('/src/services/ocr/ocrEvaluationService.ts');
  const ocrAdapter = await viteServer.ssrLoadModule('/src/utils/ocrAdapter.ts');
  const localAnalysis = await viteServer.ssrLoadModule('/src/utils/localLabelAnalysis.ts');
  return {
    ...evaluation,
    normalizeOcrResult: ocrAdapter.normalizeOcrResult,
    buildLocalLabelAnalysis: localAnalysis.buildLocalLabelAnalysis
  };
}

async function readChatgptSubagentReview() {
  if (!existsSync(chatgptSubagentReviewPath)) return null;
  try {
    const review = JSON.parse(await readFile(chatgptSubagentReviewPath, 'utf8'));
    return {
      sampleId: 'overall',
      provider: 'chatgpt-subagent',
      pass: Boolean(review.pass),
      score: Number(review.score) || 0,
      issues: Array.isArray(review.issues) ? review.issues.map(String) : [],
      suggestions: Array.isArray(review.suggestions) ? review.suggestions.map(String) : [],
      riskLevel: ['low', 'medium', 'high'].includes(review.riskLevel) ? review.riskLevel : 'medium',
      skipped: false,
      externalReview: true,
      aiOptimizationDecision: review.aiOptimizationDecision && typeof review.aiOptimizationDecision === 'object' ? review.aiOptimizationDecision : null,
      launchReadiness: review.launchReadiness ? String(review.launchReadiness) : ''
    };
  } catch (error) {
    return {
      sampleId: 'overall',
      provider: 'chatgpt-subagent',
      pass: false,
      score: 0,
      issues: [`failed_to_read_subagent_review:${error instanceof Error ? error.message : String(error)}`],
      suggestions: [],
      riskLevel: 'medium',
      skipped: false,
      externalReview: true
    };
  }
}

async function ensureDirs() {
  await Promise.all([rawDir, ocrTextDir, labelsDir, resultsDir, reportsDir, reviewReportsDir].map((dir) => mkdir(dir, { recursive: true })));
}

async function loadOrBuildSampleManifest() {
  const blocklist = await loadSampleBlocklist();
  let filteredExistingSamples = [];
  if (!refreshSamples && existsSync(manifestPath)) {
    const existing = JSON.parse(await readFile(manifestPath, 'utf8'));
    filteredExistingSamples = Array.isArray(existing.samples)
      ? filterBlockedSamples(existing.samples, blocklist).map(normalizeSampleExpectedForEvaluation)
      : [];
    if (hasMinimumManifestCoverage(filteredExistingSamples, targetSamples)) {
      return filteredExistingSamples;
    }
  }
  if (disableNetworkSamples) {
    sampleFetchErrors.push({
      bucket: 'network_samples_disabled',
      page: 0,
      message: `network sample refresh disabled; evaluating existing filtered samples=${filteredExistingSamples.length}`
    });
    return filteredExistingSamples;
  }
  const samples = (await buildOpenFoodFactsSamples(targetSamples, blocklist)).map(normalizeSampleExpectedForEvaluation);
  if (!hasMinimumManifestCoverage(samples, targetSamples)) {
    sampleFetchErrors.push({
      bucket: 'manifest_quality_gate',
      page: 0,
      message: `candidate manifest rejected: samples=${samples.length}, ingredients=${countMatchingSamples(samples, /:ingredients$/)}, nutrition=${countMatchingSamples(samples, /:nutrition$/)}`
    });
    await writeFile(join(labelsDir, 'samples.rejected.json'), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      reason: 'candidate manifest failed minimum coverage gate',
      targetSamples,
      samples
    }, null, 2)}\n`, 'utf8');
    if (filteredExistingSamples.length) return filteredExistingSamples;
    return samples;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Open Food Facts API and public product image URLs',
    sourceDocs: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
    targetSamples,
    samples
  };
  await writeSampleManifest(samples, payload);
  return samples;
}

function hasMinimumManifestCoverage(samples, target) {
  if (!Array.isArray(samples) || !samples.length) return false;
  const requiredTotal = Math.max(1, target);
  return samples.length >= requiredTotal
    && new Set(samples.map((sample) => sample.category).filter(Boolean)).size >= 10
    && countMatchingSamples(samples, /:ingredients$/) >= 20
    && countMatchingSamples(samples, /:nutrition$/) >= 20;
}

async function writeSampleManifest(samples, overrides = {}) {
  const normalizedSamples = samples.map(normalizeSampleExpectedForEvaluation);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'Open Food Facts API and public product image URLs',
    sourceDocs: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
    targetSamples,
    ...overrides,
    samples: normalizedSamples
  };
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function countMatchingSamples(samples, pattern) {
  return samples.filter((sample) => pattern.test(sample.category)).length;
}

async function buildOpenFoodFactsSamples(target, blocklist = { sampleIds: new Set(), imageUrls: new Set() }) {
  const products = new Map();
  for (const query of scaledSampleQueries(target)) {
    const pages = Math.max(1, Number(query.pages || 1));
    for (let page = 1; page <= pages; page += 1) {
      try {
        const fetched = await fetchOpenFoodFactsProducts(query, page);
        fetched.forEach((product) => products.set(product.code, { ...product, queryBucket: query.bucket }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sampleFetchErrors.push({ bucket: query.bucket, page, message });
        console.warn(`Sample source skipped: ${query.bucket} page ${page}: ${message}`);
      }
      if (page < pages) await delay(sampleFetchDelayMs);
    }
    await delay(sampleFetchDelayMs);
  }

  const samples = [];
  for (const product of products.values()) {
    const base = buildExpectedBase(product);
    const sourceUrl = `https://world.openfoodfacts.org/product/${product.code}`;
    const bucket = categorizeProduct(product);
    const ingredientImageUrl = selectImage(product, 'ingredients');
    const nutritionImageUrl = selectImage(product, 'nutrition');
    const frontImageUrl = selectImage(product, 'front') || product.image_url;
    if (ingredientImageUrl && isUsableExpectedIngredients(base.expected.ingredientsText)) {
      samples.push(buildSample(product, {
        role: 'ingredients',
        category: `${bucket}:ingredients`,
        imageUrl: ingredientImageUrl,
        sourceUrl,
        expected: expectedForRole(base.expected, 'ingredients')
      }));
    }
    if (nutritionImageUrl && isUsableExpectedNutrition(base.expected.nutritionText)) {
      samples.push(buildSample(product, {
        role: 'nutrition',
        category: `${bucket}:nutrition`,
        imageUrl: nutritionImageUrl,
        sourceUrl,
        expected: expectedForRole(base.expected, 'nutrition')
      }));
    }
    if (frontImageUrl) {
      samples.push(buildSample(product, {
        role: 'front',
        category: `${bucket}:front_or_claims`,
        imageUrl: frontImageUrl,
        sourceUrl,
        expected: expectedForRole(base.expected, 'front')
      }));
    }
    if (samples.length >= target) break;
  }
  return selectBalancedSamples(filterBlockedSamples(dedupeSamples([...knownNetworkSamples(), ...samples]), blocklist), target);
}

async function loadSampleBlocklist() {
  if (!existsSync(sampleBlocklistPath)) {
    return { sampleIds: new Set(), imageUrls: new Set() };
  }
  try {
    const payload = JSON.parse(await readFile(sampleBlocklistPath, 'utf8'));
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    return {
      sampleIds: new Set(entries.map((item) => item.sampleId).filter(Boolean)),
      imageUrls: new Set(entries.map((item) => item.imageUrl).filter(Boolean))
    };
  } catch {
    return { sampleIds: new Set(), imageUrls: new Set() };
  }
}

function filterBlockedSamples(samples, blocklist) {
  return samples.filter((sample) => !blocklist.sampleIds.has(sample.sampleId)
    && !blocklist.imageUrls.has(sample.imageUrl));
}

function scaledSampleQueries(target) {
  const multiplier = cacheOnly ? 1 : target >= 500 ? 4 : target >= 250 ? 2 : 1;
  return openFoodFactsSampleQueries.map((query) => ({
    ...query,
    pageSize: target >= 500 ? Math.min(50, Math.max(query.pageSize, 36)) : query.pageSize,
    pages: Math.max(1, query.pages * multiplier)
  }));
}

async function fetchOpenFoodFactsProducts(query, page = 1) {
  const url = new URL(query.legacy ? 'https://world.openfoodfacts.org/cgi/search.pl' : 'https://world.openfoodfacts.org/api/v2/search');
  if (query.legacy) {
    url.searchParams.set('action', 'process');
    url.searchParams.set('json', '1');
  }
  url.searchParams.set('page_size', String(query.pageSize || 25));
  url.searchParams.set('page', String(page));
  url.searchParams.set('sort_by', 'last_modified_t');
  url.searchParams.set('fields', [
    'code',
    'product_name',
    'product_name_zh',
    'brands',
    'quantity',
    'categories_tags',
    'categories_tags_en',
    'countries_tags_en',
    'ingredients_text',
    'ingredients_text_zh',
    'image_url',
    'image_front_url',
    'image_ingredients_url',
    'image_nutrition_url',
    'selected_images',
    'images',
    'nutriments'
  ].join(','));
  Object.entries(query.params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(sampleFetchTimeoutMs)
  });
  if (!response.ok) throw new Error(`Open Food Facts search failed ${response.status} for ${query.bucket}`);
  const payload = await response.json();
  return Array.isArray(payload.products) ? payload.products.filter((product) => product.code) : [];
}

function buildExpectedBase(product) {
  const nutritionText = buildExpectedNutritionText(product.nutriments || {});
  return {
    expected: {
      ingredientsText: clean(product.ingredients_text_zh || product.ingredients_text || ''),
      nutritionText,
      productName: clean(product.product_name_zh || product.product_name || ''),
      brand: clean(product.brands || '').split(',')[0] || '',
      codeInfo: clean(product.code || ''),
      otherText: []
    }
  };
}

function buildSample(product, options) {
  const sampleId = `${safeId(product.code)}-${options.role}`;
  return {
    sampleId,
    sourceUrl: options.sourceUrl,
    imageUrl: options.imageUrl,
    imagePath: join(rawDir, `${sampleId}.jpg`),
    category: options.category,
    expected: options.expected
  };
}

function knownNetworkSamples() {
  const seeds = [
    {
      sampleId: 'vita-ingredients',
      sourceUrl: 'https://world.openfoodfacts.org/product/4891028706656',
      imageUrl: 'https://images.openfoodfacts.org/images/products/489/102/870/6656/ingredients_zh.9.400.jpg',
      category: 'beverage:ingredients',
      expected: {
        ingredientsText: '水 白砂糖 红茶粉 浓缩柠檬汁 食品添加剂',
        nutritionText: '',
        productName: '维他柠檬茶',
        brand: 'Vita',
        codeInfo: '4891028706656',
        otherText: []
      }
    },
    {
      sampleId: 'vita-nutrition',
      sourceUrl: 'https://world.openfoodfacts.org/product/4891028706656',
      imageUrl: 'https://images.openfoodfacts.org/images/products/489/102/870/6656/nutrition_zh.12.400.jpg',
      category: 'beverage:nutrition',
      expected: {
        ingredientsText: '',
        nutritionText: '能量 蛋白质 脂肪 碳水化合物 糖 钠',
        productName: '维他柠檬茶',
        brand: 'Vita',
        codeInfo: '4891028706656',
        otherText: []
      }
    },
    {
      sampleId: 'soy-ingredients',
      sourceUrl: 'https://world.openfoodfacts.org/product/6902265210504',
      imageUrl: 'https://images.openfoodfacts.org/images/products/690/226/521/0504/ingredients_zh.10.400.jpg',
      category: 'condiment:ingredients',
      expected: {
        ingredientsText: '水 黄豆 小麦 食用盐 白砂糖 食品添加剂',
        nutritionText: '',
        productName: '草菇老抽',
        brand: '海天',
        codeInfo: '6902265210504',
        otherText: []
      }
    },
    {
      sampleId: 'curry-ingredients',
      sourceUrl: 'https://world.openfoodfacts.org/product/6936749501109',
      imageUrl: 'https://images.openfoodfacts.org/images/products/693/674/950/1109/ingredients_zh.4.400.jpg',
      category: 'ready_meal_curry:ingredients',
      expected: {
        ingredientsText: '食用油脂 小麦粉 食用盐 咖喱粉 白砂糖 味精',
        nutritionText: '',
        productName: '百梦多咖喱',
        brand: '好侍',
        codeInfo: '6936749501109',
        otherText: []
      }
    },
    {
      sampleId: 'curry-nutrition',
      sourceUrl: 'https://world.openfoodfacts.org/product/6936749501109',
      imageUrl: 'https://images.openfoodfacts.org/images/products/693/674/950/1109/nutrition_zh.7.400.jpg',
      category: 'ready_meal_curry:nutrition',
      expected: {
        ingredientsText: '',
        nutritionText: '能量 蛋白质 脂肪 碳水化合物 钠',
        productName: '百梦多咖喱',
        brand: '好侍',
        codeInfo: '6936749501109',
        otherText: []
      }
    },
    {
      sampleId: 'yogurt-front-claim',
      sourceUrl: 'https://world.openfoodfacts.org/product/6922577790068',
      imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/front_zh.3.400.jpg',
      category: 'dairy_yogurt:front_or_claims',
      expected: {
        ingredientsText: '',
        nutritionText: '',
        productName: '简醇',
        brand: '君乐宝',
        codeInfo: '6922577790068',
        otherText: []
      }
    },
    {
      sampleId: 'yogurt-ingredients',
      sourceUrl: 'https://world.openfoodfacts.org/product/6922577790068',
      imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/ingredients_zh.5.400.jpg',
      category: 'dairy_yogurt:ingredients',
      expected: {
        ingredientsText: '生牛乳 乳清蛋白粉 乳酸菌',
        nutritionText: '',
        productName: '简醇',
        brand: '君乐宝',
        codeInfo: '6922577790068',
        otherText: []
      }
    },
    {
      sampleId: 'yogurt-nutrition',
      sourceUrl: 'https://world.openfoodfacts.org/product/6922577790068',
      imageUrl: 'https://images.openfoodfacts.org/images/products/692/257/779/0068/nutrition_zh.7.400.jpg',
      category: 'dairy_yogurt:nutrition',
      expected: {
        ingredientsText: '',
        nutritionText: '能量 蛋白质 脂肪 碳水化合物 钠',
        productName: '简醇',
        brand: '君乐宝',
        codeInfo: '6922577790068',
        otherText: []
      }
    },
    {
      sampleId: 'gmw-back-label',
      sourceUrl: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
      imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/7326432166791366016.jpg',
      category: 'public_news:mixed_back_label',
      expected: emptyFields()
    },
    {
      sampleId: 'gmw-date-code',
      sourceUrl: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
      imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/2228264118440736172.jpg',
      category: 'production_date:date_code_only',
      expected: emptyFields()
    },
    {
      sampleId: 'gmw-front-date',
      sourceUrl: 'https://m.gmw.cn/2025-04/14/content_1304015064.htm',
      imageUrl: 'https://imgm.gmw.cn/attachement/jpg/site215/20250414/1878967348235225011.jpg',
      category: 'production_date:front_date',
      expected: emptyFields()
    }
  ];
  return seeds.map((sample) => ({
    ...sample,
    expected: normalizeExpectedForCategory(sample.expected, sample.category),
    imagePath: join(rawDir, `${sample.sampleId}.jpg`)
  }));
}

function normalizeSampleExpectedForEvaluation(sample) {
  return {
    ...sample,
    expected: normalizeExpectedForCategory(sample.expected || emptyFields(), sample.category)
  };
}

function normalizeExpectedForCategory(expected, category) {
  if (/:ingredients$/i.test(category)) return expectedForRole(expected, 'ingredients');
  if (/:nutrition$/i.test(category)) return expectedForRole(expected, 'nutrition');
  if (/front_or_claims/i.test(category)) return expectedForRole(expected, 'front');
  return {
    ingredientsText: String(expected.ingredientsText || ''),
    nutritionText: String(expected.nutritionText || ''),
    productName: '',
    brand: '',
    codeInfo: '',
    otherText: Array.isArray(expected.otherText) ? expected.otherText.map(String) : []
  };
}

function expectedForRole(expected, role) {
  const base = {
    ingredientsText: String(expected.ingredientsText || ''),
    nutritionText: String(expected.nutritionText || ''),
    productName: String(expected.productName || ''),
    brand: String(expected.brand || ''),
    codeInfo: '',
    otherText: Array.isArray(expected.otherText) ? expected.otherText.map(String) : []
  };
  if (role === 'ingredients') {
    return { ...base, nutritionText: '', productName: '', brand: '', codeInfo: '' };
  }
  if (role === 'nutrition') {
    return { ...base, ingredientsText: '', productName: '', brand: '', codeInfo: '' };
  }
  if (role === 'front') {
    return { ...base, ingredientsText: '', nutritionText: '', codeInfo: '' };
  }
  return base;
}

function selectImage(product, role) {
  return selectImageCandidates(product, role)[0] || '';
}

function selectImageCandidates(product, role) {
  const directUrl = role === 'ingredients'
    ? product.image_ingredients_url
    : role === 'nutrition'
      ? product.image_nutrition_url
      : product.image_front_url;
  const candidates = [];
  if (directUrl) candidates.push(directUrl);

  const selected = product.selected_images?.[role];
  const display = selected?.display || {};
  const selectedUrl = pickLocalizedValue(display);
  if (selectedUrl) candidates.push(selectedUrl);

  candidates.push(...selectImageEntries(product, role).map((entry) => buildOpenFoodFactsImageUrl(product.code, entry.key, entry.rev)));
  return uniqueStrings(candidates.filter(Boolean));
}

function selectImageEntries(product, role) {
  const images = product.images && typeof product.images === 'object' ? product.images : {};
  const rolePrefix = role === 'ingredients' ? 'ingredients_' : role === 'nutrition' ? 'nutrition_' : 'front_';
  return Object.entries(images)
    .filter(([key, value]) => key.startsWith(rolePrefix) && value && typeof value === 'object' && Number(value.rev))
    .map(([key, value]) => ({
      key,
      rev: Number(value.rev),
      languageRank: imageLanguageRank(key)
    }))
    .sort((left, right) => left.languageRank - right.languageRank || right.rev - left.rev);
}

function pickLocalizedValue(values) {
  const languages = ['zh', 'zh_cn', 'cn', 'en', 'fr', 'es', 'de', 'it'];
  for (const language of languages) {
    if (values[language]) return values[language];
  }
  return Object.values(values).find(Boolean) || '';
}

function imageLanguageRank(key) {
  const lower = key.toLowerCase();
  if (/_zh(?:_|$)|_cn(?:_|$)/.test(lower)) return 0;
  if (/_en(?:_|$)/.test(lower)) return 1;
  if (/_fr(?:_|$)/.test(lower)) return 2;
  return 3;
}

function buildOpenFoodFactsImageUrl(code, key, rev) {
  const codePath = formatOpenFoodFactsCodePath(code);
  if (!codePath || !key || !rev) return '';
  return `https://images.openfoodfacts.org/images/products/${codePath}/${key}.${rev}.400.jpg`;
}

function formatOpenFoodFactsCodePath(code) {
  const digits = String(code || '').replace(/\D/g, '');
  if (!digits) return '';
  const chunks = [];
  let rest = digits;
  while (rest.length > 4) {
    chunks.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  if (rest) chunks.push(rest);
  return chunks.join('/');
}

async function evaluateNetworkSample(sample, modules) {
  try {
    await ensureImage(sample);
    const imageInfo = await stat(sample.imagePath);
    const imageHash = await hashFile(sample.imagePath);
    const ocr = await runOcr(sample.imagePath);
    const blocks = normalizeBlocks(ocr.blocks);
    const normalized = modules.normalizeOcrResult({
      rawText: String(ocr.rawText || ocr.text || ''),
      text: String(ocr.rawText || ocr.text || ''),
      blocks,
      provider: 'rapidocr'
    }, 'external');
    const actualPayload = modules.buildActualFields(normalized);
    const reportSummary = buildReportSummary(modules, sample, actualPayload, blocks, imageInfo.size);
    const evaluated = modules.evaluateSample({
      sampleId: sample.sampleId,
      sourceUrl: sample.sourceUrl,
      imagePath: sample.imagePath,
      category: sample.category,
      ocrText: normalized.rawText,
      expected: sample.expected,
      actual: actualPayload.actual,
      validationIssues: actualPayload.validationIssues,
      detectedType: actualPayload.classification.detectedType
    });
    return {
      ...evaluated,
      imageUrl: sample.imageUrl,
      sampleQuality: classifySampleQuality({
        sample,
        actual: actualPayload.actual,
        ocrText: normalized.rawText,
        errors: evaluated.errors,
        imageBytes: imageInfo.size,
        sha256: imageHash
      }),
      reportSummary,
      dataSource: '包装实拍 OCR',
      classification: {
        detectedType: actualPayload.classification.detectedType,
        confidence: actualPayload.classification.confidence,
        reasons: actualPayload.classification.reasons,
        uncertainText: actualPayload.classification.uncertainText
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorCode = isDownloadFailure(message) ? 'sample_download_failed' : 'ocr_or_sample_failed';
    return {
      sampleId: sample.sampleId,
      sourceUrl: sample.sourceUrl,
      imagePath: sample.imagePath,
      category: sample.category,
      ocrText: '',
      expected: sample.expected,
      actual: emptyFields(),
      errors: [{
        code: errorCode,
        severity: 'high',
        message
      }],
      reviewStatus: 'fail',
      imageUrl: sample.imageUrl,
      sampleQuality: {
        status: 'invalid_sample',
        role: sampleRole(sample),
        reasons: [errorCode],
        imageBytes: 0,
        sha256: ''
      },
      reportSummary: '',
      dataSource: '包装实拍 OCR',
      classification: {
        detectedType: 'unknown',
        confidence: 'low',
        reasons: [errorCode],
        uncertainText: []
      }
    };
  }
}

function classifySampleQuality(input) {
  const expectedCore = Boolean(input.sample.expected?.ingredientsText || input.sample.expected?.nutritionText);
  const expectedIngredients = Boolean(input.sample.expected?.ingredientsText);
  const expectedNutrition = Boolean(input.sample.expected?.nutritionText);
  const text = String(input.ocrText || '').trim();
  const errorCodes = new Set(input.errors.map((error) => error.code));
  const reasons = [];
  if (!input.imageBytes) reasons.push('missing_image_bytes');
  if (input.errors.some((error) => error.code === 'sample_download_failed')) reasons.push('sample_download_failed');
  if (input.errors.some((error) => error.code === 'ocr_or_sample_failed')) reasons.push('ocr_or_sample_failed');
  if (expectedIngredients && !isUsableExpectedIngredients(input.sample.expected.ingredientsText)) reasons.push('unusable_expected_ingredients');
  if (expectedNutrition && !isUsableExpectedNutrition(input.sample.expected.nutritionText)) reasons.push('unusable_expected_nutrition');
  if (expectedIngredients && text.length >= 20 && !hasIngredientEvidenceText(text)) reasons.push('core_image_missing_ingredient_evidence');
  if (expectedIngredients && isSparseExpectedIngredients(input.sample.expected.ingredientsText) && countIngredientListSeparators(text) >= 4) {
    reasons.push('sparse_expected_ingredients_for_gold');
  }
  if (expectedIngredients && errorCodes.has('ingredients_missing')) reasons.push('weak_core_ingredient_extraction');
  if (expectedIngredients && errorCodes.has('ingredients_low_overlap') && !hasStrongIngredientExtraction(text)) reasons.push('weak_core_ingredient_overlap');
  if (expectedIngredients && errorCodes.has('ingredients_low_overlap') && isWeakIngredientActual(input.actual?.ingredientsText || '', input.sample.expected.ingredientsText)) {
    reasons.push('weak_core_ingredient_fragment');
  }
  if (expectedNutrition && text.length >= 20 && !hasNutritionEvidenceText(text)) reasons.push('core_image_missing_nutrition_evidence');
  if (expectedNutrition && (errorCodes.has('nutrition_missing') || errorCodes.has('nutrition_low_overlap')) && countNutritionEvidenceSignals(text) < 5) {
    reasons.push('weak_core_nutrition_extraction');
  }
  if (expectedCore && text.length < 20) reasons.push('weak_core_ocr_text');
  if (expectedCore && countTextSignals(text) < 8) reasons.push('weak_core_ocr_signal');
  const status = reasons.includes('sample_download_failed')
    || reasons.includes('ocr_or_sample_failed')
    || reasons.includes('missing_image_bytes')
    || reasons.includes('unusable_expected_ingredients')
    || reasons.includes('unusable_expected_nutrition')
    || reasons.includes('core_image_missing_ingredient_evidence')
    || reasons.includes('core_image_missing_nutrition_evidence')
    || reasons.includes('sparse_expected_ingredients_for_gold')
    ? 'invalid_sample'
    : reasons.length
      ? 'weak_ocr'
      : 'ok';
  return {
    status,
    role: sampleRole(input.sample),
    reasons,
    imageBytes: input.imageBytes,
    sha256: input.sha256
  };
}

function sampleRole(sample) {
  if (sample.expected?.ingredientsText) return 'ingredients';
  if (sample.expected?.nutritionText) return 'nutrition';
  if (/front_or_claims/i.test(sample.category)) return 'front_or_claims';
  return 'other';
}

function countTextSignals(value) {
  const text = String(value || '').normalize('NFKC');
  return (text.match(/[A-Za-z\u4e00-\u9fa5]/g) || []).length;
}

function hasIngredientEvidenceText(value) {
  const text = clean(value);
  if (/[配护]\s*料|ingredients?|ingredientes?|zutaten|ingr[eé]dients?/i.test(text)) return true;
  return isUsableExpectedIngredients(text);
}

function hasNutritionEvidenceText(value) {
  const text = clean(value);
  if (/营养成分|nutrition|typical\s*val|per\s*100|每\s*100|NRV|valeurs?\s+nutritionnelles?|n[äa]hrwerte|valores?\s+nutricionales?/i.test(text)) return true;
  return isUsableExpectedNutrition(text);
}

function countNutritionEvidenceSignals(value) {
  const compact = String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const patterns = [
    /nutrition|nutriz|nahrwert|valori|valores|declaration/,
    /energy|energie|energia|energa|enegia|kcal|kj|brennwert/,
    /protein|proteine|proteines|eiweiss|eiweis/,
    /fat|fett|grass|grasas|grassi|lipidos|tiuszc|tuky|masti/,
    /carbohydrate|carbohydrat|glucides|carboidrati|cdcd/,
    /sugar|sugars|zucker|sucres|azucares|zuccheri/,
    /sodium|salt|salz|salk|solsu|sel|sare/
  ];
  return patterns.filter((pattern) => pattern.test(compact)).length;
}

function isSparseExpectedIngredients(value) {
  const tokens = clean(value)
    .split(/[\s、，,;；:：()（）\[\]【】]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  return tokens.length > 0 && tokens.length < 4;
}

function countIngredientListSeparators(value) {
  return (String(value || '').match(/[、，,;；]/g) || []).length;
}

function hasStrongIngredientExtraction(value) {
  const text = String(value || '').normalize('NFKC');
  const compact = text.replace(/\s+/g, '').toLowerCase();
  const separatorCount = countIngredientListSeparators(text);
  const terms = ['water', 'sugar', 'salt', 'flour', 'oil', 'milk', 'wheat', 'sesame', 'gluten', 'barley', 'tomate', 'tomato', 'zucker', 'wasser', 'kokos', 'starke', 'basilic', 'carottes', 'eau', 'sucre', 'huile'];
  const hits = terms.filter((term) => compact.includes(term)).length;
  return compact.length >= 45 && (separatorCount >= 2 || hits >= 4);
}

function isWeakIngredientActual(actual, expected) {
  const text = String(actual || '').normalize('NFKC');
  const compact = text.replace(/\s+/g, '').toLowerCase();
  if (!compact) return true;
  if (compact.length < 70) return true;
  const expectedTokens = clean(expected)
    .split(/[\s、，,;；:：()（）\[\]【】._-]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 4);
  const hits = expectedTokens.filter((token) => compact.includes(token)).length;
  const nutritionish = /nutrition|calor|protein|carb|fat|sod|sodium|%|dv|serving|nrv/i.test(text);
  const allergenish = /contains?|may\s*contain|allergen|eggs?|almonds?|nuts?|cashews?|walnuts?/i.test(text);
  if ((nutritionish || allergenish) && hits < 3) return true;
  return expectedTokens.length >= 6 && hits / expectedTokens.length < 0.12;
}

async function hashFile(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

function buildReportSummary(modules, sample, actualPayload, blocks, imageSize) {
  const ocrResult = {
    mode: 'real',
    text: actualPayload.classification.layout.rawText,
    confidence: normalizeConfidence(blocks),
    provider: 'rapidocr',
    blocks,
    requiresUserConfirmation: true
  };
  const analysis = modules.buildLocalLabelAnalysis({
    productName: actualPayload.actual.productName || sample.expected.productName,
    ingredientText: actualPayload.actual.ingredientsText,
    nutritionText: actualPayload.actual.nutritionText,
    frontClaimsText: actualPayload.actual.otherText.join('\n'),
    unconfirmedText: actualPayload.classification.uncertainText,
    confidence: actualPayload.classification.confidence,
    attention,
    sourceType: 'ocr',
    ocr: ocrResult,
    image: {
      id: sample.sampleId,
      tempFilePath: sample.imagePath,
      name: `${sample.sampleId}.jpg`,
      mimeType: 'image/jpeg',
      size: imageSize,
      storage: 'temp-file'
    }
  });
  return [
    analysis.report.decision?.label,
    analysis.report.decision?.summary,
    analysis.report.summarySentence,
    buildPackagingReferenceNotice(actualPayload.actual),
    '数据来源：包装实拍 OCR。识别结果仅供标签信息参考，请以包装实物标注为准。'
  ].filter(Boolean).join(' | ');
}

function buildPackagingReferenceNotice(actual) {
  const hasIngredients = Boolean(actual?.ingredientsText);
  const hasNutrition = Boolean(actual?.nutritionText);
  if (!hasIngredients && !hasNutrition) {
    return '当前图片未识别到配料表或营养成分表，建议继续拍摄包装背面的配料表。';
  }
  if (!hasIngredients) return '当前图片未识别到配料表，建议继续拍摄包装背面的配料表。';
  if (!hasNutrition) return '当前图片未识别到营养成分表，建议继续拍摄包装背面的营养成分表。';
  return '';
}

async function cacheSamplesUntilTarget(initialSamples, target, startedAt) {
  const persistedBlocklist = await loadSampleBlocklist();
  const blockedSampleIds = new Set(persistedBlocklist.sampleIds);
  const blockedImageUrls = new Set(persistedBlocklist.imageUrls);
  let workingSamples = dedupeSamples(initialSamples);
  let lastCacheResult = { successes: [], failures: [] };
  const attempts = [];

  for (let round = 1; round <= maxCacheRounds; round += 1) {
    const candidateLimit = target + Math.max(80, Math.min(240, target - lastCacheResult.successes.length || target));
    const activeSamples = selectBalancedSamples(filterBlockedSamples(workingSamples, {
      sampleIds: blockedSampleIds,
      imageUrls: blockedImageUrls
    }), candidateLimit);
    lastCacheResult = await cacheSampleImages(activeSamples, target);
    attempts.push({
      round,
      candidateSamples: activeSamples.length,
      cachedSamples: lastCacheResult.successes.length,
      failedSamples: lastCacheResult.failures.length
    });
    if (hasCacheTargetCoverage(lastCacheResult.successes.map((item) => item.sample), target)) break;

    for (const failure of lastCacheResult.failures) {
      if (failure.sampleId) blockedSampleIds.add(failure.sampleId);
      if (failure.imageUrl) blockedImageUrls.add(failure.imageUrl);
    }

    const missing = target - lastCacheResult.successes.length;
    const nextTarget = target + Math.min(160, Math.max(60, missing));
    const supplemental = await buildOpenFoodFactsSamples(nextTarget, {
      sampleIds: blockedSampleIds,
      imageUrls: blockedImageUrls
    });
    workingSamples = dedupeSamples([
      ...lastCacheResult.successes.map((item) => item.sample),
      ...supplemental
    ]);
  }

  const cachedSamples = selectBalancedSamples(filterBlockedSamples(lastCacheResult.successes.map((item) => item.sample), {
    sampleIds: blockedSampleIds,
    imageUrls: blockedImageUrls
  }), target);
  const reachedTarget = hasCacheTargetCoverage(cachedSamples, target);
  if (reachedTarget) {
    await writeSampleManifest(cachedSamples, {
      generatedAt: new Date().toISOString(),
      source: 'Open Food Facts API and public product image URLs; images pre-cached for local OCR evaluation',
      cachePolicy: 'Only samples with locally cached image files are retained for the OCR evaluation manifest.',
      targetSamples: target
    });
  }

  const categoryCounts = countCategories(cachedSamples);
  return {
    generatedAt: startedAt,
    targetSamples: target,
    manifestSamples: initialSamples.length,
    cachedSamples: cachedSamples.length,
    failedSamples: lastCacheResult.failures.length,
    reachedTarget,
    categoryCount: Object.keys(categoryCounts).length,
    categoryCounts,
    attempts,
    cachePolicy: {
      localRawDir: rawDir,
      manifestPath,
      imageStorage: 'Image binaries are cached for local evaluation only and are ignored by git.',
      sourceUrlPolicy: 'Each sample keeps its public sourceUrl and imageUrl; copyright-uncertain images are not packaged into product assets.'
    },
    sampleFetchErrors,
    cached: lastCacheResult.successes.slice(0, target).map((item) => ({
      sampleId: item.sample.sampleId,
      sourceUrl: item.sample.sourceUrl,
      imageUrl: item.sample.imageUrl,
      imagePath: item.sample.imagePath,
      category: item.sample.category,
      imageBytes: item.imageBytes,
      sha256: item.sha256
    })),
    failures: lastCacheResult.failures
  };
}

async function cacheSampleImages(samples, target = Infinity) {
  const successes = [];
  const failures = [];
  let index = 0;
  for (const sample of samples) {
    index += 1;
    try {
      await ensureImage(sample);
      const imageInfo = await stat(sample.imagePath);
      if (imageInfo.size < minCachedImageBytes) throw new Error(`cached_image_too_small:${imageInfo.size}`);
      successes.push({
        sample: { ...sample },
        imageBytes: imageInfo.size,
        sha256: await hashFile(sample.imagePath)
      });
    } catch (error) {
      failures.push({
        sampleId: sample.sampleId,
        sourceUrl: sample.sourceUrl,
        imageUrl: sample.imageUrl,
        imagePath: sample.imagePath,
        category: sample.category,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    if (index % 25 === 0 || index === samples.length) {
      console.warn(`Sample cache progress: ${index}/${samples.length}, cached=${successes.length}, failed=${failures.length}`);
    }
    if (hasCacheTargetCoverage(successes.map((item) => item.sample), target)) {
      console.warn(`Sample cache reached target: cached=${successes.length}, processed=${index}/${samples.length}`);
      break;
    }
  }
  return { successes, failures };
}

async function writeSampleCacheReports(payload) {
  await writeFile(sampleCacheJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(sampleCacheMdPath, buildSampleCacheMarkdown(payload), 'utf8');
  await writeFile(sampleCacheFailuresPath, `${JSON.stringify({
    generatedAt: payload.generatedAt,
    targetSamples: payload.targetSamples,
    failedSamples: payload.failedSamples,
    failures: payload.failures
  }, null, 2)}\n`, 'utf8');
}

function buildSampleCacheMarkdown(payload) {
  const topFailures = summarizeBy(payload.failures || [], (item) => failureBucket(item.message)).slice(0, 10);
  return `# OCR Sample Cache Report

Generated: ${payload.generatedAt}

## Summary

- 目标缓存样本数：${payload.targetSamples}
- manifest 样本数：${payload.manifestSamples}
- 本地缓存成功：${payload.cachedSamples}
- 本地缓存失败：${payload.failedSamples}
- 覆盖类别数：${payload.categoryCount}
- 是否达到后续 OCR 评测门槛：${payload.reachedTarget ? '是' : '否'}

## Attempts

${payload.attempts.map((item) => `- round ${item.round}: candidates ${item.candidateSamples}, cached ${item.cachedSamples}, failed ${item.failedSamples}`).join('\n') || '- none'}

## Category Coverage

${Object.entries(payload.categoryCounts).slice(0, 40).map(([category, count]) => `- ${category}: ${count}`).join('\n') || '- none'}

## Failure Top 10

${topFailures.map((item) => `- ${item.key}: ${item.count}`).join('\n') || '- none'}

## Failed Samples

${(payload.failures || []).slice(0, 80).map((item) => `- ${item.sampleId} (${item.category}): ${failureBucket(item.message)} | ${item.imageUrl}`).join('\n') || '- none'}

## Policy

- 只缓存公开可访问图片用于本地评测，不把版权不确定图片打包进正式产品。
- 后续 \`npm run ocr:evaluate\` 只应在本地缓存达到目标数量后执行。
- 若缓存不足 ${payload.targetSamples}，需要继续搜索公开样本并替换不可达 URL，不能用失败样本凑数。
`;
}

function countCategories(samples) {
  return samples.reduce((acc, sample) => {
    acc[sample.category] = (acc[sample.category] || 0) + 1;
    return acc;
  }, {});
}

function hasCacheTargetCoverage(samples, target) {
  if (samples.length < target) return false;
  const active = samples.slice(0, Math.max(samples.length, target));
  if (target < 500) return active.length >= target;
  return active.filter((sample) => /:ingredients$/i.test(sample.category)).length >= 150
    && active.filter((sample) => /:nutrition$/i.test(sample.category)).length >= 150
    && new Set(active.map((sample) => sample.category).filter(Boolean)).size >= 10;
}

function summarizeBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function failureBucket(message) {
  const text = String(message || '');
  if (/ECONNREFUSED|connect ECONNREFUSED/i.test(text)) return 'connection_refused';
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) return 'dns_or_network_unreachable';
  if (/HTTP 404/i.test(text)) return 'image_http_404';
  if (/HTTP 429/i.test(text)) return 'image_http_429_rate_limited';
  if (/HTTP 403/i.test(text)) return 'image_http_403';
  if (/HTTP 5\d\d/i.test(text)) return 'image_http_5xx';
  if (/content_type_not_image/i.test(text)) return 'content_type_not_image';
  if (/cached_image_too_small|downloaded_image_too_small/i.test(text)) return 'image_too_small';
  if (/download_failed/i.test(text)) return 'download_failed';
  return text.slice(0, 80) || 'unknown_error';
}

async function ensureImage(sample) {
  if (await isCachedImageUsable(sample.imagePath)) return;
  const freshCandidates = await fetchFreshImageCandidates(sample);
  const candidates = expandImageCandidates([
    sample.imageUrl,
    ...freshCandidates
  ]);
  let lastError = '';
  for (const url of candidates) {
    try {
      await downloadImage(url, sample.imagePath);
      sample.imageUrl = url;
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`download_failed:${lastError || `Failed to download image ${sample.imageUrl}`}`);
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(imageDownloadTimeoutMs)
  });
  if (!response.ok || !response.body) throw new Error(`Failed to download image ${url}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/^image\//i.test(contentType)) {
    throw new Error(`content_type_not_image:${contentType}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(tmpPath));
    const imageInfo = await stat(tmpPath);
    if (imageInfo.size < minCachedImageBytes) throw new Error(`downloaded_image_too_small:${imageInfo.size}`);
    await rename(tmpPath, outputPath);
  } catch (error) {
    await unlink(tmpPath).catch(() => {});
    throw error;
  }
}

async function isCachedImageUsable(imagePath) {
  if (!existsSync(imagePath)) return false;
  try {
    const imageInfo = await stat(imagePath);
    return imageInfo.size >= minCachedImageBytes;
  } catch {
    return false;
  }
}

async function fetchFreshImageCandidates(sample) {
  const code = extractProductCodeFromSample(sample);
  if (!code) return [];
  try {
    const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}`);
    url.searchParams.set('fields', [
      'code',
      'image_url',
      'image_front_url',
      'image_ingredients_url',
      'image_nutrition_url',
      'selected_images',
      'images'
    ].join(','));
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(sampleFetchTimeoutMs)
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const product = payload.product || {};
    product.code = product.code || code;
    return selectImageCandidates(product, sampleRole(sample) === 'nutrition' ? 'nutrition' : sampleRole(sample) === 'ingredients' ? 'ingredients' : 'front');
  } catch {
    return [];
  }
}

function extractProductCodeFromSample(sample) {
  const expectedCode = String(sample.expected?.codeInfo || '').replace(/\D/g, '');
  if (expectedCode) return expectedCode;
  const match = String(sample.sourceUrl || '').match(/product\/([^/?#]+)/);
  return match?.[1]?.replace(/\D/g, '') || '';
}

function buildImageUrlVariants(url) {
  const source = String(url || '');
  const match = source.match(/^(.*?\.)(?:100|200|400|full)(\.jpg)$/i);
  if (!match) return [];
  return ['400', 'full', '200', '100'].map((size) => `${match[1]}${size}${match[2]}`);
}

function expandImageCandidates(urls) {
  const expanded = [];
  for (const url of urls.filter(Boolean)) {
    const variants = buildImageUrlVariants(url);
    const sizedUrls = uniqueStrings(variants.length ? [...variants, url] : [url]);
    for (const sizedUrl of sizedUrls) {
      const hostFallbacks = buildImageHostFallbacks(sizedUrl);
      expanded.push(...hostFallbacks);
      if (!hostFallbacks.length || tryOriginalOpenFoodFactsImageHost) {
        expanded.push(sizedUrl);
      }
    }
  }
  return uniqueStrings(expanded.filter(Boolean));
}

function buildImageHostFallbacks(url) {
  const source = String(url || '');
  const fallbacks = [];
  if (source.startsWith('https://images.openfoodfacts.org/')) {
    fallbacks.push(source.replace('https://images.openfoodfacts.org/', 'https://static.openfoodfacts.org/'));
  }
  if (source.startsWith('http://images.openfoodfacts.org/')) {
    fallbacks.push(source.replace('http://images.openfoodfacts.org/', 'https://static.openfoodfacts.org/'));
  }
  return fallbacks;
}

function isDownloadFailure(message) {
  return String(message || '').startsWith('download_failed:');
}

async function runOcr(imagePath) {
  const image = await readFile(imagePath);
  const body = new FormData();
  body.append('file', new Blob([image], { type: 'image/jpeg' }), imagePath.split('/').pop() || 'sample.jpg');
  const response = await fetch(`${ocrServiceUrl}/ocr`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(ocrRequestTimeoutMs)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`RapidOCR failed: HTTP ${response.status} ${payload?.detail || payload?.error || response.statusText}`);
  return payload || {};
}

async function checkOcrHealth() {
  try {
    const response = await fetch(`${ocrServiceUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return { ok: response.ok, error: response.ok ? '' : `ocr_health_http_${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function writeBlockedReports({ startedAt, samples, blocker }) {
  const payload = {
    generatedAt: startedAt,
    ocrServiceUrl,
    targetSamples,
    sampleCount: samples.length,
    blocker,
    samples: [],
    summary: {
      metrics: {
        totalSamples: 0,
        passedSamples: 0,
        failedSamples: 0,
        categoryCount: 0,
        maturityStage: 'build_100_gold',
        expansionReady: false,
        finalTargetSamples: 500,
        coreSamples: 0,
        coreIngredientSamples: 0,
        coreNutritionSamples: 0,
        overallPassRate: 0,
        invalidSampleCount: samples.length,
        weakOcrSampleCount: 0,
        ingredientsAccuracy: 0,
        nutritionAccuracy: 0,
        coreIngredientsAccuracy: 0,
        coreNutritionAccuracy: 0,
        ingredientFalsePositiveRate: 1,
        nutritionAsIngredientRate: 1,
        otherAsIngredientRate: 1,
        uncertainWithReasonRate: 0,
        aiSourceMarkedRate: 1,
        chatgptAverageScore: null,
        deepseekAverageScore: null,
        acceptancePass: false
      },
      errorsByCode: [{ code: 'ocr_service_unreachable', count: samples.length }],
      failedSamples: []
    },
    aiReviewSummary: []
  };
  await writeFile(reportJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(reportMdPath, buildEvaluationMarkdown(payload), 'utf8');
  await writeFile(reviewSummaryPath, buildReviewMarkdown([], []), 'utf8');
  await writeFile(finalReportPath, buildFinalMaturityReport(payload), 'utf8');
}

function normalizeBlocks(blocks) {
  return Array.isArray(blocks)
    ? blocks.map((block) => {
      const boxBounds = getBoxBounds(block.box);
      return {
        text: String(block.text || ''),
        x: optionalNumber(block.x) ?? boxBounds?.x,
        y: optionalNumber(block.y) ?? boxBounds?.y,
        width: optionalNumber(block.width) ?? boxBounds?.width,
        height: optionalNumber(block.height) ?? boxBounds?.height,
        confidence: optionalNumber(block.confidence)
      };
    }).filter((block) => block.text.trim())
    : [];
}

function getBoxBounds(box) {
  if (!Array.isArray(box)) return undefined;
  const points = box
    .map((point) => Array.isArray(point) ? { x: Number(point[0]), y: Number(point[1]) } : undefined)
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return undefined;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

function normalizeConfidence(blocks) {
  const values = blocks.map((block) => Number(block.confidence)).filter(Number.isFinite);
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function optionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function buildExpectedNutritionText(nutriments) {
  const rows = [
    ['能量', nutriments['energy-kj_100g'] || nutriments.energy_100g, 'kJ'],
    ['蛋白质', nutriments.proteins_100g, 'g'],
    ['脂肪', nutriments.fat_100g, 'g'],
    ['碳水化合物', nutriments.carbohydrates_100g, 'g'],
    ['糖', nutriments.sugars_100g, 'g'],
    ['钠', nutriments.sodium_100g ? Number(nutriments.sodium_100g) * 1000 : '', 'mg']
  ];
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value, unit]) => `${label} ${roundNumber(value)}${unit}`)
    .join('\n');
}

function isUsableExpectedIngredients(value) {
  const text = clean(value);
  const compact = text.replace(/\s+/g, '').toLowerCase();
  if (compact.length < 8) return false;
  if (/^(?:inbold|also,?maycontain|maycontain|contains|suitableforvegetarians?)/i.test(compact)) return false;
  const allergenOnly = /maycontain|可能含有|致敏原|过敏原|allergen/i.test(text)
    && !/[、，,;；]/.test(text)
    && !/water|sugar|salt|flour|oil|milk|starch|水|糖|盐|油|粉|淀粉/i.test(text);
  if (allergenOnly) return false;
  const listLike = (text.match(/[、，,;；]/g) || []).length >= 2;
  const foodTerms = /water|sugar|salt|flour|oil|milk|starch|wheat|soy|glucose|dextrose|水|白砂糖|食用盐|植物油|小麦粉|淀粉|生牛乳|食品添加剂/i.test(text);
  if (compact.length < 12 && !foodTerms) return false;
  return listLike || foodTerms;
}

function isUsableExpectedNutrition(value) {
  const text = clean(value);
  if (!text) return false;
  const hits = ['能量', '蛋白质', '脂肪', '碳水化合物', '糖', '钠', 'energy', 'protein', 'fat', 'carbohydrate', 'sugar', 'sodium']
    .filter((key) => text.toLowerCase().includes(key.toLowerCase())).length;
  return hits >= 3;
}

function categorizeProduct(product) {
  const text = [
    product.queryBucket,
    product.product_name,
    product.product_name_zh,
    product.categories_tags,
    product.categories_tags_en
  ].flat().join(' ').toLowerCase();
  const hit = ocrCategoryRules.find((rule) => rule.pattern.test(text));
  return hit?.category || product.queryBucket || 'other_food';
}

function dedupeSamples(samples) {
  const seen = new Set();
  return samples.filter((sample) => {
    const key = sample.sampleId || sample.imageUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(sample.imageUrl);
  });
}

function selectBalancedSamples(samples, target) {
  const ingredientMin = target >= 500 ? 150 : 25;
  const nutritionMin = target >= 500 ? 150 : 25;
  const frontMin = target >= 500 ? 120 : 25;
  const minimums = [
    { pattern: /:ingredients$/, min: ingredientMin },
    { pattern: /:nutrition$/, min: nutritionMin },
    { pattern: /front_or_claims$/, min: frontMin },
    { pattern: /date|code|mixed_back_label/, min: 5 }
  ];
  const selected = [];
  const used = new Set();
  for (const rule of minimums) {
    const matched = samples.filter((sample) => rule.pattern.test(sample.category));
    for (const sample of matched.slice(0, rule.min)) {
      if (selected.length >= target) break;
      if (used.has(sample.sampleId)) continue;
      selected.push(sample);
      used.add(sample.sampleId);
    }
  }
  for (const sample of samples) {
    if (selected.length >= target) break;
    if (used.has(sample.sampleId)) continue;
    selected.push(sample);
  }
  return selected.slice(0, target);
}

function emptyFields() {
  return {
    ingredientsText: '',
    nutritionText: '',
    productName: '',
    brand: '',
    codeInfo: '',
    otherText: []
  };
}

function buildEvaluationMarkdown(payload) {
  const { metrics } = payload.summary;
  return `# OCR Evaluation Report

Generated: ${payload.generatedAt}

Source: Open Food Facts public API and product image URLs

OCR service: ${payload.ocrServiceUrl}

## Metrics

| Metric | Value |
| --- | ---: |
| totalSamples | ${metrics.totalSamples} |
| passedSamples | ${metrics.passedSamples} |
| failedSamples | ${metrics.failedSamples} |
| overallPassRate | ${formatPercent(metrics.overallPassRate)} |
| categoryCount | ${metrics.categoryCount} |
| maturityStage | ${metrics.maturityStage} |
| expansionReady | ${metrics.expansionReady ? 'yes' : 'no'} |
| finalTargetSamples | ${metrics.finalTargetSamples} |
| coreSamples | ${metrics.coreSamples} |
| coreIngredientSamples | ${metrics.coreIngredientSamples} |
| coreNutritionSamples | ${metrics.coreNutritionSamples} |
| invalidSampleCount | ${metrics.invalidSampleCount} |
| weakOcrSampleCount | ${metrics.weakOcrSampleCount} |
| ingredientsAccuracy | ${formatPercent(metrics.ingredientsAccuracy)} |
| nutritionAccuracy | ${formatPercent(metrics.nutritionAccuracy)} |
| coreIngredientsAccuracy | ${formatPercent(metrics.coreIngredientsAccuracy)} |
| coreNutritionAccuracy | ${formatPercent(metrics.coreNutritionAccuracy)} |
| ingredientFalsePositiveRate | ${formatPercent(metrics.ingredientFalsePositiveRate)} |
| nutritionAsIngredientRate | ${formatPercent(metrics.nutritionAsIngredientRate)} |
| otherAsIngredientRate | ${formatPercent(metrics.otherAsIngredientRate)} |
| uncertainWithReasonRate | ${formatPercent(metrics.uncertainWithReasonRate)} |
| chatgptAverageScore | ${metrics.chatgptAverageScore ?? 'skipped'} |
| deepseekAverageScore | ${metrics.deepseekAverageScore ?? 'skipped'} |
| acceptancePass | ${metrics.acceptancePass ? 'yes' : 'no'} |

## Failure Top 10

${payload.summary.errorsByCode.slice(0, 10).map((item) => `- ${item.code}: ${item.count}`).join('\n') || '- none'}

## Failed Samples

${payload.summary.failedSamples.slice(0, 50).map((sample) => `- ${sample.sampleId} (${sample.category}): ${sample.errors.map((error) => error.code).join(', ')}`).join('\n') || '- none'}

## Sample Source Issues

${formatSampleSourceIssues(payload.sampleFetchErrors)}
`;
}

function buildReviewMarkdown(summary, reviews) {
  return `# OCR AI Review Summary

${summary.map((item) => `- ${item.provider}: total ${item.total}, skipped ${item.skipped}, passed ${item.passed}, averageScore ${item.averageScore ?? 'skipped'}, highRisk ${item.highRisk}, mediumRisk ${item.mediumRisk}`).join('\n') || '- No AI review result.'}

## Sample Issues

${reviews.slice(0, 40).map((review) => `- ${review.sampleId} / ${review.provider}: score ${review.score}, risk ${review.riskLevel}, skipped ${review.skipped ? 'yes' : 'no'}, issues ${(review.issues || []).slice(0, 3).join(' | ')}`).join('\n') || '- none'}
`;
}

function buildFinalMaturityReport(payload) {
  const metrics = payload.summary.metrics;
  const reached = metrics.acceptancePass;
  return `# Final OCR Maturity Report

${reached ? '当前 OCR 分区能力达到本轮成熟度指标。' : '当前 OCR 分区能力未达到成熟标准，不能声明完成。'}

## Final Status

- 是否达标：${reached ? '是' : '否'}
- 总样本数：${metrics.totalSamples}
- 样本级通过率：${formatPercent(metrics.overallPassRate)}
- 样本分类覆盖：${metrics.categoryCount}
- 当前成熟度阶段：${formatMaturityStage(metrics.maturityStage)}
- 是否已达到扩样到 500 的门槛：${metrics.expansionReady ? '是' : '否'}
- 最终稳定性目标样本数：${metrics.finalTargetSamples}
- 核心有效样本数：${metrics.coreSamples}
- 核心有效配料样本数：${metrics.coreIngredientSamples}
- 核心有效营养样本数：${metrics.coreNutritionSamples}
- 无效样本数：${metrics.invalidSampleCount}
- 弱 OCR 样本数：${metrics.weakOcrSampleCount}
- ingredientsText 准确率：${formatPercent(metrics.ingredientsAccuracy)}
- nutritionText 准确率：${formatPercent(metrics.nutritionAccuracy)}
- 核心有效 ingredientsText 准确率：${formatPercent(metrics.coreIngredientsAccuracy)}
- 核心有效 nutritionText 准确率：${formatPercent(metrics.coreNutritionAccuracy)}
- 配料表误判率：${formatPercent(metrics.ingredientFalsePositiveRate)}
- 营养成分表误判为配料表比例：${formatPercent(metrics.nutritionAsIngredientRate)}
- 广告语 / 生产信息误判为配料表比例：${formatPercent(metrics.otherAsIngredientRate)}
- ChatGPT Review 平均分：${metrics.chatgptAverageScore ?? 'skipped'}
- DeepSeek Review 平均分：${metrics.deepseekAverageScore ?? 'skipped'}
- 是否可以进入产品使用：${reached ? '可以进入下一轮真机验收' : '不可以'}

## Gold Set Quality

- 当前阶段目标：先清洗 100 样本 gold set，并在核心有效样本上达到 95% 稳定正确率。
- 最终稳定性目标：100 样本稳定后扩到 500 样本，并在 500 样本上继续稳定 95% 以上。
- 后续识别扩展目标：食品包装 OCR 500 样本稳定 95% 后，新增二维码 / 条形码 / 商品数字码评测，三类各 500 用例且各自正确率 >= 95%。
- 当前核心有效样本：${metrics.coreSamples}
- 当前无效样本：${metrics.invalidSampleCount}
- 当前弱 OCR 样本：${metrics.weakOcrSampleCount}
- 当前结论：${metrics.expansionReady ? '已达到扩样门槛，下一步应扩到 500 样本并继续验证' : '不能扩到 500，需先修复 100 样本 gold set 和核心抽取'}

## Post-OCR Code Recognition Gate

- 适用顺序：只在食品包装 OCR 分区达到 500 样本、95% 稳定正确率后激活。
- 覆盖范围：二维码内容分类、条形码标准化编码、包装印刷 8/12/13 位商品数字码提取。
- 验收指标：二维码、条形码、商品数字码各 500 用例；每类和整体正确率均 >= 95%；二维码 URL 必须保留为 URL 类型，AI/联网结果不得伪装成包装实拍识别。
- 可重复命令：\`npm run product-code:evaluate\`
- 当前状态：${metrics.acceptancePass ? '可进入下一阶段执行 product-code:evaluate' : '未激活；当前 OCR 分区尚未达标'}

## Failed Samples

${payload.summary.failedSamples.slice(0, 80).map((sample) => `- ${sample.sampleId}: ${sample.errors.map((error) => error.code).join(', ')}`).join('\n') || '- none'}

## Fixed Issues This Run

- 建立可重复运行的网络样本 OCR 评测链路。
- 分离配料表、营养成分表、商品信息、编码、otherText 与 uncertainText。
- 增加营养/广告/生产信息误入配料表的校验。
- 增加 ChatGPT / DeepSeek Review provider，缺少 API Key 时明确 skipped。

## Unfixed Issues

${buildUnfixedIssues(payload)}

## Sample Source Issues

${formatSampleSourceIssues(payload.sampleFetchErrors)}

## AI Optimization Decision

${buildAiOptimizationDecision(payload)}

## Next Suggestions

- 补足真实模糊、倾斜、反光、二维码、条码局部样本。
- 对失败 Top 错误继续收紧关键词、边界和置信度规则。
- 在配置 API Key 后跑完整 ChatGPT / DeepSeek Review，不用脚本默认 smoke 限量。
`;
}

function buildAiOptimizationDecision(payload) {
  const review = (payload.aiReviews || []).find((item) => item.provider === 'chatgpt-subagent' && item.externalReview);
  const decision = review?.aiOptimizationDecision;
  if (!decision) {
    return '- 暂无可引用的 ChatGPT 子 agent AI 优化判断。';
  }
  const guardrails = Array.isArray(decision.guardrails) ? decision.guardrails : [];
  return [
    `- 是否建议加入 AI 优化：${decision.shouldAdd ? '是' : '否'}`,
    `- 建议环节：${decision.stage || '未说明'}`,
    ...guardrails.map((item) => `- 边界：${String(item)}`),
    review.launchReadiness ? `- 上线判断：${review.launchReadiness}` : ''
  ].filter(Boolean).join('\n');
}

function buildUnfixedIssues(payload) {
  const metrics = payload.summary.metrics;
  const issues = [];
  if (metrics.totalSamples < 500) issues.push(`最终稳定性样本数不足 500：当前 ${metrics.totalSamples}`);
  if (!metrics.expansionReady && metrics.totalSamples < 500) issues.push('尚未达到 100 样本 95% 稳定正确率，不能进入 500 样本扩容阶段');
  if (metrics.categoryCount < 10) issues.push(`样本分类覆盖不足 10：当前 ${metrics.categoryCount}`);
  const requiredCoreSamples = metrics.totalSamples >= 500 ? 150 : 25;
  if (metrics.coreIngredientSamples < requiredCoreSamples) issues.push(`核心有效配料样本不足 ${requiredCoreSamples}：当前 ${metrics.coreIngredientSamples}`);
  if (metrics.coreNutritionSamples < requiredCoreSamples) issues.push(`核心有效营养样本不足 ${requiredCoreSamples}：当前 ${metrics.coreNutritionSamples}`);
  if (metrics.invalidSampleCount > 0) issues.push(`存在无效样本：当前 ${metrics.invalidSampleCount}`);
  if (metrics.weakOcrSampleCount > 0) issues.push(`存在弱 OCR 样本：当前 ${metrics.weakOcrSampleCount}`);
  if (metrics.overallPassRate < 0.95) issues.push(`样本级通过率不足 95%：当前 ${formatPercent(metrics.overallPassRate)}`);
  if (metrics.ingredientsAccuracy < 0.95) issues.push(`ingredientsText 准确率不足 95%：当前 ${formatPercent(metrics.ingredientsAccuracy)}`);
  if (metrics.nutritionAccuracy < 0.95) issues.push(`nutritionText 准确率不足 95%：当前 ${formatPercent(metrics.nutritionAccuracy)}`);
  if (metrics.coreIngredientsAccuracy < 0.95) issues.push(`核心有效 ingredientsText 准确率不足 95%：当前 ${formatPercent(metrics.coreIngredientsAccuracy)}`);
  if (metrics.coreNutritionAccuracy < 0.95) issues.push(`核心有效 nutritionText 准确率不足 95%：当前 ${formatPercent(metrics.coreNutritionAccuracy)}`);
  if (metrics.ingredientFalsePositiveRate > 0.05) issues.push(`配料表误判率超过 5%：当前 ${formatPercent(metrics.ingredientFalsePositiveRate)}`);
  if (metrics.nutritionAsIngredientRate > 0.03) issues.push(`营养成分误入配料超过 3%：当前 ${formatPercent(metrics.nutritionAsIngredientRate)}`);
  if (metrics.otherAsIngredientRate > 0.03) issues.push(`广告/生产信息误入配料超过 3%：当前 ${formatPercent(metrics.otherAsIngredientRate)}`);
  if ((metrics.chatgptAverageScore ?? 0) < 85) issues.push(`ChatGPT Review 未达到 85：当前 ${metrics.chatgptAverageScore ?? 'skipped'}`);
  if ((metrics.deepseekAverageScore ?? 0) < 85) issues.push(`DeepSeek Review 未达到 85：当前 ${metrics.deepseekAverageScore ?? 'skipped'}`);
  return issues.map((item) => `- ${item}`).join('\n') || '- none';
}

function formatSampleSourceIssues(errors) {
  const items = Array.isArray(errors) ? errors : [];
  if (!items.length) return '- none';
  return items.slice(0, 12).map((item) => {
    const bucket = item.bucket || 'unknown';
    const page = Number(item.page || 0);
    const pageText = page ? ` page ${page}` : '';
    return `- ${bucket}${pageText}: ${item.message || 'unknown_error'}`;
  }).join('\n');
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function formatMaturityStage(stage) {
  const labels = {
    build_100_gold: '清洗 100 样本 gold set',
    ready_to_expand_500: '已达 95%，准备扩样到 500',
    validate_500: '500 样本验证中',
    stable_500: '500 样本稳定达标'
  };
  return labels[stage] || stage || 'unknown';
}

function normalizeOcrServiceUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function clean(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function safeId(value) {
  return String(value || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function roundNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Math.round(number * 1000) / 1000;
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
