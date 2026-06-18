<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import BottomNav from '@/components/BottomNav.vue';
import { searchIngredients } from '@/services/api/ingredients';

type SearchItem = Record<string, unknown>;

interface DisplayIngredient {
  key: string;
  name: string;
  type: string;
  status: string;
  source: string;
  evidence: string;
  aliases: string;
}

const query = ref('');
const searched = ref(false);
const loading = ref(false);
const error = ref('');
const results = ref<DisplayIngredient[]>([]);
const hotKeywords = ['阿斯巴甜', '反式脂肪酸', '脱氢乙酸钠', '山梨酸钾', '赤藓糖醇', '柠檬酸'];

async function doSearch() {
  const keyword = query.value.trim();
  error.value = '';
  searched.value = true;
  results.value = [];
  if (!keyword) return;

  loading.value = true;
  try {
    const response = await searchIngredients(keyword);
    const items = Array.isArray(response.items) ? response.items : [];
    results.value = items.map((item, index) => normalizeSearchItem(item as SearchItem, index, keyword));
  } catch {
    error.value = '搜索失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

function normalizeSearchItem(item: SearchItem, index: number, keyword: string): DisplayIngredient {
  const name = pickText(item.nameCn, item.name, item.nameZh, keyword);
  const functions = pickTextList(item.functions);
  const aliases = [
    ...pickTextList(item.aliases),
    pickText(item.nameEn),
    pickText(item.eNumber),
    pickText(item.gbCode)
  ].filter(Boolean);
  const foods = [
    ...pickTextList(item.foodCategories),
    ...pickUsageLimits(item.usageLimits)
  ];

  return {
    key: `${index}-${name}`,
    name,
    type: pickText(item.category, functions.join('、'), '未分类'),
    status: buildStatusNote(item.dataStatus),
    source: pickText(item.sourceName, normalizeSourceType(item.sourceType), '暂无明确来源名称'),
    evidence: buildEvidenceText(item, foods, functions),
    aliases: aliases.length ? unique([name, ...aliases]).join('、') : name
  };
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function pickTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function pickUsageLimits(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String((item as { foodCategory?: unknown })?.foodCategory || '').trim())
    .filter(Boolean);
}

function buildStatusNote(value: unknown): string {
  const status = String(value || '');
  if (status === 'verified_regulation') return '中国官方标准已验证';
  if (status === 'verified_jecfa') return '国际评价来源';
  if (status === 'common_ingredient') return '普通配料词库';
  if (status === 'pending_review' || status === 'mapped_candidate') return '待复核';
  if (status === 'unverified') return '未验证';
  return '来源状态未知';
}

function normalizeSourceType(value: unknown): string {
  const sourceType = String(value || '').trim();
  if (sourceType === 'official_standard') return '官方标准';
  if (sourceType === 'safety_evaluation') return '评价来源';
  if (sourceType === 'common_ingredient') return '普通配料词库';
  if (sourceType === 'manual_review') return '人工复核记录';
  return sourceType;
}

function buildEvidenceText(item: SearchItem, foods: string[], functions: string[]): string {
  const raw = pickText(item.regulatoryBasis, item.rawSourceText, item.reviewNote);
  if (raw) return raw.replace(/\s+/g, ' ').slice(0, 96);
  if (foods.length) return `已记录 ${unique(foods).slice(0, 3).join('、')} 等适用范围，详情以来源原文为准。`;
  if (functions.length) return `分类/功能：${unique(functions).slice(0, 4).join('、')}。`;
  return '暂无可展示的结构化依据，建议结合包装原文确认。';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function searchHotKeyword(keyword: string) {
  query.value = keyword;
  doSearch();
}
</script>

<template>
  <view class="page page--search">
    <view class="search-panel">
      <view class="search-form">
        <view class="search-input-wrap">
          <text class="search-input-icon">⌕</text>
        <input
          v-model="query"
          class="search-input"
          confirm-type="search"
          placeholder="例如 山梨酸钾、阿斯巴甜、赤藓糖醇"
          @confirm="doSearch"
        />
        </view>
        <AppButton class="search-button" :loading="loading" @click="doSearch">搜索</AppButton>
      </view>
      <text class="search-help">搜索配料、添加剂或营养成分。</text>
    </view>

    <view v-if="!searched && !query.trim()" class="hot-section">
      <text class="hot-title">热门搜索</text>
      <view class="hot-list">
        <text v-for="item in hotKeywords" :key="item" class="hot-pill" @tap="searchHotKeyword(item)">{{ item }}</text>
      </view>
    </view>

    <view class="search-results">
      <AppCard v-if="!query.trim() && searched">
        <text class="empty-text">请输入要查询的成分名称。</text>
      </AppCard>

      <AppCard v-else-if="error">
        <text class="empty-text">{{ error }}</text>
      </AppCard>

      <AppCard v-else-if="searched && !loading && !results.length">
        <text class="empty-text">暂未找到该成分，可尝试输入别名或更短关键词。</text>
      </AppCard>

      <AppCard v-for="item in results" :key="item.key" class="result-card">
        <view class="result-row result-row--name">
          <text class="result-label">成分名称</text>
          <text class="result-value result-value--name">{{ item.name }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">类型</text>
          <text class="result-value">{{ item.type }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">来源状态</text>
          <text class="result-value">{{ item.status }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">数据来源</text>
          <text class="result-value">{{ item.source }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">依据摘要</text>
          <text class="result-value">{{ item.evidence }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">标签常见写法</text>
          <text class="result-value">{{ item.aliases }}</text>
        </view>
      </AppCard>
    </view>
    <BottomNav active="home" />
  </view>
</template>

<style scoped>
.page--search {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  padding-bottom: calc(176rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
}

.result-card {
  border-radius: 24rpx;
}

.search-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-sm);
  align-items: center;
}

.search-input-wrap {
  min-height: 88rpx;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: 0 8rpx 24rpx rgba(26, 44, 37, 0.05);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 24rpx;
}

.search-input-icon {
  color: var(--muted);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1;
}

.search-input {
  flex: 1;
  min-height: 84rpx;
  color: var(--text);
  font-size: var(--font-size-base);
  line-height: 1.4;
  padding: 0;
}

.search-button {
  min-width: 96rpx;
  min-height: 78rpx;
  padding: 0 22rpx;
}

.search-help {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  padding-left: 12rpx;
}

.hot-section {
  margin-top: 42rpx;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hot-title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.3;
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.hot-pill {
  min-height: 68rpx;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 68rpx;
  padding: 0 26rpx;
  transition: transform 160ms ease, border-color 160ms ease;
}

.hot-pill:active {
  transform: scale(0.96);
  border-color: var(--primary-tint);
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.empty-text {
  color: var(--muted);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.result-row {
  display: grid;
  grid-template-columns: 168rpx minmax(0, 1fr);
  gap: var(--space-md);
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.result-row:last-child {
  border-bottom: 0;
}

.result-row--name {
  margin: calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg)) var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-radius: 24rpx 24rpx 0 0;
  background: linear-gradient(90deg, var(--primary-soft), #ffffff);
}

.result-label {
  color: var(--muted);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.55;
}

.result-value {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.result-value--name {
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.35;
}

@media screen and (max-width: 340px) {
  .search-form {
    grid-template-columns: 1fr;
  }

  .search-button {
    width: 100%;
  }

  .result-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
