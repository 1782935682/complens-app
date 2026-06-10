import { escapeHtml, html } from '../components/render.js';
import { standardAllergens } from '../data/allergens.js';
import { getUserAllergens } from '../store/userStore.js';

export function renderSettingsPage() {
  const selected = new Set(getUserAllergens());
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">个人设置</p>
          <h1>过敏原档案</h1>
        </div>
        <span class="count" data-allergen-count>${selected.size} 项已关注</span>
      </div>
      <p class="lead">选择需要重点提示的过敏原。搜索、详情和成分表分析会优先标出匹配项。</p>
    </section>

    <section class="section">
      <form class="settings-panel" data-allergen-form>
        <div class="allergen-grid">
          ${standardAllergens.map((allergen) => renderAllergenOption(allergen, selected.has(allergen.id))).join('')}
        </div>
        <div class="form-actions">
          <button type="submit">保存设置</button>
          <button type="button" class="secondary" data-clear-allergens>清空选择</button>
          <span class="save-status" data-allergen-status role="status" aria-live="polite"></span>
        </div>
      </form>
    </section>
  `;
}

function renderAllergenOption(allergen, checked) {
  const aliasText = allergen.aliases?.length ? allergen.aliases.slice(0, 4).join(' / ') : allergen.nameEn;
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
