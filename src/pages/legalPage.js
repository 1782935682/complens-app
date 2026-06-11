import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { defaultLegalDocumentId, getLegalDocument, legalDocuments } from '../data/legalContent.js';

export function renderLegalPage(category = 'food', documentId = '') {
  const currentDocument = documentId ? getLegalDocument(documentId) : null;
  return currentDocument
    ? renderLegalDocumentPage(category, currentDocument)
    : renderLegalIndexPage(category);
}

function renderLegalIndexPage(category) {
  const categoryLabel = getProductCategory(category).label;
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(categoryLabel)}</p>
          <h1>隐私与条款</h1>
        </div>
        <span class="count">${legalDocuments.length} 份草案</span>
      </div>
      <p class="lead">集中查看隐私政策、服务条款、订阅说明、数据安全和内容来源边界。当前文本用于产品与上架准备，正式发布前仍需按真实服务和平台要求复核。</p>
    </section>

    <section class="section legal-document-grid">
      ${legalDocuments.map((document) => renderLegalCard(category, document)).join('')}
    </section>

    <section class="section">
      <div class="legal-checklist">
        <div>
          <p class="eyebrow">上线前检查</p>
          <h2>还需要正式确认</h2>
        </div>
        <ul>
          <li>根据实际后端、OCR、AI、支付、统计和客服服务更新隐私政策。</li>
          <li>补充账号删除、数据导出、撤回授权、订阅取消和恢复购买路径。</li>
          <li>确保 App Store 隐私信息、Google Play 数据安全表和应用内说明保持一致。</li>
        </ul>
      </div>
    </section>
  `;
}

function renderLegalDocumentPage(category, document) {
  const categoryLabel = getProductCategory(category).label;
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(categoryLabel)}</p>
          <h1>${escapeHtml(document.title)}</h1>
        </div>
        <span class="count">${escapeHtml(document.status)}</span>
      </div>
      <p class="lead">${escapeHtml(document.summary)}</p>
      <div class="form-actions">
        <a class="button-link secondary-link" href="#${categoryPath(category, '/legal')}" data-route>返回合规中心</a>
        <a class="button-link secondary-link" href="#${categoryPath(category, '/support')}" data-route>提交反馈</a>
      </div>
    </section>

    <section class="section legal-document">
      <div class="legal-document__meta">
        <span>更新日期：${escapeHtml(document.updatedAt)}</span>
        <span>文档 ID：${escapeHtml(document.id)}</span>
      </div>
      ${document.sections.map(renderLegalSection).join('')}
    </section>

    <section class="section">
      <div class="disclaimer-box">
        <h4>草案声明</h4>
        <p>此页面是产品内合规材料草案，不构成正式法律文本。正式上线前需要结合真实业务、服务商、平台表单和法务意见确认。</p>
      </div>
    </section>
  `;
}

function renderLegalCard(category, document) {
  return html`
    <a class="legal-card" href="#${categoryPath(category, `/legal/${document.id}`)}" data-route>
      <div class="legal-card__head">
        <h2>${escapeHtml(document.title)}</h2>
        <span>${escapeHtml(document.status)}</span>
      </div>
      <p>${escapeHtml(document.summary)}</p>
      <small>更新日期：${escapeHtml(document.updatedAt)}</small>
    </a>
  `;
}

function renderLegalSection(section) {
  return html`
    <article class="legal-section">
      <h2>${escapeHtml(section.title)}</h2>
      <ul>
        ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </article>
  `;
}

export function getLegalPageDocumentTitle(documentId) {
  return getLegalDocument(documentId)?.shortTitle || getLegalDocument(defaultLegalDocumentId).shortTitle;
}
