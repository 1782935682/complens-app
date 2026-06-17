<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { deleteReport, getReports } from '@/stores/scanStore';
import type { LabelReport } from '@/types';

const reports = ref<LabelReport[]>([]);
const query = ref('');
const deletingId = ref('');
const filteredReports = computed(() => {
  const keyword = query.value.trim();
  if (!keyword) return reports.value;
  return reports.value.filter((report) => `${report.productName}${report.summarySentence}${report.analysisSource?.sourceLabel || ''}${report.analysisSource?.description || ''}`.includes(keyword));
});

onShow(loadReports);

function loadReports() {
  reports.value = getReports();
}

function openReport(report: LabelReport) {
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
}

function confirmDelete() {
  reports.value = deleteReport(deletingId.value);
  deletingId.value = '';
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader title="扫描记录" subtitle="打开之前的识别结果，也可以删除本机记录。" />

    <input v-model="query" class="input" placeholder="搜索产品名或结果摘要" />

    <EmptyState
      v-if="!filteredReports.length"
      icon=""
      title="还没有扫描记录"
      description="拍一次商品、条码、配料表或营养成分表，结果会保存在这里。"
      action-label="拍商品"
      @action="navigateToRoute(routes.capture)"
    />

    <view v-else class="stack">
      <AppCard v-for="report in filteredReports" :key="report.id">
        <view class="history-card">
          <text class="history-card__title">{{ report.productName }}</text>
          <text class="muted">{{ new Date(report.createdAt).toLocaleString() }}</text>
          <view v-if="report.analysisSource" class="history-source">
            <text class="history-source__label">{{ report.analysisSource.sourceLabel }}</text>
            <text class="history-source__text">{{ report.analysisSource.fromProductLibrary ? '商品库记录' : report.analysisSource.fromUserCapture ? '用户拍摄' : report.analysisSource.fromManualInput ? '手动输入' : '历史记录' }}</text>
          </view>
          <text class="history-card__summary">{{ report.decision?.label || report.summarySentence }}</text>
          <text v-if="report.decision?.summary" class="muted">{{ report.decision.summary }}</text>
          <text v-if="report.analysisSource?.imageSummary" class="muted">图片摘要：{{ report.analysisSource.imageSummary }}</text>
          <view class="history-card__actions">
            <AppButton variant="secondary" @click="openReport(report)">打开结果</AppButton>
            <AppButton variant="text" @click="deletingId = report.id">删除本地记录</AppButton>
          </view>
        </view>
      </AppCard>
    </view>

    <AppModal
      :open="Boolean(deletingId)"
      title="删除历史记录"
      message="删除后只会移除本机记录，不影响你之后重新扫描。"
      confirm-label="确认删除"
      @close="deletingId = ''"
      @confirm="confirmDelete"
    />
  </view>
</template>

<style scoped>
.history-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.history-card__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.history-card__summary {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.history-source {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.history-source__label,
.history-source__text {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 4px 10px;
}

.history-source__text {
  background: var(--surface-subtle);
  color: var(--muted);
}

.history-card__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
