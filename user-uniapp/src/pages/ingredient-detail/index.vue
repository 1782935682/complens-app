<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import StatusTag from '@/components/StatusTag.vue';
import { getIngredientWithEvidence, type IngredientDetailResponse } from '@/services/api/ingredients';
import { routes, navigateToRoute } from '@/constants/routes';
import { dataStatusLabel } from '@/constants/dataStatus';

const loading = ref(false);
const error = ref('');
const detailId = ref('');
const ingredient = ref<IngredientDetailResponse | null>(null);

const hasEvidence = computed(() => (ingredient.value?.stagingRows?.length || 0) > 0 || (ingredient.value?.referenceRows?.length || 0) > 0);
const evidenceCount = computed(() => (ingredient.value?.stagingRows?.length || 0) + (ingredient.value?.referenceRows?.length || 0));

const sourceStatus = computed(() => {
  if (!ingredient.value?.dataStatus) return 'unverified';
  return ingredient.value.dataStatus;
});

const aliasText = computed(() => {
  const aliases = ingredient.value?.aliases;
  if (!aliases?.length) return '';
  return `别名：${aliases.join('、')}`;
});

const functionText = computed(() => {
  const functions = ingredient.value?.functions;
  if (!functions?.length) return '';
  return functions.join('、');
});

const usageLimits = computed(() => {
  const limits = ingredient.value?.usageLimits || [];
  return limits.filter((item) => item && item.foodCategory && item.limit).map((item) => `${item.foodCategory}：${item.limit}${item.note ? `（${item.note}）` : ''}`);
});

const sourceReferences = computed(() => ingredient.value?.sourceReferences || []);
const sourceReferenceSummary = computed(() => {
  const external = sourceReferences.value.length;
  return `${hasEvidence.value ? `${evidenceCount.value} 条官方依据` : '暂无官方依据'} · ${external ? `外部来源 ${external} 条` : '暂无外部来源'}`;
});

const rawSourceText = computed(() => {
  const text = ingredient.value?.rawSourceText?.trim();
  return text ? text : '官方原文提要在证据项中展示。';
});

const foodCategories = computed(() => ingredient.value?.foodCategories || []);

onLoad((options) => {
  const rawId = options?.id;
  if (!rawId) {
    error.value = '缺少成分 ID，请从搜索结果重新进入。';
    return;
  }
  detailId.value = decodeURIComponent(rawId);
  void loadIngredientDetail();
});

async function loadIngredientDetail() {
  if (!detailId.value) return;
  loading.value = true;
  error.value = '';
  try {
    ingredient.value = await getIngredientWithEvidence(detailId.value);
  } catch {
    error.value = '成分详情获取失败，请检查网络后重试。';
    ingredient.value = null;
  } finally {
    loading.value = false;
  }
}

function openSearch() {
  navigateToRoute(routes.search);
}

function formatSource(item: Record<string, unknown>) {
  const sourceType = String(item.sourceType || '').trim();
  const sourceName = String(item.sourceName || '').trim();
  if (!sourceName && !sourceType) return '来源信息待补充';
  return sourceType ? `${sourceName || '来源'}（${sourceType}）` : sourceName || '来源信息待补充';
}

function formatSourceStatus(item: Record<string, unknown>) {
  const status = String(item.reviewStatus || '').trim();
  if (!status) return '待确认';
  if (status === 'approved' || status === 'promoted') return '已审核';
  if (status === 'pending_review') return '待复核';
  if (status === 'rejected') return '未通过';
  if (status === 'auto') return '自动抽取';
  return status;
}

function formatEvidenceStatus(status: unknown) {
  const text = String(status || '').trim();
  return text || '待补充';
}

async function copySourceUrl(url?: string) {
  const target = String(url || '').trim();
  if (!target) return;
  try {
    await uni.setClipboardData({ data: target });
    uni.showToast({ title: '来源链接已复制', icon: 'none' });
  } catch {
    uni.showToast({ title: '复制失败，请手动选中链接', icon: 'none' });
  }
}

function formatNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') return value;
  return '';
}

function formatKeyValuePairs(source: Record<string, unknown>) {
  const entries = Object.entries(source || {});
  return entries.map(([k, v]) => `${k}: ${String(v)}`).slice(0, 12);
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">成分详情</text>
      <text class="page-subtitle">展示成分基础信息与可核对依据（仅供标签信息参考，不作结论性判断）。</text>
    </view>

    <LoadingState v-if="loading">正在加载成分详情...</LoadingState>
    <ErrorState
      v-else-if="error"
      title="详情加载失败"
      :description="error"
      action-label="重试"
      @action="loadIngredientDetail"
    />
    <EmptyState
      v-else-if="!ingredient"
      icon="📍"
      title="未找到对应成分"
      description="请返回搜索页后重新选择一次。"
      action-label="返回搜索"
      @action="openSearch"
    />
    <template v-else>
      <AppCard>
        <view class="stack">
          <view class="section-title-row">
            <text class="section-title">{{ ingredient.nameCn || ingredient.nameEn || detailId }}</text>
            <StatusTag :status="sourceStatus" />
          </view>
          <text class="muted">{{ ingredient.nameEn || '未提供英文名称' }}</text>
          <text class="info-row">来源摘要：{{ sourceReferenceSummary }}</text>
          <text v-if="ingredient.sourceName || ingredient.sourceType" class="info-row">
            来源：{{ ingredient.sourceName || '-' }}（{{ ingredient.sourceType || '官方标准' }})
          </text>
          <text v-if="ingredient.sourceScope" class="info-row">适用范围：{{ ingredient.sourceScope }}</text>
          <text v-if="ingredient.sourceVersion" class="info-row">来源版本：{{ ingredient.sourceVersion }}</text>
          <text v-if="ingredient.effectiveDate" class="info-row">生效日期：{{ ingredient.effectiveDate }}</text>
          <text v-if="ingredient.sourceUrl" class="source-url" @tap="copySourceUrl(ingredient.sourceUrl)">官方链接：{{ ingredient.sourceUrl }}</text>
          <text v-if="ingredient.category" class="info-row">分类：{{ ingredient.category }}</text>
          <text v-if="aliasText" class="info-row">{{ aliasText }}</text>
          <text v-if="functionText" class="info-row">功能：{{ functionText }}</text>
          <text v-if="ingredient.gbCode" class="info-row">GB 备案码：{{ ingredient.gbCode }}</text>
          <text v-if="ingredient.eNumber" class="info-row">E 编号：{{ ingredient.eNumber }}</text>
          <text class="info-row">当前依据：{{ dataStatusLabel(sourceStatus) }}</text>
          <text class="info-row">数据来源可信度：{{ ingredient.confidenceLevel || '待补充' }}</text>
          <text v-if="foodCategories.length" class="info-row">适用大类：{{ foodCategories.join('、') }}</text>
          <text class="info-note">说明：未验证、待复核和疑似匹配项用于追溯核查，不作为权威结论。</text>
        </view>
      </AppCard>

      <AppCard v-if="ingredient.description">
        <view class="stack">
          <text class="section-title">说明</text>
          <text class="muted">{{ ingredient.description }}</text>
          <text v-if="ingredient.reviewNote" class="muted">复核备注：{{ ingredient.reviewNote }}</text>
        </view>
      </AppCard>

      <AppCard v-if="usageLimits.length">
        <view class="stack">
          <text class="section-title">限量与使用说明</text>
          <view v-for="limit in usageLimits" :key="limit" class="info-row">{{ limit }}</view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">官方来源与证据</text>
          <text v-if="!hasEvidence" class="muted">当前项目前未返回官方证据行，仅有基础记录；如需复核请结合包装原文核对。</text>
          <view v-if="ingredient.stagingRows?.length">
            <view class="sub-title">A.1 正式字段</view>
            <view
              v-for="(row, index) in ingredient.stagingRows"
              :key="row?.id || `${formatNumber(row?.pdfPage)}-${formatNumber(row?.standardPage)}-${index}`"
              class="evidence-item"
            >
              <text class="info-row">{{ row?.additiveNameCn || row?.additiveNameEn || '食品添加剂' }}</text>
              <text class="muted">依据状态：{{ formatSourceStatus(row || {}) }}</text>
              <text class="muted">表/页：{{ row?.tableName || '-' }} / {{ row?.standardPage || row?.pdfPage || '-' }}</text>
              <text class="muted">功能：{{ row?.functionText || '-' }}</text>
              <text class="muted">类别：{{ row?.foodCategoryName || '-' }}</text>
              <text class="muted">限量：{{ row?.maxUseLevel || '-' }}{{ row?.unit || '' }}</text>
              <text class="muted">编号：CNS {{ row?.cnsNumber || '-' }} / INS {{ row?.insNumber || '-' }}</text>
              <text class="muted">审核：{{ formatEvidenceStatus(row?.reviewStatus) }}</text>
              <text class="muted">{{ formatSource(row || {}) }}</text>
              <text v-if="row?.sourceUrl" class="source-url" @tap="copySourceUrl(row.sourceUrl)">原始链接：{{ row.sourceUrl }}</text>
              <text class="muted">原文摘录：{{ row?.rawSourceText || '无' }}</text>
            </view>
          </view>
          <view v-if="ingredient.referenceRows?.length">
            <view class="sub-title">A.2/A.3/A.4/A.5/A.6 参考表</view>
            <view
              v-for="(row, index) in ingredient.referenceRows"
              :key="row?.id || `${row?.rowCode || ''}-${formatNumber(row?.rowNumber)}-${index}`"
              class="evidence-item"
            >
              <text class="info-row">表项：{{ row?.rowName || row?.rowCode || '参考表项' }}</text>
              <text class="muted">表名：{{ row?.tableName || '-' }} / {{ row?.tableTitle || '-' }}</text>
              <text class="muted">依据状态：{{ formatSourceStatus(row || {}) }}</text>
              <text class="muted">编号：{{ row?.rowCode || '-' }}（{{ row?.rowNumber || '-' }}）</text>
              <text v-if="Object.keys(row?.rowData || {}).length" class="muted">字段：{{ formatKeyValuePairs(row?.rowData || {}).join('；') }}</text>
              <text class="muted">审核：{{ row?.reviewStatus || '-' }}</text>
              <text class="muted">{{ formatSource(row || {}) }}</text>
              <text v-if="row?.sourceUrl" class="source-url" @tap="copySourceUrl(row.sourceUrl)">原始链接：{{ row.sourceUrl }}</text>
              <text class="muted">原文摘录：{{ row?.rawSourceText || '无' }}</text>
            </view>
          </view>
        </view>
      </AppCard>

      <AppCard v-if="sourceReferences.length">
        <view class="stack">
          <text class="section-title">外部来源</text>
          <view v-for="source in sourceReferences" :key="source.title || source.url || source.standard" class="evidence-item">
            <text class="info-row">{{ source.title || source.standard }}</text>
            <text v-if="source.standard" class="muted">标准：{{ source.standard }}</text>
            <text v-if="source.region" class="muted">地区：{{ source.region }}</text>
            <text v-if="source.url" class="source-url" @tap="copySourceUrl(source.url)">链接：{{ source.url }}</text>
            <text v-if="source.publishedAt" class="muted">发布时间：{{ source.publishedAt }}</text>
            <AppButton
              v-if="source.url"
              variant="secondary"
              class="copy-source-btn"
              @click="copySourceUrl(source.url)"
            >
              复制来源链接
            </AppButton>
          </view>
        </view>
      </AppCard>

      <AppCard>
        <view class="stack">
          <text class="section-title">原始来源摘要</text>
          <text class="muted">{{ rawSourceText }}</text>
          <text class="info-note">若证据与包装文本不一致，优先以包装原文和官方公告为准。</text>
        </view>
      </AppCard>
    </template>
  </view>
</template>

<style scoped>
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
}

.info-row {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.info-note {
  color: var(--muted);
  font-size: var(--font-size-xs);
  margin-top: var(--space-xs);
}

.sub-title {
  color: var(--text);
  margin: var(--space-md) 0 var(--space-sm);
  font-weight: 800;
  font-size: var(--font-size-sm);
}

.evidence-item {
  border: 1px dashed var(--line);
  border-radius: var(--radius-card);
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-url {
  color: var(--primary);
  font-size: var(--font-size-sm);
  margin-top: 2px;
}

.copy-source-btn {
  margin-top: 6px;
  align-self: flex-start;
}
</style>
