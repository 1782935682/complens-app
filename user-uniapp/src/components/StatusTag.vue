<script setup lang="ts">
import { computed } from 'vue';
import { dataStatusClass, dataStatusLabel } from '@/constants/dataStatus';

const props = defineProps<{ status: string; label?: string }>();
const classes = computed(() => ['status-tag', dataStatusClass(props.status)]);
const text = computed(() => props.label || dataStatusLabel(props.status));
</script>

<template>
  <view :class="classes">
    <view class="status-tag__dot" />
    <text class="status-tag__text">{{ text }}</text>
  </view>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
  border: 1px solid transparent;
}

.status-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background-color: currentColor;
}

.status-tag__text {
  line-height: 1.2;
}

.status--verified {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
  color: var(--status-verified);
}

.status--info {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.2);
  color: var(--status-info);
}

.status--candidate {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
  color: var(--status-warning);
}

.status--unverified {
  background: rgba(156, 163, 175, 0.08);
  border-color: rgba(156, 163, 175, 0.2);
  color: var(--status-unverified);
}

.status--unknown {
  background: rgba(107, 114, 128, 0.08);
  border-color: rgba(107, 114, 128, 0.2);
  color: var(--status-unknown);
}
</style>
