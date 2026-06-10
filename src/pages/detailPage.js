import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingUserAllergens } from '../services/allergenService.js';
import { getIngredientById } from '../services/ingredientService.js';
import { getUserAllergens, isFavorite } from '../store/userStore.js';

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

  const favorite = isFavorite(ingredient.id, category);
  const allergenMatches = getMatchingUserAllergens(ingredient, getUserAllergens());
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
      ${allergenMatches.length ? html`
        <div class="allergen-alert">
          此成分含您关注的过敏原：${escapeHtml(formatAllergenNames(allergenMatches))}
        </div>
      ` : ''}
      <p class="lead">${escapeHtml(ingredient.description)}</p>
      <div class="info-grid">
        ${renderFoodAdditiveInfo(ingredient)}
        ${renderInfoBlock('别名', ingredient.aliases)}
        ${renderInfoBlock('功能分类', [ingredient.category, ...(ingredient.functions || [])].filter(Boolean))}
        ${renderInfoBlock('适合关注', ingredient.suitableFor)}
        ${renderInfoBlock('使用提醒', ingredient.cautionFor)}
      </div>
      ${renderUsageLimits(ingredient)}
      <section class="note">
        <h2>风险说明</h2>
        <p>${escapeHtml(ingredient.riskSummary || '暂无明确风险说明，建议结合产品整体配方和个人耐受判断。')}</p>
      </section>
      ${renderSourceReferences(ingredient)}
      <section class="note muted">
        <h2>参考说明</h2>
        <p>${escapeHtml(ingredient.sourceNote || '本页内容仅用于日常成分理解，不提供医疗诊断。')}</p>
      </section>
    </section>
  `;
}

function renderFoodAdditiveInfo(ingredient) {
  if (ingredient.kind !== 'food-additive') return '';
  return html`
    ${renderInfoBlock('法规编码', [
      ingredient.gbCode,
      ingredient.eNumber,
      gbStatusLabel(ingredient.gbStatus),
      reviewStatusLabel(ingredient.reviewStatus)
    ])}
    ${renderInfoBlock('ADI', [ingredient.adi])}
    ${renderInfoBlock('适用食品类别', ingredient.foodCategories)}
  `;
}

function renderUsageLimits(ingredient) {
  if (ingredient.kind !== 'food-additive' || !ingredient.usageLimits?.length) return '';
  return html`
    <section class="note">
      <h2>使用限量</h2>
      <div class="limit-list">
        ${ingredient.usageLimits.map((item) => html`
          <div class="limit-item">
            <strong>${escapeHtml(item.foodCategory)}</strong>
            <span>${escapeHtml(item.limit)}</span>
            ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSourceReferences(ingredient) {
  if (!ingredient.sourceReferences?.length) return '';
  return html`
    <section class="note muted">
      <h2>数据来源</h2>
      <div class="source-list">
        ${ingredient.sourceReferences.map((source) => html`
          <p>
            ${source.url
              ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>`
              : escapeHtml(source.title)}
            <span>${escapeHtml([source.standard, source.region].filter(Boolean).join(' · '))}</span>
          </p>
        `).join('')}
      </div>
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

function gbStatusLabel(status) {
  const labels = {
    permitted: 'GB：允许使用',
    restricted: 'GB：限量/限范围使用',
    prohibited: 'GB：禁止使用',
    unknown: 'GB：待确认'
  };
  return labels[status] || labels.unknown;
}

function reviewStatusLabel(status) {
  const labels = {
    draft: '数据状态：草稿',
    reviewed: '数据状态：已复核',
    verified: '数据状态：已验证'
  };
  return labels[status] || labels.draft;
}
