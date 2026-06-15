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
  min-height: 44px;
  border-radius: var(--radius-btn);
  border: 1px solid transparent;
  padding: 0 16px;
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 44px;
}

.app-button::after {
  border: 0;
}

.app-button--primary {
  background: var(--primary-strong);
  color: #ffffff;
}

.app-button--secondary {
  background: var(--primary-soft);
  color: var(--primary-strong);
  border-color: rgba(5, 150, 105, 0.18);
}

.app-button--text {
  background: transparent;
  color: var(--primary);
  border-color: transparent;
}

.app-button--danger {
  background: #fff1f2;
  color: var(--status-danger);
  border-color: rgba(239, 68, 68, 0.24);
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
