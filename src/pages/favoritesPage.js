import { html, ingredientCard } from '../components/render.js';
import { getFavoriteIngredients } from '../store/userStore.js';

export function renderFavoritesPage() {
  const favorites = getFavoriteIngredients();
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">本地保存</p>
          <h1>收藏夹</h1>
        </div>
        <span class="count">${favorites.length} 项</span>
      </div>
      ${favorites.length
        ? `<div class="card-grid">${favorites.map((item) => ingredientCard(item)).join('')}</div>`
        : '<p class="empty">还没有收藏成分。打开成分详情后可以收藏常查内容。</p>'}
    </section>
  `;
}
