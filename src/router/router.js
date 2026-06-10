import { renderAnalyzePage } from '../pages/analyzePage.js';
import { defaultCategory, getProductCategory, isProductCategory, legacyCategory } from '../data/categories.js';
import { renderDetailPage } from '../pages/detailPage.js';
import { renderFavoritesPage } from '../pages/favoritesPage.js';
import { renderHomePage } from '../pages/homePage.js';
import { renderNotFoundPage } from '../pages/notFoundPage.js';
import { renderSearchPage } from '../pages/searchPage.js';
import { renderSettingsPage } from '../pages/settingsPage.js';

const APP_TITLE = 'CompCheck 成分小查';
const VIEW_TITLES = {
  analyze: '成分表分析',
  detail: '成分详情',
  favorites: '收藏夹',
  home: '',
  search: '搜索',
  settings: '过敏原档案',
  'not-found': '页面不存在'
};

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
    return {
      view: 'search',
      category: route.category,
      query: params.get('q') || ''
    };
  }

  if (route.path === '/analyze') {
    return {
      view: 'analyze',
      category: route.category,
      input: params.get('text') || ''
    };
  }

  if (route.path === '/favorites') {
    return {
      view: 'favorites',
      category: route.category
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

export function renderRoute(route) {
  if (route.view === 'detail') return renderDetailPage(route.id, route.category);
  if (route.view === 'search') return renderSearchPage(route.query, route.category);
  if (route.view === 'analyze') return renderAnalyzePage(route.input, route.category);
  if (route.view === 'favorites') return renderFavoritesPage(route.category);
  if (route.view === 'settings') return renderSettingsPage();
  if (route.view === 'not-found') return renderNotFoundPage(route.path, route.category);
  return renderHomePage(route.category);
}

export function getRouteTitle(route) {
  const categoryLabel = categoryLabelFor(route.category);
  if (route.view === 'home') return `${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'search' && route.query) return `${route.query} 搜索结果 - ${categoryLabel} - ${APP_TITLE}`;
  if (route.view === 'settings') return `${VIEW_TITLES.settings} - ${APP_TITLE}`;
  const title = VIEW_TITLES[route.view] || VIEW_TITLES['not-found'];
  return `${title} - ${categoryLabel} - ${APP_TITLE}`;
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

function categoryLabelFor(category) {
  return getProductCategory(category).label;
}
