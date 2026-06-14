import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getAllIngredients, getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientCategorySummaries } from '../services/ingredientService.js';
import { buildManualReviewQueue } from '../services/reviewQueueService.js';
import { buildSupportPrefillUrl } from '../services/supportService.js';
import { getAnalysisReports } from '../store/userStore.js';

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

const dataStatusLabels = {
  verified_regulation: 'GB 2760 已验证',
  verified_jecfa: 'JECFA 已匹配',
  mapped_candidate: '候选待确认',
  common_ingredient: '普通配料',
  unverified: '未验证',
  unknown_from_ocr: 'OCR 未收录',
  unknown: '未知'
};

const regionLabels = {
  CN: '中国',
  EU: '欧盟',
  International: '国际'
};

const gb2760ReferenceTables = [
  { value: 'A.2', label: '表 A.2' },
  { value: 'B.1', label: '表 B.1' },
  { value: 'B.2', label: '表 B.2' },
  { value: 'B.3', label: '表 B.3' },
  { value: 'C.1', label: '表 C.1' },
  { value: 'C.2', label: '表 C.2' },
  { value: 'C.3', label: '表 C.3' },
  { value: 'E.1', label: '表 E.1' },
  { value: '附录 D', label: '附录 D' },
  { value: '附录 F', label: '附录 F' }
];

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
  const dataStatusOptions = getDataStatusFilterOptions(allItems);
  const reviewQueue = buildManualReviewQueue({
    ingredients: allItems,
    reports: getAnalysisReports(category),
    category
  });

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
        <label class="filter-field">
          <span>数据状态</span>
          <select name="dataStatus">
            <option value="">全部状态</option>
            ${dataStatusOptions.map((option) => html`
              <option value="${escapeHtml(option.status)}"${option.status === activeFilters.dataStatus ? ' selected' : ''}>${escapeHtml(dataStatusLabels[option.status] || option.status)}（${option.count}）</option>
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
        <h2>数据状态</h2>
        <div class="review-status-grid">
          ${Object.entries(audit.dataStatusCounts).filter(([, count]) => count > 0).map(([key, count]) => html`
            <div class="review-status-item">
              <strong>${count}</strong>
              <span>${escapeHtml(dataStatusLabels[key] || key)}</span>
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

    ${renderManualReviewQueue(category, reviewQueue)}
    ${category === 'food' ? renderGb2760ReferenceBrowser(activeFilters) : ''}

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
  const dataStatuses = new Set(Object.keys(dataStatusLabels));
  const source = String(filters?.source || '').trim();
  const confidenceLevel = String(filters?.confidenceLevel || '').trim();
  const dataStatus = String(filters?.dataStatus || '').trim();
  const gbTable = normalizeGb2760ReferenceTable(filters?.gbTable);
  const gbQuery = String(filters?.gbQuery || '').trim().slice(0, 80);
  const gbPage = Math.max(1, Number(filters?.gbPage) || 1);
  return {
    source: sourceNames.has(source) ? source : '',
    confidenceLevel: confidenceLevels.has(confidenceLevel) ? confidenceLevel : '',
    dataStatus: dataStatuses.has(dataStatus) ? dataStatus : '',
    gbTable,
    gbQuery,
    gbPage
  };
}

function filterDataItems(items, filters) {
  return items.filter((item) => {
    if (filters.source && item.sourceName !== filters.source) return false;
    if (filters.confidenceLevel && item.confidenceLevel !== filters.confidenceLevel) return false;
    if (filters.dataStatus && item.dataStatus !== filters.dataStatus) return false;
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

function getDataStatusFilterOptions(items) {
  const counts = new Map();
  for (const item of items) {
    const status = String(item.dataStatus || '').trim();
    if (!status || !dataStatusLabels[status]) continue;
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return ['verified_regulation', 'verified_jecfa', 'mapped_candidate', 'common_ingredient', 'unverified', 'unknown_from_ocr']
    .filter((status) => counts.has(status))
    .map((status) => ({ status, count: counts.get(status) }));
}

function hasActiveDataFilters(filters) {
  return Boolean(filters.source || filters.confidenceLevel || filters.dataStatus);
}

function renderDataFilterSummary(filters, filteredCount, totalCount) {
  if (!hasActiveDataFilters(filters)) {
    return `当前显示全部 ${totalCount} 条记录。`;
  }

  const parts = [
    filters.source ? `来源：${filters.source}` : '',
    filters.confidenceLevel ? `可信等级：${confidenceLabels[filters.confidenceLevel] || filters.confidenceLevel}` : '',
    filters.dataStatus ? `数据状态：${dataStatusLabels[filters.dataStatus] || filters.dataStatus}` : ''
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

function renderManualReviewQueue(category, queue) {
  const summary = queue.summary || {};
  return html`
    <section class="section data-review-queue" data-review-queue>
      <div class="section__head">
        <div>
          <h2>人工校验队列</h2>
          <p class="helper-text">汇总本机报告里的 OCR 未收录项、低置信候选和仍未验证的静态数据；这里只提供审核入口，不自动升级状态。</p>
        </div>
        <span class="count">${summary.totalCount || 0} 项</span>
      </div>
      <div class="audit-grid">
        ${renderAuditMetric(`${summary.ocrUnmatchedCount || 0} 项`, 'OCR 未收录')}
        ${renderAuditMetric(`${summary.mappedCandidateCount || 0} 项`, '低置信候选')}
        ${renderAuditMetric(`${summary.datasetReviewCount || 0} 项`, '静态待复核')}
      </div>
      ${queue.items?.length ? html`
        <div class="review-queue-list">
          ${queue.items.map((item) => renderReviewQueueItem(category, item)).join('')}
        </div>
      ` : renderDataEmptyState('队', '当前没有本机 OCR 未收录项', '保存 OCR 报告后，未匹配条目会进入这里等待人工校验。', buildDatasetCorrectionUrl(category, {
        totalCount: 0,
        sourceCoveragePercent: 0,
        usageLimitCoveragePercent: 0,
        missingUsageLimitsCount: 0
      }))}
    </section>
  `;
}

function renderGb2760ReferenceBrowser(filters) {
  return html`
    <section class="section gb2760-reference-browser" data-gb2760-reference-browser>
      <div class="section__head">
        <div>
          <h2>GB 2760 参考表</h2>
          <p class="helper-text">浏览 A.2/B/C/D/E/F 官方参考表行，作为人工复核 staging 行时的辅助证据。</p>
        </div>
      </div>
      <form class="filter-row data-filter-row" data-gb2760-reference-form>
        <label class="filter-field">
          <span>参考表</span>
          <select name="gbTable">
            ${gb2760ReferenceTables.map((table) => html`
              <option value="${escapeHtml(table.value)}"${table.value === filters.gbTable ? ' selected' : ''}>${escapeHtml(table.label)}</option>
            `).join('')}
          </select>
        </label>
        <label class="filter-field">
          <span>检索</span>
          <input name="gbQuery" value="${escapeHtml(filters.gbQuery)}" placeholder="名称、编号或原文" />
        </label>
        <button type="submit" class="button-link secondary-link">查看</button>
      </form>
      <div data-gb2760-reference-results>
        ${renderGb2760ReferenceRowsState({ status: 'idle' }, filters)}
      </div>
    </section>
  `;
}

export function renderGb2760ReferenceRowsState(state, filters = {}) {
  if (state?.status === 'loading' || state?.status === 'idle') {
    return html`
      <div class="loading-state gb2760-reference-state" aria-busy="true">
        <div class="skeleton skeleton-card" aria-hidden="true"></div>
        <div class="skeleton skeleton-text skeleton-text--wide" aria-hidden="true"></div>
      </div>
    `;
  }

  if (state?.status === 'error') {
    const needsLogin = state.code === 'auth_required' || state.httpStatus === 401;
    return html`
      <div class="error-state gb2760-reference-state">
        <p class="error-state-title">${needsLogin ? '需要登录后查看参考表' : 'GB 2760 参考表暂不可用'}</p>
        <p class="error-desc">${needsLogin ? '参考表接口沿用后端数据审计鉴权。' : '当前可以继续查看本地数据概览。'}</p>
        ${needsLogin ? html`<a class="button-link secondary-link" href="#/food/login?redirect=${encodeURIComponent('/food/data')}" data-route>登录账号</a>` : ''}
      </div>
    `;
  }

  const result = state?.result || {};
  const rows = Array.isArray(result.items) ? result.items : [];
  const page = Number(result.page || filters.gbPage || 1);
  const totalPages = Math.max(1, Number(result.totalPages || 1));
  return html`
    <div class="gb2760-reference-summary">
      <span>${escapeHtml(formatGb2760ReferenceTable(filters.gbTable))}</span>
      <span>${Number(result.total || rows.length)} 行</span>
      <span>第 ${page} / ${totalPages} 页</span>
    </div>
    ${rows.length ? html`
      <div class="gb2760-reference-list">
        ${rows.map(renderGb2760ReferenceRow).join('')}
      </div>
      ${renderGb2760ReferencePagination(filters, page, totalPages)}
    ` : renderDataEmptyState('表', '没有匹配的参考表行', '可以调整表名或检索词后再查看。', buildDatasetCorrectionUrl('food', {
      totalCount: 0,
      sourceCoveragePercent: 0,
      usageLimitCoveragePercent: 0,
      missingUsageLimitsCount: 0
    }))}
  `;
}

function renderGb2760ReferenceRow(row) {
  return html`
    <article class="gb2760-reference-row">
      <div>
        <p class="eyebrow">${escapeHtml(row.tableName || 'GB 2760')} / PDF ${escapeHtml(row.pdfPage || '暂无')} / 标准页 ${escapeHtml(row.standardPage || '暂无')}</p>
        <h3>${escapeHtml(row.rowName || '未命名参考行')}</h3>
        <div class="chip-list">
          ${row.rowCode ? html`<span class="chip">编号：${escapeHtml(row.rowCode)}</span>` : ''}
          ${row.reviewStatus ? html`<span class="chip">状态：${escapeHtml(gb2760ReviewStatusLabel(row.reviewStatus))}</span>` : ''}
        </div>
      </div>
      <p>${escapeHtml(row.rawSourceText || '暂无原文')}</p>
      ${renderGb2760RowData(row.rowData)}
    </article>
  `;
}

function renderGb2760RowData(rowData) {
  if (!rowData || typeof rowData !== 'object') return '';
  const pairs = Object.entries(rowData).filter(([, value]) => value != null && value !== '');
  if (!pairs.length) return '';
  return html`
    <dl class="gb2760-row-data">
      ${pairs.slice(0, 6).map(([key, value]) => html`
        <div>
          <dt>${escapeHtml(formatRowDataKey(key))}</dt>
          <dd>${escapeHtml(formatRowDataValue(value))}</dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function renderGb2760ReferencePagination(filters, page, totalPages) {
  if (totalPages <= 1) return '';
  return html`
    <div class="pagination gb2760-reference-pagination">
      ${page > 1 ? html`<a class="pagination__link" href="${buildGb2760ReferenceHref(filters, page - 1)}" data-route>上一页</a>` : ''}
      ${page < totalPages ? html`<a class="pagination__link" href="${buildGb2760ReferenceHref(filters, page + 1)}" data-route>下一页</a>` : ''}
    </div>
  `;
}

function buildGb2760ReferenceHref(filters, page) {
  const params = new URLSearchParams();
  if (filters.source) params.set('source', filters.source);
  if (filters.confidenceLevel) params.set('confidenceLevel', filters.confidenceLevel);
  if (filters.dataStatus) params.set('dataStatus', filters.dataStatus);
  if (filters.gbTable) params.set('gbTable', filters.gbTable);
  if (filters.gbQuery) params.set('gbQuery', filters.gbQuery);
  if (page > 1) params.set('gbPage', String(page));
  const suffix = params.toString();
  return `#${categoryPath('food', '/data')}${suffix ? `?${suffix}` : ''}`;
}

function normalizeGb2760ReferenceTable(value) {
  const normalized = String(value || '').trim();
  const allowed = new Set(gb2760ReferenceTables.map((table) => table.value));
  return allowed.has(normalized) ? normalized : 'B.2';
}

function formatGb2760ReferenceTable(value) {
  return gb2760ReferenceTables.find((table) => table.value === value)?.label || '表 B.2';
}

function gb2760ReviewStatusLabel(status) {
  const labels = {
    pending_review: '待复核来源数据',
    needs_review: '待复核来源数据',
    mapped_candidate: '候选待确认',
    approved: '已签核待 promote',
    promoted: '已进入正式规则',
    verified: '历史已验证'
  };
  return labels[status] || status || '待复核来源数据';
}

function formatRowDataKey(key) {
  const labels = {
    foodCategoryCode: '食品分类号',
    foodCategoryName: '食品类别',
    exceptionNumber: '例外编号',
    insNumber: 'INS',
    cnsNumber: 'CNS',
    useScope: '使用范围',
    functionText: '功能',
    footnote: '脚注'
  };
  return labels[key] || key;
}

function formatRowDataValue(value) {
  if (Array.isArray(value)) return value.map(formatRowDataValue).join('、');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value || '');
}

function renderReviewQueueItem(category, item) {
  const href = buildReviewQueueCorrectionUrl(category, item);
  return html`
    <article class="review-queue-item">
      <div>
        <p class="eyebrow">${escapeHtml(reviewQueueTypeLabel(item.type))} / ${escapeHtml(dataStatusLabels[item.dataStatus] || item.dataStatus)}</p>
        <h3>${escapeHtml(item.label)}</h3>
        <p>${escapeHtml(item.action)}</p>
        <div class="chip-list">
          ${item.ingredientId ? html`<span class="chip">ID：${escapeHtml(item.ingredientId)}</span>` : ''}
          <span class="chip">来源范围：${escapeHtml(sourceScopeQueueLabel(item.sourceScope))}</span>
          ${item.reportCount ? html`<span class="chip">报告命中 ${item.reportCount} 次</span>` : ''}
          ${item.confidence ? html`<span class="chip">最高置信度 ${Math.round(item.confidence * 100)}%</span>` : ''}
        </div>
      </div>
      ${item.reports?.length ? html`
        <div class="data-list compact">
          ${item.reports.map((report) => html`
            <div>
              <strong>${escapeHtml(report.title)}</strong>
              <span>${escapeHtml(report.createdAt ? report.createdAt.slice(0, 10) : '待确认日期')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="form-actions">
        <a class="button-link secondary-link" href="${escapeHtml(href)}" data-route>提交校验线索</a>
      </div>
    </article>
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

function buildReviewQueueCorrectionUrl(category, item) {
  return buildSupportPrefillUrl(category, {
    topic: 'data-correction',
    subject: `人工校验队列：${item.label}`,
    message: [
      `队列类型：${reviewQueueTypeLabel(item.type)}`,
      `数据状态：${dataStatusLabels[item.dataStatus] || item.dataStatus}`,
      `来源范围：${sourceScopeQueueLabel(item.sourceScope)}`,
      item.ingredientId ? `成分 ID：${item.ingredientId}` : '',
      item.reportCount ? `本机报告命中：${item.reportCount} 次` : '',
      '请补充包装原文、官方来源链接、条款编号、适用范围或需要拆分/归并的说明。'
    ].filter(Boolean).join('\n')
  });
}

function reviewQueueTypeLabel(type) {
  const labels = {
    ocr_unmatched: 'OCR 未匹配',
    mapped_candidate: '候选待确认',
    dataset_review: '静态数据复核'
  };
  return labels[type] || '人工校验';
}

function sourceScopeQueueLabel(scope) {
  const labels = {
    gb_2760_regulation: 'GB 2760 法规依据',
    jecfa_safety_evaluation: 'JECFA 安全评价',
    candidate_mapping: '候选映射',
    common_ingredient_lexicon: '普通配料词库',
    ocr_unmatched: 'OCR 未匹配',
    seed_reference: '种子参考',
    unknown: '未知'
  };
  return labels[scope] || labels.unknown;
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
