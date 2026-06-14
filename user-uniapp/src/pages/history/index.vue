<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { deleteReport, getReports } from '@/stores/scanStore';
import type { LabelReport } from '@/types';

const reports = ref<LabelReport[]>([]);
const query = ref('');
const deletingId = ref('');
const filteredReports = computed(() => {
  const keyword = query.value.trim();
  if (!keyword) return reports.value;
  return reports.value.filter((report) => `${report.productName}${report.summarySentence}`.includes(keyword));
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
  <view class="page stack">
    <view>
      <text class="page-title">历史记录</text>
      <text class="page-subtitle">本地保存最近的食品标签解读，按时间倒序排列。</text>
    </view>

    <input v-model="query" class="input" placeholder="搜索产品名或报告摘要" />

    <EmptyState
      v-if="!filteredReports.length"
      title="没有历史报告"
      description="完成一次食品标签解读后，可以在这里打开或删除本地记录。"
      action-label="开始拍照"
      @action="navigateToRoute(routes.capture)"
    />

    <view v-else class="stack">
      <AppCard v-for="report in filteredReports" :key="report.id">
        <view class="history-card">
          <text class="history-card__title">{{ report.productName }}</text>
          <text class="muted">{{ new Date(report.createdAt).toLocaleString() }}</text>
          <text class="history-card__summary">{{ report.summarySentence }}</text>
          <view class="history-card__actions">
            <AppButton variant="secondary" @click="openReport(report)">打开报告</AppButton>
            <AppButton variant="text" @click="deletingId = report.id">删除本地记录</AppButton>
          </view>
        </view>
      </AppCard>
    </view>

    <AppModal
      :open="Boolean(deletingId)"
      title="删除历史记录"
      message="删除后只会移除本机记录，不影响你之后重新生成报告。"
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

.history-card__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
