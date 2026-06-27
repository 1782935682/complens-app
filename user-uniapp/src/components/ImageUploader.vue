<script setup lang="ts">
import type { LocalImageAsset } from '@/types';
import AppButton from './AppButton.vue';

const props = defineProps<{
  image?: LocalImageAsset;
  compareMode?: boolean;
  recognizing?: boolean;
  statusTitle?: string;
  statusDescription?: string;
  busyLabel?: string;
}>();
const emit = defineEmits<{ camera: []; album: []; scanCode: []; manual: []; clear: []; recognize: []; fileSelected: [file: File] }>();

function chooseAlbum() {
  if (openBrowserFileChooser()) return;
  emit('album');
}

function chooseAlbumFromStage() {
  if (props.recognizing) return;
  chooseAlbum();
}

function openBrowserFileChooser(): boolean {
  if (typeof document === 'undefined') return false;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.position = 'fixed';
  input.style.left = '-10000px';
  input.style.top = '0';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (file) emit('fileSelected', file);
  }, { once: true });
  document.body.appendChild(input);
  input.click();
  window.setTimeout(() => {
    if (document.body.contains(input)) input.remove();
  }, 30_000);
  return true;
}
</script>

<template>
  <view class="image-uploader">
    <view class="image-uploader__stage">
      <template v-if="image?.tempFilePath">
        <image class="image-uploader__preview" :src="image.tempFilePath" mode="aspectFill" />
        <view class="image-uploader__selected">
          <text class="image-uploader__selected-title">
            {{ statusTitle || (compareMode ? '已选择第二款包装图' : '已选择包装图') }}
          </text>
          <text class="image-uploader__selected-desc">
            {{ statusDescription || (compareMode ? '信息足够时会进入两款对比。' : '将用这张图生成购买建议。') }}
          </text>
        </view>
      </template>
      <view
        v-else
        class="image-uploader__empty image-uploader__empty--interactive"
        role="button"
        tabindex="0"
        :aria-label="compareMode ? '选择第二款包装标签图片' : '选择包装标签图片'"
        @tap="chooseAlbumFromStage"
      >
        <view class="image-uploader__frame">
          <view class="image-uploader__corner image-uploader__corner--tl" />
          <view class="image-uploader__corner image-uploader__corner--tr" />
          <view class="image-uploader__corner image-uploader__corner--bl" />
          <view class="image-uploader__corner image-uploader__corner--br" />
          <view class="image-uploader__icon" />
        </view>
        <text class="image-uploader__title">{{ compareMode ? '选择第二款包装标签' : '选择包装标签图片' }}</text>
        <text class="image-uploader__hint">
          {{ compareMode ? '拍清第二款的配料表、营养表或条码；信息足够时进入两款对比。' : '拍清配料表、营养表或条码，识别后直接生成购买建议。' }}
        </text>
        <view class="image-uploader__signals">
          <view class="image-uploader__signal">
            <text class="image-uploader__signal-icon">配</text>
            <text class="image-uploader__signal-text">配料</text>
          </view>
          <view class="image-uploader__signal">
            <text class="image-uploader__signal-icon">营</text>
            <text class="image-uploader__signal-text">营养</text>
          </view>
          <view class="image-uploader__signal">
            <text class="image-uploader__signal-icon">码</text>
            <text class="image-uploader__signal-text">条码</text>
          </view>
        </view>
      </view>
    </view>
    <view class="image-uploader__actions">
      <AppButton v-if="image" class="image-uploader__action image-uploader__action--wide" :disabled="recognizing" :loading="recognizing" @click="emit('recognize')">
        {{ recognizing ? (busyLabel || '识别中') : (compareMode ? '识别第二款' : '开始识别') }}
      </AppButton>
      <view v-else class="image-uploader__action image-uploader__action--wide image-uploader__file-action">
        <AppButton class="image-uploader__action-button" :disabled="recognizing" @click="chooseAlbum">
        {{ compareMode ? '上传识别第二款' : '上传识别' }}
        </AppButton>
      </view>
      <AppButton class="image-uploader__action" variant="secondary" :disabled="recognizing" @click="emit('camera')">
        {{ compareMode ? '拍第二款' : '拍照识别' }}
      </AppButton>
      <AppButton class="image-uploader__action" variant="secondary" :disabled="recognizing" @click="emit('scanCode')">扫条码/二维码</AppButton>
      <AppButton class="image-uploader__action image-uploader__action--wide" variant="text" :disabled="recognizing" @click="emit('manual')">手动输入</AppButton>
      <AppButton v-if="image" class="image-uploader__action image-uploader__action--wide" variant="text" :disabled="recognizing" @click="emit('clear')">重新选择</AppButton>
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

.image-uploader__preview {
  display: block;
}

.image-uploader__selected {
  margin-top: var(--space-sm);
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 18rpx;
  background: rgba(238, 250, 245, 0.86);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: var(--space-sm);
}

.image-uploader__selected-title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
}

.image-uploader__selected-desc {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
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

.image-uploader__empty--interactive {
  cursor: pointer;
  transition: border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
}

.image-uploader__empty--interactive:active {
  transform: translateY(1px) scale(0.995);
  border-color: rgba(18, 151, 128, 0.34);
  background: linear-gradient(180deg, rgba(238, 250, 245, 0.96), var(--surface));
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

.image-uploader__signals {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}

.image-uploader__signal {
  min-height: 88rpx;
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.image-uploader__signal-icon {
  width: 42rpx;
  height: 42rpx;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1;
}

.image-uploader__signal-text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
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

.image-uploader__file-action {
  position: relative;
}

.image-uploader__action-button {
  width: 100%;
}

</style>
