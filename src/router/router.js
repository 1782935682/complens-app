import { renderAnalyzePage } from '../pages/analyzePage.js';
import { renderDetailPage } from '../pages/detailPage.js';
import { renderFavoritesPage } from '../pages/favoritesPage.js';
import { renderHomePage } from '../pages/homePage.js';
import { renderSearchPage } from '../pages/searchPage.js';

export function resolveRoute(hash) {
  const raw = hash || '#/';
  const [path, queryString = ''] = raw.replace(/^#/, '').split('?');
  const params = new URLSearchParams(queryString);

  if (path.startsWith('/ingredient/')) {
    return {
      view: 'detail',
      id: decodeURIComponent(path.replace('/ingredient/', ''))
    };
  }

  if (path === '/search') {
    return {
      view: 'search',
      query: params.get('q') || ''
    };
  }

  if (path === '/analyze') {
    return {
      view: 'analyze',
      input: params.get('text') || ''
    };
  }

  if (path === '/favorites') {
    return { view: 'favorites' };
  }

  return { view: 'home' };
}

export function renderRoute(route) {
  if (route.view === 'detail') return renderDetailPage(route.id);
  if (route.view === 'search') return renderSearchPage(route.query);
  if (route.view === 'analyze') return renderAnalyzePage(route.input);
  if (route.view === 'favorites') return renderFavoritesPage();
  return renderHomePage();
}
