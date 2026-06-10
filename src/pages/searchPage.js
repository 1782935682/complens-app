import { escapeHtml, html, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { searchIngredients } from '../services/ingredientService.js';

export function renderSearchPage(query, category = 'cosmetics') {
  const currentCategory = getProductCategory(category);
  const results = searchIngredients(query, category);
  const safeQuery = escapeHtml(query || '');

  return html`
    <section class="section">
      <form class="search-panel compact" data-search-form>
        <label for="search-page-input">搜索成分</label>
        <div class="search-row">
          <input id="search-page-input" name="q" type="search" value="${safeQuery}" placeholder="中文名、英文名、别名或分类" autocomplete="off" />
          <button type="submit">搜索</button>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>${safeQuery ? `“${safeQuery}” 的搜索结果` : '搜索结果'}</h2>
        <span class="category">${currentCategory.label}</span>
        <span class="count">${results.length} 项</span>
      </div>
      ${results.length ? renderResults(results, category) : renderEmpty(safeQuery)}
    </section>
  `;
}

function renderResults(results, category) {
  return html`
    <div class="result-list">
      ${results.map((result) => html`
        <a class="result-item" href="#${categoryPath(category, `/ingredient/${result.id}`)}" data-route>
          <div>
            <span class="${riskClass(result.riskLevel)}">${riskLabel(result.riskLevel)}</span>
            <h3>${escapeHtml(result.nameCn)}</h3>
            <p class="latin">${escapeHtml(result.nameEn || '')}</p>
            <p>${escapeHtml(result.description)}</p>
          </div>
          <span class="category">${escapeHtml(result.category || '未分类')}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderEmpty(query) {
  if (!query) return '<p class="empty">输入成分名称、英文名、别名或分类后开始搜索。</p>';
  return '<p class="empty">暂未找到相关成分。可以尝试英文名、别名，或到成分表识别页粘贴完整文本。</p>';
}
