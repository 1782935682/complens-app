<script setup lang="ts">
defineProps<{
  steps: string[];
  activeIndex: number;
}>();
</script>

<template>
  <view class="step-indicator">
    <view v-for="(step, index) in steps" :key="step" class="step" :class="{ 'step--active': index === activeIndex, 'step--done': index < activeIndex }">
      <view class="step__node">
        <view class="step__line step__line--left" v-if="index > 0" />
        <view class="step__dot">
          <text v-if="index < activeIndex" class="step__check">✓</text>
          <text v-else>{{ index + 1 }}</text>
        </view>
        <view class="step__line step__line--right" v-if="index < steps.length - 1" />
      </view>
      <text class="step__label">{{ step }}</text>
    </view>
  </view>
</template>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-sm) 0;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step__node {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  margin-bottom: var(--space-xs);
}

.step__dot {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 800;
  z-index: 2;
  transition: all var(--transition-fast);
}

.step__check {
  font-size: 10px;
  font-weight: bold;
}

.step__line {
  position: absolute;
  top: 50%;
  height: 2px;
  background: var(--line);
  z-index: 1;
  transform: translateY(-50%);
  transition: background-color var(--transition-fast);
}

.step__line--left {
  left: 0;
  right: 50%;
  margin-right: 12px;
}

.step__line--right {
  left: 50%;
  right: 0;
  margin-left: 12px;
}

.step__label {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  transition: color var(--transition-fast);
}

/* Active State */
.step--active .step__dot {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary-strong);
}

.step--active .step__label {
  color: var(--primary-strong);
  font-weight: 800;
}

/* Done State */
.step--done .step__dot {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.step--done .step__label {
  color: var(--muted);
}

.step--done .step__line--left,
.step--done .step__line--right,
.step--active .step__line--left {
  background: var(--primary-tint);
}
</style>
