import { escapeHtml, html, ingredientCard, riskClass, riskLabel } from '../components/render.js';
import { categoryPath, getProductCategory, isProductCategory } from '../data/categories.js';
import { AI_ANALYSIS_ENDPOINT_PATH, AI_ANALYSIS_PROTOCOL_VERSION, buildAIAnalysisFallback, buildAIAnalysisRequest } from '../services/aiAnalysisService.js';
import { formatAllergenNames, getMatchingTextAllergens, getMatchingUserAllergens } from '../services/allergenService.js';
import { analyzeIngredientText } from '../services/ingredientService.js';
import { matchIngredientsLocal } from '../services/ingredientMatchService.js';
import { getAnalysisReports, getUserAllergens } from '../store/userStore.js';
import { parseIngredientList, SAMPLE_OPTIONS, SAMPLES } from '../utils/text.js';

/**
 * @param {string} input Raw ingredient-list text from the route query or form.
 * @param {import('../types/ingredient.js').DataCategory} category Active product category.
 * @param {string} productName Optional product name carried from OCR confirmation.
 */
export function renderAnalyzePage(input = '', category = 'cosmetics', productName = '') {
  const categoryId = isProductCategory(category) ? category : 'food';
  const currentCategory = getProductCategory(categoryId);
  const normalizedProductName = String(productName || '').trim();
  const result = analyzeIngredientText(input, categoryId);
  const parsedIngredients = parseIngredientList(input);
  const matchSummary = matchIngredientsLocal(parsedIngredients, categoryId);
  const resultIngredients = result.ingredients
    .filter(hasDisplayId)
    .map((ingredient) => withDisplayDefaults(ingredient, categoryId));
  const resultHighlights = result.highlights
    .filter(hasDisplayId)
    .map((ingredient) => withDisplayDefaults(ingredient, categoryId));
  const missingIdItems = result.ingredients
    .filter((ingredient) => !hasDisplayId(ingredient))
    .map((ingredient) => ingredient.nameCn || ingredient.nameEn || '暂无数据');
  const unknownItems = [...result.unknownItems, ...missingIdItems];
  const userAllergens = getUserAllergens();
  const ingredientAllergenHits = resultIngredients
    .map((ingredient) => ({
      ingredient,
      allergens: getMatchingUserAllergens(ingredient, userAllergens)
    }))
    .filter((item) => item.allergens.length);
  const textAllergenHits = unknownItems
    .map((item) => ({
      item,
      allergens: getMatchingTextAllergens(item, userAllergens)
    }))
    .filter((item) => item.allergens.length);
  const allergenHitCount = ingredientAllergenHits.length + textAllergenHits.length;
  const safeInput = escapeHtml(input);
  const safeSamples = hasValidSampleMap() ? SAMPLES : {};
  const sampleOptions = SAMPLE_OPTIONS.filter((sample) => sample.category === categoryId && typeof safeSamples[sample.id] === 'string');
  const reportCount = getAnalysisReports(categoryId).length;
  const canSaveReport = Boolean(String(input || '').trim());
  const aiRequest = canSaveReport ? buildAIAnalysisRequest(input, categoryId, { userAllergenIds: userAllergens }) : null;
  const aiFallback = aiRequest ? buildAIAnalysisFallback(aiRequest) : null;

  const activeAllergenNames = formatAllergenNames(userAllergens);
  const allergenStatusHtml = activeAllergenNames
    ? html`<p class="allergen-status">您当前关注的过敏原档案：<strong class="allergen-status__names">${escapeHtml(activeAllergenNames)}</strong></p>`
    : html`<p class="allergen-status">您尚未设置关注的过敏原。您可以到 <a href="#/settings" class="inline-link" data-route>用户设置页</a> 配置个人过敏原档案，系统在分析时会自动高亮警告。</p>`;

  return html`
    <section class="section">
      <div class="section__head analyze-head">
        <div>
          <p class="eyebrow">${currentCategory.label} / 文本识别版</p>
          <h1>成分表分析</h1>
          ${normalizedProductName ? html`<p class="helper-text">产品名称：${escapeHtml(normalizedProductName)}</p>` : ''}
          ${allergenStatusHtml}
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
        <div class="form-actions analyze-actions">
          <button type="submit">开始分析</button>
          <div class="sample-picker">
            <label for="sample-select" class="sample-picker__label">示例模板：</label>
            <select id="sample-select" aria-label="示例模板">
              <option value="0">${categoryId === 'food' ? '选择食品配料表示例...' : '选择化妆品成分表示例...'}</option>
              ${sampleOptions.map((sample) => html`<option value="${escapeHtml(sample.id)}">${escapeHtml(sample.label)}</option>`).join('')}
            </select>
          </div>
          <span class="save-status" data-analyze-status role="status" aria-live="polite"></span>
        </div>
      </form>
    </section>

    <section class="section">
      <div class="summary-box">
        <strong>整体说明</strong>
        <p>${escapeHtml(result.summary)}</p>
        <div class="form-actions report-toolbar">
          ${canSaveReport ? html`<button type="button" data-save-report>保存报告</button>` : ''}
          <a class="button-link secondary-link" href="#${categoryPath(categoryId, '/reports')}" data-route>
            ${reportCount ? `查看 ${reportCount} 份历史报告` : '查看历史报告'}
          </a>
        </div>
      </div>
    </section>

    ${renderAnalysisQuality(result)}

    ${renderDatabaseMatchSummary(matchSummary)}

    ${aiFallback ? renderAIFallbackPreview(aiFallback, aiRequest) : ''}

    ${allergenHitCount ? html`
      <section class="section">
        <div class="allergen-alert allergen-alert--cards">
          <h2>发现过敏原成分</h2>
          <p>配料中含有 ${allergenHitCount} 项您关注的过敏原，请谨慎食用：</p>
          <div class="card-grid">
            ${ingredientAllergenHits.map((item) => allergenCard(item.ingredient, item.allergens, categoryId)).join('')}
            ${textAllergenHits.map((item) => textAllergenCard(item.item, item.allergens)).join('')}
          </div>
        </div>
      </section>
    ` : ''}

    ${result.highlights.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>重点关注成分</h2>
        </div>
        <div class="card-grid">${resultHighlights.map((item) => ingredientCard(item, {
          category: categoryId,
          href: `#${categoryPath(categoryId, `/ingredient/${item.id}`)}`
        })).join('')}</div>
      </section>
    ` : ''}

    ${resultIngredients.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>已匹配成分</h2>
          <span class="count">${result.matchedCount} 项</span>
        </div>
        <div class="card-grid">${resultIngredients.map((item) => ingredientCard(item, {
          category: categoryId,
          href: `#${categoryPath(categoryId, `/ingredient/${item.id}`)}`
        })).join('')}</div>
      </section>
    ` : ''}

    ${unknownItems.length ? html`
      <section class="section">
        <div class="section__head">
          <h2>暂未收录</h2>
        </div>
        <p class="helper-text">以下条目可能包含普通食品原料或当前数据库尚未覆盖的添加剂；过敏原关键词会单独提示。</p>
        <div class="chip-list">${unknownItems.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>
      </section>
    ` : ''}

    ${renderDisclaimer()}
  `;
}

export function renderDatabaseMatchSummary(summary) {
  const results = Array.isArray(summary?.results) ? summary.results : [];
  if (!results.length) return '';
  const matchedCount = results.filter((item) => item.match && item.confidence > 0).length;
  const lowConfidenceCount = summary.lowConfidenceTerms.length;
  const unmatchedCount = summary.unmatchedTerms.length;

  return html`
    <section class="section">
      <div class="match-summary-panel" data-ingredient-match-summary>
        <div class="section__head">
          <div>
            <p class="eyebrow">数据库批量匹配</p>
            <h2>匹配覆盖 ${Math.round(summary.matchRate * 100)}%</h2>
            <p class="helper-text">配料分析先经过食品添加剂数据库匹配；低置信度和未收录项会保留给用户确认。</p>
          </div>
        </div>
        <div class="analysis-quality__metrics">
          ${qualityMetric('已匹配', matchedCount)}
          ${qualityMetric('待确认', lowConfidenceCount)}
          ${qualityMetric('未收录', unmatchedCount)}
        </div>
        <div class="analysis-match-list">
          ${results.map(databaseMatchItem).join('')}
        </div>
      </div>
    </section>
  `;
}

function databaseMatchItem(item) {
  const match = item.match;
  const status = getMatchStatus(item.confidence);
  return html`
    <article class="analysis-match-item analysis-match-item--${match ? 'matched' : 'unknown'}">
      <span class="analysis-match-item__status">${escapeHtml(status)}</span>
      <h3>${escapeHtml(item.parsedIngredient.normalizedText)}</h3>
      <p>${match
        ? escapeHtml(`${match.nameCn} / ${match.category || '未分类'} / ${matchTypeLabel(item.matchType)}${item.confidence < 0.9 ? '，请确认' : ''}`)
        : '数据库暂未收录此配料，已保留原文。'}</p>
      ${match && match.isVerified === false ? `<span class="data-badge data-badge--unverified">${escapeHtml(match.confidenceLevel || 'unverified')} / isVerified false</span>` : ''}
    </article>
  `;
}

function getMatchStatus(confidence) {
  if (confidence >= 0.9) return '确定匹配';
  if (confidence >= 0.6) return '请确认';
  if (confidence > 0) return '候选匹配';
  return '未收录';
}

function matchTypeLabel(type) {
  if (type === 'eNumber') return 'E-number 直查';
  if (type === 'exact') return '精确匹配';
  if (type === 'alias') return '别名匹配';
  if (type === 'fuzzy') return '模糊匹配';
  return '无匹配';
}

function renderAnalysisQuality(result) {
  const quality = result?.quality;
  const items = Array.isArray(result?.analysisItems) ? result.analysisItems : [];
  if (!quality || !quality.totalCount) return '';

  return html`
    <section class="section">
      <div class="analysis-quality ${quality.needsReview ? 'analysis-quality--review' : ''}">
        <div class="section__head">
          <div>
            <p class="eyebrow">解析质量</p>
            <h2>本地匹配覆盖 ${Number(quality.coveragePercent) || 0}%</h2>
            <p class="helper-text">${quality.needsReview ? '请优先核对中/低置信匹配和暂未收录条目。' : '当前条目均已被本地库稳定匹配。'}</p>
          </div>
          <span class="analysis-quality__badge">${quality.needsReview ? '需核对' : '匹配稳定'}</span>
        </div>
        <div class="analysis-quality__metrics">
          ${qualityMetric('解析条目', quality.totalCount)}
          ${qualityMetric('本地匹配', quality.matchedCount)}
          ${qualityMetric('暂未收录', quality.unknownCount)}
          ${qualityMetric('低置信', quality.lowConfidenceCount)}
        </div>
        <div class="analysis-match-list">
          ${items.map(analysisMatchItem).join('')}
        </div>
      </div>
    </section>
  `;
}

function qualityMetric(label, value) {
  return html`
    <span>
      <strong>${Number(value) || 0}</strong>
      ${escapeHtml(label)}
    </span>
  `;
}

function analysisMatchItem(item) {
  const isMatched = item.type === 'matched';
  return html`
    <article class="analysis-match-item analysis-match-item--${isMatched ? 'matched' : 'unknown'}">
      <span class="analysis-match-item__status">${escapeHtml(item.confidenceLabel || (isMatched ? '已匹配' : '待核对'))}</span>
      <h3>${escapeHtml(item.inputText || '')}</h3>
      <p>${isMatched
        ? escapeHtml(`${item.note || '本地库匹配'}，识别为 ${item.nameCn || item.matchedText || '本地成分'}`)
        : escapeHtml(item.note || '本地数据库暂未收录该条目')}</p>
    </article>
  `;
}

function renderAIFallbackPreview(aiFallback, aiRequest) {
  const ingredientNotes = Array.isArray(aiFallback.ingredientNotes) ? aiFallback.ingredientNotes : [];
  const nextSteps = Array.isArray(aiFallback.nextSteps) ? aiFallback.nextSteps : [];
  const limitations = Array.isArray(aiFallback.limitations) ? aiFallback.limitations : [];

  return html`
    <section class="section">
      <div class="ai-panel">
        <div class="section__head">
          <div>
            <p class="eyebrow">AI 辅助分析 / 本地降级</p>
            <h2>结构化分析协议已就绪</h2>
            <p class="helper-text">当前未连接服务端代理，以下内容由本地成分库按 AI 输出协议生成。</p>
          </div>
          <span class="ai-panel__status">协议 v${AI_ANALYSIS_PROTOCOL_VERSION}</span>
        </div>

        <div class="ai-protocol-strip" aria-label="AI 协议状态">
          <span>endpoint：${escapeHtml(AI_ANALYSIS_ENDPOINT_PATH)}</span>
          <span>匹配 ${Number(aiRequest?.localAnalysis?.matchedCount) || 0} 项</span>
          <span>暂未收录 ${Array.isArray(aiRequest?.localAnalysis?.unknownItems) ? aiRequest.localAnalysis.unknownItems.length : 0} 项</span>
        </div>

        <div class="ai-section-grid">
          ${aiFallback.sections.map((section) => aiSectionCard(section)).join('')}
        </div>

        <div class="ai-narrative">
          <strong>风险叙述</strong>
          <p>${escapeHtml(aiFallback.riskNarrative)}</p>
        </div>

        ${ingredientNotes.length ? html`
          <div class="ai-note-list">
            <strong>成分笔记</strong>
            ${ingredientNotes.map((note) => html`
              <article class="ai-note">
                <span>${escapeHtml(confidenceLabel(note.confidence))}</span>
                <h3>${escapeHtml(note.name)}</h3>
                <p>${escapeHtml(note.note)}</p>
              </article>
            `).join('')}
          </div>
        ` : ''}

        <div class="ai-next-grid">
          ${nextSteps.length ? renderAIList('下一步', nextSteps) : ''}
          ${limitations.length ? renderAIList('使用边界', limitations) : ''}
        </div>
      </div>
    </section>
  `;
}

function aiSectionCard(section) {
  const tone = ['info', 'watch', 'caution'].includes(section.tone) ? section.tone : 'info';
  return html`
    <article class="ai-section-card ai-section-card--${tone}">
      <span>${escapeHtml(aiToneLabel(tone))}</span>
      <h3>${escapeHtml(section.title)}</h3>
      <p>${escapeHtml(section.body)}</p>
    </article>
  `;
}

function renderAIList(title, items) {
  return html`
    <div class="ai-list">
      <strong>${escapeHtml(title)}</strong>
      <ul>
        ${items.map((item) => html`<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function withDisplayDefaults(ingredient, category) {
  const isFood = category === 'food';
  return {
    ...ingredient,
    id: ingredient.id,
    dataCategory: category,
    nameCn: ingredient.nameCn || '暂无数据',
    category: ingredient.category || '未分类',
    description: ingredient.description || '暂无说明',
    riskLevel: ingredient.riskLevel || 'unknown',
    gbStatus: isFood ? ingredient.gbStatus || 'unknown' : ingredient.gbStatus,
    sourceNote: isFood ? ingredient.sourceNote || '暂无来源说明' : ingredient.sourceNote
  };
}

function hasDisplayId(ingredient) {
  return typeof ingredient?.id === 'string' && Boolean(ingredient.id.trim());
}

function hasValidSampleMap() {
  if (!SAMPLES || typeof SAMPLES !== 'object') return false;
  return SAMPLE_OPTIONS.every((sample) => typeof SAMPLES[sample.id] === 'string' && SAMPLES[sample.id].trim());
}

function renderDisclaimer() {
  return html`
    <section class="section">
      <div class="disclaimer-box">
        <h4>免责声明</h4>
        <p>本系统分析结果基于公开学术资料及国家标准（如 GB 2760 等），旨在提供成分科普，不作为医疗、健康或诊断建议。部分成分风险因人而异，特殊人群（如孕妇、婴幼儿、过敏体质者）建议咨询专业医师或营养师，并结合自身实际耐受情况综合判断。</p>
      </div>
    </section>
  `;
}

function aiToneLabel(tone) {
  if (tone === 'caution') return '优先核对';
  if (tone === 'watch') return '需要关注';
  return '信息提示';
}

function confidenceLabel(confidence) {
  if (confidence === 'high') return '高置信';
  if (confidence === 'low') return '低置信';
  return '中等置信';
}

function allergenCard(ingredient, allergens, category) {
  const canLink = hasDisplayId(ingredient);
  const href = canLink ? `#${categoryPath(category, `/ingredient/${ingredient.id}`)}` : '';
  const allergenNames = formatAllergenNames(allergens);
  const content = html`
    <span class="${riskClass(ingredient.riskLevel)}">${riskLabel(ingredient.riskLevel)}</span>
    ${allergenNames ? html`<span class="allergen-badge">过敏原：${escapeHtml(allergenNames)}</span>` : ''}
    <h3>${escapeHtml(ingredient.nameCn || '')}</h3>
    <p class="latin">${escapeHtml(ingredient.nameEn || '')}</p>
    <p>${escapeHtml(ingredient.description || '')}</p>
    <div class="meta-row">
      <span>${escapeHtml(ingredient.category || '未分类')}</span>
    </div>
  `;
  return html`
    <article class="ingredient-card ingredient-card--allergen">
      ${canLink
        ? html`<a href="${href}" class="ingredient-card__main" data-route>${content}</a>`
        : html`<div class="ingredient-card__main">${content}</div>`}
    </article>
  `;
}

function textAllergenCard(item, allergens) {
  const safeItem = String(item || '');
  if (!safeItem) return '';

  const allergenNames = formatAllergenNames(allergens);
  return html`
    <article class="ingredient-card ingredient-card--allergen">
      <div class="ingredient-card__main">
        ${allergenNames ? html`<span class="allergen-badge">过敏原：${escapeHtml(allergenNames)}</span>` : ''}
        <h3>普通原料/标签文本：${escapeHtml(safeItem)}</h3>
        <p>该标签原文不是食品添加剂数据库匹配项，但与您关注的过敏原关键词匹配，请结合产品标签确认来源。</p>
        <div class="meta-row">
          <span>普通食品原料或标签文本（非添加剂匹配）</span>
        </div>
      </div>
    </article>
  `;
}
