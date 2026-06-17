export const routes = {
  home: '/pages/index/index',
  capture: '/pages/capture/index',
  report: '/pages/report/index',
  compare: '/pages/compare/index',
  history: '/pages/history/index',
  attention: '/pages/attention/index',
  settings: '/pages/settings/index'
} as const;

export function navigateToRoute(path: string) {
  if (path === routes.home) {
    uni.reLaunch({ url: path });
    return;
  }
  uni.navigateTo({ url: path });
}
