<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
}>(), {
  subtitle: '',
  eyebrow: ''
});
</script>

<template>
  <view class="page-header">
    <text v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</text>
    <text class="page-header__title">{{ title }}</text>
    <text v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</text>
    <slot />
  </view>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: var(--space-xs);
}

.page-header__eyebrow {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
}

.page-header__title {
  color: var(--text);
  font-size: var(--font-size-2xl);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
}

.page-header__subtitle {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
</style>
