import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory, isProductCategory } from '../data/categories.js';
import { OCR_PROTOCOL_VERSION } from '../services/ocrService.js';
import { getScanDraft } from '../store/userStore.js';
import { formatBytes, SCAN_IMAGE_MAX_BYTES } from '../utils/imageFile.js';

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
          <div class="scan-image-actions" aria-label="图片预览操作">
            <button class="secondary" type="button" data-rotate-scan-image disabled>旋转预览</button>
            <button class="secondary" type="button" data-clear-scan-image disabled>移除图片</button>
          </div>
          <p class="helper-text" data-scan-feedback>当前 OCR 服务尚未接入。协议 v${OCR_PROTOCOL_VERSION} 已固定，支持 PNG、JPEG、WebP、GIF、BMP、AVIF，单张不超过 ${formatBytes(SCAN_IMAGE_MAX_BYTES)}。</p>
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
      <div class="scan-protocol-panel">
        <div>
          <p class="eyebrow">OCR 服务端代理 / 待接入</p>
          <h2>识别协议已就绪</h2>
          <p class="helper-text">图片会先经过本地类型和大小检查；后续接入服务端 OCR 后，识别文本仍会先进入校正区，不直接生成判断。</p>
        </div>
        <div class="scan-protocol-grid" aria-label="OCR 协议状态">
          ${scanProtocolItem('协议版本', `v${OCR_PROTOCOL_VERSION}`)}
          ${scanProtocolItem('服务状态', 'OCR 服务未接入，请手动输入文字')}
          ${scanProtocolItem('文件上限', formatBytes(SCAN_IMAGE_MAX_BYTES))}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="scan-state-grid" aria-label="扫描状态">
        ${scanStateItem('图片', `支持拍照或相册选择，单张不超过 ${formatBytes(SCAN_IMAGE_MAX_BYTES)}。`)}
        ${scanStateItem('校正', '识别结果先进入可编辑文本区，避免直接误判。')}
        ${scanStateItem('分析', '确认文本后进入本地分析、过敏原提示和报告保存。')}
      </div>
    </section>
  `;
}

function scanProtocolItem(title, value) {
  return html`
    <div class="scan-protocol-item">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
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
