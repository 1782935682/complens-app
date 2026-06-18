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
  min-height: 46px;
  min-width: 44px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0 18px;
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.2;
  box-shadow: none;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
  touch-action: manipulation;
  word-break: keep-all;
}

.app-button:active:not([disabled]) {
  transform: translateY(1px) scale(0.975);
}

.app-button::after {
  border: 0;
}

.app-button--primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(8, 122, 104, 0.18);
}

.app-button--primary:active:not([disabled]) {
  background: var(--primary-darker);
  box-shadow: 0 5px 12px rgba(8, 122, 104, 0.2);
}

.app-button--secondary {
  background: var(--surface);
  color: var(--primary-strong);
  border-color: rgba(18, 151, 128, 0.22);
}

.app-button--secondary:active:not([disabled]) {
  background: var(--primary-soft);
  border-color: rgba(18, 151, 128, 0.32);
}

.app-button--text {
  background: transparent;
  color: var(--primary);
  border-color: transparent;
}

.app-button--text:active:not([disabled]) {
  background: rgba(18, 151, 128, 0.06);
}

.app-button--danger {
  background: #fff2ef;
  color: var(--status-danger);
  border-color: rgba(217, 107, 95, 0.22);
}

.app-button--danger:active:not([disabled]) {
  background: #ffe7e1;
  border-color: rgba(217, 107, 95, 0.36);
}

.app-button[disabled] {
  background: #f2f5f3;
  border-color: var(--line);
  box-shadow: none;
  color: #9aa5a0;
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
