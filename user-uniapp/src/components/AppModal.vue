<script setup lang="ts">
import AppButton from './AppButton.vue';

defineProps<{ open: boolean; title: string; message: string }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <view v-if="open" class="modal">
    <view class="modal__panel">
      <text class="modal__title">{{ title }}</text>
      <text class="modal__message">{{ message }}</text>
      <view class="modal__actions">
        <AppButton variant="secondary" @click="emit('close')">取消</AppButton>
        <AppButton variant="danger" @click="emit('confirm')">确认删除</AppButton>
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
  align-items: flex-end;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(24, 33, 31, 0.36);
}

.modal__panel {
  width: 100%;
  max-width: 520px;
  border-radius: var(--radius-card);
  background: var(--surface);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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
