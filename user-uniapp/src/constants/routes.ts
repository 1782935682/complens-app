export const routes = {
  home: '/pages/index/index',
  capture: '/pages/capture/index',
  report: '/pages/report/index',
  compare: '/pages/compare/index',
  attention: '/pages/attention/index'
} as const;

export function navigateToRoute(path: string) {
  if (path === routes.home) {
    uni.reLaunch({ url: path });
    return;
  }
  uni.navigateTo({ url: path });
}
