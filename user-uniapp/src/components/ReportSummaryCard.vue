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
      <view v-for="item in focusItems" :key="item" class="report-summary__badge">
        <text class="report-summary__dot">✦</text>
        <text class="report-summary__item">{{ item }}</text>
      </view>
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
  border: 1px solid rgba(5, 150, 105, 0.12);
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
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.report-summary__badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid rgba(5, 150, 105, 0.15);
  border-radius: 999px;
  padding: 4px 12px;
  box-shadow: 0 2px 6px rgba(23, 39, 35, 0.02);
}

.report-summary__dot {
  color: var(--primary);
  font-size: 10px;
  line-height: 1;
}

.report-summary__item {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  line-height: 1.2;
}
</style>
