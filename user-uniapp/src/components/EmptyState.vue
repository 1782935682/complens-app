<script setup lang="ts">
import AppButton from './AppButton.vue';

withDefaults(defineProps<{
  title: string;
  description: string;
  actionLabel?: string;
  icon?: string;
}>(), {
  icon: ''
});

const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <view class="empty-state">
    <view class="empty-state__mark">
      <text v-if="icon" class="empty-state__icon">{{ icon }}</text>
    </view>
    <text class="empty-state__title">{{ title }}</text>
    <text class="empty-state__description">{{ description }}</text>
    <AppButton v-if="actionLabel" variant="secondary" @click="emit('action')">{{ actionLabel }}</AppButton>
  </view>
</template>

<style scoped>
.empty-state {
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--surface-subtle);
  padding: var(--space-xl) var(--space-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-sm);
}

.empty-state__mark {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(18, 151, 128, 0.16);
  background:
    linear-gradient(135deg, rgba(143, 228, 204, 0.35), rgba(255, 255, 255, 0.9)),
    var(--primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state__icon {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
}

.empty-state__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: 1.35;
}

.empty-state__description {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
