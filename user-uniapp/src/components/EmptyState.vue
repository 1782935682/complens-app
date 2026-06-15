<script setup lang="ts">
import AppButton from './AppButton.vue';

withDefaults(defineProps<{
  title: string;
  description: string;
  actionLabel?: string;
  icon?: string;
}>(), {
  icon: '🌱'
});

const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <view class="empty-state">
    <text class="empty-state__icon">{{ icon }}</text>
    <text class="empty-state__title">{{ title }}</text>
    <text class="empty-state__description">{{ description }}</text>
    <AppButton v-if="actionLabel" variant="secondary" @click="emit('action')">{{ actionLabel }}</AppButton>
  </view>
</template>

<style scoped>
.empty-state {
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--surface);
  padding: var(--space-xl) var(--space-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-sm);
}

.empty-state__icon {
  font-size: 36px;
  line-height: 1;
}

.empty-state__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.empty-state__description {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
