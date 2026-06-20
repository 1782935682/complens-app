<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Toast from '@/components/Toast.vue';
import { allergenOptions, primaryGoalOptions } from '@/constants/attention';
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
const detailOpen = ref(false);
const reasonsOpen = ref(false);
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
  if (decision.value?.level === 'insufficient') return '信息不足';
  if (decision.value?.level === 'alternative' || decision.value?.level === 'caution') return '偶尔吃，不建议常吃';
  if (decision.value?.level === 'occasional') return '偶尔吃';
  if (decision.value?.level === 'daily_ok') return '提醒较少';
  const finding = headlineFinding.value;
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
  .sort((left, right) => nutritionRank(right) - nutritionRank(left) || right.percent - left.percent)
  .slice(0, 5));
const isInsufficientReport = computed(() => (
  decision.value?.level === 'insufficient'
  || (!hasIngredientEvidence.value && !hasNutritionNumbers.value && !additiveRecognition.value.total)
));
const shouldShowConsumerSections = computed(() => !isInsufficientReport.value);
const shouldShowAdditiveSection = computed(() => shouldShowConsumerSections.value && hasIngredientEvidence.value);
const overallDetail = computed(() => {
  if (foodAnalysis.value?.plainExplanation) return foodAnalysis.value.plainExplanation;
  if (foodAnalysis.value?.summary) return foodAnalysis.value.summary;
  if (isInsufficientReport.value) {
    return decision.value?.summary || '请补拍清晰的包装文字，或手动粘贴配料、营养数字和过敏原提示。';
  }
  return headlineFinding.value?.detail || '已整理高值项、添加剂和未确认线索。';
});
const allergyWarnings = computed(() => decision.value?.allergyWarnings ?? []);
const resultReasons = computed(() => (foodAnalysis.value?.mainReasons?.length
  ? foodAnalysis.value.mainReasons
  : decision.value?.reasons ?? []).slice(0, 5));
const suitableFor = computed(() => (foodAnalysis.value?.suitableFor?.length
  ? foodAnalysis.value.suitableFor
  : decision.value?.suitableFor ?? []).slice(0, 4));
const notSuitableFor = computed(() => personalNotSuitableFor.value
  .concat(foodAnalysis.value?.notSuitableFor?.length
    ? foodAnalysis.value.notSuitableFor
    : decision.value?.lessSuitableFor ?? [])
  .filter(uniqueValue)
  .slice(0, 5));
const eatingAdvice = computed(() => foodAnalysis.value?.eatingAdvice || decision.value?.suggestions?.[0] || '');
const plainExplanation = computed(() => foodAnalysis.value?.plainExplanation || decision.value?.summary || '');
const supportingExplanation = computed(() => {
  const text = plainExplanation.value.trim();
  if (!text || normalizeCompareText(text) === normalizeCompareText(overallDetail.value)) return '';
  return text;
});
const productFacts = computed(() => [
  foodAnalysis.value?.productName && foodAnalysis.value.productName !== '未识别商品' ? `商品：${foodAnalysis.value.productName}` : '',
  foodAnalysis.value?.category || report.value?.analysisSource?.foodTypeText ? `类型：${foodAnalysis.value?.category || report.value?.analysisSource?.foodTypeText}` : '',
  foodAnalysis.value?.productionDate || report.value?.analysisSource?.productionDateText ? `生产日期：${foodAnalysis.value?.productionDate || report.value?.analysisSource?.productionDateText}` : ''
].filter(Boolean));
const detailFrontClaims = computed(() => report.value?.frontClaimsSection?.text || report.value?.analysisSource?.frontClaimsText || (foodAnalysis.value?.frontClaims || []).join('、'));
const detailAllergenText = computed(() => report.value?.analysisSource?.allergenText || '');
const detailUncertainClues = computed(() => [
  ...(foodAnalysis.value?.uncertainClues || []),
  ...(report.value?.analysisSource?.unconfirmedText || []),
  ...(report.value?.unknownItems || [])
].filter(Boolean).filter(uniqueValue).slice(0, 8));
const detailNutritionRows = computed(() => {
  const nutrition = foodAnalysis.value?.nutrition || {};
  const fromFoodAnalysis = (['energy', 'protein', 'fat', 'carbohydrate', 'sugar', 'sodium', 'transFat'] as const)
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
  const total = ingredientExplanationItems.value.length;
  if (!total) return '当前配料表未匹配到需要解释的添加剂或配料项。';
  return `把配料里容易看不懂或影响份量的 ${total} 项说明白。`;
});
const additiveCategoryChips = computed(() => {
  const chips = new Map<string, number>();
  additiveRecognition.value.items.forEach((item) => {
    chips.set(item.category, (chips.get(item.category) || 0) + 1);
  });
  watchIngredientExplanationItems.value.forEach((item) => {
    chips.set(item.category, (chips.get(item.category) || 0) + 1);
  });
  return [...chips.entries()]
    .map(([label, count]) => `${label} ${count}`)
    .slice(0, 5);
});
const watchIngredientExplanationItems = computed(() => {
  const text = normalizeCompareText([
    report.value?.analysisSource?.ingredientText,
    ...ingredients.value.map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' '));
  const items: Array<{ id: string; name: string; category: string; effect: string; reminder: string }> = [];
  if (/氢化植物油|氢化菜籽油|氢化油|起酥油|人造奶油|植脂末|代可可脂/u.test(text)) {
    items.push({
      id: 'watch-hydrogenated-oil',
      name: '氢化油脂',
      category: '需要留意',
      effect: '常用于改善酥脆、稳定或口感。看到它不等于不能吃，但要和反式脂肪、脂肪、热量一起看份量。',
      reminder: '减脂或关注反式脂肪时，建议少量、低频。'
    });
  }
  if (/味精|谷氨酸钠|呈味核苷酸|肌苷酸二钠/u.test(text)) {
    items.push({
      id: 'watch-flavor-enhancer',
      name: '增鲜成分',
      category: '影响咸鲜',
      effect: '主要让咸鲜味更明显，不用单独恐慌；低钠/少盐关注时，要和营养表里的钠一起看。',
      reminder: ''
    });
  }
  if (/白砂糖|麦芽糖|果葡糖浆|葡萄糖浆|食用葡萄糖|蜂蜜/u.test(text)) {
    items.push({
      id: 'watch-added-sugar',
      name: '糖类配料',
      category: '影响甜味',
      effect: '会带来甜味和碳水，控糖、减脂或给儿童高频食用时，重点看一份吃多少。',
      reminder: ''
    });
  }
  return items.slice(0, 3);
});
const ingredientExplanationItems = computed(() => {
  const aiItems = (foodAnalysis.value?.ingredientHighlights || []).map((item) => ({
    id: `ai-${item.name}`,
    name: item.name,
    category: item.level === 'green' ? '常见配料' : '需要留意',
    effect: item.explanation,
    reminder: ''
  }));
  const additiveItems = visibleAdditives.value.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    effect: item.effect,
    reminder: item.reminder
  }));
  const seen = new Set<string>();
  return [...aiItems, ...watchIngredientExplanationItems.value, ...additiveItems]
    .filter((item) => {
      const key = normalizeCompareText(item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
});
const keyFindings = computed<ReportFinding[]>(() => {
  const findings = [
    buildNutritionFinding('energy', '热量'),
    buildNutritionFinding('sodium', '钠'),
    buildNutritionFinding('fat', '脂肪'),
    buildNutritionFinding('transFat', '反式脂肪'),
    buildNutritionFinding('carbohydrate', '碳水'),
    buildNutritionFinding('sugar', '糖')
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
const personalAlerts = computed(() => {
  const alerts: string[] = [];
  const goal = primaryGoalOptions.find((item) => item.key === attentionSettings.value.primaryGoal);
  if (goal && goal.key !== 'daily') {
    const finding = focusedGoalFinding(goal.key);
    alerts.push(finding
      ? `${goal.label}：${finding.label}${finding.status}，${compactFindingDetail(finding)}`
      : `${goal.label}：这次没有识别到直接对应的高值数字。`);
  }
  if (attentionSettings.value.isChildrenMode) alerts.push('儿童模式：不建议给儿童高频当零食。');
  if (allergyWarnings.value.length) {
    alerts.push(allergyWarnings.value[0]);
  } else if (attentionSettings.value.allergens.length) {
    const labels = selectedAllergenLabels().slice(0, 3).join('、');
    if (labels) alerts.push(`过敏/忌口：本次未命中你设置的 ${labels}。`);
  }
  return alerts.slice(0, 3);
});
const personalAlertChips = computed(() => {
  const chips: string[] = [];
  const goal = primaryGoalOptions.find((item) => item.key === attentionSettings.value.primaryGoal);
  if (goal && goal.key !== 'daily') {
    const finding = focusedGoalFinding(goal.key);
    chips.push(finding ? `${goal.label} ${finding.status}` : `${goal.label} 未命中高值`);
  }
  if (attentionSettings.value.isChildrenMode) chips.push('儿童少吃');
  if (allergyWarnings.value.length) {
    chips.push('过敏命中');
  } else if (attentionSettings.value.allergens.length) {
    chips.push('过敏未命中');
  }
  return chips.slice(0, 4);
});
const personalNotSuitableFor = computed(() => {
  const items: string[] = [];
  if (allergyWarnings.value.length) items.push('命中过敏/忌口关注的人');
  if (attentionSettings.value.isChildrenMode) items.push('儿童高频食用');
  if (attentionSettings.value.primaryGoal === 'sugar') items.push('控糖人群');
  if (attentionSettings.value.primaryGoal === 'fatLoss') items.push('减脂期');
  if (attentionSettings.value.primaryGoal === 'lowSodium') items.push('控盐/低钠人群');
  return items;
});
const audiencePreview = computed(() => {
  const ok = suitableFor.value[0] || '普通成年人偶尔吃';
  const watch = notSuitableFor.value.slice(0, 2).join('、');
  return watch ? `${ok}；不太适合：${watch}` : ok;
});
const decisionFastItems = computed(() => {
  if (isInsufficientReport.value) return [];
  const why = priorityFindings.value
    .slice(0, 3)
    .map((item) => `${item.label}${item.status}`)
    .join('、');
  const who = notSuitableFor.value.slice(0, 3).join('、');
  const how = compactAdviceText(eatingAdvice.value);
  return [
    why ? { label: '为什么', text: why } : undefined,
    who ? { label: '谁少吃', text: who } : undefined,
    how ? { label: '怎么吃', text: how } : undefined
  ].filter(Boolean) as Array<{ label: string; text: string }>;
});
const priorityFindings = computed(() => {
  const ranked = plainFindings.value
    .filter((item) => item.tone === 'attention' || item.tone === 'watch')
    .sort((left, right) => findingPriority(right) - findingPriority(left))
    .slice(0, 3);
  return ranked.length ? ranked : plainFindings.value.filter((item) => item.tone === 'ok').slice(0, 3);
});
const extraReasons = computed(() => resultReasons.value
  .filter((reason) => !priorityFindings.value.some((item) => reason.includes(item.label) || item.label.includes(reason)))
  .slice(0, 5));
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
  .slice(0, 12));
const pendingIngredientChips = computed(() => ingredients.value
  .filter(isPendingIngredient)
  .map((item) => item.ingredientName || item.normalizedText)
  .filter(Boolean)
  .filter(uniqueValue)
  .slice(0, 8));
const rawLabelText = computed(() => report.value?.rawText || report.value?.analysisSource?.ocrText || '');
const detailSummaryText = computed(() => [
  ingredients.value.length ? `配料 ${ingredients.value.length} 项` : '',
  detailNutritionRows.value.length ? `营养 ${detailNutritionRows.value.length} 项` : '',
  pendingIngredientChips.value.length || detailUncertainClues.value.length ? `未确认 ${pendingIngredientChips.value.length + detailUncertainClues.value.length} 项` : '',
  detailFrontClaims.value ? '包装声明已整理' : ''
].filter(Boolean).join(' · ') || '已整理识别来源');
const hasRecognitionDetails = computed(() => Boolean(
  ingredientChips.value.length
  || pendingIngredientChips.value.length
  || detailNutritionRows.value.length
  || detailFrontClaims.value
  || detailAllergenText.value
  || detailUncertainClues.value.length
  || productFacts.value.length
  || rawLabelText.value
));
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
const insufficientCapturedRows = computed(() => {
  if (!isInsufficientReport.value) return [];
  const rows = detailNutritionRows.value.slice(0, 2).map((item) => `${item.label} ${item.value}`);
  if (detailFrontClaims.value) rows.push('包装声明已保留');
  if (productFacts.value.length) rows.push(...productFacts.value.slice(0, 2));
  return rows.slice(0, 4);
});

onLoad((query) => {
  enableWeixinShareMenu();
  attentionSettings.value = getAttentionSettings();
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : getReports()[0];
});

onShareAppMessage(() => buildReportShareMessage(report.value));

function focusedGoalFinding(goal: string): ReportFinding | undefined {
  if (goal === 'sugar') {
    return keyFindings.value.find((item) => item.key === 'sugar' && item.tone !== 'missing')
      || keyFindings.value.find((item) => item.key === 'carbohydrate' && item.tone !== 'missing');
  }
  if (goal === 'fatLoss') {
    return keyFindings.value.find((item) => item.key === 'energy' && item.tone !== 'missing')
      || keyFindings.value.find((item) => item.key === 'fat' && item.tone !== 'missing')
      || keyFindings.value.find((item) => item.key === 'carbohydrate' && item.tone !== 'missing');
  }
  if (goal === 'lowSodium') return keyFindings.value.find((item) => item.key === 'sodium' && item.tone !== 'missing');
  return undefined;
}

function selectedAllergenLabels(): string[] {
  return allergenOptions
    .filter((item) => attentionSettings.value.allergens.includes(item.key))
    .map((item) => item.label);
}

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

function compactFindingDetail(item: ReportFinding): string {
  const nutrition = nutritionSnapshot.value.find((entry) => entry.key === item.key);
  if (nutrition) {
    const advice: Partial<Record<NutritionKey, string>> = {
      energy: '少量当零食吃',
      fat: '控制一份吃多少',
      transFat: '少量低频更稳妥',
      carbohydrate: '主要供能，控制份量',
      sodium: '少和重口味食物叠加',
      sugar: '甜味来源要留意'
    };
    return `${nutrition.valueText}，${advice[nutrition.key] || '控制份量'}`;
  }
  if (item.key === 'additive') return '看作用和用量，不直接吓人。';
  if (item.key === 'allergen') return '有相关提示的人优先留意这里。';
  return item.detail;
}

function nutritionTone(item: NutritionSnapshotItem): FindingTone {
  if (item.level === '较高') return 'attention';
  if (item.level === '中等' || item.level === '一般') return 'watch';
  return 'ok';
}

function findingPriority(item: ReportFinding): number {
  const keyScore: Record<string, number> = {
    allergen: 80,
    sodium: 70,
    transFat: 68,
    additive: 62,
    additives: 62,
    energy: 58,
    fat: 55,
    sugar: 52,
    carbohydrate: 48
  };
  const toneScore = item.tone === 'attention' ? 30 : item.tone === 'watch' ? 15 : item.tone === 'ok' ? 5 : 0;
  return (keyScore[item.key] || 10) + toneScore;
}

function nutritionRank(item: NutritionSnapshotItem): number {
  if (item.level === '较高') return 30;
  if (item.level === '中等' || item.level === '一般') return 20;
  if (item.level === '较低') return 10;
  return 0;
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
      high: '咸味和重口味食物叠加时更需要控制份量。',
      medium: '咸味食物叠加时会更明显。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'fat') {
    return {
      high: '油脂会把热量拉高，零食类尤其要看一份吃多少。',
      medium: '已和热量一起整理。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'carbohydrate') {
    return {
      high: '这类零食主要靠面粉、米粉或糖类供能，适合看一份吃多少。',
      medium: '已和热量一起整理。',
      low: '当前不是重点提醒。'
    };
  }
  if (key === 'energy') {
    return {
      high: '热量不低，适合当零食少量吃，不适合顶一餐。',
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
  if (item.level === '较高') {
    if (item.key === 'energy') return '少量吃';
    if (item.key === 'fat') return '控油量';
    if (item.key === 'carbohydrate') return '控份量';
    if (item.key === 'sodium') return '少盐搭配';
    if (item.key === 'sugar') return '控甜食';
    return '重点';
  }
  if (item.level === '中等' || item.level === '一般') return '留意';
  return '较低';
}

function nutritionBarActionText(item: NutritionSnapshotItem): string {
  const action = nutritionToneLabel(item);
  if (item.key === 'energy') return `零食重点｜${action}`;
  if (item.key === 'fat') return `油脂偏多｜${action}`;
  if (item.key === 'carbohydrate') return `主要供能｜${action}`;
  if (item.key === 'sodium') return `重口味叠加｜${action}`;
  if (item.key === 'sugar') return `甜味来源｜${action}`;
  return action;
}

function nutritionDetailLabel(key: string): string {
  if (key === 'energy') return '能量';
  if (key === 'protein') return '蛋白质';
  if (key === 'fat') return '脂肪';
  if (key === 'carbohydrate') return '碳水';
  if (key === 'sugar') return '糖';
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
      detail: '当前配料表未匹配到需要解释的添加剂或配料项。',
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

function isPendingIngredient(item: IngredientMatch): boolean {
  return item.decision === 'pending' || item.dataStatus === 'mapped_candidate' || item.dataStatus === 'pending_review';
}

function uniqueValue(value: string, index: number, values: string[]): boolean {
  return value.trim() !== '' && values.indexOf(value) === index;
}

function normalizeCompareText(value: string): string {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function compactAdviceText(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .split(/[；;。]/u)
    .map((item) => item.trim())
    .filter(Boolean)[0]
    ?.slice(0, 34) || '';
}

function ingredientImpactLabel(item: { name: string; category: string; effect: string }): string {
  const text = `${item.name}${item.category}${item.effect}`;
  if (/氢化|起酥油|植脂末|代可可脂|反式脂肪/u.test(text)) return '关注反式脂肪';
  if (/植物油|油脂|脂肪|热量/u.test(text)) return '影响热量';
  if (/白砂糖|麦芽糖|糖|甜味/u.test(text)) return '影响甜味';
  if (/味精|食用盐|谷氨酸钠|呈味核苷酸|肌苷酸二钠|咸|鲜/u.test(text)) return '影响咸鲜';
  if (/过敏|小麦|麸质|牛奶|大豆|花生/u.test(text)) return '过敏相关';
  if (/碳酸钙|常见配料|营养强化/u.test(text)) return '常见配料';
  return item.category === '需要留意' ? '配料作用' : item.category;
}

function retryScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function retakePackagePhoto() {
  resetScanDraft();
  uni.navigateTo({ url: `${routes.capture}?auto=camera` });
}

function openManualInput() {
  resetScanDraft();
  uni.navigateTo({ url: `${routes.capture}?mode=manual` });
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
        <AppCard class="report-card report-card--overall" :class="`report-card--${decision?.level || 'caution'}`">
          <view class="report-section">
            <text class="section-title">一句话结论</text>
            <text class="overall-label">{{ overallLabel }}</text>
            <view v-if="personalAlertChips.length" class="personal-alerts personal-alerts--compact">
              <text class="personal-alerts__title">你的关注</text>
              <view class="personal-alert-chips">
                <text v-for="item in personalAlertChips" :key="item" class="personal-alert-chip">{{ item }}</text>
              </view>
            </view>
            <text class="section-text">{{ overallDetail }}</text>
            <text v-if="supportingExplanation" class="section-text">{{ supportingExplanation }}</text>
            <view v-if="topFindings.length && !decisionFastItems.length" class="summary-pills">
              <text v-for="item in topFindings" :key="item.key" class="summary-pill">{{ item.label }}：{{ item.status }}</text>
            </view>
            <view v-if="decisionFastItems.length" class="decision-fast-list">
              <view v-for="item in decisionFastItems" :key="item.label" class="decision-fast-item">
                <text class="decision-fast-item__label">{{ item.label }}</text>
                <text class="decision-fast-item__text">{{ item.text }}</text>
              </view>
            </view>
            <view v-if="isInsufficientReport" class="insufficient-actions">
              <text class="insufficient-actions__hint">当前缺少足够包装文字，请补拍配料表或营养成分表。</text>
              <view class="insufficient-actions__buttons">
                <AppButton @click="retakePackagePhoto">补拍配料/营养表</AppButton>
                <AppButton variant="secondary" @click="openManualInput">手动粘贴文字</AppButton>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && (resultReasons.length || priorityFindings.length)" class="report-card">
          <view class="report-section">
            <text class="section-title">关键原因</text>
            <view v-if="priorityFindings.length" class="focus-list">
              <view v-for="(item, index) in priorityFindings" :key="item.key" class="focus-item" :class="`finding-card--${item.tone}`">
                <text class="focus-item__rank">{{ index + 1 }}</text>
                <view class="focus-item__body">
                  <view class="focus-item__head">
                    <text class="focus-item__label">{{ item.label }}</text>
                    <text class="focus-item__status">{{ item.status }}</text>
                  </view>
                  <text class="focus-item__detail">{{ compactFindingDetail(item) }}</text>
                </view>
              </view>
            </view>
            <view v-if="resultReasons.length && !priorityFindings.length" class="reason-list reason-list--compact">
              <text v-for="item in resultReasons" :key="item" class="reason-chip">{{ item }}</text>
            </view>
            <view v-if="extraReasons.length" class="reason-more">
              <text class="link" @tap="reasonsOpen = !reasonsOpen">{{ reasonsOpen ? '收起全部原因' : '查看全部原因' }}</text>
              <view v-if="reasonsOpen" class="reason-list reason-list--compact">
                <text v-for="item in extraReasons" :key="item" class="reason-chip">{{ item }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="isInsufficientReport" class="report-card">
          <view class="report-section">
            <text class="section-title">还需要补充</text>
            <view v-if="insufficientCapturedRows.length" class="captured-mini-list">
              <text class="captured-mini-list__title">已识别到</text>
              <text v-for="item in insufficientCapturedRows" :key="item" class="captured-mini-list__item">{{ item }}</text>
            </view>
            <view class="retake-tip-grid">
              <text class="retake-tip">配料表占满画面</text>
              <text class="retake-tip">营养表数字拍清</text>
              <text class="retake-tip">过敏提示单独补拍</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && (suitableFor.length || notSuitableFor.length)" class="report-card">
          <view class="report-section">
            <text class="section-title">适合谁 / 不适合谁</text>
            <view class="audience-grid">
              <view class="audience-box audience-box--ok">
                <text class="audience-box__title">适合偶尔吃</text>
                <text v-for="item in suitableFor" :key="item" class="audience-box__item">{{ item }}</text>
              </view>
              <view class="audience-box audience-box--watch">
                <text class="audience-box__title">建议关注</text>
                <text class="audience-box__note">不是禁食结论</text>
                <text v-for="item in notSuitableFor" :key="item" class="audience-box__item">{{ item }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowConsumerSections && nutritionBars.length" class="report-card">
          <view class="report-section">
            <view class="nutrition-chart-head">
              <text class="section-title">营养重点图</text>
              <text class="nutrition-chart-head__hint">每100g/ml · 高值优先</text>
            </view>
            <view class="nutrition-bars nutrition-bars--standalone">
              <view class="nutrition-bar-grid">
                <view v-for="item in nutritionBars" :key="item.key" class="nutrition-bar-row">
                  <view class="nutrition-bar-row__head">
                    <text class="nutrition-bar-row__label">{{ item.label }}</text>
                    <view class="nutrition-bar-row__meta">
                      <text class="nutrition-bar-row__level" :class="`nutrition-bar-row__level--${nutritionTone(item)}`">{{ item.level }}</text>
                      <text class="nutrition-bar-row__value">{{ item.valueText }}</text>
                    </view>
                  </view>
                  <view class="nutrition-meter">
                    <view
                      class="nutrition-meter__fill"
                      :class="`nutrition-meter__fill--${nutritionTone(item)}`"
                      :style="nutritionBarStyle(item)"
                    />
                  </view>
                  <text class="nutrition-bar-row__note">{{ nutritionBarActionText(item) }}</text>
                </view>
              </view>
              <view class="nutrition-legend">
                <text>低</text>
                <text>中</text>
                <text>高</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="shouldShowAdditiveSection" class="report-card">
          <view class="report-section">
            <text class="section-title">添加剂解释</text>
            <text class="section-text">{{ additiveSummaryText }}</text>
            <view v-if="additiveCategoryChips.length" class="additive-category-chips">
              <text v-for="item in additiveCategoryChips" :key="item" class="additive-category-chip">{{ item }}</text>
            </view>
            <view v-if="ingredientExplanationItems.length" class="additive-list">
              <view v-for="item in ingredientExplanationItems" :key="item.id" class="additive-row">
                <view class="additive-row__head">
                  <text class="additive-row__name">{{ item.name }}</text>
                  <text class="additive-row__type">{{ ingredientImpactLabel(item) }}</text>
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

        <AppCard v-if="shouldShowConsumerSections || hasRecognitionDetails" class="report-card">
          <view class="report-section">
            <view class="section-head">
              <text class="section-title">识别详情</text>
              <text class="link" @tap="detailOpen = !detailOpen">{{ detailOpen ? '收起' : '展开' }}</text>
            </view>
            <text class="detail-summary">{{ detailSummaryText }}</text>
            <view v-if="productFacts.length" class="detail-facts">
              <text v-for="item in productFacts" :key="item" class="detail-fact">{{ item }}</text>
            </view>
            <template v-if="detailOpen">
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
              <template v-if="detailAllergenText">
                <text class="section-subtitle">致敏原提示</text>
                <text class="section-text">{{ detailAllergenText }}</text>
              </template>
              <template v-if="detailFrontClaims">
                <text class="section-subtitle">包装声明</text>
                <text class="section-text">{{ detailFrontClaims }}</text>
              </template>
              <view v-if="pendingIngredientChips.length || detailUncertainClues.length" class="pending-ingredients">
                <text class="pending-ingredients__title">未确认线索</text>
                <view class="ingredient-chip-list">
                  <text v-for="item in pendingIngredientChips" :key="item" class="ingredient-chip ingredient-chip--pending">{{ item }}</text>
                  <text v-for="item in detailUncertainClues" :key="`clue-${item}`" class="ingredient-chip ingredient-chip--pending">{{ item }}</text>
                </view>
              </view>
              <view class="section-head">
                <text class="section-subtitle">识别文字</text>
                <text class="link" @tap="rawTextOpen = !rawTextOpen">{{ rawTextOpen ? '收起' : '展开' }}</text>
              </view>
              <text v-if="rawTextOpen && rawLabelText" class="raw-text">{{ rawLabelText }}</text>
              <text v-else-if="rawTextOpen" class="section-text">暂无可展示的识别文字。</text>
              <text v-if="!ingredientChips.length && !pendingIngredientChips.length" class="section-text">没有识别到清晰配料表。</text>
            </template>
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

      </view>

      <view class="action-bar">
        <AppButton @click="retryScan">再拍一次</AppButton>
        <AppButton variant="secondary" @click="toggleFavorite">{{ report.isFavorite ? '已收藏' : '收藏' }}</AppButton>
        <view class="action-links">
          <text class="link" @tap="shareCurrentReport">分享</text>
          <text class="link" @tap="openHistory">历史记录</text>
          <text class="link link--subtle" @tap="feedbackOpen = !feedbackOpen">{{ feedbackOpen ? '收起反馈' : '反馈' }}</text>
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

.decision-fast-list {
  border: 1px solid rgba(216, 138, 36, 0.16);
  border-radius: 18rpx;
  background: rgba(255, 248, 236, 0.72);
  display: grid;
  gap: 8rpx;
  padding: 12rpx 14rpx;
}

.decision-fast-item {
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr);
  gap: var(--space-xs);
}

.decision-fast-item__label {
  color: var(--accent);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.45;
}

.decision-fast-item__text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
}

.insufficient-actions {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 18rpx;
  background: var(--primary-soft);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm);
}

.insufficient-actions__hint {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.5;
}

.insufficient-actions__buttons {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-xs);
}

.insufficient-actions__buttons :deep(.app-button) {
  width: 100%;
}

.personal-alerts {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 16rpx;
  background: rgba(238, 250, 245, 0.86);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 14rpx;
}

.personal-alerts--compact {
  gap: 8rpx;
}

.personal-alerts__title {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.personal-alerts__item {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.personal-alert-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.personal-alert-chip {
  border-radius: 999px;
  background: var(--surface);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  padding: 6rpx 12rpx;
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

.reason-list--compact {
  gap: 8rpx;
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

.audience-box__note {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
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

.focus-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.focus-item {
  border: 1px solid var(--line);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: grid;
  grid-template-columns: 40rpx minmax(0, 1fr);
  align-items: flex-start;
  gap: var(--space-xs);
  padding: 12rpx 14rpx;
}

.focus-item__rank {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999px;
  background: var(--surface);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1;
}

.focus-item__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.focus-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
}

.focus-item__label,
.focus-item__status {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.focus-item__status {
  color: var(--accent);
  text-align: right;
  white-space: nowrap;
}

.focus-item__detail {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.finding-card--attention .focus-item__status {
  color: var(--status-danger);
}

.finding-card--ok .focus-item__status {
  color: var(--primary-strong);
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

.additive-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.additive-category-chip {
  border-radius: 999px;
  background: var(--surface-warm);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  padding: 6rpx 12rpx;
}

.nutrition-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  border: 1px solid var(--line);
  border-radius: 18rpx;
  background: var(--surface);
  padding: var(--space-sm);
}

.nutrition-bars--standalone {
  border: 0;
  background: transparent;
  padding: 0;
}

.nutrition-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.nutrition-chart-head__hint {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  text-align: right;
}

.nutrition-bar-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.nutrition-bar-row {
  border-radius: 14rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  padding: 10rpx 12rpx;
}

.nutrition-bar-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.nutrition-bar-row__label,
.nutrition-bar-row__value,
.nutrition-bar-row__level {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.nutrition-bar-row__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6rpx;
  min-width: 0;
}

.nutrition-bar-row__level {
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  padding: 3rpx 8rpx;
  white-space: nowrap;
}

.nutrition-bar-row__level--attention {
  background: rgba(217, 107, 95, 0.12);
  color: var(--status-danger);
}

.nutrition-bar-row__level--watch {
  background: rgba(216, 138, 36, 0.14);
  color: var(--accent);
}

.nutrition-bar-row__value {
  text-align: right;
  white-space: nowrap;
}

.nutrition-meter {
  height: 12rpx;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(18, 151, 128, 0.14) 0 34%, rgba(216, 138, 36, 0.16) 34% 66%, rgba(217, 107, 95, 0.14) 66% 100%);
}

.nutrition-meter__fill {
  height: 100%;
  min-width: 8%;
  border-radius: inherit;
  transition: width 180ms ease;
}

.nutrition-meter__fill--attention {
  background: var(--status-danger);
  box-shadow: 0 0 0 1px rgba(217, 107, 95, 0.12);
}

.nutrition-meter__fill--watch {
  background: var(--accent);
  box-shadow: 0 0 0 1px rgba(216, 138, 36, 0.12);
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

.nutrition-legend {
  color: var(--muted);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.3;
  padding: 0 4rpx;
}

.nutrition-legend text:nth-child(2) {
  text-align: center;
}

.nutrition-legend text:nth-child(3) {
  text-align: right;
}

.audience-preview {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 16rpx;
  background: var(--primary-soft);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 14rpx;
}

.audience-preview__label {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.audience-preview__text {
  color: var(--text);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.reason-more {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.retake-tip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-xs);
}

.captured-mini-list {
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 16rpx;
  background: var(--primary-soft);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 12rpx;
}

.captured-mini-list__title {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.captured-mini-list__item {
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  padding: 6rpx 10rpx;
}

.retake-tip {
  border-radius: 16rpx;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.35;
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
  text-align: center;
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

.detail-summary {
  color: var(--muted);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.45;
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
  gap: var(--space-lg);
  min-height: 48rpx;
}

.link--subtle {
  color: var(--muted);
}
.action-bar :deep(.app-button) {
  width: 100%;
}

@media screen and (max-width: 380px) {
  .action-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .decision-fast-item {
    grid-template-columns: 88rpx minmax(0, 1fr);
  }

  .retake-tip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
