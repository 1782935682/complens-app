<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ confidence: number }>();
const percentage = computed(() => Math.round(props.confidence * 100));

const label = computed(() => {
  if (props.confidence >= 0.9) return `高置信 ${percentage.value}%`;
  if (props.confidence >= 0.55) return `中置信 ${percentage.value}%`;
  if (props.confidence > 0) return `低置信 ${percentage.value}%`;
  return '未收录';
});

const tone = computed(() => {
  if (props.confidence >= 0.9) return 'confidence--high';
  if (props.confidence >= 0.55) return 'confidence--medium';
  return 'confidence--low';
});
</script>

<template>
  <view class="confidence-badge" :class="tone">
    <text class="confidence-badge__dot" />
    <text class="confidence-badge__text">{{ label }}</text>
  </view>
</template>

<style scoped>
.confidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.confidence-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background-color: currentColor;
}

.confidence-badge__text {
  line-height: 1.2;
}

.confidence--high {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
  color: var(--status-verified);
}

.confidence--medium {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
  color: var(--status-warning);
}

.confidence--low {
  background: rgba(107, 114, 128, 0.08);
  border-color: rgba(107, 114, 128, 0.2);
  color: var(--status-unknown);
}
</style>
