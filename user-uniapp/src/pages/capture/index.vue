<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StepIndicator from '@/components/StepIndicator.vue';
import { dataStatusLabel } from '@/constants/dataStatus';
import { routes, navigateToRoute } from '@/constants/routes';
import { chooseLabelImage } from '@/platform/camera';
import { buildLabelReportWithAdapter, classifyLabelWithAdapter, parseNutritionWithAdapter, upsertLabelScanSessionWithAdapter } from '@/services/api/labels';
import { buildManualOcrResult, recognizeImageByBackend } from '@/services/api/ocr';
import { buildWebSearchUrl, matchIngredientsByApi } from '@/services/api/ingredients';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getScanDraft, resetScanDraft, saveReport, saveScanDraft } from '@/stores/scanStore';
import type { AttentionSettings, IngredientMatch, LabelClassification, LabelType, LocalImageAsset, OcrResult, ParsedIngredient, ReportAnalysisSource, ScanDraft } from '@/types';
import { recognizeAdditivesFromText } from '@/utils/additiveRules';
import { parseIngredientList } from '@/utils/ingredientParser';
import { buildMockProductText, findMockProductByText, type MockProductRecord } from '@/utils/mockProductLibrary';

type CaptureStage = 'pick' | 'recognizing' | 'confirm';
type QueryMap = Record<string, unknown>;

const image = ref<LocalImageAsset | undefined>();
const stage = ref<CaptureStage>('pick');
const error = ref('');
const ocrResult = ref<OcrResult | undefined>();
const text = ref('');
const productName = ref('');
const classification = ref<LabelClassification | undefined>();
const labelType = ref<LabelType>('unknown_label');
const isFastMode = ref(false);
const generating = ref(false);
const libraryCandidate = ref<MockProductRecord | undefined>();
const attentionSettings = ref<AttentionSettings>(getAttentionSettings());
const steps = ['输入', '分析', '结果'];
const isEmpty = computed(() => !text.value.trim());
const activeStep = computed(() => (stage.value === 'confirm' ? 1 : 0));
const additivePreview = computed(() => recognizeAdditivesFromText(text.value, attentionSettings.value).slice(0, 4));
const quickSignals = computed(() => buildQuickSignals(text.value, additivePreview.value.length));

function isQuickScanMode(value: unknown): boolean {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'fast' || normalized === '1' || normalized === 'true' || normalized === 'auto';
}

function getQueryValue(rawQuery: QueryMap | undefined, key: string): string {
  const value = rawQuery?.[key];
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return typeof value === 'string' ? value : '';
}

function syncFastScanMode(query?: QueryMap) {
  const draft = getScanDraft();
  const queryFastMode = isQuickScanMode(
    getQueryValue(query, 'mode') || getQueryValue(query, 'auto') || getQueryValue(query, 'scanMode')
  );
  isFastMode.value = queryFastMode || Boolean(draft.isFastScan);
}

onLoad((query) => {
  syncFastScanMode(query);
  if (getQueryValue(query, 'mode') === 'manual') {
    startManualTextEntry();
  }
});

onShow(() => {
  syncFastScanMode();
  attentionSettings.value = getAttentionSettings();
  const draft = getScanDraft();
  image.value = draft.image;
  text.value = draft.confirmedText || draft.ocr?.text || text.value;
  productName.value = draft.productName || productName.value;
  labelType.value = draft.labelType || 'unknown_label';
  classification.value = draft.classification;
  ocrResult.value = draft.ocr;
  if (text.value) stage.value = 'confirm';
});

async function choose(source: 'camera' | 'album') {
  error.value = '';
  try {
    const persistedFastMode = Boolean(getScanDraft().isFastScan);
    const nextImage = await chooseLabelImage(source);
    resetScanDraft();
    image.value = nextImage;
    text.value = '';
    productName.value = '';
    libraryCandidate.value = undefined;
    classification.value = undefined;
    ocrResult.value = undefined;
    labelType.value = 'unknown_label';
    stage.value = 'pick';
    saveScanDraft({ image: nextImage, isFastScan: persistedFastMode });
  } catch {
    error.value = source === 'camera' ? '相机暂不可用，请检查权限，或改用相册上传。' : '没有选择图片，请重新上传。';
  }
}

function clearImage() {
  image.value = undefined;
  text.value = '';
  productName.value = '';
  libraryCandidate.value = undefined;
  classification.value = undefined;
  ocrResult.value = undefined;
  labelType.value = 'unknown_label';
  stage.value = 'pick';
  resetScanDraft();
}

async function startRecognize() {
  if (!image.value) {
    error.value = '请先拍照或选择一张商品图片。';
    return;
  }
  stage.value = 'recognizing';
  error.value = '';
  try {
    const next = await recognizeImageByBackend(image.value);
    ocrResult.value = next;
    text.value = next.text || '';
    classification.value = text.value ? await classifyLabelWithAdapter(text.value) : undefined;
    labelType.value = resolveDetectedType(classification.value, text.value);
    await syncScanSession(next, 'auto', labelType.value);
    const mockProduct = findMockProductByText(text.value);
    libraryCandidate.value = mockProduct;
    if (mockProduct) productName.value = mockProduct.productName;
    saveScanDraft({
      image: image.value,
      ocr: next,
      confirmedText: text.value,
      classification: classification.value,
      labelType: labelType.value,
      isFastScan: false
    });
    if (!text.value) error.value = '没有识别到清楚文字，可以手动输入配料或营养信息。';
    if (mockProduct) {
      error.value = '识别到本地示例商品库记录，请先核对识别文字，再决定是否使用商品库结果。';
    } else if (text.value && (labelType.value === 'front_claims' || labelType.value === 'barcode_or_product' || labelType.value === 'unknown_label')) {
      error.value = '暂未命中本地商品库。可以继续拍配料表或营养成分表，也可以手动输入包装文字。';
    }
    if (next.mode === 'fallback') error.value = next.errorMessage || '识别结果不完整，可以先手动修正。';
  } catch {
    const manual = buildManualOcrResult();
    ocrResult.value = manual;
    text.value = getScanDraft().confirmedText || '';
    libraryCandidate.value = undefined;
    classification.value = undefined;
    labelType.value = 'unknown_label';
    await syncScanSession(manual, 'manual', labelType.value);
    saveScanDraft({ image: image.value, ocr: manual, confirmedText: text.value, labelType: labelType.value });
    error.value = '图片暂时识别失败，可以直接手动输入。';
  } finally {
    stage.value = 'confirm';
  }
}

function startManualTextEntry() {
  image.value = undefined;
  text.value = '';
  productName.value = '';
  libraryCandidate.value = undefined;
  classification.value = undefined;
  ocrResult.value = buildManualOcrResult();
  labelType.value = 'unknown_label';
  error.value = '';
  stage.value = 'confirm';
  resetScanDraft();
  saveScanDraft({ ocr: ocrResult.value, confirmedText: '', labelType: labelType.value });
}

function clearText() {
  text.value = '';
}

async function generateResult() {
  const confirmedText = text.value.trim();
  if (!confirmedText) return;
  generating.value = true;
  error.value = '';
  try {
    const nextClassification = await classifyLabelWithAdapter(confirmedText);
    const detectedType = resolveDetectedType(nextClassification, confirmedText);
    const ingredients = detectedType === 'ingredient_list' ? parseIngredientList(confirmedText) : [];
    const nutrition = shouldParseNutrition(confirmedText, detectedType) ? await parseNutritionWithAdapter(confirmedText) : [];
    const matches = ingredients.length ? await matchOrBuildNetworkLines(ingredients) : [];
    const frontClaimsText = detectedType === 'front_claims' || detectedType === 'barcode_or_product' || detectedType === 'unknown_label'
      ? confirmedText
      : '';
    const report = await buildLabelReportWithAdapter({
      productName: productName.value.trim(),
      rawText: confirmedText,
      ingredients,
      matches,
      nutrition,
      attention: getAttentionSettings(),
      labelType: detectedType,
      frontClaimsText,
      ocr: ocrResult.value || getScanDraft().ocr,
      sourceMeta: buildSourceMeta(detectedType, confirmedText, ocrResult.value || getScanDraft().ocr)
    });
    saveReport(report);
    saveScanDraft({
      ...buildCurrentTextDraft({ resetDerived: true }),
      classification: nextClassification,
      labelType: detectedType,
      ingredients,
      nutrition,
      matches,
      frontClaimsText,
      sourceMeta: report.analysisSource
    });
    uni.redirectTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
  } catch {
    error.value = '暂时无法生成结果，请检查网络后重试。';
  } finally {
    generating.value = false;
  }
}

async function useLibraryCandidate() {
  if (!libraryCandidate.value || !ocrResult.value) return;
  await generateProductLibraryResult(libraryCandidate.value, ocrResult.value);
}

async function generateProductLibraryResult(product: MockProductRecord, nextOcrResult: OcrResult) {
  generating.value = true;
  error.value = '';
  try {
    const rawProductText = buildMockProductText(product);
    const ingredients = parseIngredientList(product.ingredientText);
    const nutrition = await parseNutritionWithAdapter(product.nutritionText);
    const matches = ingredients.length ? await matchOrBuildNetworkLines(ingredients) : [];
    const attention = getAttentionSettings();
    const sourceMeta = buildProductLibrarySourceMeta(product, nextOcrResult, attention);
    const report = await buildLabelReportWithAdapter({
      productName: product.productName,
      rawText: rawProductText,
      ingredients,
      matches,
      nutrition,
      attention,
      labelType: 'barcode_or_product',
      frontClaimsText: nextOcrResult.text,
      ocr: nextOcrResult,
      sourceMeta
    });
    saveReport(report);
    saveScanDraft({
      image: image.value,
      ocr: nextOcrResult,
      confirmedText: rawProductText,
      productName: product.productName,
      classification: classification.value,
      labelType: 'barcode_or_product',
      ingredients,
      nutrition,
      matches,
      frontClaimsText: nextOcrResult.text,
      sourceMeta
    });
    uni.redirectTo({ url: `${routes.report}?id=${encodeURIComponent(report.id)}` });
  } catch {
    error.value = '商品库记录暂时无法整理，可以继续拍配料表或手动输入。';
    stage.value = 'confirm';
  } finally {
    generating.value = false;
  }
}

function buildCurrentTextDraft(options: { resetDerived: boolean }): Partial<ScanDraft> {
  const confirmedText = text.value.trim();
  const previous = getScanDraft();
  const textChanged = confirmedText !== previous.confirmedText;
  const labelTypeChanged = labelType.value !== previous.labelType;
  const nextDraft: Partial<ScanDraft> = {
    confirmedText,
    productName: productName.value.trim(),
    labelType: labelType.value,
    frontClaimsText: labelType.value === 'front_claims' || labelType.value === 'barcode_or_product' ? confirmedText : ''
  };
  if (options.resetDerived || textChanged || labelTypeChanged) {
    nextDraft.ingredients = [];
    nextDraft.nutrition = [];
    nextDraft.matches = [];
  }
  if (textChanged || labelTypeChanged) nextDraft.classification = undefined;
  if (textChanged && previous.ocr) nextDraft.ocr = { ...previous.ocr, text: confirmedText };
  return nextDraft;
}

function buildSourceMeta(
  detectedType: LabelType,
  confirmedText: string,
  sourceOcr?: OcrResult
): ReportAnalysisSource {
  const attention = getAttentionSettings();
  const sourceType = sourceOcr?.mode === 'manual'
    ? 'manual_input'
    : detectedType === 'nutrition_facts'
      ? 'captured_nutrition'
      : detectedType === 'front_claims' || detectedType === 'barcode_or_product'
        ? 'captured_product'
        : 'captured_ingredient';
  return {
    sourceType,
    sourceLabel: sourceLabelForType(sourceType),
    description: sourceDescriptionForType(sourceType),
    fromProductLibrary: false,
    fromUserCapture: Boolean(image.value && sourceOcr?.mode !== 'manual'),
    fromManualInput: sourceOcr?.mode === 'manual',
    imagePath: image.value?.tempFilePath,
    imageSummary: image.value ? `${image.value.name || '商品图片'}，${Math.round((image.value.size || 0) / 1024)}KB` : undefined,
    ocrText: confirmedText,
    targetSnapshot: {
      goals: [...attention.goals],
      detailTerms: [...attention.detailTerms],
      customTerms: [...attention.customTerms]
    }
  };
}

function buildProductLibrarySourceMeta(product: MockProductRecord, sourceOcr: OcrResult, attention: AttentionSettings): ReportAnalysisSource {
  return {
    sourceType: 'mock_product_library',
    sourceLabel: '本地示例商品库',
    description: '本次分析依据：本地示例商品库记录，建议以包装实物为准。',
    fromProductLibrary: true,
    fromUserCapture: Boolean(image.value),
    fromManualInput: false,
    imagePath: image.value?.tempFilePath,
    imageSummary: image.value ? `${image.value.name || '商品图片'}，${Math.round((image.value.size || 0) / 1024)}KB` : undefined,
    ocrText: sourceOcr.text,
    productLibraryId: product.id,
    productLibraryName: product.productName,
    targetSnapshot: {
      goals: [...attention.goals],
      detailTerms: [...attention.detailTerms],
      customTerms: [...attention.customTerms]
    }
  };
}

function sourceLabelForType(type: ReportAnalysisSource['sourceType']): string {
  if (type === 'manual_input') return '手动输入内容';
  if (type === 'captured_nutrition') return '用户拍摄的营养成分表';
  if (type === 'captured_product') return '用户拍摄的商品正面/条码';
  return '用户拍摄的配料表';
}

function sourceDescriptionForType(type: ReportAnalysisSource['sourceType']): string {
  if (type === 'manual_input') return '本次分析依据：手动输入内容。';
  if (type === 'captured_nutrition') return '本次分析依据：你拍摄的营养成分表。';
  if (type === 'captured_product') return '本次分析依据：你拍摄的商品正面或条码文字。';
  return '本次分析依据：你拍摄的配料表。';
}

function resolveDetectedType(nextClassification: LabelClassification | undefined, confirmedText: string): LabelType {
  if (nextClassification && !nextClassification.requiresUserSelection && nextClassification.labelType !== 'unknown_label') {
    return nextClassification.labelType;
  }
  const parsed = parseIngredientList(confirmedText);
  if (parsed.length >= 3) return 'ingredient_list';
  const compact = confirmedText.replace(/\s+/g, '');
  if (/营养成分表|能量|蛋白质|脂肪|碳水化合物|钠|NRV/i.test(compact)) return 'nutrition_facts';
  return 'unknown_label';
}

function shouldParseNutrition(value: string, detectedType: LabelType): boolean {
  if (detectedType === 'nutrition_facts') return true;
  const compact = value.replace(/\s+/g, '');
  return /营养成分表|营养素参考值|NRV|每100(?:g|克|ml|毫升).*(?:能量|蛋白质|脂肪|碳水化合物|钠)/i.test(compact);
}

async function matchOrBuildNetworkLines(ingredients: ParsedIngredient[]): Promise<IngredientMatch[]> {
  try {
    return await matchIngredientsByApi(ingredients);
  } catch {
    return ingredients.map((ingredient, index) => buildNetworkLine(ingredient.normalizedText, index));
  }
}

function buildNetworkLine(term: string, index: number): IngredientMatch {
  return {
    id: `network-${index}-${term}`,
    term,
    normalizedText: term,
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: dataStatusLabel('unknown_from_ocr'),
    confidence: 0,
    matchType: 'none',
    sourceName: '网络搜索线索',
    sourceType: 'web_search',
    sourceNote: '成分库暂未确认，已提供网络搜索线索，请打开后查看来源站点。',
    ingredientName: term,
    isAdditive: false,
    decision: 'pending',
    webSearchUrl: buildWebSearchUrl(term)
  };
}

async function syncScanSession(
  nextOcrResult: OcrResult,
  fallbackMode: 'manual' | 'auto',
  nextLabelType: LabelType
) {
  if (!image.value) return;
  try {
    const response = await upsertLabelScanSessionWithAdapter({
      sessionId: getScanDraft().scanSessionId,
      images: [{
        assetId: image.value.id,
        labelType: nextLabelType,
        mimeType: image.value.mimeType,
        status: mapScanStatus(nextOcrResult, fallbackMode)
      }]
    });
    if (response?.sessionId) saveScanDraft({ scanSessionId: response.sessionId });
  } catch {
    error.value = error.value || '识别记录同步暂时失败，已继续后续流程。';
  }
}

function mapScanStatus(nextOcrResult: OcrResult, fallbackMode: 'manual' | 'auto'): 'ocr_input' | 'ocr_success' | 'ocr_failed' | 'manual_entry' {
  if (fallbackMode === 'manual' || nextOcrResult.mode === 'manual') return 'manual_entry';
  if (nextOcrResult.mode === 'fallback' || nextOcrResult.mode === 'mock') return 'ocr_failed';
  return nextOcrResult.text ? 'ocr_success' : 'ocr_failed';
}

function buildQuickSignals(value: string, additiveCount: number) {
  const compact = value.replace(/\s+/g, '');
  return [
    additiveCount ? `已识别到 ${additiveCount} 种添加剂` : '暂未明显识别到添加剂',
    /营养成分表|能量|蛋白质|脂肪|碳水化合物|钠|NRV/i.test(compact) ? '识别到营养成分表' : '未明显识别到营养成分表',
    /白砂糖|糖浆|果葡糖浆|葡萄糖浆|麦芽糖浆|甜味剂|碳水化合物/.test(compact) ? '识别到糖或甜味相关词' : '',
    /钠|食盐|味精|谷氨酸钠|酱油粉|复合调味料/.test(compact) ? '识别到钠或盐相关词' : '',
    /脂肪|植物油|植脂末|代可可脂|反式脂肪/.test(compact) ? '识别到脂肪相关词' : '',
    /花生|坚果|牛奶|乳|大豆|麸质|小麦|鸡蛋|咖啡因/.test(compact) ? '识别到常见过敏/忌口词' : ''
  ].filter(Boolean);
}
</script>

<template>
  <view class="page page--calm stack">
    <PageHeader
      title="拍商品 / 拍配料表"
      subtitle="支持商品正面、条码、配料表、营养成分表和手动输入。"
    />
    <StepIndicator :steps="steps" :active-index="activeStep" />

    <template v-if="stage !== 'confirm'">
      <ImageUploader :image="image" @camera="choose('camera')" @album="choose('album')" @clear="clearImage" />
      <ErrorState v-if="error" title="图片选择失败" :description="error" action-label="重试上传" @action="choose('album')" />
      <AppCard>
        <view class="stack">
          <text class="section-title">可以拍这些</text>
          <view class="simple-grid">
            <view class="simple-list-item">
              <text class="simple-list-item__title">商品正面 / 条码</text>
              <text class="simple-list-item__desc">先尝试识别商品名、品牌、条码和包装文字。</text>
            </view>
            <view class="simple-list-item">
              <text class="simple-list-item__title">配料表</text>
              <text class="simple-list-item__desc">商品未命中时，继续拍配料表分析添加剂。</text>
            </view>
            <view class="simple-list-item">
              <text class="simple-list-item__title">营养成分表</text>
              <text class="simple-list-item__desc">看糖、钠、脂肪、能量等字段。</text>
            </view>
            <view class="simple-list-item">
              <text class="simple-list-item__title">看不清时</text>
              <text class="simple-list-item__desc">可以直接手动输入文字。</text>
            </view>
          </view>
        </view>
      </AppCard>
      <LoadingState v-if="stage === 'recognizing'">正在识别商品信息...</LoadingState>
      <AppButton :disabled="!image || stage === 'recognizing'" :loading="stage === 'recognizing'" @click="startRecognize">识别商品</AppButton>
      <AppButton variant="secondary" @click="startManualTextEntry">手动输入</AppButton>
    </template>

    <template v-else>
      <ErrorState v-if="error" title="需要你确认一下" :description="error" action-label="重新识别" @action="startRecognize" />
      <AppCard v-if="libraryCandidate">
        <view class="stack">
          <text class="section-title">识别到示例商品库记录</text>
          <text class="muted">{{ libraryCandidate.productName }}。请先核对识别文字，确认无误后可用商品库里的配料和营养信息生成结果。</text>
          <AppButton :disabled="generating" :loading="generating" @click="useLibraryCandidate">使用商品库结果</AppButton>
        </view>
      </AppCard>
      <AppCard>
        <view class="stack">
          <view>
            <text class="field-label">商品名（可选）</text>
            <input v-model="productName" class="input" placeholder="例如：草莓味酸奶" />
          </view>
          <view v-if="text" class="scan-summary">
            <text class="scan-summary__title">识别摘要</text>
            <view class="pill-list">
              <text v-for="signal in quickSignals" :key="signal" class="soft-tag">{{ signal }}</text>
            </view>
            <view v-if="additivePreview.length" class="simple-list">
              <view v-for="item in additivePreview" :key="item.id" class="simple-list-item">
                <text class="simple-list-item__title">{{ item.name }} · {{ item.category }}</text>
                <text class="simple-list-item__desc">{{ item.effect }}</text>
              </view>
            </view>
            <text class="muted">如果没有命中商品库，可以继续用识别到的配料表或营养成分表生成结果；明显识别错的地方可以直接改。</text>
          </view>
          <view>
            <text class="field-label">包装文字（可选修正）</text>
            <textarea v-model="text" class="textarea" auto-height placeholder="粘贴或输入配料表、营养成分表上的文字" />
          </view>
        </view>
      </AppCard>
      <LoadingState v-if="generating">正在整理消费建议...</LoadingState>
      <EmptyState
        v-if="isEmpty"
        icon=""
        title="还没有可分析文字"
        description="可以手动输入商品名、配料或营养成分，也可以重新拍商品正面、条码或配料表。"
        action-label="重新拍商品"
        @action="clearImage"
      />
      <AppButton :disabled="isEmpty || generating" :loading="generating" @click="generateResult">生成消费建议</AppButton>
      <AppButton variant="secondary" @click="clearText">清空文字</AppButton>
      <AppButton variant="text" @click="clearImage">重新拍摄</AppButton>
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
</style>
