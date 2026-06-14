<script setup lang="ts">
import { computed } from 'vue';
import { dataStatusClass, dataStatusLabel } from '@/constants/dataStatus';

const props = defineProps<{ status: string; label?: string }>();
const classes = computed(() => ['status-tag', dataStatusClass(props.status)]);
const text = computed(() => props.label || dataStatusLabel(props.status));
</script>

<template>
  <text :class="classes">{{ text }}</text>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 18px;
}

.status--verified {
  background: rgba(34, 197, 94, 0.14);
  color: var(--status-verified);
}

.status--info {
  background: rgba(37, 99, 235, 0.12);
  color: var(--status-info);
}

.status--candidate {
  background: rgba(245, 158, 11, 0.18);
  color: var(--status-warning);
}

.status--unverified {
  background: rgba(156, 163, 175, 0.18);
  color: var(--status-unverified);
}

.status--unknown {
  background: rgba(107, 114, 128, 0.16);
  color: var(--status-unknown);
}
</style>
