<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <view class="source-badge">
    <view class="source-badge__icon" />
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
  padding: 2px 9px;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
}

.source-badge__icon {
  width: 8px;
  height: 10px;
  border: 1px solid currentColor;
  border-radius: 2px;
  position: relative;
}

.source-badge__icon::after {
  content: "";
  position: absolute;
  left: 2px;
  right: 2px;
  top: 3px;
  height: 1px;
  background: currentColor;
}

.source-badge__text {
  line-height: 1.2;
}
</style>
