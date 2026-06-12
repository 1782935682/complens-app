import { escapeHtml, html } from '../components/render.js';
import { standardAllergens } from '../data/allergens.js';
import { categoryPath } from '../data/categories.js';
import { getCurrentUser } from '../services/authService.js';
import { getLocalDataSummary, getUserAllergens, isHistoryRecordingEnabled } from '../store/userStore.js';

export function renderSettingsPage(category = 'food') {
  const selected = new Set(getUserAllergens());
  const localDataSummary = getLocalDataSummary();
  const historyRecordingEnabled = isHistoryRecordingEnabled();
  const currentUser = getCurrentUser();
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
      <div class="info-block membership-entry">
        <div class="section__head">
          <div>
            <p class="eyebrow">会员与同步</p>
            <h2>账号与云同步</h2>
          </div>
          <span class="count">${currentUser ? '已登录' : '访客模式'}</span>
        </div>
        ${renderAuthEntry(category, currentUser)}
        <div class="form-actions">
          <a class="button-link" href="#${categoryPath(category, '/membership')}" data-route>查看会员中心</a>
          <a class="button-link secondary-link" href="#${categoryPath(category, '/support')}" data-route>联系支持</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="info-block">
        <div class="section__head">
          <div>
            <p class="eyebrow">合规材料</p>
            <h2>隐私与条款</h2>
          </div>
          <span class="count">草案</span>
        </div>
        <p class="helper-text">查看隐私政策、服务条款、订阅说明、数据安全和内容来源边界。正式上线前仍需按真实服务和平台要求复核。</p>
        <div class="form-actions">
          <a class="button-link secondary-link" href="#${categoryPath(category, '/legal')}" data-route>查看隐私与条款</a>
        </div>
      </div>
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

    <section class="section">
      <div class="info-block" data-local-data-panel>
        <div class="section__head">
          <div>
            <p class="eyebrow">本机数据</p>
            <h2>数据与隐私</h2>
          </div>
          <span class="count" data-local-data-summary>${localDataSummary.totalItems} 项本机数据</span>
        </div>
        <div class="local-data-grid" aria-label="本机数据摘要">
          ${renderLocalDataMetric('favorites', localDataSummary.favorites, '收藏')}
          ${renderLocalDataMetric('compareItems', localDataSummary.compareItems, '对比')}
          ${renderLocalDataMetric('history', localDataSummary.history, '历史')}
          ${renderLocalDataMetric('reports', localDataSummary.reports, '报告')}
          ${renderLocalDataMetric('products', localDataSummary.products, '产品档案')}
          ${renderLocalDataMetric('supportRequests', localDataSummary.supportRequests, '反馈')}
          ${renderLocalDataMetric('scanDrafts', localDataSummary.scanDrafts, '扫描草稿')}
          ${renderLocalDataMetric('allergens', localDataSummary.allergens, '过敏原')}
        </div>
        <label class="history-privacy-toggle">
          <input type="checkbox" name="historyRecordingEnabled" data-history-recording-toggle ${historyRecordingEnabled ? 'checked' : ''} />
          <span>
            <strong>自动记录搜索历史</strong>
            <small>关闭后不会记录新的搜索；已有历史仍可单条删除、清空或随本机数据导出。</small>
          </span>
        </label>
        <p class="helper-text">这些内容目前只保存在本机浏览器。导出会生成 JSON 文件；导入会用所选 JSON 覆盖本机收藏、历史、过敏原、报告、产品档案和扫描草稿；清空会移除全部本机数据。</p>
        <div class="local-data-import">
          <label for="local-data-import-file">导入本机数据 JSON</label>
          <input id="local-data-import-file" type="file" accept="application/json,.json" data-import-local-data-input />
          <p class="helper-text">仅导入从本应用导出的 JSON 快照。导入前请确认当前本机数据已备份。</p>
        </div>
        <div class="form-actions">
          <button type="button" class="secondary" data-export-local-data>导出本机数据</button>
          <button type="button" class="secondary" data-import-local-data>导入并覆盖</button>
          <button type="button" class="secondary danger-button" data-clear-local-data>清空本机数据</button>
          <span class="save-status" data-local-data-status role="status" aria-live="polite"></span>
        </div>
      </div>
    </section>
  `;
}

function renderAuthEntry(category, currentUser) {
  if (currentUser) {
    return html`
      <p class="helper-text">当前账号：<strong>${escapeHtml(currentUser.email)}</strong>。收藏、历史、过敏原档案、分析报告和产品档案会在登录态接入云同步。</p>
      <div class="form-actions auth-settings-actions">
        <button type="button" class="secondary" data-auth-logout>退出登录</button>
      </div>
    `;
  }

  const redirect = encodeURIComponent(categoryPath(category, '/settings'));
  return html`
    <p class="helper-text">登录后可在支持的设备间同步收藏、历史、过敏原档案、分析报告和产品档案；不登录也可以继续使用本机模式。</p>
    <div class="form-actions auth-settings-actions">
      <a class="button-link" href="#/login?redirect=${redirect}" data-route>登录账号，开启云同步</a>
    </div>
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

function renderLocalDataMetric(key, value, label) {
  return html`
    <div class="local-data-metric">
      <strong data-local-data-count="${escapeHtml(key)}">${value}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}
