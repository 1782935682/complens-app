<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { dataStatusLabel } from '@/constants/dataStatus';
import { chooseLabelImage } from '@/platform/camera';
import { recognizeImageByBackend } from '@/services/api/ocr';
import { getAttentionSettings } from '@/stores/attentionStore';
import type { IngredientMatch, LabelReport, ParsedIngredient } from '@/types';
import { compareConsumerDecision } from '@/utils/decisionRules';
import { parseIngredientList } from '@/utils/ingredientParser';
import { parseNutritionText } from '@/utils/nutritionParser';
import { buildLabelReport } from '@/utils/reportBuilder';

type SlotKey = 'left' | 'right';

const leftName = ref('商品 A');
const rightName = ref('商品 B');
const leftText = ref('');
const rightText = ref('');
const loadingSlot = ref<SlotKey | ''>('');
const comparing = ref(false);
const error = ref('');
const leftReport = ref<LabelReport | undefined>();
const rightReport = ref<LabelReport | undefined>();

const canCompare = computed(() => Boolean(leftText.value.trim() && rightText.value.trim()));
const comparison = computed(() => {
  if (!leftReport.value || !rightReport.value) return undefined;
  return compareConsumerDecision(leftReport.value, rightReport.value);
});
const conclusionTitle = computed(() => {
  if (!comparison.value) return '';
  if (comparison.value.winner === 'left') return '更推荐 A';
  if (comparison.value.winner === 'right') return '更推荐 B';
  return '两者差不多';
});

async function recognizeSlot(slot: SlotKey, source: 'camera' | 'album') {
  error.value = '';
  loadingSlot.value = slot;
  try {
    const image = await chooseLabelImage(source);
    const result = await recognizeImageByBackend(image);
    setSlotText(slot, result.text || '');
    if (!result.text) error.value = '没有识别到清楚文字，可以直接手动输入。';
  } catch {
    error.value = '这张图片暂时识别失败，可以直接手动输入。';
  } finally {
    loadingSlot.value = '';
  }
}

function setSlotText(slot: SlotKey, text: string) {
  if (slot === 'left') leftText.value = text;
  if (slot === 'right') rightText.value = text;
}

function clearSlot(slot: SlotKey) {
  setSlotText(slot, '');
  if (slot === 'left') leftReport.value = undefined;
  if (slot === 'right') rightReport.value = undefined;
}

function compareNow() {
  if (!canCompare.value) {
    error.value = '请先补齐两个商品的配料或营养信息。';
    return;
  }
  comparing.value = true;
  error.value = '';
  leftReport.value = buildTempReport(leftName.value || '商品 A', leftText.value);
  rightReport.value = buildTempReport(rightName.value || '商品 B', rightText.value);
  comparing.value = false;
}

function buildTempReport(productName: string, rawText: string): LabelReport {
  const ingredients = parseIngredientList(rawText);
  const nutrition = parseNutritionText(rawText);
  const matches = ingredients.map((ingredient, index) => buildLocalMatch(ingredient, index));
  return buildLabelReport({
    productName,
    rawText,
    ingredients,
    matches,
    nutrition,
    attention: getAttentionSettings(),
    labelType: ingredients.length >= 3 ? 'ingredient_list' : 'unknown_label',
    frontClaimsText: rawText
  });
}

function buildLocalMatch(ingredient: ParsedIngredient, index: number): IngredientMatch {
  const name = ingredient.normalizedText;
  const isAdditive = /剂|色素|香精|甜味|防腐|增稠|乳化|酸度|膨松|山梨酸|苯甲酸|三氯蔗糖|阿斯巴甜|安赛蜜/.test(name);
  return {
    id: `compare-${index}-${name}`,
    term: name,
    normalizedText: name,
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: dataStatusLabel('unknown_from_ocr'),
    confidence: 0,
    matchType: 'none',
    sourceNote: '商品对比页仅使用本地规则和用户输入文字。',
    ingredientName: name,
    isAdditive,
    decision: 'confirmed'
  };
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader
      title="两个比一比"
      subtitle="分别输入或识别两个商品，看看哪个更适合当前关注目标。"
    />

    <ErrorState v-if="error" title="需要补充信息" :description="error" action-label="知道了" @action="error = ''" />

    <view class="compare-input-grid">
      <AppCard>
        <view class="stack">
          <text class="section-title">商品 A</text>
          <input v-model="leftName" class="input" placeholder="商品 A 名称" />
          <textarea v-model="leftText" class="textarea compare-textarea" auto-height placeholder="粘贴商品 A 的配料或营养信息" />
          <LoadingState v-if="loadingSlot === 'left'">正在识别商品 A...</LoadingState>
          <view class="compare-actions">
            <AppButton variant="secondary" @click="recognizeSlot('left', 'camera')">拍 A</AppButton>
            <AppButton variant="secondary" @click="recognizeSlot('left', 'album')">选图</AppButton>
            <AppButton variant="text" @click="clearSlot('left')">清空</AppButton>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">商品 B</text>
          <input v-model="rightName" class="input" placeholder="商品 B 名称" />
          <textarea v-model="rightText" class="textarea compare-textarea" auto-height placeholder="粘贴商品 B 的配料或营养信息" />
          <LoadingState v-if="loadingSlot === 'right'">正在识别商品 B...</LoadingState>
          <view class="compare-actions">
            <AppButton variant="secondary" @click="recognizeSlot('right', 'camera')">拍 B</AppButton>
            <AppButton variant="secondary" @click="recognizeSlot('right', 'album')">选图</AppButton>
            <AppButton variant="text" @click="clearSlot('right')">清空</AppButton>
          </view>
        </view>
      </AppCard>
    </view>

    <AppButton :disabled="!canCompare || comparing" :loading="comparing" @click="compareNow">开始对比</AppButton>

    <AppCard v-if="comparison && leftReport && rightReport">
      <view class="stack">
        <text class="compare-result__title">{{ conclusionTitle }}</text>
        <text class="muted">基于糖、钠、能量、添加剂、过敏关注和你设置的目标综合判断。</text>
        <view class="simple-list">
          <view v-for="reason in comparison.reasons" :key="reason" class="simple-list-item">
            <text class="simple-list-item__desc">{{ reason }}</text>
          </view>
        </view>
      </view>
    </AppCard>

    <view v-if="leftReport && rightReport" class="compare-result-grid">
      <AppCard>
        <view class="stack">
          <text class="section-title">A：{{ leftReport.productName }}</text>
          <text class="soft-tag">{{ leftReport.decision?.label }}</text>
          <text class="muted">{{ leftReport.decision?.summary }}</text>
          <text class="muted">糖/钠/添加剂/关注项越少，通常越适合当前目标。</text>
        </view>
      </AppCard>
      <AppCard>
        <view class="stack">
          <text class="section-title">B：{{ rightReport.productName }}</text>
          <text class="soft-tag">{{ rightReport.decision?.label }}</text>
          <text class="muted">{{ rightReport.decision?.summary }}</text>
          <text class="muted">如信息缺失，建议补拍营养成分表后再对比。</text>
        </view>
      </AppCard>
    </view>
  </view>
</template>

<style scoped>
.compare-input-grid,
.compare-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.compare-textarea {
  min-height: 128px;
}

.compare-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.compare-result__title {
  color: var(--text);
  font-size: var(--font-size-2xl);
  font-weight: 800;
  line-height: 1.2;
}
</style>
