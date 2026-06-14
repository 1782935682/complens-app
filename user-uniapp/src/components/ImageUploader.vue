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
      <text class="image-uploader__icon">□</text>
      <text class="image-uploader__title">拍摄或上传食品标签</text>
      <text class="image-uploader__hint">配料表、营养成分表或包装正面都可以先拍一张。</text>
    </view>
    <view class="image-uploader__actions">
      <AppButton @click="emit('camera')">拍照</AppButton>
      <AppButton variant="secondary" @click="emit('album')">上传图片</AppButton>
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
  border: 1px dashed rgba(5, 150, 105, 0.38);
  border-radius: var(--radius-card);
  background: var(--primary-soft);
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
  color: var(--primary);
  font-size: 32px;
  line-height: 1;
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
