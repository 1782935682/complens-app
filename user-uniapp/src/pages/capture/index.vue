<script setup lang="ts">
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import ErrorState from '@/components/ErrorState.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StepIndicator from '@/components/StepIndicator.vue';
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
const steps = ['输入', '确认', '解读'];

const activeStep = computed(() => (stage.value === 'confirm' ? 1 : 0));
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
    stage.value = 'pick';
    saveScanDraft({ image: nextImage });
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

async function startRecognize() {
  if (!image.value) {
    error.value = '请先拍照或选择一张清晰的食品标签图片。';
    return;
  }
  stage.value = 'recognizing';
  startLoadingMessages(['正在扫描食品标签文字...', '正在剔除无关噪音...']);
  error.value = '';
  editHint.value = '';
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
    if (!hasIngredient && !hasNutrition && !frontClaimsText.value.trim()) {
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
    stage.value = 'confirm';
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

async function generateResult() {
  const confirmedText = buildEffectiveLabelText();
  if (!hasAnyLabelText.value) {
    error.value = '未识别到清晰的食品标签文字，请重新拍摄标签区域，或手动输入标签文字。';
    return;
  }
  if (!canGenerate.value) {
    error.value = '当前食品标签识别置信度较低，请先手动修改或重新拍摄标签区域。';
    return;
  }
  generating.value = true;
  startLoadingMessages(['正在识别添加剂和营养信息...', buildTargetLoadingText()]);
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
    uni.redirectTo({ url: `${routes.report}?id=${encodeURIComponent(analysis.report.id)}` });
  } catch {
    error.value = '暂时无法生成解读，请检查文字后重试。';
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
  <view class="page page--calm stack">
    <PageHeader
      title="拍食品标签"
      subtitle="优先拍配料表，也支持营养成分表和包装正面文字；识别后必须先确认再生成解读。"
    />
    <StepIndicator :steps="steps" :active-index="activeStep" />

    <template v-if="stage !== 'confirm'">
      <ImageUploader :image="image" @camera="choose('camera')" @album="choose('album')" @clear="clearImage" />
      <ErrorState v-if="error" title="图片选择失败" :description="error" action-label="重试上传" @action="choose('album')" />
      <AppCard>
        <view class="stack">
          <text class="section-title">建议这样拍</text>
          <view class="simple-grid">
            <view class="simple-list-item">
              <text class="simple-list-item__title">优先拍配料表</text>
              <text class="simple-list-item__desc">配料表最适合识别添加剂、糖类关键词、油脂和过敏原。</text>
            </view>
            <view class="simple-list-item">
              <text class="simple-list-item__title">也可补拍营养表或正面文字</text>
              <text class="simple-list-item__desc">营养成分表和正面声明会进入确认区，产品名、规格、厂家和条码会弱化处理。</text>
            </view>
          </view>
          <text class="muted">小字、反光或弯曲包装可能识别不准，后面可以轻量修正；不要跳过文本确认。</text>
        </view>
      </AppCard>
      <LoadingState v-if="stage === 'recognizing'">{{ loadingText || '正在扫描食品标签文字...' }}</LoadingState>
      <AppButton :disabled="!image || stage === 'recognizing'" :loading="stage === 'recognizing'" @click="startRecognize">开始识别食品标签</AppButton>
      <AppButton variant="secondary" @click="startManualTextEntry">手动输入 / 粘贴</AppButton>
    </template>

    <template v-else>
      <ErrorState v-if="error" title="请先确认有效文字" :description="error" action-label="重新拍食品标签" @action="clearImage" />
      <AppCard>
        <view class="stack">
          <view>
            <text class="field-label">商品名（可选）</text>
            <input v-model="productName" class="input" placeholder="例如：草莓味酸奶" />
          </view>
          <view class="scan-summary">
            <text class="scan-summary__title">请确认识别内容</text>
            <text class="muted">系统优先保留配料表，也会单独整理营养成分、致敏原提示和包装正面文字；产品名、规格、厂家和条码会弱化处理。</text>
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
            <view v-if="additivePreview.length" class="simple-list">
              <view v-for="item in additivePreview" :key="item.id" class="simple-list-item">
                <text class="simple-list-item__title">{{ item.name }} · {{ item.category }}</text>
                <text class="simple-list-item__desc">{{ item.effect }}</text>
              </view>
            </view>
          </view>
          <view>
            <text class="field-label">已识别到的配料表</text>
            <textarea v-model="ingredientText" class="textarea textarea--ingredient" auto-height placeholder="粘贴或输入配料表文字，例如：水、白砂糖、乳粉、食品添加剂..." @input="manualOverride = true" />
          </view>
          <view>
            <text class="field-label">已识别到的营养成分</text>
            <textarea v-model="nutritionText" class="textarea textarea--compact" auto-height placeholder="可选，例如：能量、蛋白质、脂肪、碳水化合物、糖、钠" @input="manualOverride = true" />
          </view>
          <view>
            <text class="field-label">已识别到的致敏原提示</text>
            <textarea v-model="allergenText" class="textarea textarea--compact" auto-height placeholder="可选，例如：本品含有牛奶、大豆，可能含有花生" @input="manualOverride = true" />
            <text v-if="editHint" class="muted">{{ editHint }}</text>
          </view>
          <view v-if="frontClaimsText">
            <text class="field-label">包装正面 / 其他文字</text>
            <textarea v-model="frontClaimsText" class="textarea textarea--compact" auto-height placeholder="识别到的包装正面、产品名、规格或其他文字" @input="manualOverride = true" />
          </view>
        </view>
      </AppCard>
      <LoadingState v-if="generating">{{ loadingText || '正在识别添加剂和营养信息...' }}</LoadingState>
      <AppButton :disabled="!canGenerate || generating" :loading="generating" @click="generateResult">确认无误，生成解读</AppButton>
      <AppButton v-if="shouldShowManualModifyAction" variant="secondary" @click="showEditHint">有误，手动修改</AppButton>
      <AppButton v-if="hasAnyConfirmedText" variant="text" @click="clearText">清空文字</AppButton>
      <AppButton variant="text" @click="clearImage">重新拍食品标签</AppButton>
    </template>
  </view>
</template>

<style scoped>
.scan-summary {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: var(--radius-card);
  background: var(--primary-soft);
  padding: var(--space-md);
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
</style>
