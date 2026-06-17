<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { primeRulesDictionary } from '@/utils/rulesLoader';

onLaunch(() => {
  void primeRulesDictionary();
});

onShow(() => {
  // Reserved for future cross-platform resume hooks.
});
</script>

<style>
page {
  min-height: 100dvh;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-family);
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
</style>
