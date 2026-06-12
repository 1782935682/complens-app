import { renderAnalyzePage } from '../pages/analyzePage.js';
import { categoryPath, defaultCategory, getProductCategory, isProductCategory, legacyCategory } from '../data/categories.js';
import { renderComparePage } from '../pages/comparePage.js';
import { renderDataPage } from '../pages/dataPage.js';
import { renderDetailPage } from '../pages/detailPage.js';
import { renderFavoritesPage } from '../pages/favoritesPage.js';
import { normalizeHistoryFilter, renderHistoryPage } from '../pages/historyPage.js';
import { renderHomePage } from '../pages/homePage.js';
import { getLegalPageDocumentTitle, renderLegalPage } from '../pages/legalPage.js';
import { getLegalDocument } from '../data/legalContent.js';
import { renderMembershipPage } from '../pages/membershipPage.js';
import { renderNotFoundPage } from '../pages/notFoundPage.js';
import { renderOnboardingPage } from '../pages/onboardingPage.js';
import { renderOcrConfirmPage } from '../pages/ocrConfirmPage.js';
import { renderProductArchiveListPage, renderProductArchivePage } from '../pages/productArchivePage.js';
import { renderReportDetailPage } from '../pages/reportDetailPage.js';
import { renderReportsPage } from '../pages/reportsPage.js';
import { renderScanPage } from '../pages/scanPage.js';
import { renderSearchPage } from '../pages/searchPage.js';
import { renderSettingsPage } from '../pages/settingsPage.js';
import { renderSupportPage } from '../pages/supportPage.js';
import { getIngredientById } from '../services/ingredientService.js';
import { getProductArchiveById } from '../services/productArchiveService.js';
import { buildSupportPrefillFromParams } from '../services/supportService.js';

const APP_TITLE = 'CompCheck 成分小查';
const VIEW_TITLES = {
  analyze: '成分表分析',
  compare: '成分对比',
  data: '数据来源',
  detail: '成分详情',
  favorites: '收藏夹',
  history: '分析历史',
  home: '',
  legal: '隐私与条款',
  membership: '会员中心',
  'ocr-confirm': '确认配料表',
  onboarding: '首次设置',
  'product-detail': '产品档案',
  products: '产品档案',
  reports: '分析报告',
  'report-detail': '报告详情',
  scan: '扫描识别',
  search: '搜索',
  settings: '过敏原档案',
  support: '支持中心',
  'not-found': '页面不存在'
};

const NAV_ITEMS = [
  { key: 'search', view: 'search', path: '/search' },
  { key: 'compare', view: 'compare', path: '/compare' },
  { key: 'scan', view: 'scan', path: '/scan' },
  { key: 'analyze', view: 'analyze', path: '/analyze' },
  { key: 'data', view: 'data', path: '/data' },
  { key: 'reports', view: 'reports', path: '/reports' },
  { key: 'history', view: 'history', path: '/history' },
  { key: 'favorites', view: 'favorites', path: '/favorites' },
  { key: 'membership', view: 'membership', path: '/membership' },
  { key: 'settings', view: 'settings', path: '/settings' }
];

const MOBILE_NAV_ITEMS = [
  { key: 'home', view: 'home', path: '/' },
  { key: 'scan', view: 'scan', path: '/scan' },
  { key: 'search', view: 'search', path: '/search' },
  { key: 'history', view: 'history', path: '/history' },
  { key: 'settings', view: 'settings', path: '/settings' }
];

export function resolveRoute(hash) {
  const raw = hash || '#/';
  const [path = '/', queryString = ''] = raw.replace(/^#/, '').split('?');
  const params = new URLSearchParams(queryString);
  const route = resolveCategoryPath(path);

  if (route.path.startsWith('/ingredient/')) {
    const id = decodePathValue(route.path.replace('/ingredient/', ''));
    if (!id) return notFoundRoute(route, path);
    return {
      view: 'detail',
      category: route.category,
      id
    };
  }

  if (route.path === '/') {
    return {
      view: 'home',
      category: route.category
    };
  }

  if (route.path === '/search') {
    const sort = params.get('sort') || '';
    return {
      view: 'search',
      category: route.category,
      query: params.get('q') || '',
      page: parsePageParam(params.get('page')),
      filters: {
        risk: params.get('risk') || '',
        ingredientCategory: params.get('ingredientCategory') || ''
      },
      ...(sort ? { sort } : {})
    };
  }

  if (route.path === '/compare') {
    return {
      view: 'compare',
      category: route.category
    };
  }

  if (route.path === '/analyze') {
    return {
      view: 'analyze',
      category: route.category,
      input: params.get('text') || '',
      productName: params.get('productName') || ''
    };
  }

  if (route.path === '/scan') {
    return {
      view: 'scan',
      category: route.category,
      input: params.get('text') || ''
    };
  }

  if (route.path === '/ocr-confirm') {
    return {
      view: 'ocr-confirm',
      category: route.category
    };
  }

  if (route.path === '/data') {
    return {
      view: 'data',
      category: route.category
    };
  }

  if (route.path === '/onboarding') {
    return {
      view: 'onboarding',
      category: route.category
    };
  }

  if (route.path === '/membership') {
    return {
      view: 'membership',
      category: route.category
    };
  }

  if (route.path === '/support') {
    return {
      view: 'support',
      category: route.category,
      prefill: buildSupportPrefillFromParams(params)
    };
  }

  if (route.path === '/legal') {
    return {
      view: 'legal',
      category: route.category,
      documentId: ''
    };
  }

  if (route.path.startsWith('/legal/')) {
    const documentId = decodePathValue(route.path.replace('/legal/', ''));
    if (!documentId || !getLegalDocument(documentId)) return notFoundRoute(route, path);
    return {
      view: 'legal',
      category: route.category,
      documentId
    };
  }

  if (route.path === '/reports') {
    return {
      view: 'reports',
      category: route.category,
      query: params.get('q') || ''
    };
  }

  if (route.path.startsWith('/reports/')) {
    const id = decodePathValue(route.path.replace('/reports/', ''));
    if (!id) return notFoundRoute(route, path);
    return {
      view: 'report-detail',
      category: route.category,
      id
    };
  }

  if (route.path.startsWith('/report/')) {
    const id = decodePathValue(route.path.replace('/report/', ''));
    if (!id) return notFoundRoute(route, path);
    return {
      view: 'report-detail',
      category: route.hasCategoryPrefix ? route.category : defaultCategory,
      id
    };
  }

  if (route.path === '/products') {
    return {
      view: 'products',
      category: route.category,
      query: params.get('q') || '',
      page: parsePageParam(params.get('page'))
    };
  }

  if (route.path === '/history') {
    return {
      view: 'history',
      category: route.hasCategoryPrefix ? route.category : defaultCategory,
      query: params.get('q') || '',
      filter: normalizeHistoryFilter(params.get('filter') || 'all')
    };
  }

  if (route.path.startsWith('/product/')) {
    const id = decodePathValue(route.path.replace('/product/', ''));
    if (!id) return notFoundRoute(route, path);
    return {
      view: 'product-detail',
      category: route.hasCategoryPrefix ? route.category : defaultCategory,
      id
    };
  }

  if (route.path === '/favorites') {
    return {
      view: 'favorites',
      category: route.category,
      tab: params.get('tab') === 'products' ? 'products' : 'ingredients'
    };
  }

  if (route.path === '/settings') {
    return {
      view: 'settings',
      category: route.hasCategoryPrefix ? route.category : defaultCategory
    };
  }

  return notFoundRoute(route, path);
}

export function renderRoute(route, asyncState = null) {
  if (route.view === 'detail') return renderDetailPage(route.id, route.category, asyncState);
  if (route.view === 'search') return renderSearchPage(route.query, route.category, route.filters, route.page, route.sort, asyncState);
  if (route.view === 'compare') return renderComparePage(route.category);
  if (route.view === 'scan') return renderScanPage(route.input, route.category);
  if (route.view === 'ocr-confirm') return renderOcrConfirmPage(route.category);
  if (route.view === 'data') return renderDataPage(route.category);
  if (route.view === 'onboarding') return renderOnboardingPage(route.category);
  if (route.view === 'legal') return renderLegalPage(route.category, route.documentId);
  if (route.view === 'membership') return renderMembershipPage(route.category);
  if (route.view === 'support') return renderSupportPage(route.category, route.prefill);
  if (route.view === 'analyze') return renderAnalyzePage(route.input, route.category, route.productName);
  if (route.view === 'products') return renderProductArchiveListPage(route.category, route.query, route.page);
  if (route.view === 'product-detail') return renderProductArchivePage(route.id, route.category);
  if (route.view === 'history') return renderHistoryPage(route.category, route.query, route.filter);
  if (route.view === 'reports') return renderReportsPage(route.category, route.query);
  if (route.view === 'report-detail') return renderReportDetailPage(route.id, route.category);
  if (route.view === 'favorites') return renderFavoritesPage(route.category, route.tab);
  if (route.view === 'settings') return renderSettingsPage(route.category);
  if (route.view === 'not-found') return renderNotFoundPage(route.path, route.category);
  return renderHomePage(route.category);
}

export function getRouteTitle(route) {
  const categoryLabel = categoryLabelFor(route.category);
  if (route.view === 'home') return `${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'detail') return `${detailTitleFor(route)} - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'report-detail') return `${reportTitleFor(route)} - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'product-detail') return `${productTitleFor(route)} - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'search' && route.query) return `${route.query} 搜索结果 - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'search' && hasActiveSearchFilters(route.filters)) return `筛选结果 - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'reports' && route.query) return `${route.query} 报告检索 - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'settings') return `${VIEW_TITLES.settings} - ${APP_TITLE}`;
  if (route.view === 'legal' && route.documentId) return `${getLegalPageDocumentTitle(route.documentId)} - ${VIEW_TITLES.legal} - ${APP_TITLE}`;
  const title = VIEW_TITLES[route.view] || VIEW_TITLES['not-found'];
  return `${title} - ${categoryLabel} - ${APP_TITLE}`;
}

export function getNavigationLinks(route) {
  const category = route?.category || defaultCategory;
  return NAV_ITEMS.map((item) => ({
    key: item.key,
    href: `#${categoryPath(category, item.path)}`,
    active: route?.view === item.view
      || (item.key === 'reports' && route?.view === 'report-detail')
      || (item.key === 'history' && ['products', 'product-detail'].includes(route?.view))
      || (item.key === 'settings' && ['legal', 'onboarding', 'support'].includes(route?.view))
  }));
}

export function getMobileNavigationLinks(route) {
  const category = route?.category || defaultCategory;
  return MOBILE_NAV_ITEMS.map((item) => ({
    key: item.key,
    href: `#${categoryPath(category, item.path)}`,
    active: route?.view === item.view
      || (item.key === 'history' && ['products', 'product-detail'].includes(route?.view))
      || (item.key === 'settings' && ['legal', 'membership', 'onboarding', 'support'].includes(route?.view))
  }));
}

function resolveCategoryPath(path) {
  const normalizedPath = path || '/';
  const segments = normalizedPath.split('/').filter(Boolean);
  const first = segments[0];
  if (isProductCategory(first)) {
    const rest = `/${segments.slice(1).join('/')}`;
    return {
      category: first,
      path: rest === '/' ? '/' : rest,
      hasCategoryPrefix: true
    };
  }
  return {
    category: normalizedPath === '/' ? defaultCategory : legacyCategory,
    path: normalizedPath,
    hasCategoryPrefix: false
  };
}

function notFoundRoute(route, path) {
  return {
    view: 'not-found',
    category: route.hasCategoryPrefix ? route.category : defaultCategory,
    path: path || '/'
  };
}

function decodePathValue(value) {
  try {
    return decodeURIComponent(value || '').trim();
  } catch {
    return '';
  }
}

function parsePageParam(value) {
  const page = Number.parseInt(value || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function categoryLabelFor(category) {
  return getProductCategory(category).label;
}

function detailTitleFor(route) {
  return getIngredientById(route.id, route.category)?.nameCn || VIEW_TITLES.detail;
}

function reportTitleFor(route) {
  return route.id ? VIEW_TITLES['report-detail'] : VIEW_TITLES.reports;
}

function productTitleFor(route) {
  return getProductArchiveById(route.id)?.productName || VIEW_TITLES['product-detail'];
}

function hasActiveSearchFilters(filters = {}) {
  return Boolean(filters.risk || filters.ingredientCategory);
}
