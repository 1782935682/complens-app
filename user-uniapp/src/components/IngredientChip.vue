<script setup lang="ts">
import { computed } from 'vue';
import StatusTag from './StatusTag.vue';
import { dataStatusClass } from '../constants/dataStatus';

const props = defineProps<{
  name: string;
  status?: string;
  removable?: boolean;
}>();

const emit = defineEmits<{ remove: [] }>();

const statusClass = computed(() => (props.status ? `chip-${dataStatusClass(props.status)}` : ''));
</script>

<template>
  <view class="ingredient-chip" :class="statusClass">
    <text class="ingredient-chip__name">{{ name }}</text>
    <StatusTag v-if="status" :status="status" />
    <button v-if="removable" class="ingredient-chip__remove" @tap="emit('remove')">×</button>
  </view>
</template>

<style scoped>
.ingredient-chip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 34px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 4px 12px;
  transition: all var(--transition-fast);
}

.ingredient-chip:active {
  transform: scale(0.97);
}

.ingredient-chip__name {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1.2;
}

.ingredient-chip__remove {
  min-width: 20px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: var(--line);
  color: var(--muted);
  font-size: 14px;
  line-height: 20px;
  padding: 0;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.ingredient-chip__remove::after {
  border: 0;
}

.ingredient-chip__remove:active {
  background: var(--muted);
  color: var(--surface);
}

/* 状态色分阶边框与软底色，构建极具信息可读性的色彩地貌 */
.chip-status-verified {
  border-color: rgba(34, 197, 94, 0.24);
  background-color: rgba(34, 197, 94, 0.02);
}

.chip-status-info {
  border-color: rgba(37, 99, 235, 0.2);
  background-color: rgba(37, 99, 235, 0.02);
}

.chip-status-candidate {
  border-color: rgba(245, 158, 11, 0.24);
  background-color: rgba(245, 158, 11, 0.02);
}

.chip-status-unverified {
  border-color: rgba(156, 163, 175, 0.24);
}

.chip-status-unknown {
  border-color: rgba(107, 114, 128, 0.24);
}
</style>
