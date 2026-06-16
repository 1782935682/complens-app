<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import { routes } from '@/constants/routes';
import { chooseLabelImage } from '@/platform/camera';
import { getScanDraft, resetScanDraft, saveScanDraft } from '@/stores/scanStore';
import type { LocalImageAsset } from '@/types';

const image = ref<LocalImageAsset | undefined>();
const error = ref('');
const steps = ['拍照', '识别', '确认', '报告'];
const isFastMode = ref(false);

function isQuickScanMode(value: unknown): boolean {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'fast' || normalized === '1' || normalized === 'true' || normalized === 'auto';
}

onLoad((query) => {
  const queryFastMode = isQuickScanMode(query?.mode || query?.auto || query?.scanMode);
  const persistedFastMode = Boolean(getScanDraft().isFastScan);
  isFastMode.value = queryFastMode || persistedFastMode;
  if (isFastMode.value) {
    saveScanDraft({ isFastScan: false });
  }
});

onShow(() => {
  const draftImage = getScanDraft().image;
  if (!draftImage) {
    image.value = undefined;
    return;
  }
  if (image.value?.id === draftImage.id && image.value.tempFilePath && !draftImage.tempFilePath) return;
  image.value = draftImage;
});

async function choose(source: 'camera' | 'album') {
  error.value = '';
  try {
    image.value = await chooseLabelImage(source);
    resetScanDraft();
    saveScanDraft({ image: image.value });
  } catch {
    error.value = source === 'camera' ? '相机暂不可用，请检查权限，或改用相册上传。' : '没有选择图片，请重新上传。';
  }
}

function clearImage() {
  image.value = undefined;
  resetScanDraft();
}

function startManualTextEntry() {
  image.value = undefined;
  resetScanDraft();
  uni.navigateTo({ url: `${routes.confirmText}?entry=manual` });
}

function continueToOcr() {
  if (!image.value) {
    error.value = '请先拍照或上传一张食品标签图片。';
    return;
  }
  saveScanDraft({ image: image.value });
  const nextRoute = isFastMode.value ? `${routes.ocr}?mode=fast` : routes.ocr;
  uni.navigateTo({ url: nextRoute });
}
</script>

<template>
  <view class="page stack">
    <view>
      <text class="page-title">拍照/上传食品标签</text>
      <text class="page-subtitle">尽量拍清楚配料表、营养成分表或包装正面。H5/PWA 会使用文件选择作为降级入口。</text>
    </view>
    <StepIndicator :steps="steps" :active-index="0" />
    <ImageUploader :image="image" @camera="choose('camera')" @album="choose('album')" @clear="clearImage" />
    <ErrorState v-if="error" title="图片选择失败" :description="error" action-label="重试上传" @action="choose('album')" />
    <AppCard>
      <view class="stack">
        <text class="section-title">图片质量提示</text>
        <text class="muted">请保持标签完整、文字清晰、避免反光。图片仅用于本次识别和本机历史，不会在前端暴露任何识别 Key。</text>
      </view>
    </AppCard>
    <AppButton :disabled="!image" @click="continueToOcr">开始识别</AppButton>
    <AppButton variant="text" @click="startManualTextEntry">手动输入标签文字</AppButton>
  </view>
</template>
