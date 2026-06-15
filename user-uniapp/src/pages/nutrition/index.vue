<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { NutritionField } from '@/types';
import { getEditableNutritionFields, parseNutritionText } from '@/utils/nutritionParser';

const fields = ref<NutritionField[]>([]);

onMounted(() => {
  const draft = getScanDraft();
  fields.value = getEditableNutritionFields(draft.nutrition.length ? draft.nutrition : parseNutritionText(draft.confirmedText));
  saveScanDraft({ nutrition: fields.value });
});

function continueToMatch() {
  saveScanDraft({ nutrition: fields.value });
  uni.navigateTo({ url: routes.match });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">营养成分表解析</text>
      <text class="page-subtitle">可编辑能量、蛋白质、脂肪、糖、钠等字段。信息不足时会在报告中提示结合包装原文确认。</text>
    </view>

    <EmptyState
      v-if="!fields.length"
      title="没有营养字段"
      description="请返回文本确认页粘贴营养成分表文字。"
      action-label="回到文本确认"
      @action="navigateToRoute(routes.confirmText)"
    />

    <AppCard v-else>
      <view class="nutrition-grid">
        <view v-for="field in fields" :key="field.key" class="nutrition-field">
          <text class="field-label">{{ field.label }}</text>
          <view class="nutrition-field__row">
            <input v-model="field.value" class="input nutrition-field__input" placeholder="数值" />
            <input v-model="field.unit" class="input nutrition-field__unit" placeholder="单位" />
          </view>
          <input v-if="field.key !== 'perUnit' && field.key !== 'servingSize'" v-model="field.nrvPercent" class="input" placeholder="NRV%（可选）" />
        </view>
      </view>
    </AppCard>

    <AppButton @click="continueToMatch">继续生成报告</AppButton>
  </view>
</template>

<style scoped>
.nutrition-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.nutrition-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nutrition-field__row {
  display: flex;
  gap: var(--space-sm);
}

.nutrition-field__input {
  flex: 1;
}

.nutrition-field__unit {
  width: 86px;
}
</style>
