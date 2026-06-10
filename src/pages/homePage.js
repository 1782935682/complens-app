import { categoryPath, getProductCategory, productCategories } from '../data/categories.js';
import { ingredientCard, html } from '../components/render.js';
import { getAllIngredients, getPopularIngredients } from '../services/ingredientService.js';
import { getFavoriteIngredients, getHistory } from '../store/userStore.js';

export function renderHomePage(category = 'food') {
  const currentCategory = getProductCategory(category);
  const popular = getPopularIngredients(category);
  const history = getHistory();
  const favorites = getFavoriteIngredients();
  const ingredientCategories = [...new Set(getAllIngredients(category).map((item) => item.category).filter(Boolean))];

  return html`
    ${renderCategoryTabs(category)}
    <section class="hero">
      <div>
        <p class="eyebrow">${currentCategory.label}</p>
        <h1>${category === 'food' ? '看懂食品添加剂，少一点猜测。' : '看懂产品成分，少一点盲选。'}</h1>
        <p class="hero__copy">${currentCategory.description}</p>
      </div>
      <form class="search-panel" data-search-form>
        <label for="home-search">搜索成分</label>
        <div class="search-row">
          <input id="home-search" name="q" type="search" placeholder="${category === 'food' ? '如：柠檬酸 / E330 / INS 330' : '如：烟酰胺 / Niacinamide / BHA'}" autocomplete="off" />
          <button type="submit">搜索</button>
        </div>
      </form>
    </section>

    <section class="quick-actions" aria-label="快捷入口">
      <a class="action-tile" href="#${categoryPath(category, '/analyze')}" data-route>
        <strong>成分表识别</strong>
        <span>粘贴文本并匹配本地库</span>
      </a>
      <a class="action-tile" href="#${categoryPath(category, '/favorites')}" data-route>
        <strong>收藏夹</strong>
        <span>${favorites.length ? `${favorites.length} 个已收藏成分` : '保存常查成分'}</span>
      </a>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>热门成分</h2>
      </div>
      ${popular.length
        ? `<div class="card-grid">${popular.map((item) => ingredientCard(item, { href: `#${categoryPath(category, `/ingredient/${item.id}`)}` })).join('')}</div>`
        : '<p class="empty">当前类别还没有可展示的热门成分。</p>'}
    </section>

    <section class="section two-column">
      <div>
        <div class="section__head">
          <h2>最近查询</h2>
          ${history.length ? '<button class="text-button" data-clear-history>清空</button>' : ''}
        </div>
        ${history.length
          ? `<div class="chip-list">${history.map((item) => `<a class="chip" href="#${categoryPath(category, '/search')}?q=${encodeURIComponent(item)}" data-route>${item}</a>`).join('')}</div>`
          : '<p class="empty">还没有查询记录。</p>'}
      </div>
      <div>
        <div class="section__head">
          <h2>常见分类</h2>
        </div>
        ${ingredientCategories.length
          ? `<div class="chip-list">${ingredientCategories.map((item) => `<a class="chip" href="#${categoryPath(category, '/search')}?q=${encodeURIComponent(item)}" data-route>${item}</a>`).join('')}</div>`
          : '<p class="empty">当前类别还没有分类数据。</p>'}
      </div>
    </section>
  `;
}

function renderCategoryTabs(activeCategory) {
  return html`
    <nav class="category-tabs" aria-label="成分类别">
      ${productCategories.map((category) => html`
        <a class="${category.id === activeCategory ? 'is-active' : ''}" href="#${categoryPath(category.id)}" data-route>
          <strong>${category.label}</strong>
          <span>${category.id === 'food' ? '主线' : '后续'}</span>
        </a>
      `).join('')}
    </nav>
  `;
}
