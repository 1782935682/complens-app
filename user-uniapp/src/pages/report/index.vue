<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import IngredientChip from '@/components/IngredientChip.vue';
import ReportSummaryCard from '@/components/ReportSummaryCard.vue';
import SourceBadge from '@/components/SourceBadge.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { childGuardCategories, type ChildGuardCategory } from '@/constants/childGuard';
import { shareReport } from '@/platform/share';
import { getReportById, getReports } from '@/stores/scanStore';
import type { IngredientMatch, LabelReport, NutritionField } from '@/types';

const report = ref<LabelReport | undefined>();
const showSources = ref(false);
const isChildCareMode = ref(false);
const sourceButtonLabel = computed(() => showSources.value ? '收起查看依据' : '查看数据来源和依据');
const nutritionFieldsWithValues = computed(() => report.value?.nutritionSection.fields.filter((field) => field.value.trim()) ?? []);
const nutritionIngredientChecks = computed(() => report.value?.nutritionIngredientChecks ?? []);
type ChildGuardMatch = {
  itemId: string;
  categoryKey: ChildGuardCategory['key'];
  categoryLabel: string;
  name: string;
  matchedTerms: string[];
};
type QuickSignal = {
  tone: 'high' | 'medium' | 'low';
  label: string;
  reason: string;
};

function normalize(text: string) {
  return String(text || '').replace(/\s+/g, '').toLowerCase();
}

function toggleChildCareMode() {
  isChildCareMode.value = !isChildCareMode.value;
}

const childGuardMatches = computed<ChildGuardMatch[]>(() => {
  if (!report.value) return [];
  const matches: ChildGuardMatch[] = [];
  for (const item of report.value.ingredientSection.items) {
    const itemText = normalize(item.normalizedText);
    for (const category of childGuardCategories) {
      const matchedTerms = category.terms.filter((term) => itemText.includes(normalize(term)));
      if (!matchedTerms.length) continue;
      matches.push({
        itemId: item.id,
        categoryKey: category.key,
        categoryLabel: category.label,
        name: item.normalizedText,
        matchedTerms
      });
    }
  }
  return matches;
});

const childGuardSections = computed(() => {
  const grouped = childGuardCategories.map((category) => ({
    key: category.key,
    label: category.label,
    items: new Set<string>(),
    matchedTerms: new Set<string>()
  }));
  const groupByKey = Object.fromEntries(grouped.map((group) => [group.key, group])) as Record<
    ChildGuardCategory['key'],
    {
      key: ChildGuardCategory['key'];
      label: string;
      items: Set<string>;
      matchedTerms: Set<string>;
    }
  >;

  for (const match of childGuardMatches.value) {
    const group = groupByKey[match.categoryKey];
    if (!group) continue;
    group.items.add(match.name);
    match.matchedTerms.forEach((term) => group.matchedTerms.add(term));
  }

  return grouped
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: [...group.items].sort((a, b) => a.localeCompare(b)),
      terms: [...group.matchedTerms].sort((a, b) => a.localeCompare(b))
    }))
    .filter((group) => group.items.length);
});

const childGuardComplexityWarning = computed(() => {
  const ids = new Set<string>();
  for (const match of childGuardMatches.value) {
    if (match.categoryKey === 'preservative' || match.categoryKey === 'sweetener') {
      ids.add(match.itemId);
    }
  }
  if (ids.size < 3) return '';
  return '当前报告命中较多防腐剂/甜味剂相关成分，建议结合包装原文逐项确认。';
});

const quickSignal = computed<QuickSignal>(() => {
  if (isChildCareMode.value && report.value) {
    if (!childGuardMatches.value.length) {
      return {
        tone: 'low',
        label: '信息不足',
        reason: '当前文本未命中可关注的育儿守护成分，信息不足请补充照片。'
      };
    }
    if (childGuardComplexityWarning.value) {
      return {
        tone: 'high',
        label: '建议关注',
        reason: `${childGuardMatches.value.length} 项儿童关注成分命中较多，需结合包装原文确认。`
      };
    }
    return {
      tone: 'medium',
      label: '可能关注',
      reason: `育儿守护已开启，命中 ${childGuardMatches.value.length} 项可关注成分，需结合包装原文确认。`
    };
  }

  if (!report.value) {
    return {
      tone: 'medium',
      label: '信息不足',
      reason: '请重新生成报告并检查信息完整性。'
    };
  }

  if (report.value.attentionHits.length >= 2 || report.value.additiveGroups.length >= 2) {
    return {
      tone: 'high',
      label: '建议关注',
      reason: '当前文本命中较多重点项，建议结合包装原文逐项复查。'
    };
  }

  if (report.value.unknownItems.length > 0 || (!report.value.ingredientSection.total && !nutritionFieldsWithValues.value.length)) {
    return {
      tone: 'low',
      label: '信息不足',
      reason: '配料或营养信息未完全覆盖，建议补拍或补充文本继续确认。'
    };
  }

  return {
    tone: 'medium',
    label: '可能关注',
    reason: '已完成主要解析，可先看关注项与重点营养项。'
  };
});

const matchOverview = computed(() => {
  if (!report.value) {
    return { confirmed: 0, pending: 0, unmatched: 0, unknown: 0, total: 0 };
  }

  let confirmed = 0;
  let pending = 0;
  let unmatched = 0;

  for (const item of report.value.ingredientSection.items) {
    if (item.decision === 'confirmed') {
      confirmed += 1;
      continue;
    }
    if (item.decision === 'rejected') {
      unmatched += 1;
      continue;
    }

    if (item.decision === 'pending') {
      if (item.dataStatus === 'unknown_from_ocr') {
        unmatched += 1;
      } else {
        pending += 1;
      }
      continue;
    }

    if (item.ingredientId || ['verified_regulation', 'verified_jecfa', 'common_ingredient'].includes(item.dataStatus)) {
      confirmed += 1;
      continue;
    }

    if (item.dataStatus === 'unknown_from_ocr') {
      unmatched += 1;
    } else {
      pending += 1;
    }
  }

  return {
    confirmed,
    pending,
    unmatched,
    unknown: report.value.unknownItems.length,
    total: report.value.ingredientSection.items.length
  };
});

function openIngredientDetail(item: IngredientMatch) {
  const ingredientId = item.ingredientId;
  if (!ingredientId) {
    uni.showToast({
      title: '该项暂无可复用成分 ID，请先在搜索页确认后查看。',
      icon: 'none'
    });
    return;
  }
  navigateToRoute(`${routes.ingredientDetail}?id=${encodeURIComponent(ingredientId)}`);
}

onLoad((query) => {
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : getReports()[0];
});

async function shareCurrentReport() {
  if (!report.value) return;
  const ok = await shareReport(report.value);
  uni.showToast({ title: ok ? '已复制/分享报告摘要' : '分享失败', icon: 'none' });
}

function formatNutritionValue(field: NutritionField): string {
  const value = field.value.trim();
  const unit = field.unit.trim();
  const mainValue = unit && !value.endsWith(unit) ? `${value}${unit}` : value;
  const nrvPercent = field.nrvPercent?.trim();
  if (!nrvPercent || field.key === 'nrvPercent') return mainValue;
  return `${mainValue}，NRV ${nrvPercent}`;
}

function openCompareMode() {
  if (!report.value) return;
  const latestAlternative = getReports().find((item) => item.id !== report.value?.id);
  if (!latestAlternative) {
    uni.navigateTo({ url: routes.compare });
    return;
  }
  const leftId = encodeURIComponent(report.value.id);
  const rightId = encodeURIComponent(latestAlternative.id);
  uni.navigateTo({ url: `${routes.compare}?left=${leftId}&right=${rightId}` });
}
</script>

<template>
  <view class="page stack">
    <EmptyState
      v-if="!report"
      icon="❌"
      title="报告不存在"
      description="可能已被删除，或本机没有对应历史记录。"
      action-label="返回历史"
      @action="navigateToRoute(routes.history)"
    />
    <template v-else>
      <AppCard>
        <view class="quick-summary">
          <view class="quick-summary__row">
            <text class="section-title">快速摘要</text>
            <view class="quick-summary__pill" :class="`quick-summary__pill--${quickSignal.tone}`">
              <text>{{ quickSignal.label }}</text>
            </view>
          </view>
          <view class="quick-summary__stats">
            <view class="quick-summary__stat">
              <text class="quick-summary__stat-value">{{ matchOverview.confirmed }}</text>
              <text class="quick-summary__stat-label">已匹配</text>
            </view>
            <view class="quick-summary__stat">
              <text class="quick-summary__stat-value">{{ matchOverview.pending }}</text>
              <text class="quick-summary__stat-label">待确认</text>
            </view>
            <view class="quick-summary__stat">
              <text class="quick-summary__stat-value">{{ matchOverview.unmatched + matchOverview.unknown }}</text>
              <text class="quick-summary__stat-label">未收录/暂未识别</text>
            </view>
          </view>
          <text class="muted">共 {{ matchOverview.total }} 项配料，支持点开每项查看来源。</text>
          <text class="muted">{{ quickSignal.reason }}</text>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <view class="child-care-row">
            <text class="section-title">育儿守护模式</text>
            <AppButton
              variant="secondary"
              class="child-care-row__button"
              :class="{ 'child-care-row__button--on': isChildCareMode }"
              @click="toggleChildCareMode"
            >
              <text>{{ isChildCareMode ? '已开启' : '已关闭' }}</text>
            </AppButton>
          </view>
          <text class="muted">{{ isChildCareMode ? '育儿守护已开启：优先展示色素、防腐剂、甜味剂类成分。' : '如需更细颗粒的儿童关注提示，请开启育儿守护模式。' }}</text>
        </view>
      </AppCard>

      <ReportSummaryCard :title="report.title" :summary="report.summarySentence" :focus-items="report.focusItems" />

      <AppCard v-if="isChildCareMode">
        <view class="stack">
          <text class="section-title">育儿关注成分</text>
          <EmptyState
            v-if="!childGuardSections.length"
            icon="👶"
            title="未识别到重点儿童关注成分"
            description="当前文本中未命中色素、防腐剂、甜味剂等提示词，请结合原文确认。"
          />
          <template v-else>
            <view v-for="section in childGuardSections" :key="section.key" class="child-guard-section">
              <text class="child-guard-section__title">{{ section.label }}（{{ section.items.length }}）</text>
              <view class="pill-list">
                <text v-for="item in section.items" :key="`${section.key}-${item}`" class="child-guard-item">{{ item }}</text>
              </view>
            </view>
            <text v-if="childGuardComplexityWarning" class="muted">{{ childGuardComplexityWarning }}</text>
          </template>
        </view>
      </AppCard>

      <AppCard v-if="report.frontClaimsSection?.text">
        <view class="stack">
          <text class="section-title">包装正面文字</text>
          <text class="muted">{{ report.frontClaimsSection.text }}</text>
          <text v-for="line in report.frontClaimsSection.highlights" :key="line" class="muted">{{ line }}</text>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">我的关注项</text>
          <EmptyState v-if="!report.attentionHits.length" icon="🎯" title="未命中关注项" description="可以在我的关注项中调整控糖、低钠、忌口等设置。" action-label="调整关注项" @action="navigateToRoute(routes.attention)" />
          <view v-else class="stack">
            <view v-for="hit in report.attentionHits" :key="hit.key" class="report-list-item">
              <text class="report-list-item__title">{{ hit.label }}</text>
              <text class="muted">{{ hit.reason }} {{ hit.terms.join('、') }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">配料表解读</text>
          <text class="muted">识别到 {{ report.ingredientSection.total }} 项配料，{{ report.ingredientSection.additiveCount }} 项进入食品添加剂分组。</text>
          <view class="pill-list">
            <view v-for="item in report.ingredientSection.items" :key="item.id" class="report-ingredient-item">
              <AppCard :clickable="Boolean(item.ingredientId)" @click="openIngredientDetail(item)">
                <view class="report-ingredient-row">
                  <IngredientChip :name="item.normalizedText" :status="item.dataStatus" />
                  <text v-if="item.ingredientId" class="muted report-ingredient-row__hint">点击查看成分依据</text>
                  <text v-else class="muted report-ingredient-row__hint">当前项暂未绑定官方成分 ID。</text>
                </view>
              </AppCard>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">营养成分解读</text>
          <text v-for="line in report.nutritionSection.highlights" :key="line" class="muted">{{ line }}</text>
          <view v-if="nutritionFieldsWithValues.length" class="nutrition-value-list">
            <view v-for="field in nutritionFieldsWithValues" :key="field.key" class="nutrition-value-row">
              <text class="nutrition-value-row__label">{{ field.label }}</text>
              <text class="nutrition-value-row__value">{{ formatNutritionValue(field) }}</text>
            </view>
          </view>
          <EmptyState v-else icon="📊" title="未提供营养成分表" description="如需查看糖、钠、脂肪等字段，可补拍或粘贴营养成分表文字。" />
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">营养-配料双向核验</text>
          <EmptyState
            v-if="!nutritionIngredientChecks.length"
            icon="📌"
            title="缺少核对材料"
            description="营养表或配料表信息不足，暂不生成糖/钠双向核验结果。补拍后可重新生成。"
          />
          <template v-else>
            <view v-for="check in nutritionIngredientChecks" :key="check.key" class="nutrition-check-item">
              <view class="nutrition-check-item__head">
                <text class="nutrition-check-item__title">{{ check.title }}</text>
                <text
                  class="nutrition-check-item__state"
                  :class="{
                    'nutrition-check-item__state--possible': check.state === 'possible_issue',
                    'nutrition-check-item__state--normal': check.state === 'no_obvious_issue',
                    'nutrition-check-item__state--insufficient': check.state === 'insufficient_data'
                  }"
                >
                  {{ check.state === 'possible_issue' ? '建议核对' : check.state === 'no_obvious_issue' ? '未发现明显冲突' : '信息不足' }}
                </text>
              </view>
              <text class="muted">{{ check.summary }}</text>
              <text v-if="check.nutritionValue !== '未抓取到'" class="muted">营养表线索：{{ check.nutritionValue }}{{ check.nutritionUnit }}</text>
              <text v-if="check.ingredientSignals.length" class="muted">配料线索：{{ check.ingredientSignals.join('、') }}</text>
            </view>
          </template>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">食品添加剂分组</text>
          <EmptyState v-if="!report.additiveGroups.length" icon="🍃" title="未识别到添加剂分组" description="这只表示当前文本和数据未匹配到相关分组，建议结合包装原文确认。" />
          <view v-for="group in report.additiveGroups" :key="group.label" class="report-list-item">
            <text class="report-list-item__title">{{ group.label }}</text>
            <view class="pill-list">
              <view v-for="item in group.items" :key="item.id" class="report-ingredient-item">
                <AppCard :clickable="Boolean(item.ingredientId)" @click="openIngredientDetail(item)">
                  <view class="report-ingredient-row">
                    <IngredientChip :name="item.normalizedText" :status="item.dataStatus" />
                    <text v-if="item.ingredientId" class="muted report-ingredient-row__hint">点击查看成分依据</text>
                    <text v-else class="muted report-ingredient-row__hint">当前项暂未绑定官方成分 ID。</text>
                  </view>
                </AppCard>
              </view>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">过敏/忌口提示</text>
          <EmptyState v-if="!report.allergenHints.length" icon="🛡️" title="暂未识别到相关提示" description="请仍以包装上的过敏原提示和完整配料表为准。" />
          <text v-for="hint in report.allergenHints" :key="hint" class="muted">{{ hint }}</text>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">暂未识别/暂未收录</text>
          <EmptyState v-if="!report.unknownItems.length" icon="✅" title="没有暂未收录项" description="已按当前文本完成匹配确认。" />
          <view v-else class="pill-list">
            <IngredientChip v-for="item in report.unknownItems" :key="item" :name="item" status="unknown_from_ocr" />
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <view class="row">
            <text class="section-title">数据来源和查看依据</text>
            <AppButton variant="text" @click="showSources = !showSources">{{ sourceButtonLabel }}</AppButton>
          </view>
          <view v-if="showSources" class="stack">
            <view v-for="source in report.sources" :key="source.label" class="source-row">
              <SourceBadge :label="source.label" />
              <text class="muted">{{ source.detail }}</text>
            </view>
          </view>
          <text class="muted">仅供标签信息参考，请结合包装原文和个人情况判断。</text>
        </view>
      </AppCard>

      <view class="stack">
        <AppButton @click="shareCurrentReport">分享/复制摘要</AppButton>
        <AppButton variant="secondary" @click="navigateToRoute(routes.capture)">重新分析</AppButton>
        <AppButton variant="secondary" @click="openCompareMode">和历史报告对比</AppButton>
        <AppButton variant="text" @click="navigateToRoute(routes.history)">打开历史</AppButton>
      </view>
    </template>
  </view>
</template>

<style scoped>
.report-list-item,
.source-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.report-list-item__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.nutrition-value-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nutrition-value-row {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  justify-content: space-between;
  min-height: 44px;
  padding: var(--space-sm) var(--space-md);
}

.nutrition-value-row__label {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.nutrition-value-row__value {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  text-align: right;
}

.quick-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.quick-summary__row {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
}

.quick-summary__pill {
  align-items: center;
  border-radius: 999px;
  color: var(--text);
  display: inline-flex;
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.2;
  padding: 4px 12px;
  white-space: nowrap;
}

.quick-summary__pill--high {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid var(--status-verified);
  color: var(--status-verified);
}

.quick-summary__pill--medium {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid var(--status-warning);
  color: var(--status-warning);
}

.quick-summary__pill--low {
  background: rgba(156, 163, 175, 0.12);
  border: 1px solid var(--status-unverified);
  color: var(--status-unverified);
}

.quick-summary__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-xs);
}

.quick-summary__stat {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  text-align: center;
}

.quick-summary__stat-value {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.quick-summary__stat-label {
  color: var(--muted);
  font-size: var(--font-size-xs);
  margin-top: 2px;
}

.report-ingredient-item {
  display: flex;
}

.report-ingredient-row {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}

.report-ingredient-row__hint {
  font-size: var(--font-size-xs);
}

.child-care-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
}

.child-care-row__button {
  border-radius: 999px;
  min-height: 34px;
  padding: 0 14px;
  line-height: 1.2;
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.child-care-row__button--on {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary-strong);
}

.child-guard-item::after {
  border: 0;
}

.child-guard-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.child-guard-section__title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.child-guard-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-btn);
  color: var(--text);
  display: inline-block;
  font-size: var(--font-size-sm);
  padding: 6px 10px;
}

.nutrition-check-item {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
}

.nutrition-check-item__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
}

.nutrition-check-item__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.nutrition-check-item__state {
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
  padding: 4px 10px;
  white-space: nowrap;
}

.nutrition-check-item__state--possible {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid var(--status-warning);
  color: var(--status-warning);
}

.nutrition-check-item__state--normal {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid var(--status-verified);
  color: var(--status-verified);
}

.nutrition-check-item__state--insufficient {
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid var(--status-unverified);
  color: var(--status-unverified);
}
</style>
