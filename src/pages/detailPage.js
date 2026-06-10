import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { getProductCategory } from '../data/categories.js';
import { getIngredientById } from '../services/ingredientService.js';
import { isFavorite } from '../store/userStore.js';

export function renderDetailPage(id, category = 'cosmetics') {
  const currentCategory = getProductCategory(category);
  const ingredient = getIngredientById(id, category);
  if (!ingredient) {
    return html`
      <section class="section">
        <p class="empty">未找到该成分。</p>
        <a class="button-link" href="#/" data-route>返回首页</a>
      </section>
    `;
  }

  const favorite = isFavorite(ingredient.id);
  return html`
    <section class="detail">
      <div class="detail__header">
        <div>
          <p class="eyebrow">${currentCategory.label}</p>
          <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
          <h1>${escapeHtml(ingredient.nameCn)}</h1>
          <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        </div>
        <button class="favorite-button ${favorite ? 'is-active' : ''}" data-favorite-id="${ingredient.id}">
          ${favorite ? '已收藏' : '收藏'}
        </button>
      </div>
      <p class="lead">${escapeHtml(ingredient.description)}</p>
      <div class="info-grid">
        ${renderInfoBlock('别名', ingredient.aliases)}
        ${renderInfoBlock('功能分类', [ingredient.category, ...(ingredient.functions || [])].filter(Boolean))}
        ${renderInfoBlock('适合关注', ingredient.suitableFor)}
        ${renderInfoBlock('使用提醒', ingredient.cautionFor)}
      </div>
      <section class="note">
        <h2>风险说明</h2>
        <p>${escapeHtml(ingredient.riskSummary || '暂无明确风险说明，建议结合产品整体配方和个人耐受判断。')}</p>
      </section>
      <section class="note muted">
        <h2>参考说明</h2>
        <p>${escapeHtml(ingredient.sourceNote || '本页内容仅用于日常成分理解，不提供医疗诊断。')}</p>
      </section>
    </section>
  `;
}

function renderInfoBlock(title, values = []) {
  const items = values.filter(Boolean);
  return html`
    <div class="info-block">
      <h2>${title}</h2>
      ${items.length
        ? `<div class="chip-list">${items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`
        : '<p class="empty small">暂无信息</p>'}
    </div>
  `;
}
