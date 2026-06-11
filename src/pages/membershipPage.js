import { escapeHtml, html } from '../components/render.js';
import { getProductCategory } from '../data/categories.js';
import { getMembershipOverview } from '../services/membershipService.js';

export function renderMembershipPage(category = 'food') {
  const categoryLabel = getProductCategory(category).label;
  const overview = getMembershipOverview(category);
  return html`
    <section class="section">
      <div class="section__head">
        <div>
          <p class="eyebrow">${escapeHtml(categoryLabel)}</p>
          <h1>会员中心</h1>
        </div>
        <span class="count">${escapeHtml(overview.currentPlan.label)}</span>
      </div>
      <p class="lead">查看当前权益、Pro 规划和本机用量。当前版本不提供真实购买，订阅权益必须等账号、商店支付和服务端校验完成后开放。</p>
    </section>

    <section class="section membership-current">
      <div>
        <p class="eyebrow">当前套餐</p>
        <h2>${escapeHtml(overview.currentPlan.name)}</h2>
        <p>${escapeHtml(overview.currentPlan.description)}</p>
      </div>
      <div class="membership-state" aria-label="会员状态">
        <strong>${escapeHtml(overview.entitlement.status === 'active' ? '已启用' : '未启用')}</strong>
        <span>${escapeHtml(overview.entitlement.renewalText)}</span>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>本机用量</h2>
        <span class="count">仅本机统计</span>
      </div>
      <div class="membership-usage-grid">
        ${overview.usage.map(renderUsageItem).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2>套餐对比</h2>
      </div>
      <div class="membership-plan-grid">
        ${renderPlanCard(overview.currentPlan, true)}
        ${renderPlanCard(overview.proPlan, false)}
      </div>
    </section>

    <section class="section">
      <div class="info-block membership-actions">
        <div class="section__head">
          <div>
            <p class="eyebrow">订阅操作</p>
            <h2>购买、恢复与管理</h2>
          </div>
          <span class="count">待接入</span>
        </div>
        <p class="helper-text">${escapeHtml(overview.entitlement.unavailableReason)}</p>
        <div class="form-actions">
          <button type="button" data-membership-action="purchase">查看 Pro</button>
          <button type="button" class="secondary" data-membership-action="restore">恢复购买</button>
          <button type="button" class="secondary" data-membership-action="manage">管理订阅</button>
          <button type="button" class="secondary" data-membership-action="support">联系客服</button>
          <span class="save-status" data-membership-status role="status" aria-live="polite"></span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="disclaimer-box">
        <h4>权益边界</h4>
        <p>当前页面只展示会员信息架构和上线前缺口，不会模拟成功购买、订阅续费或跨端恢复。真实权益以后必须由服务端和商店票据校验共同决定。</p>
      </div>
    </section>
  `;
}

function renderUsageItem(item) {
  return html`
    <div class="membership-usage-item">
      <strong data-membership-usage="${escapeHtml(item.key)}">${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
      <small>${escapeHtml(item.detail)}</small>
    </div>
  `;
}

function renderPlanCard(plan, current) {
  return html`
    <article class="membership-plan ${current ? 'is-current' : ''}">
      <div class="membership-plan__head">
        <div>
          <h3>${escapeHtml(plan.name)}</h3>
          <p>${escapeHtml(plan.priceLabel)}</p>
        </div>
        <span>${escapeHtml(plan.badge)}</span>
      </div>
      <p>${escapeHtml(plan.description)}</p>
      <div class="membership-list">
        <strong>包含能力</strong>
        <ul>
          ${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
        </ul>
      </div>
      <div class="membership-list">
        <strong>当前限制</strong>
        <ul>
          ${plan.limits.map((limit) => `<li>${escapeHtml(limit)}</li>`).join('')}
        </ul>
      </div>
    </article>
  `;
}
