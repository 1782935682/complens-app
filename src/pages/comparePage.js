import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath } from '../data/categories.js';
import { getCompareOverview } from '../services/compareService.js';

const GB_STATUS_LABELS = {
  permitted: '允许使用',
  restricted: '限制使用',
  prohibited: '禁止使用',
  unknown: '待确认'
};

const REVIEW_STATUS_LABELS = {
  draft: '草稿（未审核）',
  reviewed: '已复核',
  verified: '已验证'
};

export function renderComparePage(category = 'food') {
  const overview = getCompareOverview(category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(overview.categoryLabel)} / 本地列表</p>
          <h1>成分对比</h1>
        </div>
        <span class="count" data-compare-count>${overview.count} / ${overview.maxItems}</span>
      </div>
      <p class="lead">把常查成分放到同一屏，快速比较关注等级、功能分类、使用提醒、过敏原和数据状态。</p>
    </section>

    <section class="section">
      <div class="compare-toolbar">
        <a class="button-link" href="#${categoryPath(overview.category, '/search')}" data-route>添加成分</a>
        ${overview.count ? '<button type="button" class="secondary" data-share-compare>分享对比</button>' : ''}
        ${overview.count ? '<button type="button" class="secondary" data-clear-compare>清空对比</button>' : ''}
        <span class="save-status" data-compare-status role="status" aria-live="polite">
          ${overview.isFull ? `最多可对比 ${overview.maxItems} 个成分。` : ''}
        </span>
      </div>
    </section>

    ${overview.isEmpty ? renderEmptyCompare(overview.category) : renderCompareContent(overview)}
  `;
}

function renderEmptyCompare(category) {
  return html`
    <section class="section">
      <div class="summary-box">
        <h2>还没有加入对比的成分</h2>
        <p>可以从搜索结果、详情页或收藏夹把成分加入对比。对比列表只保存在本机，清空本机数据时会一并移除。</p>
        <div class="form-actions">
          <a class="button-link" href="#${categoryPath(category, '/search')}" data-route>去搜索</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/favorites')}" data-route>查看收藏</a>
        </div>
      </div>
    </section>
  `;
}

function renderCompareContent(overview) {
  return html`
    ${overview.needsMoreItems ? html`
      <section class="section">
        <p class="data-warning">当前只有 1 个成分。再添加至少 1 个成分后，对比会更有意义。</p>
      </section>
    ` : ''}

    <section class="section">
      <div class="compare-card-grid">
        ${overview.ingredients.map((ingredient) => renderCompareCard(ingredient, overview.category)).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>横向对比</h2>
      </div>
      <div class="compare-table" style="--compare-columns: ${overview.ingredients.length};">
        <div class="compare-table__head">项目</div>
        ${overview.ingredients.map((ingredient) => html`
          <div class="compare-table__head">
            <a href="#${categoryPath(overview.category, `/ingredient/${ingredient.id}`)}" data-route>${escapeHtml(ingredient.nameCn)}</a>
          </div>
        `).join('')}
        ${overview.rows.map(renderCompareRow).join('')}
      </div>
    </section>
  `;
}

function renderCompareCard(ingredient, category) {
  return html`
    <article class="ingredient-card compare-card">
      <a href="#${categoryPath(category, `/ingredient/${ingredient.id}`)}" class="ingredient-card__main compact" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
        <h3>${escapeHtml(ingredient.nameCn)}</h3>
        <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        <p>${escapeHtml(ingredient.description)}</p>
        <div class="meta-row">
          <span>${escapeHtml(ingredient.category || '未分类')}</span>
        </div>
      </a>
      <div class="ingredient-card__actions">
        <button type="button" class="secondary" data-compare-remove="${escapeHtml(ingredient.id)}">移出对比</button>
      </div>
    </article>
  `;
}

function renderCompareRow(row) {
  return html`
    <div class="compare-table__label">${escapeHtml(row.label)}</div>
    ${row.values.map((value) => html`
      <div class="compare-table__cell">
        ${renderCompareValue(row, value)}
      </div>
    `).join('')}
  `;
}

function renderCompareValue(row, value) {
  if (row.type === 'risk') {
    return `<span class="${riskClass(value)}">${riskLabel(value)}</span>`;
  }
  if (row.key === 'gbStatus') {
    return escapeHtml(GB_STATUS_LABELS[value] || GB_STATUS_LABELS.unknown);
  }
  if (row.key === 'review') {
    return escapeHtml(REVIEW_STATUS_LABELS[value] || REVIEW_STATUS_LABELS.draft);
  }
  return escapeHtml(value || '暂无');
}
