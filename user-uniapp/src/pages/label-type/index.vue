<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import LoadingState from '@/components/LoadingState.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import Toast from '@/components/Toast.vue';
import { labelTypeActions, labelTypeLabels } from '@/constants/labelTypes';
import { routes, navigateToRoute } from '@/constants/routes';
import { classifyLabelWithAdapter } from '@/services/api/labels';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { LabelClassification, LabelType } from '@/types';

const loading = ref(false);
const classification = ref<LabelClassification | undefined>();
const selectedType = ref<LabelType>('unknown_label');
const steps = ['拍照', '识别', '确认', '报告'];

onMounted(async () => {
  loading.value = true;
  const draft = getScanDraft();
  classification.value = draft.classification || await classifyLabelWithAdapter(draft.ocr?.text || draft.confirmedText || '');
  selectedType.value = classification.value.labelType;
  saveScanDraft({ classification: classification.value, labelType: selectedType.value });
  loading.value = false;
});

function selectType(type: LabelType) {
  if (type === 'unknown_label') {
    navigateToRoute(routes.capture);
    return;
  }
  selectedType.value = type;
  saveScanDraft({ labelType: type });
}

function continueToConfirm() {
  saveScanDraft({ labelType: selectedType.value });
  uni.navigateTo({ url: routes.confirmText });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">标签类型识别</text>
      <text class="page-subtitle">自动判断只是辅助结果，低置信或不确定时请手动选择。</text>
    </view>
    <StepIndicator :steps="steps" :active-index="2" />
    <LoadingState v-if="loading">正在判断标签类型...</LoadingState>
    <template v-else>
      <Toast v-if="classification?.mockOnly" message="mock only：后端分类 API 尚未实现，当前使用前端本地判断。" />
      <AppCard>
        <view class="stack">
          <text class="section-title">当前判断</text>
          <text class="label-current">{{ labelTypeLabels[selectedType] }}</text>
          <text v-for="reason in classification?.reasons || []" :key="reason" class="muted">{{ reason }}</text>
        </view>
      </AppCard>
      <view class="label-options">
        <button
          v-for="item in labelTypeActions"
          :key="item.type"
          class="label-option"
          :class="{ 'label-option--active': selectedType === item.type }"
          @tap="selectType(item.type)"
        >
          <text class="label-option__title">{{ item.label }}</text>
          <text class="label-option__desc">{{ item.description }}</text>
        </button>
      </view>
      <AppButton :disabled="selectedType === 'unknown_label'" @click="continueToConfirm">进入文本确认</AppButton>
    </template>
  </view>
</template>

<style scoped>
.label-current {
  color: var(--primary-strong);
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.label-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.label-option {
  min-height: 72px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  padding: var(--space-md);
  text-align: left;
}

.label-option::after {
  border: 0;
}

.label-option--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.label-option__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.label-option__desc {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.4;
}
</style>
