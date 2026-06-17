<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import Toast from '@/components/Toast.vue';
import { allergenOptions, primaryGoalOptions } from '@/constants/attention';
import { clearAttentionSettings, getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import type { AttentionSettings } from '@/types';

const settings = ref<AttentionSettings>(getAttentionSettings());
const message = ref('');

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

function clearAll() {
  settings.value = clearAttentionSettings();
  message.value = '已恢复默认关注设置。';
}

function persist(next: AttentionSettings) {
  settings.value = saveAttentionSettings(next);
  message.value = '已保存到本机。';
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader
      title="我的关注"
      subtitle="只选一个主目标，再按需开启儿童模式和过敏/忌口。结果页会按这些设置调整提醒重点。"
    />
    <Toast :message="message" tone="success" />

    <AppCard>
      <view class="stack">
        <view>
          <text class="section-title">主目标</text>
          <text class="muted">单选可以避免结论互相冲突。</text>
        </view>
        <view class="option-grid">
          <AppButton
            v-for="goal in primaryGoalOptions"
            :key="goal.key"
            variant="secondary"
            class="option"
            :class="{ 'option--active': settings.primaryGoal === goal.key }"
            @click="selectPrimaryGoal(goal.key)"
          >
            <text v-if="settings.primaryGoal === goal.key" class="option__check">✓</text>
            <view class="option__copy">
              <text class="option__title">{{ goal.label }}</text>
              <text class="option__desc">{{ goal.description }}</text>
            </view>
          </AppButton>
        </view>
      </view>
    </AppCard>

    <AppCard>
      <view class="setting-row">
        <view class="setting-row__copy">
          <text class="section-title">儿童模式</text>
          <text class="muted">开启后会更重点提醒高糖、咖啡因、酒精、人工色素、甜味剂和高钠。</text>
        </view>
        <switch :checked="settings.isChildrenMode" color="#129780" @change="toggleChildrenMode" />
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <view>
          <text class="section-title">过敏 / 忌口</text>
          <text class="muted">可以多选。命中后会在结果顶部优先提醒。</text>
        </view>
        <view class="allergen-grid">
          <AppButton
            v-for="item in allergenOptions"
            :key="item.key"
            variant="secondary"
            class="allergen"
            :class="{ 'option--active': settings.allergens.includes(item.key) }"
            @click="toggleAllergen(item.key)"
          >
            <text v-if="settings.allergens.includes(item.key)" class="option__check">✓</text>
            <text>{{ item.label }}</text>
          </AppButton>
        </view>
      </view>
    </AppCard>

    <AppButton variant="danger" @click="clearAll">恢复默认关注</AppButton>
  </view>
</template>

<style scoped>
.option-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
}

.option,
.allergen {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-sm);
  color: var(--text);
  line-height: 1.3;
}

.option--active {
  border-color: var(--primary);
  background: linear-gradient(180deg, var(--primary-soft), #ffffff);
  color: var(--primary-strong);
}

.option__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.option__title,
.option__check {
  font-weight: 900;
}

.option__desc {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  text-align: left;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.setting-row__copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.allergen-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.allergen {
  justify-content: center;
  font-weight: 800;
}
</style>
