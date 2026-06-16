<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { getReportById, getReports } from '@/stores/scanStore';
import type { LabelReport } from '@/types';

type QueryMap = Record<string, unknown>;
type MetricWinner = 'left' | 'right' | 'tie';

interface CompareMetric {
  label: string;
  leftText: string;
  rightText: string;
  winner: MetricWinner;
  note: string;
}

const reports = ref<LabelReport[]>([]);
const leftId = ref('');
const rightId = ref('');

function getQueryValue(raw: QueryMap, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value : '';
}

function hydrateReportIds() {
  const items = reports.value;
  if (!items.length) {
    leftId.value = '';
    rightId.value = '';
    return;
  }

  if (!items.some((report) => report.id === leftId.value)) {
    leftId.value = items[0].id;
  }

  if (!items.some((report) => report.id === rightId.value) || rightId.value === leftId.value) {
    rightId.value = items.find((report) => report.id !== leftId.value)?.id ?? '';
  }
}

function pickReportId(targetId: string, fallbackExcludeId?: string): string {
  if (!targetId) return '';
  const direct = getReportById(targetId);
  if (direct) return direct.id;
  if (fallbackExcludeId) {
    return getReports().find((report) => report.id !== fallbackExcludeId)?.id ?? '';
  }
  return '';
}

function normalizeNumeric(value: string): number | null {
  const matched = String(value).match(/-?\d+(?:\.\d+)?/);
  return matched ? Number.parseFloat(matched[0]) : null;
}

function pickReportById(id: string): LabelReport | undefined {
  return reports.value.find((report) => report.id === id);
}

function parseNutrition(report: LabelReport | undefined, key: 'sugar' | 'sodium' | 'energy') {
  if (!report) return { value: null, text: '未提供' };
  const field = report.nutritionSection.fields.find((item) => item.key === key);
  if (!field) return { value: null, text: '未提供' };
  const parsed = normalizeNumeric(field.value);
  const unit = field.unit ? field.unit : '';
  const suffix = unit && !field.value.includes(unit) ? unit : '';
  const nrv = field.nrvPercent?.trim();
  const valueText = `${field.value}${suffix}`.trim() || '未提供';
  return {
    value: parsed,
    text: nrv ? `${valueText}（NRV ${nrv}）` : valueText
  };
}

function buildMetric(
  label: string,
  leftText: string,
  rightText: string,
  leftScore: number | null,
  rightScore: number | null,
  lowerIsBetter: boolean,
  baseNote: string
): CompareMetric {
  let winner: MetricWinner = 'tie';
  if (leftScore !== null && rightScore !== null && leftScore !== rightScore) {
    if (lowerIsBetter) {
      winner = leftScore < rightScore ? 'left' : 'right';
    } else {
      winner = leftScore > rightScore ? 'left' : 'right';
    }
  }

  const note = baseNote ? `${baseNote}` : '如数值缺失则仅做信息展示，不作结论。';
  return {
    label,
    leftText,
    rightText,
    winner,
    note
  };
}

function loadReportList() {
  reports.value = getReports();
  hydrateReportIds();
}

onLoad((query = {}) => {
  reports.value = getReports();
  const rawQuery = query as QueryMap;
  const providedLeft = getQueryValue(rawQuery, 'left') || getQueryValue(rawQuery, 'a') || getQueryValue(rawQuery, 'id');
  const providedRight = getQueryValue(rawQuery, 'right') || getQueryValue(rawQuery, 'b');
  if (providedLeft) {
    leftId.value = pickReportId(providedLeft);
  }
  if (providedRight) {
    rightId.value = pickReportId(providedRight, leftId.value);
  }
  hydrateReportIds();
});

onShow(loadReportList);

watch([leftId, rightId, reports], hydrateReportIds, { deep: true });

const reportPickerOptions = computed(() =>
  reports.value.map((report, index) => `${index + 1}. ${report.productName}（${new Date(report.createdAt).toLocaleDateString()}）`)
);

const leftReport = computed(() => pickReportById(leftId.value));
const rightReport = computed(() => pickReportById(rightId.value));

const canCompare = computed(() => leftReport.value !== undefined && rightReport.value !== undefined && leftId.value !== rightId.value);

const leftPickerIndex = computed(() => {
  const found = reports.value.findIndex((report) => report.id === leftId.value);
  return found >= 0 ? found : 0;
});

const rightPickerIndex = computed(() => {
  const found = reports.value.findIndex((report) => report.id === rightId.value);
  return found >= 0 ? found : 0;
});

function toTopItems(label: string, values: string[]): string {
  if (!values.length) return `${label}未提取到关键匹配结果`;
  return values.slice(0, 3).join(' / ');
}

function onLeftSelect(event: { detail: { value: number } }) {
  const index = Number(event.detail.value);
  const target = reports.value[index];
  if (target) {
    leftId.value = target.id;
  }
}

function onRightSelect(event: { detail: { value: number } }) {
  const index = Number(event.detail.value);
  const target = reports.value[index];
  if (target) {
    rightId.value = target.id;
  }
}

function winnerText(metric: CompareMetric): string {
  if (metric.winner === 'left') return '偏向左侧';
  if (metric.winner === 'right') return '偏向右侧';
  return '信息接近';
}

const compareRows = computed<CompareMetric[]>(() => {
  if (!canCompare.value || !leftReport.value || !rightReport.value) return [];
  const left = leftReport.value;
  const right = rightReport.value;

  const leftSugar = parseNutrition(left, 'sugar');
  const rightSugar = parseNutrition(right, 'sugar');
  const leftSodium = parseNutrition(left, 'sodium');
  const rightSodium = parseNutrition(right, 'sodium');
  const leftEnergy = parseNutrition(left, 'energy');
  const rightEnergy = parseNutrition(right, 'energy');

  const leftPossibleChecks = left.nutritionIngredientChecks?.filter((item) => item.state === 'possible_issue').length ?? 0;
  const rightPossibleChecks = right.nutritionIngredientChecks?.filter((item) => item.state === 'possible_issue').length ?? 0;

  return [
    buildMetric(
      '配料项数量',
      `${left.ingredientSection.total} 项`,
      `${right.ingredientSection.total} 项`,
      left.ingredientSection.total,
      right.ingredientSection.total,
      true,
      '配料项更少时，逐项复核通常更清晰。'
    ),
    buildMetric(
      '添加剂相关条目',
      `${left.ingredientSection.additiveCount} 项`,
      `${right.ingredientSection.additiveCount} 项`,
      left.ingredientSection.additiveCount,
      right.ingredientSection.additiveCount,
      true,
      '添加剂项数更少表示可快速缩短“逐项核对”关注链路。'
    ),
    buildMetric(
      '关注项命中',
      `${left.attentionHits.length} 项`,
      `${right.attentionHits.length} 项`,
      left.attentionHits.length,
      right.attentionHits.length,
      true,
      '关注项更少通常意味着可先从低关注项开始核对。'
    ),
    buildMetric(
      '未识别/暂未收录',
      `${left.unknownItems.length} 项`,
      `${right.unknownItems.length} 项`,
      left.unknownItems.length,
      right.unknownItems.length,
      true,
      '暂未识别项更多的一侧，建议先核对原文和拍摄清晰度。'
    ),
    buildMetric(
      '营养核对：待复核信号（糖/钠）',
      `${leftPossibleChecks} 项`,
      `${rightPossibleChecks} 项`,
      leftPossibleChecks,
      rightPossibleChecks,
      true,
      '该值越少，通常意味着标称与配料线索不易出现信息缺口。'
    ),
    buildMetric(
      '糖（标称）',
      leftSugar.text,
      rightSugar.text,
      leftSugar.value,
      rightSugar.value,
      true,
      '仅做标签对比提示，较低值可作为“低糖关注”侧重参考。'
    ),
    buildMetric(
      '钠（标称）',
      leftSodium.text,
      rightSodium.text,
      leftSodium.value,
      rightSodium.value,
      true,
      '仅做标签对比提示，较低值可作为“低钠关注”侧重参考。'
    ),
    buildMetric(
      '热量（标称）',
      leftEnergy.text,
      rightEnergy.text,
      leftEnergy.value,
      rightEnergy.value,
      true,
      '仅用于主观标签对比，建议结合人群需求自行权衡。'
    )
  ];
});

const preferenceNotes = computed(() => {
  if (!compareRows.value.length) return [];
  const notes = compareRows.value
    .filter((metric) => metric.winner !== 'tie')
    .map((metric) => `${metric.label}：${winnerText(metric)}，${metric.note}`);
  if (!notes.length) {
    return ['两份报告在抽取指标上接近，建议结合包装原文逐项确认后再决定。'];
  }
  return notes;
});
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">两款商品 Compare Mode</text>
      <text class="page-subtitle">并排对比两份历史解读结果，支持“偏向提示”，信息不足时建议先补拍或结合原文确认。</text>
    </view>

    <EmptyState
      v-if="!reports.length"
      icon="📄"
      title="暂无历史报告"
      description="请先完成一次食品标签解读，保存到本地历史后再使用对比。"
      action-label="去拍照解读"
      @action="navigateToRoute(routes.capture)"
    />

    <template v-else>
      <AppCard>
        <view class="stack">
          <text class="section-title">选择对比对象</text>
          <view class="compare-selector-grid">
            <view class="compare-selector-item">
              <text class="compare-selector-item__label">左侧商品</text>
              <picker mode="selector" :range="reportPickerOptions" :value="leftPickerIndex" @change="onLeftSelect">
                <view class="compare-selector">
                  <text>{{ leftReport?.productName || '选择左侧报告' }}</text>
                  <text v-if="leftReport" class="compare-selector__meta">{{ new Date(leftReport.createdAt).toLocaleDateString() }} / {{ leftReport.title }}</text>
                </view>
              </picker>
            </view>
            <view class="compare-selector-item">
              <text class="compare-selector-item__label">右侧商品</text>
              <picker mode="selector" :range="reportPickerOptions" :value="rightPickerIndex" @change="onRightSelect">
                <view class="compare-selector">
                  <text>{{ rightReport?.productName || '选择右侧报告' }}</text>
                  <text v-if="rightReport" class="compare-selector__meta">{{ new Date(rightReport.createdAt).toLocaleDateString() }} / {{ rightReport.title }}</text>
                </view>
              </picker>
            </view>
          </view>
          <AppButton v-if="!canCompare" variant="secondary" @click="navigateToRoute(routes.history)">去历史补齐对比项</AppButton>
        </view>
      </AppCard>

      <EmptyState
        v-if="!canCompare"
        icon="⚖️"
        title="请先选择两份不同报告"
        description="选择不同的左右商品后，指标会自动刷新并给出偏向提示。"
        action-label="打开历史选择"
        @action="navigateToRoute(routes.history)"
      />

      <template v-if="canCompare && leftReport && rightReport">
        <view class="compare-panels">
          <AppCard>
            <view class="compare-panel">
              <text class="compare-panel__title">左侧商品（A）</text>
              <text class="compare-panel__product">{{ leftReport.productName }}</text>
              <text class="compare-panel__summary">{{ leftReport.summarySentence }}</text>
              <view class="compare-panel__grid">
                <text>配料项：{{ leftReport.ingredientSection.total }}</text>
                <text>添加剂：{{ leftReport.ingredientSection.additiveCount }}</text>
                <text>关注项：{{ leftReport.attentionHits.length }}</text>
                <text>暂未识别：{{ leftReport.unknownItems.length }}</text>
                <text>可疑营养核对：{{ leftReport.nutritionIngredientChecks?.filter((item) => item.state === 'possible_issue').length || 0 }}</text>
              </view>
              <text class="section-title compare-panel__subtitle">关注点预览</text>
              <text class="muted">{{ toTopItems('关注项', leftReport.attentionHits.map((hit) => hit.label)) }}</text>
              <text class="muted">{{ toTopItems('营养核对线索', leftReport.nutritionIngredientChecks?.map((item) => item.title) || []) }}</text>
            </view>
          </AppCard>

          <AppCard>
            <view class="compare-panel">
              <text class="compare-panel__title">右侧商品（B）</text>
              <text class="compare-panel__product">{{ rightReport.productName }}</text>
              <text class="compare-panel__summary">{{ rightReport.summarySentence }}</text>
              <view class="compare-panel__grid">
                <text>配料项：{{ rightReport.ingredientSection.total }}</text>
                <text>添加剂：{{ rightReport.ingredientSection.additiveCount }}</text>
                <text>关注项：{{ rightReport.attentionHits.length }}</text>
                <text>暂未识别：{{ rightReport.unknownItems.length }}</text>
                <text>可疑营养核对：{{ rightReport.nutritionIngredientChecks?.filter((item) => item.state === 'possible_issue').length || 0 }}</text>
              </view>
              <text class="section-title compare-panel__subtitle">关注点预览</text>
              <text class="muted">{{ toTopItems('关注项', rightReport.attentionHits.map((hit) => hit.label)) }}</text>
              <text class="muted">{{ toTopItems('营养核对线索', rightReport.nutritionIngredientChecks?.map((item) => item.title) || []) }}</text>
            </view>
          </AppCard>
        </view>

        <AppCard>
          <view class="stack">
            <text class="section-title">指标并排对比</text>
            <view class="compare-metric-grid">
              <text class="compare-grid-header">对比项</text>
              <text class="compare-grid-header">左侧（A）</text>
              <text class="compare-grid-header">右侧（B）</text>

              <template v-for="metric in compareRows" :key="metric.label">
                <text class="compare-metric-label">{{ metric.label }}</text>
                <text class="compare-metric-cell" :class="{ 'compare-metric-cell--highlight': metric.winner === 'left' }">
                  {{ metric.leftText }}
                </text>
                <text class="compare-metric-cell" :class="{ 'compare-metric-cell--highlight': metric.winner === 'right' }">
                  {{ metric.rightText }}
                </text>
              </template>
            </view>
          </view>
        </AppCard>

        <AppCard>
          <view class="stack">
            <text class="section-title">偏向提示</text>
            <text class="muted">以下偏向为“标签对比优先级提示”，仅用于拍照解读后的下一步核对决策，不构成权威结论。</text>
            <view v-for="note in preferenceNotes" :key="note" class="compare-note">
              <text>{{ note }}</text>
            </view>
          </view>
        </AppCard>

        <view class="stack">
          <AppButton @click="navigateToRoute(`${routes.report}?id=${encodeURIComponent(leftReport.id)}`)">打开左侧报告</AppButton>
          <AppButton variant="secondary" @click="navigateToRoute(`${routes.report}?id=${encodeURIComponent(rightReport.id)}`)">打开右侧报告</AppButton>
          <AppButton variant="text" @click="navigateToRoute(routes.history)">回到历史</AppButton>
        </view>
      </template>
    </template>
  </view>
</template>

<style scoped>
.compare-selector-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compare-selector-item__label {
  color: var(--muted);
  display: inline-block;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-xs);
}

.compare-selector {
  align-items: flex-start;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 72px;
  padding: var(--space-md);
}

.compare-selector::after {
  border: 0;
}

.compare-selector__meta {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.compare-panels {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compare-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.compare-panel__title {
  color: var(--muted);
  font-size: var(--font-size-sm);
}

.compare-panel__product {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.compare-panel__summary {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.compare-panel__grid {
  display: grid;
  font-size: var(--font-size-sm);
  gap: var(--space-xs);
}

.compare-panel__subtitle {
  color: var(--muted);
  font-size: var(--font-size-sm);
}

.compare-metric-grid {
  display: grid;
  gap: var(--space-sm) var(--space-md);
  grid-template-columns: 1.6fr 1fr 1fr;
}

.compare-grid-header {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.compare-metric-label {
  color: var(--text);
  font-size: var(--font-size-sm);
  padding: 6px 0;
}

.compare-metric-cell {
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text);
  display: flex;
  font-size: var(--font-size-sm);
  justify-content: center;
  min-height: 40px;
  padding: 0 var(--space-xs);
  text-align: center;
}

.compare-metric-cell--highlight {
  border-color: var(--primary);
  color: var(--primary-strong);
  font-weight: 800;
}

.compare-note {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  padding: var(--space-sm);
}

@media (max-width: 640px) {
  .compare-selector-grid,
  .compare-panels {
    grid-template-columns: minmax(0, 1fr);
  }

  .compare-grid-header,
  .compare-metric-label {
    font-size: 11px;
  }
}
</style>
