import { riskClass, riskLabel } from './components/render.js';
import { categoryPath } from './data/categories.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from './router/router.js';
import { extractIngredientsFromImage } from './services/ocrService.js';
import { getSearchSuggestions } from './services/ingredientService.js';
import { getMembershipActionMessage } from './services/membershipService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from './services/reportExportService.js';
import { addCompareIngredient, addHistory, clearAnalysisReports, clearCompareItems, clearHistory, clearLocalUserData, clearScanDraft, completeOnboarding, deleteAnalysisReport, getAnalysisReportById, getLocalDataSnapshot, getLocalDataSummary, getOnboardingState, getUserAllergens, importLocalDataSnapshot, isHistoryRecordingEnabled, removeCompareIngredient, removeHistory, saveAnalysisReport, saveScanDraft, setHistoryRecordingEnabled, setUserAllergens, skipOnboarding, toggleFavorite } from './store/userStore.js';
import { validateScanImageFile } from './utils/imageFile.js';
import { SAMPLE_OPTIONS, SAMPLES } from './utils/text.js';

const app = document.querySelector('#app');
let scanPreviewObjectUrl = '';
let scanPreviewRotation = 0;

registerServiceWorker();

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const route = resolveRoute(window.location.hash);
  revokeScanPreviewObjectUrl();
  scanPreviewRotation = 0;
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
      const sort = String(formData.get('sort') || '').trim();
      if (!query && !risk && !ingredientCategory) return;

      const params = new URLSearchParams();
      if (query) {
        params.set('q', query);
        addHistory(query);
      }
      if (risk) params.set('risk', risk);
      if (ingredientCategory) params.set('ingredientCategory', ingredientCategory);
      if (sort && sort !== 'relevance') params.set('sort', sort);
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

  document.querySelectorAll('[data-report-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const query = String(formData.get('q') || '').trim();
      if (!query) {
        navigate(`#${categoryPath(route.category, '/reports')}`);
        return;
      }
      const params = new URLSearchParams({ q: query });
      navigate(`#${categoryPath(route.category, '/reports')}?${params.toString()}`);
    });
  });

  document.querySelectorAll('[data-scan-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const input = String(formData.get('scanText') || '').trim();
      if (!input) {
        updateScanFeedback('请输入或粘贴成分表文本后再分析。');
        return;
      }
      saveScanDraft(input, route.category);
      updateScanDraftStatus('草稿已保存。');
      navigate(`#${categoryPath(route.category, '/analyze')}?text=${encodeURIComponent(input)}`);
    });
  });

  const scanTextInput = document.querySelector('#scan-text');
  if (scanTextInput) {
    scanTextInput.addEventListener('input', () => {
      const saved = saveScanDraft(scanTextInput.value, route.category);
      updateScanDraftStatus(saved ? '草稿已自动保存。' : '草稿已清空。');
    });
  }

  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFavorite(button.dataset.favoriteId, route.category);
      render();
    });
  });

  document.querySelectorAll('[data-compare-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = addCompareIngredient(button.dataset.compareAdd, route.category);
      updateCompareStatus(result.message);
      button.classList.toggle('is-active', result.ok);
      if (result.ok) button.textContent = '已加入对比';
    });
  });

  document.querySelectorAll('[data-compare-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      removeCompareIngredient(button.dataset.compareRemove, route.category);
      render();
    });
  });

  const clearCompareButton = document.querySelector('[data-clear-compare]');
  if (clearCompareButton) {
    clearCompareButton.addEventListener('click', () => {
      clearCompareItems(route.category);
      render();
    });
  }

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

  const scanImageInput = document.querySelector('[data-scan-image-input]');
  if (scanImageInput) {
    scanImageInput.addEventListener('change', async () => {
      const feedback = document.querySelector('[data-scan-feedback]');
      const preview = document.querySelector('[data-scan-preview]');
      const textInput = document.querySelector('#scan-text');
      const file = scanImageInput.files?.[0];
      scanPreviewRotation = 0;
      const validation = validateScanImageFile(file);
      updateScanPreview(preview, file, validation);
      updateScanImageActionState({ canRotate: validation.ok, canClear: Boolean(file) });
      if (!validation.ok) {
        if (feedback) feedback.textContent = validation.message;
        return;
      }
      try {
        if (feedback) feedback.textContent = '正在检查图片识别能力...';
        const result = await extractIngredientsFromImage(file);
        if (result.text && textInput && !textInput.value.trim()) {
          textInput.value = result.text;
        }
        if (feedback) feedback.textContent = result.message;
      } catch {
        if (feedback) feedback.textContent = '识别失败，请换一张更清晰的图片或直接录入成分表文本。';
      }
    });
  }

  const rotateScanImageButton = document.querySelector('[data-rotate-scan-image]');
  if (rotateScanImageButton) {
    rotateScanImageButton.addEventListener('click', () => {
      const image = document.querySelector('[data-scan-preview] img');
      if (!image) {
        const selectedFile = document.querySelector('[data-scan-image-input]')?.files?.[0];
        updateScanImageActionState({ canRotate: false, canClear: Boolean(selectedFile) });
        updateScanFeedback('请先选择一张可预览图片。');
        return;
      }

      scanPreviewRotation = (scanPreviewRotation + 90) % 360;
      applyScanPreviewRotation(image);
      updateScanFeedback(scanPreviewRotation ? `已旋转预览 ${scanPreviewRotation} 度。` : '图片预览已回到原始方向。');
    });
  }

  const clearScanImageButton = document.querySelector('[data-clear-scan-image]');
  if (clearScanImageButton) {
    clearScanImageButton.addEventListener('click', () => {
      const imageInput = document.querySelector('[data-scan-image-input]');
      const preview = document.querySelector('[data-scan-preview]');
      if (imageInput) {
        imageInput.value = '';
        imageInput.focus();
      }
      scanPreviewRotation = 0;
      updateScanPreview(preview, null);
      updateScanImageActionState({ canRotate: false, canClear: false });
      updateScanFeedback('图片已移除，可重新选择。');
    });
  }

  const clearScanTextButton = document.querySelector('[data-clear-scan-text]');
  if (clearScanTextButton) {
    clearScanTextButton.addEventListener('click', () => {
      const textInput = document.querySelector('#scan-text');
      if (textInput) {
        textInput.value = '';
        textInput.focus();
      }
      clearScanDraft(route.category);
      updateScanFeedback('文本已清空。');
      updateScanDraftStatus('草稿已清空。');
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

  const historyRecordingToggle = document.querySelector('[data-history-recording-toggle]');
  if (historyRecordingToggle) {
    historyRecordingToggle.addEventListener('change', () => {
      const enabled = setHistoryRecordingEnabled(historyRecordingToggle.checked);
      updateLocalDataSummary(enabled ? '已开启搜索历史记录。' : '已关闭搜索历史记录。');
    });
  }

  const exportLocalDataButton = document.querySelector('[data-export-local-data]');
  if (exportLocalDataButton) {
    exportLocalDataButton.addEventListener('click', () => {
      const snapshot = getLocalDataSnapshot();
      downloadTextFile('compcheck-local-data.json', `${JSON.stringify(snapshot, null, 2)}\n`, 'application/json');
      updateLocalDataSummary('已导出 JSON 文件。');
    });
  }

  const importLocalDataButton = document.querySelector('[data-import-local-data]');
  if (importLocalDataButton) {
    importLocalDataButton.addEventListener('click', async () => {
      const fileInput = document.querySelector('[data-import-local-data-input]');
      const file = fileInput?.files?.[0];
      if (!file) {
        updateLocalDataSummary('请先选择一个 JSON 文件。');
        return;
      }

      const confirmed = typeof window.confirm === 'function'
        ? window.confirm('导入会覆盖当前本机收藏、历史、过敏原、报告和扫描草稿，继续？')
        : true;
      if (!confirmed) return;

      try {
        const text = await readTextFile(file);
        const parsed = JSON.parse(text);
        const result = importLocalDataSnapshot(parsed);
        if (!result.ok) {
          updateLocalDataSummary(result.message);
          return;
        }
        syncAllergenForm(allergenForm, getUserAllergens());
        syncHistoryRecordingToggle(isHistoryRecordingEnabled());
        updateAllergenSettingsFeedback(getUserAllergens().length, '已导入');
        updateLocalDataSummary(result.message);
      } catch {
        updateLocalDataSummary('导入失败：请选择有效的 JSON 文件。');
      }
    });
  }

  const clearLocalDataButton = document.querySelector('[data-clear-local-data]');
  if (clearLocalDataButton) {
    clearLocalDataButton.addEventListener('click', () => {
      const confirmed = typeof window.confirm === 'function'
        ? window.confirm('清空本机收藏、历史、过敏原、报告和扫描草稿？')
        : true;
      if (!confirmed) return;

      clearLocalUserData();
      syncAllergenForm(allergenForm, []);
      syncHistoryRecordingToggle(isHistoryRecordingEnabled());
      updateAllergenSettingsFeedback(0, '已清空');
      updateLocalDataSummary('本机数据已清空。');
    });
  }

  document.querySelectorAll('[data-membership-action]').forEach((button) => {
    button.addEventListener('click', () => {
      updateMembershipStatus(getMembershipActionMessage(button.dataset.membershipAction));
    });
  });

  const onboardingForm = document.querySelector('[data-onboarding-form]');
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(onboardingForm);
      const acceptedBoundary = formData.get('acceptedBoundary') === 'on';
      if (!acceptedBoundary) {
        updateOnboardingStatus('请先确认使用边界。');
        return;
      }
      const state = completeOnboarding({
        preferredCategory: String(formData.get('category') || route.category),
        allergenIds: formData.getAll('allergens'),
        historyRecordingEnabled: formData.get('historyRecordingEnabled') === 'on',
        acceptedBoundary
      });
      updateOnboardingStatus('首次设置已保存。');
      navigate(`#${categoryPath(state.preferredCategory)}`);
    });
  }

  const skipOnboardingButton = document.querySelector('[data-skip-onboarding]');
  if (skipOnboardingButton) {
    skipOnboardingButton.addEventListener('click', () => {
      const state = skipOnboarding({ preferredCategory: route.category });
      navigate(`#${categoryPath(state.preferredCategory)}`);
    });
  }
}

function updateAllergenSettingsFeedback(count, message) {
  const countNode = document.querySelector('[data-allergen-count]');
  if (countNode) countNode.textContent = `${count} 项已关注`;
  const statusNode = document.querySelector('[data-allergen-status]');
  if (statusNode) statusNode.textContent = message;
}

function syncAllergenForm(form, selectedIds) {
  if (!form) return;
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  form.querySelectorAll('input[name="allergens"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function syncHistoryRecordingToggle(enabled) {
  const toggle = document.querySelector('[data-history-recording-toggle]');
  if (toggle) toggle.checked = Boolean(enabled);
}

function updateLocalDataSummary(message) {
  const summary = getLocalDataSummary();
  const summaryNode = document.querySelector('[data-local-data-summary]');
  if (summaryNode) summaryNode.textContent = `${summary.totalItems} 项本机数据`;
  Object.entries(summary).forEach(([key, value]) => {
    const countNode = document.querySelector(`[data-local-data-count="${key}"]`);
    if (countNode) countNode.textContent = String(value);
  });
  const statusNode = document.querySelector('[data-local-data-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateOnboardingStatus(message) {
  const statusNode = document.querySelector('[data-onboarding-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateMembershipStatus(message) {
  const statusNode = document.querySelector('[data-membership-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateCompareStatus(message) {
  const statusNode = document.querySelector('[data-compare-status]');
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

async function readTextFile(file) {
  if (file && typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error || new Error('Read failed')));
    reader.readAsText(file);
  });
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

function updateScanFeedback(message) {
  const statusNode = document.querySelector('[data-scan-feedback]');
  if (statusNode) statusNode.textContent = message;
}

function updateScanDraftStatus(message) {
  const statusNode = document.querySelector('[data-scan-draft-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateScanPreview(preview, file, validation = validateScanImageFile(file)) {
  if (!preview) return;
  revokeScanPreviewObjectUrl();
  preview.replaceChildren();

  if (!file || !validation.ok) {
    const placeholder = document.createElement('span');
    placeholder.textContent = validation.message || '未选择图片';
    preview.append(placeholder);
    return;
  }

  const image = document.createElement('img');
  image.alt = '已选择图片预览';
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    const releaseObjectUrl = () => {
      URL.revokeObjectURL(objectUrl);
      if (scanPreviewObjectUrl === objectUrl) scanPreviewObjectUrl = '';
    };
    image.addEventListener('load', releaseObjectUrl, { once: true });
    image.addEventListener('error', releaseObjectUrl, { once: true });
    image.src = objectUrl;
    scanPreviewObjectUrl = objectUrl;
    applyScanPreviewRotation(image);
    preview.append(image);
    return;
  }

  const placeholder = document.createElement('span');
  placeholder.textContent = '图片已选择。';
  preview.append(placeholder);
}

function applyScanPreviewRotation(image) {
  if (!image) return;
  const rotation = scanPreviewRotation % 360;
  image.dataset.rotation = String(rotation);
  image.style.transform = rotation ? `rotate(${rotation}deg)` : '';
}

function revokeScanPreviewObjectUrl() {
  if (!scanPreviewObjectUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  URL.revokeObjectURL(scanPreviewObjectUrl);
  scanPreviewObjectUrl = '';
}

function updateScanImageActionState({ canRotate, canClear }) {
  const rotateButton = document.querySelector('[data-rotate-scan-image]');
  if (rotateButton) rotateButton.disabled = !canRotate;
  const clearButton = document.querySelector('[data-clear-scan-image]');
  if (clearButton) clearButton.disabled = !canClear;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline support is a progressive enhancement; the app must still run without it.
    });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

function getInitialHash() {
  const onboardingState = getOnboardingState();
  return onboardingState.status === 'pending'
    ? `#${categoryPath(onboardingState.preferredCategory, '/onboarding')}`
    : `#${categoryPath(onboardingState.preferredCategory)}`;
}

window.addEventListener('hashchange', render);

if (!window.location.hash) {
  window.location.hash = getInitialHash();
} else {
  render();
}
