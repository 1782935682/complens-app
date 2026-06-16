export const routes = {
  home: '/pages/index/index',
  capture: '/pages/capture/index',
  ocr: '/pages/ocr/index',
  labelType: '/pages/label-type/index',
  confirmText: '/pages/confirm-text/index',
  ingredients: '/pages/ingredients/index',
  nutrition: '/pages/nutrition/index',
  match: '/pages/match/index',
  report: '/pages/report/index',
  compare: '/pages/compare/index',
  history: '/pages/history/index',
  attention: '/pages/attention/index',
  search: '/pages/search/index',
  dataSources: '/pages/data-sources/index',
  settings: '/pages/settings/index',
  privacy: '/pages/privacy/index'
} as const;

export function navigateToRoute(path: string) {
  const tabRoutes = new Set<string>([routes.home, routes.capture, routes.history, routes.attention]);
  if (tabRoutes.has(path)) {
    uni.switchTab({ url: path });
    return;
  }
  uni.navigateTo({ url: path });
}
