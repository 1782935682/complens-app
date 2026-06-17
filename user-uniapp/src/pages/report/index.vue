<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { buildReportShareMessage, enableWeixinShareMenu, shareReport } from '@/platform/share';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getReportById, getReports } from '@/stores/scanStore';
import type { AdditiveRecognition, IngredientMatch, LabelReport } from '@/types';
import { summarizeAdditiveRecognitions } from '@/utils/additiveRules';
import { buildAdditiveRecognitions, buildConsumerDecision, buildNutritionSnapshot } from '@/utils/decisionRules';

const report = ref<LabelReport | undefined>();
const selectedAdditive = ref<AdditiveRecognition | undefined>();
const attentionSettings = ref(getAttentionSettings());
const sourceOpen = ref(false);

const ingredients = computed(() => report.value?.ingredientSection.items ?? []);
const networkItems = computed(() => ingredients.value.filter((item) => isNetworkItem(item)));
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
const additiveSummaryText = computed(() => {
  const summary = additiveRecognition.value;
  if (!summary.total) return '暂未识别到明显食品添加剂。';
  return `识别到 ${summary.categoryCount} 类 ${summary.total} 种添加剂`;
});
const allergyWarnings = computed(() => decision.value?.allergyWarnings ?? []);
const analysisSource = computed(() => report.value?.analysisSource);

onLoad((query) => {
  enableWeixinShareMenu();
  attentionSettings.value = getAttentionSettings();
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : getReports()[0];
});

onShareAppMessage(() => buildReportShareMessage(report.value));

function isNetworkItem(item: IngredientMatch) {
  return Boolean(item.webSearchUrl || item.sourceType === 'web_search' || item.dataStatus === 'unknown_from_ocr');
}

async function shareCurrentReport() {
  if (!report.value) return;
  const ok = await shareReport(report.value);
  uni.showToast({ title: ok ? '已复制/分享摘要' : '分享失败', icon: 'none' });
}

function openAdditiveDetail(item: AdditiveRecognition) {
  selectedAdditive.value = item;
}

function nutritionLevelClass(level: string) {
  if (level === '较低') return 'low';
  if (level === '中等') return 'medium';
  if (level === '较高') return 'high';
  return 'missing';
}

</script>

<template>
  <view class="page page--calm page--with-action-bar stack">
    <EmptyState
      v-if="!report"
      title="没有找到结果"
      description="可能已被删除，或本机没有对应记录。"
      action-label="回到首页"
      @action="navigateToRoute(routes.home)"
    />

    <template v-else>
      <PageHeader
        title="消费建议"
        :subtitle="report.productName || '未命名食品'"
      />

      <AppCard v-if="allergyWarnings.length">
        <view class="allergy-alert">
          <text class="allergy-alert__title">过敏/忌口提醒</text>
          <text v-for="item in allergyWarnings" :key="item" class="allergy-alert__text">{{ item }}</text>
        </view>
      </AppCard>

      <AppCard>
        <view v-if="decision" class="result-hero" :class="`result-hero--${decision.level}`">
          <text class="result-hero__kicker">结论</text>
          <text class="result-hero__label">{{ decision.label }}</text>
          <text class="result-hero__text">{{ decision.summary }}</text>
          <view class="legend-row">
            <text v-for="tag in decision.tags.slice(0, 4)" :key="tag" class="legend-chip legend-chip--normal">{{ tag }}</text>
          </view>
        </view>
      </AppCard>

      <AppCard v-if="decision">
        <view class="stack">
          <text class="section-title">一句话建议</text>
          <text class="advice-text">{{ decision.summary }}</text>
        </view>
      </AppCard>

      <AppCard v-if="decision">
        <view class="stack">
          <text class="section-title">你需要留意的点</text>
          <view class="simple-list">
            <view v-for="(item, index) in decision.watchPoints" :key="item" class="simple-list-item">
              <text class="simple-list-item__title">{{ index + 1 }}. {{ item }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <view class="section-head">
            <view>
              <text class="section-title">添加剂识别</text>
              <text class="muted">{{ additiveSummaryText }}</text>
            </view>
          </view>
          <EmptyState
            v-if="!additiveRecognition.items.length"
            title="暂未识别到明显添加剂"
            description="如果配料表较短，这通常说明添加剂信息不多；仍建议结合包装原文确认。"
            action-label="重新拍摄"
            @action="navigateToRoute(routes.capture)"
          />
          <view v-else class="additive-list">
            <view
              v-for="item in additiveRecognition.items"
              :key="item.id"
              class="additive-card"
              :class="`additive-card--${item.displayLevel}`"
              @tap="openAdditiveDetail(item)"
            >
              <view class="additive-card__head">
                <text class="additive-card__name">{{ item.name }}</text>
                <text class="additive-card__category">{{ item.category }}</text>
              </view>
              <text class="additive-card__line">作用：{{ item.effect }}</text>
              <text class="additive-card__line">提醒：{{ item.reminder }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">营养快照</text>
          <view class="nutrition-snapshot">
            <view v-for="item in nutritionSnapshot" :key="item.key" class="nutrition-item">
              <view class="nutrition-item__head">
                <text class="nutrition-item__label">{{ item.label }}</text>
                <text class="nutrition-item__value">{{ item.valueText }}，{{ item.level }}</text>
              </view>
              <view class="nutrition-item__track">
                <view class="nutrition-item__bar" :class="`nutrition-item__bar--${nutritionLevelClass(item.level)}`" :style="{ width: `${item.percent}%` }" />
              </view>
              <text class="nutrition-item__note">{{ item.note }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard v-if="decision">
        <view class="decision-grid">
          <view class="decision-block">
            <text class="decision-block__title">适合谁</text>
            <text v-for="item in decision.suitableFor" :key="item" class="decision-block__line">{{ item }}</text>
          </view>
          <view class="decision-block decision-block--warm">
            <text class="decision-block__title">不适合谁</text>
            <text v-for="item in decision.lessSuitableFor" :key="item" class="decision-block__line">{{ item }}</text>
          </view>
        </view>
      </AppCard>

      <AppCard v-if="decision">
        <view class="stack">
          <text class="section-title">怎么选更合适</text>
          <view class="simple-list">
            <view v-for="item in decision.suggestions" :key="item" class="simple-list-item">
              <text class="simple-list-item__desc">{{ item }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard v-if="report.focusItems.length">
        <view class="stack">
          <text class="section-title">目标命中</text>
          <view class="simple-list">
            <view v-for="item in report.focusItems.slice(0, 5)" :key="item" class="simple-list-item">
              <text class="simple-list-item__title">{{ item }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">原始配料/营养信息</text>
          <view v-if="ingredients.length" class="ingredient-plain-list">
            <text v-for="item in ingredients" :key="item.id" class="ingredient-pill" :class="{ 'ingredient-pill--additive': item.isAdditive, 'ingredient-pill--network': isNetworkItem(item) }">{{ item.normalizedText }}</text>
          </view>
          <view v-if="visibleNutritionFields.length" class="simple-list">
            <view v-for="field in visibleNutritionFields" :key="field.key" class="simple-list-item">
              <text class="simple-list-item__title">{{ field.label }}：{{ field.value }}{{ field.unit }}</text>
            </view>
          </view>
          <text v-if="report.frontClaimsSection?.text" class="raw-text">{{ report.frontClaimsSection.text }}</text>
          <text v-if="report.rawText" class="raw-text">{{ report.rawText }}</text>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <view class="section-head">
            <view>
              <text class="section-title">本次分析依据</text>
              <text class="muted">{{ analysisSource?.description || '本次分析依据：用户确认后的包装文字。' }}</text>
            </view>
            <text class="link" @tap="sourceOpen = !sourceOpen">{{ sourceOpen ? '收起' : '展开' }}</text>
          </view>
          <view v-if="sourceOpen" class="simple-list">
            <view v-if="analysisSource" class="simple-list-item">
              <text class="simple-list-item__title">{{ analysisSource.sourceLabel }}</text>
              <text class="simple-list-item__desc">商品库：{{ analysisSource.fromProductLibrary ? '是' : '否' }}；用户拍摄：{{ analysisSource.fromUserCapture ? '是' : '否' }}；手动输入：{{ analysisSource.fromManualInput ? '是' : '否' }}</text>
              <text v-if="analysisSource.imageSummary" class="simple-list-item__desc">图片摘要：{{ analysisSource.imageSummary }}</text>
            </view>
            <view v-for="source in report.sources" :key="source.label" class="simple-list-item">
              <text class="simple-list-item__title">{{ source.label }}</text>
              <text class="simple-list-item__desc">{{ source.detail }}</text>
            </view>
            <text class="muted">本次建议基于包装文字、本机目标设置、添加剂识别、营养字段和本地规则生成。</text>
          </view>
          <text v-if="sourceOpen && networkItems.length" class="muted">有 {{ networkItems.length }} 个词需要结合包装原文或搜索线索核对。</text>
        </view>
      </AppCard>

      <view class="action-bar">
        <AppButton @click="shareCurrentReport">复制结果</AppButton>
        <AppButton variant="secondary" @click="navigateToRoute(routes.capture)">再扫一个</AppButton>
        <AppButton variant="text" @click="navigateToRoute(routes.home)">先放一边</AppButton>
      </view>

      <view v-if="selectedAdditive" class="sheet-mask" @tap="selectedAdditive = undefined">
        <view class="additive-sheet" @tap.stop>
          <text class="additive-sheet__title">{{ selectedAdditive.name }}</text>
          <text class="additive-sheet__tag">{{ selectedAdditive.category }}</text>
          <text class="additive-sheet__line">作用：{{ selectedAdditive.effect }}</text>
          <text class="additive-sheet__line">提醒：{{ selectedAdditive.reminder }}</text>
          <text v-for="note in selectedAdditive.targetNotes" :key="note" class="additive-sheet__line">当前目标：{{ note }}</text>
          <AppButton variant="secondary" @click="selectedAdditive = undefined">知道了</AppButton>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page--with-action-bar {
  padding-bottom: calc(112px + env(safe-area-inset-bottom));
}

.allergy-alert {
  border: 1px solid rgba(217, 107, 95, 0.28);
  border-radius: var(--radius-card);
  background: rgba(217, 107, 95, 0.1);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.allergy-alert__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.allergy-alert__text,
.advice-text {
  color: var(--text);
  font-size: var(--font-size-base);
  line-height: 1.65;
}

.result-hero {
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.result-hero--occasional {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.result-hero--daily_ok {
  background: rgba(18, 151, 128, 0.1);
  border: 1px solid rgba(18, 151, 128, 0.22);
}

.result-hero--caution {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.34);
}

.result-hero--alternative {
  background: rgba(217, 107, 95, 0.1);
  border: 1px solid rgba(217, 107, 95, 0.24);
}

.result-hero--insufficient {
  background: rgba(107, 114, 128, 0.08);
  border: 1px solid rgba(107, 114, 128, 0.18);
}

.result-hero__kicker {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
}

.result-hero__label {
  color: var(--text);
  font-size: var(--font-size-2xl);
  font-weight: 800;
  line-height: 1.2;
}

.result-hero__text {
  color: var(--text);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.result-hero__subhead {
  color: var(--muted);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.3;
}

.decision-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.decision-block {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: var(--radius-card);
  background: var(--primary-soft);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.decision-block--warm {
  border-color: rgba(216, 138, 36, 0.22);
  background: var(--accent-soft);
}

.decision-block__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.decision-block__line {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.additive-list,
.nutrition-snapshot,
.ingredient-plain-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.additive-card {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: var(--radius-card);
  background: var(--surface);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.additive-card--watch,
.additive-card--focus {
  border-color: rgba(216, 138, 36, 0.3);
  background: var(--accent-soft);
}

.additive-card__head,
.nutrition-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.additive-card__name,
.nutrition-item__label {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.additive-card__category {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 4px 10px;
  white-space: nowrap;
}

.additive-card__line,
.nutrition-item__note {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.nutrition-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-subtle);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nutrition-item__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.nutrition-item__track {
  height: 9px;
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.1);
  overflow: hidden;
}

.nutrition-item__bar {
  height: 100%;
  border-radius: 999px;
}

.nutrition-item__bar--low {
  background: var(--primary);
}

.nutrition-item__bar--medium {
  background: var(--status-warning);
}

.nutrition-item__bar--high {
  background: var(--accent);
}

.nutrition-item__bar--missing {
  background: var(--muted);
}

.ingredient-plain-list {
  flex-direction: row;
  flex-wrap: wrap;
}

.ingredient-pill {
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 5px 10px;
}

.ingredient-pill--additive {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
}

.ingredient-pill--network {
  background: rgba(14, 138, 150, 0.12);
  color: var(--status-info);
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 35;
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
  padding: var(--space-sm) var(--space-md) calc(var(--space-sm) + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-xs);
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  background: rgba(24, 33, 31, 0.38);
}

.additive-sheet {
  width: 100%;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  background: var(--surface);
  padding: var(--space-lg) var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.additive-sheet__title {
  color: var(--text);
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.additive-sheet__tag {
  align-self: flex-start;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 5px 10px;
}

.additive-sheet__line {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.chart-list,
.ingredient-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.chart-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.chart-row__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
}

.chart-row__label,
.chart-row__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.chart-row__track {
  height: 10px;
  border-radius: 999px;
  background: var(--surface-subtle);
  overflow: hidden;
}

.chart-row__bar {
  height: 100%;
  border-radius: 999px;
}

.chart-row__bar--normal {
  background: var(--primary);
}

.chart-row__bar--watch {
  background: var(--primary-strong);
}

.chart-row__bar--additive {
  background: var(--status-warning);
}

.chart-row__bar--network {
  background: var(--status-info);
}

.chart-row__bar--nutrition {
  background: var(--primary-bright);
}

.ingredient-row {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ingredient-row--normal {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.18);
}

.ingredient-row--additive {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
}

.ingredient-row--network {
  background: rgba(14, 138, 150, 0.08);
  border-color: rgba(14, 138, 150, 0.2);
}

.ingredient-row__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.ingredient-row__name {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.ingredient-row__tag {
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 4px 10px;
  white-space: nowrap;
}

.ingredient-row__note {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.ingredient-explain {
  border: 1px solid rgba(18, 151, 128, 0.18);
  border-radius: var(--radius-card);
  background: var(--primary-soft);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ingredient-explain__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.ingredient-explain__text {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.legend-chip {
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 5px 10px;
}

.legend-chip--normal {
  background: rgba(34, 197, 94, 0.12);
  color: var(--primary-strong);
}

.legend-chip--additive {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
}

.legend-chip--network {
  background: rgba(14, 138, 150, 0.12);
  color: var(--status-info);
}

.raw-text {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  padding: var(--space-md);
  word-break: break-word;
}
</style>
