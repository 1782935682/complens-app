<template>
  <view class="state state--loading">
    <view class="state__skeleton state__skeleton--wide" />
    <view class="state__skeleton" />
    <text class="state__text"><slot>加载中...</slot></text>
  </view>
</template>

<style scoped>
.state {
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--surface);
  padding: var(--space-lg);
}

.state__skeleton {
  width: 64%;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef2ef, #f8faf8, #eef2ef);
  margin-bottom: var(--space-sm);
}

.state__skeleton--wide {
  width: 92%;
}

.state__text {
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
