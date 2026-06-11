import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getFavoriteIngredients, isInCompare } from '../store/userStore.js';

export function renderFavoritesPage(category = 'cosmetics') {
  const currentCategory = getProductCategory(category);
  const favorites = getFavoriteIngredients(category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本地保存</p>
          <h1>收藏夹</h1>
        </div>
        <span class="count">${favorites.length} 项</span>
      </div>
      <div class="compare-inline">
        <a class="inline-link" href="#${categoryPath(category, '/compare')}" data-route>查看成分对比</a>
        <span class="save-status" data-compare-status role="status" aria-live="polite"></span>
      </div>
      ${favorites.length
        ? `<div class="card-grid">${favorites.map((item) => favoriteCard(item, category)).join('')}</div>`
        : renderEmptyFavorites(category)}
    </section>
  `;
}

function renderEmptyFavorites(category) {
  return html`
    <div class="empty-state" data-empty-favorites>
      <p class="empty">暂无收藏，去搜索成分并收藏</p>
      <a class="button-link" href="#${categoryPath(category, '/search')}" data-route>去搜索成分</a>
    </div>
  `;
}

function favoriteCard(ingredient, category) {
  const compared = isInCompare(ingredient.id, category);
  return html`
    <article class="ingredient-card">
      <a href="#${categoryPath(category, `/ingredient/${ingredient.id}`)}" class="ingredient-card__main compact" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
        <h3>${escapeHtml(ingredient.nameCn)}</h3>
        <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        <p>${escapeHtml(ingredient.description)}</p>
        <div class="meta-row">
          <span>${escapeHtml(ingredient.category || '未分类')}</span>
        </div>
      </a>
      <div class="ingredient-card__actions">
        <button type="button" class="secondary ${compared ? 'is-active' : ''}" data-compare-add="${escapeHtml(ingredient.id)}">
          ${compared ? '已加入对比' : '加入对比'}
        </button>
        <button type="button" class="secondary" data-favorite-id="${ingredient.id}">取消收藏</button>
      </div>
    </article>
  `;
}
