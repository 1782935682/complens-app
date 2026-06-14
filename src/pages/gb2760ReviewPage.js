import { escapeHtml, html } from '../components/render.js';
import { categoryPath } from '../data/categories.js';

const reviewStatusOptions = [
  { value: 'pending_review', label: '待复核' },
  { value: 'mapped_candidate', label: '候选待确认' },
  { value: 'approved', label: '已签核待 promote' },
  { value: 'promoted', label: '已进入正式规则' },
  { value: 'verified', label: '历史已验证' }
];
const pageSizeOptions = [20, 50, 100];

export function renderGb2760ReviewPage(route, state = null) {
  const filters = normalizeReviewFilters(route?.filters);
  return html`
    <section class="section data-head">
      <div>
        <p class="eyebrow">GB 2760 / 内部复核</p>
        <h1>GB 2760 staging 行复核</h1>
        <p class="lead">逐条核对官方 A.1 staging 行、食品类别、最大使用量和来源原文；签核后再通过 promote 写入正式规则。</p>
      </div>
    </section>

    <section class="section data-filter-panel">
      <form class="filter-row data-filter-row" data-gb2760-review-form>
        <label class="filter-field">
          <span>状态</span>
          <select name="status">
            <option value="">全部状态</option>
            ${reviewStatusOptions.map((option) => html`
              <option value="${escapeHtml(option.value)}"${option.value === filters.status ? ' selected' : ''}>${escapeHtml(option.label)}</option>
            `).join('')}
          </select>
        </label>
        <label class="filter-field">
          <span>检索</span>
          <input name="q" value="${escapeHtml(filters.q)}" placeholder="添加剂、CNS/INS、食品类别" />
        </label>
        <label class="filter-field checkbox-field">
          <span>签核条件</span>
          <label class="inline-checkbox">
            <input type="checkbox" name="ready" value="1"${filters.ready ? ' checked' : ''} />
            <span>只看可签核</span>
          </label>
        </label>
        <label class="filter-field">
          <span>每页</span>
          <select name="limit">
            ${pageSizeOptions.map((size) => html`
              <option value="${size}"${size === filters.limit ? ' selected' : ''}>${size} 条</option>
            `).join('')}
          </select>
        </label>
        <button type="submit" class="button-link secondary-link">查看</button>
        <a class="filter-clear" href="#${categoryPath('food', '/data')}" data-route>返回数据页</a>
      </form>
      <p class="filter-summary">批准前请确认名称、编号、功能、食品类别、最大使用量、页码和原文片段都能对应官方 PDF。</p>
    </section>

    <section class="section gb2760-review-workbench" data-gb2760-review-workbench>
      ${renderReviewState(state, filters)}
    </section>
  `;
}

function renderReviewState(state, filters) {
  if (!state || state.status === 'loading') {
    return html`
      <div class="loading-state" aria-busy="true">
        <div class="skeleton skeleton-card" aria-hidden="true"></div>
        <div class="skeleton skeleton-text skeleton-text--wide" aria-hidden="true"></div>
      </div>
    `;
  }

  if (state.status === 'error') {
    const needsLogin = state.code === 'auth_required' || state.httpStatus === 401;
    return html`
      <div class="error-state">
        <p class="error-state-title">${needsLogin ? '需要登录后复核' : '复核数据暂不可用'}</p>
        <p class="error-desc">${needsLogin ? 'GB 2760 staging 复核会修改后端数据库，所以需要账号登录。' : '后端接口当前没有返回复核列表。'}</p>
        ${needsLogin ? html`<a class="button-link secondary-link" href="#/food/login?redirect=${encodeURIComponent('/food/gb2760-review')}" data-route>登录账号</a>` : ''}
      </div>
    `;
  }

  const result = state.result || {};
  const rows = Array.isArray(result.items) ? result.items : [];
  const readyRows = rows.filter(isRowApprovable);
  const page = Math.max(1, Number(result.page || filters.page || 1));
  const totalPages = Math.max(1, Number(result.totalPages || 1));
  return html`
    <div class="section__head">
      <div>
        <h2>复核列表</h2>
        <p class="helper-text">当前筛选 ${Number(result.total || rows.length)} 行；标为“已签核待 promote”后仍不会立刻进入正式规则，需要单独运行 promote。</p>
      </div>
      <span class="count">第 ${page} / ${totalPages} 页</span>
    </div>
    ${renderStatusCounts(result.statusCounts || [], filters)}
    ${renderBulkActions(readyRows)}
    <p class="form-status" data-gb2760-review-message aria-live="polite"></p>
    ${rows.length ? html`
      <div class="gb2760-review-list">
        ${rows.map(renderReviewRow).join('')}
      </div>
      ${renderReviewPagination(filters, page, totalPages)}
    ` : renderEmptyReviewState()}
  `;
}

function renderBulkActions(readyRows) {
  return html`
    <div class="gb2760-review-bulk">
      <span>本页可签核 ${readyRows.length} 行</span>
      <div class="form-actions">
        <button type="button" class="button-link secondary-link" data-gb2760-review-select-page${readyRows.length ? '' : ' disabled'}>全选本页可签核</button>
        <button type="button" class="button-link secondary-link" data-gb2760-batch-review-action data-review-status="approved"${readyRows.length ? '' : ' disabled'}>批量签核已选</button>
      </div>
    </div>
  `;
}

function renderStatusCounts(counts, filters) {
  const countMap = new Map(counts.map((item) => [item.reviewStatus, item.count]));
  return html`
    <div class="gb2760-review-status-strip">
      ${reviewStatusOptions.map((option) => html`
        <a class="gb2760-review-status-pill" href="${buildReviewHref({ ...filters, status: option.value }, 1)}" data-route>
          <strong>${Number(countMap.get(option.value) || 0)}</strong>
          <span>${escapeHtml(option.label)}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderReviewRow(row) {
  const locked = row.reviewStatus === 'promoted' || row.reviewStatus === 'verified';
  const promotionIssues = Array.isArray(row.promotionIssues) ? row.promotionIssues : [];
  const canApprove = isRowApprovable(row);
  return html`
    <article class="gb2760-review-row${canApprove ? ' is-ready' : ''}">
      <div class="gb2760-review-row__main">
        <label class="gb2760-review-row__select">
          <input type="checkbox" value="${escapeHtml(row.id)}" data-gb2760-review-select${canApprove ? '' : ' disabled'} />
        </label>
        <div class="gb2760-review-row__body">
          <p class="eyebrow">${escapeHtml(row.tableName || '表 A.1')} / PDF ${escapeHtml(row.pdfPage || '暂无')} / 标准页 ${escapeHtml(row.standardPage || '暂无')}</p>
          <h3>${escapeHtml(row.additiveNameCn || '未命名添加剂')}</h3>
          <div class="gb2760-review-meta">
            <span>${escapeHtml(reviewStatusLabel(row.reviewStatus))}</span>
            ${row.ingredientId ? html`<span class="chip">成分 ID：${escapeHtml(row.ingredientId)}</span>` : '<span class="chip">未映射成分</span>'}
            ${row.cnsNumber ? html`<span class="chip">CNS ${escapeHtml(row.cnsNumber)}</span>` : ''}
            ${row.insNumber ? html`<span class="chip">INS ${escapeHtml(row.insNumber)}</span>` : ''}
          </div>
          <dl class="gb2760-review-facts">
            ${renderField('英文名', row.additiveNameEn)}
            ${renderField('功能', row.functionText)}
            ${renderField('食品类别', `${row.foodCategoryCode || ''} ${row.foodCategoryName || ''}`.trim())}
            ${renderField('最大使用量', `${row.maxUseLevel || ''}${row.unit ? ` ${row.unit}` : ''}`.trim())}
            ${renderField('备注', row.note)}
          </dl>
          <details class="gb2760-review-source">
            <summary>官方原文</summary>
            <p>${escapeHtml(row.rawSourceText || '暂无原文')}</p>
          </details>
          ${canApprove ? html`
            <p class="gb2760-review-check is-ok">可签核</p>
          ` : html`
            <p class="gb2760-review-check">需处理：${escapeHtml(formatPromotionIssues(promotionIssues))}</p>
          `}
        </div>
        <div class="gb2760-review-row__actions">
          <button type="button" class="button-link secondary-link" data-gb2760-review-action data-row-id="${escapeHtml(row.id)}" data-review-status="approved"${canApprove ? '' : ' disabled'}>签核</button>
          <button type="button" class="button-link secondary-link" data-gb2760-review-action data-row-id="${escapeHtml(row.id)}" data-review-status="mapped_candidate"${locked ? ' disabled' : ''}>候选</button>
          <button type="button" class="text-button" data-gb2760-review-action data-row-id="${escapeHtml(row.id)}" data-review-status="pending_review"${locked ? ' disabled' : ''}>退回</button>
        </div>
      </div>
    </article>
  `;
}

function isRowApprovable(row) {
  const promotionIssues = Array.isArray(row.promotionIssues) ? row.promotionIssues : [];
  return !['promoted', 'verified'].includes(row.reviewStatus) && promotionIssues.length === 0;
}

function renderField(label, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return html`
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(normalized)}</dd>
    </div>
  `;
}

function renderReviewPagination(filters, page, totalPages) {
  if (totalPages <= 1) return '';
  return html`
    <div class="pagination">
      ${page > 1 ? html`<a class="pagination__link" href="${buildReviewHref(filters, page - 1)}" data-route>上一页</a>` : ''}
      ${page < totalPages ? html`<a class="pagination__link" href="${buildReviewHref(filters, page + 1)}" data-route>下一页</a>` : ''}
    </div>
  `;
}

function renderEmptyReviewState() {
  return html`
    <div class="empty-state">
      <strong>没有匹配的复核行</strong>
      <p>可以切换状态或清空检索词后再查看。</p>
    </div>
  `;
}

function buildReviewHref(filters, page) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  if (filters.ready) params.set('ready', '1');
  if (filters.limit && filters.limit !== 20) params.set('limit', String(filters.limit));
  if (page > 1) params.set('page', String(page));
  const suffix = params.toString();
  return `#${categoryPath('food', '/gb2760-review')}${suffix ? `?${suffix}` : ''}`;
}

function normalizeReviewFilters(filters = {}) {
  const status = String(filters.status || '').trim();
  return {
    status: reviewStatusOptions.some((option) => option.value === status) ? status : '',
    q: String(filters.q || '').trim(),
    ready: filters.ready === true || filters.ready === '1',
    page: Math.max(1, Number(filters.page) || 1),
    limit: pageSizeOptions.includes(Number(filters.limit)) ? Number(filters.limit) : 20
  };
}

function reviewStatusLabel(status) {
  return reviewStatusOptions.find((option) => option.value === status)?.label || status || '待复核';
}

function formatPromotionIssues(issues = []) {
  if (!issues.length) return '当前状态不可编辑';
  return issues.map(promotionIssueLabel).join('；');
}

function promotionIssueLabel(issue) {
  const labels = {
    'missing ingredientId': '缺少成分映射 ingredientId，不能进入正式规则',
    'missing additiveNameCn': '缺少中文添加剂名称',
    'missing functionText': '缺少功能字段',
    'missing foodCategoryCode': '缺少食品类别编号',
    'missing foodCategoryName': '缺少食品类别名称',
    'missing maxUseLevel': '缺少最大使用量',
    'missing rawSourceText': '缺少官方原文片段',
    'sourceTable must be 表 A.1': '不是表 A.1 来源行，不能作为正式使用规则 promote'
  };
  return labels[issue] || issue;
}
