<script setup lang="ts">
import AppButton from './AppButton.vue';

defineProps<{ title: string; description: string; actionLabel?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <view class="error-state">
    <view class="error-state__header">
      <view class="error-state__icon" />
      <text class="error-state__title">{{ title }}</text>
    </view>
    <text class="error-state__description">{{ description }}</text>
    <AppButton v-if="actionLabel" variant="secondary" @click="emit('action')">{{ actionLabel }}</AppButton>
  </view>
</template>

<style scoped>
.error-state {
  border-radius: var(--radius-card);
  border: 1px solid var(--error-border);
  background: var(--error-surface);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  box-shadow: 0 4px 12px rgba(216, 138, 36, 0.04);
}

.error-state__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-state__icon {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--status-warning);
  flex: none;
}

.error-state__title {
  color: var(--error-text);
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: 1.35;
}

.error-state__description {
  color: var(--error-text);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
