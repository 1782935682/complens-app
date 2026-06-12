import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory, isProductCategory } from '../data/categories.js';
import { getPendingScan } from '../store/userStore.js';
import { parseIngredientList } from '../utils/text.js';

export function renderOcrConfirmPage(category = 'food') {
  const categoryId = isProductCategory(category) ? category : 'food';
  const currentCategory = getProductCategory(categoryId);
  const pending = getPendingScan();
  const sameCategory = pending.category === categoryId;
  const text = sameCategory ? pending.pendingText : '';
  const productName = sameCategory ? pending.pendingProductName : '';
  const count = parseIngredientList(text).length;
  const status = sameCategory ? pending.status : 'manual';
  const mode = sameCategory ? pending.pendingOcrMode : 'manual';
  const canAnalyze = Boolean(text.trim());

  return html`
    <section class="ocr-confirm-page">
      <div class="scan-topbar">
        <a class="secondary-link" href="#${categoryPath(categoryId, '/scan')}" data-route>返回</a>
        <div>
          <p class="eyebrow">${currentCategory.label}</p>
          <h1>确认配料表内容</h1>
        </div>
      </div>

      <section class="ocr-source-card ocr-source-card--${escapeHtml(status)}">
        <div class="ocr-thumb" data-ocr-confirm-image>
          ${pending.pendingImageId ? html`<span>图片读取中...</span>` : html`<span>手动输入</span>`}
        </div>
        <div>
          <strong>${escapeHtml(modeLabel(mode))}</strong>
          <p>${escapeHtml(statusMessage(status, pending))}</p>
          ${mode === 'real' ? html`<span class="confidence-badge">置信度 ${Math.round(pending.pendingOcrConfidence * 100)}%</span>` : ''}
        </div>
      </section>

      <form class="ocr-confirm-form" data-ocr-confirm-form>
        <label for="ocr-product-name">产品名称（选填）</label>
        <input id="ocr-product-name" name="productName" maxlength="50" value="${escapeHtml(productName)}" placeholder="如：旺旺仙贝（选填，便于日后查找）" />

        <div class="ocr-text-label">
          <label for="ocr-confirm-text">配料表内容</label>
          <span data-ocr-ingredient-count>${count ? `${count} 项` : '未识别到配料'}</span>
        </div>
        <textarea id="ocr-confirm-text" name="confirmedText" rows="8" placeholder="例如：水、白砂糖、麦芽糖浆、食品添加剂（柠檬酸、山梨酸钾）">${escapeHtml(text)}</textarea>
        <p class="helper-text" data-ocr-confirm-help>${count ? '识别有误？直接在上方修改文字。' : '未识别到文字，请手动输入配料表。'}</p>

        <div class="form-actions ocr-confirm-actions">
          <button type="button" class="secondary" data-clear-ocr-text>清空重填</button>
          <a class="button-link secondary-link" href="#${categoryPath(categoryId, '/scan')}" data-route>返回重拍</a>
          <button type="submit" ${canAnalyze ? '' : 'disabled'}>开始分析配料</button>
          <span class="save-status" data-ocr-confirm-status aria-live="polite"></span>
        </div>
      </form>
    </section>
  `;
}

function modeLabel(mode) {
  if (mode === 'real') return '识别来源：实时 OCR';
  if (mode === 'fallback') return '识别来源：OCR 降级';
  return '识别来源：手动输入';
}

function statusMessage(status, pending) {
  if (status === 'loading') return '正在识别图片文字...';
  if (status === 'error') return pending.pendingOcrErrorMsg || 'OCR 失败，已切换到手动输入。';
  if (status === 'empty') return '未识别到文字，请手动输入配料表。';
  if (status === 'success') return '请核对识别文本后再分析。';
  return '手动输入模式，请输入包装上的配料表文字。';
}
