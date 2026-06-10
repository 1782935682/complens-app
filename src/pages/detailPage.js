import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingUserAllergens } from '../services/allergenService.js';
import { getIngredientById, getRelatedIngredients } from '../services/ingredientService.js';
import { getUserAllergens, isFavorite } from '../store/userStore.js';

const GB_STATUS_LABELS = {
  permitted: '允许使用',
  restricted: '限制使用',
  prohibited: '禁止使用',
  unknown: '待确认'
};

const REVIEW_STATUS_LABELS = {
  draft: '草稿（未审核）',
  reviewed: '已复核',
  verified: '已验证'
};

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
  const relatedIngredients = getRelatedIngredients(ingredient.id, category, 4);
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
        ${renderInfoBlock('别名', ingredient.aliases)}
        ${renderFunctionInfoBlock(ingredient, category)}
        ${renderInfoBlock('适合关注', ingredient.suitableFor)}
        ${renderInfoBlock('使用提醒', ingredient.cautionFor)}
      </div>
      ${category === 'food' ? renderFoodAdditiveDetails(ingredient) : ''}
      <section class="note">
        <h2>风险说明</h2>
        <p>${escapeHtml(ingredient.riskSummary || '暂无明确风险说明，建议结合产品整体配方和个人耐受判断。')}</p>
      </section>
      <section class="note muted">
        <h2>参考说明</h2>
        <p>${escapeHtml(ingredient.sourceNote || '本页内容仅用于日常成分理解，不提供医疗诊断。')}</p>
      </section>
      ${renderRelatedIngredients(relatedIngredients, category)}
    </section>
  `;
}

export function renderFoodAdditiveDetails(ingredient) {
  if (!ingredient) {
    return '';
  }

  return html`
    <section class="note food-detail">
      <h2>食品添加剂信息</h2>
      <div class="food-detail-grid">
        ${renderField('E-number', ingredient.eNumber)}
        ${renderField('GB / INS 编号', ingredient.gbCode)}
        ${renderField('GB 2760 状态', gbStatusLabel(ingredient.gbStatus))}
        ${renderField('ADI', ingredient.adi)}
        ${renderField('数据状态', reviewStatusLabel(ingredient.reviewStatus))}
      </div>
      ${renderInfoBlock('适用食品类别', ingredient.foodCategories || [])}
      ${renderUsageLimits(ingredient.usageLimits || [])}
      ${renderSourceReferences(ingredient.sourceReferences || [])}
    </section>
  `;
}

function renderInfoBlock(title, values = []) {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  return html`
    <div class="info-block">
      <h2>${title}</h2>
      ${items.length
        ? `<div class="chip-list">${items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`
        : html`<p class="empty small">暂无信息</p>`}
    </div>
  `;
}

function renderFunctionInfoBlock(ingredient, category) {
  const items = [
    ingredient.category ? {
      label: ingredient.category,
      href: `#${categoryPath(category, '/search')}?ingredientCategory=${encodeURIComponent(ingredient.category)}`
    } : null,
    ...(ingredient.functions || []).filter(Boolean).map((item) => ({
      label: item,
      href: `#${categoryPath(category, '/search')}?q=${encodeURIComponent(item)}`
    }))
  ].filter(Boolean);

  return html`
    <div class="info-block">
      <h2>功能分类</h2>
      ${items.length
        ? `<div class="chip-list">${items.map((item) => `<a class="chip" href="${escapeHtml(item.href)}" data-route>${escapeHtml(item.label)}</a>`).join('')}</div>`
        : html`<p class="empty small">暂无信息</p>`}
    </div>
  `;
}

function valueOrFallback(value, fallback = '暂无') {
  return value == null || value === '' ? fallback : value;
}

function renderField(label, value) {
  const displayValue = value == null || value === '' ? '暂无' : String(value);
  return html`
    <div class="field-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(displayValue)}</strong>
    </div>
  `;
}

function renderUsageLimits(usageLimits) {
  const limits = Array.isArray(usageLimits) ? usageLimits.filter(Boolean) : [];
  return html`
    <div class="food-detail-section">
      <h3>使用限量</h3>
      ${limits.length
        ? `<ul class="data-list">${limits.map((item) => html`
          <li>
            <strong>${escapeHtml(valueOrFallback(item.foodCategory, '暂无食品类别'))}</strong>
            <span>${escapeHtml(valueOrFallback(item.limit, '暂无限量信息'))}</span>
            ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
          </li>
        `).join('')}</ul>`
        : html`<p class="empty small">暂无明确限量信息</p>`}
    </div>
  `;
}

function renderSourceReferences(sourceReferences) {
  const sources = Array.isArray(sourceReferences) ? sourceReferences.filter(Boolean) : [];
  return html`
    <div class="food-detail-section">
      <h3>数据来源</h3>
      ${sources.length
        ? `<ul class="data-list">${sources.map((source) => html`
          <li>
            <strong>${renderSourceTitle(source)}</strong>
            <span>${escapeHtml(valueOrFallback(source.standard, '暂无标准编号'))}</span>
            ${source.region ? `<small>${escapeHtml(source.region)}</small>` : ''}
          </li>
        `).join('')}</ul>`
        : html`<p class="empty small">暂无来源信息</p>`}
    </div>
  `;
}

function renderSourceTitle(source) {
  const title = valueOrFallback(source.title, '暂无来源标题');
  const safeUrl = getSafeHttpUrl(source.url);
  if (!safeUrl) return escapeHtml(title);
  return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`;
}

function renderRelatedIngredients(items, category) {
  if (!items.length) return '';

  return html`
    <section class="section related-section" aria-labelledby="related-ingredients-title" data-related-ingredients>
      <div class="section__head">
        <h2 id="related-ingredients-title">相关成分</h2>
      </div>
      <div class="card-grid related-grid">
        ${items.map((item) => renderRelatedIngredientCard(item, category)).join('')}
      </div>
    </section>
  `;
}

function renderRelatedIngredientCard(ingredient, category) {
  const href = `#${categoryPath(category, `/ingredient/${ingredient.id}`)}`;
  return html`
    <article class="ingredient-card related-card">
      <a href="${escapeHtml(href)}" class="ingredient-card__main compact" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
        <h3>${escapeHtml(ingredient.nameCn)}</h3>
        <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        <p>${escapeHtml(ingredient.description)}</p>
        <div class="meta-row">
          <span>${escapeHtml(ingredient.category || '未分类')}</span>
        </div>
        ${renderRelationReasons(ingredient.relationReasons || [])}
      </a>
    </article>
  `;
}

function renderRelationReasons(reasons) {
  const items = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  if (!items.length) return '';
  return html`
    <div class="related-reasons">
      ${items.map((reason) => `<span>${escapeHtml(reason)}</span>`).join('')}
    </div>
  `;
}

function getSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function gbStatusLabel(status) {
  return GB_STATUS_LABELS[status] || GB_STATUS_LABELS.unknown;
}

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[status] || REVIEW_STATUS_LABELS.draft;
}
