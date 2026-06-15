<script setup lang="ts">
defineProps<{
  title: string;
  summary: string;
  focusItems?: string[];
}>();
</script>

<template>
  <view class="report-summary">
    <text class="report-summary__title">{{ title }}</text>
    <text class="report-summary__summary">{{ summary }}</text>
    <view v-if="focusItems?.length" class="report-summary__focus">
      <text v-for="item in focusItems" :key="item" class="report-summary__item">{{ item }}</text>
    </view>
  </view>
</template>

<style scoped>
.report-summary {
  border-radius: var(--radius-card);
  background: var(--primary-soft);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.report-summary__title {
  color: var(--primary-strong);
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.report-summary__summary {
  color: var(--text);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.report-summary__focus {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.report-summary__item {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}
</style>
