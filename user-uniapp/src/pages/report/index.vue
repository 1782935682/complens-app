<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import IngredientChip from '@/components/IngredientChip.vue';
import ReportSummaryCard from '@/components/ReportSummaryCard.vue';
import SourceBadge from '@/components/SourceBadge.vue';
import StatusTag from '@/components/StatusTag.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { shareReport } from '@/platform/share';
import { getReportById, getReports } from '@/stores/scanStore';
import type { LabelReport, NutritionField } from '@/types';

const report = ref<LabelReport | undefined>();
const showSources = ref(false);
const sourceButtonLabel = computed(() => showSources.value ? '收起查看依据' : '查看数据来源和依据');
const nutritionFieldsWithValues = computed(() => report.value?.nutritionSection.fields.filter((field) => field.value.trim()) ?? []);

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
      <ReportSummaryCard :title="report.title" :summary="report.summarySentence" :focus-items="report.focusItems" />

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
            <IngredientChip v-for="item in report.ingredientSection.items" :key="item.id" :name="item.normalizedText" :status="item.dataStatus" />
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
          <text class="section-title">食品添加剂分组</text>
          <EmptyState v-if="!report.additiveGroups.length" icon="🍃" title="未识别到添加剂分组" description="这只表示当前文本和数据未匹配到相关分组，建议结合包装原文确认。" />
          <view v-for="group in report.additiveGroups" :key="group.label" class="report-list-item">
            <text class="report-list-item__title">{{ group.label }}</text>
            <text class="muted">{{ group.items.map((item) => item.normalizedText).join('、') }}</text>
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
</style>
