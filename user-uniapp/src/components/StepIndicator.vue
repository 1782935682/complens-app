<script setup lang="ts">
defineProps<{
  steps: string[];
  activeIndex: number;
}>();
</script>

<template>
  <view class="step-indicator">
    <view v-for="(step, index) in steps" :key="step" class="step" :class="{ 'step--active': index === activeIndex, 'step--done': index < activeIndex }">
      <text class="step__dot">{{ index + 1 }}</text>
      <text class="step__label">{{ step }}</text>
    </view>
  </view>
</template>

<style scoped>
.step-indicator {
  display: flex;
  gap: var(--space-sm);
  overflow: hidden;
}

.step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.step__dot {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--muted);
  text-align: center;
  line-height: 28px;
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.step__label {
  max-width: 100%;
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.3;
  text-align: center;
}

.step--active .step__dot,
.step--done .step__dot {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.step--active .step__label,
.step--done .step__label {
  color: var(--primary-strong);
  font-weight: 800;
}
</style>
