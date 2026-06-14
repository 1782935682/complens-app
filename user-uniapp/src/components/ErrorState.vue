<script setup lang="ts">
import AppButton from './AppButton.vue';

defineProps<{ title: string; description: string; actionLabel?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <view class="error-state">
    <text class="error-state__title">{{ title }}</text>
    <text class="error-state__description">{{ description }}</text>
    <AppButton v-if="actionLabel" variant="secondary" @click="emit('action')">{{ actionLabel }}</AppButton>
  </view>
</template>

<style scoped>
.error-state {
  border-radius: var(--radius-card);
  border: 1px solid #f4c790;
  background: #fff8ec;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.error-state__title {
  color: #7a3b10;
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.error-state__description {
  color: #7a3b10;
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
