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
const autoCameraStarted = ref(false);
const autoGenerateAfterOcr = ref(false);

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
const qualityIssues = computed(() => buildQualityIssues());
const ingredientCountText = computed(() => {
  const count = parseIngredientList(ingredientText.value).length;
  return count ? `已整理 ${count} 项` : '建议补充';
});
const nutritionCountText = computed(() => {
  const count = countUsefulLines(nutritionText.value);
  return count ? `已整理 ${count} 行` : '可选补充';
});
const allergenCountText = computed(() => allergenText.value.trim() ? '已识别' : '可选补充');
const frontClaimsCountText = computed(() => {
  const count = countUsefulLines(frontClaimsText.value);
  return count ? `已整理 ${count} 条` : '可选补充';
});
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
    return;
  }
  if (getQueryValue(query, 'auto') === 'camera') {
    autoGenerateAfterOcr.value = true;
    if (!autoCameraStarted.value) {
      autoCameraStarted.value = true;
      setTimeout(() => {
        void choose('camera');
      }, 80);
    }
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
    applyExtraction(extractLabelText(normalizedDraft), draft.ocr?.mode === 'manual');
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
    await startRecognize();
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
    error.value = '请拍照或选择一张清晰的食品标签图片。';
    return;
  }
  stage.value = 'recognizing';
  startLoadingMessages(['正在识别标签文字...', '正在整理配料和营养信息...']);
  error.value = '';
  editHint.value = '';
  try {
    const next = await recognizeImageByBackend(image.value);
    const normalized = normalizeOcrResult(next);
    ocrResult.value = next;
    rawOcrText.value = normalized.rawText || next.text || '';
    loadingText.value = '正在剔除无关噪音...';
    applyExtraction(extractLabelText(normalized), false);
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
    if (autoGenerateAfterOcr.value && hasAnyLabelText.value) {
      manualOverride.value = true;
      await generateResult({ fromAutoRecognition: true });
      return;
    }
    if (!hasIngredient && !hasNutrition && !frontClaimsText.value.trim()) {
      error.value = '没有识别到清晰的包装文字，请重新拍清配料、营养数字或过敏原区域，或手动粘贴文字。';
    } else if (!hasIngredient && hasNutrition) {
      editHint.value = '当前只识别到营养成分表，也可以生成解读；如包装有配料表，建议补充后结果更完整。';
    } else if (!hasIngredient && frontClaimsText.value.trim()) {
      editHint.value = '当前主要识别到包装声明，可以先生成简要提示；补拍配料或营养数字后结果会更完整。';
    } else if (extractionConfidence.value === 'low') {
      error.value = '没有识别到清晰的配料或营养数字，请重新拍清包装文字区域，或手动粘贴标签文字。';
    } else if (next.mode === 'fallback') {
      error.value = next.errorMessage || '识别失败，可以重新拍摄食品标签区域，或手动粘贴标签文字。';
    } else {
      editHint.value = '请先确认识别文字，再生成食品标签解读。';
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
  editHint.value = '';
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

function clearTextSection(section: 'ingredient' | 'nutrition' | 'allergen' | 'frontClaims') {
  if (section === 'ingredient') ingredientText.value = '';
  if (section === 'nutrition') nutritionText.value = '';
  if (section === 'allergen') allergenText.value = '';
  if (section === 'frontClaims') frontClaimsText.value = '';
  manualOverride.value = true;
  editHint.value = '已清空对应内容，可以重新粘贴或输入。';
}

function applyExtraction(result: LabelTextExtraction, allowManualOverride = false) {
  ingredientText.value = result.ingredientText;
  nutritionText.value = result.nutritionText;
  allergenText.value = result.allergenText;
  frontClaimsText.value = result.frontClaimsText;
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
    error.value = '当前食品标签识别置信度较低，请手动修改或重新拍摄标签区域。';
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

function buildTargetLoadingText(): string {
  const attention = getAttentionSettings();
  if (attention.primaryGoal === 'sugar') return '正在查看控糖相关项目...';
  if (attention.primaryGoal === 'lowSodium') return '正在查看低钠相关项目...';
  if (attention.primaryGoal === 'fatLoss') return '正在查看减脂相关项目...';
  if (attention.isChildrenMode) return '正在查看儿童模式关注项...';
  return '正在按关注项排序...';
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

function buildQualityIssues(): string[] {
  const issues: string[] = [];
  if (!hasAnyConfirmedText.value) {
    issues.push('没有整理出可用的标签文字，可以重新拍摄或手动输入。');
    return issues;
  }
  if (shouldShowLowConfidence.value) {
    issues.push('文字区域不够清晰，建议让配料表或营养表占满画面。');
  }
  if (ignoredText.value.length >= 3) {
    issues.push('识别到较多包装信息，结果会优先使用配料、营养数字和过敏原文字。');
  }
  if (isNutritionOnly.value) {
    issues.push('当前只有营养数字，补充配料表后可以看到添加剂解释。');
  }
  if (isFrontOnly.value) {
    issues.push('当前主要是包装声明，需要配料表或营养表才能给出更多结果。');
  }
  if (!ingredientText.value.trim() && allergenText.value.trim()) {
    issues.push('已识别到致敏原提示，补充配料表后结果会更完整。');
  }
  return Array.from(new Set(issues)).slice(0, 3);
}

function countUsefulLines(value: string): number {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .length;
}

function matchedAllergenLabels(text: string): string[] {
  return allergenOptions
    .filter((option) => option.keywords.some((keyword) => text.includes(keyword)))
    .map((option) => option.label)
    .slice(0, 4);
}
</script>

<template>
  <view class="page" :class="[stage === 'confirm' ? 'page--confirm' : 'page--capture stack', stage === 'confirm' && !image?.tempFilePath ? 'page--manual-confirm' : '']">
    <template v-if="stage !== 'confirm'">
      <view class="capture-intro">
        <text class="capture-intro__title">拍清包装文字</text>
        <text class="capture-intro__desc">整包、配料、营养数字都可以拍；识别到可用文字后自动生成结果。</text>
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
      <view v-if="image?.tempFilePath" class="confirm-dim" />
      <view v-if="image?.tempFilePath" class="confirm-topbar">
        <text class="confirm-back" @tap="clearImage">‹</text>
      </view>
      <scroll-view scroll-y class="confirm-sheet">
        <ErrorState v-if="error" title="需要补充文字" :description="error" action-label="重新拍食品标签" @action="clearImage" />
        <view class="confirm-content">
          <view class="confirm-heading">
            <text class="confirm-title">手动输入标签文字</text>
            <text class="confirm-desc">识别失败或想补充内容时，粘贴配料表和营养数字即可生成结果。</text>
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
            <view v-if="qualityIssues.length" class="quality-panel">
              <view class="quality-panel__list">
                <view v-for="issue in qualityIssues" :key="issue" class="quality-panel__item">
                  <text class="quality-panel__dot" />
                  <text class="quality-panel__text">{{ issue }}</text>
                </view>
              </view>
            </view>
          </view>
          <view class="confirm-section">
            <view class="confirm-section__head">
              <view class="confirm-section__title-group">
                <text class="field-label">配料表</text>
                <text class="confirm-section__desc">用于识别添加剂、主要配料和关注项</text>
              </view>
              <view class="confirm-section__meta">
                <text class="confirm-section__status" :class="{ 'confirm-section__status--empty': !ingredientText.trim() }">{{ ingredientCountText }}</text>
                <text v-if="ingredientText.trim()" class="confirm-section__clear" @tap="clearTextSection('ingredient')">清空</text>
              </view>
            </view>
            <textarea v-model="ingredientText" class="textarea textarea--ingredient" auto-height placeholder="粘贴或输入配料表文字，例如：水、白砂糖、乳粉、食品添加剂..." @input="manualOverride = true" />
          </view>
          <view class="confirm-section">
            <view class="confirm-section__head">
              <view class="confirm-section__title-group">
                <text class="field-label">营养数字</text>
                <text class="confirm-section__desc">用于查看糖、钠、脂肪、能量等标示</text>
              </view>
              <view class="confirm-section__meta">
                <text class="confirm-section__status" :class="{ 'confirm-section__status--empty': !nutritionText.trim() }">{{ nutritionCountText }}</text>
                <text v-if="nutritionText.trim()" class="confirm-section__clear" @tap="clearTextSection('nutrition')">清空</text>
              </view>
            </view>
            <textarea v-model="nutritionText" class="textarea textarea--compact" auto-height placeholder="可选，例如：能量、蛋白质、脂肪、碳水化合物、糖、钠" @input="manualOverride = true" />
          </view>
          <view class="confirm-section">
            <view class="confirm-section__head">
              <view class="confirm-section__title-group">
                <text class="field-label">致敏原提示</text>
                <text class="confirm-section__desc">用于提示牛奶、大豆、花生等已标示信息</text>
              </view>
              <view class="confirm-section__meta">
                <text class="confirm-section__status" :class="{ 'confirm-section__status--empty': !allergenText.trim() }">{{ allergenCountText }}</text>
                <text v-if="allergenText.trim()" class="confirm-section__clear" @tap="clearTextSection('allergen')">清空</text>
              </view>
            </view>
            <textarea v-model="allergenText" class="textarea textarea--compact" auto-height placeholder="可选，例如：本品含有牛奶、大豆，可能含有花生" @input="manualOverride = true" />
            <text v-if="editHint" class="muted">{{ editHint }}</text>
          </view>
          <view class="confirm-section">
            <view class="confirm-section__head">
              <view class="confirm-section__title-group">
                <text class="field-label">包装声明</text>
                <text class="confirm-section__desc">用于查看 0 糖、低脂、高蛋白等包装说法</text>
              </view>
              <view class="confirm-section__meta">
                <text class="confirm-section__status" :class="{ 'confirm-section__status--empty': !frontClaimsText.trim() }">{{ frontClaimsCountText }}</text>
                <text v-if="frontClaimsText.trim()" class="confirm-section__clear" @tap="clearTextSection('frontClaims')">清空</text>
              </view>
            </view>
            <textarea v-model="frontClaimsText" class="textarea textarea--compact" auto-height placeholder="例如：0糖、低脂、高蛋白、减盐等包装声明" @input="manualOverride = true" />
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


.page--manual-confirm {
  padding: calc(28rpx + env(safe-area-inset-top)) 32rpx calc(56rpx + env(safe-area-inset-bottom));
  overflow: visible;
  background: var(--bg);
}

.page--manual-confirm .confirm-sheet {
  position: static;
  height: auto;
  min-height: calc(100vh - 84rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  border-radius: 24rpx;
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  animation: none;
}

.page--manual-confirm .scan-summary {
  background: var(--surface);
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
.confirm-field,
.confirm-section,
.confirm-section__title-group,
.confirm-section__meta {
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

.confirm-section {
  border: 1px solid var(--line);
  border-radius: 20rpx;
  background: var(--surface);
  padding: var(--space-md);
  box-shadow: 0 6rpx 18rpx rgba(26, 44, 37, 0.04);
}

.confirm-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.confirm-section__title-group {
  min-width: 0;
  flex: 1 1 auto;
  gap: 2px;
}

.confirm-section__desc {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.confirm-section__meta {
  align-items: flex-end;
  flex: 0 0 auto;
  gap: 2px;
}

.confirm-section__status {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
  padding: 4px 8px;
  white-space: nowrap;
}

.confirm-section__status--empty {
  background: var(--surface-subtle);
  color: var(--muted);
}

.confirm-section__clear {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.4;
  padding: 4px 2px;
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

.quality-panel {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.68);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.quality-panel__title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
}

.quality-panel__list {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.quality-panel__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
}

.quality-panel__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999px;
  background: var(--primary-strong);
  flex: 0 0 auto;
  margin-top: 13rpx;
}

.quality-panel__text {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.55;
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
