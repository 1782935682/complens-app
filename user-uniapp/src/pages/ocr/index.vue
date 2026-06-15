<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import { routes } from '@/constants/routes';
import { recognizeImageByBackend, buildManualOcrResult } from '@/services/api/ocr';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { OcrResult } from '@/types';

const loading = ref(false);
const result = ref<OcrResult | undefined>();
const error = ref('');
const steps = ['拍照', '识别', '确认', '报告'];
const canContinue = computed(() => Boolean(result.value));

onMounted(() => {
  void runOcr();
});

async function runOcr() {
  const draft = getScanDraft();
  if (!draft.image) {
    error.value = '没有找到待识别图片，请重新拍照或上传。';
    return;
  }
  loading.value = true;
  error.value = '';
  result.value = undefined;
  try {
    const next = await recognizeImageByBackend(draft.image);
    result.value = next;
    saveScanDraft({ ocr: next, confirmedText: next.text || draft.confirmedText || '' });
    if (next.mode === 'fallback') error.value = next.errorMessage || '识别失败，可重试或手动输入。';
  } catch {
    const next = buildManualOcrResult();
    result.value = next;
    saveScanDraft({ ocr: next, confirmedText: draft.confirmedText || '' });
    error.value = '图片暂不能读取或识别失败，可手动输入。';
  } finally {
    loading.value = false;
  }
}

function manualInput() {
  const manual = buildManualOcrResult();
  result.value = manual;
  saveScanDraft({ ocr: manual, confirmedText: '' });
  uni.navigateTo({ url: routes.confirmText });
}

function continueToLabelType() {
  uni.navigateTo({ url: routes.labelType });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">OCR 识别</text>
      <text class="page-subtitle">识别结果必须经过用户确认后，才会进入解析和报告。</text>
    </view>
    <StepIndicator :steps="steps" :active-index="1" />
    <LoadingState v-if="loading">正在识别标签文字...</LoadingState>
    <ErrorState v-else-if="error" title="识别未完成" :description="error" action-label="重试识别" @action="runOcr" />
    <AppCard v-if="result && !loading">
      <view class="stack">
        <text class="section-title">识别结果</text>
        <text class="muted">Provider：{{ result.provider }}；置信度：{{ Math.round(result.confidence * 100) }}%</text>
        <text class="ocr-text">{{ result.text || '当前没有自动识别文本，可手动输入。' }}</text>
      </view>
    </AppCard>
    <AppButton :disabled="!canContinue || loading" @click="continueToLabelType">确认标签类型</AppButton>
    <AppButton variant="secondary" @click="manualInput">手动输入</AppButton>
  </view>
</template>

<style scoped>
.ocr-text {
  color: var(--text);
  font-size: var(--font-size-base);
  line-height: 1.7;
  word-break: break-word;
}
</style>
