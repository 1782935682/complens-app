export const routes = {
  home: '/pages/index/index',
  capture: '/pages/capture/index',
  search: '/pages/search/index',
  report: '/pages/report/index',
  history: '/pages/history/index',
  attention: '/pages/attention/index'
} as const;

const tabRoutes = new Set<string>([
  routes.home,
  routes.attention
]);

export function navigateToRoute(path: string) {
  if (tabRoutes.has(path)) {
    uni.switchTab({ url: path });
    return;
  }
  uni.navigateTo({ url: path });
}
