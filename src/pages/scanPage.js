import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory, isProductCategory } from '../data/categories.js';
import { OCR_PROTOCOL_VERSION } from '../services/ocrService.js';
import { getPendingScan, hasSeenScanTips } from '../store/userStore.js';
import { formatBytes, SCAN_IMAGE_MAX_BYTES } from '../utils/imageFile.js';

export function renderScanPage(input = '', category = 'food') {
  const categoryId = isProductCategory(category) ? category : 'food';
  const currentCategory = getProductCategory(categoryId);
  const pending = getPendingScan();
  const hasPendingImage = pending.category === categoryId && Boolean(pending.pendingImageId);
  const tipsSeen = hasSeenScanTips();
  const pendingMeta = hasPendingImage ? pending.pendingImageMeta : null;
  const inputText = String(input || '').trim();

  return html`
    <section class="scan-page">
      <div class="scan-topbar">
        <a class="secondary-link" href="#${categoryPath(categoryId)}" data-route>返回</a>
        <div>
          <p class="eyebrow">${currentCategory.label}</p>
          <h1>拍照识别配料表</h1>
        </div>
      </div>

      <div class="scan-layout">
        <section class="scan-preview-panel ${tipsSeen ? '' : 'scan-preview-panel--first'}">
          <div class="scan-preview" data-scan-preview aria-live="polite">
            ${hasPendingImage
              ? html`<span>已保存图片，正在读取预览...</span>`
              : html`
                <button type="button" class="scan-preview-placeholder" data-open-scan-camera>
                  <strong>点击选择食品配料表照片</strong>
                  <span>让配料文字尽量占满画面</span>
                </button>
              `}
          </div>
          <div class="scan-image-meta" data-scan-image-meta>
            ${pendingMeta
              ? html`图片大小：${escapeHtml(formatBytes(pendingMeta.compressedSize || pendingMeta.originalSize))}${pendingMeta.width ? ` / ${pendingMeta.width}x${pendingMeta.height}` : ''}`
              : `支持 JPG、PNG、WebP、HEIC/HEIF，单张不超过 ${formatBytes(SCAN_IMAGE_MAX_BYTES)}。`}
          </div>
          <button class="secondary scan-reselect" type="button" data-clear-scan-image ${hasPendingImage ? '' : 'disabled'}>重选图片</button>
        </section>

        <section class="scan-actions-panel" aria-label="图片来源">
          <button class="scan-source-button" type="button" data-open-scan-camera>拍照</button>
          <button class="scan-source-button secondary" type="button" data-open-scan-photos>相册</button>
          <input class="scan-hidden-input" type="file" accept="image/*" capture="environment" data-scan-camera-input />
          <input class="scan-hidden-input" type="file" accept="image/*" data-scan-photos-input />
          <p class="helper-text" data-scan-feedback>OCR 协议 v${OCR_PROTOCOL_VERSION} 已就绪；未配置 OCR Key 时会进入手动确认模式。</p>
        </section>

        <details class="scan-tips" ${tipsSeen ? '' : 'open'} data-scan-tips>
          <summary>拍摄技巧</summary>
          <ul>
            <li>将配料表放置在画面中央。</li>
            <li>光线充足，避免反光。</li>
            <li>字体区域占满画面，不需要拍完整包装。</li>
          </ul>
        </details>

        ${inputText ? html`
          <section class="scan-manual-carry">
            <h2>链接带入文本</h2>
            <p>${escapeHtml(inputText)}</p>
            <a class="button-link" href="#${categoryPath(categoryId, '/ocr-confirm')}" data-route data-start-manual-confirm="${escapeHtml(inputText)}">进入确认页</a>
          </section>
        ` : ''}
      </div>

      <div class="scan-page-bottom-bar">
        <button type="button" data-confirm-scan-image ${hasPendingImage ? '' : 'disabled'}>确认并识别</button>
        <a class="button-link secondary-link" href="#${categoryPath(categoryId, '/ocr-confirm')}" data-route data-start-manual-confirm="">手动输入配料表</a>
      </div>
    </section>
  `;
}
