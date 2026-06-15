<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import Toast from '@/components/Toast.vue';
import { attentionDetailTerms, attentionGoals } from '@/constants/attention';
import { clearAttentionSettings, getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import type { AttentionSettings } from '@/types';

const settings = ref<AttentionSettings>(getAttentionSettings());
const customTerm = ref('');
const message = ref('');

onShow(() => {
  settings.value = getAttentionSettings();
});

function toggleGoal(key: string) {
  const goals = settings.value.goals.includes(key)
    ? settings.value.goals.filter((item) => item !== key)
    : [...settings.value.goals, key];
  persist({ ...settings.value, goals });
}

function toggleTerm(term: string) {
  const detailTerms = settings.value.detailTerms.includes(term)
    ? settings.value.detailTerms.filter((item) => item !== term)
    : [...settings.value.detailTerms, term];
  persist({ ...settings.value, detailTerms });
}

function addCustomTerm() {
  const value = customTerm.value.trim();
  if (!value) return;
  persist({ ...settings.value, customTerms: [...settings.value.customTerms, value] });
  customTerm.value = '';
}

function removeCustomTerm(term: string) {
  persist({ ...settings.value, customTerms: settings.value.customTerms.filter((item) => item !== term) });
}

function clearAll() {
  settings.value = clearAttentionSettings();
  message.value = '已清空本机关注项。';
}

function persist(next: AttentionSettings) {
  settings.value = saveAttentionSettings(next);
  message.value = '已保存到本机。';
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">我的关注项</text>
      <text class="page-subtitle">MVP 本地保存，不要求登录。关注项用于报告排序和购买前建议关注。</text>
    </view>
    <Toast :message="message" tone="success" />

    <AppCard>
      <view class="stack">
        <text class="section-title">关注目标</text>
        <view class="toggle-grid">
          <button v-for="goal in attentionGoals" :key="goal.key" class="toggle" :class="{ 'toggle--active': settings.goals.includes(goal.key) }" @tap="toggleGoal(goal.key)">
            <text>{{ goal.label }}</text>
          </button>
        </view>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">细分关注成分</text>
        <view class="toggle-grid">
          <button v-for="term in attentionDetailTerms" :key="term" class="toggle" :class="{ 'toggle--active': settings.detailTerms.includes(term) }" @tap="toggleTerm(term)">
            <text>{{ term }}</text>
          </button>
        </view>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">自定义忌口</text>
        <view class="row">
          <input v-model="customTerm" class="input custom-input" placeholder="输入自定义词" @confirm="addCustomTerm" />
          <AppButton variant="secondary" @click="addCustomTerm">添加</AppButton>
        </view>
        <view class="pill-list">
          <button v-for="term in settings.customTerms" :key="term" class="custom-pill" @tap="removeCustomTerm(term)">{{ term }} ×</button>
        </view>
      </view>
    </AppCard>

    <AppButton variant="danger" @click="clearAll">清空本机关注项</AppButton>
  </view>
</template>

<style scoped>
.toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.toggle,
.custom-pill {
  min-height: 44px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.toggle::after,
.custom-pill::after {
  border: 0;
}

.toggle--active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.custom-input {
  flex: 1;
}
</style>
