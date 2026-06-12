import { escapeHtml, html } from '../components/render.js';
import { standardAllergens } from '../data/allergens.js';
import { categoryPath, getProductCategory, productCategories } from '../data/categories.js';
import { getOnboardingState, getUserAllergens, isHistoryRecordingEnabled } from '../store/userStore.js';

export function renderOnboardingPage(category = 'food') {
  const onboardingState = getOnboardingState();
  const activeCategory = onboardingState.updatedAt ? onboardingState.preferredCategory : category;
  const selectedAllergens = new Set(getUserAllergens());
  const historyRecordingEnabled = isHistoryRecordingEnabled();

  return html`
    <section class="section onboarding-flow" data-onboarding-flow>
      <div class="section__head">
        <div>
          <p class="eyebrow">首次设置</p>
          <h1>建立本机成分档案</h1>
        </div>
        <span class="count">${onboardingState.status === 'pending' ? '待完成' : '已记录'}</span>
      </div>
      <p class="lead">选择默认关注类别、过敏原和本机记录偏好。所有设置当前只保存在本机浏览器。</p>
    </section>

    <form class="onboarding-form" data-onboarding-form>
      <section class="section onboarding-card">
        <div class="section__head">
          <h2>默认类别</h2>
          <span class="count">${escapeHtml(getProductCategory(activeCategory).label)}</span>
        </div>
        <div class="category-tabs onboarding-category-grid" role="radiogroup" aria-label="默认关注类别">
          ${productCategories.map((item) => renderCategoryOption(item, item.id === activeCategory)).join('')}
        </div>
      </section>

      <section class="section onboarding-card">
        <div class="section__head">
          <h2>设置你的过敏原</h2>
          <span class="count">${selectedAllergens.size} 项已选择</span>
        </div>
        <p class="helper-text">以后可以在设置中修改，并补充关注成分和忌口项。</p>
        <div class="allergen-grid compact-allergen-grid">
          ${standardAllergens.map((allergen) => renderAllergenOption(allergen, selectedAllergens.has(allergen.id))).join('')}
        </div>
      </section>

      <section class="section onboarding-card">
        <div class="section__head">
          <h2>隐私与边界</h2>
        </div>
        <label class="history-privacy-toggle onboarding-toggle">
          <input type="checkbox" name="historyRecordingEnabled" ${historyRecordingEnabled ? 'checked' : ''} />
          <span>
            <strong>自动记录搜索历史</strong>
            <small>关闭后不会记录新的搜索；收藏、报告和过敏原仍保存在本机。</small>
          </span>
        </label>
        <label class="boundary-confirm">
          <input type="checkbox" name="acceptedBoundary" ${onboardingState.acceptedBoundary ? 'checked' : ''} />
          <span>我知道当前数据仍处于草稿审核阶段，结果仅用于日常成分理解，不替代专业判断。</span>
        </label>
        <div class="form-actions">
          <button type="submit">完成并进入</button>
          <button type="button" class="secondary" data-skip-onboarding>稍后再说</button>
          <span class="save-status" data-onboarding-status role="status" aria-live="polite"></span>
        </div>
      </section>
    </form>
  `;
}

function renderCategoryOption(category, checked) {
  return html`
    <label class="onboarding-category-option ${checked ? 'is-active' : ''}">
      <input type="radio" name="category" value="${escapeHtml(category.id)}" ${checked ? 'checked' : ''} />
      <span>
        <strong>${escapeHtml(category.label)}</strong>
        <small>${escapeHtml(category.description)}</small>
      </span>
    </label>
  `;
}

function renderAllergenOption(allergen, checked) {
  const aliasText = allergen.aliases?.length ? allergen.aliases.slice(0, 3).join(' / ') : allergen.nameEn;
  return html`
    <label class="allergen-option">
      <input type="checkbox" name="allergens" value="${escapeHtml(allergen.id)}" ${checked ? 'checked' : ''} />
      <span>
        <strong>${escapeHtml(allergen.nameCn)}</strong>
        <small>${escapeHtml(aliasText)}</small>
      </span>
    </label>
  `;
}

export function renderOnboardingPrompt(category = 'food') {
  return html`
    <section class="section onboarding-prompt" data-onboarding-prompt>
      <div>
        <p class="eyebrow">首次设置</p>
        <h2>补齐默认类别、过敏原和本机隐私偏好</h2>
        <p>完成后，首页、搜索、扫描和报告会沿用同一套本机档案。</p>
      </div>
      <a class="filter-clear" href="#${categoryPath(category, '/onboarding')}" data-route>开始设置</a>
    </section>
  `;
}
