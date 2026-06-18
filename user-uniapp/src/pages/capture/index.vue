<script setup lang="ts">
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import LoadingState from '@/components/LoadingState.vue';
import { allergenOptions } from '@/constants/attention';
import { routes } from '@/constants/routes';
import { chooseLabelImage } from '@/platform/camera';
import { matchIngredientsByApi } from '@/services/api/ingredients';
import { buildLabelReportWithAdapter, parseNutritionWithAdapter } from '@/services/api/labels';
import { buildManualOcrResult, recognizeImageByBackend } from '@/services/api/ocr';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getScanDraft, resetScanDraft, saveReport, saveScanDraft } from '@/stores/scanStore';
import type { AttentionSettings, LabelType, LocalImageAsset, OcrResult, ScanDraft } from '@/types';
import { recognizeAdditivesFromText } from '@/utils/additiveRules';
import { parseIngredientList } from '@/utils/ingredientParser';
import { extractLabelText, type LabelTextExtraction, type LabelTextConfidence, type LabelTextSourceType } from '@/utils/labelTextExtractor';
import { classifyLabelText } from '@/utils/labelClassifier';
import {
  buildEffectiveLabelTextFromParts,
  buildLocalLabelAnalysis,
  buildScanDraftFromAnalysis,
  type LocalLabelAnalysisInput,
  type LocalLabelAnalysisResult
} from '@/utils/localLabelAnalysis';
import { normalizeOcrResult } from '@/utils/ocrAdapter';

type CaptureStage = 'pick' | 'recognizing' | 'confirm';
type QueryMap = Record<string, unknown>;

const image = ref<LocalImageAsset | undefined>();
const stage = ref<CaptureStage>('pick');
const error = ref('');
const editHint = ref('');
const ocrResult = ref<OcrResult | undefined>();
const rawOcrText = ref('');
const ingredientText = ref('');
const nutritionText = ref('');
const allergenText = ref('');
const frontClaimsText = ref('');
const ignoredText = ref<string[]>([]);
const extractionConfidence = ref<LabelTextConfidence>('low');
const extractionSourceType = ref<LabelTextSourceType>('ocr');
const manualOverride = ref(false);
const productName = ref('');
const labelType = ref<LabelType>('unknown_label');
const generating = ref(false);
const loadingText = ref('');
const loadingTimer = ref<ReturnType<typeof setInterval> | undefined>();
const attentionSettings = ref<AttentionSettings>(getAttentionSettings());

const additivePreview = computed(() => recognizeAdditivesFromText(ingredientText.value, attentionSettings.value).slice(0, 5));
const quickSignals = computed(() => buildQuickSignals({
  ingredientText: ingredientText.value,
  nutritionText: nutritionText.value,
  allergenText: allergenText.value,
  additiveCount: additivePreview.value.length
}));
const isLowConfidence = computed(() => extractionConfidence.value === 'low');
const hasPrimaryLabelText = computed(() => Boolean(ingredientText.value.trim() || nutritionText.value.trim()));
const hasAnyLabelText = computed(() => Boolean(ingredientText.value.trim() || nutritionText.value.trim() || frontClaimsText.value.trim()));
const isNutritionOnly = computed(() => !ingredientText.value.trim() && Boolean(nutritionText.value.trim()));
const isFrontOnly = computed(() => !ingredientText.value.trim() && !nutritionText.value.trim() && Boolean(frontClaimsText.value.trim()));
const shouldShowLowConfidence = computed(() => isLowConfidence.value && extractionSourceType.value === 'ocr' && !manualOverride.value && !isNutritionOnly.value);
const canGenerate = computed(() => hasAnyLabelText.value && (!isLowConfidence.value || manualOverride.value || extractionSourceType.value === 'manual' || isNutritionOnly.value || isFrontOnly.value));
const hasAnyConfirmedText = computed(() => Boolean(ingredientText.value.trim() || nutritionText.value.trim() || allergenText.value.trim() || frontClaimsText.value.trim()));
const shouldShowManualModifyAction = computed(() => extractionSourceType.value !== 'manual' && !manualOverride.value);
const confidenceText = computed(() => {
  if (extractionSourceType.value === 'manual') return '手动输入';
  if (extractionConfidence.value === 'high') return '识别较清楚';
  if (extractionConfidence.value === 'medium') return '基本可用';
  return '需要确认';
});

function getQueryValue(rawQuery: QueryMap | undefined, key: string): string {
  const value = rawQuery?.[key];
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return typeof value === 'string' ? value : '';
}

onLoad((query) => {
  if (getQueryValue(query, 'mode') === 'manual') {
    startManualTextEntry();
  }
});

onShow(() => {
  attentionSettings.value = getAttentionSettings();
  const draft = getScanDraft();
  if (draft.isFastScan === false && !draft.image && !draft.confirmedText && !draft.ocr) {
    startManualTextEntry();
    return;
  }
  image.value = draft.image;
  if (draft.confirmedText) {
    const normalizedDraft = normalizeOcrResult({
      text: draft.confirmedText,
      rawText: draft.confirmedText,
      blocks: draft.ocr?.blocks,
      mode: draft.ocr?.mode,
      provider: draft.ocr?.provider
    }, draft.ocr?.mode === 'manual' ? 'manual' : undefined);
    applyExtraction(extractLabelText(normalizedDraft), draft.ocr?.mode === 'manual', normalizedDraft.rawText);
  }
  productName.value = draft.productName || productName.value;
  labelType.value = draft.labelType || 'unknown_label';
  ocrResult.value = draft.ocr;
  if (buildEffectiveLabelText()) stage.value = 'confirm';
});

onUnload(() => {
  stopLoadingMessages();
});

async function choose(source: 'camera' | 'album') {
  error.value = '';
  editHint.value = '';
  try {
    const nextImage = await chooseLabelImage(source);
    resetScanDraft();
    image.value = nextImage;
    resetExtractedText();
    productName.value = '';
    ocrResult.value = undefined;
    labelType.value = 'unknown_label';
    saveScanDraft({ image: nextImage });
    await startRecognize({ autoGenerate: true });
  } catch {
    error.value = source === 'camera' ? '相机暂不可用，请检查权限，或改用相册上传。' : '没有选择图片，请重新上传。';
  }
}

function clearImage() {
  image.value = undefined;
  resetExtractedText();
  productName.value = '';
  ocrResult.value = undefined;
  labelType.value = 'unknown_label';
  editHint.value = '';
  stage.value = 'pick';
  resetScanDraft();
}

async function startRecognize(options: { autoGenerate?: boolean } = {}) {
  if (!image.value) {
    error.value = '请先拍照或选择一张清晰的食品标签图片。';
    return;
  }
  stage.value = 'recognizing';
  startLoadingMessages(['正在识别标签文字...', '正在整理配料和营养信息...']);
  error.value = '';
  editHint.value = '';
  let shouldOpenEditor = true;
  try {
    const next = await recognizeImageByBackend(image.value);
    const normalized = normalizeOcrResult(next);
    ocrResult.value = next;
    rawOcrText.value = normalized.rawText || next.text || '';
    loadingText.value = '正在剔除无关噪音...';
    applyExtraction(extractLabelText(normalized), false, normalized.rawText || next.text || '');
    const effectiveText = buildEffectiveLabelText();
    labelType.value = resolveDetectedType(effectiveText);
    saveScanDraft({
      image: image.value,
      ocr: next,
      confirmedText: effectiveText,
      labelType: labelType.value
    });
    const hasIngredient = Boolean(ingredientText.value.trim());
    const hasNutrition = Boolean(nutritionText.value.trim());
    const canAutoGenerate = options.autoGenerate
      && next.mode !== 'fallback'
      && (hasIngredient || hasNutrition)
      && extractionConfidence.value !== 'low';
    if (canAutoGenerate) {
      shouldOpenEditor = !(await generateResult({ fromAutoRecognition: true }));
    } else if (!hasIngredient && !hasNutrition && !frontClaimsText.value.trim()) {
      error.value = '没有识别到清晰配料表、营养成分表或包装文字，请重新拍摄标签区域，或手动粘贴文字。';
    } else if (!hasIngredient && hasNutrition) {
      editHint.value = '当前只识别到营养成分表，也可以生成解读；如包装有配料表，建议补充后结果更完整。';
    } else if (!hasIngredient && frontClaimsText.value.trim()) {
      editHint.value = '当前主要识别到包装正面或其他文字，可以先生成信息不足提示；建议继续补拍配料表或营养成分表。';
    } else if (extractionConfidence.value === 'low') {
      error.value = '没有识别到清晰配料表或营养成分表，请重新拍摄标签区域，或手动粘贴标签文字。';
    } else if (next.mode === 'fallback') {
      error.value = next.errorMessage || '识别失败，可以重新拍摄食品标签区域，或手动粘贴标签文字。';
    }
  } catch {
    const manual = buildManualOcrResult();
    ocrResult.value = manual;
    resetExtractedText();
    rawOcrText.value = getScanDraft().confirmedText || '';
    labelType.value = 'unknown_label';
    saveScanDraft({ image: image.value, ocr: manual, confirmedText: '', labelType: labelType.value });
    error.value = '识别失败，可以重新拍摄食品标签区域，或手动粘贴标签文字。';
  } finally {
    stopLoadingMessages();
    if (shouldOpenEditor) stage.value = 'confirm';
  }
}

function startManualTextEntry() {
  image.value = undefined;
  resetExtractedText('manual');
  productName.value = '';
  ocrResult.value = buildManualOcrResult();
  labelType.value = 'unknown_label';
  error.value = '';
  editHint.value = '可以直接粘贴配料表、营养成分表或包装正面文字；致敏原提示可选补充。';
  stage.value = 'confirm';
  resetScanDraft();
  saveScanDraft({ ocr: ocrResult.value, confirmedText: '', labelType: labelType.value });
}

function showEditHint() {
  manualOverride.value = true;
  editHint.value = '请在下方文本框里简单修改错字或漏字，改完后点击生成解读。';
}

function clearText() {
  resetExtractedText(extractionSourceType.value);
  manualOverride.value = true;
  editHint.value = '可以重新粘贴或输入食品标签文字。';
}

function applyExtraction(result: LabelTextExtraction, allowManualOverride = false, sourceText = '') {
  ingredientText.value = result.ingredientText;
  nutritionText.value = result.nutritionText;
  allergenText.value = result.allergenText;
  frontClaimsText.value = resolveFrontClaimsText(sourceText, result);
  ignoredText.value = result.ignoredText;
  extractionConfidence.value = result.confidence;
  extractionSourceType.value = result.sourceType;
  manualOverride.value = allowManualOverride || result.sourceType === 'manual';
}

function resetExtractedText(sourceType: LabelTextSourceType = 'ocr') {
  rawOcrText.value = '';
  ingredientText.value = '';
  nutritionText.value = '';
  allergenText.value = '';
  frontClaimsText.value = '';
  ignoredText.value = [];
  extractionConfidence.value = 'low';
  extractionSourceType.value = sourceType;
  manualOverride.value = sourceType === 'manual';
}

function buildEffectiveLabelText(): string {
  return buildEffectiveLabelTextFromParts({
    ingredientText: ingredientText.value,
    nutritionText: nutritionText.value,
    allergenText: allergenText.value,
    frontClaimsText: frontClaimsText.value
  });
}

async function generateResult(options: { fromAutoRecognition?: boolean } = {}): Promise<boolean> {
  const confirmedText = buildEffectiveLabelText();
  if (!hasAnyLabelText.value) {
    error.value = '未识别到清晰的食品标签文字，请重新拍摄标签区域，或手动输入标签文字。';
    return false;
  }
  if (!canGenerate.value) {
    error.value = '当前食品标签识别置信度较低，请先手动修改或重新拍摄标签区域。';
    return false;
  }
  generating.value = true;
  startLoadingMessages(options.fromAutoRecognition
    ? ['识别完成，正在生成结果...', buildTargetLoadingText()]
    : ['正在识别添加剂和营养信息...', buildTargetLoadingText()]);
  error.value = '';
  try {
    const attention = getAttentionSettings();
    const analysis = await buildAnalysisWithAdapters({
      productName: productName.value.trim(),
      ingredientText: ingredientText.value,
      nutritionText: nutritionText.value,
      allergenText: allergenText.value,
      frontClaimsText: frontClaimsText.value,
      confidence: resolveEffectiveConfidence(),
      attention,
      sourceType: resolveInputSourceType(),
      ocr: ocrResult.value || getScanDraft().ocr,
      image: image.value
    });
    saveReport(analysis.report);
    saveScanDraft({
      ...buildCurrentTextDraft({ resetDerived: true }),
      ...buildScanDraftFromAnalysis(analysis)
    });
    uni.navigateTo({ url: `${routes.report}?id=${encodeURIComponent(analysis.report.id)}` });
    return true;
  } catch {
    error.value = '暂时无法生成解读，请检查文字后重试。';
    return false;
  } finally {
    stopLoadingMessages();
    generating.value = false;
  }
}

async function buildAnalysisWithAdapters(input: LocalLabelAnalysisInput): Promise<LocalLabelAnalysisResult> {
  const localAnalysis = buildLocalLabelAnalysis(input);
  const nutrition = input.nutritionText?.trim()
    ? await parseNutritionWithAdapter(input.nutritionText)
    : localAnalysis.nutrition;
  let matches = localAnalysis.matches;
  if (localAnalysis.ingredients.length) {
    try {
      matches = await matchIngredientsByApi(localAnalysis.ingredients);
    } catch {
      matches = localAnalysis.matches;
    }
  }
  const report = await buildLabelReportWithAdapter({
    productName: input.productName || '',
    rawText: localAnalysis.confirmedText,
    ingredients: localAnalysis.ingredients,
    matches,
    nutrition,
    attention: input.attention,
    labelType: localAnalysis.labelType,
    frontClaimsText: input.frontClaimsText || '',
    ocr: input.ocr,
    sourceMeta: localAnalysis.report.analysisSource
  });
  return {
    ...localAnalysis,
    report,
    nutrition,
    matches
  };
}

function resolveEffectiveConfidence(): LabelTextConfidence {
  if (manualOverride.value && hasPrimaryLabelText.value) return 'medium';
  if (isNutritionOnly.value && extractionConfidence.value === 'low') return 'medium';
  return extractionConfidence.value;
}

function buildCurrentTextDraft(options: { resetDerived: boolean }): Partial<ScanDraft> {
  const confirmedText = buildEffectiveLabelText();
  const previous = getScanDraft();
  const textChanged = confirmedText !== previous.confirmedText;
  const nextDraft: Partial<ScanDraft> = {
    confirmedText,
    productName: productName.value.trim(),
    labelType: labelType.value,
    frontClaimsText: frontClaimsText.value.trim()
  };
  if (options.resetDerived || textChanged) {
    nextDraft.ingredients = [];
    nextDraft.nutrition = [];
    nextDraft.matches = [];
  }
  if (textChanged && previous.ocr) nextDraft.ocr = { ...previous.ocr, text: rawOcrText.value || confirmedText };
  return nextDraft;
}

function resolveInputSourceType(): 'ocr' | 'manual' | 'demo' {
  if (manualOverride.value && (!rawOcrText.value.trim() || ocrResult.value?.mode === 'fallback')) return 'manual';
  return extractionSourceType.value === 'manual' ? 'manual' : 'ocr';
}

function resolveFrontClaimsText(sourceText: string, result: LabelTextExtraction): string {
  const rawText = sourceText.trim();
  if (!rawText || result.ingredientText.trim() || result.nutritionText.trim()) return '';
  return rawText.replace(/^包装文字\s*[:：]\s*/i, '').trim();
}

function buildTargetLoadingText(): string {
  const attention = getAttentionSettings();
  if (attention.primaryGoal === 'sugar') return '正在结合您的控糖目标分析...';
  if (attention.primaryGoal === 'lowSodium') return '正在结合您的低钠目标分析...';
  if (attention.primaryGoal === 'fatLoss') return '正在结合您的减脂目标分析...';
  if (attention.isChildrenMode) return '正在结合儿童模式分析...';
  return '正在结合您的关注目标分析...';
}

function startLoadingMessages(messages: string[]) {
  stopLoadingMessages();
  let index = 0;
  loadingText.value = messages[0] || '正在处理...';
  if (messages.length <= 1) return;
  loadingTimer.value = setInterval(() => {
    index = Math.min(index + 1, messages.length - 1);
    loadingText.value = messages[index];
  }, 900);
}

function stopLoadingMessages() {
  if (loadingTimer.value) clearInterval(loadingTimer.value);
  loadingTimer.value = undefined;
  loadingText.value = '';
}

function resolveDetectedType(value: string): LabelType {
  const localResult = classifyLabelText(value);
  if (!localResult.requiresUserSelection && localResult.labelType === 'nutrition_facts') return 'nutrition_facts';
  const parsed = parseIngredientList(value);
  if (parsed.length >= 2) return 'ingredient_list';
  if (shouldParseNutrition(value, localResult.labelType)) return 'nutrition_facts';
  return 'unknown_label';
}

function shouldParseNutrition(value: string, detectedType: LabelType): boolean {
  if (detectedType === 'nutrition_facts') return true;
  const compact = value.replace(/\s+/g, '');
  return /营养成分表|营养素参考值|NRV|每100(?:g|克|ml|毫升).*(?:能量|蛋白质|脂肪|碳水化合物|钠)/i.test(compact);
}

function buildQuickSignals(value: {
  ingredientText: string;
  nutritionText: string;
  allergenText: string;
  additiveCount: number;
}) {
  const compactIngredient = value.ingredientText.replace(/\s+/g, '');
  const compactNutrition = value.nutritionText.replace(/\s+/g, '');
  const compactAllergen = value.allergenText.replace(/\s+/g, '');
  return [
    value.additiveCount ? `添加剂：${value.additiveCount} 种` : '添加剂：暂未明显识别',
    /白砂糖|蔗糖|糖浆|果葡糖浆|葡萄糖浆|麦芽糖浆|甜味剂|碳水化合物/.test(`${compactIngredient}${compactNutrition}`) ? '糖类关键词' : '',
    /钠|食盐|味精|谷氨酸钠|酱油粉|复合调味料/.test(`${compactIngredient}${compactNutrition}`) ? '钠/盐相关' : '',
    /脂肪|植物油|植脂末|代可可脂|反式脂肪/.test(`${compactIngredient}${compactNutrition}`) ? '脂肪相关' : '',
    /蛋白质/.test(compactNutrition) ? '蛋白质' : '',
    matchedAllergenLabels(`${compactIngredient}${compactAllergen}`).length ? `过敏原：${matchedAllergenLabels(`${compactIngredient}${compactAllergen}`).join('、')}` : ''
  ].filter(Boolean);
}

function matchedAllergenLabels(text: string): string[] {
  return allergenOptions
    .filter((option) => option.keywords.some((keyword) => text.includes(keyword)))
    .map((option) => option.label)
    .slice(0, 4);
}
</script>

<template>
  <view class="page" :class="stage === 'confirm' ? 'page--confirm' : 'page--capture stack'">
    <template v-if="stage !== 'confirm'">
      <view class="capture-intro">
        <text class="capture-intro__title">对准配料表或营养表</text>
        <text class="capture-intro__desc">选择图片后自动识别，清楚时直接出结果。</text>
      </view>
      <ImageUploader :image="image" @camera="choose('camera')" @album="choose('album')" @clear="clearImage" />
      <ErrorState v-if="error" title="图片选择失败" :description="error" action-label="重试上传" @action="choose('album')" />
      <LoadingState v-if="stage === 'recognizing'">{{ loadingText || '正在识别标签文字...' }}</LoadingState>
      <view class="capture-actions">
        <AppButton class="capture-actions__button" variant="secondary" @click="startManualTextEntry">手动输入</AppButton>
      </view>
    </template>

    <template v-else>
      <image v-if="image?.tempFilePath" class="confirm-bg" :src="image.tempFilePath" mode="aspectFill" />
      <view class="confirm-dim" />
      <view class="confirm-topbar">
        <text class="confirm-back" @tap="clearImage">‹</text>
      </view>
      <scroll-view scroll-y class="confirm-sheet">
        <ErrorState v-if="error" title="需要补充文字" :description="error" action-label="重新拍标签" @action="clearImage" />
        <view class="confirm-content">
          <view class="confirm-heading">
            <text class="confirm-title">补充标签文字</text>
            <text class="confirm-desc">识别不清时，粘贴配料表或营养成分表文字即可生成结果</text>
          </view>
          <view class="scan-summary">
            <view class="confidence-row">
              <text class="soft-tag" :class="{ 'soft-tag--warning': isLowConfidence }">{{ confidenceText }}</text>
              <text v-if="ignoredText.length" class="muted">已过滤 {{ ignoredText.length }} 行广告语或包装信息。</text>
            </view>
            <view v-if="shouldShowLowConfidence" class="low-confidence">
              <text class="low-confidence__title">未识别到清晰配料表</text>
              <text class="muted">建议重新拍摄配料表或营养成分表，或手动粘贴食品标签文字后再生成解读。</text>
            </view>
            <view v-if="quickSignals.length" class="pill-list">
              <text v-for="signal in quickSignals" :key="signal" class="soft-tag">{{ signal }}</text>
            </view>
          </view>
          <view class="confirm-field">
            <textarea v-model="ingredientText" class="textarea textarea--ingredient" auto-height placeholder="粘贴或输入配料表文字，例如：水、白砂糖、乳粉、食品添加剂..." @input="manualOverride = true" />
          </view>
          <view v-if="nutritionText" class="confirm-field">
            <text class="field-label">营养成分</text>
            <textarea v-model="nutritionText" class="textarea textarea--compact" auto-height placeholder="可选，例如：能量、蛋白质、脂肪、碳水化合物、糖、钠" @input="manualOverride = true" />
          </view>
          <view v-if="allergenText" class="confirm-field">
            <text class="field-label">致敏原提示</text>
            <textarea v-model="allergenText" class="textarea textarea--compact" auto-height placeholder="可选，例如：本品含有牛奶、大豆，可能含有花生" @input="manualOverride = true" />
            <text v-if="editHint" class="muted">{{ editHint }}</text>
          </view>
          <view v-if="frontClaimsText" class="confirm-field">
            <text class="field-label">其他文字</text>
            <textarea v-model="frontClaimsText" class="textarea textarea--compact" auto-height placeholder="识别到的包装正面、产品名、规格或其他文字" @input="manualOverride = true" />
          </view>
          <LoadingState v-if="generating">{{ loadingText || '正在识别添加剂和营养信息...' }}</LoadingState>
          <AppButton class="confirm-main-button" :disabled="!canGenerate || generating" :loading="generating" @click="generateResult">生成结果</AppButton>
          <view class="confirm-secondary-actions">
            <AppButton v-if="shouldShowManualModifyAction" variant="secondary" @click="showEditHint">手动修改</AppButton>
            <AppButton v-if="hasAnyConfirmedText" variant="text" @click="clearText">清空文字</AppButton>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<style scoped>
.page--capture {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #ffffff 0%, var(--bg) 100%);
}

.capture-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.capture-actions__button {
  width: 100%;
}

.capture-actions__button:only-child {
  grid-column: 1 / -1;
}

.capture-intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.capture-intro__title {
  color: var(--text);
  font-size: var(--font-size-xl);
  font-weight: 900;
  line-height: 1.25;
}

.capture-intro__desc {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.page--confirm {
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  background: #111815;
}

.confirm-bg {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.confirm-dim {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(12, 18, 16, 0.42);
}

.confirm-topbar {
  position: relative;
  z-index: 2;
  padding: calc(14px + env(safe-area-inset-top)) 16px 0;
}

.confirm-back {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.28);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  line-height: 28px;
}

.confirm-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  height: 64vh;
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -16px 42px rgba(0, 0, 0, 0.18);
  padding: var(--space-xl) 32rpx calc(var(--space-lg) + env(safe-area-inset-bottom));
  animation: sheet-up 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes sheet-up {
  from {
    transform: translateY(26px);
  }
  to {
    transform: translateY(0);
  }
}

.confirm-content,
.confirm-heading,
.confirm-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.confirm-content {
  gap: var(--space-md);
}

.confirm-heading {
  align-items: center;
  text-align: center;
}

.confirm-title {
  color: var(--text);
  font-size: var(--font-size-xl);
  font-weight: 900;
  line-height: 1.25;
}

.confirm-desc {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.confirm-main-button {
  width: 100%;
  margin-top: var(--space-sm);
}

.confirm-secondary-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.scan-summary {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: var(--radius-card);
  background: rgba(238, 250, 245, 0.82);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.scan-summary__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 800;
  line-height: 1.35;
}

.confidence-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.soft-tag--warning {
  background: rgba(236, 176, 70, 0.16);
  color: #8a5d12;
}

.low-confidence {
  border: 1px solid rgba(236, 176, 70, 0.28);
  border-radius: var(--radius-card);
  background: rgba(236, 176, 70, 0.12);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.low-confidence__title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.4;
}

.textarea--ingredient {
  min-height: 132px;
}

.textarea--compact {
  min-height: 104px;
}

@media screen and (max-height: 700px) {
  .confirm-sheet {
    height: 70vh;
    padding-top: var(--space-lg);
  }

  .confirm-heading {
    gap: 4px;
  }

  .confirm-title {
    font-size: var(--font-size-lg);
  }

  .textarea--ingredient {
    min-height: 108px;
  }
}
</style>
