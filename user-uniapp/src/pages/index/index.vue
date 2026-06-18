<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppCard from '@/components/AppCard.vue';
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
</script>

<template>
  <view class="page page--home">
    <view class="brand-row">
      <view class="brand-mark">
        <text class="brand-mark__dot">⌕</text>
      </view>
      <text class="brand-name">配料雷达</text>
    </view>

    <view class="hero">
      <text class="hero__title">拍照解读食品标签</text>
      <text class="hero__desc">拍摄配料表或营养成分表，自动识别并生成解读</text>
    </view>

    <view class="scan-stage">
      <view class="scan-ring scan-ring--outer">
        <view class="scan-ring scan-ring--middle">
          <view class="scan-button" hover-class="scan-button--active" @tap="openCapture">
            <view class="camera-icon">
              <view class="camera-icon__lens" />
            </view>
            <text class="scan-button__text">拍照识别</text>
          </view>
        </view>
      </view>
      <text class="scan-hint">请将镜头对准“配料表”或“营养成分表”</text>
    </view>

    <view class="home-stack">
      <AppCard clickable class="search-card">
        <view class="search-card__inner" @tap="openSearch">
          <view class="search-icon" />
          <view class="search-copy">
            <text class="search-title">搜索成分</text>
            <text class="search-desc">查询成分作用、用途与注意事项</text>
          </view>
          <text class="search-arrow">›</text>
        </view>
      </AppCard>

      <AppCard class="preference-card">
        <view class="preference-row">
          <text class="preference-icon">▣</text>
          <text class="preference-text">当前关注：{{ currentGoalLabel }}</text>
        </view>
        <view class="preference-row">
          <text class="preference-icon">♧</text>
          <text class="preference-text">过敏提醒：{{ allergenText }}</text>
        </view>
      </AppCard>
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

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: var(--space-sm);
}

.brand-mark {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(8, 122, 104, 0.24);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-strong);
}

.brand-mark__dot {
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
}

.brand-name {
  color: var(--primary-strong);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.3;
}

.hero {
  margin-top: 68rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hero__title {
  color: var(--text);
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1.18;
}

.hero__desc {
  color: var(--muted);
  font-size: var(--font-size-base);
  line-height: 1.7;
}

.scan-stage {
  margin-top: 54rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.scan-ring {
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-ring--outer {
  width: 304rpx;
  height: 304rpx;
  background: rgba(18, 151, 128, 0.1);
  animation: scan-breathe 2600ms ease-in-out infinite;
}

.scan-ring--middle {
  width: 258rpx;
  height: 258rpx;
  background: rgba(18, 151, 128, 0.14);
}

.scan-button {
  width: 212rpx;
  height: 212rpx;
  border-radius: 999px;
  background: linear-gradient(145deg, #12a979, #037f58);
  box-shadow: 0 18px 36px rgba(3, 127, 88, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

@keyframes scan-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}

.scan-button--active {
  transform: scale(0.96);
  box-shadow: 0 10px 22px rgba(3, 127, 88, 0.24);
}

.camera-icon {
  width: 72rpx;
  height: 54rpx;
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
  left: 20rpx;
  top: 10rpx;
  width: 20rpx;
  height: 20rpx;
  border: 6rpx solid #ffffff;
  border-radius: 999px;
}

.scan-button__text {
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.2;
}

.scan-hint {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.home-stack {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.search-card,
.preference-card {
  border-radius: 24rpx;
}

.search-card__inner {
  min-height: 132rpx;
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) 28rpx;
  align-items: center;
  gap: var(--space-md);
}

.search-icon {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid var(--primary);
  border-radius: 999px;
  position: relative;
}

.search-icon::after {
  content: "";
  position: absolute;
  right: -12rpx;
  bottom: -8rpx;
  width: 26rpx;
  height: 6rpx;
  border-radius: 999px;
  background: var(--primary);
  transform: rotate(45deg);
}

.search-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.2;
}

.search-desc,
.preference-text {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.search-arrow {
  color: var(--muted);
  font-size: 26px;
  line-height: 1;
}

.preference-card {
  background: linear-gradient(180deg, rgba(238, 250, 245, 0.88), #ffffff);
  border-color: rgba(18, 151, 128, 0.16);
}

.preference-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 32px;
}

.preference-icon {
  color: var(--primary-strong);
  font-size: var(--font-size-base);
  font-weight: 900;
  width: 22px;
}

@media screen and (max-height: 700px) {
  .brand-row {
    padding-top: 0;
  }

  .hero {
    margin-top: 36rpx;
  }

  .hero__title {
    font-size: 48rpx;
  }

  .scan-stage {
    margin-top: 36rpx;
    gap: var(--space-md);
  }

  .scan-ring--outer {
    width: 270rpx;
    height: 270rpx;
  }

  .scan-ring--middle {
    width: 230rpx;
    height: 230rpx;
  }

  .scan-button {
    width: 190rpx;
    height: 190rpx;
  }

  .home-stack {
    margin-top: 34rpx;
    gap: var(--space-md);
  }
}
</style>
