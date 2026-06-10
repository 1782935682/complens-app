import assert from 'node:assert/strict';
import { analyzeIngredientsByAI } from '../src/services/aiAnalysisService.js';
import { analyzeIngredientText, getIngredientById, searchIngredients } from '../src/services/ingredientService.js';
import { extractIngredientsFromImage } from '../src/services/ocrService.js';
import { standardAllergenTypes } from '../src/data/allergens.js';
import { readJson, writeJson } from '../src/services/storageService.js';
import { splitIngredientInput } from '../src/utils/text.js';
import { validateFoodAdditives } from './validate-data.mjs';

assert.equal(getIngredientById('niacinamide').nameCn, '烟酰胺');

const cnResults = searchIngredients('烟酰胺');
assert.equal(cnResults[0].id, 'niacinamide');

const enResults = searchIngredients('BHA');
assert.equal(enResults[0].id, 'salicylic-acid');

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

console.log('Tests passed: ingredient search and text analysis behave as expected.');
