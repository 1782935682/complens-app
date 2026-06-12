import { escapeHtml, html } from '../components/render.js';
import { categoryPath } from '../data/categories.js';
import { buildAuthRedirectTarget, getCurrentUser, normalizeAuthMode } from '../services/authService.js';

export function renderAuthPage(category = 'food', mode = 'login', redirect = '') {
  const authMode = normalizeAuthMode(mode);
  const redirectTarget = buildAuthRedirectTarget(redirect, category);
  const currentUser = getCurrentUser();

  return html`
    <section class="section auth-page">
      <div class="section__head">
        <div>
          <p class="eyebrow">账号同步</p>
          <h1>${authMode === 'register' ? '注册账号' : '账号登录'}</h1>
        </div>
        <a class="button-link secondary-link" href="#${escapeHtml(redirectTarget)}" data-route>返回</a>
      </div>
      <p class="lead">登录后会把本机收藏、历史、过敏原档案、分析报告和产品档案接入云同步。</p>
    </section>

    ${currentUser ? renderLoggedInNotice(currentUser, category, redirectTarget) : ''}

    <section class="section auth-shell">
      <nav class="auth-tabs" aria-label="账号操作">
        ${renderAuthTab('login', authMode, category, redirectTarget)}
        ${renderAuthTab('register', authMode, category, redirectTarget)}
      </nav>

      <form class="auth-form" data-auth-form data-auth-mode="${escapeHtml(authMode)}" data-auth-redirect="${escapeHtml(redirectTarget)}">
        <label for="auth-email">
          邮箱
          <input id="auth-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="your@email.com" required />
        </label>
        <label for="auth-password">
          密码（8 位以上）
          <span class="auth-password-field">
            <input id="auth-password" name="password" type="password" autocomplete="${authMode === 'register' ? 'new-password' : 'current-password'}" minlength="8" required />
            <button type="button" class="secondary" data-auth-password-toggle aria-controls="auth-password" aria-pressed="false">显示</button>
          </span>
        </label>
        <div class="form-actions auth-actions">
          <button type="submit">${authMode === 'register' ? '注册并登录' : '登录'}</button>
          <a class="button-link secondary-link" href="#${escapeHtml(redirectTarget)}" data-route>暂不登录，以访客模式继续</a>
          <span class="save-status" data-auth-status role="status" aria-live="polite"></span>
        </div>
      </form>
    </section>
  `;
}

function renderLoggedInNotice(user, category, redirectTarget) {
  return html`
    <section class="section">
      <div class="info-block auth-current-user">
        <div>
          <p class="eyebrow">当前账号</p>
          <h2>${escapeHtml(user.email)}</h2>
        </div>
        <div class="form-actions">
          <a class="button-link" href="#${escapeHtml(redirectTarget)}" data-route>继续使用</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/settings')}" data-route>账号设置</a>
        </div>
      </div>
    </section>
  `;
}

function renderAuthTab(tabMode, activeMode, category, redirectTarget) {
  const params = new URLSearchParams({ mode: tabMode });
  if (redirectTarget) params.set('redirect', redirectTarget);
  const label = tabMode === 'register' ? '注册' : '登录';
  return html`
    <a class="${tabMode === activeMode ? 'is-active' : ''}" href="#${categoryPath(category, '/login')}?${params.toString()}" data-route>
      ${escapeHtml(label)}
    </a>
  `;
}
