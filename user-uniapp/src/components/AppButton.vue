<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}>(), {
  variant: 'primary',
  disabled: false,
  loading: false
});

const emit = defineEmits<{ click: [] }>();

function handleTap() {
  if (props.disabled || props.loading) return;
  emit('click');
}
</script>

<template>
  <button class="app-button" :class="`app-button--${variant}`" :disabled="disabled || loading" @tap="handleTap">
    <text v-if="loading" class="app-button__spinner" />
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  border-radius: var(--radius-btn);
  border: 1px solid transparent;
  padding: 0 16px;
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.2;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  touch-action: manipulation;
}

.app-button:active:not([disabled]) {
  transform: scale(0.98);
}

.app-button::after {
  border: 0;
}

.app-button--primary {
  background: var(--primary-strong);
  color: #ffffff;
}

.app-button--primary:active:not([disabled]) {
  background: var(--primary-darker);
}

.app-button--secondary {
  background: var(--primary-soft);
  color: var(--primary-strong);
  border-color: rgba(5, 150, 105, 0.18);
}

.app-button--secondary:active:not([disabled]) {
  background: rgba(5, 150, 105, 0.12);
  border-color: rgba(5, 150, 105, 0.3);
}

.app-button--text {
  background: transparent;
  color: var(--primary);
  border-color: transparent;
}

.app-button--text:active:not([disabled]) {
  background: rgba(5, 150, 105, 0.06);
}

.app-button--danger {
  background: #fff1f2;
  color: var(--status-danger);
  border-color: rgba(239, 68, 68, 0.24);
}

.app-button--danger:active:not([disabled]) {
  background: #ffe4e6;
  border-color: rgba(239, 68, 68, 0.4);
}

.app-button[disabled] {
  opacity: 0.56;
}

.app-button__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
}
</style>
