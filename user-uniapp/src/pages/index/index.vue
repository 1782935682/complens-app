<script setup lang="ts">
import { routes, navigateToRoute } from '@/constants/routes';
import { resetScanDraft } from '@/stores/scanStore';

function openCapture() {
  resetScanDraft();
  uni.navigateTo({ url: `${routes.capture}?auto=camera` });
}

function openSearch() {
  navigateToRoute(routes.search);
}
</script>

<template>
  <view class="page page--home">
    <view class="scan-wrap">
      <view class="scan-button" hover-class="scan-button--active" @tap="openCapture">
        <view class="camera-icon">
          <view class="camera-icon__lens" />
        </view>
        <text class="scan-button__text">拍包装</text>
      </view>
      <view class="home-copy">
        <text class="scan-tagline">拍一下包装，直接看这包值不值得常吃</text>
        <text class="home-subtitle">配料、营养数字、添加剂和过敏/忌口，一次整理。</text>
      </view>
      <text class="search-link" @tap="openSearch">查单个成分</text>
    </view>
  </view>
</template>

<style scoped>
.page--home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(24rpx + env(safe-area-inset-top)) 32rpx calc(56rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #ffffff 0%, #f9fbf8 54%, #f2faf6 100%);
}

/* 让按钮真正居中：占满中间空间并居中对齐 */
.scan-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 28rpx;
  padding-top: 8vh;
}

.scan-button {
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-bright), var(--primary-strong));
  box-shadow: 0 28rpx 56rpx rgba(3, 127, 88, 0.32);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  position: relative;
  overflow: hidden;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.scan-button::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 46%);
  pointer-events: none;
}

.scan-button--active {
  transform: scale(0.97);
  box-shadow: 0 16rpx 32rpx rgba(3, 127, 88, 0.26);
}

.camera-icon {
  width: 116rpx;
  height: 88rpx;
  border: 9rpx solid #ffffff;
  border-radius: 26rpx;
  position: relative;
  z-index: 1;
}

.camera-icon::before {
  content: "";
  position: absolute;
  left: 26rpx;
  top: -23rpx;
  width: 46rpx;
  height: 23rpx;
  border-radius: 16rpx 16rpx 0 0;
  background: #ffffff;
}

.camera-icon__lens {
  position: absolute;
  left: 32rpx;
  top: 18rpx;
  width: 30rpx;
  height: 30rpx;
  border: 9rpx solid #ffffff;
  border-radius: 999px;
}

.scan-button__text {
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.1;
  z-index: 1;
}

.home-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  text-align: center;
}

.scan-tagline {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: 1.4;
}

.home-subtitle,
.search-link {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.search-link {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--primary-strong);
  font-weight: 900;
  padding: 14rpx 24rpx;
}

@media screen and (max-height: 640px) {
  .scan-button {
    width: 300rpx;
    height: 300rpx;
  }
}
</style>
