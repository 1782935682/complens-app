import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getAllergensByIds } from '../services/allergenService.js';
import { getIngredientById } from '../services/ingredientService.js';
import { getPersonalIngredientHit, getPersonalProfile, getReportPersonalHits } from '../services/personalProfileService.js';
import { buildReportFileName, buildReportMarkdown } from '../services/reportExportService.js';
import { getProductArchiveByReportId } from '../services/productArchiveService.js';
import {
  cautionGroupLabel,
  getCategoryBreakdownEntries,
  getConcernSummaries,
  getSpecialPopulationAlerts,
  getTopIngredientNames,
  riskGradeLabel,
  riskLevelLabel
} from '../services/reportService.js';
import { getAnalysisReportById } from '../store/userStore.js';

const REVIEW_STATUS_LABELS = {
  draft: '待审核',
  reviewed: '已复核',
  verified: '已验证'
};
const ANALYZE_QUERY_TEXT_LIMIT = 800;

export function renderReportDetailPage(id, category = 'food') {
  const report = getAnalysisReportById(id);
  const routeCategory = getProductCategory(category);
  if (!report || report.category !== category) {
    return html`
      <section class="section not-found">
        <p class="eyebrow">${routeCategory.label}分析报告</p>
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
  const sourceEvidence = buildReportSourceEvidence(report);
  const allergenHitCount = (report.ingredientAllergenHits || []).length + (report.textAllergenHits || []).length;
  const markdown = buildReportMarkdown(report);
  const archivedProduct = getProductArchiveByReportId(report.id);

  return html`
    <section class="section report-detail-hero">
      <div class="detail__header">
        <div>
          <p class="eyebrow">${currentCategory.label} / ${formatReportDate(report.createdAt)}</p>
          <h1>${escapeHtml(report.productName || report.title)}</h1>
          ${report.brandName ? html`<p class="lead">${escapeHtml(report.brandName)}</p>` : ''}
        </div>
        <button type="button" class="secondary" data-delete-report="${escapeHtml(report.id)}">删除报告</button>
      </div>

      <div class="report-grade-card report-grade-card--${escapeHtml(report.riskGrade || 'C')}">
        <div class="report-grade-card__grade" aria-label="整体评级">${escapeHtml(report.riskGrade || 'C')}</div>
        <div>
          <strong>整体评级：${escapeHtml(riskGradeLabel(report.riskGrade))}</strong>
          <p>${escapeHtml(report.summary)}</p>
          <div class="report-grade-card__meta">
            <span>共识别 ${Number(report.parsedIngredients?.length) || 0} 种配料</span>
            <span>匹配率 ${Math.round((Number(report.matchRate) || 0) * 100)}%</span>
            <span>${allergenHitCount} 项过敏原命中</span>
          </div>
        </div>
      </div>

      <div class="form-actions report-toolbar">
        <a class="button-link" href="${buildReportAnalyzeHref(report)}" data-route>重新分析</a>
        <a class="button-link secondary-link" href="#${categoryPath(report.category, '/reports')}" data-route>返回报告列表</a>
        ${archivedProduct
          ? html`<a class="button-link secondary-link" href="#${categoryPath(report.category, `/product/${archivedProduct.id}`)}" data-route>查看产品档案</a>`
          : html`<button type="button" class="secondary" data-save-product-archive="${escapeHtml(report.id)}">保存为产品档案</button>`}
        <button type="button" class="secondary" data-share-report="${escapeHtml(report.id)}">分享报告</button>
      </div>
    </section>

    ${renderConcernSummary(report)}
    ${renderPersonalHitSummary(report)}
    ${renderIngredientOrder(report)}
    ${renderAdditiveSection(report, currentCategory)}
    ${renderUnmatchedSection(report)}
    ${renderSpecialPopulationSection(report)}
    ${renderSourceEvidence(sourceEvidence, currentCategory)}
    ${renderReportInsights(report)}
    ${renderAllergenSection(report)}

    <section class="section">
      <div class="report-export">
        <div class="section__head">
          <div>
            <h2>导出报告</h2>
            <p class="helper-text">导出内容包含保存时的报告快照、匹配成分、过敏原命中和原始配料表。</p>
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
        <strong>原始配料表</strong>
        <p>${escapeHtml(report.originalText || report.input)}</p>
      </div>
    </section>

    <section class="section">
      <p class="helper-text">本报告仅供配料信息参考，不构成医疗建议；请结合产品标签、个人情况和专业意见判断。</p>
    </section>
  `;
}

function renderConcernSummary(report) {
  const concerns = getConcernSummaries(report, 3);
  return html`
    <section class="section">
      <div class="report-panel">
        <div class="section__head">
          <div>
            <p class="eyebrow">关注摘要</p>
            <h2>优先核对这些信息</h2>
          </div>
        </div>
        ${concerns.length
          ? html`<ul class="report-priority-list">${concerns.map((item) => html`<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : html`<p class="helper-text">当前没有高关注或需关注匹配项，仍建议核对包装原文和数据审核状态。</p>`}
      </div>
    </section>
  `;
}

function renderPersonalHitSummary(report) {
  const hits = getReportPersonalHits(report, getPersonalProfile(report.category));
  if (!hits.length) return '';

  return html`
    <section class="section">
      <div class="report-panel personal-hit-summary">
        <div class="section__head">
          <div>
            <p class="eyebrow">个人命中摘要</p>
            <h2>你的个人设置命中了 ${hits.length} 种成分</h2>
          </div>
        </div>
        <ul class="personal-hit-list">
          ${hits.map((hit) => html`
            <li>
              ${renderPersonalHitBadge(hit)}
              <strong>${escapeHtml(hit.name)}</strong>
              <span>${escapeHtml(hit.detail)}</span>
            </li>
          `).join('')}
        </ul>
        <p class="helper-text">不构成医疗建议。如有疑虑请咨询专业人士，并以包装原文为准。</p>
      </div>
    </section>
  `;
}

function renderIngredientOrder(report) {
  const topItems = getTopIngredientNames(report);
  return html`
    <section class="section">
      <details class="report-panel report-panel--details" open>
        <summary>配料顺序说明</summary>
        <p>配料表中排列越靠前，通常表示添加量或含量越靠前。本产品中靠前的配料为：${escapeHtml(topItems.join('、') || '暂无')}。</p>
      </details>
    </section>
  `;
}

function renderAdditiveSection(report, currentCategory) {
  const matched = (report.matchResults || []).filter((item) => item.match && item.confidence > 0);
  const categories = getCategoryBreakdownEntries(report);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(currentCategory.label)}</p>
          <h2>已匹配 ${matched.length} 种</h2>
        </div>
      </div>
      ${categories.length ? html`
        <div class="chip-list report-category-chips">
          ${categories.map(([name, count]) => html`<span class="chip">${escapeHtml(name)} ×${count}</span>`).join('')}
        </div>
      ` : ''}
      ${matched.length
        ? html`<div class="report-ingredient-list">${matched.map((item) => renderMatchedIngredient(item, report.category)).join('')}</div>`
        : html`<p class="empty">当前报告没有匹配到${escapeHtml(currentCategory.label)}数据库成分。</p>`}
    </section>
  `;
}

function renderMatchedIngredient(item, category) {
  const match = item.match;
  const fullIngredient = getIngredientById(match.id, category);
  const detailHref = fullIngredient ? `#${categoryPath(category, `/ingredient/${match.id}`)}` : '';
  const personalHit = getPersonalIngredientHit(fullIngredient || match, category);
  return html`
    <details class="report-ingredient-item">
      <summary>
        <span class="report-risk-dot report-risk-dot--${escapeHtml(match.riskLevel || 'unknown')}"></span>
        <strong>${escapeHtml(match.nameCn || item.parsedIngredient.normalizedText)}</strong>
        <span class="chip">${escapeHtml(match.category || '未分类')}</span>
        <span>${escapeHtml(riskLevelLabel(match.riskLevel))}</span>
        ${match.confidenceLevel === 'unverified' || match.isVerified === false ? '<span class="data-badge data-badge--unverified">待审核</span>' : ''}
        ${personalHit ? renderPersonalHitBadge(personalHit) : ''}
      </summary>
      <div class="report-ingredient-item__body">
        <p>${escapeHtml(match.riskSummary || fullIngredient?.description || '暂无补充说明。')}</p>
        <div class="report-ingredient-item__meta">
          ${match.eNumber ? html`<span>E-number：${escapeHtml(match.eNumber)}</span>` : ''}
          ${match.gbCode ? html`<span>GB/INS：${escapeHtml(match.gbCode)}</span>` : ''}
          <span>匹配置信度：${Math.round((Number(item.confidence) || 0) * 100)}%</span>
          <span>审核状态：${escapeHtml(reviewStatusLabel(match.reviewStatus || fullIngredient?.reviewStatus))}</span>
          ${detailHref ? html`<a class="inline-link" href="${detailHref}" data-route>查看成分详情</a>` : ''}
        </div>
      </div>
    </details>
  `;
}

function renderPersonalHitBadge(hit) {
  return `<span class="personal-badge personal-badge--${escapeHtml(hit.type)}">${escapeHtml(hit.badgeLabel)}</span>`;
}

function renderUnmatchedSection(report) {
  const unmatched = report.unmatchedTerms || report.unknownItems || [];
  if (!unmatched.length) return '';
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">普通原料 / 暂未收录</p>
          <h2>${unmatched.length} 种需人工核对</h2>
        </div>
      </div>
      <p class="helper-text">这些条目可能是普通食品原料、复合配料、OCR 误识别文本或当前数据库尚未覆盖的添加剂。</p>
      <div class="chip-list">${unmatched.map((item) => html`<span class="chip chip--muted">${escapeHtml(item)}</span>`).join('')}</div>
    </section>
  `;
}

function renderSpecialPopulationSection(report) {
  const alerts = getSpecialPopulationAlerts(report);
  if (!alerts.length) return '';
  return html`
    <section class="section">
      <div class="allergen-alert allergen-alert--cards">
        <h2>特殊人群提醒</h2>
        <p>以下提示来自当前成分数据的草稿字段，请以包装说明和专业意见为准。</p>
        <div class="report-list compact">
          ${alerts.map((alert) => html`
            <article class="report-hit">
              <span class="allergen-badge">${escapeHtml(alert.groupLabel)}</span>
              <h3>${escapeHtml(alert.ingredientName)}</h3>
              <p>${escapeHtml(alert.groupLabel)}可能需要重点核对该成分。</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderSourceEvidence(evidence, currentCategory) {
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">数据来源</p>
          <h2>来源与审核状态</h2>
          <p class="helper-text">当前${escapeHtml(currentCategory.label)}数据仍在审核中，报告展示的是保存时匹配结果与当前本地来源信息。</p>
        </div>
      </div>
      <div class="report-source-summary" aria-label="报告来源概览">
        ${metricItem('当前匹配', `${evidence.totalIngredients} 项`)}
        ${metricItem('数据来源', `${evidence.sources.length} 个`)}
        ${metricItem('待审核', `${evidence.reviewCounts.draft} 项`)}
        ${metricItem('数据变更', `${evidence.missingIds.length} 项`)}
      </div>
      ${evidence.sources.length
        ? html`<div class="report-source-list">${evidence.sources.map((source) => renderReportSourceCard(source)).join('')}</div>`
        : html`<p class="empty">当前匹配成分暂无来源信息。</p>`}
    </section>
  `;
}

function renderAllergenSection(report) {
  const ingredientHits = report.ingredientAllergenHits || [];
  const textHits = report.textAllergenHits || [];
  if (!ingredientHits.length && !textHits.length) return '';
  return html`
    <section class="section">
      <div class="allergen-alert allergen-alert--cards">
        <h2>过敏原命中</h2>
        <p>报告保存时命中了您关注的过敏原，请优先核对包装提示。</p>
        <div class="report-list compact">
          ${ingredientHits.map((hit) => {
            const ingredient = getIngredientById(hit.id, report.category);
            return html`
              <article class="report-hit">
                <span class="allergen-badge">成分匹配</span>
                <h3>${escapeHtml(ingredient?.nameCn || hit.id)}</h3>
                <p>过敏原：${escapeHtml(formatAllergenNames(getAllergensByIds(hit.allergenIds)))}</p>
              </article>
            `;
          }).join('')}
          ${textHits.map((hit) => html`
            <article class="report-hit">
              <span class="allergen-badge">标签文本</span>
              <h3>${escapeHtml(hit.item)}</h3>
              <p>过敏原：${escapeHtml(formatAllergenNames(getAllergensByIds(hit.allergenIds)))}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderReportInsights(report) {
  const insights = Array.isArray(report.insights) ? report.insights : [];
  if (!insights.length) return '';
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">报告解读</p>
          <h2>结构化说明</h2>
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
      <span class="report-insight__tone">${escapeHtml(insightToneLabel(tone))}</span>
      <h3>${escapeHtml(insight.title)}</h3>
      <p>${escapeHtml(insight.summary)}</p>
      ${items.length ? html`
        <ul>${items.map((item) => html`<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
    </article>
  `;
}

function buildReportSourceEvidence(report) {
  const reviewCounts = { draft: 0, reviewed: 0, verified: 0 };
  const sourceMap = new Map();
  const missingIds = [];

  for (const id of report.matchedIngredientIds || []) {
    const ingredient = getIngredientById(id, report.category);
    if (!ingredient) {
      missingIds.push(id);
      continue;
    }
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
    totalIngredients: (report.matchedIngredientIds || []).length - missingIds.length,
    missingIds,
    reviewCounts,
    sources: [...sourceMap.values()]
      .sort((a, b) => b.ingredientNames.length - a.ingredientNames.length || a.title.localeCompare(b.title, 'zh-Hans-CN'))
  };
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

function buildReportAnalyzeHref(report) {
  const params = new URLSearchParams();
  params.set('text', String(report.originalText || report.input || '').slice(0, ANALYZE_QUERY_TEXT_LIMIT));
  if (report.productName && report.productName !== '未命名产品') params.set('productName', report.productName);
  return `#${categoryPath(report.category, '/analyze')}?${params.toString()}`;
}

function metricItem(label, value) {
  return html`
    <div class="metric-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[normalizeReviewStatus(status)] || REVIEW_STATUS_LABELS.draft;
}

function insightToneLabel(tone) {
  if (tone === 'caution') return '重点核对';
  if (tone === 'watch') return '建议关注';
  return '信息';
}

function normalizeReviewStatus(status) {
  return Object.hasOwn(REVIEW_STATUS_LABELS, status) ? status : 'draft';
}

function valueOrFallback(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function getSafeHttpUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function formatReportDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
