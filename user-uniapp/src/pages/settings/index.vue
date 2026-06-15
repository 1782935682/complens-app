<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import Toast from '@/components/Toast.vue';
import { clearApiBaseUrl, getApiBaseUrl, setApiBaseUrl } from '@/services/api/client';

const inputUrl = ref('');
const effectiveUrl = ref('');
const message = ref('');
const messageTone = ref<'info' | 'success' | 'error'>('info');

const requiresAbsoluteUrl = (() => {
  let required = true;
  // #ifdef H5
  required = false;
  // #endif
  return required;
})();

const urlHint = computed(() => (
  requiresAbsoluteUrl
    ? '小程序/APP 需要填写可直接访问的 http 或 https 后端基址（例如 https://api.example.com）。'
    : 'H5 默认通过构建代理访问 /api。'
));

onShow(loadState);

function loadState() {
  const current = getApiBaseUrl();
  inputUrl.value = current;
  effectiveUrl.value = current;
  message.value = '';
}

function normalize(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+/i.test(value);
}

function setFromInput() {
  const value = normalize(inputUrl.value);
  if (!value) {
    clearApiBaseUrl();
    message.value = '已清空自定义配置，恢复默认地址。';
    messageTone.value = 'success';
    loadState();
    return;
  }
  if (requiresAbsoluteUrl && !isValidHttpUrl(value)) {
    message.value = '请填写完整的 http / https 地址（如 https://api.example.com），否则小程序会报错。';
    messageTone.value = 'error';
    return;
  }
  setApiBaseUrl(value);
  message.value = '已保存并生效。';
  messageTone.value = 'success';
  loadState();
}

function resetToDefault() {
  clearApiBaseUrl();
  message.value = '已重置为默认地址。';
  messageTone.value = 'info';
  loadState();
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">系统设置</text>
      <text class="page-subtitle">当前用于 API 请求的后端地址。用于微信小程序、真机运行等非 H5 环境。</text>
    </view>

    <Toast :message="message" :tone="messageTone" />

    <AppCard>
      <view class="stack">
        <text class="section-title">后端接口基址</text>
        <text class="muted">{{ urlHint }}</text>
        <input v-model="inputUrl" class="input" placeholder="示例：https://api.example.com" />
        <AppButton variant="primary" @click="setFromInput">保存并应用</AppButton>
        <AppButton variant="secondary" @click="resetToDefault">恢复默认（清除自定义）</AppButton>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">当前生效</text>
        <text class="notice">{{ effectiveUrl }}</text>
      </view>
    </AppCard>
  </view>
</template>

<style scoped>
.notice {
  border: 1px dashed var(--line);
  border-radius: var(--radius-btn);
  background: var(--surface-subtle);
  padding: var(--space-md);
  color: var(--text);
  font-size: var(--font-size-sm);
  word-break: break-all;
}
</style>
