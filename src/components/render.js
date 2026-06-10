import { categoryPath } from '../data/categories.js';

// This helper intentionally performs interpolation only. Escape any user-controlled
// or external text with escapeHtml before passing it into a template value.
export function html(strings, ...values) {
  return strings.reduce((result, current, index) => {
    return result + current + (values[index] ?? '');
  }, '');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function riskLabel(level) {
  const labels = {
    low: '低关注',
    medium: '需关注',
    high: '高关注',
    unknown: '未知'
  };
  return labels[level] || labels.unknown;
}

export function riskClass(level) {
  return `risk risk-${level || 'unknown'}`;
}

export function ingredientCard(ingredient, options = {}) {
  const category = typeof options === 'string' ? options : (options.category || 'cosmetics');
  const href = typeof options === 'string' ? '' : options.href;
  const finalHref = href || `#${categoryPath(category, `/ingredient/${ingredient.id}`)}`;
  return html`
    <article class="ingredient-card">
      <a href="${finalHref}" class="ingredient-card__main" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
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
