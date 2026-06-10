import { escapeHtml, html, ingredientCard, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingTextAllergens, getMatchingUserAllergens } from '../services/allergenService.js';
import { analyzeIngredientText } from '../services/ingredientService.js';
import { getUserAllergens } from '../store/userStore.js';
import { SAMPLE_OPTIONS, SAMPLES } from '../utils/text.js';

/**
 * @param {string} input Raw ingredient-list text from the route query or form.
 * @param {import('../types/ingredient.js').DataCategory} category Active product category.
 */
export function renderAnalyzePage(input = '', category = 'cosmetics') {
  const currentCategory = getProductCategory(category);
  const categoryId = currentCategory.id || 'food';
  const result = analyzeIngredientText(input, categoryId);
  const resultIngredients = result.ingredients.map((ingredient) => withDisplayDefaults(ingredient, categoryId));
  const resultHighlights = result.highlights.map((ingredient) => withDisplayDefaults(ingredient, categoryId));
  const userAllergens = getUserAllergens();
  const ingredientAllergenHits = resultIngredients
    .map((ingredient) => ({
      ingredient,
      allergens: getMatchingUserAllergens(ingredient, userAllergens)
    }))
    .filter((item) => item.allergens.length);
  const textAllergenHits = result.unknownItems
    .map((item) => ({
      item,
      allergens: getMatchingTextAllergens(item, userAllergens)
    }))
    .filter((item) => item.allergens.length);
  const allergenHitCount = ingredientAllergenHits.length + textAllergenHits.length;
  const safeInput = escapeHtml(input);
  const safeSamples = SAMPLES && typeof SAMPLES === 'object' ? SAMPLES : {};
  const sampleOptions = SAMPLE_OPTIONS.filter((sample) => sample.category === categoryId && typeof safeSamples[sample.id] === 'string');

  const activeAllergenNames = formatAllergenNames(userAllergens);
  const allergenStatusHtml = activeAllergenNames
    ? html`<p class="allergen-status">您当前关注的过敏原档案：<strong class="allergen-status__names">${escapeHtml(activeAllergenNames)}</strong></p>`
    : html`<p class="allergen-status">您尚未设置关注的过敏原。您可以到 <a href="#/settings" class="inline-link" data-route>用户设置页</a> 配置个人过敏原档案，系统在分析时会自动高亮警告。</p>`;

  return html`
    <section class="section">
      <div class="section__head analyze-head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 文本识别版</p>
          <h1>成分表分析</h1>
          ${allergenStatusHtml}
        </div>
      </div>
      <form class="analyze-form" data-analyze-form>
        <label for="ingredient-text">粘贴产品成分表</label>
        <textarea id="ingredient-text" name="ingredients" rows="8" placeholder="例如：水，烟酰胺，透明质酸钠，香精">${safeInput}</textarea>
        <div class="upload-field">
          <label for="ingredient-image">上传图片</label>
          <input id="ingredient-image" name="image" type="file" accept="image/*" data-image-input />
          <p class="helper-text" data-image-feedback>当前版本已预留图片识别入口，未接入 OCR 时可使用文本输入。</p>
        </div>
        <div class="form-actions analyze-actions">
          <button type="submit">开始分析</button>
          <div class="sample-picker">
            <label for="sample-select" class="sample-picker__label">示例模板：</label>
            <select id="sample-select" aria-label="示例模板">
              <option value="0">${categoryId === 'food' ? '选择食品配料表示例...' : '选择化妆品成分表示例...'}</option>
              ${sampleOptions.map((sample) => html`<option value="${escapeHtml(sample.id)}">${escapeHtml(sample.label)}</option>`).join('')}
            </select>
          </div>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="summary-box">
        <strong>整体说明</strong>
        <p>${escapeHtml(result.summary)}</p>
      </div>
    </section>

    ${allergenHitCount ? html`
      <section class="section">
        <div class="allergen-alert allergen-alert--cards">
          <h2>发现过敏原成分</h2>
          <p>配料中含有 ${allergenHitCount} 项您关注的过敏原，请谨慎食用：</p>
          <div class="card-grid">
            ${ingredientAllergenHits.map((item) => allergenCard(item.ingredient, item.allergens, categoryId)).join('')}
            ${textAllergenHits.map((item) => textAllergenCard(item.item, item.allergens)).join('')}
          </div>
        </div>
      </section>
    ` : ''}

    ${result.highlights.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>重点关注成分</h2>
        </div>
        <div class="card-grid">${resultHighlights.map((item) => ingredientCard(item, { category: categoryId })).join('')}</div>
      </section>
    ` : ''}

    ${resultIngredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>已匹配成分</h2>
          <span class="count">${result.matchedCount} 项</span>
        </div>
        <div class="card-grid">${resultIngredients.map((item) => ingredientCard(item, { category: categoryId })).join('')}</div>
      </section>
    ` : ''}

    ${result.unknownItems.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>暂未收录</h2>
        </div>
        <div class="chip-list">${result.unknownItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>
      </section>
    ` : ''}

    ${renderDisclaimer()}
  `;
}

function withDisplayDefaults(ingredient, category) {
  const isFood = category === 'food';
  return {
    ...ingredient,
    id: ingredient.id,
    nameCn: ingredient.nameCn || (isFood ? '待确认食品添加剂' : '待确认成分'),
    category: ingredient.category || '未分类',
    description: ingredient.description || '暂无说明',
    riskLevel: ingredient.riskLevel || 'unknown',
    gbStatus: isFood ? ingredient.gbStatus || 'unknown' : ingredient.gbStatus,
    sourceNote: isFood ? ingredient.sourceNote || '暂无来源说明' : ingredient.sourceNote
  };
}

function renderDisclaimer() {
  return html`
    <section class="section">
      <div class="disclaimer-box">
        <h4>免责声明</h4>
        <p>本系统分析结果基于公开学术资料及国家标准（如 GB 2760 等），旨在提供成分科普，不作为医疗、健康或诊断建议。部分成分风险因人而异，特殊人群（如孕妇、婴幼儿、过敏体质者）需遵医嘱或结合自身实际耐受情况综合判断。</p>
      </div>
    </section>
  `;
}

function allergenCard(ingredient, allergens, category) {
  const href = `#${categoryPath(category, `/ingredient/${ingredient.id}`)}`;
  return html`
    <article class="ingredient-card ingredient-card--allergen">
      <a href="${href}" class="ingredient-card__main" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
        <span class="allergen-badge">过敏原：${escapeHtml(formatAllergenNames(allergens))}</span>
        <h3>${escapeHtml(ingredient.nameCn)}</h3>
        <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        <p>${escapeHtml(ingredient.description)}</p>
        <div class="meta-row">
          <span>${escapeHtml(ingredient.category || '未分类')}</span>
        </div>
      </a>
    </article>
  `;
}

function textAllergenCard(item, allergens) {
  return html`
    <article class="ingredient-card ingredient-card--allergen">
      <div class="ingredient-card__main">
        <span class="allergen-badge">过敏原：${escapeHtml(formatAllergenNames(allergens))}</span>
        <h3>${escapeHtml(item)}</h3>
        <p>该标签原文与您关注的过敏原关键词匹配，请结合产品标签确认来源。</p>
        <div class="meta-row">
          <span>标签原文</span>
        </div>
      </div>
    </article>
  `;
}
