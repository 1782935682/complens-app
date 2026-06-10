import { escapeHtml, html, ingredientCard, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getAllergensByIds } from '../services/allergenService.js';
import { getIngredientById } from '../services/ingredientService.js';
import { buildReportFileName, buildReportMarkdown } from '../services/reportExportService.js';
import { getAnalysisReportById, getAnalysisReports } from '../store/userStore.js';

export function renderReportsPage(category = 'food') {
  const currentCategory = getProductCategory(category);
  const reports = getAnalysisReports(category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 本地报告</p>
          <h1>分析报告</h1>
        </div>
        <span class="count">${reports.length} 份</span>
      </div>
      <div class="form-actions report-toolbar">
        <a class="button-link" href="#${categoryPath(category, '/analyze')}" data-route>新建分析</a>
        ${reports.length ? html`<button type="button" class="secondary" data-clear-reports>清空本类别报告</button>` : ''}
      </div>
      ${reports.length
        ? html`<div class="report-list">${reports.map((report) => reportCard(report)).join('')}</div>`
        : html`<p class="empty">还没有保存的分析报告。完成一次成分表分析后，可以将结果保存到本地。</p>`}
    </section>
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
        ${metricItem('已匹配', `${report.matchedCount} 项`)}
        ${metricItem('重点关注', `${report.highlightIngredientIds.length} 项`)}
        ${metricItem('暂未收录', `${report.unknownItems.length + missingIds.length} 项`)}
        ${metricItem('过敏原命中', `${allergenHitCount} 项`)}
      </div>
      <div class="form-actions report-toolbar">
        <a class="button-link" href="#${categoryPath(report.category, '/analyze')}?text=${encodeURIComponent(report.input)}" data-route>重新分析</a>
        <a class="button-link secondary-link" href="#${categoryPath(report.category, '/reports')}" data-route>返回报告列表</a>
      </div>
    </section>

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
        <a class="secondary-link button-link" href="#${categoryPath(report.category, '/analyze')}?text=${encodeURIComponent(report.input)}" data-route>重新分析</a>
        <button type="button" class="secondary" data-delete-report="${escapeHtml(report.id)}">删除</button>
      </div>
    </article>
  `;
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

function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
