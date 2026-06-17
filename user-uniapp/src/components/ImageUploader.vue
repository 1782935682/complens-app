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
        <view class="image-uploader__icon" />
        <text class="image-uploader__title">拍清楚食品标签</text>
        <text class="image-uploader__hint">优先拍配料表，也可拍营养成分表或包装正面文字。</text>
      </view>
      <view class="image-uploader__guide">
        <view class="image-uploader__guide-frame" />
        <view class="image-uploader__guide-copy">
          <text class="image-uploader__guide-title">请将食品标签放在框内</text>
          <text class="image-uploader__guide-hint">配料表最完整；营养成分表和正面声明会保留给用户确认。</text>
        </view>
      </view>
    </view>
    <view class="image-uploader__actions">
      <AppButton @click="emit('camera')">拍食品标签</AppButton>
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

.image-uploader__stage {
  position: relative;
  min-height: 220px;
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

.image-uploader__guide {
  position: absolute;
  inset: var(--space-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  pointer-events: none;
  gap: var(--space-sm);
}

.image-uploader__guide-frame {
  min-height: 118px;
  border: 2px solid rgba(18, 151, 128, 0.82);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 999px rgba(19, 31, 36, 0.16);
}

.image-uploader__guide-copy {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}

.image-uploader__guide-title {
  color: var(--primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.4;
}

.image-uploader__guide-hint {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
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
