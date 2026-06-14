import { riskClass, riskLabel } from './components/render.js';
import { categoryPath } from './data/categories.js';
import { getMobileNavigationLinks, getNavigationLinks, getRouteTitle, renderRoute, resolveRoute } from './router/router.js';
import { recognizeImage } from './services/ocrService.js';
import { fetchIngredientById, fetchIngredientSearch } from './services/ingredientApiService.js';
import { batchUpdateGb2760StagingReviewStatus, fetchGb2760ReferenceRows, fetchGb2760StagingRows, updateGb2760StagingReviewStatus } from './services/gb2760ApiService.js';
import { getIngredientById, getSearchSuggestions } from './services/ingredientService.js';
import { getMembershipActionMessage } from './services/membershipService.js';
import { addAvoidIngredient, addWatchIngredient, getPersonalProfile, removeAvoidIngredient, removeWatchIngredient } from './services/personalProfileService.js';
import { buildAuthRedirectTarget, login, logout, register, validateAuthInput } from './services/authService.js';
import { getCompareOverview } from './services/compareService.js';
import { clearProductArchives, deleteProductArchive, getProductArchiveById, saveProductArchiveFromReport, toggleProductArchiveFavorite } from './services/productArchiveService.js';
import { buildReportExportPayload, buildReportFileName, buildReportMarkdown } from './services/reportExportService.js';
import { buildCompareSharePayload, buildIngredientSharePayload, buildReportSharePayload, sharePayloadWithFallback } from './services/shareService.js';
import { getNativePhoto, isNativePlatform } from './services/nativeBridgeService.js';
import { deleteImage, getImage, saveImage } from './services/imageStoreService.js';
import { compressImage } from './utils/imageProcessor.js';
import { buildSupportRequestMarkdown } from './services/supportService.js';
import { matchIngredients } from './services/ingredientMatchService.js';
import { renderDatabaseMatchSummary } from './pages/analyzePage.js';
import { renderGb2760ReferenceRowsState } from './pages/dataPage.js';
import { addCompareIngredient, addHistory, clearAnalysisReports, clearCompareItems, clearHistory, clearLocalUserData, clearPendingScan, clearScanDraft, clearSupportRequests, completeOnboarding, deleteAnalysisReport, deleteSupportRequest, getAnalysisReportById, getLocalDataSnapshot, getLocalDataSummary, getOnboardingState, getPendingScan, getSupportRequests, getUserAllergens, importLocalDataSnapshot, isHistoryRecordingEnabled, markScanTipsSeen, removeCompareIngredient, removeHistory, saveAnalysisReport, saveScanDraft, saveSupportRequest, setHistoryRecordingEnabled, setPendingScan, setUserAllergens, skipOnboarding, toggleFavorite } from './store/userStore.js';
import { formatBytes, validateScanImageFile } from './utils/imageFile.js';
import { parseIngredientList, SAMPLE_OPTIONS, SAMPLES } from './utils/text.js';

const app = document.querySelector('#app');
const API_SEARCH_PAGE_SIZE = 6;
const PWA_OPEN_COUNT_KEY = 'compcheck:pwa-open-count';
const PWA_INSTALL_DISMISSED_KEY = 'compcheck:pwa-install-dismissed';
const PWA_INSTALLED_KEY = 'compcheck:pwa-installed';
let scanPreviewObjectUrl = '';
let productImageObjectUrl = '';
let scanPreviewRotation = 0;
let routeRenderVersion = 0;
let deferredInstallPrompt = null;

registerServiceWorker();
setupConnectionStatus();
setupPwaInstallPrompt();

function navigate(hash) {
  window.location.hash = hash;
}

function render() {
  const renderVersion = routeRenderVersion + 1;
  routeRenderVersion = renderVersion;
  const route = resolveRoute(window.location.hash);
  revokeScanPreviewObjectUrl();
  revokeProductImageObjectUrl();
  scanPreviewRotation = 0;
  document.title = getRouteTitle(route);
  updateShellNavigation(route);
  app.innerHTML = renderRoute(route, getInitialApiState(route));
  playPageEnterAnimation();
  bindPageEvents(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (typeof app.focus === 'function') {
    app.focus({ preventScroll: true });
  }
  hydrateIngredientApiRoute(route, renderVersion);
  hydrateGb2760ReferenceRows(route, renderVersion);
  hydrateGb2760ReviewRoute(route, renderVersion);
  hydrateAnalyzeMatchRoute(route, renderVersion);
  hydrateProductArchiveImage(route, renderVersion);
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

async function hydrateAnalyzeMatchRoute(route, renderVersion) {
  if (route?.view !== 'analyze' || !String(route.input || '').trim()) return;
  const matchPanel = document.querySelector('[data-ingredient-match-summary]');
  if (!matchPanel) return;

  try {
    const summary = await matchIngredients(parseIngredientList(route.input), route.category);
    if (renderVersion !== routeRenderVersion) return;
    const section = matchPanel.closest('section');
    if (section) section.outerHTML = renderDatabaseMatchSummary(summary);
  } catch {
    // The initial local summary is already rendered; leave it in place on API failure.
  }
}

async function hydrateProductArchiveImage(route, renderVersion) {
  if (route?.view !== 'product-detail') return;
  const product = getProductArchiveById(route.id);
  if (!product?.imageId || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const imageNode = document.querySelector('[data-product-image]');
  if (!imageNode) return;

  try {
    const image = await getImage(product.imageId);
    if (renderVersion !== routeRenderVersion || !image?.blob) return;
    revokeProductImageObjectUrl();
    productImageObjectUrl = URL.createObjectURL(image.blob);
    if (imageNode.tagName === 'IMG') {
      imageNode.src = productImageObjectUrl;
      return;
    }

    const img = document.createElement('img');
    img.alt = `${product.productName}包装图`;
    img.dataset.productImage = product.id;
    img.src = productImageObjectUrl;
    imageNode.replaceWith(img);
  } catch {
    // Thumbnail and metadata remain usable if the IndexedDB image cannot be read.
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
  const item = await fetchIngredientById(route.id, { includeEvidence: true });
  if (!item) return { status: 'error' };
  return {
    status: 'success',
    item
  };
}

async function hydrateGb2760ReferenceRows(route, renderVersion) {
  if (route?.view !== 'data' || route.category !== 'food') return;
  const target = document.querySelector('[data-gb2760-reference-results]');
  if (!target) return;

  target.innerHTML = renderGb2760ReferenceRowsState({ status: 'loading' }, route.filters);
  try {
    const result = await fetchGb2760ReferenceRows({
      table: route.filters?.gbTable,
      q: route.filters?.gbQuery,
      page: route.filters?.gbPage,
      limit: 20
    });
    if (renderVersion !== routeRenderVersion) return;
    target.innerHTML = renderGb2760ReferenceRowsState({ status: 'success', result }, route.filters);
  } catch (error) {
    if (renderVersion !== routeRenderVersion) return;
    target.innerHTML = renderGb2760ReferenceRowsState({
      status: 'error',
      code: error?.code || '',
      httpStatus: error?.status || 0
    }, route.filters);
  }
}

async function hydrateGb2760ReviewRoute(route, renderVersion) {
  if (route?.view !== 'gb2760-review' || route.category !== 'food') return;
  try {
    const result = await fetchGb2760StagingRows({
      status: route.filters?.status,
      q: route.filters?.q,
      ready: route.filters?.ready,
      page: route.filters?.page,
      limit: route.filters?.limit || 20
    });
    if (renderVersion !== routeRenderVersion) return;
    app.innerHTML = renderRoute(route, { status: 'success', result });
    bindPageEvents(route);
  } catch (error) {
    if (renderVersion !== routeRenderVersion) return;
    app.innerHTML = renderRoute(route, {
      status: 'error',
      code: error?.code || '',
      httpStatus: error?.status || 0
    });
    bindPageEvents(route);
  }
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

function playPageEnterAnimation() {
  app.classList.remove('page-enter');
  if (typeof app.offsetWidth !== 'number') return;
  void app.offsetWidth;
  app.classList.add('page-enter');
}

function bindPageEvents(route) {
  bindAuthEvents(route);

  document.querySelectorAll('[data-route-retry]').forEach((button) => {
    button.addEventListener('click', () => {
      render();
    });
  });

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

  document.querySelectorAll('[data-product-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const query = String(formData.get('q') || '').trim();
      if (!query) {
        navigate(`#${categoryPath(route.category, '/products')}`);
        return;
      }
      const params = new URLSearchParams({ q: query });
      navigate(`#${categoryPath(route.category, '/products')}?${params.toString()}`);
    });
  });

  document.querySelectorAll('[data-history-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const query = String(formData.get('q') || '').trim();
      const filter = String(formData.get('filter') || '').trim();
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (filter && filter !== 'all') params.set('filter', filter);
      const suffix = params.toString();
      navigate(`#${categoryPath(route.category, '/history')}${suffix ? `?${suffix}` : ''}`);
    });
  });

  document.querySelectorAll('[data-data-filter-form]').forEach((form) => {
    const applyDataFilters = () => {
      const formData = new FormData(form);
      const source = String(formData.get('source') || '').trim();
      const confidenceLevel = String(formData.get('confidenceLevel') || '').trim();
      const dataStatus = String(formData.get('dataStatus') || '').trim();
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      if (confidenceLevel) params.set('confidenceLevel', confidenceLevel);
      if (dataStatus) params.set('dataStatus', dataStatus);
      if (route.filters?.gbTable) params.set('gbTable', route.filters.gbTable);
      if (route.filters?.gbQuery) params.set('gbQuery', route.filters.gbQuery);
      if (route.filters?.gbPage && route.filters.gbPage > 1) params.set('gbPage', String(route.filters.gbPage));
      const suffix = params.toString();
      navigate(`#${categoryPath(route.category, '/data')}${suffix ? `?${suffix}` : ''}`);
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      applyDataFilters();
    });
    form.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', applyDataFilters);
    });
  });

  document.querySelectorAll('[data-gb2760-reference-form]').forEach((form) => {
    const applyReferenceFilters = () => {
      const formData = new FormData(form);
      const params = new URLSearchParams();
      if (route.filters?.source) params.set('source', route.filters.source);
      if (route.filters?.confidenceLevel) params.set('confidenceLevel', route.filters.confidenceLevel);
      if (route.filters?.dataStatus) params.set('dataStatus', route.filters.dataStatus);
      const gbTable = String(formData.get('gbTable') || '').trim();
      const gbQuery = String(formData.get('gbQuery') || '').trim();
      if (gbTable) params.set('gbTable', gbTable);
      if (gbQuery) params.set('gbQuery', gbQuery);
      const suffix = params.toString();
      navigate(`#${categoryPath(route.category, '/data')}${suffix ? `?${suffix}` : ''}`);
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      applyReferenceFilters();
    });
    form.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', applyReferenceFilters);
    });
  });

  document.querySelectorAll('[data-gb2760-review-form]').forEach((form) => {
    const applyReviewFilters = () => {
      const formData = new FormData(form);
      const status = String(formData.get('status') || '').trim();
      const q = String(formData.get('q') || '').trim();
      const ready = formData.get('ready') === '1';
      const limit = String(formData.get('limit') || '').trim();
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      if (ready) params.set('ready', '1');
      if (limit && limit !== '20') params.set('limit', limit);
      const suffix = params.toString();
      navigate(`#${categoryPath(route.category, '/gb2760-review')}${suffix ? `?${suffix}` : ''}`);
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      applyReviewFilters();
    });
    form.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', applyReviewFilters);
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', applyReviewFilters);
    });
  });

  document.querySelectorAll('[data-gb2760-review-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const rowId = button.dataset.rowId || '';
      const reviewStatus = button.dataset.reviewStatus || '';
      const message = document.querySelector('[data-gb2760-review-message]');
      setReviewMessage(message, '正在更新复核状态...');
      button.disabled = true;
      try {
        await updateGb2760StagingReviewStatus(rowId, reviewStatus);
        setReviewMessage(message, '已更新，正在刷新列表...');
        render();
      } catch (error) {
        button.disabled = false;
        const reasons = Array.isArray(error?.reasons) && error.reasons.length
          ? `：${error.reasons.join('；')}`
          : '';
        setReviewMessage(message, `${error?.message || '更新失败'}${reasons}`);
      }
    });
  });

  document.querySelectorAll('[data-gb2760-review-select-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const checkboxes = [...document.querySelectorAll('[data-gb2760-review-select]')]
        .filter((checkbox) => !checkbox.disabled);
      const shouldSelect = checkboxes.some((checkbox) => !checkbox.checked);
      checkboxes.forEach((checkbox) => {
        checkbox.checked = shouldSelect;
      });
      const message = document.querySelector('[data-gb2760-review-message]');
      setReviewMessage(message, shouldSelect ? `已选择本页 ${checkboxes.length} 行可签核项` : '已取消本页选择');
    });
  });

  document.querySelectorAll('[data-gb2760-batch-review-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const reviewStatus = button.dataset.reviewStatus || '';
      const ids = [...document.querySelectorAll('[data-gb2760-review-select]:checked')]
        .filter((checkbox) => !checkbox.disabled)
        .map((checkbox) => checkbox.value)
        .filter(Boolean);
      const message = document.querySelector('[data-gb2760-review-message]');
      if (!ids.length) {
        setReviewMessage(message, '请先选择要批量签核的行。');
        return;
      }

      setReviewMessage(message, `正在批量更新 ${ids.length} 行...`);
      button.disabled = true;
      try {
        const result = await batchUpdateGb2760StagingReviewStatus(ids, reviewStatus);
        const skipped = Number(result?.skippedCount || 0);
        const updated = Number(result?.updatedCount || 0);
        const firstReason = result?.errors?.[0]?.reasons?.[0] ? `，首个跳过原因：${result.errors[0].reasons[0]}` : '';
        setReviewMessage(message, `批量签核完成：已更新 ${updated} 行，跳过 ${skipped} 行${firstReason}`);
        render();
      } catch (error) {
        button.disabled = false;
        const reasons = Array.isArray(error?.reasons) && error.reasons.length
          ? `：${error.reasons.join('；')}`
          : '';
        setReviewMessage(message, `${error?.message || '批量更新失败'}${reasons}`);
      }
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
      const pending = getPendingScanForReport(route);
      const report = saveAnalysisReport(route.input, route.category, {
        productName: route.productName,
        imageId: pending?.pendingImageId,
        source: pending?.pendingSource
      });
      if (!report) return;
      if (pending?.pendingImageId) clearPendingScan();
      navigate(`#${categoryPath(report.category, `/reports/${report.id}`)}`);
    });
  }

  document.querySelectorAll('[data-save-product-archive]').forEach((button) => {
    button.addEventListener('click', async () => {
      const report = getAnalysisReportById(button.dataset.saveProductArchive);
      if (!report) {
        updateExportStatus('报告不存在，无法保存产品档案。');
        return;
      }

      button.disabled = true;
      updateExportStatus('正在保存产品档案...');
      const product = await saveProductArchiveFromReport(report);
      if (!product) {
        button.disabled = false;
        updateExportStatus('产品档案保存失败，请稍后重试。');
        return;
      }
      navigate(`#${categoryPath(product.category, `/product/${product.id}`)}`);
    });
  });

  document.querySelectorAll('[data-toggle-product-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleProductArchiveFavorite(button.dataset.toggleProductFavorite);
      render();
    });
  });

  document.querySelectorAll('[data-delete-product-archive]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteProductArchive(button.dataset.deleteProductArchive);
      if (route.view === 'product-detail') {
        navigate(`#${categoryPath(route.category, '/products')}`);
      } else {
        render();
      }
    });
  });

  const clearProductHistoryButton = document.querySelector('[data-clear-product-history]');
  if (clearProductHistoryButton) {
    clearProductHistoryButton.addEventListener('click', () => {
      const confirmed = typeof window.confirm === 'function'
        ? window.confirm('清空当前类别的分析历史？收藏产品也会被删除。')
        : true;
      if (!confirmed) return;
      clearProductArchives(clearProductHistoryButton.dataset.clearProductHistory || route.category);
      render();
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

  bindPersonalProfileSettings(route);

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
        ? window.confirm('导入会覆盖当前本机收藏、历史、过敏原、关注成分、忌口项、报告、产品档案和扫描草稿，继续？')
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
        render();
        updateAllergenSettingsFeedback(getUserAllergens().length, '已导入');
        updateLocalDataSummary(result.message);
      } catch {
        updateLocalDataSummary('导入失败：请选择有效的 JSON 文件。');
      }
    });
  }

  const clearLocalDataButton = document.querySelector('[data-clear-local-data]');
  if (clearLocalDataButton) {
    clearLocalDataButton.addEventListener('click', async () => {
      const confirmed = typeof window.confirm === 'function'
        ? window.confirm('清空本机收藏、历史、过敏原、关注成分、忌口项、报告、产品档案和扫描草稿？')
        : true;
      if (!confirmed) return;

      const pending = getPendingScan();
      clearLocalUserData();
      if (pending.pendingImageId) {
        try {
          await deleteImage(pending.pendingImageId);
        } catch {
          // Other local data has already been cleared; image cleanup is best-effort.
        }
      }
      render();
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

  bindHistorySwipeActions();
}

function setReviewMessage(node, value) {
  if (!node) return;
  node.textContent = value;
}

function bindPersonalProfileSettings(route) {
  document.querySelectorAll('[data-add-personal-ingredient]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.addPersonalIngredient;
      const ingredientId = button.dataset.ingredientId;
      if (type === 'watch') {
        addWatchIngredient(ingredientId, route.category);
      } else if (type === 'avoid') {
        addAvoidIngredient(ingredientId, route.category);
      }
      render();
    });
  });

  document.querySelectorAll('[data-remove-personal-ingredient]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.removePersonalIngredient;
      const ingredientId = button.dataset.ingredientId;
      if (type === 'watch') {
        removeWatchIngredient(ingredientId);
      } else if (type === 'avoid') {
        removeAvoidIngredient(ingredientId);
      }
      render();
    });
  });

  document.querySelectorAll('[data-personal-ingredient-filter]').forEach((input) => {
    input.addEventListener('input', () => filterPersonalIngredientCandidates(input));
  });
}

function filterPersonalIngredientCandidates(input) {
  const type = input.dataset.personalIngredientFilter;
  const keyword = String(input.value || '').trim().toLowerCase();
  document.querySelectorAll(`[data-personal-ingredient-candidates="${type}"] [data-personal-ingredient-candidate]`).forEach((button) => {
    const haystack = String(button.dataset.candidateText || '').toLowerCase();
    button.hidden = Boolean(keyword) && !haystack.includes(keyword);
  });
}

function bindAuthEvents(route) {
  document.querySelectorAll('[data-auth-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.querySelector(`#${button.getAttribute('aria-controls')}`);
      if (!input) return;
      const nextType = input.type === 'password' ? 'text' : 'password';
      input.type = nextType;
      button.textContent = nextType === 'password' ? '显示' : '隐藏';
      button.setAttribute('aria-pressed', nextType === 'text' ? 'true' : 'false');
    });
  });

  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      const email = String(formData.get('email') || '');
      const password = String(formData.get('password') || '');
      const validation = validateAuthInput(email, password);
      if (!validation.ok) {
        updateAuthStatus(validation.message);
        focusAuthField(form, validation.field);
        return;
      }

      const mode = form.dataset.authMode === 'register' ? 'register' : 'login';
      if (submitButton) submitButton.disabled = true;
      updateAuthStatus(mode === 'register' ? '正在注册...' : '正在登录...');
      try {
        await (mode === 'register' ? register : login)(email, password);
        updateAuthStatus('登录成功，正在同步本机数据...');
        navigate(`#${buildAuthRedirectTarget(form.dataset.authRedirect, route.category)}`);
      } catch (error) {
        updateAuthStatus(error?.message || '服务器异常，请稍后再试');
        if (error?.field) focusAuthField(form, error.field);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-auth-logout]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      await logout();
      render();
    });
  });
}

function bindHistorySwipeActions() {
  document.querySelectorAll('[data-history-swipe]').forEach((card) => {
    const surface = card.querySelector('.history-card__surface');
    if (!surface) return;

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let tracking = false;

    surface.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      tracking = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      deltaX = 0;
      surface.style.transition = 'none';
      card.classList.remove('is-swipe-open');
    }, { passive: true });

    surface.addEventListener('touchmove', (event) => {
      if (!tracking || event.touches.length !== 1) return;
      const nextDeltaX = event.touches[0].clientX - startX;
      const deltaY = event.touches[0].clientY - startY;
      if (Math.abs(deltaY) > Math.abs(nextDeltaX)) return;
      deltaX = nextDeltaX;
      const translateX = Math.max(-88, Math.min(0, deltaX));
      surface.style.transform = `translateX(${translateX}px)`;
    }, { passive: true });

    const finishSwipe = () => {
      if (!tracking) return;
      tracking = false;
      surface.style.transition = '';
      surface.style.transform = '';
      card.classList.toggle('is-swipe-open', deltaX < -64);
    };

    surface.addEventListener('touchend', finishSwipe, { passive: true });
    surface.addEventListener('touchcancel', finishSwipe, { passive: true });
  });
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
    clearScanImageButton.addEventListener('click', async () => {
      await clearPendingScanImage();
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
      if (pending.category !== route.category || !pending.pendingImageId) {
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
    });
  }

  if (route.view === 'scan') {
    void hydrateStoredScanPreview(route.category);
  }
}

function bindOcrConfirmEvents(route) {
  const form = document.querySelector('[data-ocr-confirm-form]');
  if (!form) {
    if (route.view === 'ocr-confirm') void hydrateOcrConfirmImage(route.category);
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = String(textarea?.value || '').trim();
    const productName = String(productInput?.value || '').trim();
    if (!text) {
      updateOcrConfirmStatus('请先输入配料表内容。');
      textarea?.focus();
      return;
    }
    saveScanDraft(text, route.category);
    const params = new URLSearchParams({ text });
    if (productName) params.set('productName', productName);
    setPendingScan({
      category: route.category,
      status: 'success',
      pendingText: text,
      pendingProductName: productName
    });
    navigate(`#${categoryPath(route.category, '/analyze')}?${params.toString()}`);
  });

  void hydrateOcrConfirmImage(route.category);
}

function getPendingScanForReport(route) {
  const pending = getPendingScan();
  const routeInput = String(route?.input || '').trim();
  const pendingText = String(pending.pendingText || '').trim();
  if (!pending.pendingImageId || pending.category !== route.category || !routeInput || routeInput !== pendingText) {
    return null;
  }
  return pending;
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
  const scanFile = createScanFileFromBlob(blob, fileName, result.mimeType);
  await handleScanFile(scanFile, resolveRoute(window.location.hash).category);
}

async function handleScanFile(file, category) {
  const validation = validateScanImageFile(file);
  if (!validation.ok) {
    await clearPendingScanImage();
    updateScanPreview(document.querySelector('[data-scan-preview]'), null, validation);
    updateScanMeta(validation.message);
    updateScanConfirmState(false);
    updateScanFeedback(validation.message);
    return;
  }

  updateScanFeedback('正在预处理图片...');
  updateScanPreview(document.querySelector('[data-scan-preview]'), file, validation);
  const previousPending = getPendingScan();
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
      pendingProductName: '',
      pendingSource: 'manual',
      pendingOcrMode: 'manual',
      pendingOcrConfidence: 1,
      pendingOcrProvider: 'manual',
      pendingOcrErrorCode: '',
      pendingOcrErrorMsg: ''
    });
    if (previousPending.pendingImageId && previousPending.pendingImageId !== imageId) {
      await deleteImage(previousPending.pendingImageId);
    }
    updateScanMeta(`图片大小：${formatBytes(processed.compressedSize)}${processed.originalSize !== processed.compressedSize ? `（原图 ${formatBytes(processed.originalSize)}）` : ''}`);
    updateScanConfirmState(true);
    updateScanFeedback(processed.fallback === 'canvas_unavailable'
      ? '图片已保存；当前环境无法压缩，仍可进入确认页。'
      : '图片已预处理并保存到本机 IndexedDB。');
  } catch {
    await clearPendingScanImage();
    updateScanConfirmState(false);
    updateScanFeedback('图片预处理失败，请更换更清晰的图片或手动输入。');
  }
}

async function clearPendingScanImage() {
  const pending = getPendingScan();
  clearPendingScan();
  if (pending.pendingImageId) {
    await deleteImage(pending.pendingImageId);
  }
}

async function hydrateStoredScanPreview(category) {
  const pending = getPendingScan();
  if (pending.category !== category || !pending.pendingImageId) return;
  const image = await getImage(pending.pendingImageId);
  if (!image?.blob) return;
  updateStoredScanPreview(document.querySelector('[data-scan-preview]'), '图片已保存，可继续识别或重选。');
  updateScanConfirmState(true);
}

async function hydrateOcrConfirmImage(category) {
  const pending = getPendingScan();
  const container = document.querySelector('[data-ocr-confirm-image]');
  if (!container || pending.category !== category || !pending.pendingImageId) return;
  const image = await getImage(pending.pendingImageId);
  if (!image?.blob) {
    container.textContent = '图片暂不可用';
    return;
  }
  updateStoredScanPreview(container, '图片已保存，请核对下方配料文本。');
}

function statusFromOcrResult(result) {
  if (result.mode === 'real' && result.rawText) return 'success';
  if (result.mode === 'real') return 'empty';
  if (result.mode === 'fallback') return 'error';
  return 'manual';
}

function updateAllergenSettingsFeedback(count, message) {
  const countNode = document.querySelector('[data-allergen-count]');
  if (countNode) countNode.textContent = `已选 ${count} 种过敏原`;
  updatePersonalProfileCount();
  const statusNode = document.querySelector('[data-allergen-status]');
  if (statusNode) statusNode.textContent = message;
}

function updatePersonalProfileCount() {
  const countNode = document.querySelector('[data-personal-profile-count]');
  if (!countNode) return;
  const category = resolveRoute(window.location.hash).category;
  const profile = getPersonalProfile(category);
  const count = profile.allergenIds.length + profile.watchIds.length + profile.avoidIds.length;
  countNode.textContent = `${count} 项个人设置`;
}

function updateAnalyzeStatus(message) {
  const statusNode = document.querySelector('[data-analyze-status]');
  if (statusNode) statusNode.textContent = message;
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

function updateAuthStatus(message) {
  const statusNode = document.querySelector('[data-auth-status]');
  if (statusNode) statusNode.textContent = message;
}

function focusAuthField(form, field) {
  const input = form?.querySelector(`[name="${field}"]`);
  if (input && typeof input.focus === 'function') input.focus();
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

function updateStoredScanPreview(preview, message) {
  if (!preview) return;
  revokeScanPreviewObjectUrl();
  preview.replaceChildren();
  const placeholder = document.createElement('span');
  placeholder.textContent = message || '图片已保存。';
  preview.append(placeholder);
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

function revokeProductImageObjectUrl() {
  if (!productImageObjectUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  URL.revokeObjectURL(productImageObjectUrl);
  productImageObjectUrl = '';
}

function updateScanImageActionState({ canRotate, canClear }) {
  const rotateButton = document.querySelector('[data-rotate-scan-image]');
  if (rotateButton) rotateButton.disabled = !canRotate;
  const clearButton = document.querySelector('[data-clear-scan-image]');
  if (clearButton) clearButton.disabled = !canClear;
}

function dataUrlToBlob(dataUrl, mimeType = 'image/jpeg') {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function createScanFileFromBlob(blob, fileName, mimeType = 'image/jpeg') {
  const type = blob.type || mimeType || 'image/jpeg';
  if (typeof File === 'function') {
    try {
      return new File([blob], fileName, { type });
    } catch {
      // Older WebViews can expose File without supporting the constructor.
    }
  }
  return Object.assign(blob, { name: fileName });
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

function setupConnectionStatus() {
  const banner = document.querySelector('[data-connection-banner]');
  if (!banner || !('onLine' in navigator)) return;

  const update = () => {
    const offline = navigator.onLine === false;
    banner.hidden = !offline;
    document.body.classList.toggle('is-offline', offline);
    document.documentElement.style.setProperty(
      '--connection-banner-height',
      offline ? `${banner.offsetHeight}px` : '0px'
    );
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(update).observe(banner);
  }
  update();
}

function setupPwaInstallPrompt() {
  recordPwaOpen();
  const promptNode = document.querySelector('[data-install-prompt]');
  const messageNode = document.querySelector('[data-install-prompt-message]');
  const actionButton = document.querySelector('[data-install-prompt-action]');
  const dismissButton = document.querySelector('[data-install-prompt-dismiss]');
  if (!promptNode || !messageNode || !actionButton || !dismissButton) return;

  const refreshPrompt = () => {
    if (!shouldShowPwaInstallPrompt()) {
      promptNode.hidden = true;
      return;
    }

    const ios = isIosSafari();
    messageNode.textContent = ios
      ? '点击浏览器分享按钮，然后选择“添加到主屏幕”。'
      : '添加到主屏幕，离线也能打开本机历史和收藏。';
    actionButton.textContent = ios ? '我知道了' : '添加';
    promptNode.hidden = false;
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    refreshPrompt();
  });

  window.addEventListener('appinstalled', () => {
    writeLocalFlag(PWA_INSTALLED_KEY, 'true');
    deferredInstallPrompt = null;
    promptNode.hidden = true;
  });

  actionButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      promptNode.hidden = true;
      if (!isIosSafari()) {
        writeLocalFlag(PWA_INSTALL_DISMISSED_KEY, 'true');
      }
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      writeLocalFlag(PWA_INSTALLED_KEY, 'true');
    }
    deferredInstallPrompt = null;
    promptNode.hidden = true;
  });

  dismissButton.addEventListener('click', () => {
    writeLocalFlag(PWA_INSTALL_DISMISSED_KEY, 'true');
    promptNode.hidden = true;
  });

  refreshPrompt();
}

function recordPwaOpen() {
  const current = Number(readLocalValue(PWA_OPEN_COUNT_KEY) || '0') || 0;
  writeLocalFlag(PWA_OPEN_COUNT_KEY, String(current + 1));
}

function shouldShowPwaInstallPrompt() {
  const openCount = Number(readLocalValue(PWA_OPEN_COUNT_KEY) || '0') || 0;
  return openCount >= 3
    && readLocalValue(PWA_INSTALL_DISMISSED_KEY) !== 'true'
    && readLocalValue(PWA_INSTALLED_KEY) !== 'true'
    && !isStandalonePwa()
    && (Boolean(deferredInstallPrompt) || isIosSafari());
}

function isStandalonePwa() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone === true;
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent || '';
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isWebKit = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
  return isIos && isWebKit;
}

function readLocalValue(key) {
  try {
    return window.localStorage?.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocalFlag(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Installation hints are optional; blocked storage should not affect app use.
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
