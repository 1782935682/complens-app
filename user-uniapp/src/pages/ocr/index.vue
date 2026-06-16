<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import { labelTypeLabels } from '@/constants/labelTypes';
import { routes } from '@/constants/routes';
import { buildManualOcrResult, recognizeImageByBackend } from '@/services/api/ocr';
import { classifyLabelWithAdapter, upsertLabelScanSessionWithAdapter } from '@/services/api/labels';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { LabelClassification, LabelType, OcrResult } from '@/types';

const AUTO_LABEL_CONFIDENCE = 0.72;
const AUTO_OCR_CONFIDENCE = 0.35;

const loading = ref(false);
const result = ref<OcrResult | undefined>();
const error = ref('');
const isFastMode = ref(false);
const autoClassification = ref<LabelClassification | undefined>();
const steps = ['拍照', '识别', '确认', '报告'];
const canContinue = computed(() => Boolean(result.value));

onLoad((query) => {
  const mode = String(query?.mode || '');
  isFastMode.value = mode === 'fast' || mode === 'auto';
});

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
  autoClassification.value = undefined;
  try {
    const next = await recognizeImageByBackend(draft.image);
    result.value = next;
    const classification = isFastMode.value ? await classifyLabelWithAdapter(next.text || '') : undefined;

    if (isFastMode.value && classification) {
      autoClassification.value = classification;
      const autoLabelType = shouldUseAutoLabelType(classification, next) ? classification.labelType : 'unknown_label';
      saveScanDraft({
        ocr: next,
        confirmedText: next.text || draft.confirmedText || '',
        classification,
        labelType: autoLabelType
      });
      await syncScanSession(next, 'auto', autoLabelType);
      if (!next.text) {
        error.value = '当前未识别到有效文字，请补充手动输入或重拍。';
      } else if (next.mode === 'fallback') {
        error.value = next.errorMessage || '识别结果置信度不足，建议确认后再继续。';
      }
      loading.value = false;
      continueToQuickConfirm();
      return;
    }

    await syncScanSession(next);
    saveScanDraft({ ocr: next, confirmedText: next.text || draft.confirmedText || '' });
    if (next.mode === 'fallback') error.value = next.errorMessage || '识别失败，可重试或手动输入。';
  } catch {
    const next = buildManualOcrResult();
    result.value = next;
    autoClassification.value = undefined;
    await syncScanSession(next, 'manual');
    saveScanDraft({ ocr: next, confirmedText: draft.confirmedText || '' });
    error.value = '图片暂不能读取或识别失败，可手动输入。';
    if (isFastMode.value) {
      loading.value = false;
      continueToQuickConfirm();
      return;
    }
  } finally {
    loading.value = false;
  }
}

async function manualInput() {
  const manual = buildManualOcrResult();
  result.value = manual;
  await syncScanSession(manual, 'manual');
  saveScanDraft({ ocr: manual, confirmedText: '' });
  continueToQuickConfirm();
}

async function syncScanSession(
  ocrResult: OcrResult,
  fallbackMode: 'manual' | 'auto' = 'auto',
  labelType?: LabelType
) {
  const draft = getScanDraft();
  if (!draft.image) return;

  try {
    const response = await upsertLabelScanSessionWithAdapter({
      sessionId: draft.scanSessionId,
      images: [{
        assetId: draft.image.id,
        labelType: labelType || draft.labelType || 'unknown_label',
        mimeType: draft.image.mimeType,
        status: mapScanStatus(ocrResult, fallbackMode)
      }]
    });

    if (response?.sessionId) {
      saveScanDraft({ scanSessionId: response.sessionId });
    }
  } catch {
    error.value = error.value || '识别会话同步暂时失败，已继续后续流程。';
  }
}

function continueToQuickConfirm() {
  error.value = '';
  loading.value = false;
  const target = isFastMode.value ? `${routes.confirmText}?mode=fast` : routes.confirmText;
  uni.navigateTo({ url: target });
}

function continueToLabelType() {
  uni.navigateTo({ url: routes.labelType });
}

function continueToNext() {
  if (isFastMode.value) {
    continueToQuickConfirm();
    return;
  }
  continueToLabelType();
}

function shouldUseAutoLabelType(classification: LabelClassification, ocrResult: OcrResult): boolean {
  if (ocrResult.mode !== 'real') return false;
  if (!classification.labelType || classification.labelType === 'unknown_label') return false;
  if (classification.requiresUserSelection) return false;
  if (classification.confidence < AUTO_LABEL_CONFIDENCE) return false;
  if (ocrResult.confidence < AUTO_OCR_CONFIDENCE) return false;
  return true;
}

const autoLabelTypeText = computed(() => {
  if (!autoClassification.value) return '';
  return labelTypeLabels[autoClassification.value.labelType];
});

function mapLabelSelectionState() {
  if (!autoClassification.value) return '';
  if (autoClassification.value.requiresUserSelection) return '置信度不足，已降级到文本确认。';
  return `${autoLabelTypeText.value}（${Math.round(autoClassification.value.confidence * 100)}%）`;
}

function mapScanStatus(ocrResult: OcrResult, fallbackMode: 'manual' | 'auto'): 'ocr_input' | 'ocr_success' | 'ocr_failed' | 'manual_entry' {
  if (fallbackMode === 'manual' || ocrResult.mode === 'manual') {
    return 'manual_entry';
  }
  if (ocrResult.mode === 'fallback' || ocrResult.mode === 'mock') {
    return 'ocr_failed';
  }
  return ocrResult.text ? 'ocr_success' : 'ocr_failed';
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
        <text v-if="isFastMode && autoClassification" class="muted">标签类型识别：{{ mapLabelSelectionState() }}</text>
        <text class="ocr-text">{{ result.text || '当前没有自动识别文本，可手动输入。' }}</text>
      </view>
    </AppCard>
    <AppButton :disabled="!canContinue || loading" @click="continueToNext">{{ isFastMode ? '进入文本确认' : '确认标签类型' }}</AppButton>
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
