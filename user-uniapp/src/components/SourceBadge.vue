<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <view class="source-badge">
    <text class="source-badge__icon">📄</text>
    <text class="source-badge__text">{{ label }}</text>
  </view>
</template>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  border-radius: 999px;
  border: 1px solid var(--line);
  padding: 1px 8px;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
}

.source-badge__icon {
  font-size: 11px;
  line-height: 1;
}

.source-badge__text {
  line-height: 1.2;
}
</style>
