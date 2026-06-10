import assert from 'node:assert/strict';
import { analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { getMatchingUserAllergens } from '../src/services/allergenService.js';
import { analyzeIngredientText, getIngredientById, searchIngredients } from '../src/services/ingredientService.js';
import { categoryPath } from '../src/data/categories.js';
import { extractIngredientsFromImage } from '../src/services/ocrService.js';
import { renderFoodAdditiveDetails } from '../src/pages/detailPage.js';
import { resolveRoute } from '../src/router/router.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { readJson, writeJson } from '../src/services/storageService.js';
import { getFavoriteIngredients, getFavoriteItems, getUserAllergens, setUserAllergens, toggleFavorite } from '../src/store/userStore.js';
import { splitIngredientInput } from '../src/utils/text.js';
import { validateFoodAdditives } from './validate-data.mjs';

assert.equal(getIngredientById('niacinamide').nameCn, '烟酰胺');
assert.deepEqual(resolveRoute('#/food/search?q=E330'), { view: 'search', category: 'food', query: 'E330' });
assert.deepEqual(resolveRoute('#/cosmetics/ingredient/niacinamide'), { view: 'detail', category: 'cosmetics', id: 'niacinamide' });
assert.deepEqual(resolveRoute('#/search?q=BHA'), { view: 'search', category: 'cosmetics', query: 'BHA' });
assert.equal(categoryPath('food', '/search'), '/food/search');

const cnResults = searchIngredients('烟酰胺');
assert.equal(cnResults[0].id, 'niacinamide');

const enResults = searchIngredients('BHA');
assert.equal(enResults[0].id, 'salicylic-acid');
assert.deepEqual(searchIngredients('E330', 'food'), []);

assert.deepEqual(splitIngredientInput('水，烟酰胺; 香精\n水杨酸'), ['水', '烟酰胺', '香精', '水杨酸']);
assert.deepEqual(splitIngredientInput('苯氧乙醇(防腐剂)，香精（香料）'), ['苯氧乙醇', '香精']);

const analysis = analyzeIngredientText('水，烟酰胺，透明质酸钠，水杨酸，香精，未知成分');
assert.equal(analysis.matchedCount, 4);
assert.deepEqual(analysis.highlights.map((item) => item.id), ['salicylic-acid', 'fragrance']);
assert.deepEqual(analysis.unknownItems, ['水', '未知成分']);
assert.match(analysis.summary, /已匹配 4 项成分/);

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

assert.deepEqual(setUserAllergens(['milk', 'milk', '', 'soybeans']), ['milk', 'soybeans']);
assert.deepEqual(getUserAllergens(), ['milk', 'soybeans']);

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

const foodDetailHtml = renderFoodAdditiveDetails({
  eNumber: 'E330',
  gbCode: 'INS 330',
  gbStatus: 'permitted',
  adi: 'not specified',
  foodCategories: ['饮料'],
  usageLimits: [{ foodCategory: '饮料', limit: '按生产需要适量使用', note: '测试说明' }],
  sourceReferences: [{ title: 'GB 2760', standard: 'GB 2760-2024', region: 'CN' }]
});
assert.match(foodDetailHtml, /E330/);
assert.match(foodDetailHtml, /INS 330/);
assert.match(foodDetailHtml, /允许使用/);
assert.match(foodDetailHtml, /GB 2760-2024/);

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

console.log('Tests passed: ingredient search and text analysis behave as expected.');
