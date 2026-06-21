import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(projectRoot, '..');
const datasetRoot = join(repoRoot, 'datasets', 'ocr_samples');
const rawDir = join(datasetRoot, 'raw');
const labelsDir = join(datasetRoot, 'labels');
const reportsDir = join(repoRoot, 'reports', 'ocr');
const manifestPath = join(labelsDir, 'samples.json');
const publicSamplesPath = join(labelsDir, 'public-web-samples.json');
const reportPath = join(reportsDir, 'public-sample-ingest-report.md');
const variants = [
  {
    id: 'tilted',
    description: 'local robustness transform: rotate 2 degrees on white background',
    args: ['-background', 'white', '-rotate', '2']
  },
  {
    id: 'soft-blur',
    description: 'local robustness transform: mild blur',
    args: ['-blur', '0x0.45']
  },
  {
    id: 'bright',
    description: 'local robustness transform: mild brightness and contrast increase',
    args: ['-brightness-contrast', '8x5']
  }
];

await Promise.all([labelsDir, reportsDir, rawDir].map((dir) => mkdir(dir, { recursive: true })));

const baseSamples = buildPublicSamples();
const convertAvailable = await hasConvert();
const generated = [];
const skipped = [];

for (const sample of baseSamples) {
  if (!existsSync(sample.imagePath)) {
    skipped.push({ sampleId: sample.sampleId, reason: 'missing_downloaded_image', imagePath: sample.imagePath });
    continue;
  }
  generated.push(sample);
  if (!convertAvailable) {
    skipped.push({ sampleId: sample.sampleId, reason: 'imagemagick_convert_unavailable', imagePath: sample.imagePath });
    continue;
  }
  for (const variant of variants) {
    const variantSample = buildVariantSample(sample, variant);
    try {
      await createVariant(sample.imagePath, variantSample.imagePath, variant.args);
      generated.push(variantSample);
    } catch (error) {
      skipped.push({
        sampleId: variantSample.sampleId,
        reason: error instanceof Error ? error.message : String(error),
        imagePath: variantSample.imagePath
      });
    }
  }
}

const manifest = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { samples: [] };
const mergedSamples = mergeSamples(Array.isArray(manifest.samples) ? manifest.samples : [], generated);
const payload = {
  ...manifest,
  publicWebSamplesUpdatedAt: new Date().toISOString(),
  publicWebSamplePolicy: 'Public web samples keep sourceUrl/imageUrl provenance. Derived variants are local evaluation transforms and are not independent web sources.',
  samples: mergedSamples
};

await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(publicSamplesPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  policy: payload.publicWebSamplePolicy,
  sourceCount: baseSamples.length,
  generatedCount: generated.length,
  skipped,
  samples: generated
}, null, 2)}\n`, 'utf8');
await writeFile(reportPath, buildMarkdown({
  previousCount: Array.isArray(manifest.samples) ? manifest.samples.length : 0,
  generated,
  skipped,
  finalCount: mergedSamples.length,
  convertAvailable
}), 'utf8');

console.log(JSON.stringify({
  previousCount: Array.isArray(manifest.samples) ? manifest.samples.length : 0,
  generatedCount: generated.length,
  skippedCount: skipped.length,
  finalCount: mergedSamples.length,
  convertAvailable,
  reportPath
}, null, 2));

function buildPublicSamples() {
  const fdaPage = 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-facts-label-images-download';
  const ncStateAllergenPage = 'https://foodsafetyrepository.ces.ncsu.edu/food-labeling-and-allergens/';
  const sugarLabellingPage = 'https://www.makingsenseofsugar.com/lat-en/balanced-diet/food-labelling';
  const customAnyIngredientPage = 'https://customany.com/ingredient-labels-guide/';
  const fdaExpected = expected({
    nutritionText: [
      'Nutrition Facts',
      'Calories 230',
      'Total Fat 8g',
      'Saturated Fat 1g',
      'Cholesterol 0mg',
      'Sodium 160mg',
      'Total Carbohydrate 37g',
      'Dietary Fiber 4g',
      'Total Sugars 12g',
      'Protein 3g',
      'Vitamin D 2mcg',
      'Calcium 260mg',
      'Iron 8mg',
      'Potassium 240mg'
    ].join('\n')
  });
  return [
    publicSample({
      sampleId: 'public-ncstate-allergen-lists',
      sourceUrl: ncStateAllergenPage,
      imageUrl: 'https://eit-wagpress-prod.s3.amazonaws.com/media/images/2024-06-Screenshot-2024-06-05-160515.max-1200x700.png',
      fileName: 'public-ncstate-allergen-lists.png',
      category: 'public_label_example:ingredients_allergen',
      expected: expected({
        ingredientsText: 'Enriched flour, sugar, partially hydrogenated cottonseed oil, whey, eggs, vanilla, natural and artificial flavoring, salt, leavening, lecithin, mono- and diglycerides',
        otherText: ['Contains: Wheat, Milk, Egg, and Soy']
      })
    }),
    publicSample({
      sampleId: 'public-sugar-ingredient-list',
      sourceUrl: sugarLabellingPage,
      imageUrl: 'https://www.makingsenseofsugar.com/perch/resources/label2-4.jpg',
      fileName: 'public-sugar-ingredient-list.jpg',
      category: 'public_label_example:ingredients_allergen',
      expected: expected({
        ingredientsText: 'Wheat Flour, Rice Flour, Sugar, Eggs, Vegetable Oil, Margarine, Soy Lecithin, Mono and Diglycerides, Artificial Flavors, Sodium Benzoate, Potassium Sorbate, TBHQ, Citric Acid, Cornstarch, Baking Powder, Ammonium Bicarbonate, Iodized Salt, Vanilla Essence, Yeast',
        otherText: ['Allergens: Wheat gluten, Eggs and Soy Lecithin']
      })
    }),
    publicSample({
      sampleId: 'public-customany-preservatives',
      sourceUrl: customAnyIngredientPage,
      imageUrl: 'https://customany.com/wp-content/uploads/2023/12/List-chemical-preservatives-by-their-common-name.jpg',
      fileName: 'public-customany-preservatives.jpg',
      category: 'public_label_example:ingredients_blurry_crop',
      expected: expected({
        ingredientsText: 'Sugar, natural flavors, acid, sodium benzoate, preservative, yellow 6'
      })
    }),
    publicSample({
      sampleId: 'public-fda-nutrition-label-1',
      sourceUrl: fdaPage,
      imageUrl: 'https://www.fda.gov/files/nutrition-facts-label-download-image1.jpg',
      fileName: 'public-fda-nutrition-label-1.jpg',
      category: 'public_fda:nutrition',
      expected: fdaExpected
    }),
    publicSample({
      sampleId: 'public-fda-nutrition-label-2',
      sourceUrl: fdaPage,
      imageUrl: 'https://www.fda.gov/files/nutrition-facts-label-download-image2.jpg',
      fileName: 'public-fda-nutrition-label-2.jpg',
      category: 'public_fda:nutrition',
      expected: fdaExpected
    }),
    publicSample({
      sampleId: 'public-fda-nutrition-label-3',
      sourceUrl: fdaPage,
      imageUrl: 'https://www.fda.gov/files/nutrition-facts-label-download-image3.jpg',
      fileName: 'public-fda-nutrition-label-3.jpg',
      category: 'public_fda:nutrition',
      expected: fdaExpected
    }),
    publicSample({
      sampleId: 'public-fda-nutrition-label-4',
      sourceUrl: fdaPage,
      imageUrl: 'https://www.fda.gov/files/nutrition-facts-label-download-image4.jpg',
      fileName: 'public-fda-nutrition-label-4.jpg',
      category: 'public_fda:nutrition',
      expected: fdaExpected
    }),
    publicSample({
      sampleId: 'public-fda-dual-column-nutrition',
      sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/calories-nutrition-facts-label',
      imageUrl: 'https://www.fda.gov/files/calories_on_the_new_nutrition_facts_label_-_dual_column_sample.png',
      fileName: 'public-fda-dual-column-nutrition.png',
      category: 'public_fda:nutrition',
      expected: expected({
        nutritionText: [
          'Nutrition Facts',
          'Calories 220',
          'Total Fat 5g',
          'Saturated Fat 2g',
          'Cholesterol 15mg',
          'Sodium 240mg',
          'Total Carb 35g',
          'Dietary Fiber 6g',
          'Total Sugars 7g',
          'Protein 9g',
          'Vitamin D 5mcg',
          'Calcium 200mg',
          'Iron 1mg',
          'Potassium 470mg'
        ].join('\n')
      })
    }),
    publicSample({
      sampleId: 'public-iqilu-cn-nutrition',
      sourceUrl: 'https://food.iqilu.com/jujiao/2020/0519/4547120.shtml',
      imageUrl: 'https://img5.iqilu.com/c/u/2020/0519/1589873044627.jpg',
      fileName: 'public-iqilu-cn-nutrition.jpg',
      category: 'public_chinese:nutrition',
      expected: expected({
        nutritionText: [
          '营养成分表',
          '能量 1538kJ',
          '蛋白质 1.1g',
          '脂肪 0.6g',
          '碳水化合物 88.1g',
          '钠 55mg'
        ].join('\n')
      })
    }),
    publicSample({
      sampleId: 'public-clemson-6-parts-label',
      sourceUrl: 'https://www.clemson.edu/public/lph/scmpid/requirements/package-labeling.html',
      imageUrl: 'https://www.clemson.edu/public/lph/scmpid/images/6partstolabel.jpg',
      fileName: 'public-clemson-6-parts-label.jpg',
      category: 'public_label_example:ingredients',
      expected: expected({
        ingredientsText: 'BEEF AND PORK, WATER, SALT, CORN SYRUP, DEXTROSE, FLAVORING, SODIUM ERYTHORBATE',
        productName: 'FRANKFURTERS',
        otherText: ['KEEP REFRIGERATED', 'JOHN DOE PACKING CO.', 'NET WEIGHT 16 OZ.']
      })
    }),
    publicSample({
      sampleId: 'public-cookwareninja-expiration-shelf-life',
      sourceUrl: 'https://cookwareninja.com/expiration-date-vs-shelf-life/',
      imageUrl: 'https://cookwareninja.com/wp-content/uploads/Expiration-Date-vs.-Shelf-Life.jpeg',
      fileName: 'public-cookwareninja-expiration-shelf-life.jpeg',
      category: 'public_label_example:production_date_only',
      expected: expected({ otherText: ['Expiration Date', 'Shelf Life', 'Best Before'] })
    })
  ];
}

function publicSample(input) {
  return {
    sampleId: input.sampleId,
    sourceUrl: input.sourceUrl,
    imageUrl: input.imageUrl,
    imagePath: join(rawDir, input.fileName),
    category: input.category,
    expected: input.expected,
    sourceTier: 'S2_public_web_label',
    sourcePolicy: 'local evaluation only; keep URL and structured result, do not package image binary'
  };
}

function expected(overrides = {}) {
  return {
    ingredientsText: '',
    nutritionText: '',
    productName: '',
    brand: '',
    codeInfo: '',
    otherText: [],
    ...overrides
  };
}

function buildVariantSample(sample, variant) {
  const sampleId = `${sample.sampleId}-${variant.id}`;
  return {
    ...sample,
    sampleId,
    imagePath: join(rawDir, `${sampleId}.jpg`),
    variantOf: sample.sampleId,
    variantTransform: variant.description
  };
}

async function hasConvert() {
  try {
    await execFileAsync('convert', ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function createVariant(inputPath, outputPath, args) {
  if (existsSync(outputPath)) return;
  await execFileAsync('convert', [inputPath, ...args, outputPath], { timeout: 15000 });
}

function mergeSamples(existing, additions) {
  const additionsById = new Map(additions.map((sample) => [sample.sampleId, sample]));
  const nonPublicExisting = existing.filter((sample) => !sample.sampleId.startsWith('public-') && !additionsById.has(sample.sampleId));
  return [
    ...nonPublicExisting,
    ...sortPublicSamplesForEvaluation(additions)
  ];
}

function sortPublicSamplesForEvaluation(samples) {
  const roleRank = (sample) => {
    if (sample.expected?.ingredientsText) return 0;
    if (sample.expected?.nutritionText) return 1;
    return 2;
  };
  const variantRank = (sample) => {
    if (!sample.variantOf) return 0;
    if (sample.variantTransform?.includes('rotate')) return 1;
    if (sample.variantTransform?.includes('blur')) return 2;
    return 3;
  };
  return [...samples].sort((left, right) => roleRank(left) - roleRank(right)
    || String(left.variantOf || left.sampleId).localeCompare(String(right.variantOf || right.sampleId))
    || variantRank(left) - variantRank(right));
}

function buildMarkdown(input) {
  const roleSummary = summarize(input.generated);
  return `# Public OCR Sample Ingest Report

Generated: ${new Date().toISOString()}

## Summary

- previousManifestSamples: ${input.previousCount}
- generatedPublicSamples: ${input.generated.length}
- finalManifestSamples: ${input.finalCount}
- imageMagickConvertAvailable: ${input.convertAvailable ? 'yes' : 'no'}
- ingredientsSamplesAdded: ${roleSummary.ingredients}
- nutritionSamplesAdded: ${roleSummary.nutrition}
- otherSamplesAdded: ${roleSummary.other}

## Policy

- Public images are cached only for local evaluation.
- Source URL and direct image URL are retained for audit.
- Derived variants keep \`variantOf\` and \`variantTransform\`; they are not independent web sources.
- Raw image binaries, OCR text and per-sample result JSON are ignored by git.

## Skipped

${input.skipped.map((item) => `- ${item.sampleId}: ${item.reason}`).join('\n') || '- none'}
`;
}

function summarize(samples) {
  return {
    ingredients: samples.filter((sample) => sample.expected.ingredientsText).length,
    nutrition: samples.filter((sample) => sample.expected.nutritionText).length,
    other: samples.filter((sample) => !sample.expected.ingredientsText && !sample.expected.nutritionText).length
  };
}
