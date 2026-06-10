import { escapeHtml, html, ingredientCard } from '../components/render.js';
import { analyzeIngredientText } from '../services/ingredientService.js';

export function renderAnalyzePage(input = '') {
  const result = analyzeIngredientText(input);
  const safeInput = escapeHtml(input);

  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">文本识别版</p>
          <h1>成分表分析</h1>
        </div>
      </div>
      <form class="analyze-form" data-analyze-form>
        <label for="ingredient-text">粘贴产品成分表</label>
        <textarea id="ingredient-text" name="ingredients" rows="8" placeholder="例如：水，烟酰胺，透明质酸钠，香精">${safeInput}</textarea>
        <div class="upload-field">
          <label for="ingredient-image">上传图片</label>
          <input id="ingredient-image" name="image" type="file" accept="image/*" data-image-input />
          <p class="helper-text" data-image-feedback>当前版本已预留图片识别入口，未接入 OCR 时可使用文本输入。</p>
        </div>
        <div class="form-actions">
          <button type="submit">开始分析</button>
          <button type="button" class="secondary" data-fill-sample>填入示例</button>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="summary-box">
        <strong>整体说明</strong>
        <p>${escapeHtml(result.summary)}</p>
      </div>
    </section>

    ${result.highlights.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>重点关注成分</h2>
        </div>
        <div class="card-grid">${result.highlights.map((item) => ingredientCard(item)).join('')}</div>
      </section>
    ` : ''}

    ${result.ingredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>已匹配成分</h2>
          <span class="count">${result.matchedCount} 项</span>
        </div>
        <div class="card-grid">${result.ingredients.map((item) => ingredientCard(item)).join('')}</div>
      </section>
    ` : ''}

    ${result.unknownItems.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>暂未收录</h2>
        </div>
        <div class="chip-list">${result.unknownItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>
      </section>
    ` : ''}
  `;
}
