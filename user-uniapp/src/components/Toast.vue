<script setup lang="ts">
defineProps<{ message: string; tone?: 'info' | 'success' | 'error' }>();
</script>

<template>
  <view v-if="message" class="toast" :class="`toast--${tone || 'info'}`">
    <text>{{ message }}</text>
  </view>
</template>

<style scoped>
.toast {
  border-radius: var(--radius-btn);
  padding: 10px 12px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.toast--info {
  background: rgba(37, 99, 235, 0.12);
  color: var(--status-info);
}

.toast--success {
  background: rgba(34, 197, 94, 0.14);
  color: var(--status-verified);
}

.toast--error {
  background: #fff8ec;
  color: #7a3b10;
}
</style>
