import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getProductArchiveById, getProductArchives, paginateProductArchives } from '../services/productArchiveService.js';
import { riskGradeLabel } from '../services/reportService.js';

const PRODUCT_PREVIEW_TEXT_LIMIT = 180;

export function renderProductArchiveListPage(category = 'food', query = '', page = 1) {
  const currentCategory = getProductCategory(category);
  const normalizedQuery = String(query || '').trim();
  const products = getProductArchives({ category, search: normalizedQuery });
  const pagination = paginateProductArchives(products, page, 12);

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本机档案</p>
          <h1>产品档案</h1>
        </div>
        <span class="count">${normalizedQuery ? `${products.length} 条匹配` : `${products.length} 条`}</span>
      </div>

      <form class="report-search" data-product-search-form>
        <label for="product-query">检索产品档案</label>
        <div class="report-search__row">
          <input id="product-query" type="search" name="q" value="${escapeHtml(normalizedQuery)}" placeholder="输入产品名、品牌、配料或标签" />
          <button type="submit" class="secondary">检索</button>
          ${normalizedQuery ? html`<a class="button-link secondary-link" href="#${categoryPath(category, '/products')}" data-route>清除</a>` : ''}
        </div>
      </form>

      <div class="form-actions report-toolbar">
        <a class="button-link" href="#${categoryPath(category, '/analyze')}" data-route>新建分析</a>
        <a class="button-link secondary-link" href="#${categoryPath(category, '/reports')}" data-route>查看分析报告</a>
      </div>

      ${products.length
        ? html`
          <div class="product-grid">
            ${pagination.items.map(productCard).join('')}
          </div>
          ${renderPagination(category, normalizedQuery, pagination)}
        `
        : html`
          <div class="empty" data-empty-products>
            <p>${normalizedQuery ? '没有找到匹配的产品档案。' : '还没有产品档案。保存分析报告后，可以在报告详情页建档。'}</p>
            <a class="button-link" href="#${categoryPath(category, normalizedQuery ? '/products' : '/analyze')}" data-route>${normalizedQuery ? '查看全部档案' : '新建分析'}</a>
          </div>
        `}
    </section>
  `;
}

export function renderProductArchivePage(id, category = 'food') {
  const product = getProductArchiveById(id);
  const currentCategory = getProductCategory(category);
  if (!product || product.category !== category) {
    return html`
      <section class="section not-found">
        <p class="eyebrow">${currentCategory.label}产品档案</p>
        <h1>产品档案不存在</h1>
        <p class="lead">没有找到这条产品档案，可能已被删除或属于其他成分类别。</p>
        <div class="form-actions">
          <a class="button-link" href="#${categoryPath(category, '/products')}" data-route>查看产品档案</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/reports')}" data-route>查看报告列表</a>
        </div>
      </section>
    `;
  }

  const ingredientCount = Array.isArray(product.parsedIngredients) ? product.parsedIngredients.length : 0;
  const matchedCount = (Array.isArray(product.matchResults) ? product.matchResults : [])
    .filter((item) => item.match && item.confidence > 0)
    .length;

  return html`
    <section class="section product-detail">
      <div class="detail__header">
        <div>
          <p class="eyebrow">${currentCategory.label} / ${formatProductDate(product.createdAt)}</p>
          <h1>${escapeHtml(product.productName)}</h1>
          ${product.brandName ? html`<p class="lead">${escapeHtml(product.brandName)}</p>` : ''}
        </div>
        <button type="button" class="secondary" data-toggle-product-favorite="${escapeHtml(product.id)}">${product.isFavorite ? '取消收藏' : '收藏'}</button>
      </div>

      <div class="product-detail__layout">
        <div class="product-image-frame">
          ${product.thumbnailDataUrl
            ? html`<img src="${escapeHtml(product.thumbnailDataUrl)}" alt="${escapeHtml(product.productName)}包装图" data-product-image="${escapeHtml(product.id)}" />`
            : html`<div class="product-image-placeholder" data-product-image="${escapeHtml(product.id)}">暂无缩略图</div>`}
        </div>
        <div class="report-grade-card report-grade-card--${escapeHtml(product.riskGrade)}">
          <div class="report-grade-card__grade" aria-label="整体评级">${escapeHtml(product.riskGrade)}</div>
          <div>
            <strong>最新评级：${escapeHtml(riskGradeLabel(product.riskGrade))}</strong>
            <p>${escapeHtml(product.productName)}已关联到保存的分析报告，可用于后续回看包装图和配料文本。</p>
            <div class="report-grade-card__meta">
              <span>${ingredientCount} 项配料</span>
              <span>${matchedCount} 项匹配</span>
              <span>${product.isFavorite ? '已收藏' : '未收藏'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions report-toolbar">
        <a class="button-link secondary-link" href="#${categoryPath(product.category, '/products')}" data-route>返回档案列表</a>
        ${product.reportId ? html`<a class="button-link" href="#${categoryPath(product.category, `/reports/${product.reportId}`)}" data-route>查看完整报告</a>` : ''}
      </div>
    </section>

    <section class="section">
      <div class="summary-box report-input-box">
        <strong>原始配料表</strong>
        <p>${escapeHtml(buildOriginalTextPreview(product.originalText))}</p>
        ${product.originalText.length > PRODUCT_PREVIEW_TEXT_LIMIT ? html`
          <details class="product-original-text">
            <summary>展开全部</summary>
            <p>${escapeHtml(product.originalText)}</p>
          </details>
        ` : ''}
      </div>
    </section>

    ${product.tags.length ? html`
      <section class="section">
        <div class="chip-list">
          ${product.tags.map((tag) => html`<span class="chip">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </section>
    ` : ''}

    <section class="section">
      <p class="helper-text">完整图片仅保存在本机 IndexedDB；localStorage 只保存档案元数据、图片 ID 和缩略图。</p>
    </section>
  `;
}

function productCard(product) {
  return html`
    <article class="product-card" data-product-card>
      <a class="product-card__thumb" href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>
        ${product.thumbnailDataUrl
          ? html`<img src="${escapeHtml(product.thumbnailDataUrl)}" alt="${escapeHtml(product.productName)}缩略图" />`
          : html`<span>无图</span>`}
      </a>
      <div class="product-card__body">
        <span class="report-card__date">${formatProductDate(product.createdAt)}</span>
        <h2><a href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>${escapeHtml(product.productName)}</a></h2>
        ${product.brandName ? html`<p>${escapeHtml(product.brandName)}</p>` : ''}
        <div class="report-card__meta">
          <span>评级 ${escapeHtml(product.riskGrade)}</span>
          <span>${product.isFavorite ? '已收藏' : '未收藏'}</span>
          <span>${Number(product.parsedIngredients?.length) || 0} 项配料</span>
        </div>
      </div>
      <div class="report-card__actions">
        <button type="button" class="secondary" data-toggle-product-favorite="${escapeHtml(product.id)}">${product.isFavorite ? '取消收藏' : '收藏'}</button>
      </div>
    </article>
  `;
}

function renderPagination(category, query, pagination) {
  if (pagination.totalPages <= 1) return '';
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const pageLink = (page, label, disabled = false) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    return disabled
      ? html`<span class="button-link secondary-link is-disabled">${escapeHtml(label)}</span>`
      : html`<a class="button-link secondary-link" href="#${categoryPath(category, '/products')}?${next.toString()}" data-route>${escapeHtml(label)}</a>`;
  };

  return html`
    <nav class="pagination" aria-label="产品档案分页">
      ${pageLink(Math.max(1, pagination.page - 1), '上一页', pagination.page <= 1)}
      <span>${pagination.page} / ${pagination.totalPages}</span>
      ${pageLink(Math.min(pagination.totalPages, pagination.page + 1), '下一页', pagination.page >= pagination.totalPages)}
    </nav>
  `;
}

function buildOriginalTextPreview(value) {
  const text = String(value || '').trim();
  return text.length > PRODUCT_PREVIEW_TEXT_LIMIT ? `${text.slice(0, PRODUCT_PREVIEW_TEXT_LIMIT)}...` : text;
}

function formatProductDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期未知';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
