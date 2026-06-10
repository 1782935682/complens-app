import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory, isProductCategory } from '../data/categories.js';
import { getScanDraft } from '../store/userStore.js';

/**
 * @param {string} input Draft ingredient text from the route query.
 * @param {import('../types/ingredient.js').DataCategory} category Active product category.
 */
export function renderScanPage(input = '', category = 'food') {
  const categoryId = isProductCategory(category) ? category : 'food';
  const currentCategory = getProductCategory(categoryId);
  const hasRouteInput = Boolean(String(input || '').trim());
  const savedDraft = getScanDraft(categoryId);
  const draftInput = String(hasRouteInput ? input : savedDraft || '');
  const safeInput = escapeHtml(draftInput);
  const draftStatus = hasRouteInput
    ? '已从链接带入待分析文本。'
    : draftInput
    ? '已恢复本机保存的扫描草稿。'
    : '输入内容会自动保存在本机。';

  return html`
    <section class="section scan-head">
      <div>
        <p class="eyebrow">${currentCategory.label} / 扫描入口</p>
        <h1>扫描成分表</h1>
        <p class="lead">拍照或上传标签图片，先保留图片和可编辑文本，再进入本地成分分析。</p>
      </div>
    </section>

    <section class="section">
      <form class="scan-form" data-scan-form>
        <div class="scan-upload">
          <label for="scan-image">成分表图片</label>
          <input id="scan-image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif" capture="environment" data-scan-image-input />
          <div class="scan-preview" data-scan-preview aria-live="polite">
            <span>未选择图片</span>
          </div>
          <p class="helper-text" data-scan-feedback>当前 OCR 服务尚未接入。选择图片后可以保留预览，并在下方手动录入或校正成分表。</p>
        </div>

        <div class="scan-editor">
          <label for="scan-text">校正后的成分表</label>
          <textarea id="scan-text" name="scanText" rows="8" placeholder="例如：水，柠檬酸，山梨酸钾，黄原胶">${safeInput}</textarea>
          <p class="helper-text">这段文本会传入成分表分析页，匹配本地成分库并生成可保存报告。</p>
        </div>

        <div class="form-actions scan-actions">
          <button type="submit">分析文本</button>
          <button class="secondary" type="button" data-clear-scan-text>清空文本</button>
          <a class="button-link secondary-link" href="#${categoryPath(categoryId, '/analyze')}" data-route>打开文本分析</a>
          <span class="save-status" data-scan-draft-status>${escapeHtml(draftStatus)}</span>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="scan-state-grid" aria-label="扫描状态">
        ${scanStateItem('图片', '支持拍照或相册选择，保留当前图片预览。')}
        ${scanStateItem('校正', '识别结果先进入可编辑文本区，避免直接误判。')}
        ${scanStateItem('分析', '确认文本后进入本地分析、过敏原提示和报告保存。')}
      </div>
    </section>
  `;
}

function scanStateItem(title, description) {
  return html`
    <div class="scan-state-item">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
    </div>
  `;
}
