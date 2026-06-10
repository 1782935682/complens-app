import { ingredientCard, html } from '../components/render.js';
import { getAllIngredients, getPopularIngredients } from '../services/ingredientService.js';
import { getFavoriteIngredients, getHistory } from '../store/userStore.js';

export function renderHomePage() {
  const popular = getPopularIngredients();
  const history = getHistory();
  const favorites = getFavoriteIngredients();
  const categories = [...new Set(getAllIngredients().map((item) => item.category).filter(Boolean))];

  return html`
    <section class="hero">
      <div>
        <p class="eyebrow">成分查询与理解</p>
        <h1>看懂产品成分，少一点盲选。</h1>
        <p class="hero__copy">搜索成分名称、粘贴成分表，快速了解常见用途、关注等级和适用提醒。</p>
      </div>
      <form class="search-panel" data-search-form>
        <label for="home-search">搜索成分</label>
        <div class="search-row">
          <input id="home-search" name="q" type="search" placeholder="如：烟酰胺 / Niacinamide / BHA" autocomplete="off" />
          <button type="submit">搜索</button>
        </div>
      </form>
    </section>

    <section class="quick-actions" aria-label="快捷入口">
      <a class="action-tile" href="#/analyze" data-route>
        <strong>成分表识别</strong>
        <span>粘贴文本并匹配本地库</span>
      </a>
      <a class="action-tile" href="#/favorites" data-route>
        <strong>收藏夹</strong>
        <span>${favorites.length ? `${favorites.length} 个已收藏成分` : '保存常查成分'}</span>
      </a>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>热门成分</h2>
      </div>
      <div class="card-grid">${popular.map((item) => ingredientCard(item)).join('')}</div>
    </section>

    <section class="section two-column">
      <div>
        <div class="section__head">
          <h2>最近查询</h2>
          ${history.length ? '<button class="text-button" data-clear-history>清空</button>' : ''}
        </div>
        ${history.length
          ? `<div class="chip-list">${history.map((item) => `<a class="chip" href="#/search?q=${encodeURIComponent(item)}" data-route>${item}</a>`).join('')}</div>`
          : '<p class="empty">还没有查询记录。</p>'}
      </div>
      <div>
        <div class="section__head">
          <h2>常见分类</h2>
        </div>
        <div class="chip-list">${categories.map((item) => `<a class="chip" href="#/search?q=${encodeURIComponent(item)}" data-route>${item}</a>`).join('')}</div>
      </div>
    </section>
  `;
}
