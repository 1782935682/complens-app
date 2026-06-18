<script setup lang="ts">
import type { LocalImageAsset } from '@/types';
import AppButton from './AppButton.vue';

defineProps<{ image?: LocalImageAsset }>();
const emit = defineEmits<{ camera: []; album: []; clear: [] }>();
</script>

<template>
  <view class="image-uploader">
    <view class="image-uploader__stage">
      <image v-if="image?.tempFilePath" class="image-uploader__preview" :src="image.tempFilePath" mode="aspectFill" />
      <view v-else class="image-uploader__empty">
        <view class="image-uploader__frame">
          <view class="image-uploader__corner image-uploader__corner--tl" />
          <view class="image-uploader__corner image-uploader__corner--tr" />
          <view class="image-uploader__corner image-uploader__corner--bl" />
          <view class="image-uploader__corner image-uploader__corner--br" />
          <view class="image-uploader__icon" />
        </view>
        <text class="image-uploader__title">对准标签文字</text>
        <text class="image-uploader__hint">选择后自动识别并生成结果。</text>
      </view>
    </view>
    <view class="image-uploader__actions">
      <AppButton class="image-uploader__action" @click="emit('camera')">拍照识别</AppButton>
      <AppButton class="image-uploader__action" variant="secondary" @click="emit('album')">上传识别</AppButton>
      <AppButton v-if="image" class="image-uploader__action image-uploader__action--wide" variant="text" @click="emit('clear')">重新选择</AppButton>
    </view>
  </view>
</template>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.image-uploader__stage {
  position: relative;
  min-height: 420rpx;
}

.image-uploader__preview,
.image-uploader__empty {
  width: 100%;
  min-height: 420rpx;
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 36rpx;
  background: linear-gradient(180deg, var(--surface-subtle), var(--surface));
  box-shadow: var(--shadow-soft);
}

.image-uploader__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  text-align: center;
  gap: var(--space-md);
}

.image-uploader__frame {
  position: relative;
  width: 460rpx;
  max-width: 86%;
  min-height: 190rpx;
  border-radius: 28rpx;
  background: rgba(18, 151, 128, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
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

.image-uploader__corner {
  position: absolute;
  width: 42rpx;
  height: 42rpx;
}

.image-uploader__corner--tl {
  left: 20rpx;
  top: 20rpx;
  border-left: 4rpx solid var(--primary);
  border-top: 4rpx solid var(--primary);
  border-radius: 14rpx 0 0 0;
}

.image-uploader__corner--tr {
  right: 20rpx;
  top: 20rpx;
  border-right: 4rpx solid var(--primary);
  border-top: 4rpx solid var(--primary);
  border-radius: 0 14rpx 0 0;
}

.image-uploader__corner--bl {
  left: 20rpx;
  bottom: 20rpx;
  border-left: 4rpx solid var(--primary);
  border-bottom: 4rpx solid var(--primary);
  border-radius: 0 0 0 14rpx;
}

.image-uploader__corner--br {
  right: 20rpx;
  bottom: 20rpx;
  border-right: 4rpx solid var(--primary);
  border-bottom: 4rpx solid var(--primary);
  border-radius: 0 0 14rpx 0;
}

.image-uploader__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.image-uploader__hint {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.image-uploader__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.image-uploader__action {
  width: 100%;
}

.image-uploader__action--wide {
  grid-column: 1 / -1;
}
</style>
