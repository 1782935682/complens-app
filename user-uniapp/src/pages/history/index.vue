<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { deleteReport, getReports, resetScanDraft, toggleReportFavorite } from '@/stores/scanStore';
import type { LabelReport } from '@/types';

const reports = ref<LabelReport[]>([]);
const loading = ref(false);
const error = ref('');
const message = ref('');
const filter = ref<'all' | 'favorite' | 'attention'>('all');

const visibleReports = computed(() => (
  filter.value === 'favorite'
    ? reports.value.filter((report) => report.isFavorite)
    : filter.value === 'attention'
      ? reports.value.filter(hasAttentionSignal)
      : reports.value
));

onShow(() => {
  loadReports();
});

function loadReports() {
  loading.value = true;
  error.value = '';
  try {
    reports.value = getReports();
  } catch {
    error.value = '本机记录暂时读取失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

function startScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function openReport(report: LabelReport) {
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
}

function removeReport(report: LabelReport) {
  uni.showModal({
    title: '删除记录',
    content: `删除“${report.productName || '未命名食品'}”后，仅会从本机历史中移除。`,
    confirmText: '删除',
    success(result) {
      if (!result.confirm) return;
      deleteReport(report.id);
      loadReports();
    }
  });
}

function toggleFavorite(report: LabelReport) {
  const updated = toggleReportFavorite(report.id);
  if (!updated) return;
  reports.value = getReports();
}

function hasAttentionSignal(report: LabelReport): boolean {
  return Boolean(
    report.attentionHits.length
    || report.focusItems.length
    || report.allergenHints.length
    || report.nutritionSnapshot?.some((item) => item.level === '较高')
    || report.additiveRecognition?.items.some((item) => item.displayLevel === 'focus')
  );
}

function countAttentionReports(): number {
  return reports.value.filter(hasAttentionSignal).length;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function reportMeta(report: LabelReport): string {
  const parts = [
    `${report.ingredientSection.total} 项配料`,
    `${report.ingredientSection.additiveCount} 项添加剂`
  ];
  const nutritionCount = report.nutritionSection.fields.filter((field) => field.value.trim()).length;
  if (nutritionCount) parts.push(`${nutritionCount} 项营养值`);
  if (report.unknownItems.length) parts.push(`${report.unknownItems.length} 项暂未收录`);
  return parts.join(' · ');
}

function reportDecisionLabel(report: LabelReport): string {
  if (report.foodAnalysis?.riskLevel === 'unknown' || report.decision?.level === 'insufficient') return '信息不足';
  return report.foodAnalysis?.decisionText || report.decision?.label || '已整理';
}

function reportDecisionReasons(report: LabelReport): string {
  const reasons = report.foodAnalysis?.mainReasons?.length
    ? report.foodAnalysis.mainReasons
    : report.decision?.reasons ?? [];
  return reasons
    .map((item) => String(item || '').replace(/[。；;]/gu, '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('、') || report.summarySentence;
}

function reportDecisionTone(report: LabelReport): string {
  const level = report.foodAnalysis?.riskLevel || report.decision?.level || '';
  if (level === 'green' || level === 'daily_ok') return 'ok';
  if (level === 'red' || level === 'alternative') return 'strong';
  if (level === 'unknown' || level === 'insufficient') return 'plain';
  return 'watch';
}

function emptyTitle(): string {
  if (filter.value === 'favorite') return '还没有收藏';
  if (filter.value === 'attention') return '还没有关注项命中';
  return '还没有历史记录';
}

function emptyDescription(): string {
  if (filter.value === 'favorite') return '在报告页点收藏，就能把常看的食品标签解读留在这里。';
  if (filter.value === 'attention') return '命中控糖、儿童、过敏或其他重点提醒的记录会出现在这里。';
  return '拍一张食品标签，生成的解读会自动保存在这里。';
}
</script>

<template>
  <view class="page page--history stack">
    <view class="history-head">
      <view>
        <text class="page-subtitle">{{ reports.length }} 条本机结果</text>
        <text class="history-head__hint">最近拍过的包装会保存在这里。</text>
      </view>
      <AppButton variant="secondary" @click="startScan">再拍</AppButton>
    </view>

    <view class="history-filter" aria-label="历史记录筛选">
      <view
        class="history-filter__item"
        :class="{ 'history-filter__item--active': filter === 'all' }"
        @tap="filter = 'all'"
      >
        <text>全部</text>
        <text class="history-filter__count">{{ reports.length }}</text>
      </view>
      <view
        class="history-filter__item"
        :class="{ 'history-filter__item--active': filter === 'favorite' }"
        @tap="filter = 'favorite'"
      >
        <text>收藏</text>
        <text class="history-filter__count">{{ reports.filter((item) => item.isFavorite).length }}</text>
      </view>
      <view
        class="history-filter__item"
        :class="{ 'history-filter__item--active': filter === 'attention' }"
        @tap="filter = 'attention'"
      >
        <text>有提醒</text>
        <text class="history-filter__count">{{ countAttentionReports() }}</text>
      </view>
    </view>

    <view v-if="message" class="history-message">
      <text>{{ message }}</text>
    </view>

    <LoadingState v-if="loading">正在读取本机记录...</LoadingState>
    <ErrorState v-else-if="error" title="读取失败" :description="error" action-label="重试" @action="loadReports" />
    <EmptyState
      v-else-if="!visibleReports.length"
      icon="历"
      :title="emptyTitle()"
      :description="emptyDescription()"
      action-label="拍食品标签"
      @action="startScan"
    />

    <view v-else class="history-list">
      <AppCard v-for="item in visibleReports" :key="item.id" clickable>
        <view class="history-card" @tap="openReport(item)">
          <view class="history-card__top">
            <view class="history-card__title-row">
              <text class="history-card__title">{{ item.productName || '未命名食品' }}</text>
              <text v-if="item.isFavorite" class="favorite-mark">已收藏</text>
              <text class="decision-mark" :class="`decision-mark--${reportDecisionTone(item)}`">{{ reportDecisionLabel(item) }}</text>
            </view>
            <text class="history-card__time">{{ formatDate(item.createdAt) }}</text>
          </view>
          <text class="history-card__summary">{{ reportDecisionReasons(item) }}</text>
          <view class="history-card__meta">
            <text class="soft-tag soft-tag--plain">{{ reportMeta(item) }}</text>
            <view class="history-card__icons" @tap.stop>
              <text class="history-card__icon" @tap="toggleFavorite(item)">{{ item.isFavorite ? '已收藏' : '收藏' }}</text>
              <text class="history-card__icon history-card__icon--danger" @tap="removeReport(item)">删除</text>
            </view>
          </view>
        </view>
      </AppCard>
    </view>
  </view>
</template>

<style scoped>
.page--history {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  background: linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
}

.history-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
}

.history-head :deep(.app-button) {
  flex: 0 0 auto;
}

.history-head__hint {
  color: var(--muted);
  display: block;
  font-size: var(--font-size-xs);
  line-height: 1.45;
  margin-top: 4rpx;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.history-filter {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 6rpx;
  gap: 4rpx;
}

.history-filter__item {
  min-height: 68rpx;
  border-radius: 18rpx;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: 900;
}

.history-filter__item--active {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.history-filter__count {
  min-width: 32rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  text-align: center;
}

.history-message {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: var(--radius-card);
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.45;
  padding: var(--space-sm) var(--space-md);
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.history-card__top,
.history-card__meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.history-card__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.3;
}

.history-card__title-row {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.favorite-mark {
  border-radius: 999px;
  background: var(--surface-warm);
  color: var(--accent);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  padding: 4rpx 12rpx;
}

.decision-mark {
  max-width: 100%;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.35;
  padding: 4rpx 12rpx;
}

.decision-mark--ok {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.decision-mark--watch {
  background: var(--surface-warm);
  color: var(--accent);
}

.decision-mark--strong {
  background: rgba(255, 244, 239, 0.92);
  color: var(--status-danger);
}

.history-card__time {
  color: var(--muted);
  flex: 0 0 auto;
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.history-card__summary {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.history-card__icons {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.history-card__icon {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.4;
}

.history-card__icon--danger {
  color: var(--status-danger);
}

@media screen and (max-width: 340px) {
  .history-filter {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .history-head,
  .history-card__meta {
    flex-direction: column;
  }
}
</style>
