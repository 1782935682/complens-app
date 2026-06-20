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
  plainType: string;
  whyCare: string;
  trust: string;
  trustTone: 'trusted' | 'review' | 'plain';
  source: string;
  useAdvice: string;
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
  const dataStatus = String(item.dataStatus || '');
  const plainType = buildPlainType(item, functions);
  const trust = buildTrustNote(dataStatus);

  return {
    key: `${index}-${name}`,
    name,
    plainType,
    whyCare: buildWhyCareText(item, plainType, foods, functions, dataStatus),
    trust,
    trustTone: trustTone(dataStatus),
    source: buildSourceText(item),
    useAdvice: buildUseAdvice(item, foods, functions, dataStatus),
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

function buildTrustNote(value: unknown): string {
  const status = String(value || '');
  if (status === 'verified_regulation') return '名称参考';
  if (status === 'verified_jecfa') return '国际资料线索';
  if (status === 'common_ingredient') return '常见配料词库';
  if (status === 'pending_review' || status === 'mapped_candidate') return '未确认线索';
  if (status === 'unverified') return '来源不足';
  if (status === 'unknown_from_ocr') return '包装文字线索';
  return '来源不明确';
}

function trustTone(value: unknown): DisplayIngredient['trustTone'] {
  const status = String(value || '');
  if (status === 'verified_regulation') return 'trusted';
  if (status === 'pending_review' || status === 'mapped_candidate' || status === 'unverified' || status === 'unknown_from_ocr') return 'review';
  return 'plain';
}

function normalizeSourceType(value: unknown): string {
  const sourceType = String(value || '').trim();
  if (sourceType === 'official_standard') return '标准资料';
  if (sourceType === 'safety_evaluation') return '评价来源';
  if (sourceType === 'common_ingredient') return '普通配料词库';
  if (sourceType === 'manual_review') return '人工复核记录';
  return sourceType;
}

function normalizeCategory(value: unknown): string {
  const category = pickText(value);
  if (!category) return '';
  if (/food_additive|添加剂/i.test(category)) return '食品添加剂';
  if (/ordinary|common|普通|配料/i.test(category)) return '普通食品配料';
  if (/nutrition|营养/i.test(category)) return '营养相关成分';
  return category;
}

function buildPlainType(item: SearchItem, functions: string[]): string {
  const category = normalizeCategory(item.category);
  if (category) return category;
  if (functions.length) return functions.slice(0, 2).join('、');
  const status = String(item.dataStatus || '');
  if (status === 'common_ingredient') return '普通食品配料';
  if (status === 'verified_jecfa') return '国际评价资料中的成分';
  return '食品标签成分';
}

function buildWhyCareText(item: SearchItem, plainType: string, foods: string[], functions: string[], dataStatus: string): string {
  const text = `${plainType} ${functions.join(' ')}`.toLowerCase();
  if (/甜味|阿斯巴甜|三氯蔗糖|安赛蜜|糖醇|赤藓糖醇/.test(text)) {
    return '常见于无糖、低糖或甜味食品。控糖、给孩子看标签时，配料位置和营养成分表里的糖或碳水数字都会进入提醒。';
  }
  if (/防腐|山梨酸|苯甲酸|脱氢/.test(text)) {
    return '常见作用是帮助延长保质期。介意添加剂时，可以把它和配料表长短、保质期一起看。';
  }
  if (/色素|柠檬黄|日落黄|胭脂红|焦糖色/.test(text)) {
    return '常见作用是调整颜色。给孩子看零食标签时，色素类配料会单独列入提醒。';
  }
  if (/香精|香料/.test(text)) {
    return '常见作用是增加风味。追求配料简单时，可以把香精香料类配料单独看一眼。';
  }
  if (/钠|盐/.test(text)) {
    return '和咸味、钠摄入相关。低钠关注时，要同时看营养成分表里的钠数字。';
  }
  if (foods.length) {
    return `资料里出现过 ${unique(foods).slice(0, 2).join('、')} 等标签场景；成分镜会按识别到的标签文字整理结果。`;
  }
  if (dataStatus === 'verified_jecfa') {
    return '可作为国际资料线索查看，但不能直接当作中国允许使用范围或标签结论。';
  }
  if (dataStatus === 'pending_review' || dataStatus === 'mapped_candidate' || dataStatus === 'unverified') {
    return '这条信息还不够稳，会在报告里作为未确认线索单独展示。';
  }
  return '可用来理解包装配料表里的名称和常见写法。';
}

function buildSourceText(item: SearchItem): string {
  const status = String(item.dataStatus || '');
  const sourceName = displaySourceName(pickText(item.sourceName));
  if (status === 'verified_regulation') {
    const compactName = sourceName.replace(/（标准资料）/g, '').trim();
    return compactName ? `${compactName} · 公开资料` : '公开资料';
  }
  const sourceType = normalizeSourceType(item.sourceType);
  if (sourceName && sourceType) return `${sourceName}（${sourceType}）`;
  if (sourceName) return sourceName;
  if (sourceType) return sourceType;
  if (status === 'verified_regulation') return '后端资料线索';
  if (status === 'verified_jecfa') return '国际评价资料';
  if (status === 'common_ingredient') return '本地常见配料词库';
  if (status === 'unknown_from_ocr') return '用户确认的包装文字';
  return '暂无明确来源名称';
}

function displaySourceName(value: string): string {
  return value
    .replace(/官方标准/g, '标准资料')
    .replace(/官方/g, '资料');
}

function buildUseAdvice(item: SearchItem, foods: string[], functions: string[], dataStatus: string): string {
  if (dataStatus === 'verified_regulation') {
    return '只作名称和常见叫法线索；报告会按配料表、营养数字和可用来源整理。';
  }
  if (dataStatus === 'verified_jecfa') {
    return '只作国际资料线索；不能直接当作中国官方标准结论。';
  }
  if (dataStatus === 'common_ingredient') {
    return '主要用于看懂包装叫法，不代表它一定是食品添加剂。';
  }
  if (dataStatus === 'pending_review' || dataStatus === 'mapped_candidate' || dataStatus === 'unverified') {
    return '会作为未确认线索单独展示，不会混入已确认结果。';
  }
  if (dataStatus === 'unknown_from_ocr') {
    return '来自包装文字识别，会在报告里按未确认线索展示。';
  }
  if (foods.length) return `资料里记录过 ${unique(foods).slice(0, 2).join('、')} 等场景，报告会按识别到的名称整理。`;
  if (functions.length) return `资料归类为 ${unique(functions).slice(0, 3).join('、')}；搜索结果只帮助理解名称。`;
  return '信息不足时会标为信息不足，不硬生成结论。';
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
        <view class="result-head">
          <view class="result-head__main">
            <text class="result-value result-value--name">{{ item.name }}</text>
            <text class="result-type">{{ item.plainType }}</text>
          </view>
          <text class="trust-chip" :class="`trust-chip--${item.trustTone}`">{{ item.trust }}</text>
        </view>
        <text class="result-scope-note">单个成分只能作名称参考，不能替代整包包装报告。</text>
        <view class="result-row">
          <text class="result-label">为什么看</text>
          <text class="result-value">{{ item.whyCare }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">标签写法</text>
          <text class="result-value">{{ item.aliases }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">数据来自</text>
          <text class="result-value">{{ item.source }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">结果用途</text>
          <text class="result-value">{{ item.useAdvice }}</text>
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

.result-head {
  margin: calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg)) var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-radius: 24rpx 24rpx 0 0;
  background: linear-gradient(90deg, var(--primary-soft), #ffffff);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.result-scope-note {
  border-radius: 16rpx;
  background: var(--surface-subtle);
  color: var(--muted);
  display: block;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
  margin-bottom: var(--space-sm);
  padding: 10rpx 12rpx;
}

.result-head__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.result-type {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
}

.trust-chip {
  flex-shrink: 0;
  max-width: 220rpx;
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  padding: 6px 10px;
  text-align: center;
}

.trust-chip--trusted {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.trust-chip--review {
  background: var(--surface-warm);
  color: var(--accent);
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

  .result-head {
    flex-direction: column;
  }

  .trust-chip {
    max-width: 100%;
  }
}
</style>
