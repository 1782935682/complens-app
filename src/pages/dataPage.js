import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getAllIngredients, getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientCategorySummaries } from '../services/ingredientService.js';
import { buildSupportPrefillUrl } from '../services/supportService.js';

const reviewStatusLabels = {
  draft: '草稿',
  reviewed: '已复核',
  verified: '已验证',
  unknown: '未知'
};

const confidenceLabels = {
  high: '高可信',
  medium: '中可信',
  low: '低可信',
  unverified: '待审核',
  unknown: '未知'
};

const regionLabels = {
  CN: '中国',
  EU: '欧盟',
  International: '国际'
};

export function renderDataPage(category = 'food', filters = {}) {
  const currentCategory = getProductCategory(category);
  const allItems = getAllIngredients(category);
  const activeFilters = normalizeDataFilters(filters, allItems);
  const filteredItems = filterDataItems(allItems, activeFilters);
  const audit = getDatasetAuditSummary(category, filteredItems);
  const sources = getDatasetSourceSummaries(category, filteredItems);
  const versions = getDatasetVersionSummaries(category, filteredItems);
  const categorySummaries = getIngredientCategorySummaries(category, filteredItems);
  const sourceOptions = getSourceFilterOptions(allItems);
  const confidenceOptions = getConfidenceFilterOptions(allItems);

  return html`
    <section class="section data-head">
      <div>
        <p class="eyebrow">${currentCategory.label} / 数据治理</p>
        <h1>数据来源与审核状态</h1>
        <p class="lead">查看当前本地成分库的来源覆盖、审核状态、版本和仍需补齐的正式上线缺口。</p>
      </div>
    </section>

    <section class="section data-filter-panel">
      <form class="filter-row data-filter-row" data-data-filter-form>
        <label class="filter-field">
          <span>来源</span>
          <select name="source">
            <option value="">全部来源</option>
            ${sourceOptions.map((option) => html`
              <option value="${escapeHtml(option.name)}"${option.name === activeFilters.source ? ' selected' : ''}>${escapeHtml(option.name)}（${option.count}）</option>
            `).join('')}
          </select>
        </label>
        <label class="filter-field">
          <span>可信等级</span>
          <select name="confidenceLevel">
            <option value="">全部等级</option>
            ${confidenceOptions.map((option) => html`
              <option value="${escapeHtml(option.level)}"${option.level === activeFilters.confidenceLevel ? ' selected' : ''}>${escapeHtml(confidenceLabels[option.level] || option.level)}（${option.count}）</option>
            `).join('')}
          </select>
        </label>
        <button type="submit" class="button-link secondary-link">筛选</button>
        ${hasActiveDataFilters(activeFilters) ? html`<a class="filter-clear" href="#${categoryPath(category, '/data')}" data-route>清除</a>` : ''}
      </form>
      <p class="filter-summary">${escapeHtml(renderDataFilterSummary(activeFilters, filteredItems.length, allItems.length))}</p>
    </section>

    <section class="section data-status" data-dataset-detail>
      <div class="section__head">
        <h2>数据概览</h2>
        <span class="category">${audit.mvpMinimumReached ? '达到草稿下限' : '扩充中'}</span>
      </div>
      <div class="audit-grid">
        ${renderAuditMetric(`${audit.totalCount} 条`, '当前记录')}
        ${renderAuditMetric(`${audit.categoryCount} 类`, '覆盖分类')}
        ${renderAuditMetric(`${audit.sourceCoveragePercent}%`, '来源覆盖')}
        ${renderAuditMetric(`${audit.usageLimitCoveragePercent}%`, '限量覆盖')}
        ${renderAuditMetric(`${audit.unverifiedPercent}%`, '待审核')}
      </div>
      <p class="audit-note">${renderAuditNote(category, audit, hasActiveDataFilters(activeFilters), allItems.length)}</p>
    </section>

    <section class="section data-review-grid">
      <div class="info-block">
        <h2>审核状态</h2>
        <div class="review-status-grid">
          ${Object.entries(audit.reviewCounts).map(([key, count]) => html`
            <div class="review-status-item">
              <strong>${count}</strong>
              <span>${escapeHtml(reviewStatusLabels[key] || key)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="info-block">
        <h2>可信等级</h2>
        <div class="review-status-grid">
          ${Object.entries(audit.confidenceCounts).map(([key, count]) => html`
            <div class="review-status-item">
              <strong>${count}</strong>
              <span>${escapeHtml(confidenceLabels[key] || key)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="info-block">
        <h2>数据版本</h2>
        ${versions.length ? html`
          <div class="data-list compact">
            ${versions.map((item) => html`
              <div>
                <strong>${escapeHtml(item.version)}</strong>
                <span>${item.count} 条${item.latestUpdatedAt ? ` / 更新至 ${escapeHtml(item.latestUpdatedAt)}` : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : renderDataEmptyState('版', '当前类别还没有版本信息', '需要补充数据版本和更新记录，方便追踪数据来源。', buildDatasetCorrectionUrl(category, audit))}
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>来源清单</h2>
        <span class="count">${sources.length} 个来源</span>
      </div>
      ${sources.length ? html`
        <div class="source-card-grid">
          ${sources.map(renderSourceCard).join('')}
        </div>
      ` : renderDataEmptyState('源', '当前类别还没有逐条来源引用', '后续需要补充来源表和审核记录。', buildDatasetCorrectionUrl(category, audit))}
    </section>

    <section class="section two-column">
      <div class="info-block">
        <h2>分类覆盖</h2>
        ${categorySummaries.length ? html`
          <div class="chip-list">
            ${categorySummaries.map((item) => html`
              <a class="chip category-chip" href="#${categoryPath(category, '/search')}?ingredientCategory=${encodeURIComponent(item.name)}" data-route>
                <span>${escapeHtml(item.name)}</span>
                <small>${item.count} 项</small>
              </a>
            `).join('')}
          </div>
        ` : renderDataEmptyState('类', '当前类别还没有分类数据', '可以反馈需要优先补充的分类、法规来源或适用范围。', buildDatasetCorrectionUrl(category, audit))}
      </div>
      <div class="note muted">
        <h2>上线前缺口</h2>
        <ul class="data-checklist">
          <li>逐食品类别录入 GB 2760 使用范围和限量。</li>
          <li>核验 ADI、E-number、INS 编号和来源条款。</li>
          <li>将草稿记录推进到已复核或已验证状态。</li>
          <li>为后端数据版本和审核记录预留发布流程。</li>
        </ul>
        <div class="form-actions">
          <a class="button-link secondary-link" href="${escapeHtml(buildDatasetCorrectionUrl(category, audit))}" data-route data-dataset-correction-link>反馈数据问题</a>
        </div>
      </div>
    </section>
  `;
}

function normalizeDataFilters(filters, items) {
  const sourceNames = new Set(items.map((item) => String(item.sourceName || '').trim()).filter(Boolean));
  const confidenceLevels = new Set(['high', 'medium', 'low', 'unverified']);
  const source = String(filters?.source || '').trim();
  const confidenceLevel = String(filters?.confidenceLevel || '').trim();
  return {
    source: sourceNames.has(source) ? source : '',
    confidenceLevel: confidenceLevels.has(confidenceLevel) ? confidenceLevel : ''
  };
}

function filterDataItems(items, filters) {
  return items.filter((item) => {
    if (filters.source && item.sourceName !== filters.source) return false;
    if (filters.confidenceLevel && item.confidenceLevel !== filters.confidenceLevel) return false;
    return true;
  });
}

function getSourceFilterOptions(items) {
  const counts = new Map();
  for (const item of items) {
    const name = String(item.sourceName || '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function getConfidenceFilterOptions(items) {
  const counts = new Map();
  for (const item of items) {
    const level = String(item.confidenceLevel || '').trim();
    if (!level || !confidenceLabels[level]) continue;
    counts.set(level, (counts.get(level) || 0) + 1);
  }
  return ['unverified', 'low', 'medium', 'high']
    .filter((level) => counts.has(level))
    .map((level) => ({ level, count: counts.get(level) }));
}

function hasActiveDataFilters(filters) {
  return Boolean(filters.source || filters.confidenceLevel);
}

function renderDataFilterSummary(filters, filteredCount, totalCount) {
  if (!hasActiveDataFilters(filters)) {
    return `当前显示全部 ${totalCount} 条记录。`;
  }

  const parts = [
    filters.source ? `来源：${filters.source}` : '',
    filters.confidenceLevel ? `可信等级：${confidenceLabels[filters.confidenceLevel] || filters.confidenceLevel}` : ''
  ].filter(Boolean);
  return `当前筛选 ${filteredCount} / ${totalCount} 条记录（${parts.join('，')}）。`;
}

function renderDataEmptyState(icon, title, desc, href) {
  return html`
    <div class="empty-state empty-state--inline">
      <div class="empty-state-icon" aria-hidden="true">${escapeHtml(icon)}</div>
      <p class="empty-state-title">${escapeHtml(title)}</p>
      <p class="empty-state-desc">${escapeHtml(desc)}</p>
      <a class="button-link secondary-link" href="${escapeHtml(href)}" data-route>反馈数据问题</a>
    </div>
  `;
}

function buildDatasetCorrectionUrl(category, audit) {
  return buildSupportPrefillUrl(category, {
    topic: 'data-correction',
    subject: `${getProductCategory(category).label}数据来源或审核状态需要核对`,
    message: [
      `当前记录：${audit.totalCount} 条`,
      `来源覆盖：${audit.sourceCoveragePercent}%`,
      `限量覆盖：${audit.usageLimitCoveragePercent}%`,
      `缺逐食品类别限量：${audit.missingUsageLimitsCount} 条`,
      '请描述需要核对的来源、分类、使用限量或审核状态。'
    ].join('\n')
  });
}

function renderAuditMetric(value, label) {
  return html`
    <div class="audit-metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderAuditNote(category, audit, isFiltered = false, totalCount = audit.totalCount) {
  if (isFiltered) {
    return `当前筛选显示 ${audit.totalCount} / ${totalCount} 条记录；可信等级和审核状态仍以逐条人工核验为准。`;
  }

  if (category !== 'food') {
    return `当前类别含 ${audit.totalCount} 条原型数据，来源、标准和审核流程仍需后续独立建设。`;
  }

  return `当前食品添加剂库已达到 ${audit.mvpMinimum} 条 MVP 草稿下限，目标扩展到 ${audit.mvpTarget} 条；仍有 ${audit.missingUsageLimitsCount} 条缺逐食品类别限量。`;
}

function renderSourceCard(source) {
  const region = regionLabels[source.region] || source.region || '未标记地区';
  const meta = [
    source.standard,
    region,
    source.retrievedAt ? `检索 ${source.retrievedAt}` : ''
  ].filter(Boolean).join(' / ');

  return html`
    <article class="source-card">
      <div>
        <h3>${escapeHtml(source.title)}</h3>
        <p>${escapeHtml(meta)}</p>
      </div>
      <div class="source-card__footer">
        <span>${source.recordCount} 条记录引用</span>
        ${source.url ? html`<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">打开来源</a>` : ''}
      </div>
    </article>
  `;
}
