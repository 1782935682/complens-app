import { renderAnalyzePage } from '../pages/analyzePage.js';
import { defaultCategory, isProductCategory, legacyCategory } from '../data/categories.js';
import { renderDetailPage } from '../pages/detailPage.js';
import { renderFavoritesPage } from '../pages/favoritesPage.js';
import { renderHomePage } from '../pages/homePage.js';
import { renderSearchPage } from '../pages/searchPage.js';
import { renderSettingsPage } from '../pages/settingsPage.js';

export function resolveRoute(hash) {
  const raw = hash || '#/';
  const [path, queryString = ''] = raw.replace(/^#/, '').split('?');
  const params = new URLSearchParams(queryString);
  const route = resolveCategoryPath(path);

  if (route.path.startsWith('/ingredient/')) {
    return {
      view: 'detail',
      category: route.category,
      id: decodeURIComponent(route.path.replace('/ingredient/', ''))
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

  return {
    view: 'home',
    category: route.category
  };
}

export function renderRoute(route) {
  if (route.view === 'detail') return renderDetailPage(route.id, route.category);
  if (route.view === 'search') return renderSearchPage(route.query, route.category);
  if (route.view === 'analyze') return renderAnalyzePage(route.input, route.category);
  if (route.view === 'favorites') return renderFavoritesPage(route.category);
  if (route.view === 'settings') return renderSettingsPage();
  return renderHomePage(route.category);
}

function resolveCategoryPath(path) {
  const segments = path.split('/').filter(Boolean);
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
    category: path === '/' ? defaultCategory : legacyCategory,
    path,
    hasCategoryPrefix: false
  };
}
