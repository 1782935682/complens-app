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
import { getScanDraft, resetScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { LabelClassification, LabelType } from '@/types';

const loading = ref(false);
const classification = ref<LabelClassification | undefined>();
const selectedType = ref<LabelType>('unknown_label');
const steps = ['拍照', '识别', '确认', '报告'];

onMounted(async () => {
  loading.value = true;
  const draft = getScanDraft();
  const shouldReclassify = !draft.classification || draft.classification.fallbackOnly || draft.classification.mockOnly;
  const nextClassification = shouldReclassify
    ? await classifyLabelWithAdapter(draft.confirmedText || draft.ocr?.text || '')
    : draft.classification;
  selectedType.value = getPreferredLabelType(draft.labelType, nextClassification.labelType);
  classification.value = applyManualTypeOverride(nextClassification, selectedType.value);
  saveScanDraft({ classification: classification.value, labelType: selectedType.value });
  loading.value = false;
});

function selectType(type: LabelType) {
  if (type === 'unknown_label') {
    restartScan();
    return;
  }
  selectedType.value = type;
  if (classification.value) classification.value = applyManualTypeOverride(classification.value, type);
  saveScanDraft({ classification: classification.value, labelType: type });
}

function continueToConfirm() {
  if (classification.value) classification.value = applyManualTypeOverride(classification.value, selectedType.value);
  saveScanDraft({ classification: classification.value, labelType: selectedType.value });
  uni.navigateTo({ url: routes.confirmText });
}

function restartScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function getPreferredLabelType(savedType: LabelType, inferredType: LabelType): LabelType {
  return savedType && savedType !== 'unknown_label' ? savedType : inferredType;
}

function applyManualTypeOverride(base: LabelClassification, type: LabelType): LabelClassification {
  if (type === 'unknown_label' || base.labelType === type) return base;
  return {
    ...base,
    labelType: type,
    requiresUserSelection: false,
    reasons: [`已按手动选择设置为${labelTypeLabels[type]}。`, ...base.reasons.filter((reason) => !reason.startsWith('已按手动选择'))]
  };
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
      <Toast v-if="classification?.fallbackOnly || classification?.mockOnly" message="后端标签分类暂不可用，已使用本地规则辅助判断。" />
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
