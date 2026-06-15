<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ message: string; tone?: 'info' | 'success' | 'error' }>();

const icon = computed(() => {
  if (props.tone === 'success') return '✅';
  if (props.tone === 'error') return '⚠️';
  return '💡';
});
</script>

<template>
  <view v-if="message" class="toast" :class="`toast--${tone || 'info'}`">
    <text class="toast__icon">{{ icon }}</text>
    <text class="toast__text">{{ message }}</text>
  </view>
</template>

<style scoped>
.toast {
  border-radius: var(--radius-btn);
  padding: 10px 14px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  animation: slide-in 220ms ease-out;
  box-shadow: 0 4px 12px rgba(23, 39, 35, 0.04);
}

@keyframes slide-in {
  from {
    transform: translateY(-12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast__icon {
  font-size: 16px;
  line-height: 1;
}

.toast__text {
  flex: 1;
  font-weight: 700;
}

.toast--info {
  background: rgba(37, 99, 235, 0.06);
  border-color: rgba(37, 99, 235, 0.15);
  color: var(--status-info);
}

.toast--success {
  background: rgba(34, 197, 94, 0.06);
  border-color: rgba(34, 197, 94, 0.15);
  color: var(--status-verified);
}

.toast--error {
  background: var(--error-surface, #fff8ec);
  border-color: var(--error-border, #f4c790);
  color: var(--error-text, #7a3b10);
}
</style>
