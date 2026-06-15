<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ConfidenceBadge from '@/components/ConfidenceBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import StatusTag from '@/components/StatusTag.vue';
import Toast from '@/components/Toast.vue';
import { dataStatusLabel } from '@/constants/dataStatus';
import { routes } from '@/constants/routes';
import { matchIngredientsByApi } from '@/services/api/ingredients';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getScanDraft, saveReport, saveScanDraft } from '@/stores/scanStore';
import type { IngredientMatch } from '@/types';
import { buildLabelReport } from '@/utils/reportBuilder';

const loading = ref(false);
const error = ref('');
const matches = ref<IngredientMatch[]>([]);
const fallbackMessage = ref('');

onMounted(() => {
  void loadMatches();
});

async function loadMatches() {
  const draft = getScanDraft();
  if (!draft.ingredients.length) {
    matches.value = [];
    return;
  }
  loading.value = true;
  error.value = '';
  fallbackMessage.value = '';
  try {
    matches.value = await matchIngredientsByApi(draft.ingredients);
  } catch {
    fallbackMessage.value = 'mock only / 待后端实现：当前后端匹配不可用，已保留为暂未收录状态，不伪造来源。';
    matches.value = draft.ingredients.map((item, index) => ({
      id: `${index}-${item.normalizedText}`,
      term: item.normalizedText,
      normalizedText: item.normalizedText,
      dataStatus: 'unknown_from_ocr',
      dataStatusLabel: dataStatusLabel('unknown_from_ocr'),
      confidence: 0,
      matchType: 'none',
      sourceNote: '后端不可用，保留为暂未收录。',
      ingredientName: item.normalizedText,
      isAdditive: false,
      decision: 'pending'
    }));
  } finally {
    loading.value = false;
    saveScanDraft({ matches: matches.value });
  }
}

function updateDecision(match: IngredientMatch, decision: IngredientMatch['decision']) {
  match.decision = decision;
  if (decision === 'rejected') {
    clearBackendMatchMetadata(match);
  } else if (decision === 'confirmed') {
    restoreConfirmedMatchMetadata(match);
  }
  saveScanDraft({ matches: matches.value });
}

function restoreConfirmedMatchMetadata(match: IngredientMatch) {
  const dataStatus = match.matchedDataStatus || match.dataStatus;
  match.dataStatus = dataStatus;
  match.dataStatusLabel = dataStatusLabel(dataStatus);
  match.sourceType = match.matchedSourceType || match.sourceType;
  match.sourceNote = match.matchedSourceNote || match.sourceNote;
  match.isAdditive = match.matchedIsAdditive ?? match.isAdditive;
}

function clearBackendMatchMetadata(match: IngredientMatch) {
  match.dataStatus = 'unknown_from_ocr';
  match.dataStatusLabel = dataStatusLabel('unknown_from_ocr');
  match.confidence = 0;
  match.matchType = 'none';
  match.sourceNote = '用户已标为暂未收录，请以包装原文为准。';
  match.ingredientName = match.normalizedText;
  match.isAdditive = false;
  delete match.ingredientId;
  delete match.sourceName;
  delete match.sourceType;
}

function generateReport() {
  const draft = getScanDraft();
  const report = buildLabelReport({
    productName: draft.productName,
    rawText: draft.confirmedText,
    ingredients: draft.ingredients,
    matches: matches.value,
    nutrition: draft.nutrition,
    attention: getAttentionSettings(),
    labelType: draft.labelType,
    frontClaimsText: draft.frontClaimsText,
    ocr: draft.ocr
  });
  saveReport(report);
  saveScanDraft({ matches: matches.value });
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">匹配确认</text>
      <text class="page-subtitle">疑似匹配和未收录项不会展示为权威结论，你可以确认或驳回。</text>
    </view>
    <LoadingState v-if="loading">正在匹配成分数据库...</LoadingState>
    <ErrorState v-else-if="error" title="匹配失败" :description="error" action-label="重试" @action="loadMatches" />
    <Toast v-if="fallbackMessage" :message="fallbackMessage" />
    <EmptyState
      v-if="!loading && !matches.length"
      title="没有配料项"
      description="如果只拍了营养成分表，也可以继续生成报告；配料部分会提示信息不足。"
      action-label="继续生成报告"
      @action="generateReport"
    />
    <view v-else class="stack">
      <AppCard v-for="match in matches" :key="match.id">
        <view class="match-card">
          <view class="match-card__top">
            <text class="match-card__name">{{ match.ingredientName || match.normalizedText }}</text>
            <StatusTag :status="match.dataStatus" />
          </view>
          <view class="row">
            <ConfidenceBadge :confidence="match.confidence" />
            <text class="muted">{{ match.sourceNote }}</text>
          </view>
          <view v-if="match.decision === 'pending'" class="match-card__actions">
            <AppButton variant="secondary" @click="updateDecision(match, 'confirmed')">确认匹配</AppButton>
            <AppButton variant="text" @click="updateDecision(match, 'rejected')">标为暂未收录</AppButton>
          </view>
        </view>
      </AppCard>
    </view>
    <AppButton :disabled="loading" @click="generateReport">生成食品标签解读</AppButton>
  </view>
</template>

<style scoped>
.match-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.match-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.match-card__name {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.match-card__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
