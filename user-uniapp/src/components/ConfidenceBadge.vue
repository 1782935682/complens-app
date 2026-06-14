<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ confidence: number }>();
const label = computed(() => {
  if (props.confidence >= 0.9) return '高置信';
  if (props.confidence >= 0.55) return '待确认';
  return '未匹配';
});
const tone = computed(() => {
  if (props.confidence >= 0.9) return 'confidence--high';
  if (props.confidence >= 0.55) return 'confidence--medium';
  return 'confidence--low';
});
</script>

<template>
  <text class="confidence-badge" :class="tone">{{ label }}</text>
</template>

<style scoped>
.confidence-badge {
  min-height: 26px;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.confidence--high {
  background: rgba(34, 197, 94, 0.14);
  color: var(--status-verified);
}

.confidence--medium {
  background: rgba(245, 158, 11, 0.18);
  color: var(--status-warning);
}

.confidence--low {
  background: rgba(107, 114, 128, 0.16);
  color: var(--status-unknown);
}
</style>
