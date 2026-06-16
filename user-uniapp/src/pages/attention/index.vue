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
          <AppButton
            v-for="goal in attentionGoals"
            :key="goal.key"
            variant="secondary"
            class="toggle"
            :class="{ 'toggle--active': settings.goals.includes(goal.key) }"
            @click="toggleGoal(goal.key)"
          >
            <text v-if="settings.goals.includes(goal.key)" class="toggle__check">✓</text>
            <text>{{ goal.label }}</text>
          </AppButton>
        </view>
      </view>
    </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">细分关注成分</text>
          <view class="toggle-grid">
            <AppButton
              v-for="term in attentionDetailTerms"
              :key="term"
              variant="secondary"
              class="toggle"
              :class="{ 'toggle--active': settings.detailTerms.includes(term) }"
              @click="toggleTerm(term)"
            >
              <text v-if="settings.detailTerms.includes(term)" class="toggle__check">✓</text>
              <text>{{ term }}</text>
            </AppButton>
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
          <AppButton
            v-for="term in settings.customTerms"
            :key="term"
            variant="secondary"
            class="custom-pill"
            @click="removeCustomTerm(term)"
          >
            {{ term }} ×
          </AppButton>
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
  width: 100%;
  display: flex;
  min-height: 44px;
  font-size: var(--font-size-sm);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text);
  line-height: 1.2;
  transition: all var(--transition-fast);
}

.toggle--active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.toggle__check {
  font-weight: 900;
  color: var(--primary-strong);
  line-height: 1;
}

.custom-input {
  flex: 1;
}
</style>
