import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { formatAllergenNames, getMatchingUserAllergens } from '../services/allergenService.js';
import { getSearchFilterOptions, getSearchSuggestions, searchIngredients } from '../services/ingredientService.js';
import { getUserAllergens } from '../store/userStore.js';

export function renderSearchPage(query, category = 'cosmetics', filters = {}) {
  const currentCategory = getProductCategory(category);
  const filterOptions = getSearchFilterOptions(category);
  const activeFilters = getValidFilters(filters, filterOptions);
  const results = searchIngredients(query, category, activeFilters);
  const safeQuery = escapeHtml(query || '');
  const activeFilterCount = [activeFilters.risk, activeFilters.ingredientCategory].filter(Boolean).length;
  const suggestions = getSearchSuggestions(query, category, 5);

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
        ${renderFilterControls(category, query, activeFilters, filterOptions)}
      </form>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>${renderResultTitle(safeQuery, activeFilterCount)}</h2>
        <span class="category">${currentCategory.label}</span>
        <span class="count">${results.length} 项</span>
      </div>
      ${renderActiveFilterSummary(activeFilters)}
      ${results.length ? renderResults(results, category) : renderEmpty(safeQuery, activeFilterCount)}
    </section>
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

function renderFilterControls(category, query, activeFilters, options) {
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

function renderActiveFilterSummary(activeFilters) {
  const chips = [];
  if (activeFilters.risk) chips.push(`关注等级：${riskLabel(activeFilters.risk)}`);
  if (activeFilters.ingredientCategory) chips.push(`成分分类：${activeFilters.ingredientCategory}`);
  if (!chips.length) return '';

  return html`
    <div class="filter-summary" aria-label="当前筛选条件">
      ${chips.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
    </div>
  `;
}

function renderResults(results, category) {
  const userAllergens = getUserAllergens();
  return html`
    <div class="result-list">
      ${results.map((result) => {
        const allergenMatches = getMatchingUserAllergens(result, userAllergens);
        return html`
        <a class="result-item" href="#${categoryPath(category, `/ingredient/${result.id}`)}" data-route>
          <div>
            <span class="${riskClass(result.riskLevel)}">${riskLabel(result.riskLevel)}</span>
            ${allergenMatches.length ? `<span class="allergen-badge">过敏原：${escapeHtml(formatAllergenNames(allergenMatches))}</span>` : ''}
            <h3>${escapeHtml(result.nameCn)}</h3>
            <p class="latin">${escapeHtml(result.nameEn || '')}</p>
            <p>${escapeHtml(result.description)}</p>
          </div>
          <span class="category">${escapeHtml(result.category || '未分类')}</span>
        </a>
      `;
      }).join('')}
    </div>
  `;
}

function renderEmpty(query, activeFilterCount) {
  if (activeFilterCount) return '<p class="empty">没有符合当前筛选条件的成分。可以放宽筛选条件或换一个关键词。</p>';
  if (!query) return '<p class="empty">输入成分名称、英文名、别名或分类后开始搜索。</p>';
  return '<p class="empty">暂未找到相关成分。可以尝试英文名、别名，或到成分表识别页粘贴完整文本。</p>';
}

function getValidFilters(filters, options) {
  const risk = options.riskLevels.includes(filters?.risk) ? filters.risk : '';
  const ingredientCategory = options.categories.includes(filters?.ingredientCategory) ? filters.ingredientCategory : '';
  return { risk, ingredientCategory };
}

function hasActiveFilters(filters) {
  return Boolean(filters.risk || filters.ingredientCategory);
}

function buildSearchHref(category, query) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const queryString = params.toString();
  return `#${categoryPath(category, '/search')}${queryString ? `?${queryString}` : ''}`;
}
