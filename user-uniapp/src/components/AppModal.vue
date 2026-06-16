<script setup lang="ts">
import AppButton from './AppButton.vue';

withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}>(), {
  confirmLabel: '确认',
  cancelLabel: '取消',
  variant: 'danger'
});

const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <view v-if="open" class="modal">
    <view class="modal__panel">
      <text class="modal__title">{{ title }}</text>
      <text class="modal__message">{{ message }}</text>
      <view class="modal__actions">
        <AppButton variant="secondary" @click="emit('close')">{{ cancelLabel }}</AppButton>
        <AppButton :variant="variant" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
      </view>
    </view>
  </view>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--space-lg) + env(safe-area-inset-top)) var(--space-lg) calc(var(--space-lg) + env(safe-area-inset-bottom));
  background: rgba(24, 33, 31, 0.4);
  backdrop-filter: blur(8px);
  overflow: hidden;
}

.modal__panel {
  width: 100%;
  max-width: 520px;
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: 0 20px 40px rgba(23, 39, 35, 0.16);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transform: translateY(0);
  animation: slide-up var(--transition-fast) ease-out;
  max-height: calc(100dvh - var(--space-lg) - var(--space-lg) - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow-y: auto;
  flex-shrink: 0;
}

@keyframes slide-up {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.modal__message {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.modal__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
