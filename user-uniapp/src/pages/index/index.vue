<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { allergenOptions, primaryGoalOptions } from '@/constants/attention';
import { routes, navigateToRoute } from '@/constants/routes';
import { getAttentionSettings } from '@/stores/attentionStore';
import { resetScanDraft, setFastScanMode } from '@/stores/scanStore';
import type { AttentionSettings } from '@/types';

const attentionSettings = ref<AttentionSettings>(getAttentionSettings());

const currentGoalLabel = computed(() => primaryGoalOptions.find((goal) => goal.key === attentionSettings.value.primaryGoal)?.label || '日常');
const allergenLabels = computed(() => allergenOptions
  .filter((item) => attentionSettings.value.allergens.includes(item.key))
  .map((item) => item.label));
const allergenText = computed(() => allergenLabels.value.length ? allergenLabels.value.join('、') : '未设置');

onShow(() => {
  attentionSettings.value = getAttentionSettings();
});

function openCapture() {
  resetScanDraft();
  setFastScanMode(true);
  navigateToRoute(routes.capture);
}

function openSearch() {
  navigateToRoute(routes.search);
}

function openAttention() {
  navigateToRoute(routes.attention);
}
</script>

<template>
  <view class="page page--home">
    <view class="hero">
      <text class="hero__title">拍标签，看成分</text>
      <text class="hero__desc">配料表 / 营养成分表都可以</text>
    </view>

    <view class="scan-stage" @tap="openCapture">
      <view class="scan-button" hover-class="scan-button--active">
        <view class="camera-icon">
          <view class="camera-icon__lens" />
        </view>
        <view class="scan-button__copy">
          <text class="scan-button__text">拍标签</text>
          <text class="scan-button__hint">自动生成结果</text>
        </view>
      </view>
      <text class="scan-hint">尽量只拍标签文字区域</text>
    </view>

    <view class="home-secondary">
      <view class="home-secondary__item" @tap="openAttention">
        <text class="home-secondary__label">关注</text>
        <text class="home-secondary__value">{{ currentGoalLabel }} · {{ allergenText }}</text>
      </view>
      <view class="home-secondary__divider" />
      <view class="home-secondary__item home-secondary__item--right" @tap="openSearch">
        <text class="home-secondary__label">查询</text>
        <text class="home-secondary__value">成分来源</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page--home {
  min-height: 100vh;
  padding-bottom: calc(176rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #ffffff 0%, #f9fbf8 52%, #f2faf6 100%);
}

.hero {
  margin-top: 96rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hero__title {
  color: var(--text);
  font-size: 60rpx;
  font-weight: 900;
  line-height: 1.18;
}

.hero__desc {
  color: var(--muted);
  font-size: var(--font-size-base);
  line-height: 1.7;
}

.scan-stage {
  margin-top: 72rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.scan-button {
  width: min(100%, 640rpx);
  min-height: 176rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  box-shadow: 0 18px 36px rgba(3, 127, 88, 0.28);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-lg);
  padding: 0 44rpx;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.scan-button--active {
  transform: scale(0.985);
  box-shadow: 0 10px 22px rgba(3, 127, 88, 0.24);
}

.camera-icon {
  width: 80rpx;
  height: 60rpx;
  flex: 0 0 auto;
  border: 6rpx solid #ffffff;
  border-radius: 18rpx;
  position: relative;
}

.camera-icon::before {
  content: "";
  position: absolute;
  left: 17rpx;
  top: -16rpx;
  width: 32rpx;
  height: 16rpx;
  border-radius: 12rpx 12rpx 0 0;
  background: #ffffff;
}

.camera-icon__lens {
  position: absolute;
  left: 22rpx;
  top: 12rpx;
  width: 20rpx;
  height: 20rpx;
  border: 6rpx solid #ffffff;
  border-radius: 999px;
}

.scan-button__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-button__text {
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.2;
}

.scan-button__hint {
  color: rgba(255, 255, 255, 0.82);
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1.4;
}

.scan-hint {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.home-secondary {
  margin-top: 64rpx;
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-soft);
  min-height: 104rpx;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
}

.home-secondary__item {
  min-width: 0;
  min-height: 104rpx;
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.home-secondary__item--right {
  align-items: flex-end;
}

.home-secondary__divider {
  width: 1px;
  height: 48rpx;
  background: var(--line);
}

.home-secondary__label {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
}

.home-secondary__value {
  color: var(--primary-strong);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media screen and (max-height: 700px) {
  .hero {
    margin-top: 44rpx;
  }

  .hero__title {
    font-size: 48rpx;
  }

  .scan-stage {
    margin-top: 42rpx;
    gap: var(--space-md);
  }

  .scan-button {
    min-height: 154rpx;
  }

  .home-secondary {
    margin-top: 38rpx;
  }
}
</style>
