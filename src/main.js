import { riskClass, riskLabel } from './components/render.js';
import { categoryPath } from './data/categories.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from './router/router.js';
import { extractIngredientsFromImage } from './services/ocrService.js';
import { getSearchSuggestions } from './services/ingredientService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from './services/reportExportService.js';
import { addHistory, clearAnalysisReports, clearHistory, deleteAnalysisReport, getAnalysisReportById, removeHistory, saveAnalysisReport, setUserAllergens, toggleFavorite } from './store/userStore.js';
import { SAMPLE_OPTIONS, SAMPLES } from './utils/text.js';

const app = document.querySelector('#app');

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const route = resolveRoute(window.location.hash);
  document.title = getRouteTitle(route);
  updateShellNavigation(route);
  app.innerHTML = renderRoute(route);
  bindPageEvents(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (typeof app.focus === 'function') {
    app.focus({ preventScroll: true });
  }
}

function updateShellNavigation(route) {
  const brandLink = document.querySelector('[data-brand-link]');
  if (brandLink) brandLink.setAttribute('href', `#${categoryPath(route.category)}`);

  updateNavigationGroup('[data-nav-key]', 'navKey', getNavigationLinks(route));
  updateNavigationGroup('[data-mobile-nav-key]', 'mobileNavKey', getMobileNavigationLinks(route));
}

function updateNavigationGroup(selector, datasetKey, items) {
  const navState = new Map(items.map((item) => [item.key, item]));
  document.querySelectorAll(selector).forEach((link) => {
    const item = navState.get(link.dataset[datasetKey]);
    if (!item) return;
    link.setAttribute('href', item.href);
    link.classList.toggle('is-active', item.active);
    if (item.active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function bindPageEvents(route) {
  document.querySelectorAll('[data-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const query = String(formData.get('q') || '').trim();
      const risk = String(formData.get('risk') || '').trim();
      const ingredientCategory = String(formData.get('ingredientCategory') || '').trim();
      if (!query && !risk && !ingredientCategory) return;

      const params = new URLSearchParams();
      if (query) {
        params.set('q', query);
        addHistory(query);
      }
      if (risk) params.set('risk', risk);
      if (ingredientCategory) params.set('ingredientCategory', ingredientCategory);
      navigate(`#${categoryPath(route.category, '/search')}?${params.toString()}`);
    });
    bindSearchSuggestions(form, route);
  });

  document.querySelectorAll('[data-analyze-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const input = String(formData.get('ingredients') || '').trim();
      navigate(`#${categoryPath(route.category, '/analyze')}?text=${encodeURIComponent(input)}`);
    });
  });

  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFavorite(button.dataset.favoriteId, route.category);
      render();
    });
  });

  const clearButton = document.querySelector('[data-clear-history]');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearHistory();
      render();
    });
  }

  const saveReportButton = document.querySelector('[data-save-report]');
  if (saveReportButton) {
    saveReportButton.addEventListener('click', () => {
      const report = saveAnalysisReport(route.input, route.category);
      if (report) navigate(`#${categoryPath(report.category, `/reports/${report.id}`)}`);
    });
  }

  document.querySelectorAll('[data-delete-report]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteAnalysisReport(button.dataset.deleteReport);
      if (route.view === 'report-detail') {
        navigate(`#${categoryPath(route.category, '/reports')}`);
      } else {
        render();
      }
    });
  });

  const clearReportsButton = document.querySelector('[data-clear-reports]');
  if (clearReportsButton) {
    clearReportsButton.addEventListener('click', () => {
      clearAnalysisReports(route.category);
      render();
    });
  }

  document.querySelectorAll('[data-copy-report]').forEach((button) => {
    button.addEventListener('click', async () => {
      const report = getAnalysisReportById(button.dataset.copyReport);
      if (!report) {
        updateExportStatus('报告不存在，无法复制。');
        return;
      }
      try {
        await copyText(getReportMarkdownText(report));
        updateExportStatus('已复制 Markdown');
      } catch {
        updateExportStatus('复制失败，请手动选择文本。');
      }
    });
  });

  document.querySelectorAll('[data-download-report]').forEach((button) => {
    button.addEventListener('click', () => {
      const report = getAnalysisReportById(button.dataset.reportId);
      if (!report) {
        updateExportStatus('报告不存在，无法下载。');
        return;
      }
      const format = button.dataset.downloadReport;
      const isJson = format === 'json';
      const content = isJson
        ? `${JSON.stringify(buildReportExportPayload(report), null, 2)}\n`
        : `${getReportMarkdownText(report)}\n`;
      const fileName = buildReportFileName(report, isJson ? 'json' : 'md');
      const mimeType = isJson ? 'application/json' : 'text/markdown';
      downloadTextFile(fileName, content, mimeType);
      updateExportStatus(`已生成 ${isJson ? 'JSON' : 'Markdown'} 文件`);
    });
  });

  document.querySelectorAll('[data-delete-history]').forEach((button) => {
    button.addEventListener('click', () => {
      removeHistory(button.dataset.deleteHistory);
      render();
    });
  });

  const sampleSelect = document.querySelector('#sample-select');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', () => {
      const sampleIdsForCategory = new Set(
        SAMPLE_OPTIONS
          .filter((sample) => sample.category === route.category)
          .map((sample) => sample.id)
      );
      const val = sampleSelect.value;
      const textarea = document.querySelector('#ingredient-text');
      if (val === '0') return;
      if (!sampleIdsForCategory.has(val)) {
        sampleSelect.value = '0';
        if (textarea) textarea.value = '';
        return;
      }
      if (textarea) {
        textarea.value = SAMPLES[val];
        textarea.focus();
      }
    });
  }

  const imageInput = document.querySelector('[data-image-input]');
  if (imageInput) {
    imageInput.addEventListener('change', async () => {
      const feedback = document.querySelector('[data-image-feedback]');
      try {
        if (feedback) feedback.textContent = '正在检查图片识别能力...';
        const result = await extractIngredientsFromImage(imageInput.files?.[0]);
        if (feedback) feedback.textContent = result.message;
      } catch {
        if (feedback) feedback.textContent = '识别失败，请换一张更清晰的图片或直接粘贴成分表文本。';
      }
    });
  }

  const allergenForm = document.querySelector('[data-allergen-form]');
  if (allergenForm) {
    allergenForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(allergenForm);
      const selected = setUserAllergens(formData.getAll('allergens'));
      updateAllergenSettingsFeedback(selected.length, '设置已保存');
    });

    allergenForm.addEventListener('change', () => {
      const formData = new FormData(allergenForm);
      updateAllergenSettingsFeedback(formData.getAll('allergens').length, '');
    });
  }

  const clearAllergensButton = document.querySelector('[data-clear-allergens]');
  if (clearAllergensButton && allergenForm) {
    clearAllergensButton.addEventListener('click', () => {
      allergenForm.querySelectorAll('input[name="allergens"]').forEach((input) => {
        input.checked = false;
      });
      setUserAllergens([]);
      updateAllergenSettingsFeedback(0, '已清空');
    });
  }
}

function updateAllergenSettingsFeedback(count, message) {
  const countNode = document.querySelector('[data-allergen-count]');
  if (countNode) countNode.textContent = `${count} 项已关注`;
  const statusNode = document.querySelector('[data-allergen-status]');
  if (statusNode) statusNode.textContent = message;
}

function bindSearchSuggestions(form, route) {
  const input = form.querySelector('input[name="q"]');
  const container = form.querySelector('[data-search-suggestions]');
  if (!input || !container) return;

  const category = form.dataset.suggestionCategory || route.category;
  const renderSuggestions = () => {
    renderSearchSuggestions(container, input.value, category);
  };

  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  container.addEventListener('mousedown', (event) => {
    const link = event.target.closest('[data-suggestion-query]');
    if (link?.dataset.suggestionQuery) addHistory(link.dataset.suggestionQuery);
  });

  if (input.value.trim()) renderSuggestions();
}

function renderSearchSuggestions(container, query, category) {
  const hasQuery = Boolean(String(query || '').trim());
  const suggestions = getSearchSuggestions(query, category, hasQuery ? 5 : 4);
  container.replaceChildren();
  container.classList.toggle('is-visible', suggestions.length > 0);
  if (!suggestions.length) return;

  const label = document.createElement('span');
  label.className = 'suggestion-label';
  label.textContent = hasQuery ? '建议' : '热门';
  container.append(label);

  for (const suggestion of suggestions) {
    container.append(createSuggestionLink(suggestion, category));
  }
}

function createSuggestionLink(suggestion, category) {
  const link = document.createElement('a');
  link.className = 'suggestion-item';
  link.href = `#${categoryPath(category, `/ingredient/${suggestion.id}`)}`;
  link.dataset.route = '';
  link.dataset.suggestionQuery = suggestion.nameCn;

  const risk = document.createElement('span');
  risk.className = riskClass(suggestion.riskLevel);
  risk.textContent = riskLabel(suggestion.riskLevel);
  link.append(risk);

  const name = document.createElement('strong');
  name.textContent = suggestion.nameCn;
  link.append(name);

  const meta = document.createElement('small');
  meta.textContent = [suggestion.nameEn, suggestion.matchedText ? `${suggestion.matchLabel}：${suggestion.matchedText}` : suggestion.category]
    .filter(Boolean)
    .join(' / ');
  link.append(meta);

  return link;
}

function getReportMarkdownText(report) {
  const textarea = document.querySelector('[data-report-markdown]');
  return textarea?.value || buildReportMarkdown(report);
}

async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy failed');
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateExportStatus(message) {
  const statusNode = document.querySelector('[data-export-status]');
  if (statusNode) statusNode.textContent = message;
}

window.addEventListener('hashchange', render);

if (!window.location.hash) {
  window.location.hash = '#/';
} else {
  render();
}
