import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';

export function renderNotFoundPage(path = '/', category = 'food') {
  const currentCategory = getProductCategory(category);
  const safePath = escapeHtml(path || '/');

  return html`
    <section class="section not-found">
      <p class="eyebrow">页面不存在</p>
      <h1>没有找到这个页面</h1>
      <p class="lead">当前地址 <strong>${safePath}</strong> 没有对应的功能页。可以返回当前类别首页，或重新搜索成分。</p>
      <div class="form-actions">
        <a class="button-link" href="#${categoryPath(currentCategory.id)}" data-route>返回${escapeHtml(currentCategory.label)}</a>
        <a class="button-link secondary-link" href="#${categoryPath(currentCategory.id, '/search')}" data-route>去搜索</a>
      </div>
    </section>
  `;
}
