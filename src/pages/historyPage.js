import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getProductArchives } from '../services/productArchiveService.js';
import { riskGradeLabel } from '../services/reportService.js';

export const HISTORY_DISPLAY_LIMIT = 50;
export const HISTORY_FILTERS = ['all', 'favorite', 'concern'];

const HIGH_CONCERN_GRADES = ['C', 'D', 'F'];

export function renderHistoryPage(category = 'food', query = '', filter = 'all') {
  const currentCategory = getProductCategory(category);
  const normalizedQuery = String(query || '').trim();
  const normalizedFilter = normalizeHistoryFilter(filter);
  const allProducts = getProductArchives({ category });
  const filteredProducts = filterHistoryProducts(
    getProductArchives({ category, search: normalizedQuery }),
    normalizedFilter
  );
  const visibleProducts = filteredProducts.slice(0, HISTORY_DISPLAY_LIMIT);

  return html`
    <section class="section history-page">
      <div class="section__head history-page__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本机记录</p>
          <h1>分析历史</h1>
        </div>
        <div class="history-page__head-actions">
          <span class="count">${renderHistoryCount(filteredProducts.length, visibleProducts.length, normalizedQuery, normalizedFilter)}</span>
          ${allProducts.length ? html`<button type="button" class="secondary" data-clear-product-history="${escapeHtml(category)}">清空全部</button>` : ''}
        </div>
      </div>

      <form class="report-search" data-history-search-form>
        <label for="history-query">搜索产品名称或配料</label>
        <div class="report-search__row">
          <input id="history-query" type="search" name="q" value="${escapeHtml(normalizedQuery)}" placeholder="输入产品名、品牌、配料或标签" />
          <input type="hidden" name="filter" value="${escapeHtml(normalizedFilter)}" />
          <button type="submit" class="secondary">搜索</button>
          ${normalizedQuery ? html`<a class="button-link secondary-link" href="${buildHistoryHref(category, normalizedFilter)}" data-route>清除</a>` : ''}
        </div>
      </form>

      ${renderHistoryFilterTabs(category, normalizedFilter, normalizedQuery)}

      ${visibleProducts.length
        ? html`
          <div class="history-product-list" data-history-list>
            ${visibleProducts.map(historyCard).join('')}
          </div>
          ${filteredProducts.length > visibleProducts.length
            ? html`<p class="helper-text">当前仅展示最近 ${HISTORY_DISPLAY_LIMIT} 条，更多记录仍保存在本机产品档案中。</p>`
            : ''}
        `
        : renderEmptyHistory(category, normalizedQuery, normalizedFilter)}
    </section>
  `;
}

export function normalizeHistoryFilter(value) {
  return HISTORY_FILTERS.includes(value) ? value : 'all';
}

export function isHighConcernProduct(product) {
  return HIGH_CONCERN_GRADES.includes(product?.riskGrade);
}

function filterHistoryProducts(products, filter) {
  if (filter === 'favorite') return products.filter((item) => item.isFavorite);
  if (filter === 'concern') return products.filter(isHighConcernProduct);
  return products;
}

function renderHistoryFilterTabs(category, activeFilter, query) {
  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'favorite', label: '收藏' },
    { key: 'concern', label: '高关注' }
  ];

  return html`
    <nav class="history-filter-tabs" aria-label="历史筛选">
      ${tabs.map((tab) => html`
        <a class="${tab.key === activeFilter ? 'is-active' : ''}" href="${buildHistoryHref(category, tab.key, query)}" data-route>
          ${escapeHtml(tab.label)}
        </a>
      `).join('')}
    </nav>
  `;
}

function historyCard(product) {
  const concernCount = countConcernIngredients(product);
  const ingredientCount = Number(product.parsedIngredients?.length) || 0;

  return html`
    <article class="history-card" data-history-swipe="${escapeHtml(product.id)}">
      <div class="history-card__delete-action" aria-hidden="true">
        <button type="button" tabindex="-1" data-delete-product-archive="${escapeHtml(product.id)}">删除</button>
      </div>
      <div class="history-card__surface">
        <a class="history-card__thumb" href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>
          ${product.thumbnailDataUrl
            ? html`<img src="${escapeHtml(product.thumbnailDataUrl)}" alt="${escapeHtml(product.productName)}缩略图" />`
            : html`<span>无图</span>`}
        </a>
        <a class="history-card__main" href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>
          <span class="report-card__date">${formatHistoryDate(product.createdAt)}</span>
          <h2>${escapeHtml(product.productName)}</h2>
          ${product.brandName ? html`<p>${escapeHtml(product.brandName)}</p>` : ''}
          <div class="history-card__meta">
            <span class="history-grade history-grade--${escapeHtml(product.riskGrade)}">评级 ${escapeHtml(product.riskGrade)} · ${escapeHtml(riskGradeLabel(product.riskGrade))}</span>
            <span>${ingredientCount} 项配料</span>
            <span>${concernCount} 项需关注</span>
            ${product.isFavorite ? '<span>已收藏</span>' : ''}
          </div>
        </a>
        <div class="history-card__actions">
          <button type="button" class="secondary" data-toggle-product-favorite="${escapeHtml(product.id)}">${product.isFavorite ? '取消收藏' : '收藏'}</button>
          <button type="button" class="secondary history-card__delete-button" data-delete-product-archive="${escapeHtml(product.id)}">删除</button>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyHistory(category, query, filter) {
  const emptyText = query || filter !== 'all'
    ? '没有找到符合条件的分析历史。'
    : '还没有分析历史，拍照识别后会在这里生成产品记录。';
  return html`
    <div class="empty-state" data-empty-history>
      <p class="empty">${emptyText}</p>
      <a class="button-link" href="#${categoryPath(category, '/scan')}" data-route>去拍照识别</a>
    </div>
  `;
}

function renderHistoryCount(total, visible, query, filter) {
  const prefix = query || filter !== 'all' ? `${total} 条匹配` : `${total} 条`;
  return total > visible ? `${visible} / ${total} 条` : prefix;
}

function buildHistoryHref(category, filter = 'all', query = '') {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filter && filter !== 'all') params.set('filter', filter);
  const suffix = params.toString();
  return `#${categoryPath(category, '/history')}${suffix ? `?${suffix}` : ''}`;
}

function countConcernIngredients(product) {
  return (Array.isArray(product.matchResults) ? product.matchResults : [])
    .filter((result) => ['high', 'medium'].includes(result.match?.riskLevel))
    .length;
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期未知';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
