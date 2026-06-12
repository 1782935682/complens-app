import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getProductArchives } from '../services/productArchiveService.js';
import { riskGradeLabel } from '../services/reportService.js';
import { getFavoriteIngredients, isInCompare } from '../store/userStore.js';

export function renderFavoritesPage(category = 'cosmetics', tab = 'ingredients') {
  const currentCategory = getProductCategory(category);
  const favorites = getFavoriteIngredients(category);
  const favoriteProducts = getProductArchives({ category, isFavorite: true });
  const activeTab = tab === 'products' ? 'products' : 'ingredients';

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本地保存</p>
          <h1>收藏夹</h1>
        </div>
        <span class="count">${activeTab === 'products' ? favoriteProducts.length : favorites.length} 项</span>
      </div>

      <nav class="favorites-tabs" aria-label="收藏夹分类">
        <a class="${activeTab === 'ingredients' ? 'is-active' : ''}" href="#${categoryPath(category, '/favorites')}" data-route>
          收藏成分
          <span>${favorites.length}</span>
        </a>
        <a class="${activeTab === 'products' ? 'is-active' : ''}" href="#${categoryPath(category, '/favorites')}?tab=products" data-route>
          收藏产品
          <span>${favoriteProducts.length}</span>
        </a>
      </nav>

      ${activeTab === 'products'
        ? renderFavoriteProducts(category, favoriteProducts)
        : renderFavoriteIngredients(category, favorites)}
    </section>
  `;
}

function renderFavoriteIngredients(category, favorites) {
  return html`
      <div class="compare-inline">
        <a class="inline-link" href="#${categoryPath(category, '/compare')}" data-route>查看成分对比</a>
        <span class="save-status" data-compare-status role="status" aria-live="polite"></span>
      </div>
      ${favorites.length
        ? `<div class="card-grid">${favorites.map((item) => favoriteCard(item, category)).join('')}</div>`
        : renderEmptyFavorites(category)}
  `;
}

function renderFavoriteProducts(category, products) {
  return products.length
    ? html`<div class="product-grid favorite-product-grid">${products.map(favoriteProductCard).join('')}</div>`
    : html`
      <div class="empty-state" data-empty-favorite-products>
        <div class="empty-state-icon" aria-hidden="true">藏</div>
        <p class="empty-state-title">暂无收藏产品</p>
        <p class="empty-state-desc">可在分析历史或产品档案中收藏常看的产品。</p>
        <a class="button-link" href="#${categoryPath(category, '/history')}" data-route>查看分析历史</a>
      </div>
    `;
}

function renderEmptyFavorites(category) {
  return html`
    <div class="empty-state" data-empty-favorites>
      <div class="empty-state-icon" aria-hidden="true">藏</div>
      <p class="empty-state-title">暂无收藏成分</p>
      <p class="empty-state-desc">去搜索成分后，可以把常查成分加入收藏。</p>
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

function favoriteProductCard(product) {
  return html`
    <article class="product-card" data-favorite-product-card>
      <a class="product-card__thumb" href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>
        ${product.thumbnailDataUrl
          ? html`<img src="${escapeHtml(product.thumbnailDataUrl)}" alt="${escapeHtml(product.productName)}缩略图" />`
          : html`<span>无图</span>`}
      </a>
      <div class="product-card__body">
        <span class="report-card__date">${formatFavoriteProductDate(product.createdAt)}</span>
        <h2><a href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>${escapeHtml(product.productName)}</a></h2>
        ${product.brandName ? html`<p>${escapeHtml(product.brandName)}</p>` : ''}
        <div class="report-card__meta">
          <span>评级 ${escapeHtml(product.riskGrade)} · ${escapeHtml(riskGradeLabel(product.riskGrade))}</span>
          <span>${Number(product.parsedIngredients?.length) || 0} 项配料</span>
        </div>
      </div>
      <div class="report-card__actions">
        <button type="button" class="secondary" data-toggle-product-favorite="${escapeHtml(product.id)}">取消收藏</button>
      </div>
    </article>
  `;
}

function formatFavoriteProductDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期未知';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
