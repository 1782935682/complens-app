<template>
  <view class="app-card">
    <slot />
  </view>
</template>

<style scoped>
.app-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
}
</style>
