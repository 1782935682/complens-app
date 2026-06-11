import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingUserAllergens } from '../services/allergenService.js';
import { getIngredientById, getRelatedIngredients } from '../services/ingredientService.js';
import { buildSupportPrefillUrl } from '../services/supportService.js';
import { getUserAllergens, isFavorite, isInCompare } from '../store/userStore.js';

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

export function renderDetailPage(id, category = 'cosmetics', apiState = null) {
  const currentCategory = getProductCategory(category);
  if (apiState?.status === 'loading') {
    return renderLoadingIngredientPage(id, category, currentCategory.label);
  }

  const ingredient = apiState?.status === 'success' ? apiState.item : getIngredientById(id, category);
  if (!ingredient) {
    return renderMissingIngredientPage(id, category, currentCategory.label);
  }

  const favorite = isFavorite(ingredient.id, category);
  const compared = isInCompare(ingredient.id, category);
  const allergenMatches = getMatchingUserAllergens(ingredient, getUserAllergens());
  const relatedIngredients = getRelatedIngredients(ingredient.id, category, 4);
  return html`
    <section class="detail">
      <div class="detail__header">
        <div>
          <p class="eyebrow">${currentCategory.label}</p>
          <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
          <h1>${escapeHtml(ingredient.nameCn)}</h1>
          <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        </div>
        <div class="detail-actions">
          <button class="favorite-button ${favorite ? 'is-active' : ''}" data-favorite-id="${ingredient.id}">
            ${favorite ? '已收藏' : '收藏'}
          </button>
          <button class="secondary ${compared ? 'is-active' : ''}" data-compare-add="${escapeHtml(ingredient.id)}">
            ${compared ? '已加入对比' : '加入对比'}
          </button>
          <button class="secondary" data-share-ingredient="${escapeHtml(ingredient.id)}">分享</button>
        </div>
      </div>
      <span class="save-status" data-compare-status role="status" aria-live="polite"></span>
      <span class="save-status" data-share-status role="status" aria-live="polite"></span>
      ${apiState?.status === 'error' ? renderApiFallbackNotice() : ''}
      ${allergenMatches.length ? html`
        <div class="allergen-alert">
          此成分含您关注的过敏原：${escapeHtml(formatAllergenNames(allergenMatches))}
        </div>
      ` : ''}
      <p class="lead">${escapeHtml(ingredient.description)}</p>
      <div class="info-grid">
        ${renderInfoBlock('别名', ingredient.aliases)}
        ${renderFunctionInfoBlock(ingredient, category)}
        ${renderInfoBlock('适合关注', ingredient.suitableFor)}
        ${renderInfoBlock('使用提醒', ingredient.cautionFor)}
      </div>
      ${category === 'food' ? renderFoodAdditiveDetails(ingredient, category) : ''}
      <section class="note">
        <h2>风险说明</h2>
        <p>${escapeHtml(ingredient.riskSummary || '暂无明确风险说明，建议结合产品整体配方和个人耐受判断。')}</p>
      </section>
      <section class="note muted">
        <h2>参考说明</h2>
        <p>${escapeHtml(ingredient.sourceNote || '本页内容仅用于日常成分理解，不提供医疗诊断。')}</p>
      </section>
      ${renderRelatedIngredients(relatedIngredients, category)}
    </section>
  `;
}

function renderLoadingIngredientPage(id, category, categoryLabel) {
  const safeId = String(id || '').trim();
  if (!safeId) {
    return renderMissingIngredientPage('', category, categoryLabel);
  }

  const searchHref = `#${categoryPath(category, '/search')}?q=${encodeURIComponent(safeId)}`;
  return html`
    <section class="section missing-ingredient" data-detail-loading>
      <p class="eyebrow">${escapeHtml(categoryLabel)} / 后端数据库</p>
      <h1>正在加载成分详情</h1>
      <p class="lead">正在优先请求后端成分 API。若后端不可用，会自动降级到本地草稿数据。</p>
      <div class="form-actions">
        <a class="button-link secondary-link" href="${escapeHtml(searchHref)}" data-route>返回搜索</a>
      </div>
    </section>
  `;
}

function renderApiFallbackNotice() {
  return html`
    <div class="data-warning" data-api-error>
      后端成分 API 暂不可用，当前展示本地草稿数据。未验证数据不能视为权威结论。
    </div>
  `;
}

function renderMissingIngredientPage(id, category, categoryLabel) {
  const safeId = String(id || '').trim();
  const searchHref = `#${categoryPath(category, '/search')}${safeId ? `?q=${encodeURIComponent(safeId)}` : ''}`;
  const supportHref = buildSupportPrefillUrl(category, {
    topic: 'data-correction',
    subject: `${safeId || '未收录成分'} 数据需要补充`,
    message: [
      `待补充成分：${safeId || '未提供 ID'}`,
      `类别：${categoryLabel}`,
      '当前详情页未找到本地数据，请协助核对名称、来源、法规状态或适用食品类别。'
    ].join('\n')
  });

  return html`
    <section class="section missing-ingredient" data-missing-ingredient>
      <p class="eyebrow">${escapeHtml(categoryLabel)} / 暂未收录</p>
      <h1>该成分暂未收录</h1>
      <p class="lead">当前本地数据库还没有 ${safeId ? `“${escapeHtml(safeId)}”` : '这条成分'} 的详情。可以先返回搜索，或提交数据纠错反馈。</p>
      <div class="form-actions">
        <a class="button-link" href="${escapeHtml(searchHref)}" data-route>返回搜索</a>
        <a class="button-link secondary-link" href="${escapeHtml(supportHref)}" data-route data-support-correction-link>反馈这条数据</a>
      </div>
    </section>
  `;
}

export function renderFoodAdditiveDetails(ingredient, category = 'food') {
  if (!ingredient) {
    return '';
  }

  return html`
    <section class="note food-detail">
      <h2>食品添加剂信息</h2>
      <div class="food-detail-grid">
        ${renderField('E-number', ingredient.eNumber)}
        ${renderField('GB / INS 编号', ingredient.gbCode)}
        ${renderField('GB 2760 状态', gbStatusLabel(ingredient.gbStatus))}
        ${renderField('ADI', ingredient.adi)}
        ${renderField('数据状态', reviewStatusLabel(ingredient.reviewStatus))}
      </div>
      ${renderProvenanceDetails(ingredient)}
      ${renderFoodAuditNotice(ingredient)}
      ${renderInfoBlock('适用食品类别', ingredient.foodCategories || [])}
      ${renderUsageLimits(ingredient.usageLimits || [])}
      ${renderSourceReferences(ingredient.sourceReferences || [])}
      ${renderIngredientCorrectionAction(ingredient, category)}
    </section>
  `;
}

function renderProvenanceDetails(ingredient) {
  return html`
    <div class="food-detail-section" data-provenance-details>
      <h3>来源与可信等级</h3>
      <div class="food-detail-grid">
        ${renderField('来源名称', ingredient.sourceName)}
        ${renderField('来源类型', sourceTypeLabel(ingredient.sourceType))}
        ${renderField('来源版本', ingredient.sourceVersion)}
        ${renderField('生效日期', ingredient.effectiveDate)}
        ${renderField('可信等级', confidenceLabel(ingredient.confidenceLevel))}
        ${renderField('最后校验', ingredient.lastReviewedAt)}
        ${renderField('可信来源确认', ingredient.isVerified ? '是' : '否')}
      </div>
      <p class="data-disclaimer">${escapeHtml(ingredient.regulatoryBasis || '暂无法规依据说明。')}</p>
      ${ingredient.sourceUrl ? `<p><a href="${escapeHtml(getSafeHttpUrl(ingredient.sourceUrl) || '#')}" target="_blank" rel="noreferrer">查看来源入口</a></p>` : ''}
      <p class="empty small">原始来源片段：${escapeHtml(ingredient.rawSourceText || '暂无')}</p>
    </div>
  `;
}

function renderFoodAuditNotice(ingredient) {
  const isDraft = !ingredient.reviewStatus || ingredient.reviewStatus === 'draft';
  const hasUsageLimits = Array.isArray(ingredient.usageLimits) && ingredient.usageLimits.length > 0;
  if (!isDraft && hasUsageLimits) return '';

  return html`
    <div class="data-warning" data-food-audit-note>
      草稿数据：逐食品类别限量、ADI 原文和来源条款仍需审核。
    </div>
  `;
}

function renderInfoBlock(title, values = []) {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  return html`
    <div class="info-block">
      <h2>${title}</h2>
      ${items.length
        ? `<div class="chip-list">${items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`
        : html`<p class="empty small">暂无信息</p>`}
    </div>
  `;
}

function renderFunctionInfoBlock(ingredient, category) {
  const items = [
    ingredient.category ? {
      label: ingredient.category,
      href: `#${categoryPath(category, '/search')}?ingredientCategory=${encodeURIComponent(ingredient.category)}`
    } : null,
    ...(ingredient.functions || []).filter(Boolean).map((item) => ({
      label: item,
      href: `#${categoryPath(category, '/search')}?q=${encodeURIComponent(item)}`
    }))
  ].filter(Boolean);

  return html`
    <div class="info-block">
      <h2>功能分类</h2>
      ${items.length
        ? `<div class="chip-list">${items.map((item) => `<a class="chip" href="${escapeHtml(item.href)}" data-route>${escapeHtml(item.label)}</a>`).join('')}</div>`
        : html`<p class="empty small">暂无信息</p>`}
    </div>
  `;
}

function valueOrFallback(value, fallback = '暂无') {
  return value == null || value === '' ? fallback : value;
}

function renderField(label, value) {
  const displayValue = value == null || value === '' ? '暂无' : String(value);
  return html`
    <div class="field-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(displayValue)}</strong>
    </div>
  `;
}

function renderUsageLimits(usageLimits) {
  const limits = Array.isArray(usageLimits) ? usageLimits.filter(Boolean) : [];
  return html`
    <div class="food-detail-section">
      <h3>使用限量</h3>
      ${limits.length
        ? `<ul class="data-list">${limits.map((item) => html`
          <li>
            <strong>${escapeHtml(valueOrFallback(item.foodCategory, '暂无食品类别'))}</strong>
            <span>${escapeHtml(valueOrFallback(item.limit, '暂无限量信息'))}</span>
            ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
          </li>
        `).join('')}</ul>`
        : html`<p class="empty small">暂无明确限量信息</p>`}
    </div>
  `;
}

function renderSourceReferences(sourceReferences) {
  const sources = Array.isArray(sourceReferences) ? sourceReferences.filter(Boolean) : [];
  return html`
    <div class="food-detail-section">
      <h3>数据来源</h3>
      ${sources.length
        ? `<ul class="data-list">${sources.map((source) => html`
          <li>
            <strong>${renderSourceTitle(source)}</strong>
            <span>${escapeHtml(valueOrFallback(source.standard, '暂无标准编号'))}</span>
            ${source.region ? `<small>${escapeHtml(source.region)}</small>` : ''}
          </li>
        `).join('')}</ul>`
        : html`<p class="empty small">暂无来源信息</p>`}
    </div>
  `;
}

function renderIngredientCorrectionAction(ingredient, category) {
  const name = ingredient.nameCn || ingredient.nameEn || '未命名成分';
  const id = ingredient.id || '暂无 ID';
  const href = buildSupportPrefillUrl(category, {
    topic: 'data-correction',
    subject: `${name} 数据需要核对`,
    message: [
      `成分：${name}`,
      `ID：${id}`,
      `当前数据状态：${reviewStatusLabel(ingredient.reviewStatus)}`,
      `当前 GB / INS 编号：${ingredient.gbCode || '暂无'}`,
      '需要核对：来源条款、逐食品类别限量、ADI 原文或风险提示。'
    ].join('\n')
  });
  return html`
    <div class="form-actions data-correction-actions">
      <a class="button-link secondary-link" href="${escapeHtml(href)}" data-route data-support-correction-link>反馈这条数据</a>
    </div>
  `;
}

function renderSourceTitle(source) {
  const title = valueOrFallback(source.title, '暂无来源标题');
  const safeUrl = getSafeHttpUrl(source.url);
  if (!safeUrl) return escapeHtml(title);
  return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`;
}

function renderRelatedIngredients(items, category) {
  if (!items.length) return '';

  return html`
    <section class="section related-section" aria-labelledby="related-ingredients-title" data-related-ingredients>
      <div class="section__head">
        <h2 id="related-ingredients-title">相关成分</h2>
      </div>
      <div class="card-grid related-grid">
        ${items.map((item) => renderRelatedIngredientCard(item, category)).join('')}
      </div>
    </section>
  `;
}

function renderRelatedIngredientCard(ingredient, category) {
  const href = `#${categoryPath(category, `/ingredient/${ingredient.id}`)}`;
  return html`
    <article class="ingredient-card related-card">
      <a href="${escapeHtml(href)}" class="ingredient-card__main compact" data-route>
        <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
        <h3>${escapeHtml(ingredient.nameCn)}</h3>
        <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
        <p>${escapeHtml(ingredient.description)}</p>
        <div class="meta-row">
          <span>${escapeHtml(ingredient.category || '未分类')}</span>
        </div>
        ${renderRelationReasons(ingredient.relationReasons || [])}
      </a>
    </article>
  `;
}

function renderRelationReasons(reasons) {
  const items = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  if (!items.length) return '';
  return html`
    <div class="related-reasons">
      ${items.map((reason) => `<span>${escapeHtml(reason)}</span>`).join('')}
    </div>
  `;
}

function getSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function gbStatusLabel(status) {
  return GB_STATUS_LABELS[status] || GB_STATUS_LABELS.unknown;
}

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[status] || REVIEW_STATUS_LABELS.draft;
}

function sourceTypeLabel(type) {
  const labels = {
    official_standard: '官方标准',
    regulation: '法规文件',
    public_database: '公开数据库',
    manual_verified: '人工确认',
    unknown: '未知来源'
  };
  return labels[type] || labels.unknown;
}

function confidenceLabel(level) {
  const labels = {
    high: '高可信',
    medium: '中可信',
    low: '低可信',
    unverified: '未验证'
  };
  return labels[level] || labels.unverified;
}
