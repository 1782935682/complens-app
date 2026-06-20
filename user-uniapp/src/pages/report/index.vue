<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Toast from '@/components/Toast.vue';
import { routes, navigateToRoute } from '@/constants/routes';
import { buildReportShareMessage, enableWeixinShareMenu, shareReport } from '@/platform/share';
import { getAttentionSettings } from '@/stores/attentionStore';
import { getReportById, getReports, resetScanDraft, saveReportFeedback, toggleReportFavorite } from '@/stores/scanStore';
import type {
  AdditiveRecognition,
  IngredientMatch,
  LabelReport,
  NutritionKey,
  NutritionSnapshotItem,
  ReportFeedbackReason
} from '@/types';
import type { ReportShareCard } from '@/platform/share';
import { summarizeAdditiveRecognitions } from '@/utils/additiveRules';
import { buildAdditiveRecognitions, buildConsumerDecision, buildNutritionSnapshot } from '@/utils/decisionRules';

type FindingTone = 'attention' | 'watch' | 'ok' | 'missing';
type ReportFinding = {
  key: string;
  label: string;
  status: string;
  detail: string;
  tone: FindingTone;
};

const report = ref<LabelReport | undefined>();
const attentionSettings = ref(getAttentionSettings());
const rawTextOpen = ref(false);
const message = ref('');
const feedbackReason = ref<ReportFeedbackReason>('ocr_wrong');
const feedbackNote = ref('');
const feedbackOpen = ref(false);

const feedbackOptions: Array<{ value: ReportFeedbackReason; label: string; detail: string }> = [
  { value: 'ocr_wrong', label: '识别错了', detail: '文字、数字或字段被识别错。' },
  { value: 'missing_text', label: '漏了内容', detail: '配料、营养或提示没有被带入。' },
  { value: 'unclear_explanation', label: '解释不清楚', detail: '报告说法不够直接。' },
  { value: 'other', label: '其他问题', detail: '这次结果还有别的问题。' }
];

const ingredients = computed(() => report.value?.ingredientSection.items ?? []);
const additiveRecognition = computed(() => {
  if (!report.value) return { total: 0, categoryCount: 0, items: [] as AdditiveRecognition[] };
  return report.value.additiveRecognition?.items?.length
    ? report.value.additiveRecognition
    : summarizeAdditiveRecognitions(buildAdditiveRecognitions(report.value, attentionSettings.value));
});
const nutritionSnapshot = computed(() => {
  if (!report.value) return [];
  return report.value.nutritionSnapshot?.length
    ? report.value.nutritionSnapshot
    : buildNutritionSnapshot(report.value.nutritionSection.fields, attentionSettings.value);
});
const decision = computed(() => {
  if (!report.value) return undefined;
  return buildConsumerDecision({
    ...report.value,
    additiveRecognition: additiveRecognition.value,
    nutritionSnapshot: nutritionSnapshot.value
  }, attentionSettings.value);
});
const foodAnalysis = computed(() => report.value?.foodAnalysis);
const overallLabel = computed(() => {
  if (foodAnalysis.value?.decisionText) return foodAnalysis.value.decisionText;
  const finding = headlineFinding.value;
  if (decision.value?.level === 'insufficient') return '信息不足';
  if (!finding) return '信息不足';
  if (finding.tone === 'attention') return `${finding.label}需要关注`;
  if (finding.tone === 'watch') return '有几项提醒';
  return '配料和营养已整理';
});
const hasIngredientEvidence = computed(() => Boolean(
  ingredients.value.length || report.value?.analysisSource?.ingredientText?.trim()
));
const hasNutritionNumbers = computed(() => nutritionSnapshot.value.some((item) => item.level !== '未识别'));
const nutritionBars = computed(() => nutritionSnapshot.value
  .filter((item) => item.level !== '未识别')
  .slice(0, 5));
const isInsufficientReport = computed(() => (
  decision.value?.level === 'insufficient'
  || (!hasIngredientEvidence.value && !hasNutritionNumbers.value && !additiveRecognition.value.total)
));
const shouldShowConsumerSections = computed(() => !isInsufficientReport.value);
const shouldShowAdditiveSection = computed(() => shouldShowConsumerSections.value && hasIngredientEvidence.value);
const overallDetail = computed(() => {
  if (foodAnalysis.value?.summary) return foodAnalysis.value.summary;
  if (isInsufficientReport.value) {
    return decision.value?.summary || '请补拍清晰的包装文字，或手动粘贴配料、营养数字和过敏原提示。';
  }
  return headlineFinding.value?.detail || '已整理高值项、添加剂和未确认线索。';
});
const allergyWarnings = computed(() => decision.value?.allergyWarnings ?? []);
const resultReasons = computed(() => (foodAnalysis.value?.mainReasons?.length
  ? foodAnalysis.value.mainReasons
  : decision.value?.reasons ?? []).slice(0, 6));
const suitableFor = computed(() => (foodAnalysis.value?.suitableFor?.length
  ? foodAnalysis.value.suitableFor
  : decision.value?.suitableFor ?? []).slice(0, 6));
const notSuitableFor = computed(() => (foodAnalysis.value?.notSuitableFor?.length
  ? foodAnalysis.value.notSuitableFor
  : decision.value?.lessSuitableFor ?? []).slice(0, 6));
const eatingAdvice = computed(() => foodAnalysis.value?.eatingAdvice || decision.value?.suggestions?.[0] || '');
const plainExplanation = computed(() => foodAnalysis.value?.plainExplanation || decision.value?.summary || '');
const productFacts = computed(() => [
  foodAnalysis.value?.productName && foodAnalysis.value.productName !== '未识别商品' ? `商品：${foodAnalysis.value.productName}` : '',
  foodAnalysis.value?.category ? `类型：${foodAnalysis.value.category}` : '',
  foodAnalysis.value?.productionDate ? `生产日期：${foodAnalysis.value.productionDate}` : ''
].filter(Boolean));
const detailNutritionRows = computed(() => {
  const nutrition = foodAnalysis.value?.nutrition || {};
  const fromFoodAnalysis = (['energy', 'protein', 'fat', 'carbohydrate', 'sodium', 'transFat'] as const)
    .map((key) => {
      const item = nutrition[key];
      if (!item?.text) return null;
      return {
        key,
        label: nutritionDetailLabel(key),
        value: item.text,
        level: item.level
      };
    })
    .filter(Boolean) as Array<{ key: string; label: string; value: string; level: string }>;
  if (fromFoodAnalysis.length) return fromFoodAnalysis;
  return (report.value?.nutritionSection.fields || [])
    .filter((item) => item.value.trim())
    .slice(0, 8)
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: `${item.value}${item.unit}`,
      level: item.nrvPercent ? `NRV ${item.nrvPercent}` : '已识别'
    }));
});
const additiveSummaryText = computed(() => {
  if (!hasIngredientEvidence.value) return '未拿到配料表，暂不查看添加剂。';
  const total = visibleAdditives.value.length;
  if (!total) return '当前配料表未匹配到本地常见添加剂规则，添加剂项为空。';
  return `配料表里看到 ${total} 种常见食品添加剂，下面解释它们通常做什么。`;
});
const keyFindings = computed<ReportFinding[]>(() => {
  const findings = [
    buildNutritionFinding('sugar', '糖'),
    buildNutritionFinding('sodium', '钠'),
    buildNutritionFinding('fat', '脂肪'),
    buildNutritionFinding('energy', '热量')
  ];
  if (hasIngredientEvidence.value) findings.push(buildAdditiveFinding());
  findings.push(buildAllergenFinding());
  return findings;
});
const headlineFinding = computed(() => (
  keyFindings.value.find((item) => item.tone === 'attention')
  || keyFindings.value.find((item) => item.tone === 'watch')
  || keyFindings.value.find((item) => item.tone === 'ok')
  || keyFindings.value[0]
));
const plainFindings = computed(() => keyFindings.value
  .filter((item) => item.tone !== 'missing' || item.key === 'allergen')
  .slice(0, 5));
const topFindings = computed(() => plainFindings.value
  .filter((item) => item.tone === 'attention' || item.tone === 'watch')
  .slice(0, 3));
const insightCards = computed(() => buildInsightCards());
const visibleAdditives = computed(() => {
  const pendingTexts = pendingIngredientChips.value.map(normalizeCompareText);
  return additiveRecognition.value.items
    .filter((item) => !pendingTexts.some((text) => item.matchedTerms.some((term) => {
      const normalizedTerm = normalizeCompareText(term);
      return normalizedTerm && (text.includes(normalizedTerm) || normalizedTerm.includes(text));
    })))
    .slice(0, 8);
});
const ingredientChips = computed(() => ingredients.value
  .filter((item) => !isPendingIngredient(item))
  .map((item) => item.ingredientName || item.normalizedText)
  .filter(Boolean)
  .filter(uniqueValue)
  .slice(0, 18));
const pendingIngredientChips = computed(() => ingredients.value
  .filter(isPendingIngredient)
  .map((item) => item.ingredientName || item.normalizedText)
  .filter(Boolean)
  .filter(uniqueValue)
  .slice(0, 8));
const rawLabelText = computed(() => report.value?.rawText || report.value?.analysisSource?.ocrText || '');
const sourceImagePath = computed(() => report.value?.analysisSource?.imagePath || '');
const shareCard = computed<ReportShareCard | undefined>(() => {
  if (!report.value || isInsufficientReport.value) return undefined;
  const shareItems = plainFindings.value
    .filter((item) => item.tone === 'attention' || item.tone === 'watch')
    .slice(0, 3);
  const points = (shareItems.length ? shareItems : plainFindings.value.slice(0, 3))
    .map((item) => `${item.label}：${item.status}`);
  const meta = [
    nutritionBars.value.length ? `营养数字 ${nutritionBars.value.length} 项` : '',
    visibleAdditives.value.length ? `添加剂 ${visibleAdditives.value.length} 种` : '',
    pendingIngredientChips.value.length ? `未确认 ${pendingIngredientChips.value.length} 项` : ''
  ].filter(Boolean).join(' · ');
  return {
    title: report.value.productName || '食品标签解读',
    headline: overallLabel.value,
    points,
    meta: meta || '已整理配料和营养线索'
  };
});

onLoad((query) => {
  enableWeixinShareMenu();
  attentionSettings.value = getAttentionSettings();
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : getReports()[0];
});

onShareAppMessage(() => buildReportShareMessage(report.value));

function buildNutritionFinding(key: NutritionKey, label: string): ReportFinding {
  const item = nutritionSnapshot.value.find((entry) => entry.key === key);
  if (!item || item.level === '未识别') {
    return {
      key,
      label,
      status: '未识别',
      detail: `没有识别到${label}数值，建议补拍营养成分表或以包装数字为准。`,
      tone: 'missing'
    };
  }
  return {
    key,
    label,
    status: item.level,
    detail: buildNutritionFindingDetail(item),
    tone: nutritionTone(item)
  };
}

function buildNutritionFindingDetail(item: NutritionSnapshotItem): string {
  const focus = nutritionFocusText(item.key);
  if (item.level === '较高') return `包装标示：${item.valueText}。${focus.high}`;
  if (item.level === '中等' || item.level === '一般') return `包装标示：${item.valueText}。${focus.medium}`;
  return `包装标示：${item.valueText}。${focus.low}`;
}

function nutritionTone(item: NutritionSnapshotItem): FindingTone {
  if (item.level === '较高') return 'attention';
  if (item.level === '中等' || item.level === '一般') return 'watch';
  return 'ok';
}

function nutritionFocusText(key: NutritionKey): { high: string; medium: string; low: string } {
  if (key === 'sugar') {
    return {
      high: '已归为重点关注项，份量会影响实际摄入。',
      medium: '糖类配料位置已纳入提醒。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'sodium') {
    return {
      high: '已归为重点关注项，份量会影响实际摄入。',
      medium: '咸味食物叠加时会更明显。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'fat') {
    return {
      high: '已归为重点关注项，份量会影响实际摄入。',
      medium: '已和热量一起整理。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'energy') {
    return {
      high: '已归为重点关注项，份量会影响实际摄入。',
      medium: '份量会影响实际摄入。',
      low: '当前不是重点提醒。'
    };
  }
  return {
    high: '已归为重点关注项。',
    medium: '已整理为营养数字。',
    low: '当前不是重点提醒。'
  };
}

function nutritionToneLabel(item: NutritionSnapshotItem): string {
  if (item.level === '较高') return '重点';
  if (item.level === '中等' || item.level === '一般') return '留意';
  return '较低';
}

function nutritionDetailLabel(key: string): string {
  if (key === 'energy') return '能量';
  if (key === 'protein') return '蛋白质';
  if (key === 'fat') return '脂肪';
  if (key === 'carbohydrate') return '碳水';
  if (key === 'sodium') return '钠';
  if (key === 'transFat') return '反式脂肪';
  return key;
}

function nutritionBarStyle(item: NutritionSnapshotItem): Record<string, string> {
  return { width: `${item.percent}%` };
}

function buildAdditiveFinding(): ReportFinding {
  if (!hasIngredientEvidence.value) {
    return {
      key: 'additives',
      label: '添加剂',
      status: '缺少配料表',
      detail: '未拿到配料表，暂不查看添加剂。',
      tone: 'missing'
    };
  }
  const additiveItems = visibleAdditives.value;
  if (!additiveItems.length) {
    return {
      key: 'additives',
      label: '添加剂',
      status: '未匹配到',
      detail: '当前配料表未匹配到本地常见添加剂规则，添加剂项为空。',
      tone: 'ok'
    };
  }
  const focusCount = additiveItems.filter((item) => item.displayLevel !== 'normal').length;
  return {
    key: 'additives',
    label: '添加剂',
    status: `${additiveItems.length} 种`,
    detail: focusCount
      ? `其中 ${focusCount} 种列为重点提醒，下面说明它们通常做什么。`
      : '下面说明这些添加剂通常做什么。',
    tone: additiveItems.length >= 5 || focusCount ? 'watch' : 'ok'
  };
}

function buildAllergenFinding(): ReportFinding {
  if (allergyWarnings.value.length) {
    return {
      key: 'allergen',
      label: '过敏原',
      status: '命中关注',
      detail: allergyWarnings.value[0],
      tone: 'attention'
    };
  }
  if (report.value?.allergenHints.length) {
    return {
      key: 'allergen',
      label: '过敏原',
      status: '有线索',
      detail: report.value.allergenHints[0],
      tone: 'watch'
    };
  }
  return {
    key: 'allergen',
    label: '过敏原',
    status: '未命中关注',
    detail: '没有命中你的过敏 / 忌口项。',
    tone: 'ok'
  };
}

function buildInsightCards(): Array<{ key: string; title: string; value: string; detail: string; tone: FindingTone }> {
  const cards: Array<{ key: string; title: string; value: string; detail: string; tone: FindingTone }> = [];
  const sugar = nutritionSnapshot.value.find((item) => item.key === 'sugar');
  const sodium = nutritionSnapshot.value.find((item) => item.key === 'sodium');
  const fat = nutritionSnapshot.value.find((item) => item.key === 'fat');
  if (sugar && sugar.level !== '未识别') {
    cards.push({
      key: 'sugar',
      title: '糖',
      value: sugar.level,
      detail: `包装标示 ${sugar.valueText}`,
      tone: nutritionTone(sugar)
    });
  } else if (/白砂糖|蔗糖|糖浆|果葡糖浆|葡萄糖浆|麦芽糖浆|麦芽糊精/i.test(rawLabelText.value)) {
    cards.push({
      key: 'sugar-ingredient',
      title: '糖类配料',
      value: '看到线索',
      detail: '配料表出现糖或糖浆类名称。',
      tone: 'watch'
    });
  }
  if (sodium && sodium.level !== '未识别') {
    cards.push({
      key: 'sodium',
      title: '钠',
      value: sodium.level,
      detail: `包装标示 ${sodium.valueText}`,
      tone: nutritionTone(sodium)
    });
  } else if (/食用盐|食盐|味精|谷氨酸钠|酱油粉|复合调味料/i.test(rawLabelText.value)) {
    cards.push({
      key: 'salt-ingredient',
      title: '盐/钠线索',
      value: '看到线索',
      detail: '配料表出现盐、味精或调味料名称。',
      tone: 'watch'
    });
  }
  if (fat && fat.level !== '未识别') {
    cards.push({
      key: 'fat',
      title: '脂肪',
      value: fat.level,
      detail: `包装标示 ${fat.valueText}`,
      tone: nutritionTone(fat)
    });
  }
  if (visibleAdditives.value.length) {
    cards.push({
      key: 'additives',
      title: '添加剂',
      value: `${visibleAdditives.value.length} 种`,
      detail: visibleAdditives.value.slice(0, 3).map((item) => item.name).join('、'),
      tone: visibleAdditives.value.length >= 5 ? 'watch' : 'ok'
    });
  }
  if (allergyWarnings.value.length || report.value?.allergenHints.length) {
    cards.push({
      key: 'allergen',
      title: '过敏/忌口',
      value: allergyWarnings.value.length ? '命中关注' : '看到提示',
      detail: allergyWarnings.value[0] || report.value?.allergenHints[0] || '',
      tone: allergyWarnings.value.length ? 'attention' : 'watch'
    });
  }
  return cards.slice(0, 6);
}

function isPendingIngredient(item: IngredientMatch): boolean {
  return item.decision === 'pending' || item.dataStatus === 'mapped_candidate' || item.dataStatus === 'pending_review';
}

function uniqueValue(value: string, index: number, values: string[]): boolean {
  return value.trim() !== '' && values.indexOf(value) === index;
}

function normalizeCompareText(value: string): string {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function retryScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function openHistory() {
  navigateToRoute(routes.history);
}

function toggleFavorite() {
  if (!report.value) return;
  const updated = toggleReportFavorite(report.value.id);
  if (!updated) return;
  report.value = updated;
  message.value = updated.isFavorite ? '已加入收藏。' : '已取消收藏。';
}

async function shareCurrentReport() {
  if (!report.value) return;
  message.value = (await shareReport(report.value, shareCard.value)) ? '结果已复制。' : '暂时无法分享，可以稍后重试。';
}

function submitFeedback() {
  if (!report.value) return;
  saveReportFeedback({
    report: report.value,
    reason: feedbackReason.value,
    note: feedbackNote.value,
    source: 'report'
  });
  feedbackNote.value = '';
  feedbackOpen.value = false;
  message.value = '已记录，会用于后续改进识别和报告。';
}
</script>

<template>
  <view class="page page--report">
    <Toast :message="message" tone="success" />

    <EmptyState
      v-if="!report"
      title="没有找到结果"
      description="可能已被删除，或本机没有对应结果。"
      action-label="回到首页"
      @action="navigateToRoute(routes.home)"
    />

    <template v-else>
      <view class="report-stack">
        <view class="scan-meta">
          <image v-if="sourceImagePath" class="scan-meta__image" :src="sourceImagePath" mode="aspectFill" />
          <view v-else class="scan-meta__placeholder" />
          <view class="scan-meta__copy">
            <text class="scan-meta__title">本次识别标签</text>
            <text class="scan-meta__desc">{{ report.analysisSource?.sourceLabel || '食品标签文字' }}</text>
          </view>
        </view>

        <AppCard class="report-card report-card--overall" :class="`report-card--${decision?.level || 'caution'}`">
          <view class="report-section">
            <text class="section-title">一句话结论</text>
            <text class="overall-label">{{ overallLabel }}</text>
            <text class="section-text">{{ overallDetail }}</text>
            <text v-if="plainExplanation" class="section-text">{{ plainExplanation }}</text>
            <view v-if="topFindings.length" class="summary-pills">
              <text v-for="item in topFindings" :key="item.key" class="summary-pill">{{ item.label }}：{{ item.status }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && resultReasons.length" class="report-card">
          <view class="report-section">
            <text class="section-title">关键原因</text>
            <view class="reason-list">
              <text v-for="item in resultReasons" :key="item" class="reason-chip">{{ item }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="isInsufficientReport" class="report-card">
          <view class="report-section">
            <text class="section-title">还需要补充</text>
            <text class="section-text">这次没有拿到清晰的包装文字。请补拍配料、营养数字或过敏原区域，或手动粘贴包装上的关键文字。</text>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && insightCards.length" class="report-card">
          <view class="report-section">
            <text class="section-title">配料表里容易漏看的点</text>
            <view class="insight-grid">
              <view v-for="item in insightCards" :key="item.key" class="insight-card" :class="`finding-card--${item.tone}`">
                <view class="finding-card__head">
                  <text class="finding-card__label">{{ item.title }}</text>
                  <text class="finding-card__status">{{ item.value }}</text>
                </view>
                <text class="finding-card__detail">{{ item.detail }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && nutritionBars.length" class="report-card">
          <view class="report-section">
            <text class="section-title">营养数字</text>
            <view class="nutrition-bars">
              <view v-for="item in nutritionBars" :key="item.key" class="nutrition-bar-row">
                <view class="nutrition-bar-row__head">
                  <text class="nutrition-bar-row__label">{{ item.label }}</text>
                  <text class="nutrition-bar-row__value">{{ item.valueText }}</text>
                </view>
                <view class="nutrition-meter">
                  <view
                    class="nutrition-meter__fill"
                    :class="`nutrition-meter__fill--${nutritionTone(item)}`"
                    :style="nutritionBarStyle(item)"
                  />
                </view>
                <text class="nutrition-bar-row__note">{{ nutritionToneLabel(item) }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && (suitableFor.length || notSuitableFor.length)" class="report-card">
          <view class="report-section">
            <text class="section-title">适合谁 / 不适合谁</text>
            <view class="audience-grid">
              <view class="audience-box audience-box--ok">
                <text class="audience-box__title">可以偶尔吃</text>
                <text v-for="item in suitableFor" :key="item" class="audience-box__item">{{ item }}</text>
              </view>
              <view class="audience-box audience-box--watch">
                <text class="audience-box__title">不太适合</text>
                <text v-for="item in notSuitableFor" :key="item" class="audience-box__item">{{ item }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowAdditiveSection" class="report-card">
          <view class="report-section">
            <text class="section-title">添加剂作用</text>
            <text class="section-text">{{ additiveSummaryText }}</text>
            <view v-if="visibleAdditives.length" class="additive-list">
              <view v-for="item in visibleAdditives" :key="item.id" class="additive-row">
                <view class="additive-row__head">
                  <text class="additive-row__name">{{ item.name }}</text>
                  <text class="additive-row__type">{{ item.category }}</text>
                </view>
                <text class="section-text">{{ item.effect }}</text>
                <text v-if="item.reminder" class="additive-row__reminder">{{ item.reminder }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && eatingAdvice" class="report-card">
          <view class="report-section">
            <text class="section-title">建议吃法</text>
            <text class="section-text">{{ eatingAdvice }}</text>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections || ingredientChips.length || pendingIngredientChips.length" class="report-card">
          <view class="report-section">
            <view class="section-head">
              <text class="section-title">识别详情</text>
              <text class="ingredient-count">{{ ingredients.length }} 项</text>
            </view>
            <view v-if="productFacts.length" class="detail-facts">
              <text v-for="item in productFacts" :key="item" class="detail-fact">{{ item }}</text>
            </view>
            <text class="section-subtitle">配料表</text>
            <view v-if="ingredientChips.length" class="ingredient-chip-list">
              <text v-for="item in ingredientChips" :key="item" class="ingredient-chip">{{ item }}</text>
            </view>
            <text v-if="detailNutritionRows.length" class="section-subtitle">营养表</text>
            <view v-if="detailNutritionRows.length" class="detail-nutrition-list">
              <view v-for="item in detailNutritionRows" :key="item.key" class="detail-nutrition-row">
                <text class="detail-nutrition-row__label">{{ item.label }}</text>
                <text class="detail-nutrition-row__value">{{ item.value }}</text>
                <text class="detail-nutrition-row__level">{{ item.level }}</text>
              </view>
            </view>
            <view v-if="pendingIngredientChips.length" class="pending-ingredients">
              <text class="pending-ingredients__title">未确认线索</text>
              <view class="ingredient-chip-list">
                <text v-for="item in pendingIngredientChips" :key="item" class="ingredient-chip ingredient-chip--pending">{{ item }}</text>
              </view>
            </view>
            <text v-if="!ingredientChips.length && !pendingIngredientChips.length" class="section-text">没有识别到清晰配料表。</text>
          </view>
        </AppCard>

        <AppCard v-if="feedbackOpen" class="report-card">
          <view class="report-section">
            <text class="section-title">结果反馈</text>
            <text class="section-text">这次结果哪里不合适？提交后会记录在本机反馈队列。</text>
            <view class="feedback-options">
              <view
                v-for="option in feedbackOptions"
                :key="option.value"
                class="feedback-option"
                :class="{ 'feedback-option--active': feedbackReason === option.value }"
                @tap="feedbackReason = option.value"
              >
                <text class="feedback-option__label">{{ option.label }}</text>
                <text class="feedback-option__detail">{{ option.detail }}</text>
              </view>
            </view>
            <textarea
              v-model="feedbackNote"
              class="feedback-note"
              maxlength="160"
              placeholder="可补充一句，比如：钠含量识别错、添加剂解释太绕。"
              auto-height
            />
            <AppButton variant="secondary" @click="submitFeedback">提交反馈</AppButton>
          </view>
        </AppCard>

        <AppCard class="report-card">
          <view class="report-section">
            <view class="section-head">
              <text class="section-title">识别文字</text>
              <view class="inline-actions">
                <text class="link" @tap="feedbackOpen = !feedbackOpen">{{ feedbackOpen ? '收起反馈' : '反馈' }}</text>
                <text class="link" @tap="rawTextOpen = !rawTextOpen">{{ rawTextOpen ? '收起' : '展开' }}</text>
              </view>
            </view>
            <text v-if="rawTextOpen && rawLabelText" class="raw-text">{{ rawLabelText }}</text>
            <text v-else-if="rawTextOpen" class="section-text">暂无可展示的识别文字。</text>
          </view>
        </AppCard>
      </view>

      <view class="action-bar">
        <AppButton @click="retryScan">再拍一次</AppButton>
        <AppButton variant="secondary" @click="toggleFavorite">{{ report.isFavorite ? '已收藏' : '收藏' }}</AppButton>
        <view class="action-links">
          <text class="link" @tap="shareCurrentReport">分享</text>
          <text class="link" @tap="openHistory">历史记录</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page--report {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  background: var(--bg);
}

.report-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.scan-meta {
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  padding: 0 4rpx 8rpx;
}

.scan-meta__image,
.scan-meta__placeholder {
  width: 104rpx;
  height: 104rpx;
  border-radius: 14rpx;
  background: var(--surface-subtle);
  border: 1px solid var(--line);
}

.scan-meta__placeholder {
  background:
    linear-gradient(90deg, transparent 45%, rgba(18, 151, 128, 0.14) 45%, rgba(18, 151, 128, 0.14) 55%, transparent 55%),
    linear-gradient(0deg, transparent 45%, rgba(18, 151, 128, 0.14) 45%, rgba(18, 151, 128, 0.14) 55%, transparent 55%),
    var(--primary-soft);
}

.scan-meta__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scan-meta__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.3;
}

.scan-meta__desc {
  color: var(--muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.report-card {
  border-radius: 24rpx;
}

.report-card--overall {
  border-color: rgba(18, 151, 128, 0.14);
  background: linear-gradient(135deg, rgba(238, 250, 245, 0.96), #ffffff);
}

.report-card--alternative,
.report-card--caution,
.report-card--occasional {
  border-color: rgba(216, 138, 36, 0.24);
  background: linear-gradient(135deg, #fff8ec, #ffffff);
}

.report-section,
.simple-list,
.additive-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.overall-label {
  color: #f15a24;
  font-size: var(--font-size-2xl);
  font-weight: 900;
  line-height: 1.2;
}

.report-card--daily_ok .overall-label {
  color: var(--primary-strong);
}

.report-card--share {
  border-color: rgba(18, 151, 128, 0.16);
  background: var(--surface);
}

.summary-pills,
.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.summary-pill {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  padding: 6px 10px;
}

.feedback-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.feedback-option {
  border: 1px solid var(--line);
  border-radius: 18rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-height: 112rpx;
  padding: var(--space-sm);
}

.feedback-option--active {
  border-color: rgba(18, 151, 128, 0.32);
  background: var(--primary-soft);
}

.feedback-option__label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.feedback-option__detail {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.feedback-note {
  box-sizing: border-box;
  width: 100%;
  min-height: 112rpx;
  border: 1px solid var(--line);
  border-radius: 18rpx;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  padding: var(--space-sm);
}

.share-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.share-preview__top,
.share-preview__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.share-preview__brand {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
}

.share-preview__badge {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 4px 10px;
}

.share-preview__title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.25;
}

.share-preview__headline {
  color: var(--status-danger);
  font-size: var(--font-size-2xl);
  font-weight: 900;
  line-height: 1.15;
}

.share-preview__points {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.share-preview__point {
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  padding: 6px 10px;
}

.share-preview__meta {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
}

.section-text {
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.65;
}

.section-subtitle {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
}

.reason-list,
.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.reason-chip,
.detail-fact {
  border-radius: 999px;
  background: var(--surface-warm);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  padding: 6px 10px;
}

.detail-fact {
  background: var(--surface-subtle);
}

.detail-nutrition-list {
  border: 1px solid var(--line);
  border-radius: 18rpx;
  overflow: hidden;
  background: var(--surface);
}

.detail-nutrition-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--line);
  min-height: 68rpx;
  padding: 0 var(--space-sm);
}

.detail-nutrition-row:last-child {
  border-bottom: 0;
}

.detail-nutrition-row__label,
.detail-nutrition-row__value,
.detail-nutrition-row__level {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.35;
}

.detail-nutrition-row__value {
  white-space: nowrap;
}

.detail-nutrition-row__level {
  color: var(--muted);
  text-align: right;
  white-space: nowrap;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.audience-box {
  border: 1px solid var(--line);
  border-radius: 18rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-height: 168rpx;
  padding: var(--space-sm);
}

.audience-box--ok {
  border-color: rgba(18, 151, 128, 0.16);
  background: var(--primary-soft);
}

.audience-box--watch {
  border-color: rgba(216, 138, 36, 0.24);
  background: var(--surface-warm);
}

.audience-box__title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
}

.audience-box__item {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.insight-grid,
.finding-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-xs);
}

.finding-list {
  display: flex;
  flex-direction: column;
}

.insight-card {
  border: 1px solid var(--line);
  border-radius: 18rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-height: 150rpx;
  padding: var(--space-sm);
}

.finding-card {
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface-subtle);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-height: 128rpx;
}

.finding-card--attention {
  border-color: rgba(217, 107, 95, 0.28);
  background: rgba(255, 244, 239, 0.92);
}

.finding-card--watch {
  border-color: rgba(216, 138, 36, 0.24);
  background: var(--surface-warm);
}

.finding-card--ok {
  border-color: rgba(18, 151, 128, 0.16);
  background: var(--primary-soft);
}

.finding-card--missing {
  background: var(--surface);
}

.finding-card__head,
.additive-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.finding-card__label {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.25;
}

.finding-card__status {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  text-align: right;
}

.finding-card--attention .finding-card__status {
  color: var(--status-danger);
}

.finding-card--watch .finding-card__status {
  color: var(--accent);
}

.finding-card--missing .finding-card__status {
  color: var(--muted);
}

.finding-card__detail {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.additive-row {
  border: 1px solid var(--line);
  border-radius: 22rpx;
  background: var(--surface-subtle);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nutrition-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.nutrition-bar-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nutrition-bar-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.nutrition-bar-row__label,
.nutrition-bar-row__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.nutrition-bar-row__value {
  text-align: right;
}

.nutrition-meter {
  height: 14rpx;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-subtle);
}

.nutrition-meter__fill {
  height: 100%;
  min-width: 8%;
  border-radius: inherit;
  transition: width 180ms ease;
}

.nutrition-meter__fill--attention {
  background: var(--status-danger);
}

.nutrition-meter__fill--watch {
  background: var(--accent);
}

.nutrition-meter__fill--ok,
.nutrition-meter__fill--missing {
  background: var(--primary);
}

.nutrition-bar-row__note {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.3;
}

.nutrition-row,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.additive-row__name,
.nutrition-row__label {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.35;
}

.additive-row__type {
  border-radius: 999px;
  background: var(--surface);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 4px 10px;
  white-space: nowrap;
}

.additive-row__reminder {
  color: var(--muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.nutrition-row {
  border-bottom: 1px solid var(--line);
  padding: 10px 0;
}

.nutrition-row:last-child {
  border-bottom: 0;
}

.nutrition-row__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.35;
}

.ingredient-count {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.2;
}

.ingredient-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.ingredient-chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.3;
  padding: 6px 10px;
}

.ingredient-chip--pending {
  border-style: dashed;
  color: var(--muted);
}

.pending-ingredients {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.pending-ingredients__title {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.raw-text {
  border: 1px solid var(--line);
  border-radius: 24rpx;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  padding: var(--space-md);
  word-break: break-word;
}

.action-bar {
  width: 100%;
  padding-top: var(--space-md);
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-sm);
}


.action-links {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  min-height: 48rpx;
}
.action-bar :deep(.app-button) {
  width: 100%;
}

@media screen and (max-width: 380px) {
  .action-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
