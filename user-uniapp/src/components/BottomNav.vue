<script setup lang="ts">
import { routes, navigateToRoute } from '@/constants/routes';

defineProps<{ active: 'home' | 'attention' }>();

const items = [
  { key: 'home', label: '首页', route: routes.home, icon: 'home' },
  { key: 'attention', label: '我的', route: routes.attention, icon: 'user' }
] as const;
</script>

<template>
  <view class="bottom-nav">
    <view class="bottom-nav__inner">
      <view
        v-for="item in items"
        :key="item.key"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': active === item.key }"
        @tap="navigateToRoute(item.route)"
      >
        <view class="bottom-nav__icon" :class="`bottom-nav__icon--${item.icon}`" />
        <text class="bottom-nav__label">{{ item.label }}</text>
      </view>
    </view>
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
  justify-content: center;
  padding: 10rpx 24rpx calc(10rpx + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
}

.bottom-nav__inner {
  width: 100%;
  max-width: 480px;
  display: flex;
}

.bottom-nav__item {
  flex: 1;
  min-height: 92rpx;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  line-height: 1;
  padding: 0;
}

.bottom-nav__icon {
  width: 44rpx;
  height: 44rpx;
  color: currentColor;
  position: relative;
}

.bottom-nav__icon--home::before {
  content: "";
  position: absolute;
  left: 9rpx;
  top: 17rpx;
  width: 26rpx;
  height: 22rpx;
  border: 4rpx solid currentColor;
  border-top: 0;
  border-radius: 4rpx;
}

.bottom-nav__icon--home::after {
  content: "";
  position: absolute;
  left: 12rpx;
  top: 7rpx;
  width: 20rpx;
  height: 20rpx;
  border-left: 4rpx solid currentColor;
  border-top: 4rpx solid currentColor;
  transform: rotate(45deg);
  border-radius: 3rpx;
}

.bottom-nav__icon--user::before {
  content: "";
  position: absolute;
  left: 13rpx;
  top: 5rpx;
  width: 18rpx;
  height: 18rpx;
  border: 4rpx solid currentColor;
  border-radius: 999px;
}

.bottom-nav__icon--user::after {
  content: "";
  position: absolute;
  left: 8rpx;
  bottom: 4rpx;
  width: 28rpx;
  height: 18rpx;
  border: 4rpx solid currentColor;
  border-bottom: 0;
  border-radius: 20rpx 20rpx 0 0;
}

.bottom-nav__label {
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.bottom-nav__item--active {
  color: var(--primary);
}
</style>
