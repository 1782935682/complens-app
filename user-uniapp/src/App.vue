<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { primeRulesDictionary } from '@/utils/rulesLoader';

function syncH5RouteClass() {
  // #ifdef H5
  setTimeout(() => {
    const pages = getCurrentPages();
    const route = pages[pages.length - 1]?.route || '';
    document.body.dataset.uniRoute = route;
  }, 0);
  // #endif
}

onLaunch(() => {
  void primeRulesDictionary();
  syncH5RouteClass();
});

onShow(() => {
  syncH5RouteClass();
});
</script>

<style>
page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-family);
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* #ifdef H5 */
body[data-uni-route="pages/index/index"] uni-page-head {
  display: none !important;
}

body[data-uni-route="pages/index/index"] uni-page-wrapper {
  top: 0 !important;
}

body::after {
  content: none !important;
  animation: none !important;
  background-image: none !important;
}

.uni-page-head-shadow::after,
.uni-page-head-shadow-grey::after,
.uni-page-head-shadow-blue::after,
.uni-page-head-shadow-green::after,
.uni-page-head-shadow-orange::after,
.uni-page-head-shadow-red::after,
.uni-page-head-shadow-yellow::after {
  background-image: none !important;
}
/* #endif */
</style>
