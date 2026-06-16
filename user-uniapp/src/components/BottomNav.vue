<script setup lang="ts">
import { routes, navigateToRoute } from '@/constants/routes';
import AppButton from './AppButton.vue';

defineProps<{ active: 'home' | 'capture' | 'history' | 'attention' }>();

const items = [
  { key: 'home', label: '首页', route: routes.home },
  { key: 'capture', label: '拍照', route: routes.capture },
  { key: 'history', label: '历史', route: routes.history },
  { key: 'attention', label: '关注', route: routes.attention }
] as const;
</script>

<template>
  <view class="bottom-nav">
    <AppButton
      v-for="item in items"
      :key="item.key"
      variant="text"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': active === item.key }"
      @click="navigateToRoute(item.route)"
    >
      <text class="bottom-nav__dot" />
      <text>{{ item.label }}</text>
    </AppButton>
  </view>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
}

.bottom-nav__item {
  flex: 1;
  min-height: 44px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
  padding: 0;
}

.bottom-nav__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: transparent;
}

.bottom-nav__item--active {
  color: var(--primary);
}

.bottom-nav__item--active .bottom-nav__dot {
  background: var(--primary);
}
</style>
