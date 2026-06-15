<script setup lang="ts">
import AppButton from './AppButton.vue';

defineProps<{ title: string; description: string; actionLabel?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <view class="error-state">
    <view class="error-state__header">
      <text class="error-state__icon">⚠️</text>
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
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.02);
}

.error-state__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-state__icon {
  font-size: 18px;
  line-height: 1;
}

.error-state__title {
  color: var(--error-text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.error-state__description {
  color: var(--error-text);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
