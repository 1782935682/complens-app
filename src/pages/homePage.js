import { categoryPath, getProductCategory, productCategories } from '../data/categories.js';
import { escapeHtml, ingredientCard, html } from '../components/render.js';
import { getDatasetAuditSummary, getIngredientCategorySummaries, getPopularIngredients } from '../services/ingredientService.js';
import { getProductArchives } from '../services/productArchiveService.js';
import { riskGradeLabel } from '../services/reportService.js';
import { getAnalysisReports, getFavoriteIngredients, getHistory, isHistoryRecordingEnabled, shouldShowOnboardingPrompt } from '../store/userStore.js';
import { renderOnboardingPrompt } from './onboardingPage.js';

export function renderHomePage(category = 'food') {
  const currentCategory = getProductCategory(category);
  const popular = getPopularIngredients(category);
  const history = getHistory();
  const historyRecordingEnabled = isHistoryRecordingEnabled();
  const favorites = getFavoriteIngredients(category);
  const reports = getAnalysisReports(category);
  const recentProducts = getProductArchives({ category }).slice(0, 4);
  const ingredientCategories = getIngredientCategorySummaries(category);
  const auditSummary = getDatasetAuditSummary(category);

  return html`
    ${renderCategoryTabs(category)}
    ${shouldShowOnboardingPrompt() ? renderOnboardingPrompt(category) : ''}
    <section class="hero">
      <div>
        <p class="eyebrow">CompLens / 成分镜</p>
        <h1>${category === 'food' ? '拍照识别食品配料表' : '看懂产品成分，少一点盲选。'}</h1>
        <p class="hero__copy">${category === 'food' ? '上传或拍摄配料表图片，确认文字后匹配食品添加剂数据库。' : currentCategory.description}</p>
        <div class="hero-primary-actions">
          <a class="hero-scan-cta" href="#${categoryPath(category, '/scan')}" data-route>拍照识别配料表</a>
          <div class="hero-secondary-links">
            <a href="#${categoryPath(category, '/reports')}" data-route>最近分析</a>
            <a href="#${categoryPath(category, '/search')}" data-route>成分搜索</a>
          </div>
        </div>
      </div>
      <form class="search-panel" data-search-form data-suggestion-category="${escapeHtml(category)}">
        <label for="home-search">辅助搜索成分</label>
        <div class="search-row">
          <input id="home-search" name="q" type="search" placeholder="${category === 'food' ? '如：柠檬酸 / E330 / INS 330' : '如：烟酰胺 / Niacinamide / BHA'}" autocomplete="off" aria-describedby="home-search-suggestions" />
          <button type="submit">搜索</button>
        </div>
        <div id="home-search-suggestions" class="search-suggestions" data-search-suggestions aria-live="polite"></div>
      </form>
    </section>

    <section class="quick-actions" aria-label="快捷入口">
      <a class="action-tile" href="#${categoryPath(category, '/scan')}" data-route>
        <strong>拍照扫描</strong>
        <span>上传标签并校正文本</span>
      </a>
      <a class="action-tile" href="#${categoryPath(category, '/reports')}" data-route>
        <strong>分析报告</strong>
        <span>${reports.length ? `${reports.length} 份本地报告` : '保存和复查分析结果'}</span>
      </a>
      <a class="action-tile" href="#${categoryPath(category, '/favorites')}" data-route>
        <strong>收藏夹</strong>
        <span>${favorites.length ? `${favorites.length} 个已收藏成分` : '保存常查成分'}</span>
      </a>
    </section>

    ${recentProducts.length ? renderRecentProducts(category, recentProducts) : ''}

    ${category === 'food' ? renderDatasetAuditSummary(auditSummary) : ''}

    <section class="section">
      <div class="section__head">
        <h2>热门成分</h2>
      </div>
      ${popular.length
        ? `<div class="card-grid">${popular.map((item) => ingredientCard(item, { category })).join('')}</div>`
        : '<p class="empty">当前类别还没有可展示的热门成分。</p>'}
    </section>

    <section class="section two-column">
      <div>
        <div class="section__head">
          <h2>最近查询</h2>
          ${history.length ? '<button class="text-button" data-clear-history>清空</button>' : ''}
        </div>
        ${historyRecordingEnabled ? '' : html`<p class="helper-text history-privacy-note">已关闭自动记录查询历史。可在设置页重新开启。</p>`}
        ${history.length
          ? `<div class="history-list">${history.map((item) => renderHistoryItem(item, category)).join('')}</div>`
          : '<p class="empty">还没有查询记录。</p>'}
      </div>
      <div>
        <div class="section__head">
          <h2>常见分类</h2>
        </div>
        ${ingredientCategories.length
          ? `<div class="chip-list">${ingredientCategories.map((item) => renderCategoryChip(item, category)).join('')}</div>`
          : '<p class="empty">当前类别还没有分类数据。</p>'}
      </div>
    </section>
  `;
}

function renderRecentProducts(category, products) {
  return html`
    <section class="section recent-products" data-recent-products>
      <div class="section__head">
        <h2>最近分析产品</h2>
        <a class="inline-link" href="#${categoryPath(category, '/history')}" data-route>查看全部历史 →</a>
      </div>
      <div class="recent-product-strip">
        ${products.map(recentProductCard).join('')}
      </div>
    </section>
  `;
}

function renderDatasetAuditSummary(summary) {
  return html`
    <section class="section data-status" aria-label="数据状态" data-dataset-audit>
      <div class="section__head">
        <h2>数据状态</h2>
        <a class="filter-clear" href="#${categoryPath(summary.category, '/data')}" data-route>查看来源与审核</a>
      </div>
      <div class="audit-grid">
        ${renderAuditMetric(`${summary.totalCount} 条`, '草稿数据')}
        ${renderAuditMetric(`${summary.categoryCount} 类`, '覆盖分类')}
        ${renderAuditMetric(`${summary.reviewedOrVerifiedCount} 条`, '已复核/验证')}
        ${renderAuditMetric(`${summary.usageLimitCoveragePercent}%`, '限量覆盖')}
      </div>
      <p class="audit-note">当前食品添加剂库仍为草稿数据，逐食品类别限量、ADI 原文和来源条款需要继续审核。</p>
    </section>
  `;
}

function renderAuditMetric(value, label) {
  return html`
    <div class="audit-metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function recentProductCard(product) {
  return html`
    <a class="recent-product-card" href="#${categoryPath(product.category, `/product/${product.id}`)}" data-route>
      <span class="recent-product-card__thumb">
        ${product.thumbnailDataUrl
          ? html`<img src="${escapeHtml(product.thumbnailDataUrl)}" alt="${escapeHtml(product.productName)}缩略图" />`
          : html`<span>无图</span>`}
      </span>
      <span class="recent-product-card__body">
        <strong>${escapeHtml(product.productName)}</strong>
        <span>${formatRecentProductDate(product.createdAt)} · ${escapeHtml(product.riskGrade)} ${escapeHtml(riskGradeLabel(product.riskGrade))}</span>
      </span>
    </a>
  `;
}

function formatRecentProductDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期未知';
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
}

function renderCategoryChip(item, category) {
  const safeName = escapeHtml(item.name);
  const href = `#${categoryPath(category, '/search')}?ingredientCategory=${encodeURIComponent(item.name)}`;
  return html`
    <a class="chip category-chip" href="${href}" data-route>
      <span>${safeName}</span>
      <small>${item.count} 项</small>
    </a>
  `;
}

function renderHistoryItem(item, category) {
  const safeItem = escapeHtml(item);
  return html`
    <span class="history-chip">
      <a class="chip" href="#${categoryPath(category, '/search')}?q=${encodeURIComponent(item)}" data-route>${safeItem}</a>
      <button type="button" class="history-chip__delete" data-delete-history="${safeItem}" aria-label="删除查询记录：${safeItem}">×</button>
    </span>
  `;
}

function renderCategoryTabs(activeCategory) {
  return html`
    <nav class="category-tabs" aria-label="成分类别">
      ${productCategories.map((category) => html`
        <a class="${category.id === activeCategory ? 'is-active' : ''}" href="#${categoryPath(category.id)}" data-route>
          <strong>${category.label}</strong>
          <span>${category.id === 'food' ? '主线' : '后续'}</span>
        </a>
      `).join('')}
    </nav>
  `;
}
