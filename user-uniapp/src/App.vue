<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  // Keep launch work lightweight; pages hydrate their own local state.
});

onShow(() => {
  // Reserved for future cross-platform resume hooks.
});
</script>

<style>
page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-family);
}
</style>
