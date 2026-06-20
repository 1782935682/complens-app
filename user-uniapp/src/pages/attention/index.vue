<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppCard from '@/components/AppCard.vue';
import Toast from '@/components/Toast.vue';
import { allergenOptions, primaryGoalOptions } from '@/constants/attention';
import { getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import type { AttentionSettings } from '@/types';

const settings = ref<AttentionSettings>(getAttentionSettings());
const message = ref('');
const primaryGoalImpact = computed(() => {
  if (settings.value.primaryGoal === 'sugar') return '报告会优先提示糖、甜味剂和碳水数字。';
  if (settings.value.primaryGoal === 'fatLoss') return '报告会优先提示热量、脂肪和份量。';
  if (settings.value.primaryGoal === 'lowSodium') return '报告会优先提示钠、盐和重口味叠加。';
  return '报告会按热量、糖、钠、脂肪和添加剂综合排序。';
});
const childrenModeImpact = computed(() => (
  settings.value.isChildrenMode
    ? '报告会额外提示高糖、咖啡因、酒精、色素、甜味剂和高钠。'
    : '开启后会把儿童高频食用提醒放到更前面。'
));

onShow(() => {
  settings.value = getAttentionSettings();
});

function selectPrimaryGoal(primaryGoal: AttentionSettings['primaryGoal']) {
  persist({ ...settings.value, primaryGoal });
}

function toggleChildrenMode() {
  persist({ ...settings.value, isChildrenMode: !settings.value.isChildrenMode });
}

function toggleAllergen(key: string) {
  const allergens = settings.value.allergens.includes(key)
    ? settings.value.allergens.filter((item) => item !== key)
    : [...settings.value.allergens, key];
  persist({ ...settings.value, allergens });
}

function persist(next: AttentionSettings) {
  settings.value = saveAttentionSettings(next);
  message.value = '已保存到本机。';
}

</script>

<template>
  <view class="page page--mine stack">
    <Toast :message="message" tone="success" />

    <AppCard>
      <view class="mine-section">
        <view>
          <text class="mine-title">关注目标</text>
          <text class="muted">单选一个主要目标。</text>
        </view>
        <view class="option-grid">
          <view
            v-for="goal in primaryGoalOptions"
            :key="goal.key"
            class="option-card"
            :class="{ 'option--active': settings.primaryGoal === goal.key }"
            @tap="selectPrimaryGoal(goal.key)"
          >
            <text class="option__title">{{ goal.label }}</text>
            <text class="option__desc">{{ goal.description }}</text>
          </view>
        </view>
        <text class="impact-note">{{ primaryGoalImpact }}</text>
      </view>
    </AppCard>

    <AppCard>
      <view class="setting-row">
        <view class="setting-row__copy">
          <text class="mine-title">儿童模式</text>
          <text class="muted">{{ childrenModeImpact }}</text>
        </view>
        <switch :checked="settings.isChildrenMode" color="#129780" @change="toggleChildrenMode" />
      </view>
    </AppCard>

    <AppCard>
      <view class="mine-section">
        <view>
          <text class="mine-title">过敏 / 忌口</text>
          <text class="muted">可多选，命中后会优先提醒。</text>
        </view>
        <view class="allergen-grid">
          <view
            v-for="item in allergenOptions"
            :key="item.key"
            class="allergen-option"
            :class="{ 'option--active': settings.allergens.includes(item.key) }"
            @tap="toggleAllergen(item.key)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>
    </AppCard>
  </view>
</template>

<style scoped>
.page--mine {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  padding-bottom: calc(176rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
}

.page--mine :deep(.app-card) {
  border-color: rgba(23, 33, 29, 0.08);
  box-shadow: 0 10px 24px rgba(26, 44, 37, 0.045);
}

.mine-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.mine-title {
  display: block;
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.3;
  margin-bottom: var(--space-xs);
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.option-card,
.allergen-option {
  border: 1px solid rgba(18, 151, 128, 0.18);
  background: var(--surface);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: transform var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.option-card {
  min-height: 164rpx;
  border-radius: 24rpx;
  padding: var(--space-md);
  flex-direction: column;
  gap: var(--space-xs);
}

.option-card:active,
.allergen-option:active {
  transform: scale(0.985);
}

.option--active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-strong);
  box-shadow: 0 8px 18px rgba(8, 122, 104, 0.12);
}

.option__title {
  display: block;
  color: inherit;
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.25;
}

.option__desc {
  display: block;
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.impact-note {
  border-radius: 16rpx;
  background: var(--primary-soft);
  color: var(--primary-strong);
  display: block;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
  padding: 10rpx 12rpx;
}

.option--active .option__desc {
  color: var(--primary-strong);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  min-height: 160rpx;
}

.setting-row__copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.allergen-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-sm);
}

.allergen-option {
  min-width: 0;
  min-height: 76rpx;
  border-radius: 20rpx;
  padding: 0 8rpx;
  font-weight: 800;
  line-height: 1.3;
}

.allergen-option text {
  color: inherit;
  font-size: var(--font-size-sm);
  line-height: 1.25;
}

@media screen and (max-width: 340px) {
  .option-grid,
  .allergen-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .setting-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
