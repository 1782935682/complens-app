<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppModal from '@/components/AppModal.vue';
import PageHeader from '@/components/PageHeader.vue';
import { attentionGoals } from '@/constants/attention';
import { routes, navigateToRoute } from '@/constants/routes';
import { readJson, writeJson } from '@/platform/storage';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getReports } from '@/stores/scanStore';
import { resetScanDraft, setFastScanMode } from '@/stores/scanStore';
import type { AttentionSettings, LabelReport } from '@/types';

const reports = ref<LabelReport[]>([]);
const attentionSettings = ref<AttentionSettings>(getAttentionSettings());
const targetGuideOpen = ref(false);
const targetGuideKey = 'complens:target-guide-seen';

const attentionTerms = computed(() => [
  ...currentGoalLabels.value,
  ...attentionSettings.value.detailTerms,
  ...attentionSettings.value.customTerms
].slice(0, 6));

const currentGoalLabels = computed(() => attentionGoals
  .filter((goal) => attentionSettings.value.goals.includes(goal.key))
  .map((goal) => goal.label));

const recentReports = computed(() => reports.value.slice(0, 3));

onShow(() => {
  reports.value = getReports();
  attentionSettings.value = getAttentionSettings();
  targetGuideOpen.value = !readJson<boolean>(targetGuideKey, false);
});

function openCapture() {
  resetScanDraft();
  setFastScanMode(true);
  navigateToRoute(routes.capture);
}

function openManualInput() {
  resetScanDraft();
  setFastScanMode(false);
  uni.navigateTo({ url: `${routes.capture}?mode=manual` });
}

function openReport(id: string) {
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(id)}` });
}

function closeTargetGuide(openSettings: boolean) {
  writeJson(targetGuideKey, true);
  targetGuideOpen.value = false;
  if (openSettings) navigateToRoute(routes.attention);
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader
      eyebrow="配料雷达"
      title="拍商品，马上看懂"
      subtitle="支持商品正面、条码、配料表和营养成分表。识别不到商品时，再拍配料表分析。"
    />

    <AppCard class="home-card--hero">
      <view class="home-hero">
        <text class="home-hero__title">拍一下 / 扫一下</text>
        <text class="home-hero__subtitle">先识别商品正面或条码；识别不到商品时，再拍配料表、营养成分表继续分析。</text>
        <AppButton class="home-hero__button" @click="openCapture">拍一下 / 扫一下</AppButton>
      </view>
    </AppCard>

    <AppCard clickable>
      <view class="home-link-card" @tap="navigateToRoute(routes.attention)">
        <view>
          <text class="section-title">当前关注</text>
          <text class="muted">这些目标会影响结果页的提醒顺序和结论。</text>
        </view>
        <view v-if="attentionTerms.length" class="pill-list">
          <text v-for="term in attentionTerms" :key="term" class="soft-tag">{{ term }}</text>
        </view>
        <text v-else class="link">快速设置控糖、减脂、少盐、儿童、过敏</text>
      </view>
    </AppCard>

    <view class="quick-actions">
      <AppButton variant="secondary" @click="openManualInput">手动输入</AppButton>
      <AppButton variant="secondary" @click="navigateToRoute(routes.history)">最近扫描</AppButton>
    </view>

    <AppCard>
      <view class="stack">
        <view class="section-head">
          <view>
            <text class="section-title">最近扫描</text>
            <text class="muted">最近消费建议会保存在本机。</text>
          </view>
          <text class="link" @tap="navigateToRoute(routes.history)">全部</text>
        </view>
        <view v-if="recentReports.length" class="simple-list">
          <view v-for="item in recentReports" :key="item.id" class="simple-list-item" @tap="openReport(item.id)">
            <text class="simple-list-item__title">{{ item.productName || '未命名配料表' }}</text>
            <text class="simple-list-item__desc">{{ item.decision?.label || item.summarySentence }}</text>
          </view>
        </view>
        <view v-else class="home-empty">
          <text class="home-empty__title">还没有扫描记录</text>
          <text class="muted">拍一次商品或配料表，结果会保存在这里。</text>
        </view>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">常见避坑提示</text>
        <view class="simple-list">
          <view class="simple-list-item">
            <text class="simple-list-item__title">先看添加剂类别</text>
            <text class="simple-list-item__desc">防腐剂、甜味剂、色素、香精香料适合单独看一眼。</text>
          </view>
          <view class="simple-list-item">
            <text class="simple-list-item__title">再看糖、钠和脂肪</text>
            <text class="simple-list-item__desc">控糖、减脂、少盐目标下，营养成分表很关键。</text>
          </view>
        </view>
      </view>
    </AppCard>

    <view class="privacy-tip">
      <text class="privacy-tip__text">识别内容仅用于本次分析，历史记录可清除。</text>
      <text class="link" @tap="navigateToRoute(routes.settings)">设置</text>
    </view>

    <AppModal
      :open="targetGuideOpen"
      title="先设一个关注目标"
      message="控糖、减脂、少盐、儿童和过敏/忌口会影响结果页的提醒重点。你也可以先用默认目标扫描。"
      confirm-label="去设置"
      cancel-label="先扫描"
      variant="primary"
      @close="closeTargetGuide(false)"
      @confirm="closeTargetGuide(true)"
    />
  </view>
</template>

<style scoped>
.home-card--hero {
  border-color: rgba(18, 151, 128, 0.16);
  background:
    linear-gradient(160deg, rgba(238, 250, 245, 0.92), rgba(255, 255, 255, 0.96)),
    var(--surface);
}

.home-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
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

.home-hero__button {
  width: 100%;
}

.home-link-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.home-empty {
  border: 1px dashed var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-subtle);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.home-empty__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.privacy-tip {
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.62);
  padding: var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.privacy-tip__text {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}
</style>
