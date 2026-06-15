<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import { labelTypeLabels } from '@/constants/labelTypes';
import { routes, navigateToRoute } from '@/constants/routes';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { LabelType } from '@/types';

const text = ref('');
const productName = ref('');
const labelType = ref<LabelType>('unknown_label');
const steps = ['拍照', '识别', '确认', '报告'];
const isEmpty = computed(() => !text.value.trim());

onMounted(() => {
  const draft = getScanDraft();
  text.value = draft.confirmedText || draft.ocr?.text || '';
  productName.value = draft.productName || '';
  labelType.value = draft.labelType || 'unknown_label';
});

function clearText() {
  text.value = '';
}

function continueFlow() {
  const confirmedText = text.value.trim();
  saveScanDraft({
    confirmedText,
    productName: productName.value.trim(),
    labelType: labelType.value,
    frontClaimsText: labelType.value === 'front_claims' ? confirmedText : '',
    ingredients: [],
    nutrition: [],
    matches: []
  });
  if (!confirmedText) return;
  if (labelType.value === 'ingredient_list') {
    uni.navigateTo({ url: routes.ingredients });
    return;
  }
  if (labelType.value === 'nutrition_facts') {
    uni.navigateTo({ url: routes.nutrition });
    return;
  }
  if (labelType.value === 'front_claims') {
    uni.navigateTo({ url: routes.match });
    return;
  }
  uni.navigateTo({ url: routes.labelType });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">文本确认</text>
      <text class="page-subtitle">请先核对 OCR 原文。确认后的文本才会进入配料拆分、营养解析和报告。</text>
    </view>
    <StepIndicator :steps="steps" :active-index="2" />
    <AppCard>
      <view class="stack">
        <view>
          <text class="field-label">产品名（可选）</text>
          <input v-model="productName" class="input" placeholder="例如：全麦饼干" />
        </view>
        <view class="row">
          <text class="field-label">当前类型：{{ labelTypeLabels[labelType] }}</text>
          <text class="link" @tap="navigateToRoute(routes.labelType)">修改类型</text>
        </view>
        <view>
          <text class="field-label">OCR 原文 / 手动输入</text>
          <textarea v-model="text" class="textarea" auto-height placeholder="粘贴或输入包装上的文字" />
        </view>
      </view>
    </AppCard>
    <EmptyState
      v-if="isEmpty"
      title="还没有可分析文本"
      description="你可以手动输入，也可以返回重新上传清晰图片。"
      action-label="重新上传"
      @action="navigateToRoute(routes.capture)"
    />
    <AppButton :disabled="isEmpty" @click="continueFlow">确认继续</AppButton>
    <AppButton variant="secondary" @click="clearText">清空</AppButton>
    <AppButton variant="text" @click="navigateToRoute(routes.capture)">重新上传</AppButton>
  </view>
</template>
