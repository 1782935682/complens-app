<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  // Keep launch work lightweight; pages hydrate their own local state.
});

onShow(() => {
  // Reserved for future cross-platform resume hooks.
});
</script>

<template>
  <view class="app-shell">
    <slot />
  </view>
</template>

<style>
page {
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-family);
}

.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
}
</style>
