import { riskClass, riskLabel } from './components/render.js';
import { categoryPath } from './data/categories.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from './router/router.js';
import { recognizeImage } from './services/ocrService.js';
import { fetchIngredientById, fetchIngredientSearch } from './services/ingredientApiService.js';
import { getIngredientById, getSearchSuggestions } from './services/ingredientService.js';
import { getMembershipActionMessage } from './services/membershipService.js';
import { getCompareOverview } from './services/compareService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from './services/reportExportService.js';
import { buildCompareSharePayload, buildIngredientSharePayload, buildReportSharePayload, sharePayloadWithFallback } from './services/shareService.js';
import { getNativePhoto, isNativePlatform } from './services/nativeBridgeService.js';
import { getImage, saveImage } from './services/imageStoreService.js';
import { compressImage } from './utils/imageProcessor.js';
import { buildSupportRequestMarkdown } from './services/supportService.js';
import { addCompareIngredient, addHistory, clearAnalysisReports, clearCompareItems, clearHistory, clearLocalUserData, clearPendingScan, clearScanDraft, clearSupportRequests, completeOnboarding, deleteAnalysisReport, deleteSupportRequest, getAnalysisReportById, getLocalDataSnapshot, getLocalDataSummary, getOnboardingState, getPendingScan, getSupportRequests, getUserAllergens, importLocalDataSnapshot, isHistoryRecordingEnabled, markScanTipsSeen, removeCompareIngredient, removeHistory, saveAnalysisReport, saveScanDraft, saveSupportRequest, setHistoryRecordingEnabled, setPendingScan, setUserAllergens, skipOnboarding, toggleFavorite } from './store/userStore.js';
import { formatBytes, validateScanImageFile } from './utils/imageFile.js';
import { parseIngredientList, SAMPLE_OPTIONS, SAMPLES } from './utils/text.js';

const app = document.querySelector('#app');
const API_SEARCH_PAGE_SIZE = 6;
let scanPreviewObjectUrl = '';
let scanPreviewRotation = 0;
let routeRenderVersion = 0;

registerServiceWorker();

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const renderVersion = routeRenderVersion + 1;
  routeRenderVersion = renderVersion;
  const route = resolveRoute(window.location.hash);
  revokeScanPreviewObjectUrl();
  scanPreviewRotation = 0;
  document.title = getRouteTitle(route);
  updateShellNavigation(route);
  app.innerHTML = renderRoute(route, getInitialApiState(route));
  bindPageEvents(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (typeof app.focus === 'function') {
    app.focus({ preventScroll: true });
  }
  hydrateIngredientApiRoute(route, renderVersion);
}

function getInitialApiState(route) {
  if (!shouldUseIngredientApi(route)) return null;
  return { status: 'loading' };
}

async function hydrateIngredientApiRoute(route, renderVersion) {
  if (!shouldUseIngredientApi(route)) return;
  try {
    const state = route.view === 'search'
      ? await getSearchApiState(route)
      : await getDetailApiState(route);
    if (renderVersion !== routeRenderVersion) return;
    app.innerHTML = renderRoute(route, state);
    bindPageEvents(route);
  } catch {
    if (renderVersion !== routeRenderVersion) return;
    app.innerHTML = renderRoute(route, { status: 'error' });
    bindPageEvents(route);
  }
}

function shouldUseIngredientApi(route) {
  return route?.category === 'food' && ['search', 'detail'].includes(route.view);
}

async function getSearchApiState(route) {
  const requestedPage = Math.max(1, Number(route.page) || 1);
  let result = await requestIngredientSearchPage(route, requestedPage);
  let totalPages = getApiTotalPages(result);
  let responsePage = requestedPage;

  if (requestedPage > totalPages) {
    result = await requestIngredientSearchPage(route, totalPages);
    responsePage = totalPages;
    totalPages = getApiTotalPages(result);
  }

  return {
    status: 'success',
    items: result.items || [],
    page: responsePage,
    total: result.total || 0,
    totalPages,
    riskFacets: result.riskFacets || [],
    categoryFacets: result.categoryFacets || []
  };
}

function requestIngredientSearchPage(route, page) {
  return fetchIngredientSearch({
    query: route.query,
    filters: route.filters,
    sort: route.sort,
    page,
    limit: API_SEARCH_PAGE_SIZE
  });
}

function getApiTotalPages(result) {
  return Math.max(1, Number(result?.totalPages || 1) || 1);
}

async function getDetailApiState(route) {
  const item = await fetchIngredientById(route.id);
  if (!item) return { status: 'error' };
  return {
    status: 'success',
    item
  };
}

function updateShellNavigation(route) {
  const brandLink = document.querySelector('[data-brand-link]');
  if (brandLink) brandLink.setAttribute('href', `#${categoryPath(route.category)}`);
  const shellLegalLink = document.querySelector('[data-shell-legal-link]');
  if (shellLegalLink) shellLegalLink.setAttribute('href', `#${categoryPath(route.category, '/legal')}`);

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
      if (!input) {
        updateAnalyzeStatus('请先输入成分表文字');
        const textarea = form.querySelector('#ingredient-text');
        if (textarea && typeof textarea.focus === 'function') textarea.focus();
        return;
      }
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

  bindScanPageEvents(route);
  bindOcrConfirmEvents(route);

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

  const shareCompareButton = document.querySelector('[data-share-compare]');
  if (shareCompareButton) {
    shareCompareButton.addEventListener('click', async () => {
      const payload = buildCompareSharePayload(getCompareOverview(route.category), getShareBaseUrl());
      await sharePayload(payload, updateCompareStatus);
    });
  }

  document.querySelectorAll('[data-share-ingredient]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ingredient = getIngredientById(button.dataset.shareIngredient, route.category);
      if (!ingredient) {
        updateShareStatus('成分不存在，无法分享。');
        return;
      }
      const payload = buildIngredientSharePayload(ingredient, route.category, getShareBaseUrl());
      await sharePayload(payload, updateShareStatus);
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

  document.querySelectorAll('[data-share-report]').forEach((button) => {
    button.addEventListener('click', async () => {
      const report = getAnalysisReportById(button.dataset.shareReport);
      if (!report) {
        updateExportStatus('报告不存在，无法分享。');
        return;
      }
      const payload = buildReportSharePayload(report, getShareBaseUrl());
      await sharePayload(payload, updateExportStatus);
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

  const supportForm = document.querySelector('[data-support-form]');
  if (supportForm) {
    supportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(supportForm);
      const result = saveSupportRequest({
        topic: String(formData.get('topic') || ''),
        subject: String(formData.get('subject') || ''),
        message: String(formData.get('message') || ''),
        contact: String(formData.get('contact') || ''),
        acceptedBoundary: formData.get('acceptedBoundary') === 'on'
      }, route.category);
      if (!result.ok) {
        updateSupportStatus(result.message);
        return;
      }
      if (route.prefill?.hasPrefill && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${categoryPath(route.category, '/support')}`);
      }
      render();
      updateSupportStatus(result.message);
    });
  }

  document.querySelectorAll('[data-copy-support-request]').forEach((button) => {
    button.addEventListener('click', async () => {
      const request = getSupportRequests().find((item) => item.id === button.dataset.copySupportRequest);
      if (!request) {
        updateSupportStatus('反馈记录不存在，无法复制。');
        return;
      }
      try {
        await copyText(buildSupportRequestMarkdown(request));
        updateSupportStatus('已复制反馈内容。');
      } catch {
        updateSupportStatus('复制失败，请手动选择文本。');
      }
    });
  });

  document.querySelectorAll('[data-delete-support-request]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteSupportRequest(button.dataset.deleteSupportRequest);
      render();
      updateSupportStatus('反馈记录已删除。');
    });
  });

  const clearSupportRequestsButton = document.querySelector('[data-clear-support-requests]');
  if (clearSupportRequestsButton) {
    clearSupportRequestsButton.addEventListener('click', () => {
      clearSupportRequests();
      render();
      updateSupportStatus('本机反馈记录已清空。');
    });
  }

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

function bindScanPageEvents(route) {
  document.querySelectorAll('[data-open-scan-camera]').forEach((button) => {
    button.addEventListener('click', () => openScanSource('camera'));
  });

  document.querySelectorAll('[data-open-scan-photos]').forEach((button) => {
    button.addEventListener('click', () => openScanSource('photos'));
  });

  document.querySelectorAll('[data-scan-camera-input], [data-scan-photos-input]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      await handleScanFile(file, route.category);
      input.value = '';
    });
  });

  const clearScanImageButton = document.querySelector('[data-clear-scan-image]');
  if (clearScanImageButton) {
    clearScanImageButton.addEventListener('click', () => {
      clearPendingScan();
      revokeScanPreviewObjectUrl();
      updateScanPreview(document.querySelector('[data-scan-preview]'), null);
      updateScanMeta(`支持 JPG、PNG、WebP、HEIC/HEIF，单张不超过 8 MB。`);
      updateScanConfirmState(false);
      updateScanFeedback('图片已移除，可重新选择。');
    });
  }

  const confirmButton = document.querySelector('[data-confirm-scan-image]');
  if (confirmButton) {
    confirmButton.addEventListener('click', async () => {
      const pending = getPendingScan();
      if (!pending.pendingImageId) {
        updateScanFeedback('请先选择一张食品配料表照片。');
        return;
      }

      confirmButton.disabled = true;
      setPendingScan({ status: 'loading', category: route.category });
      updateScanFeedback('正在准备识别，未配置 OCR 时会进入手动确认模式...');
      try {
        const image = await getImage(pending.pendingImageId);
        const result = await recognizeImage(image?.blob, { category: route.category });
        setPendingScan({
          category: route.category,
          status: statusFromOcrResult(result),
          pendingText: result.rawText || pending.pendingText || '',
          pendingSource: result.mode === 'real' ? 'ocr' : 'manual',
          pendingOcrMode: result.mode,
          pendingOcrConfidence: result.confidence,
          pendingOcrProvider: result.provider,
          pendingOcrErrorCode: result.errorCode || '',
          pendingOcrErrorMsg: result.errorMsg || ''
        });
        navigate(`#${categoryPath(route.category, '/ocr-confirm')}`);
      } catch {
        setPendingScan({
          category: route.category,
          status: 'error',
          pendingSource: 'manual',
          pendingOcrMode: 'fallback',
          pendingOcrConfidence: 0,
          pendingOcrErrorCode: 'scan_prepare_failed',
          pendingOcrErrorMsg: '图片读取失败，请手动输入配料表。'
        });
        navigate(`#${categoryPath(route.category, '/ocr-confirm')}`);
      }
    });
  }

  document.querySelectorAll('[data-start-manual-confirm]').forEach((link) => {
    link.addEventListener('click', () => {
      setPendingScan({
        category: route.category,
        status: 'manual',
        pendingText: link.dataset.startManualConfirm || '',
        pendingSource: 'manual',
        pendingOcrMode: 'manual',
        pendingOcrConfidence: 1,
        pendingOcrProvider: 'manual',
        pendingOcrErrorCode: '',
        pendingOcrErrorMsg: ''
      });
    });
  });

  const tips = document.querySelector('[data-scan-tips]');
  if (tips) {
    tips.addEventListener('toggle', () => {
      if (!tips.open) markScanTipsSeen();
    }, { once: true });
  }

  if (route.view === 'scan') {
    void hydrateStoredScanPreview();
  }
}

function bindOcrConfirmEvents(route) {
  const form = document.querySelector('[data-ocr-confirm-form]');
  if (!form) {
    if (route.view === 'ocr-confirm') void hydrateOcrConfirmImage();
    return;
  }

  const textarea = form.querySelector('#ocr-confirm-text');
  const productInput = form.querySelector('#ocr-product-name');
  const submitButton = form.querySelector('button[type="submit"]');

  const syncPending = () => {
    const text = textarea?.value || '';
    setPendingScan({
      category: route.category,
      status: text.trim() ? 'success' : 'manual',
      pendingText: text,
      pendingProductName: productInput?.value || ''
    });
    updateOcrIngredientCount(text);
    if (submitButton) submitButton.disabled = !text.trim();
  };

  textarea?.addEventListener('input', syncPending);
  textarea?.addEventListener('focus', () => {
    textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  productInput?.addEventListener('input', syncPending);

  const clearButton = form.querySelector('[data-clear-ocr-text]');
  clearButton?.addEventListener('click', () => {
    if (textarea) textarea.value = '';
    syncPending();
    textarea?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = String(textarea?.value || '').trim();
    const productName = String(productInput?.value || '').trim();
    if (!text) {
      updateOcrConfirmStatus('请先输入配料表内容。');
      textarea?.focus();
      return;
    }
    saveScanDraft(text, route.category);
    setPendingScan({
      category: route.category,
      status: 'success',
      pendingText: text,
      pendingProductName: productName
    });
    const params = new URLSearchParams({ text });
    if (productName) params.set('productName', productName);
    navigate(`#${categoryPath(route.category, '/analyze')}?${params.toString()}`);
  });

  void hydrateOcrConfirmImage();
}

async function openScanSource(source) {
  const fallbackInput = document.querySelector(source === 'camera' ? '[data-scan-camera-input]' : '[data-scan-photos-input]');
  if (!isNativePlatform()) {
    updateScanFeedback('当前为 Web 环境，已打开文件选择。');
    openScanFilePicker(fallbackInput);
    return;
  }

  updateScanFeedback(source === 'camera' ? '正在打开系统相机...' : '正在打开系统相册...');
  const result = await getNativePhoto(source);
  if (!result.ok) {
    updateScanFeedback(result.message || '系统相机或相册不可用，已切换到文件选择。');
    if (!['cancelled', 'empty'].includes(result.reason)) openScanFilePicker(fallbackInput);
    return;
  }

  const blob = dataUrlToBlob(result.dataUrl, result.mimeType);
  const fileName = `native-${source}.${result.format || 'jpeg'}`;
  const scanFile = typeof File === 'function'
    ? new File([blob], fileName, { type: blob.type || result.mimeType || 'image/jpeg' })
    : Object.assign(blob, { name: fileName });
  await handleScanFile(scanFile, resolveRoute(window.location.hash).category);
}

async function handleScanFile(file, category) {
  const validation = validateScanImageFile(file);
  if (!validation.ok) {
    clearPendingScan();
    updateScanPreview(document.querySelector('[data-scan-preview]'), null, validation);
    updateScanMeta(validation.message);
    updateScanConfirmState(false);
    updateScanFeedback(validation.message);
    return;
  }

  updateScanFeedback('正在预处理图片...');
  try {
    const processed = await compressImage(file, { maxWidth: 1200, maxBytes: 800_000 });
    const meta = {
      originalName: file.name || 'ingredient-image',
      mimeType: processed.blob.type || file.type || 'image/jpeg',
      width: processed.width,
      height: processed.height,
      originalSize: processed.originalSize,
      compressedSize: processed.compressedSize
    };
    const imageId = await saveImage(processed.blob, meta);
    setPendingScan({
      category,
      status: 'manual',
      pendingImageId: imageId,
      pendingImageMeta: meta,
      pendingText: '',
      pendingSource: 'manual',
      pendingOcrMode: 'manual',
      pendingOcrConfidence: 1,
      pendingOcrProvider: 'manual'
    });
    updateScanPreviewWithBlob(document.querySelector('[data-scan-preview]'), processed.blob);
    updateScanMeta(`图片大小：${formatBytes(processed.compressedSize)}${processed.originalSize !== processed.compressedSize ? `（原图 ${formatBytes(processed.originalSize)}）` : ''}`);
    updateScanConfirmState(true);
    updateScanFeedback(processed.fallback === 'canvas_unavailable'
      ? '图片已保存；当前环境无法压缩，仍可进入确认页。'
      : '图片已预处理并保存到本机 IndexedDB。');
  } catch {
    clearPendingScan();
    updateScanConfirmState(false);
    updateScanFeedback('图片预处理失败，请更换更清晰的图片或手动输入。');
  }
}

async function hydrateStoredScanPreview() {
  const pending = getPendingScan();
  if (!pending.pendingImageId) return;
  const image = await getImage(pending.pendingImageId);
  if (!image?.blob) return;
  updateScanPreviewWithBlob(document.querySelector('[data-scan-preview]'), image.blob);
  updateScanConfirmState(true);
}

async function hydrateOcrConfirmImage() {
  const pending = getPendingScan();
  const container = document.querySelector('[data-ocr-confirm-image]');
  if (!container || !pending.pendingImageId) return;
  const image = await getImage(pending.pendingImageId);
  if (!image?.blob) {
    container.textContent = '图片暂不可用';
    return;
  }
  updateScanPreviewWithBlob(container, image.blob, '配料表图片缩略图');
}

function statusFromOcrResult(result) {
  if (result.mode === 'real' && result.rawText) return 'success';
  if (result.mode === 'real') return 'empty';
  if (result.mode === 'fallback') return 'error';
  return 'manual';
}

function updateAllergenSettingsFeedback(count, message) {
  const countNode = document.querySelector('[data-allergen-count]');
  if (countNode) countNode.textContent = `${count} 项已关注`;
  const statusNode = document.querySelector('[data-allergen-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateAnalyzeStatus(message) {
  const statusNode = document.querySelector('[data-analyze-status]');
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

function updateSupportStatus(message) {
  const statusNode = document.querySelector('[data-support-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateCompareStatus(message) {
  const statusNode = document.querySelector('[data-compare-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateShareStatus(message) {
  const statusNode = document.querySelector('[data-share-status]');
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

async function sharePayload(payload, updateStatus) {
  await sharePayloadWithFallback(payload, { copyText, updateStatus });
}

function getShareBaseUrl() {
  return typeof window === 'undefined' ? '' : window.location.href;
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

function updateOcrConfirmStatus(message) {
  const statusNode = document.querySelector('[data-ocr-confirm-status]');
  if (statusNode) statusNode.textContent = message;
}

function updateOcrIngredientCount(text) {
  const count = parseIngredientList(text).length;
  const countNode = document.querySelector('[data-ocr-ingredient-count]');
  if (countNode) countNode.textContent = count ? `${count} 项` : '未识别到配料';
  const helpNode = document.querySelector('[data-ocr-confirm-help]');
  if (helpNode) helpNode.textContent = count ? '识别有误？直接在上方修改文字。' : '未识别到文字，请手动输入配料表。';
}

function updateScanMeta(message) {
  const metaNode = document.querySelector('[data-scan-image-meta]');
  if (metaNode) metaNode.textContent = message;
}

function updateScanConfirmState(enabled) {
  const button = document.querySelector('[data-confirm-scan-image]');
  if (button) button.disabled = !enabled;
  const clearButton = document.querySelector('[data-clear-scan-image]');
  if (clearButton) clearButton.disabled = !enabled;
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

function updateScanPreviewWithDataUrl(preview, dataUrl) {
  if (!preview) return;
  revokeScanPreviewObjectUrl();
  preview.replaceChildren();
  if (!dataUrl) {
    const placeholder = document.createElement('span');
    placeholder.textContent = '未选择图片';
    preview.append(placeholder);
    return;
  }

  const image = document.createElement('img');
  image.alt = '已选择图片预览';
  image.src = dataUrl;
  applyScanPreviewRotation(image);
  preview.append(image);
}

function updateScanPreviewWithBlob(preview, blob, alt = '已选择图片预览') {
  if (!preview) return;
  revokeScanPreviewObjectUrl();
  preview.replaceChildren();
  const image = document.createElement('img');
  image.alt = alt;
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    scanPreviewObjectUrl = URL.createObjectURL(blob);
    image.src = scanPreviewObjectUrl;
  }
  preview.append(image);
}

function openScanFilePicker(fileInput) {
  try {
    if (fileInput && typeof fileInput.click === 'function') fileInput.click();
  } catch {
    // File input is the progressive fallback; if the browser blocks click(), the visible input remains usable.
  }
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

function dataUrlToBlob(dataUrl, mimeType = 'image/jpeg') {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  if (typeof Buffer !== 'undefined') {
    return new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
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
