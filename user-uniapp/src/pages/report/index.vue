<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { allergenOptions, childrenModeKeywords, primaryGoalOptions } from '@/constants/attention';
import { routes, navigateToRoute } from '@/constants/routes';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getReportById, getReports, resetScanDraft } from '@/stores/scanStore';
import type { AdditiveRecognition, IngredientMatch, LabelReport } from '@/types';
import { summarizeAdditiveRecognitions } from '@/utils/additiveRules';
import { buildAdditiveRecognitions, buildConsumerDecision, buildNutritionSnapshot } from '@/utils/decisionRules';

const report = ref<LabelReport | undefined>();
const attentionSettings = ref(getAttentionSettings());
const rawTextOpen = ref(false);

const ingredients = computed(() => report.value?.ingredientSection.items ?? []);
const visibleNutritionFields = computed(() => report.value?.nutritionSection.fields.filter((item) => item.value.trim()) ?? []);
const additiveRecognition = computed(() => {
  if (!report.value) return { total: 0, categoryCount: 0, items: [] as AdditiveRecognition[] };
  return report.value.additiveRecognition?.items?.length
    ? report.value.additiveRecognition
    : summarizeAdditiveRecognitions(buildAdditiveRecognitions(report.value, attentionSettings.value));
});
const nutritionSnapshot = computed(() => {
  if (!report.value) return [];
  return report.value.nutritionSnapshot?.length
    ? report.value.nutritionSnapshot
    : buildNutritionSnapshot(report.value.nutritionSection.fields, attentionSettings.value);
});
const decision = computed(() => {
  if (!report.value) return undefined;
  return buildConsumerDecision({
    ...report.value,
    additiveRecognition: additiveRecognition.value,
    nutritionSnapshot: nutritionSnapshot.value
  }, attentionSettings.value);
});
const overallLabel = computed(() => {
  const level = decision.value?.level;
  if (level === 'daily_ok') return '适合日常食用';
  if (level === 'alternative') return '不建议频繁食用';
  return '需要注意';
});
const allergyWarnings = computed(() => decision.value?.allergyWarnings ?? []);
const visibleWatchPoints = computed(() => decision.value?.watchPoints.slice(0, 5) ?? []);
const additiveSummaryText = computed(() => {
  const summary = additiveRecognition.value;
  if (!summary.total) return '暂未识别到明显食品添加剂。';
  return `识别到 ${summary.categoryCount} 类 ${summary.total} 种添加剂。`;
});
const reminderItems = computed(() => [
  buildReminderItem('糖', 'sugar', /糖|甜味剂|糖浆|碳水/),
  buildReminderItem('钠', 'sodium', /钠|盐|味精/),
  buildReminderItem('脂肪', 'fat', /脂肪|油脂|能量|热量/),
  {
    label: '添加剂',
    value: additiveSummaryText.value
  },
  {
    label: '过敏原',
    value: allergyWarnings.value.length
      ? allergyWarnings.value.join('；')
      : (report.value?.allergenHints?.length ? report.value.allergenHints.join('；') : '暂未命中已配置的过敏 / 忌口。')
  }
]);
const personalHits = computed(() => buildPersonalHits());
const rawLabelText = computed(() => report.value?.rawText || report.value?.analysisSource?.ocrText || '');
const sourceImagePath = computed(() => report.value?.analysisSource?.imagePath || '');

onLoad((query) => {
  attentionSettings.value = getAttentionSettings();
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : getReports()[0];
});

function buildReminderItem(label: string, key: string, pattern: RegExp) {
  const nutrition = nutritionSnapshot.value.find((item) => item.key === key);
  if (nutrition?.valueText && nutrition.level !== '未识别') {
    return { label, value: `${nutrition.valueText}，${nutrition.level}。${nutrition.note}` };
  }
  const text = collectDecisionText();
  return {
    label,
    value: pattern.test(text) ? '识别到相关提醒，建议结合包装原文查看。' : '暂未识别到明显相关提醒。'
  };
}

function buildPersonalHits(): string[] {
  const hits: string[] = [];
  const text = collectReportText();
  const goal = primaryGoalOptions.find((item) => item.key === attentionSettings.value.primaryGoal) || primaryGoalOptions[0];
  if (goal.key === 'daily' || goal.keywords.some((keyword) => text.includes(keyword))) {
    hits.push(`关注目标命中：${goal.label}`);
  }
  if (attentionSettings.value.isChildrenMode) {
    const matched = childrenModeKeywords.filter((keyword) => text.includes(keyword)).slice(0, 4);
    hits.push(matched.length ? `儿童模式提醒：${matched.join('、')}` : '儿童模式提醒：已按儿童模式优先排序。');
  }
  const allergenHits = allergenOptions
    .filter((item) => attentionSettings.value.allergens.includes(item.key))
    .filter((item) => item.keywords.some((keyword) => text.includes(keyword)))
    .map((item) => item.label);
  if (allergenHits.length) hits.push(`过敏 / 忌口提醒：${allergenHits.join('、')}`);
  return hits;
}

function collectDecisionText(): string {
  const value = decision.value;
  return [
    value?.summary,
    ...(value?.tags || []),
    ...(value?.watchPoints || []),
    ...(value?.reasons || [])
  ].filter(Boolean).join(' ');
}

function collectReportText(): string {
  const value = report.value;
  return [
    collectDecisionText(),
    value?.rawText,
    value?.analysisSource?.ingredientText,
    value?.analysisSource?.nutritionText,
    value?.analysisSource?.allergenText,
    ...ingredients.value.map((item) => `${item.normalizedText} ${item.ingredientName || ''}`)
  ].filter(Boolean).join(' ');
}

function ingredientType(item: IngredientMatch): string {
  if (item.isAdditive) return '添加剂';
  if (item.dataStatus === 'unknown_from_ocr') return '待核对';
  return '配料';
}

function retryScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}
</script>

<template>
  <view class="page page--report">
    <EmptyState
      v-if="!report"
      title="没有找到结果"
      description="可能已被删除，或本机没有对应结果。"
      action-label="回到首页"
      @action="navigateToRoute(routes.home)"
    />

    <template v-else>
      <view class="report-stack">
        <view class="scan-meta">
          <image v-if="sourceImagePath" class="scan-meta__image" :src="sourceImagePath" mode="aspectFill" />
          <view v-else class="scan-meta__placeholder" />
          <view class="scan-meta__copy">
            <text class="scan-meta__title">本次识别标签</text>
            <text class="scan-meta__desc">{{ report.analysisSource?.sourceLabel || '食品标签文字' }}</text>
          </view>
        </view>

        <AppCard class="report-card report-card--overall" :class="`report-card--${decision?.level || 'caution'}`">
          <view class="report-section">
            <text class="section-title">整体判断</text>
            <text class="overall-label">{{ overallLabel }}</text>
            <text v-if="decision" class="section-text">{{ decision.summary }}</text>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <text class="section-title">重点提醒</text>
            <view class="reminder-chip-list">
              <text v-for="item in reminderItems" :key="item.label" class="reminder-chip">{{ item.label }}</text>
            </view>
            <view class="reminder-copy-list">
              <text v-for="item in reminderItems" :key="`${item.label}-copy`" class="reminder-copy">{{ item.label }}：{{ item.value }}</text>
            </view>
            <view v-if="visibleWatchPoints.length" class="watch-list">
              <text v-for="item in visibleWatchPoints" :key="item" class="watch-pill">{{ item }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <text class="section-title">命中个人关注</text>
            <view v-if="personalHits.length" class="simple-list">
              <text v-for="item in personalHits" :key="item" class="hit-pill">{{ item }}</text>
            </view>
            <text v-else class="section-text">当前没有命中已配置的个人关注项。</text>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <text class="section-title">配料解读</text>
            <view v-if="ingredients.length" class="ingredient-list">
              <view v-for="item in ingredients" :key="item.id" class="ingredient-row">
                <view class="ingredient-row__head">
                  <text class="ingredient-row__name">{{ item.ingredientName || item.normalizedText }}</text>
                  <text class="ingredient-row__type">{{ ingredientType(item) }}</text>
                </view>
                <text class="section-text">{{ item.sourceNote || item.dataStatusLabel }}</text>
              </view>
            </view>
            <text v-else class="section-text">暂未识别到清晰配料表。</text>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <text class="section-title">营养成分解读</text>
            <view v-if="visibleNutritionFields.length" class="nutrition-list">
              <view v-for="field in visibleNutritionFields" :key="field.key" class="nutrition-row">
                <text class="nutrition-row__label">{{ field.label }}</text>
                <text class="nutrition-row__value">{{ field.value }}{{ field.unit }}</text>
              </view>
            </view>
            <text v-else class="section-text">暂未识别到营养成分字段。</text>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <text class="section-title">建议</text>
            <view v-if="decision?.suggestions.length" class="simple-list">
              <text v-for="item in decision.suggestions" :key="item" class="section-text">• {{ item }}</text>
            </view>
            <text v-else class="section-text">建议结合包装原文和个人情况查看。</text>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <view class="section-head">
              <text class="section-title">识别到的标签文字</text>
              <text class="link" @tap="rawTextOpen = !rawTextOpen">{{ rawTextOpen ? '收起' : '展开' }}</text>
            </view>
            <text v-if="rawTextOpen && rawLabelText" class="raw-text">{{ rawLabelText }}</text>
            <text v-else-if="rawTextOpen" class="section-text">暂无可展示的 OCR 原文。</text>
          </view>
        </AppCard>
      </view>

      <view class="action-bar">
        <AppButton @click="retryScan">重新拍照</AppButton>
        <AppButton variant="secondary" @click="navigateToRoute(routes.home)">返回首页</AppButton>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page--report {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  background: var(--bg);
}

.report-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.scan-meta {
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  padding: 0 4rpx 8rpx;
}

.scan-meta__image,
.scan-meta__placeholder {
  width: 104rpx;
  height: 104rpx;
  border-radius: 14rpx;
  background: var(--surface-subtle);
  border: 1px solid var(--line);
}

.scan-meta__placeholder {
  background:
    linear-gradient(90deg, transparent 45%, rgba(18, 151, 128, 0.14) 45%, rgba(18, 151, 128, 0.14) 55%, transparent 55%),
    linear-gradient(0deg, transparent 45%, rgba(18, 151, 128, 0.14) 45%, rgba(18, 151, 128, 0.14) 55%, transparent 55%),
    var(--primary-soft);
}

.scan-meta__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-meta__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.3;
}

.scan-meta__desc {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.report-card {
  border-radius: 24rpx;
}

.report-card--overall {
  border-color: rgba(18, 151, 128, 0.14);
  background: linear-gradient(135deg, rgba(238, 250, 245, 0.96), #ffffff);
}

.report-card--alternative,
.report-card--caution,
.report-card--occasional {
  border-color: rgba(216, 138, 36, 0.24);
  background: linear-gradient(135deg, #fff8ec, #ffffff);
}

.report-section,
.simple-list,
.ingredient-list,
.nutrition-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.overall-label {
  color: #f15a24;
  font-size: var(--font-size-2xl);
  font-weight: 900;
  line-height: 1.2;
}

.report-card--daily_ok .overall-label {
  color: var(--primary-strong);
}

.section-text {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.65;
}

.reminder-chip-list,
.reminder-copy-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.reminder-copy-list {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 6px;
}

.reminder-chip {
  border-radius: 999px;
  background: #fff0e4;
  color: #f15a24;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
  padding: 6px 12px;
}

.reminder-chip:nth-child(2),
.reminder-chip:nth-child(5) {
  background: #eaf7ff;
  color: #1677a3;
}

.reminder-chip:nth-child(3) {
  background: #fff7d7;
  color: #b77905;
}

.reminder-copy {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.watch-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.watch-pill {
  border-radius: 999px;
  background: #fff2df;
  color: #c06419;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.3;
  padding: 6px 10px;
}

.hit-pill {
  align-self: flex-start;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
  padding: 6px 12px;
}

.ingredient-row {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface-subtle);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ingredient-row__head,
.nutrition-row,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.ingredient-row__name,
.nutrition-row__label {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.35;
}

.ingredient-row__type {
  border-radius: 999px;
  background: var(--surface);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 4px 10px;
  white-space: nowrap;
}

.nutrition-row {
  border-bottom: 1px solid var(--line);
  padding: 10px 0;
}

.nutrition-row:last-child {
  border-bottom: 0;
}

.nutrition-row__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.35;
}

.raw-text {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  padding: var(--space-md);
  word-break: break-word;
}

.action-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 35;
  width: 100%;
  max-width: 480px;
  transform: translateX(-50%);
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
  padding: var(--space-sm) 32rpx calc(var(--space-sm) + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.action-bar :deep(.app-button) {
  width: 100%;
}
</style>
