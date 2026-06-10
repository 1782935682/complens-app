import { escapeHtml, html, ingredientCard, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingUserAllergens } from '../services/allergenService.js';
import { analyzeIngredientText } from '../services/ingredientService.js';
import { getUserAllergens } from '../store/userStore.js';
import { SAMPLES } from '../utils/text.js';

export function renderAnalyzePage(input = '', category = 'cosmetics') {
  const currentCategory = getProductCategory(category);
  const result = analyzeIngredientText(input, category);
  const userAllergens = getUserAllergens();
  const allergenHits = result.ingredients
    .map((ingredient) => ({
      ingredient,
      allergens: getMatchingUserAllergens(ingredient, userAllergens)
    }))
    .filter((item) => item.allergens.length);
  const safeInput = escapeHtml(input);

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 文本识别版</p>
          <h1>成分表分析</h1>
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
        <div class="form-actions" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <button type="submit">开始分析</button>
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <label for="sample-select" style="margin: 0; font-size: 14px; font-weight: normal; color: var(--text-muted);">示例模板：</label>
            <select id="sample-select" style="min-height: 44px;">
              ${category === 'food' ? html`
                <option value="0">选择食品配料表示例...</option>
                <option value="food-1">示例1：无糖可乐（含有柠檬酸、阿斯巴甜）</option>
                <option value="food-2">示例2：夹心饼干（含有大豆、牛奶、麸质过敏原）</option>
                <option value="food-3">示例3：果汁饮料（含有黄原胶、山梨酸钾）</option>
                <option value="food-4">示例4：蒜蓉辣椒酱（含有焦亚硫酸钠过敏原）</option>
                <option value="food-5">示例5：果味果冻（含有柠檬酸钠、三氯蔗糖）</option>
              ` : html`
                <option value="0">选择化妆品成分表示例...</option>
                <option value="cosmetic-1">示例1：保湿抗衰面霜（含有烟酰胺、水杨酸）</option>
                <option value="cosmetic-2">示例2：温和无刺激洁面乳（含有椰油酰甘氨酸钠）</option>
              `}
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

    ${allergenHits.length ? html`
      <section class="section">
        <div class="allergen-alert" style="border: 2px solid var(--high); background: #fff5f4; border-radius: 8px; padding: 20px;">
          <h2 style="color: var(--high); margin: 0 0 10px 0; font-size: 1.25rem;">⚠️ 发现过敏原成分</h2>
          <p style="margin-bottom: 15px; color: var(--text); font-weight: normal;">配料中含有 ${allergenHits.length} 项您关注的过敏原，请谨慎食用：</p>
          <div class="card-grid">
            ${allergenHits.map((item) => allergenCard(item.ingredient, item.allergens, category)).join('')}
          </div>
        </div>
      </section>
    ` : ''}

    ${result.highlights.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>重点关注成分</h2>
        </div>
        <div class="card-grid">${result.highlights.map((item) => ingredientCard(item, { href: `#${categoryPath(category, `/ingredient/${item.id}`)}` })).join('')}</div>
      </section>
    ` : ''}

    ${result.ingredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>已匹配成分</h2>
          <span class="count">${result.matchedCount} 项</span>
        </div>
        <div class="card-grid">${result.ingredients.map((item) => ingredientCard(item, { href: `#${categoryPath(category, `/ingredient/${item.id}`)}` })).join('')}</div>
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
    <article class="ingredient-card" style="border: 1px solid #f1b8b2; background: #fffefe; box-shadow: var(--shadow);">
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

