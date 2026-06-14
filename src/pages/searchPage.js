import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getCategoryStats, getDatasetAuditSummary, getSearchFilterOptions, getSearchSuggestions, searchIngredients } from '../services/ingredientService.js';
import { getPersonalIngredientHit, getPersonalProfile } from '../services/personalProfileService.js';
import { isInCompare } from '../store/userStore.js';
import { dataStatusBadgeClass, dataStatusLabel } from '../utils/dataStatus.js';

const SEARCH_PAGE_SIZE = 6;
const DEFAULT_SEARCH_SORT = 'relevance';
const SEARCH_SORT_OPTIONS = [
  { value: DEFAULT_SEARCH_SORT, label: '默认排序' },
  { value: 'risk', label: '关注等级优先' },
  { value: 'name', label: '中文名排序' }
];

export function renderSearchPage(query, category = 'cosmetics', filters = {}, page = 1, sort = DEFAULT_SEARCH_SORT, apiState = null) {
  const currentCategory = getProductCategory(category);
  const filterOptions = getSearchFilterOptions(category);
  const activeFilters = getValidFilters(filters, filterOptions);
  const activeSort = getValidSort(sort);
  const localResults = sortSearchResults(searchIngredients(query, category, activeFilters), activeSort);
  const isApiLoading = apiState?.status === 'loading';
  const isApiSuccess = apiState?.status === 'success';
  const apiResults = isApiSuccess ? normalizeApiSearchItems(apiState.items) : [];
  const results = isApiSuccess ? sortSearchResults(apiResults, activeSort) : localResults;
  const riskFacets = isApiSuccess
    ? getApiRiskFacets(apiState.riskFacets, results, filterOptions.riskLevels)
    : getRiskFacets(query, category, activeFilters, filterOptions.riskLevels);
  const categoryFacets = isApiSuccess
    ? getApiCategoryFacets(apiState.categoryFacets, results)
    : getCategoryFacets(query, category, activeFilters);
  const totalCount = isApiSuccess ? Number(apiState.total || results.length) : results.length;
  const totalPages = isApiSuccess ? Math.max(1, Number(apiState.totalPages || Math.ceil(totalCount / SEARCH_PAGE_SIZE)) || 1) : Math.max(1, Math.ceil(results.length / SEARCH_PAGE_SIZE));
  const activePage = isApiSuccess ? Number(apiState.page || page) : page;
  const currentPage = clampPage(activePage, totalPages);
  const pagedResults = isApiSuccess ? results : results.slice((currentPage - 1) * SEARCH_PAGE_SIZE, currentPage * SEARCH_PAGE_SIZE);
  const safeQuery = escapeHtml(query || '');
  const activeFilterCount = [activeFilters.risk, activeFilters.ingredientCategory].filter(Boolean).length;
  const suggestions = getSearchSuggestions(query, category, 5);
  const assistSuggestions = getAssistSuggestions(suggestions);
  const auditSummary = getDatasetAuditSummary(category);

  return html`
    <section class="section">
      <form class="search-panel compact" data-search-form data-suggestion-category="${escapeHtml(category)}">
        <label for="search-page-input">搜索成分</label>
        <div class="search-row">
          <input id="search-page-input" name="q" type="search" value="${safeQuery}" placeholder="中文名、英文名、别名或分类" autocomplete="off" aria-describedby="search-page-suggestions" />
          <button type="submit">搜索</button>
        </div>
        <div id="search-page-suggestions" class="search-suggestions" data-search-suggestions aria-live="polite">
          ${query ? renderSuggestionLinks(suggestions, category) : ''}
        </div>
        ${renderFilterControls(category, query, activeFilters, filterOptions, activeSort)}
      </form>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>${renderResultTitle(safeQuery, activeFilterCount)}</h2>
        <span class="category">${currentCategory.label}</span>
        <span class="count">${totalCount} 项</span>
      </div>
      ${renderApiStateNotice(apiState)}
      ${renderActiveFilterSummary(activeFilters, activeSort)}
      ${renderDatasetAuditNotice(category, auditSummary)}
      ${renderSearchAssist(assistSuggestions, category)}
      ${renderRiskFacets(riskFacets, category, query, activeFilters, activeSort)}
      ${renderCategoryFacets(categoryFacets, category, query, activeFilters, activeSort)}
      ${isApiLoading ? renderLoadingState() : ''}
      ${!isApiLoading && results.length ? renderPageSummary(totalCount, currentPage, pagedResults.length) : ''}
      ${!isApiLoading && results.length ? renderCompareShortcut(category) : ''}
      ${!isApiLoading && results.length ? renderResults(pagedResults, category) : ''}
      ${!isApiLoading && !results.length ? renderEmpty(safeQuery, activeFilterCount, category) : ''}
      ${!isApiLoading && results.length ? renderPagination(category, query, activeFilters, activeSort, currentPage, totalPages) : ''}
    </section>
  `;
}

function renderApiStateNotice(apiState) {
  if (!apiState || apiState.status === 'idle') return '';
  if (apiState.status === 'loading') {
    return '<p class="data-disclaimer" data-api-loading>正在从后端数据库读取成分数据...</p>';
  }
  if (apiState.status === 'success') {
    return '<p class="data-disclaimer" data-api-success>当前结果来自后端数据库；未验证数据会单独标识。</p>';
  }
  if (apiState.status === 'error') {
    return html`
      <div class="error-state" data-api-error>
        <p class="error-state-title">后端成分 API 暂不可用</p>
        <p class="error-desc">已降级为本地草稿数据。请不要将未验证数据视为权威结论。</p>
        <button type="button" class="secondary" data-route-retry>重试</button>
      </div>
    `;
  }
  return '';
}

function renderLoadingState() {
  return html`
    <div class="empty-state loading-state" data-search-loading aria-busy="true">
      <div class="skeleton skeleton-card" aria-hidden="true"></div>
      <div class="skeleton skeleton-text skeleton-text--wide" aria-hidden="true"></div>
      <div class="skeleton skeleton-text" aria-hidden="true"></div>
      <p class="empty-state-title">正在加载后端数据库结果</p>
      <p class="empty-state-desc">优先读取服务端食品添加剂库，完成后会自动刷新结果列表。</p>
    </div>
  `;
}

function renderDatasetAuditNotice(category, summary) {
  if (category !== 'food') return '';
  return html`
    <p class="data-disclaimer" data-dataset-audit-note>
      当前食品添加剂库含 ${summary.totalCount} 条记录，${summary.reviewedOrVerifiedCount} 条已复核/验证；使用限量和 ADI 原文仍在审核中。
    </p>
  `;
}

function renderSuggestionLinks(suggestions, category) {
  if (!suggestions.length) return '';
  return html`
    ${suggestions.map((item) => html`
      <a class="suggestion-item" href="#${categoryPath(category, `/ingredient/${item.id}`)}" data-route>
        <span class="${riskClass(item.riskLevel)}">${riskLabel(item.riskLevel)}</span>
        <strong>${escapeHtml(item.nameCn)}</strong>
        <small>${escapeHtml([item.nameEn, item.matchedText ? `${item.matchLabel}：${item.matchedText}` : item.category].filter(Boolean).join(' / '))}</small>
      </a>
    `).join('')}
  `;
}

function renderSearchAssist(suggestions, category) {
  if (!suggestions.length) return '';
  return html`
    <div class="search-assist" data-search-assist>
      <strong>可能相关</strong>
      <div class="search-assist__list">
        ${suggestions.map((item) => html`
          <a class="search-assist__item" href="#${categoryPath(category, `/ingredient/${item.id}`)}" data-route>
            <span class="${riskClass(item.riskLevel)}">${riskLabel(item.riskLevel)}</span>
            <span>${escapeHtml(item.nameCn)}</span>
            <small>${escapeHtml(`${item.matchLabel}：${item.matchedText}`)}</small>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderFilterControls(category, query, activeFilters, options, activeSort) {
  return html`
    <div class="filter-row">
      <label class="filter-field" for="risk-filter">
        <span>关注等级</span>
        <select id="risk-filter" name="risk">
          <option value="">全部等级</option>
          ${options.riskLevels.map((level) => html`
            <option value="${escapeHtml(level)}" ${activeFilters.risk === level ? 'selected' : ''}>${riskLabel(level)}</option>
          `).join('')}
        </select>
      </label>
      <label class="filter-field" for="ingredient-category-filter">
        <span>成分分类</span>
        <select id="ingredient-category-filter" name="ingredientCategory">
          <option value="">全部分类</option>
          ${options.categories.map((item) => html`
            <option value="${escapeHtml(item)}" ${activeFilters.ingredientCategory === item ? 'selected' : ''}>${escapeHtml(item)}</option>
          `).join('')}
        </select>
      </label>
      <label class="filter-field" for="sort-filter">
        <span>排序</span>
        <select id="sort-filter" name="sort">
          ${SEARCH_SORT_OPTIONS.map((item) => html`
            <option value="${escapeHtml(item.value)}" ${activeSort === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>
          `).join('')}
        </select>
      </label>
      ${hasActiveFilters(activeFilters) ? html`
        <a class="filter-clear" href="${buildSearchHref(category, query)}" data-route>清除筛选</a>
      ` : ''}
    </div>
  `;
}

function renderResultTitle(safeQuery, activeFilterCount) {
  if (safeQuery && activeFilterCount) return `“${safeQuery}” 的筛选结果`;
  if (safeQuery) return `“${safeQuery}” 的搜索结果`;
  if (activeFilterCount) return '筛选结果';
  return '搜索结果';
}

function renderActiveFilterSummary(activeFilters, activeSort) {
  const chips = [];
  if (activeFilters.risk) chips.push(`关注等级：${riskLabel(activeFilters.risk)}`);
  if (activeFilters.ingredientCategory) chips.push(`成分分类：${activeFilters.ingredientCategory}`);
  if (activeSort !== DEFAULT_SEARCH_SORT) chips.push(`排序：${sortLabel(activeSort)}`);
  if (!chips.length) return '';

  return html`
    <div class="filter-summary" aria-label="当前筛选条件">
      ${chips.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
    </div>
  `;
}

function renderRiskFacets(facets, category, query, activeFilters, activeSort) {
  if (!facets.length) return '';

  const totalCount = facets.reduce((total, item) => total + item.count, 0);
  const baseFilters = { ...activeFilters, risk: '' };
  return html`
    <div class="risk-facets" aria-label="按关注等级筛选">
      <a class="risk-facet ${activeFilters.risk ? '' : 'is-active'}" href="${buildSearchHref(category, query, baseFilters, 1, activeSort)}" data-route>
        <span>全部</span>
        <strong>${totalCount}</strong>
      </a>
      ${facets.map((item) => {
        const filters = { ...activeFilters, risk: item.level };
        return html`
          <a class="risk-facet ${activeFilters.risk === item.level ? 'is-active' : ''}" href="${buildSearchHref(category, query, filters, 1, activeSort)}" data-route>
            <span class="${riskClass(item.level)}">${riskLabel(item.level)}</span>
            <strong>${item.count}</strong>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

function renderCategoryFacets(facets, category, query, activeFilters, activeSort) {
  if (!facets.length) return '';

  const totalCount = facets.reduce((total, item) => total + item.count, 0);
  const baseFilters = { ...activeFilters, ingredientCategory: '' };
  return html`
    <div class="category-facets" aria-label="按成分分类筛选">
      <a class="category-facet ${activeFilters.ingredientCategory ? '' : 'is-active'}" href="${buildSearchHref(category, query, baseFilters, 1, activeSort)}" data-route>
        <span>全部分类</span>
        <strong>${totalCount}</strong>
      </a>
      ${facets.map((item) => {
        const filters = { ...activeFilters, ingredientCategory: item.name };
        return html`
          <a class="category-facet ${activeFilters.ingredientCategory === item.name ? 'is-active' : ''}" href="${buildSearchHref(category, query, filters, 1, activeSort)}" data-route>
            <span>${escapeHtml(item.name)}</span>
            <strong>${item.count}</strong>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

function renderPageSummary(totalCount, currentPage, pageCount) {
  const start = (currentPage - 1) * SEARCH_PAGE_SIZE + 1;
  const end = start + pageCount - 1;
  return html`<p class="page-summary">显示第 ${start}-${end} 项，共 ${totalCount} 项</p>`;
}

function renderResults(results, category) {
  const profile = getPersonalProfile(category);
  return html`
    <div class="result-list">
      ${results.map((result) => {
        const personalHit = getPersonalIngredientHit(result, category, profile);
        const compared = isInCompare(result.id, category);
        return html`
        <article class="result-item">
          <a class="result-item__main" href="#${categoryPath(category, `/ingredient/${result.id}`)}" data-route>
            <span class="${riskClass(result.riskLevel)}">${riskLabel(result.riskLevel)}</span>
            ${personalHit ? renderPersonalHitBadge(personalHit) : ''}
            ${shouldShowProvenanceBadge(result, category) ? `<span class="data-badge ${escapeHtml(dataStatusBadgeClass(result.dataStatus))}">${escapeHtml(dataStatusLabel(result.dataStatus))}</span>` : ''}
            <h3>${escapeHtml(result.nameCn)}</h3>
            <p class="latin">${escapeHtml(result.nameEn || '')}</p>
            <p>${escapeHtml(result.description)}</p>
          </a>
          <div class="result-item__side">
            <span class="category">${escapeHtml(result.category || '未分类')}</span>
            <button type="button" class="secondary ${compared ? 'is-active' : ''}" data-compare-add="${escapeHtml(result.id)}">
              ${compared ? '已加入' : '对比'}
            </button>
          </div>
        </article>
      `;
      }).join('')}
    </div>
  `;
}

function renderPersonalHitBadge(hit) {
  return `<span class="personal-badge personal-badge--${escapeHtml(hit.type)}">${escapeHtml(hit.badgeLabel)}</span>`;
}

function shouldShowProvenanceBadge(result, category) {
  return category === 'food' && result?.isVerified === false;
}

function normalizeApiSearchItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    id: item.id,
    nameCn: item.nameCn,
    nameEn: item.nameEn,
    description: item.description,
    riskLevel: item.riskLevel,
    category: item.category,
    gbCode: item.gbCode,
    eNumber: item.eNumber,
    allergenTypes: item.allergenTypes || [],
    confidenceLevel: item.confidenceLevel,
    matchConfidence: item.matchConfidence,
    dataStatus: item.dataStatus,
    sourceScope: item.sourceScope,
    isVerified: item.isVerified,
    sourceName: item.sourceName,
    reviewStatus: item.reviewStatus
  }));
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

function renderCompareShortcut(category) {
  return html`
    <div class="compare-inline">
      <a class="inline-link" href="#${categoryPath(category, '/compare')}" data-route>查看成分对比</a>
      <span class="save-status" data-compare-status role="status" aria-live="polite"></span>
    </div>
  `;
}

function renderPagination(category, query, activeFilters, activeSort, currentPage, totalPages) {
  if (totalPages <= 1) return '';

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  return html`
    <nav class="pagination" aria-label="搜索结果分页">
      ${currentPage > 1
        ? html`<a class="pagination__link" href="${buildSearchHref(category, query, activeFilters, currentPage - 1, activeSort)}" data-route>上一页</a>`
        : html`<span class="pagination__link is-disabled">上一页</span>`}
      ${pageNumbers.map((pageNumber) => pageNumber === currentPage
        ? html`<span class="pagination__page is-active" aria-current="page">${pageNumber}</span>`
        : html`<a class="pagination__page" href="${buildSearchHref(category, query, activeFilters, pageNumber, activeSort)}" data-route>${pageNumber}</a>`).join('')}
      ${currentPage < totalPages
        ? html`<a class="pagination__link" href="${buildSearchHref(category, query, activeFilters, currentPage + 1, activeSort)}" data-route>下一页</a>`
        : html`<span class="pagination__link is-disabled">下一页</span>`}
    </nav>
  `;
}

function renderEmpty(query, activeFilterCount, category) {
  if (!query && !activeFilterCount) {
    return html`
      <div class="empty-state" data-search-initial-state>
        <div class="empty-state-icon" aria-hidden="true">搜</div>
        <p class="empty-state-title">输入关键词或直接识别配料表</p>
        <p class="empty-state-desc">可搜索成分名称、英文名、别名或分类；也可以从包装图或完整配料表开始分析。</p>
        <div class="form-actions">
          <a class="button-link" href="#${categoryPath(category, '/scan')}" data-route>拍照识别配料表</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/analyze')}" data-route>粘贴配料表分析</a>
        </div>
      </div>
    `;
  }
  const message = activeFilterCount
    ? '没有符合当前筛选条件的成分。可以放宽筛选条件或换一个关键词。'
    : '未找到相关成分。可以尝试英文名、别名，或到扫描页/分析页录入完整成分表。';
  return html`
    <div class="empty-state" data-search-empty-state>
      <div class="empty-state-icon" aria-hidden="true">搜</div>
      <p class="empty-state-title">${activeFilterCount ? '没有符合筛选的成分' : '未找到相关成分'}</p>
      <p class="empty-state-desc">${escapeHtml(message)}</p>
      <a class="button-link" href="#${categoryPath(category, '/scan')}" data-route>去拍照识别</a>
      ${renderEmptyCategoryEntrances(category)}
    </div>
  `;
}

function renderEmptyCategoryEntrances(category) {
  const categories = getCategoryStats(category).slice(0, 3);
  if (!categories.length) return '';

  return html`
    <div class="search-empty-categories" data-empty-category-links>
      <strong>热门分类</strong>
      <div class="chip-list">
        ${categories.map((item) => html`
          <a class="chip category-chip" href="#${categoryPath(category, '/search')}?ingredientCategory=${encodeURIComponent(item.name)}" data-route>
            <span>${escapeHtml(item.name)}</span>
            <small>${item.count} 项</small>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function getValidFilters(filters, options) {
  const risk = options.riskLevels.includes(filters?.risk) ? filters.risk : '';
  const ingredientCategory = options.categories.includes(filters?.ingredientCategory) ? filters.ingredientCategory : '';
  return { risk, ingredientCategory };
}

function hasActiveFilters(filters) {
  return Boolean(filters.risk || filters.ingredientCategory);
}

function getAssistSuggestions(suggestions) {
  const assistLabels = new Set(['拼音', '首字母', '常见写法', '近似']);
  return suggestions.filter((item) => assistLabels.has(item.matchLabel)).slice(0, 3);
}

function buildSearchHref(category, query, filters = {}, page = 1, sort = DEFAULT_SEARCH_SORT) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters.risk) params.set('risk', filters.risk);
  if (filters.ingredientCategory) params.set('ingredientCategory', filters.ingredientCategory);
  if (sort && sort !== DEFAULT_SEARCH_SORT) params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const queryString = params.toString();
  return `#${categoryPath(category, '/search')}${queryString ? `?${queryString}` : ''}`;
}

function getValidSort(sort) {
  return SEARCH_SORT_OPTIONS.some((item) => item.value === sort) ? sort : DEFAULT_SEARCH_SORT;
}

function getRiskFacets(query, category, activeFilters, riskLevels) {
  const baseFilters = { ...activeFilters, risk: '' };
  const items = searchIngredients(query, category, baseFilters);
  if (!items.length) return [];

  const counts = new Map();
  for (const item of items) {
    const risk = item.riskLevel || 'unknown';
    counts.set(risk, (counts.get(risk) || 0) + 1);
  }

  return riskLevels
    .map((level) => ({ level, count: counts.get(level) || 0 }))
    .filter((item) => item.count > 0);
}

function getResultRiskFacets(items, riskLevels) {
  if (!items.length) return [];

  const counts = new Map();
  for (const item of items) {
    const risk = item.riskLevel || 'unknown';
    counts.set(risk, (counts.get(risk) || 0) + 1);
  }

  return riskLevels
    .map((level) => ({ level, count: counts.get(level) || 0 }))
    .filter((item) => item.count > 0);
}

function getApiRiskFacets(facets, fallbackItems, riskLevels) {
  if (!Array.isArray(facets)) return getResultRiskFacets(fallbackItems, riskLevels);

  const counts = new Map();
  for (const item of facets) {
    const level = String(item?.level || '').trim();
    const count = Number(item?.count || 0);
    if (riskLevels.includes(level) && count > 0) {
      counts.set(level, count);
    }
  }

  return riskLevels
    .map((level) => ({ level, count: counts.get(level) || 0 }))
    .filter((item) => item.count > 0);
}

function getCategoryFacets(query, category, activeFilters) {
  const baseFilters = { ...activeFilters, ingredientCategory: '' };
  const items = searchIngredients(query, category, baseFilters);
  if (!items.length) return [];

  const counts = new Map();
  for (const item of items) {
    const name = item.category || '未分类';
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function getApiCategoryFacets(facets, fallbackItems) {
  if (!Array.isArray(facets)) return getResultCategoryFacets(fallbackItems);

  return facets
    .map((item) => ({
      name: String(item?.name || '').trim() || '未分类',
      count: Number(item?.count || 0)
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function getResultCategoryFacets(items) {
  if (!items.length) return [];

  const counts = new Map();
  for (const item of items) {
    const name = item.category || '未分类';
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function sortSearchResults(results, sort) {
  const items = [...results];
  if (sort === 'risk') {
    return items.sort((a, b) => riskSortValue(b.riskLevel) - riskSortValue(a.riskLevel) || a.nameCn.localeCompare(b.nameCn, 'zh-Hans-CN'));
  }
  if (sort === 'name') {
    return items.sort((a, b) => a.nameCn.localeCompare(b.nameCn, 'zh-Hans-CN'));
  }
  return items;
}

function riskSortValue(level) {
  const values = {
    high: 3,
    medium: 2,
    unknown: 1,
    low: 0
  };
  return values[level] ?? values.unknown;
}

function sortLabel(sort) {
  return SEARCH_SORT_OPTIONS.find((item) => item.value === sort)?.label || SEARCH_SORT_OPTIONS[0].label;
}

function clampPage(page, totalPages) {
  const normalizedPage = Number.parseInt(page || 1, 10);
  if (!Number.isFinite(normalizedPage) || normalizedPage < 1) return 1;
  return Math.min(normalizedPage, totalPages);
}
