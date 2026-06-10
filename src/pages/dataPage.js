import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getDatasetAuditSummary, getDatasetSourceSummaries, getDatasetVersionSummaries, getIngredientCategorySummaries } from '../services/ingredientService.js';

const reviewStatusLabels = {
  draft: '草稿',
  reviewed: '已复核',
  verified: '已验证',
  unknown: '未知'
};

const regionLabels = {
  CN: '中国',
  EU: '欧盟',
  International: '国际'
};

export function renderDataPage(category = 'food') {
  const currentCategory = getProductCategory(category);
  const audit = getDatasetAuditSummary(category);
  const sources = getDatasetSourceSummaries(category);
  const versions = getDatasetVersionSummaries(category);
  const categorySummaries = getIngredientCategorySummaries(category);

  return html`
    <section class="section data-head">
      <div>
        <p class="eyebrow">${currentCategory.label} / 数据治理</p>
        <h1>数据来源与审核状态</h1>
        <p class="lead">查看当前本地成分库的来源覆盖、审核状态、版本和仍需补齐的正式上线缺口。</p>
      </div>
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
      </div>
      <p class="audit-note">${renderAuditNote(category, audit)}</p>
    </section>

    <section class="section two-column">
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
        ` : '<p class="empty">当前类别还没有版本信息。</p>'}
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
      ` : '<p class="empty">当前类别还没有逐条来源引用，后续需要补充来源表和审核记录。</p>'}
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
        ` : '<p class="empty">当前类别还没有分类数据。</p>'}
      </div>
      <div class="note muted">
        <h2>上线前缺口</h2>
        <ul class="data-checklist">
          <li>逐食品类别录入 GB 2760 使用范围和限量。</li>
          <li>核验 ADI、E-number、INS 编号和来源条款。</li>
          <li>将草稿记录推进到已复核或已验证状态。</li>
          <li>为后端数据版本和审核记录预留发布流程。</li>
        </ul>
      </div>
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

function renderAuditNote(category, audit) {
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
