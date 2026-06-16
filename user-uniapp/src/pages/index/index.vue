<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { getReports, resetScanDraft, setFastScanMode } from '@/stores/scanStore';
import type { LabelReport } from '@/types';

const reports = ref<LabelReport[]>([]);
const recentReports = computed(() => reports.value.slice(0, 3));
const scenarioCards = [
  '控糖看配料',
  '低钠看营养',
  '给孩子买零食',
  '过敏/忌口检查',
  '少添加选择'
];

onShow(() => {
  reports.value = getReports();
});

function openReport(report: LabelReport) {
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
}

function startManualTextEntry() {
  resetScanDraft();
  setFastScanMode(false);
  uni.navigateTo({ url: `${routes.confirmText}?entry=manual` });
}

function startFastScan() {
  resetScanDraft();
  setFastScanMode(true);
  uni.switchTab({ url: routes.capture });
}

function openCapture() {
  resetScanDraft();
  setFastScanMode(false);
  navigateToRoute(routes.capture);
}

function openCompareMode() {
  uni.navigateTo({ url: routes.compare });
}

function openAttention() {
  navigateToRoute(routes.attention);
}

function openDataSources() {
  uni.navigateTo({ url: routes.dataSources });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">CompLens 成分镜</text>
      <text class="page-subtitle">拍一下食品包装，整理配料、营养和购买前建议关注。</text>
    </view>

    <AppCard>
      <view class="home-hero">
        <text class="home-hero__title">食品标签解读</text>
        <text class="home-hero__subtitle">支持配料表、营养成分表和包装正面。OCR 结果会先进入文本确认页。</text>
        <AppButton @click="openCapture">拍照解读食品标签</AppButton>
        <view class="hero-subactions">
          <AppButton variant="secondary" @click="openCapture">从相册上传图片</AppButton>
          <AppButton variant="secondary" @click="startFastScan">极速扫描（拍照即分析）</AppButton>
        </view>
      </view>
    </AppCard>

    <view class="quick-grid">
      <AppButton variant="secondary" @click="openAttention">我的关注项</AppButton>
      <AppButton variant="secondary" class="wide-action" @click="startManualTextEntry">粘贴文字</AppButton>
      <AppButton variant="secondary" @click="openCompareMode">两款商品对比</AppButton>
      <AppButton variant="secondary" @click="navigateToRoute(routes.search)">搜索成分</AppButton>
      <AppButton variant="secondary" @click="navigateToRoute(routes.history)">历史记录</AppButton>
      <AppButton variant="secondary" @click="openDataSources">数据可信说明</AppButton>
      <AppButton variant="secondary" @click="navigateToRoute(routes.settings)">设置</AppButton>
    </view>

    <view>
      <text class="section-title">常见场景</text>
      <view class="scenario-grid">
        <AppButton
          v-for="scenario in scenarioCards"
          :key="scenario"
          variant="secondary"
          class="scenario-button"
          @click="openCapture"
        >
          <text>{{ scenario }}</text>
        </AppButton>
      </view>
    </view>

    <view>
      <text class="section-title">最近报告</text>
      <EmptyState
        v-if="!recentReports.length"
        title="还没有历史记录"
        description="完成一次食品标签解读后，会在这里看到最近报告。"
        action-label="开始拍照"
        @action="openCapture"
      />
      <view v-else class="stack">
        <AppCard v-for="report in recentReports" :key="report.id" clickable>
          <view class="report-row" @tap="openReport(report)">
            <text class="report-row__title">{{ report.productName }}</text>
            <text class="report-row__summary">{{ report.summarySentence }}</text>
            <text class="link">打开报告</text>
          </view>
        </AppCard>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hero-subactions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.home-hero__title {
  color: var(--primary-strong);
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

.home-hero__subtitle {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.quick-grid,
.scenario-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.quick-grid .wide-action {
  grid-column: 1 / -1;
}

.scenario-button {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--text);
  box-sizing: border-box;
  justify-content: flex-start;
  align-items: flex-start;
  padding: var(--space-sm) var(--space-md);
  min-height: 72px;
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.4;
  text-align: left;
  transition: border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
}

.scenario-button::after {
  border: 0;
}

.scenario-button:active {
  border-color: var(--primary-tint);
  background-color: var(--primary-soft);
  color: var(--primary-strong);
  transform: scale(0.98);
}

.report-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.report-row__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.report-row__summary {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}
</style>
