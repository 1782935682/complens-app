<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import IngredientChip from '@/components/IngredientChip.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { getScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { ParsedIngredient } from '@/types';
import { parseIngredientList } from '@/utils/ingredientParser';

const items = ref<ParsedIngredient[]>([]);
const newItem = ref('');

onMounted(() => {
  const draft = getScanDraft();
  items.value = draft.ingredients.length ? draft.ingredients : parseIngredientList(draft.confirmedText);
  saveScanDraft({ ingredients: items.value });
});

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id);
  saveScanDraft({ ingredients: items.value });
}

function addItem() {
  const value = newItem.value.trim();
  if (!value) return;
  items.value.push({
    id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    rawText: value,
    normalizedText: value,
    isSubIngredient: false,
    isUnknown: /未识别|不清楚/.test(value)
  });
  newItem.value = '';
  saveScanDraft({ ingredients: items.value });
}

function keepUnknownItem() {
  newItem.value = '暂未识别项';
  addItem();
}

function continueToMatch() {
  saveScanDraft({ ingredients: items.value });
  uni.navigateTo({ url: routes.match });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">配料拆分</text>
      <text class="page-subtitle">请核对自动拆出的配料，删除错误项，也可以新增遗漏项。</text>
    </view>

    <EmptyState
      v-if="!items.length"
      title="暂未拆出配料"
      description="可以返回文本确认页修正原文，也可以手动新增配料。"
      action-label="回到文本确认"
      @action="navigateToRoute(routes.confirmText)"
    />

    <AppCard v-else>
      <view class="stack">
        <text class="section-title">识别配料列表</text>
        <view class="pill-list">
          <IngredientChip v-for="item in items" :key="item.id" :name="item.normalizedText" removable @remove="removeItem(item.id)" />
        </view>
      </view>
    </AppCard>

    <AppCard>
      <view class="stack">
        <text class="section-title">手动编辑</text>
        <input v-model="newItem" class="input" placeholder="新增遗漏配料" @confirm="addItem" />
        <AppButton variant="secondary" @click="addItem">新增遗漏项</AppButton>
        <AppButton variant="text" @click="keepUnknownItem">暂未识别保留</AppButton>
      </view>
    </AppCard>

    <AppButton :disabled="!items.length" @click="continueToMatch">继续匹配关注项</AppButton>
  </view>
</template>
