import { escapeHtml, html, ingredientCard, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getAllergensByIds } from '../services/allergenService.js';
import { getIngredientById } from '../services/ingredientService.js';
import { buildReportFileName, buildReportMarkdown } from '../services/reportExportService.js';
import { getAnalysisReportById, getAnalysisReports } from '../store/userStore.js';
import { normalizeText } from '../utils/text.js';

const REVIEW_STATUS_LABELS = {
  draft: '草稿（未审核）',
  reviewed: '已复核',
  verified: '已验证'
};
const ANALYZE_QUERY_TEXT_LIMIT = 800;

export function renderReportsPage(category = 'food', query = '') {
  const currentCategory = getProductCategory(category);
  const reports = getAnalysisReports(category);
  const normalizedQuery = normalizeReportQuery(query);
  const visibleReports = filterReports(reports, normalizedQuery, category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本地报告</p>
          <h1>分析报告</h1>
        </div>
        <span class="count">${normalizedQuery ? `${visibleReports.length} / ${reports.length}` : reports.length} 份</span>
      </div>
      <form class="report-search" data-report-search-form>
        <label for="report-query">检索历史报告</label>
        <div class="report-search__row">
          <input id="report-query" type="search" name="q" value="${escapeHtml(normalizedQuery)}" placeholder="输入成分、过敏原、报告标题或原始文本" />
          <button type="submit" class="secondary">检索</button>
          ${normalizedQuery ? html`<a class="button-link secondary-link" href="#${categoryPath(category, '/reports')}" data-route>清除</a>` : ''}
        </div>
      </form>
      <div class="form-actions report-toolbar">
        <a class="button-link" href="#${categoryPath(category, '/analyze')}" data-route>新建分析</a>
        ${reports.length ? html`<button type="button" class="secondary" data-clear-reports>清空本类别报告</button>` : ''}
      </div>
      ${reports.length
        ? visibleReports.length
          ? html`<div class="report-list">${visibleReports.map((report) => reportCard(report)).join('')}</div>`
          : renderReportsEmptyState(category, true)
        : renderReportsEmptyState(category, false)}
    </section>
  `;
}

function renderReportsEmptyState(category, hasQuery) {
  return html`
    <div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">报</div>
      <p class="empty-state-title">${hasQuery ? '没有找到匹配的本地报告' : '还没有保存的分析报告'}</p>
      <p class="empty-state-desc">${hasQuery ? '可以换用成分名、过敏原、风险关键词或原始文本片段再试。' : '完成一次成分表分析后，可以将结果保存到本地。'}</p>
      <a class="button-link" href="#${categoryPath(category, hasQuery ? '/reports' : '/analyze')}" data-route>${hasQuery ? '查看全部报告' : '新建分析'}</a>
    </div>
  `;
}

export function renderReportDetailPage(id, category = 'food') {
  const report = getAnalysisReportById(id);
  if (!report || report.category !== category) {
    return html`
      <section class="section not-found">
        <p class="eyebrow">本地报告</p>
        <h1>报告不存在</h1>
        <p class="lead">没有找到这份分析报告，可能已被删除或属于其他成分类别。</p>
        <div class="form-actions">
          <a class="button-link" href="#${categoryPath(category, '/reports')}" data-route>查看报告列表</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/analyze')}" data-route>重新分析</a>
        </div>
      </section>
    `;
  }

  const currentCategory = getProductCategory(report.category);
  const matchedIngredients = resolveIngredients(report.matchedIngredientIds, report.category);
  const highlightIngredients = resolveIngredients(report.highlightIngredientIds, report.category);
  const missingIds = report.matchedIngredientIds.filter((idValue) => !getIngredientById(idValue, report.category));
  const sourceEvidence = buildReportSourceEvidence(matchedIngredients, missingIds);
  const allergenHitCount = report.ingredientAllergenHits.length + report.textAllergenHits.length;
  const markdown = buildReportMarkdown(report);

  return html`
    <section class="section">
      <div class="detail__header">
        <div>
          <p class="eyebrow">${currentCategory.label} / ${formatReportDate(report.createdAt)}</p>
          <h1>${escapeHtml(report.title)}</h1>
          <p class="lead">${escapeHtml(report.summary)}</p>
        </div>
        <button type="button" class="secondary" data-delete-report="${escapeHtml(report.id)}">删除报告</button>
      </div>
      <div class="report-metrics" aria-label="报告指标">
        ${report.productName ? metricItem('产品名称', report.productName) : ''}
        ${metricItem('已匹配', `${report.matchedCount} 项`)}
        ${metricItem('重点关注', `${report.highlightIngredientIds.length} 项`)}
        ${metricItem('暂未收录', `${report.unknownItems.length + missingIds.length} 项`)}
        ${metricItem('过敏原命中', `${allergenHitCount} 项`)}
      </div>
      <div class="form-actions report-toolbar">
        <a class="button-link" href="${buildReportAnalyzeHref(report)}" data-route>重新分析</a>
        <a class="button-link secondary-link" href="#${categoryPath(report.category, '/reports')}" data-route>返回报告列表</a>
        <button type="button" class="secondary" data-share-report="${escapeHtml(report.id)}">分享报告</button>
      </div>
    </section>

    ${renderReportInsights(report)}

    ${renderReportSourceEvidence(sourceEvidence)}

    <section class="section">
      <div class="report-export">
        <div class="section__head">
          <div>
            <h2>导出报告</h2>
            <p class="helper-text">导出内容包含保存时的报告快照、匹配成分、过敏原命中和原始成分表。</p>
          </div>
        </div>
        <textarea class="report-export__preview" readonly rows="10" data-report-markdown>${escapeHtml(markdown)}</textarea>
        <div class="form-actions report-toolbar">
          <button type="button" class="secondary" data-copy-report="${escapeHtml(report.id)}">复制 Markdown</button>
          <button type="button" class="secondary" data-download-report="markdown" data-report-id="${escapeHtml(report.id)}" data-file-name="${escapeHtml(buildReportFileName(report, 'md'))}">下载 Markdown</button>
          <button type="button" class="secondary" data-download-report="json" data-report-id="${escapeHtml(report.id)}" data-file-name="${escapeHtml(buildReportFileName(report, 'json'))}">下载 JSON</button>
          <span class="save-status" data-export-status aria-live="polite"></span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="summary-box report-input-box">
        <strong>原始成分表</strong>
        <p>${escapeHtml(report.input)}</p>
      </div>
    </section>

    ${allergenHitCount ? html`
      <section class="section">
        <div class="allergen-alert allergen-alert--cards">
          <h2>保存时发现过敏原</h2>
          <p>该报告保存时命中 ${allergenHitCount} 项关注过敏原：</p>
          <div class="report-list compact">${renderIngredientAllergenHits(report)}${renderTextAllergenHits(report)}</div>
        </div>
      </section>
    ` : ''}

    ${highlightIngredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>重点关注成分</h2>
        </div>
        <div class="card-grid">${highlightIngredients.map((item) => ingredientCard(item, {
          category: report.category,
          href: `#${categoryPath(report.category, `/ingredient/${item.id}`)}`
        })).join('')}</div>
      </section>
    ` : ''}

    ${matchedIngredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>已匹配成分</h2>
          <span class="count">${matchedIngredients.length} 项</span>
        </div>
        <div class="card-grid">${matchedIngredients.map((item) => ingredientCard(item, {
          category: report.category,
          href: `#${categoryPath(report.category, `/ingredient/${item.id}`)}`
        })).join('')}</div>
      </section>
    ` : ''}

    ${report.unknownItems.length || missingIds.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>暂未收录 / 数据已变更</h2>
        </div>
        <p class="helper-text">这些条目未匹配到当前本地成分库，或保存后本地数据发生过调整。</p>
        <div class="chip-list">
          ${report.unknownItems.map((item) => html`<span class="chip">${escapeHtml(item)}</span>`).join('')}
          ${missingIds.map((item) => html`<span class="chip">已保存成分 ID：${escapeHtml(item)}</span>`).join('')}
        </div>
      </section>
    ` : ''}
  `;
}

function reportCard(report) {
  const allergenHitCount = report.ingredientAllergenHits.length + report.textAllergenHits.length;
  return html`
    <article class="report-card">
      <a href="#${categoryPath(report.category, `/reports/${report.id}`)}" class="report-card__main" data-route>
        <span class="report-card__date">${formatReportDate(report.createdAt)}</span>
        <h2>${escapeHtml(report.title)}</h2>
        <p>${escapeHtml(report.summary)}</p>
        <div class="report-card__meta">
          <span>${report.matchedCount} 项匹配</span>
          <span>${report.highlightIngredientIds.length} 项重点关注</span>
          <span>${report.unknownItems.length} 项暂未收录</span>
          ${allergenHitCount ? html`<span class="danger-text">${allergenHitCount} 项过敏原</span>` : ''}
        </div>
      </a>
      <div class="report-card__actions">
        <a class="secondary-link button-link" href="${buildReportAnalyzeHref(report)}" data-route>重新分析</a>
        <button type="button" class="secondary" data-delete-report="${escapeHtml(report.id)}">删除</button>
      </div>
    </article>
  `;
}

function filterReports(reports, query, category) {
  if (!query) return reports;
  const keyword = normalizeText(query);
  return reports.filter((report) => normalizeText(buildReportSearchText(report, category)).includes(keyword));
}

function buildReportSearchText(report, category) {
  const matchedIngredientIds = Array.isArray(report.matchedIngredientIds) ? report.matchedIngredientIds : [];
  const highlightIngredientIds = Array.isArray(report.highlightIngredientIds) ? report.highlightIngredientIds : [];
  const ingredientAllergenHits = Array.isArray(report.ingredientAllergenHits) ? report.ingredientAllergenHits : [];
  const textAllergenHits = Array.isArray(report.textAllergenHits) ? report.textAllergenHits : [];
  const unknownItems = Array.isArray(report.unknownItems) ? report.unknownItems : [];
  const insights = Array.isArray(report.insights) ? report.insights : [];
  const matchedIngredients = resolveIngredients([
    ...matchedIngredientIds,
    ...highlightIngredientIds,
    ...ingredientAllergenHits.map((hit) => hit.id)
  ], category);
  const insightText = insights.flatMap((insight) => [
    insight.title,
    insight.summary,
    ...(insight.items || [])
  ]);

  return [
    report.title,
    report.productName,
    report.summary,
    report.input,
    ...unknownItems,
    ...insightText,
    ...ingredientAllergenHits.flatMap((hit) => [
      hit.id,
      ...(hit.allergenIds || []),
      formatAllergenNames(getAllergensByIds(hit.allergenIds || []))
    ]),
    ...textAllergenHits.flatMap((hit) => [
      hit.item,
      ...(hit.allergenIds || []),
      formatAllergenNames(getAllergensByIds(hit.allergenIds || []))
    ]),
    ...matchedIngredients.flatMap((ingredient) => [
      ingredient.nameCn,
      ingredient.nameEn,
      ingredient.category,
      ingredient.riskSummary,
      ...(ingredient.aliases || []),
      ...(ingredient.allergenTypes || []),
      formatAllergenNames(getAllergensByIds(ingredient.allergenTypes || []))
    ])
  ].filter(Boolean).join(' ');
}

function buildReportAnalyzeHref(report) {
  const params = new URLSearchParams();
  params.set('text', String(report.input || '').slice(0, ANALYZE_QUERY_TEXT_LIMIT));
  if (report.productName) params.set('productName', report.productName);
  return `#${categoryPath(report.category, '/analyze')}?${params.toString()}`;
}

function resolveIngredients(ids, category) {
  return ids
    .map((id) => getIngredientById(id, category))
    .filter(Boolean);
}

function metricItem(label, value) {
  return html`
    <div class="metric-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderReportInsights(report) {
  const insights = Array.isArray(report.insights) ? report.insights : [];
  if (!insights.length) return '';

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <h2>报告解读</h2>
          <p class="helper-text">这些结论基于保存时的本地成分库、过敏原档案和原始文本生成。</p>
        </div>
      </div>
      <div class="report-insight-grid">
        ${insights.map((insight) => reportInsightCard(insight)).join('')}
      </div>
    </section>
  `;
}

function reportInsightCard(insight) {
  const tone = ['neutral', 'watch', 'caution'].includes(insight.tone) ? insight.tone : 'neutral';
  const items = Array.isArray(insight.items) ? insight.items : [];
  return html`
    <article class="report-insight report-insight--${tone}">
      <span class="report-insight__tone">${insightToneLabel(tone)}</span>
      <h3>${escapeHtml(insight.title)}</h3>
      <p>${escapeHtml(insight.summary)}</p>
      ${items.length ? html`
        <ul>
          ${items.map((item) => html`<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      ` : ''}
    </article>
  `;
}

function renderIngredientAllergenHits(report) {
  return report.ingredientAllergenHits.map((hit) => {
    const ingredient = getIngredientById(hit.id, report.category);
    const title = ingredient?.nameCn || hit.id;
    return html`
      <article class="report-hit">
        <span class="${riskClass(ingredient?.riskLevel || 'unknown')}">${riskLabel(ingredient?.riskLevel || 'unknown')}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>过敏原：${escapeHtml(formatAllergenNames(getAllergensByIds(hit.allergenIds)))}</p>
      </article>
    `;
  }).join('');
}

function renderTextAllergenHits(report) {
  return report.textAllergenHits.map((hit) => html`
    <article class="report-hit">
      <span class="allergen-badge">标签文本</span>
      <h3>${escapeHtml(hit.item)}</h3>
      <p>过敏原：${escapeHtml(formatAllergenNames(getAllergensByIds(hit.allergenIds)))}</p>
    </article>
  `).join('');
}

function buildReportSourceEvidence(ingredients, missingIds) {
  const reviewCounts = { draft: 0, reviewed: 0, verified: 0 };
  const sourceMap = new Map();

  for (const ingredient of ingredients) {
    const reviewStatus = normalizeReviewStatus(ingredient.reviewStatus);
    reviewCounts[reviewStatus] += 1;

    for (const source of ingredient.sourceReferences || []) {
      if (!source || typeof source !== 'object') continue;
      const title = valueOrFallback(source.title, '暂无来源标题');
      const standard = valueOrFallback(source.standard, '暂无标准编号');
      const key = [title, standard, source.url].filter(Boolean).join('|');
      const summary = sourceMap.get(key) || {
        title,
        standard,
        region: valueOrFallback(source.region, ''),
        retrievedAt: valueOrFallback(source.retrievedAt, ''),
        url: getSafeHttpUrl(source.url),
        ingredientNames: []
      };
      if (!summary.ingredientNames.includes(ingredient.nameCn)) {
        summary.ingredientNames.push(ingredient.nameCn);
      }
      sourceMap.set(key, summary);
    }
  }

  return {
    totalIngredients: ingredients.length,
    missingIds,
    reviewCounts,
    sources: [...sourceMap.values()]
      .sort((a, b) => b.ingredientNames.length - a.ingredientNames.length || a.title.localeCompare(b.title, 'zh-Hans-CN'))
  };
}

function renderReportSourceEvidence(evidence) {
  if (!evidence.totalIngredients && !evidence.missingIds.length) return '';

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <h2>数据来源与审核状态</h2>
          <p class="helper-text">基于当前本地成分库重新关联保存报告中的匹配成分，用于核对来源覆盖和草稿审核边界。</p>
        </div>
      </div>
      <div class="report-source-summary" aria-label="报告来源概览">
        ${metricItem('当前匹配', `${evidence.totalIngredients} 项`)}
        ${metricItem('数据来源', `${evidence.sources.length} 个`)}
        ${metricItem('草稿数据', `${evidence.reviewCounts.draft} 项`)}
        ${metricItem('数据变更', `${evidence.missingIds.length} 项`)}
      </div>
      ${evidence.missingIds.length ? html`
        <p class="data-warning">有 ${evidence.missingIds.length} 个保存成分 ID 当前未在本地库中找到，来源引用无法确认。</p>
      ` : ''}
      ${evidence.sources.length ? html`
        <div class="report-source-list">
          ${evidence.sources.map((source) => renderReportSourceCard(source)).join('')}
        </div>
      ` : html`<p class="empty">当前匹配成分暂无来源信息。</p>`}
    </section>
  `;
}

function renderReportSourceCard(source) {
  const title = source.url
    ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>`
    : escapeHtml(source.title);
  return html`
    <article class="report-source-card">
      <span class="report-source-card__standard">${escapeHtml(source.standard)}</span>
      <h3>${title}</h3>
      <p>覆盖成分：${escapeHtml(source.ingredientNames.join('、'))}</p>
      <div class="report-source-card__meta">
        ${source.region ? html`<span>${escapeHtml(source.region)}</span>` : ''}
        ${source.retrievedAt ? html`<span>检索：${escapeHtml(source.retrievedAt)}</span>` : ''}
      </div>
    </article>
  `;
}

function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function insightToneLabel(tone) {
  if (tone === 'caution') return '优先核对';
  if (tone === 'watch') return '需要关注';
  return '信息提示';
}

function normalizeReviewStatus(status) {
  return Object.hasOwn(REVIEW_STATUS_LABELS, status) ? status : 'draft';
}

function normalizeReportQuery(value) {
  return String(value || '').trim();
}

function valueOrFallback(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function getSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
