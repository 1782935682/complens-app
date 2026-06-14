<script setup lang="ts">
import StatusTag from './StatusTag.vue';

defineProps<{
  name: string;
  status?: string;
  removable?: boolean;
}>();

const emit = defineEmits<{ remove: [] }>();
</script>

<template>
  <view class="ingredient-chip">
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
  min-height: 36px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 4px 8px 4px 12px;
}

.ingredient-chip__name {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.ingredient-chip__remove {
  min-width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-lg);
  line-height: 28px;
  padding: 0;
}

.ingredient-chip__remove::after {
  border: 0;
}
</style>
