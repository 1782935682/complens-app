<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <text class="source-badge">{{ label }}</text>
</template>

<style scoped>
.source-badge {
  display: inline-flex;
  min-height: 26px;
  border-radius: 999px;
  border: 1px solid var(--line);
  padding: 3px 10px;
  background: var(--surface-subtle);
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
}
</style>
