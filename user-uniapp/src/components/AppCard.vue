<script setup lang="ts">
defineProps<{
  clickable?: boolean;
}>();
</script>

<template>
  <view class="app-card" :class="{ 'app-card--clickable': clickable }">
    <slot />
  </view>
</template>

<style scoped>
.app-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast);
}

.app-card--clickable:active {
  transform: translateY(1px) scale(0.99);
  box-shadow: 0 4px 12px rgba(26, 44, 37, 0.04);
  border-color: var(--primary-tint);
  background-color: var(--surface-subtle);
}
</style>
