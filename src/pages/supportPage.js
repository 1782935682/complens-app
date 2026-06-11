import { escapeHtml, html } from '../components/render.js';
import { categoryPath, getProductCategory } from '../data/categories.js';
import { getSupportTopic, supportTopics } from '../data/supportTopics.js';
import { formatSupportDate, formatSupportStatus } from '../services/supportService.js';
import { getSupportRequests } from '../store/userStore.js';

export function renderSupportPage(category = 'food') {
  const categoryLabel = getProductCategory(category).label;
  const requests = getSupportRequests();
  const categoryRequests = requests.filter((request) => request.category === category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(categoryLabel)}</p>
          <h1>支持中心</h1>
        </div>
        <span class="count">${requests.length} 条本机记录</span>
      </div>
      <p class="lead">提交订阅、数据纠错、扫描分析、隐私数据或功能问题，并保留本机反馈记录，方便复制给客服或后续跟进。</p>
    </section>

    <section class="section support-overview">
      <div class="support-stat">
        <strong>${categoryRequests.length}</strong>
        <span>当前类别</span>
      </div>
      <div class="support-stat">
        <strong>${requests.length}</strong>
        <span>全部反馈</span>
      </div>
      <div class="support-stat">
        <strong>本机</strong>
        <span>保存状态</span>
      </div>
    </section>

    <section class="section">
      <form class="support-form" data-support-form>
        <div class="section__head">
          <div>
            <p class="eyebrow">新建反馈</p>
            <h2>问题信息</h2>
          </div>
          <span class="count">不会自动上传</span>
        </div>
        <label class="filter-field" for="support-topic">
          问题类型
          <select id="support-topic" name="topic">
            ${supportTopics.map((topic) => html`
              <option value="${escapeHtml(topic.id)}">${escapeHtml(topic.label)} - ${escapeHtml(topic.description)}</option>
            `).join('')}
          </select>
        </label>
        <label class="filter-field" for="support-subject">
          标题
          <input id="support-subject" name="subject" maxlength="80" autocomplete="off" placeholder="例如：报告导出后缺少来源引用" />
        </label>
        <label class="filter-field" for="support-message">
          问题描述
          <textarea id="support-message" name="message" rows="6" maxlength="1000" placeholder="写下触发步骤、看到的结果、期望结果，或需要核对的成分与来源。"></textarea>
        </label>
        <label class="filter-field" for="support-contact">
          联系方式
          <input id="support-contact" name="contact" maxlength="120" autocomplete="email" placeholder="邮箱或其他联系方式，可留空" />
        </label>
        <label class="boundary-confirm support-boundary">
          <input type="checkbox" name="acceptedBoundary" />
          <span>我确认这条反馈会先保存在本机；复制或发送给客服前，会自行检查是否包含个人信息、过敏原档案或报告内容。</span>
        </label>
        <div class="form-actions">
          <button type="submit">保存反馈</button>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/settings')}" data-route>返回设置</a>
          <span class="save-status" data-support-status role="status" aria-live="polite"></span>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>最近反馈</h2>
        ${requests.length ? html`<button type="button" class="secondary danger-button" data-clear-support-requests>清空反馈</button>` : ''}
      </div>
      ${requests.length ? renderSupportRequests(requests) : renderEmptyState(category)}
    </section>

    <section class="section">
      <div class="disclaimer-box">
        <h4>支持边界</h4>
        <p>当前版本还没有账号、客服工单系统或服务端同步。支持记录只保存在本机浏览器，也会随本机数据导出、导入和清空。<a class="inline-link" href="#${categoryPath(category, '/legal/privacy')}" data-route>查看隐私说明</a></p>
      </div>
    </section>
  `;
}

function renderSupportRequests(requests) {
  return html`
    <div class="support-request-list">
      ${requests.map(renderSupportRequest).join('')}
    </div>
  `;
}

function renderSupportRequest(request) {
  const topic = getSupportTopic(request.topic);
  const category = getProductCategory(request.category);
  return html`
    <article class="support-request">
      <div class="support-request__body">
        <div class="support-request__meta">
          <span>${escapeHtml(formatSupportStatus(request.status))}</span>
          <span>${escapeHtml(formatSupportDate(request.createdAt))}</span>
        </div>
        <h3>${escapeHtml(request.subject)}</h3>
        <p>${escapeHtml(request.message)}</p>
        <small>${escapeHtml(topic.label)} / ${escapeHtml(category.label)} / ${escapeHtml(request.contact || '未留联系方式')}</small>
      </div>
      <div class="support-request__actions">
        <button type="button" class="secondary" data-copy-support-request="${escapeHtml(request.id)}">复制</button>
        <button type="button" class="secondary danger-button" data-delete-support-request="${escapeHtml(request.id)}">删除</button>
      </div>
    </article>
  `;
}

function renderEmptyState(category) {
  return html`
    <div class="info-block">
      <p class="empty">还没有本机反馈记录。</p>
      <div class="form-actions">
        <a class="button-link secondary-link" href="#${categoryPath(category, '/membership')}" data-route>查看会员中心</a>
        <a class="button-link secondary-link" href="#${categoryPath(category, '/data')}" data-route>查看数据来源</a>
      </div>
    </div>
  `;
}
