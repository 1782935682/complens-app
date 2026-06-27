<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { allergenOptions } from '@/constants/attention';
import { navigateToRoute, routes } from '@/constants/routes';
import { readString, removeStorage } from '@/platform/storage';
import { getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import { getReports, resetScanDraft } from '@/stores/scanStore';
import type { AttentionGoal, AttentionSettings, LabelReport } from '@/types';

type HomeListMode = 'recent' | 'saved' | 'avoid';
type QuickGoalKey = 'daily' | 'sugar' | 'children' | 'lowSodium' | 'allergen';

const HOME_LIST_MODE_KEY = 'complens:home-list-mode';

const reports = ref<LabelReport[]>([]);
const attention = ref<AttentionSettings>(getAttentionSettings());
const listMode = ref<HomeListMode>('recent');
const profileQuickNotice = ref('');

const recentReports = computed(() => {
  const complete = reports.value.filter((item) => !isIncompleteReport(item));
  const incomplete = reports.value.filter(isIncompleteReport);
  return [...complete, ...incomplete].slice(0, 3);
});
const favoriteReports = computed(() => reports.value.filter((item) => item.isFavorite && !item.isAvoided));
const avoidReports = computed(() => reports.value.filter((item) => item.isAvoided));
const visibleReports = computed(() => {
  if (listMode.value === 'saved') return favoriteReports.value.slice(0, 3);
  if (listMode.value === 'avoid') return avoidReports.value.slice(0, 3);
  return recentReports.value;
});
const favoriteCount = computed(() => reports.value.filter((item) => item.isFavorite && !item.isAvoided).length);
const avoidCount = computed(() => reports.value.filter((item) => item.isAvoided).length);
const panelTitle = computed(() => {
  if (listMode.value === 'saved') return '保存记录';
  if (listMode.value === 'avoid') return '避雷记录';
  return '最近判断';
});
const panelMeta = computed(() => {
  if (listMode.value === 'saved') return favoriteCount.value ? '已保存，可继续查看或对比' : '暂无保存';
  if (listMode.value === 'avoid') return avoidCount.value ? '不建议商品集中查看' : '暂无避雷';
  return '可补拍、查看或对比';
});
const retentionOverviewText = computed(() => {
  if (listMode.value === 'saved') return '点开保存记录可复查依据；加入避雷会移到不买清单。';
  if (listMode.value === 'avoid') return '点开避雷可复查不买原因；改为保存会移出避雷。';
  return '点开记录可复查依据、继续补拍或再做对比；保存和避雷分开归档。';
});
const profileSummary = computed(() => {
  const allergenLabels = allergenOptions
    .filter((option) => attention.value.allergens.includes(option.key))
    .map((option) => option.label)
    .slice(0, 2);
  const labels = [
    attention.value.primaryGoal === 'sugar' || attention.value.targetGoals.includes('sugar') ? '控糖' : '',
    attention.value.primaryGoal === 'lowSodium' || attention.value.targetGoals.includes('lowSodium') ? '低钠' : '',
    attention.value.isChildrenMode || attention.value.targetGoals.includes('children') ? '儿童' : '',
    allergenLabels.length ? `忌口${allergenLabels.join('、')}` : ''
  ].filter(Boolean);
  return labels.length ? labels.join(' / ') : '默认关注';
});
const quickGoalOptions = [
  { key: 'daily', label: '日常' },
  { key: 'sugar', label: '控糖' },
  { key: 'children', label: '儿童' },
  { key: 'lowSodium', label: '低钠' },
  { key: 'allergen', label: '过敏' }
] as const;

onShow(() => {
  reports.value = getReports();
  attention.value = getAttentionSettings();
  const pendingMode = readString(HOME_LIST_MODE_KEY, '') as HomeListMode | '';
  if (pendingMode === 'saved' || pendingMode === 'avoid' || pendingMode === 'recent') {
    listMode.value = pendingMode;
    removeStorage(HOME_LIST_MODE_KEY);
  }
  if (listMode.value === 'saved' && favoriteCount.value === 0) listMode.value = 'recent';
  if (listMode.value === 'avoid' && avoidCount.value === 0) listMode.value = 'recent';
});

function openCapture() {
  profileQuickNotice.value = '';
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function openAttention() {
  navigateToRoute(routes.attention);
}

function openReport(report: LabelReport) {
  uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
}

function setListMode(mode: HomeListMode) {
  listMode.value = mode;
}

function toggleSavedOverview() {
  if (listMode.value === 'saved') {
    setListMode('avoid');
    return;
  }
  if (favoriteCount.value > 0) {
    setListMode('saved');
    return;
  }
  setListMode(avoidCount.value > 0 ? 'avoid' : 'saved');
}

function savedStateLabel(item: LabelReport): string {
  if (isIncompleteReport(item)) return '继续补拍';
  if (item.isAvoided) return '已避雷';
  if (item.isFavorite) return '已保存';
  return item.purchaseDecision?.recommendation || '查看';
}

function reportSummaryLine(item: LabelReport): string {
  if (isIncompleteReport(item)) return '信息不足，先补拍配料表或营养成分表';
  const decision = item.purchaseDecision?.recommendation || item.decision?.label || '查看';
  const facts = reportKeyFacts(item);
  const profile = retentionProfileTag(item);
  const reason = facts.length ? facts.join(' / ') : (item.summarySentence || '查看购买建议和依据');
  if (listMode.value === 'avoid' || item.isAvoided) return `${profile}不再买：${decision}｜${reason}`;
  if (listMode.value === 'saved' || item.isFavorite) return `${profile}下次参考：${decision}｜${reason}`;
  return `${profile}${decision}｜${reason}`;
}

function reportKeyFacts(item: LabelReport): string[] {
  const riskText = [
    ...(item.purchaseDecision?.riskReasons || []),
    item.summarySentence || '',
    item.analysisSource?.ingredientText || '',
    item.analysisSource?.allergenText || ''
  ].join(' ');
  return [
    fieldFact(item, 'sugar', '糖'),
    fieldFact(item, 'carbohydrate', '碳水'),
    fieldFact(item, 'sodium', '钠'),
    matchedAllergenText(riskText)
  ].filter(Boolean).slice(0, 3);
}

function retentionProfileTag(item: LabelReport): string {
  const riskText = [
    ...(item.purchaseDecision?.riskReasons || []),
    item.summarySentence || '',
    item.analysisSource?.ingredientText || '',
    item.analysisSource?.allergenText || ''
  ].join(' ');
  const tags = [
    /控糖|糖|碳水|甜味剂/.test(riskText) ? '控糖' : '',
    /儿童|色素|咖啡因|甜味剂|高糖|高钠/.test(riskText) ? '儿童' : '',
    /过敏|致敏|牛奶|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜/.test(riskText) ? '过敏' : '',
    /低钠|钠|盐/.test(riskText) ? '低钠' : ''
  ].filter(Boolean);
  return tags.length ? `${tags.slice(0, 2).join('/')} · ` : '';
}

function fieldFact(item: LabelReport, key: string, label: string): string {
  const field = item.nutritionSection.fields.find((entry) => entry.key === key);
  if (!field?.value) return '';
  const unit = field.unit || (key === 'sodium' ? 'mg' : 'g');
  return `${label}${field.value}${String(field.value).includes(unit) ? '' : unit}`;
}

function matchedAllergenText(text: string): string {
  const labels = allergenOptions
    .filter((option) => option.keywords.some((keyword) => text.includes(keyword)))
    .map((option) => option.label)
    .slice(0, 2);
  return labels.length ? `过敏原${labels.join('、')}` : '';
}

function displayReportName(item: LabelReport): string {
  const name = item.productName || item.foodAnalysis?.productName || item.title || '';
  if (isGenericProductName(name)) return isIncompleteReport(item) ? '待补拍标签' : '这款食品';
  return name;
}

function isIncompleteReport(item: LabelReport): boolean {
  return item.purchaseDecision?.recommendation === '信息不足' || item.decision?.level === 'insufficient';
}

function isGenericProductName(value: string): boolean {
  const name = String(value || '').replace(/\s+/g, '');
  return !name || /^(未命名食品|未识别商品|未知食品|这款食品|食品标签|包装正面|购买建议)$/u.test(name);
}

function isQuickGoalActive(key: QuickGoalKey) {
  if (key === 'allergen') return attention.value.allergens.length > 0;
  if (key === 'daily') return attention.value.primaryGoal === 'daily' && !attention.value.targetGoals.length && !attention.value.isChildrenMode;
  if (key === 'children') return attention.value.targetGoals.includes('children') || attention.value.isChildrenMode;
  return attention.value.primaryGoal === key || attention.value.targetGoals.includes(key);
}

function setQuickGoal(key: QuickGoalKey) {
  if (key === 'allergen') {
    profileQuickNotice.value = '先选择具体过敏原或忌口，下一份报告会优先按忌口判断。';
    openAttention();
    return;
  }
  const targetGoals: AttentionGoal[] = key === 'daily' ? [] : [key === 'children' ? 'children' : key];
  const next = {
    ...attention.value,
    primaryGoal: key === 'children' ? 'daily' : key,
    targetGoals,
    isChildrenMode: key === 'children'
  };
  attention.value = saveAttentionSettings(next);
  const label = quickGoalOptions.find((item) => item.key === key)?.label || '当前关注';
  profileQuickNotice.value = key === 'daily'
    ? '已切回默认关注，下一次识别按普通购买判断。'
    : `已切换为${label}关注，下一次识别会按${label}判断。`;
}
</script>

<template>
  <view class="page page--home">
    <view class="scan-wrap">
      <view class="home-copy">
        <text class="home-copy__brand">成分镜</text>
        <text class="home-copy__title">看食品标签，判断该不该买</text>
        <text class="home-copy__subtitle">优先拍配料表、营养表或条码；结论会标出依据和信息不足。</text>
        <view class="home-flow" aria-label="买前判断流程">
          <view class="home-flow__item">
            <text class="home-flow__label">拍哪里</text>
            <text class="home-flow__value">配料 / 营养 / 条码</text>
          </view>
          <view class="home-flow__item home-flow__item--strong">
            <text class="home-flow__label">先看结论</text>
            <text class="home-flow__value">买 / 谨慎 / 不建议</text>
          </view>
          <view class="home-flow__item">
            <text class="home-flow__label">缺信息</text>
            <text class="home-flow__value">直接提示补拍</text>
          </view>
        </view>
      </view>
      <button class="scan-button" hover-class="scan-button--active" aria-label="选择或拍摄食品标签" @click="openCapture">
        <view class="camera-icon">
          <view class="camera-icon__lens" />
        </view>
        <text class="scan-button__text">拍照识别</text>
      </button>
      <view class="home-proof">
        <text class="home-proof__badge">示例结果，不是你的报告</text>
        <view class="home-proof__item">
          <text class="home-proof__label">来源</text>
          <text class="home-proof__value">包装实拍</text>
        </view>
        <view class="home-proof__item home-proof__item--strong">
          <text class="home-proof__label">结论</text>
          <text class="home-proof__value">控糖慎买</text>
        </view>
        <view class="home-proof__item">
          <text class="home-proof__label">依据</text>
          <text class="home-proof__value">糖10.8g/100ml</text>
        </view>
      </view>
      <view class="home-quick-actions">
        <view class="quick-action" @tap="openAttention">
          <text class="quick-action__label">关注项</text>
          <text class="quick-action__value">{{ profileSummary }}</text>
        </view>
        <view class="quick-action" :class="{ 'quick-action--active': listMode !== 'recent' }" @tap="toggleSavedOverview">
          <text class="quick-action__label">已保存</text>
          <text class="quick-action__value">{{ favoriteCount }} 保存 / {{ avoidCount }} 避雷</text>
        </view>
      </view>
      <view class="quick-goals">
        <text class="quick-goals__label">快速切换关注</text>
        <text
          v-for="item in quickGoalOptions"
          :key="item.key"
          class="goal-chip"
          :class="{ 'goal-chip--active': isQuickGoalActive(item.key) }"
          @tap="setQuickGoal(item.key)"
        >{{ item.label }}</text>
      </view>
      <text v-if="profileQuickNotice" class="quick-profile-notice">{{ profileQuickNotice }}</text>
      <view v-if="reports.length" class="recent-panel">
        <view class="recent-panel__head">
          <text class="recent-panel__title">{{ panelTitle }}</text>
          <text class="recent-panel__meta">{{ panelMeta }}</text>
        </view>
        <view class="recent-filter">
          <text class="filter-chip" :class="{ 'filter-chip--active': listMode === 'recent' }" @tap.stop="setListMode('recent')">最近</text>
          <text class="filter-chip" :class="{ 'filter-chip--active': listMode === 'saved' }" @tap.stop="setListMode('saved')">保存</text>
          <text class="filter-chip" :class="{ 'filter-chip--active': listMode === 'avoid' }" @tap.stop="setListMode('avoid')">避雷</text>
        </view>
        <text class="recent-retention-note">{{ retentionOverviewText }}</text>
        <view v-if="!visibleReports.length" class="recent-empty">
          <text>{{ listMode === 'saved' ? '还没有保存记录。' : '还没有加入避雷。' }}</text>
        </view>
        <view v-for="item in visibleReports" :key="item.id" class="recent-item" @tap="openReport(item)">
          <view class="recent-item__main">
            <text class="recent-item__name">{{ displayReportName(item) }}</text>
            <text class="recent-item__summary">{{ reportSummaryLine(item) }}</text>
          </view>
          <text
            class="recent-item__badge"
            :class="{
              'recent-item__badge--saved': item.isFavorite,
              'recent-item__badge--avoid': item.isAvoided,
              'recent-item__badge--pending': isIncompleteReport(item)
            }"
          >{{ savedStateLabel(item) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page--home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(24rpx + env(safe-area-inset-top)) 32rpx calc(56rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #ffffff 0%, #f8fbf9 60%, #f2faf6 100%);
}

.scan-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12vh;
  padding-bottom: 6vh;
  gap: 44rpx;
}

.home-copy {
  width: min(640rpx, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  text-align: center;
}

.home-copy__brand {
  color: var(--primary-strong);
  font-size: 28rpx;
  font-weight: 900;
}

.home-copy__title {
  color: var(--text);
  font-size: 42rpx;
  font-weight: 900;
  line-height: 1.18;
}

.home-copy__subtitle {
  max-width: 560rpx;
  color: var(--muted);
  font-size: 26rpx;
  line-height: 1.45;
}

.home-flow {
  max-width: 600rpx;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
}

.home-flow__item {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.84);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
  padding: 10rpx 8rpx;
}

.home-flow__item--strong {
  border-color: rgba(18, 151, 128, 0.24);
  background: rgba(238, 250, 245, 0.92);
}

.home-flow__label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.home-flow__value {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.scan-button {
  width: 304rpx;
  height: 304rpx;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-bright), var(--primary-strong));
  box-shadow: 0 28rpx 56rpx rgba(3, 127, 88, 0.32);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  margin: 0;
  position: relative;
  padding: 0;
  overflow: hidden;
  text-align: center;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.scan-button::after {
  border: 0;
}

.scan-button::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 46%);
  pointer-events: none;
}

.scan-button--active {
  transform: scale(0.97);
  box-shadow: 0 16rpx 32rpx rgba(3, 127, 88, 0.26);
}

.camera-icon {
  width: 92rpx;
  height: 70rpx;
  border: 7rpx solid #ffffff;
  border-radius: 22rpx;
  position: relative;
  z-index: 1;
}

.camera-icon::before {
  content: "";
  position: absolute;
  left: 20rpx;
  top: -18rpx;
  width: 40rpx;
  height: 18rpx;
  border-radius: 16rpx 16rpx 0 0;
  background: #ffffff;
}

.camera-icon__lens {
  position: absolute;
  left: 26rpx;
  top: 14rpx;
  width: 24rpx;
  height: 24rpx;
  border: 7rpx solid #ffffff;
  border-radius: 999px;
}

.scan-button__text {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.1;
  z-index: 1;
}

.home-proof {
  width: min(640rpx, 100%);
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
  padding-top: 28rpx;
}

.home-proof__badge {
  position: absolute;
  left: 0;
  top: 0;
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.home-proof__item {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.84);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
  padding: 12rpx 10rpx;
}

.home-proof__item--strong {
  border-color: rgba(177, 52, 52, 0.18);
  background: rgba(255, 246, 246, 0.94);
}

.home-proof__label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.home-proof__value {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.home-quick-actions {
  width: min(640rpx, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.quick-action {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-height: 44px;
  min-width: 0;
  padding: 18rpx;
}

.quick-action--active {
  border-color: rgba(18, 151, 128, 0.3);
  background: var(--primary-soft);
}

.quick-action__label {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
}

.quick-action__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.quick-goals {
  width: min(640rpx, 100%);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8rpx;
}

.quick-goals__label {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  text-align: left;
}

.quick-profile-notice {
  width: min(640rpx, 100%);
  color: var(--text-strong);
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
}

.goal-chip {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  min-height: 44px;
  padding: 8rpx;
  text-align: center;
}

.goal-chip--active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.recent-panel {
  width: min(640rpx, 100%);
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 18rpx;
}

.recent-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.recent-panel__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.25;
}

.recent-panel__meta {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.25;
}

.recent-filter {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
}

.filter-chip {
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  min-height: 44px;
  padding: 8rpx 10rpx;
  text-align: center;
}

.filter-chip--active {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.recent-retention-note {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
}

.recent-empty {
  border-radius: 14rpx;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.4;
  padding: 14rpx;
  text-align: center;
}

.recent-item {
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12rpx;
  align-items: center;
  min-height: 56px;
  padding: 14rpx;
}

.recent-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.recent-item__name {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
  word-break: break-word;
}

.recent-item__summary {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  word-break: break-word;
}

.recent-item__badge {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 8rpx 12rpx;
  text-align: center;
}

.recent-item__badge--saved {
  background: rgba(216, 138, 36, 0.12);
  color: var(--warning);
}

.recent-item__badge--avoid {
  background: rgba(217, 107, 95, 0.12);
  color: var(--status-danger);
}

.recent-item__badge--pending {
  background: rgba(98, 111, 105, 0.12);
  color: var(--muted);
}

@media screen and (max-height: 640px) {
  .scan-wrap {
    gap: 28rpx;
    padding-top: 6vh;
  }

  .home-copy__title {
    font-size: 34rpx;
  }

  .home-copy__subtitle {
    font-size: 23rpx;
  }

  .scan-button {
    width: 240rpx;
    height: 240rpx;
  }
}
</style>
