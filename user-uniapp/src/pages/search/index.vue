<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import StatusTag from '@/components/StatusTag.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { searchIngredients } from '@/services/api/ingredients';

const query = ref('');
const loading = ref(false);
const error = ref('');
const items = ref<Array<{
  id?: string;
  nameCn?: string;
  nameEn?: string;
  dataStatus?: string;
  sourceName?: string;
  category?: string;
}>>([]);

async function runSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  error.value = '';
  items.value = [];
  try {
    const response = await searchIngredients(query.value);
    items.value = ((response.items || []) as Array<Record<string, unknown>>)
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : undefined,
        nameCn: typeof item.nameCn === 'string' ? item.nameCn : undefined,
        nameEn: typeof item.nameEn === 'string' ? item.nameEn : undefined,
        dataStatus: typeof item.dataStatus === 'string' ? item.dataStatus : undefined,
        sourceName: typeof item.sourceName === 'string' ? item.sourceName : undefined,
        category: typeof item.category === 'string' ? item.category : undefined
      }))
      .filter((item) => item.id);
  } catch {
    error.value = '成分搜索服务暂不可用，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

function openIngredient(item: { id?: string; nameCn?: string; nameEn?: string }) {
  if (!item.id) {
    return;
  }
  navigateToRoute(`${routes.ingredientDetail}?id=${encodeURIComponent(item.id)}`);
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">搜索成分</text>
      <text class="page-subtitle">搜索是辅助入口。食品标签解读主流程仍从拍照或上传开始。</text>
    </view>
    <view class="search-bar">
      <text class="search-bar__icon">🔍</text>
      <input v-model="query" class="input search-input" placeholder="例如：柠檬酸、E330" @confirm="runSearch" />
      <AppButton @click="runSearch">搜索</AppButton>
    </view>
    <LoadingState v-if="loading">正在搜索...</LoadingState>
    <ErrorState v-else-if="error" title="搜索失败" :description="error" action-label="重试" @action="runSearch" />
    <EmptyState v-if="!items.length" icon="🔍" title="输入成分名称" description="可查询单个配料或食品添加剂；报告会在主流程里统一展示来源和可信等级。" />
    <view v-else class="stack">
      <AppCard
        v-for="item in items"
        :key="item.id"
        clickable
        @click="openIngredient(item)"
      >
        <view class="search-result">
          <text class="search-result__title">{{ item.nameCn || item.nameEn || item.id }}</text>
          <StatusTag :status="item.dataStatus || 'unverified'" />
          <text v-if="item.category" class="search-result__meta">分类：{{ item.category }}</text>
          <text class="muted">{{ item.sourceName || '来源信息以详情和报告中的查看依据为准。' }}</text>
        </view>
      </AppCard>
    </view>
  </view>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  position: relative;
  width: 100%;
}

.search-bar__icon {
  position: absolute;
  left: 12px;
  font-size: 15px;
  line-height: 1;
  z-index: 5;
  color: var(--muted);
}

.search-input {
  flex: 1;
  padding-left: 36px;
}

.search-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-result__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
}

.search-result__meta {
  color: var(--text);
  font-size: var(--font-size-sm);
}
</style>
