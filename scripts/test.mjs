import assert from 'node:assert/strict';
import { analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { formatAllergenNames, getAllergensByIds, getMatchingTextAllergens, getMatchingUserAllergens } from '../src/services/allergenService.js';
import { analyzeIngredientText, getIngredientById, searchIngredients } from '../src/services/ingredientService.js';
import { categoryPath } from '../src/data/categories.js';
import { extractIngredientsFromImage } from '../src/services/ocrService.js';
import { renderFoodAdditiveDetails } from '../src/pages/detailPage.js';
import { renderAnalyzePage } from '../src/pages/analyzePage.js';
import { renderSettingsPage } from '../src/pages/settingsPage.js';
import { ingredientCard } from '../src/components/render.js';
import { resolveRoute } from '../src/router/router.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { readJson, writeJson } from '../src/services/storageService.js';
import { getFavoriteIngredients, getFavoriteItems, getUserAllergens, setUserAllergens, toggleFavorite } from '../src/store/userStore.js';
import { normalizeText, splitIngredientInput, SAMPLES } from '../src/utils/text.js';
import { validateFoodAdditives } from './validate-data.mjs';

assert.equal(getIngredientById('niacinamide').nameCn, '烟酰胺');
assert.deepEqual(resolveRoute('#/food/search?q=E330'), { view: 'search', category: 'food', query: 'E330' });
assert.deepEqual(resolveRoute('#/cosmetics/ingredient/niacinamide'), { view: 'detail', category: 'cosmetics', id: 'niacinamide' });
assert.deepEqual(resolveRoute('#/search?q=BHA'), { view: 'search', category: 'cosmetics', query: 'BHA' });
assert.deepEqual(resolveRoute('#/settings'), { view: 'settings', category: 'food' });
assert.deepEqual(resolveRoute('#/food/settings'), { view: 'settings', category: 'food' });
assert.deepEqual(resolveRoute('#/cosmetics/settings'), { view: 'settings', category: 'cosmetics' });
assert.equal(categoryPath('food', '/search'), '/food/search');

const cnResults = searchIngredients('烟酰胺');
assert.equal(cnResults[0].id, 'niacinamide');

const enResults = searchIngredients('BHA');
assert.equal(enResults[0].id, 'salicylic-acid');
assert.equal(searchIngredients('E330', 'food')[0].id, 'citric-acid');
assert.equal(searchIngredients('INS 211', 'food')[0].id, 'sodium-benzoate');
assert.deepEqual(searchIngredients('40 mg', 'food'), []);
assert.equal(getIngredientById('sulfur-dioxide', 'food').allergenTypes[0], 'sulphites');

assert.deepEqual(splitIngredientInput('水，烟酰胺; 香精\n水杨酸'), ['水', '烟酰胺', '香精', '水杨酸']);
assert.deepEqual(splitIngredientInput('苯氧乙醇(防腐剂)，香精（香料）'), ['苯氧乙醇', '香精']);

const analysis = analyzeIngredientText('水，烟酰胺，透明质酸钠，水杨酸，香精，未知成分');
assert.equal(analysis.matchedCount, 4);
assert.deepEqual(analysis.highlights.map((item) => item.id), ['salicylic-acid', 'fragrance']);
assert.deepEqual(analysis.unknownItems, ['水', '未知成分']);
assert.match(analysis.summary, /已匹配 4 项成分/);

const foodAnalysis = analyzeIngredientText('柠檬酸，山梨酸钾，焦亚硫酸钠，未知添加剂', 'food');
assert.equal(foodAnalysis.matchedCount, 3);
assert.deepEqual(foodAnalysis.highlights.map((item) => item.id), ['potassium-sorbate', 'sodium-metabisulfite']);
assert.deepEqual(foodAnalysis.unknownItems, ['未知添加剂']);

const aiResult = await analyzeIngredientsByAI('烟酰胺');
assert.equal(aiResult.enabled, false);
assert.match(aiResult.message, /服务端代理/);

const ocrResult = await extractIngredientsFromImage({ name: 'ingredient-list.png' });
assert.equal(ocrResult.enabled, false);
assert.equal(ocrResult.text, '');
assert.match(ocrResult.message, /图片识别接口已预留/);

assert.equal(standardAllergenTypes.length, 14);
assert.deepEqual(validateFoodAdditives(), []);

const originalWindow = globalThis.window;
globalThis.window = {
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('QuotaExceededError');
    }
  }
};
writeJson('compcheck:test-quota-fallback', ['ok']);
assert.deepEqual(readJson('compcheck:test-quota-fallback', []), ['ok']);
globalThis.window = originalWindow;

writeJson('compcheck:favorites', ['niacinamide']);
assert.deepEqual(getFavoriteItems(), [{ id: 'niacinamide', category: 'cosmetics' }]);
assert.equal(getFavoriteIngredients('cosmetics')[0].id, 'niacinamide');
assert.deepEqual(getFavoriteIngredients('food'), []);
toggleFavorite('citric-acid', 'food');
assert.deepEqual(getFavoriteItems(), [
  { id: 'citric-acid', category: 'food' },
  { id: 'niacinamide', category: 'cosmetics' }
]);

const originalUserAllergens = getUserAllergens();
assert.deepEqual(setUserAllergens(['milk', 'milk', '', 'soybeans']), ['milk', 'soybeans']);
assert.deepEqual(getUserAllergens(), ['milk', 'soybeans']);
const settingsHtml = renderSettingsPage();
assert.match(settingsHtml, /过敏原档案/);
assert.match(settingsHtml, /2 项已关注/);
assert.match(settingsHtml, /value="milk" checked/);
assert.match(settingsHtml, /value="soybeans" checked/);
assert.match(settingsHtml, /value="peanuts"/);

const analyzeHtmlWithAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithAllergens, /您当前关注的过敏原档案：/);
assert.match(analyzeHtmlWithAllergens, /乳及乳制品、大豆/);
assert.match(analyzeHtmlWithAllergens, /发现过敏原成分/);
assert.match(analyzeHtmlWithAllergens, /过敏原：大豆/);
assert.match(analyzeHtmlWithAllergens, /全脂奶粉/);
assert.match(analyzeHtmlWithAllergens, /过敏原：乳及乳制品/);
assert.match(analyzeHtmlWithAllergens, /普通食品原料或标签文本（非添加剂匹配）/);
assert.match(analyzeHtmlWithAllergens, /不作为医疗、健康或诊断建议/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /遵医嘱/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/lecithins"/);
assert.match(analyzeHtmlWithAllergens, /href="#\/food\/ingredient\/sodium-metabisulfite"/);
assert.doesNotMatch(analyzeHtmlWithAllergens, /您尚未设置关注的过敏原/);
setUserAllergens([]);
const analyzeHtmlWithoutAllergens = renderAnalyzePage(SAMPLES['food-2'], 'food');
assert.match(analyzeHtmlWithoutAllergens, /您尚未设置关注的过敏原/);
assert.doesNotMatch(analyzeHtmlWithoutAllergens, /发现过敏原成分/);
setUserAllergens(originalUserAllergens);

const foodCardHtml = ingredientCard(getIngredientById('citric-acid', 'food'));
assert.match(foodCardHtml, /href="#\/food\/ingredient\/citric-acid"/);
const emptyHrefCardHtml = ingredientCard(getIngredientById('citric-acid', 'food'), { href: '' });
assert.match(emptyHrefCardHtml, /href=""/);
const noIdCardHtml = ingredientCard({ nameCn: '待确认', description: '暂无说明', riskLevel: 'unknown', category: '未分类' });
assert.doesNotMatch(noIdCardHtml, /href="#\/food\/ingredient\/undefined"/);
assert.match(noIdCardHtml, /<div class="ingredient-card__main">/);

const unsafeAnalyzeHtml = renderAnalyzePage('<img src=x onerror=alert(1)>', 'food');
assert.doesNotMatch(unsafeAnalyzeHtml, /<img src=x onerror=alert\(1\)>/);
assert.match(unsafeAnalyzeHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);

const invalidFoodAdditive = {
  id: 'bad-food-additive',
  kind: 'food-additive',
  nameCn: '测试添加剂',
  description: '测试数据',
  category: '测试',
  gbCode: 'INS 000',
  gbStatus: 'permitted',
  riskLevel: 'unknown',
  aliases: [],
  functions: [],
  suitableFor: [],
  cautionFor: [],
  usageLimits: [],
  foodCategories: [],
  allergenTypes: [],
  cautionGroups: [],
  sourceReferences: [{ title: '测试来源', standard: '测试标准' }],
  reviewStatus: 'draft',
  dataVersion: 'test',
  updatedAt: '2026-06-10'
};
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /sourceNote is required/);
assert.match(validateFoodAdditives([invalidFoodAdditive]).join('\n'), /dataCategory must be "food"/);
assert.deepEqual(
  getMatchingUserAllergens({ allergenTypes: ['milk', 'soybeans'] }, ['milk']).map((allergen) => allergen.id),
  ['milk']
);
assert.deepEqual(getMatchingUserAllergens({ allergenTypes: cnResults[0].allergenTypes || [] }, ['milk']), []);
assert.deepEqual(getAllergensByIds(null), []);
assert.equal(formatAllergenNames([null, undefined, '', 'milk']), '乳及乳制品');
assert.deepEqual(getMatchingTextAllergens(null, ['milk']), []);
assert.deepEqual(getMatchingTextAllergens('小麦粉', ['cereals-gluten']).map((allergen) => allergen.id), ['cereals-gluten']);
assert.deepEqual(getMatchingTextAllergens('全脂奶粉', ['milk']).map((allergen) => allergen.id), ['milk']);
assert.deepEqual(getMatchingTextAllergens('大豆蛋白', ['soybeans']).map((allergen) => allergen.id), ['soybeans']);
assert.equal(normalizeText('ＡＢＣ １２３'), 'abc 123');
assert.equal(normalizeText('牛奶，鸡蛋。'), '牛奶 鸡蛋');

const foodDetailHtml = renderFoodAdditiveDetails({
  eNumber: 'E330',
  gbCode: 'INS 330',
  gbStatus: 'permitted',
  adi: 'not specified',
  reviewStatus: 'draft',
  foodCategories: ['饮料'],
  usageLimits: [{ foodCategory: '饮料', limit: '按生产需要适量使用', note: '测试说明' }],
  sourceReferences: [
    { title: 'GB 2760', standard: 'GB 2760-2024', region: 'CN', url: 'https://example.com/gb2760' },
    { title: '不安全来源', standard: '测试', region: 'CN', url: 'javascript:alert(1)' }
  ]
});
assert.match(foodDetailHtml, /E330/);
assert.match(foodDetailHtml, /INS 330/);
assert.match(foodDetailHtml, /允许使用/);
assert.match(foodDetailHtml, /草稿（未审核）/);
assert.match(foodDetailHtml, /GB 2760-2024/);
assert.match(foodDetailHtml, /href="https:\/\/example.com\/gb2760"/);
assert.doesNotMatch(foodDetailHtml, /href="javascript:alert/);

assert.equal(renderFoodAdditiveDetails(null), '');
const sparseFoodDetailHtml = renderFoodAdditiveDetails({
  eNumber: null,
  gbCode: undefined,
  gbStatus: undefined,
  adi: 0,
  foodCategories: null,
  usageLimits: [{ foodCategory: null, limit: undefined, note: null }, null],
  sourceReferences: [{ title: undefined, standard: null, region: null }, null]
});
assert.match(sparseFoodDetailHtml, /待确认/);
assert.match(sparseFoodDetailHtml, />0</);
assert.match(sparseFoodDetailHtml, /暂无食品类别/);
assert.match(sparseFoodDetailHtml, /暂无限量信息/);
assert.match(sparseFoodDetailHtml, /暂无来源标题/);
assert.match(sparseFoodDetailHtml, /暂无标准编号/);
assert.doesNotMatch(sparseFoodDetailHtml, /undefined|null/);

// SAMPLES validation and text analysis tests
assert.equal(Object.keys(SAMPLES).length >= 7, true);
assert.equal(typeof SAMPLES['food-2'], 'string');

const biscuitAnalysis = analyzeIngredientText(SAMPLES['food-2'], 'food');
assert.equal(biscuitAnalysis.matchedCount >= 2, true);
assert.equal(biscuitAnalysis.matchedCount, biscuitAnalysis.ingredients.length);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'lecithins'), true);
assert.equal(biscuitAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(biscuitAnalysis.unknownItems.includes('全脂奶粉'), true);

const chiliAnalysis = analyzeIngredientText(SAMPLES['food-4'], 'food');
assert.equal(chiliAnalysis.matchedCount, 4);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-benzoate'), true);
assert.equal(chiliAnalysis.ingredients.some((item) => item.id === 'sodium-metabisulfite'), true);
assert.equal(chiliAnalysis.unknownItems.includes('辣椒'), true);
assert.equal(chiliAnalysis.unknownItems.includes('大蒜'), true);
assert.equal(chiliAnalysis.unknownItems.includes('食盐'), true);

const juiceAnalysis = analyzeIngredientText(SAMPLES['food-3'], 'food');
assert.equal(juiceAnalysis.ingredients.some((item) => item.id === 'potassium-sorbate'), true);

const jellyAnalysis = analyzeIngredientText(SAMPLES['food-5'], 'food');
assert.equal(jellyAnalysis.unknownItems.includes('魔芋粉'), true);

const colaAnalysis = analyzeIngredientText(SAMPLES['food-1'], 'food');
assert.equal(colaAnalysis.ingredients.some((item) => item.id === 'aspartame'), true);

console.log('Tests passed: ingredient search and text analysis behave as expected.');
