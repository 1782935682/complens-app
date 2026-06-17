<script setup lang="ts">
import type { LocalImageAsset } from '@/types';
import AppButton from './AppButton.vue';

defineProps<{ image?: LocalImageAsset }>();
const emit = defineEmits<{ camera: []; album: []; clear: [] }>();
</script>

<template>
  <view class="image-uploader">
    <image v-if="image?.tempFilePath" class="image-uploader__preview" :src="image.tempFilePath" mode="aspectFill" />
    <view v-else class="image-uploader__empty">
      <view class="image-uploader__icon" />
      <text class="image-uploader__title">拍清楚商品文字</text>
      <text class="image-uploader__hint">包装、配料表或营养成分表都可以。</text>
    </view>
    <view class="image-uploader__actions">
      <AppButton @click="emit('camera')">拍商品</AppButton>
      <AppButton variant="secondary" @click="emit('album')">从相册选择</AppButton>
      <AppButton v-if="image" variant="text" @click="emit('clear')">重新选择</AppButton>
    </view>
  </view>
</template>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.image-uploader__preview,
.image-uploader__empty {
  width: 100%;
  min-height: 220px;
  border: 1px dashed rgba(18, 151, 128, 0.34);
  border-radius: var(--radius-card);
  background:
    linear-gradient(180deg, rgba(238, 250, 245, 0.9), rgba(255, 255, 255, 0.84)),
    var(--primary-soft);
}

.image-uploader__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  text-align: center;
  gap: var(--space-sm);
}

.image-uploader__icon {
  width: 42px;
  height: 32px;
  border: 2px solid var(--primary);
  border-radius: 10px;
  position: relative;
}

.image-uploader__icon::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 8px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--primary);
  border-radius: 999px;
}

.image-uploader__icon::after {
  content: "";
  position: absolute;
  left: 8px;
  top: -6px;
  width: 14px;
  height: 7px;
  border-radius: 6px 6px 0 0;
  background: var(--primary);
}

.image-uploader__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.image-uploader__hint {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.image-uploader__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
