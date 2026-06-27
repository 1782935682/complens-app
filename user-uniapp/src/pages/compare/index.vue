<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { allergenOptions } from '@/constants/attention';
import { routes, navigateToRoute } from '@/constants/routes';
import { getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import {
  getReportById,
  getReports,
  refreshReportsForCurrentProfile,
  resetScanDraft,
  startCompareDraft,
  toggleReportAvoided,
  toggleReportFavorite
} from '@/stores/scanStore';
import { compareReportsWithAdapter } from '@/services/api/decision';
import type { ComparisonResult, LabelReport, PurchaseDecision, PurchaseRecommendation } from '@/types';
import { recognizeAdditives } from '@/utils/additiveRules';
import { buildPurchaseDecision } from '@/utils/decisionRules';
import {
  comparableProductName,
  isGenericProductName,
  isReportIncompleteForCompare,
  isSameProductForCompare,
  orderReportsForCompare,
  reportDisplayNameForCompare
} from '@/utils/reportIdentity';

type Side = 'left' | 'right' | 'tie';
type DifferenceRow = {
  key: string;
  label: string;
  leftValue: string;
  rightValue: string;
  winner: Side;
  reason: string;
};
type ProfileBasisRow = DifferenceRow & {
  source: string;
};
type ComparisonValueRow = {
  id: string;
  label: string;
  text: string;
};
type HistoryCandidate = {
  report: LabelReport;
  name: string;
  decision: string;
  dateLabel: string;
};
type DecisionEvaluation = {
  side: Exclude<Side, 'tie'>;
  decision: PurchaseDecision;
  recommendationRank: number;
  score: number;
  riskWeight: number;
  profileConflicts: string[];
  hardProfileConflicts: string[];
  unsafeForProfile: boolean;
};
type AdditiveEvidence = {
  count: number;
  names: string[];
};

const SWEETENER_TERMS = ['阿斯巴甜', '安赛蜜', '三氯蔗糖', '甜蜜素', '糖精钠', '赤藓糖醇', '木糖醇', '甜味剂'];
const CHILD_WATCH_TERMS = ['咖啡因', '酒精', '色素', '柠檬黄', '日落黄', '胭脂红', '诱惑红', '亮蓝', ...SWEETENER_TERMS];

const leftReport = ref<LabelReport | undefined>();
const rightReport = ref<LabelReport | undefined>();
const attention = ref(getAttentionSettings());
const reports = ref<LabelReport[]>([]);
const remoteComparisonSummary = ref('');
const comparisonNotice = ref('');
const profileRefreshNotice = ref('');
const explicitComparisonMissing = ref(false);

const leftDecision = computed(() => leftReport.value ? purchaseDecisionFor(leftReport.value) : undefined);
const rightDecision = computed(() => rightReport.value ? purchaseDecisionFor(rightReport.value) : undefined);
const leftEvaluation = computed(() => leftReport.value && leftDecision.value ? buildDecisionEvaluation('left', leftReport.value, leftDecision.value) : undefined);
const rightEvaluation = computed(() => rightReport.value && rightDecision.value ? buildDecisionEvaluation('right', rightReport.value, rightDecision.value) : undefined);
const hasComparisonPair = computed(() => Boolean(leftReport.value && rightReport.value && leftDecision.value && rightDecision.value));
const isSelfComparison = computed(() => isSameProductForCompare(leftReport.value, rightReport.value));
const hasInsufficientComparison = computed(() => leftDecision.value?.recommendation === '信息不足' || rightDecision.value?.recommendation === '信息不足');
const bothNotSuitableForProfile = computed(() => {
  if (!leftEvaluation.value || !rightEvaluation.value) return false;
  return leftEvaluation.value.unsafeForProfile && rightEvaluation.value.unsafeForProfile;
});
const bothHaveHardProfileConflicts = computed(() => Boolean(
  bothNotSuitableForProfile.value
  && leftEvaluation.value?.hardProfileConflicts.length
  && rightEvaluation.value?.hardProfileConflicts.length
));
const hardAllergenStopText = computed(() => {
  if (!bothHaveHardProfileConflicts.value || !leftEvaluation.value || !rightEvaluation.value) return '';
  const left = leftEvaluation.value.hardProfileConflicts.join('、') || '当前忌口';
  const right = rightEvaluation.value.hardProfileConflicts.join('、') || '当前忌口';
  return `过敏/忌口优先：A 命中${left}，B 命中${right}。不要用糖、钠或添加剂差异抵消过敏风险，继续换无命中款。`;
});
const sharedCommonAllergenText = computed(() => {
  const labels = sharedCommonAllergenLabels.value;
  if (!labels.length) return '';
  return `两款都含${labels.join('、')}。如果你或家人过敏，本次不要只看胜出款；先设为忌口后重算。`;
});
const sharedCommonAllergenKeys = computed(() => {
  if (attention.value.allergens.length || !leftReport.value || !rightReport.value || isSelfComparison.value || hasInsufficientComparison.value) return [];
  const leftKeys = allergenKeysForCompare(leftReport.value);
  const rightKeys = allergenKeysForCompare(rightReport.value);
  return leftKeys.filter((key) => rightKeys.includes(key)).slice(0, 3);
});
const sharedCommonAllergenLabels = computed(() => allergenOptions
  .filter((option) => sharedCommonAllergenKeys.value.includes(option.key))
  .map((option) => option.label)
  .slice(0, 3));
const relativeFallbackWinner = computed<Side>(() => {
  if (!leftEvaluation.value || !rightEvaluation.value) return 'tie';
  const nutritionWinner = keyNutritionWinner();
  if (nutritionWinner !== 'tie') return nutritionWinner;
  const riskWinner = compareLower(
    leftEvaluation.value.riskWeight + leftEvaluation.value.profileConflicts.length,
    rightEvaluation.value.riskWeight + rightEvaluation.value.profileConflicts.length
  );
  if (riskWinner !== 'tie') return riskWinner;
  return compareScore(leftEvaluation.value.score, rightEvaluation.value.score);
});
const relativeFallbackText = computed(() => {
  if (!bothNotSuitableForProfile.value || relativeFallbackWinner.value === 'tie') return '';
  return `两款都不建议常买；若必须二选一，${sideDisplayName(relativeFallbackWinner.value)}负担相对更低，但仍建议小份量或继续换同类。`;
});

const finalWinner = computed<Side>(() => {
  if (isSelfComparison.value) return 'tie';
  if (hasInsufficientComparison.value) return 'tie';
  if (sharedCommonAllergenText.value) return 'tie';
  if (bothNotSuitableForProfile.value) return bothHaveHardProfileConflicts.value ? 'tie' : relativeFallbackWinner.value;
  if (!leftEvaluation.value || !rightEvaluation.value) return 'tie';
  return compareDecisionEvaluations(leftEvaluation.value, rightEvaluation.value);
});

const unsafeBothText = computed(() => {
  if (!bothNotSuitableForProfile.value || !leftEvaluation.value || !rightEvaluation.value) return '';
  if (!bothHaveHardProfileConflicts.value && relativeFallbackText.value) return relativeFallbackText.value;
  const conflicts = unique([
    ...leftEvaluation.value.hardProfileConflicts,
    ...rightEvaluation.value.hardProfileConflicts,
    ...leftEvaluation.value.profileConflicts,
    ...rightEvaluation.value.profileConflicts
  ]).slice(0, 3);
  return conflicts.length
    ? `两款都命中当前${conflicts.join('、')}，本次不选胜出款。`
    : '两款都落入不建议级别，本次不选胜出款。';
});

const primaryWhyText = computed(() => {
  if (isSelfComparison.value) return '这是同一款商品，请再拍另一款同类产品。';
  if (hasInsufficientComparison.value) return '至少一款缺少配料表或营养表，先补拍后再比较。';
  if (unsafeBothText.value) return unsafeBothText.value;
  if (sharedCommonAllergenText.value) return sharedCommonAllergenText.value;
  if (!leftEvaluation.value || !rightEvaluation.value) return '';
  if (finalWinner.value === 'tie') {
    const nutritionWinner = keyNutritionWinner();
    if (nutritionWinner !== 'tie') return `${sideDisplayName(nutritionWinner)}关键营养数字更低，但两款整体购买分接近。`;
    return '两款推荐等级、购买分和画像风险接近。';
  }
  return buildWinnerWhy(finalWinner.value, leftEvaluation.value, rightEvaluation.value);
});

const comparisonRows = computed(() => {
  if (isSelfComparison.value) {
    return [
      { key: 'healthier', label: '负担更低', winner: 'tie' as Side, reason: '这是同一款商品，不能判定胜出' },
      { key: 'lowerRisk', label: '更低风险', winner: 'tie' as Side, reason: '请再拍另一款同类商品后比较风险' },
      { key: 'profile', label: '更适合你', winner: 'tie' as Side, reason: '同款商品不能作为 A/B 对比' }
    ];
  }
  if (hasInsufficientComparison.value) {
    return [
      { key: 'healthier', label: '负担更低', winner: 'tie' as Side, reason: '有商品缺少配料表或营养表，不能判定胜出' },
      { key: 'lowerRisk', label: '更低风险', winner: 'tie' as Side, reason: '先补拍信息不足的商品，再比较风险' },
      { key: 'profile', label: '更适合你', winner: 'tie' as Side, reason: '信息不足时不做画像胜出判断' }
    ];
  }
  if (!leftEvaluation.value || !rightEvaluation.value) return [];
  if (bothHaveHardProfileConflicts.value) {
    return [
      { key: 'allergen-stop', label: '过敏阻断', winner: 'tie' as Side, reason: hardAllergenStopText.value || unsafeBothText.value || '两款都命中当前忌口，不能作为替代选择' }
    ];
  }
  if (sharedCommonAllergenText.value) {
    const nutritionWinner = keyNutritionWinner();
    return [
      { key: 'allergen-confirm', label: '过敏先确认', winner: 'tie' as Side, reason: sharedCommonAllergenText.value },
      { key: 'healthier', label: '负担更低', winner: nutritionWinner, reason: nutritionWinner === 'tie' ? '糖、碳水、钠整体接近' : `${sideDisplayName(nutritionWinner)}关键营养数字相对更低` },
      { key: 'profile', label: '更适合你', winner: 'tie' as Side, reason: '未设置忌口前只做营养差异提示，不给过敏用户直接胜出结论' }
    ];
  }
  if (bothNotSuitableForProfile.value) {
    const fallback = bothHaveHardProfileConflicts.value ? 'tie' as Side : relativeFallbackWinner.value;
    const fallbackReason = fallback === 'tie'
      ? '两款都有当前画像风险，优先换无命中风险的同类产品'
      : relativeFallbackText.value;
    return [
      { key: 'healthier', label: '负担更低', winner: fallback, reason: fallbackReason },
      { key: 'lowerRisk', label: '更低风险', winner: fallback, reason: fallbackReason },
      { key: 'profile', label: '更适合你', winner: fallback, reason: unsafeBothText.value || '两款都不适合当前画像' }
    ];
  }
  const scoreWinner = compareScore(leftEvaluation.value.score, rightEvaluation.value.score);
  const nutritionWinner = keyNutritionWinner();
  const healthier = scoreWinner !== 'tie' ? scoreWinner : nutritionWinner;
  const riskWinner = compareLower(leftEvaluation.value.riskWeight, rightEvaluation.value.riskWeight);
  const lowerRisk = riskWinner !== 'tie' ? riskWinner : scoreWinner;
  return [
    { key: 'healthier', label: '负担更低', winner: healthier, reason: comparisonReasonFor(healthier, 'score') },
    { key: 'lowerRisk', label: '更低风险', winner: lowerRisk, reason: comparisonReasonFor(lowerRisk, 'risk') },
    { key: 'profile', label: '更适合你', winner: finalWinner.value, reason: primaryWhyText.value }
  ];
});

const finalText = computed(() => {
  if (isSelfComparison.value) return '这是同一款商品，不能做 A/B 对比；请再拍另一款同类产品。';
  if (hasInsufficientComparison.value) return '有商品信息不足，先补拍标签后再判断胜出。';
  if (bothNotSuitableForProfile.value && bothHaveHardProfileConflicts.value) return '两款都命中当前过敏/忌口，直接都不选。';
  if (sharedCommonAllergenText.value) return `${sharedCommonAllergenText.value}未过敏再看糖、钠和添加剂差异。`;
  if (bothNotSuitableForProfile.value && finalWinner.value !== 'tie') return `两款都不建议常买；若必须二选一，${sideDisplayName(finalWinner.value)}负担更低。`;
  if (bothNotSuitableForProfile.value) return '两款都不适合当前画像，建议换无命中风险的同类产品。';
  if (finalWinner.value === 'tie') return '两款接近，优先选配料更短、糖钠脂更低的一款。';
  return `${sideDisplayName(finalWinner.value)} 更适合当前画像。`;
});

const finalVisual = computed(() => {
  if (isSelfComparison.value) return { label: '重选', glyph: '!', tone: 'tie' };
  if (hasInsufficientComparison.value) return { label: '补拍', glyph: '!', tone: 'tie' };
  if (bothNotSuitableForProfile.value && (bothHaveHardProfileConflicts.value || finalWinner.value === 'tie')) return { label: '都不选', glyph: '!', tone: 'tie' };
  if (sharedCommonAllergenText.value) return { label: '过敏先确认', glyph: '!', tone: 'tie' };
  if (bothNotSuitableForProfile.value && finalWinner.value === 'left') return { label: 'A 低负担', glyph: 'A', tone: 'left' };
  if (bothNotSuitableForProfile.value && finalWinner.value === 'right') return { label: 'B 低负担', glyph: 'B', tone: 'right' };
  if (finalWinner.value === 'left') return { label: 'A 胜出', glyph: 'A', tone: 'left' };
  if (finalWinner.value === 'right') return { label: 'B 胜出', glyph: 'B', tone: 'right' };
  return { label: '接近', glyph: '=', tone: 'tie' };
});
const differenceRows = computed<DifferenceRow[]>(() => {
  if (!leftReport.value || !rightReport.value) return [];
  if (bothHaveHardProfileConflicts.value) {
    return [buildAllergenDifference()].filter((item): item is DifferenceRow => Boolean(item));
  }
  return [
    buildNutritionDifference('sugar', '糖'),
    buildNutritionDifference('carbohydrate', '碳水'),
    buildNutritionDifference('sodium', '钠'),
    buildAllergenDifference(),
    buildAdditiveDifference()
  ].filter((item): item is DifferenceRow => Boolean(item));
});
const primaryDifferenceRows = computed(() => differenceRows.value.slice(0, 5));
const differenceSectionLabel = computed(() => {
  if (sharedCommonAllergenText.value || bothHaveHardProfileConflicts.value) return winnerDisplayLabel(finalWinner.value);
  const nutritionWinner = keyNutritionWinner();
  if (finalWinner.value === 'tie' && nutritionWinner !== 'tie') return `${sideDisplayName(nutritionWinner)}营养更低`;
  return winnerDisplayLabel(finalWinner.value);
});

function buildProfileBasisRows(): ProfileBasisRow[] {
  if (!leftReport.value || !rightReport.value || isSelfComparison.value || hasInsufficientComparison.value) return [];
  const rows: Array<ProfileBasisRow | undefined> = [];
  if (attention.value.allergens.length) {
    rows.push(toProfileBasisRow(
      buildAllergenDifference(),
      '配料表/致敏提示',
      bothHaveHardProfileConflicts.value ? '两款都命中当前忌口，本次直接都不选' : undefined
    ));
  }
  if (hasGoal('sugar')) {
    rows.push(
      toProfileBasisRow(buildNutritionDifference('sugar', '糖'), '营养成分表'),
      toProfileBasisRow(buildNutritionDifference('carbohydrate', '碳水'), '营养成分表'),
      buildTermDifference('sweetener', '甜味剂', SWEETENER_TERMS, '配料表')
    );
  }
  if (hasGoal('children')) {
    rows.push(
      toProfileBasisRow(buildNutritionDifference('sugar', '糖'), '营养成分表'),
      toProfileBasisRow(buildNutritionDifference('sodium', '钠'), '营养成分表'),
      toProfileBasisRow(buildAdditiveDifference(), '配料表'),
      buildTermDifference('child-watch', '儿童关注词', CHILD_WATCH_TERMS, '配料表')
    );
  }
  if (hasGoal('lowSodium')) {
    rows.push(toProfileBasisRow(buildNutritionDifference('sodium', '钠'), '营养成分表'));
  }
  const seen = new Set<string>();
  return rows
    .filter((item): item is ProfileBasisRow => Boolean(item))
    .filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
}

const profileBasisRows = computed<ProfileBasisRow[]>(() => buildProfileBasisRows().slice(0, 4));
const profileBasisTitle = computed(() => {
  const labels = [
    attention.value.allergens.length ? '忌口' : '',
    hasGoal('sugar') ? '控糖' : '',
    hasGoal('children') ? '儿童' : '',
    hasGoal('lowSodium') ? '低钠' : ''
  ].filter(Boolean);
  return `${labels.length ? labels.join(' / ') : '当前画像'}依据`;
});
const comparisonValueRows = computed<ComparisonValueRow[]>(() => [
  {
    id: 'decision',
    label: '直接行动',
    text: compareActionProofText.value
  },
  {
    id: 'aligned',
    label: '同屏对齐',
    text: '糖、碳水、钠、过敏原和添加剂固定 A/B 对齐，不用在聊天里反复追问。'
  },
  {
    id: 'profile',
    label: '画像优先',
    text: `${profileBasisTitle.value}会影响胜出结果；过敏命中时直接优先于低糖优势。`
  },
  {
    id: 'evidence',
    label: '可核对',
    text: '结论只来自本次包装标签、营养数字和已保存画像，公开资料不会替代实拍证据。'
  },
  {
    id: 'next',
    label: '下一步',
    text: compareNextStepText.value
  }
]);

const compareActionProofText = computed(() => {
  if (hasInsufficientComparison.value) return '有一款信息不足时不判胜出，先补拍缺失标签再比较。';
  if (bothHaveHardProfileConflicts.value) return '两款都命中过敏/忌口时直接都不选，不让低糖或低钠优势抵消风险。';
  if (sharedCommonAllergenText.value) return '两款都有常见过敏原时先确认忌口；未过敏再看营养差异。';
  if (finalWinner.value === 'left' || finalWinner.value === 'right') return `${sideDisplayName(finalWinner.value)}是当前更可执行的选择；理由和包装字段在同页可核对。`;
  return '两款接近时不给硬胜出，转为配料更短、糖钠脂更低的筛选规则。';
});

const compareNextStepText = computed(() => {
  if (bothHaveHardProfileConflicts.value || sharedCommonAllergenText.value) return '继续找无对应致敏提示的同类，再看糖、碳水、钠和添加剂。';
  if (hasGoal('sugar')) return '继续找糖≤5g/100ml、碳水≤8g/100ml且糖浆不在前三位的同类。';
  if (hasGoal('children')) return '继续找无咖啡因/酒精/多种色素和甜味剂、糖更低的同类。';
  if (hasGoal('lowSodium')) return '继续找钠≤300mg/100g，儿童或控盐更严格时看≤120mg/100g。';
  return '可以收藏胜出款、避雷落败款，或继续拍下一款同类补齐候选。';
});

const productCards = computed(() => [
  {
    side: 'left' as Side,
    label: 'A',
    name: productName(leftReport.value, '第一款'),
    decision: leftDecision.value?.recommendation || '信息不足',
    tone: decisionTone(leftDecision.value?.recommendation),
    score: normalizedScore(leftDecision.value?.score),
    riskLabel: riskSummary(leftDecision.value)
  },
  {
    side: 'right' as Side,
    label: 'B',
    name: productName(rightReport.value, '第二款'),
    decision: rightDecision.value?.recommendation || '信息不足',
    tone: decisionTone(rightDecision.value?.recommendation),
    score: normalizedScore(rightDecision.value?.score),
    riskLabel: riskSummary(rightDecision.value)
  }
]);
const compareBaseReport = computed(() => {
  if (explicitComparisonMissing.value) return undefined;
  if (finalWinner.value === 'left' && leftReport.value && isComparableReport(leftReport.value)) return leftReport.value;
  if (finalWinner.value === 'right' && rightReport.value && isComparableReport(rightReport.value)) return rightReport.value;
  if (leftReport.value && isComparableReport(leftReport.value)) return leftReport.value;
  if (rightReport.value && isComparableReport(rightReport.value)) return rightReport.value;
  return reports.value.find(isComparableReport);
});
const compareBaseName = computed(() => reportDisplayNameForCompare(compareBaseReport.value, 'A 款'));
const primaryCompareActionLabel = computed(() => {
  if (explicitComparisonMissing.value) return '重新拍 A 款';
  if (!compareBaseReport.value) return reports.value.length ? '拍一款可比较标签' : '拍第一款';
  if (!rightReport.value) return '拍第二款对比';
  if (isSelfComparison.value) return '重拍 B 款对比';
  if (hasInsufficientComparison.value) return '补拍后对比';
  return '拍下一款对比';
});
const emptyStateTitle = computed(() => {
  if (explicitComparisonMissing.value) return '对比报告没找到';
  if (!reports.value.length) return '先拍 A 款';
  if (compareBaseReport.value) return 'A 款已选，继续拍 B 款';
  return '还不能对比';
});
const emptyStateDescription = computed(() => {
  if (explicitComparisonMissing.value) return '刚才用于对比的报告可能已被清理。重新拍第一款后，再拍第二款做 A/B 对比。';
  if (!reports.value.length) return '拍第一款食品标签后，再拍第二款做 A/B 对比。';
  if (compareBaseReport.value) return `已选 ${compareBaseName.value} 作为 A 款；再拍一款同类产品即可进入对比。`;
  return '已有报告信息不足，先补拍配料表或营养成分表，再做 A/B 对比。';
});
const historyCandidateCards = computed<HistoryCandidate[]>(() => {
  const base = compareBaseReport.value;
  const selectedIds = [leftReport.value?.id, rightReport.value?.id].filter((id): id is string => Boolean(id));
  return reports.value
    .filter(isComparableReport)
    .filter((item) => !selectedIds.includes(item.id))
    .filter((item) => !base || !isSameProductForCompare(base, item))
    .slice(0, 4)
    .map((report) => ({
      report,
      name: reportDisplayNameForCompare(report, '历史报告'),
      decision: purchaseDecisionFor(report).recommendation,
      dateLabel: formatReportDate(report.createdAt)
    }));
});
const winnerReport = computed(() => {
  if (finalWinner.value === 'left' && leftReport.value && isComparableReport(leftReport.value)) return leftReport.value;
  if (finalWinner.value === 'right' && rightReport.value && isComparableReport(rightReport.value)) return rightReport.value;
  return undefined;
});
const loserReport = computed(() => {
  if (finalWinner.value === 'left' && rightReport.value && isComparableReport(rightReport.value)) return rightReport.value;
  if (finalWinner.value === 'right' && leftReport.value && isComparableReport(leftReport.value)) return leftReport.value;
  return undefined;
});
const canSaveComparisonChoice = computed(() => Boolean(winnerReport.value && loserReport.value && !bothHaveHardProfileConflicts.value && !sharedCommonAllergenText.value && !hasInsufficientComparison.value));
const saveWinnerLabel = computed(() => {
  if (!winnerReport.value) return '胜出接近';
  return winnerReport.value.isFavorite ? '胜出已收藏' : `收藏${finalWinner.value === 'left' ? 'A' : 'B'}胜出`;
});
const avoidLoserLabel = computed(() => {
  if (!loserReport.value) return '无法避雷';
  return loserReport.value.isAvoided ? '落败已避雷' : `避雷${finalWinner.value === 'left' ? 'B' : 'A'}落败`;
});

onLoad((query) => {
  void loadComparison(query);
});

async function loadComparison(query?: Record<string, unknown>) {
  attention.value = getAttentionSettings();
  reports.value = getReports();
  const leftId = String(query?.left || '');
  const rightId = String(query?.right || '');
  const comparableReports = reports.value.filter(isComparableReport);
  const explicitLeft = leftId ? getReportById(leftId) : undefined;
  const explicitRight = rightId ? getReportById(rightId) : undefined;
  explicitComparisonMissing.value = Boolean((leftId && !explicitLeft) || (rightId && !explicitRight));
  if (explicitComparisonMissing.value) {
    leftReport.value = explicitLeft;
    rightReport.value = explicitRight;
    comparisonNotice.value = '没有找到刚才的对比报告，请重新拍两款商品。';
    return;
  }
  leftReport.value = explicitLeft || comparableReports[0] || reports.value[0];
  rightReport.value = explicitRight
    || (rightId ? undefined : comparableReports.find((item) => item.id !== leftReport.value?.id && !isSameProductForCompare(leftReport.value, item)))
    || (rightId ? undefined : reports.value.find((item) => item.id !== leftReport.value?.id && !isSameProductForCompare(leftReport.value, item)));
  remoteComparisonSummary.value = '';
  comparisonNotice.value = '';
  profileRefreshNotice.value = '';
  if (!leftReport.value || !rightReport.value) return;
  const comparison = await compareReportsWithAdapter(leftReport.value, rightReport.value, attention.value).catch(() => null);
  remoteComparisonSummary.value = comparison && isRemoteComparisonAligned(comparison) ? comparison.summary : '';
}

function purchaseDecisionFor(report: LabelReport): PurchaseDecision {
  return buildPurchaseDecision(report, attention.value);
}

function isComparableReport(report: LabelReport): boolean {
  return buildPurchaseDecision(report, attention.value).recommendation !== '信息不足'
    && !isReportIncompleteForCompare(report)
    && Boolean(comparableProductName(report));
}

function buildDecisionEvaluation(side: Exclude<Side, 'tie'>, report: LabelReport, decision: PurchaseDecision): DecisionEvaluation {
  const hardProfileConflicts = hardProfileConflictLabels(report, decision);
  const profileConflicts = profileConflictLabels(report, decision);
  const recommendationRank = recommendationWeight(decision.recommendation);
  const weight = riskWeight(decision);
  const score = normalizedScore(decision.score);
  return {
    side,
    decision,
    recommendationRank,
    score,
    riskWeight: weight,
    profileConflicts,
    hardProfileConflicts,
    unsafeForProfile: decision.recommendation === '不建议'
      || hardProfileConflicts.length > 0
  };
}

function compareDecisionEvaluations(left: DecisionEvaluation, right: DecisionEvaluation): Side {
  if (left.unsafeForProfile !== right.unsafeForProfile) return left.unsafeForProfile ? 'right' : 'left';
  const recommendationWinner = compareRank(left.recommendationRank, right.recommendationRank);
  if (recommendationWinner !== 'tie') return recommendationWinner;
  const scoreWinner = compareScore(left.score, right.score);
  if (scoreWinner !== 'tie') return scoreWinner;
  const riskWinner = compareLower(left.riskWeight + left.profileConflicts.length * 2, right.riskWeight + right.profileConflicts.length * 2);
  if (riskWinner !== 'tie') return riskWinner;
  return keyNutritionWinner();
}

function recommendationWeight(value: PurchaseRecommendation): number {
  if (value === '推荐') return 3;
  if (value === '谨慎') return 2;
  if (value === '不建议') return 1;
  return 0;
}

function compareRank(left: number, right: number): Side {
  if (left === right) return 'tie';
  return left > right ? 'left' : 'right';
}

function compareScore(left: number, right: number): Side {
  if (Math.abs(left - right) <= 3) return 'tie';
  return left > right ? 'left' : 'right';
}

function hardProfileConflictLabels(report: LabelReport, decision: PurchaseDecision): string[] {
  return unique([
    ...configuredAllergenHits(report),
    hasConfiguredAllergenRisk(report, decision) ? '过敏/忌口' : ''
  ].filter(Boolean));
}

function profileConflictLabels(report: LabelReport, decision: PurchaseDecision): string[] {
  const text = [
    ...decision.riskReasons,
    report.decision?.summary || '',
    ...(report.decision?.reasons || []),
    ...(report.decision?.lessSuitableFor || []),
    ...(report.decision?.watchPoints || [])
  ].join(' ');
  return unique([
    ...hardProfileConflictLabels(report, decision),
    hasGoal('sugar') && /控糖|糖|碳水/.test(text) ? '控糖' : '',
    hasGoal('fatLoss') && /减脂|脂肪|热量|能量|油/.test(text) ? '减脂' : '',
    hasGoal('lowSodium') && /低钠|钠|盐/.test(text) ? '低钠' : '',
    hasGoal('children') && /儿童|甜味剂|色素|咖啡因|酒精/.test(text) ? '儿童' : ''
  ].filter(Boolean));
}

function hasGoal(key: 'sugar' | 'fatLoss' | 'lowSodium' | 'children'): boolean {
  if (key === 'children') return attention.value.isChildrenMode || attention.value.targetGoals.includes('children');
  return attention.value.primaryGoal === key || attention.value.targetGoals.includes(key);
}

function buildWinnerWhy(winner: Side, left: DecisionEvaluation, right: DecisionEvaluation): string {
  if (winner === 'tie') return '两款推荐等级、购买分和画像风险接近。';
  const winning = winner === 'left' ? left : right;
  const losing = winner === 'left' ? right : left;
  if (losing.unsafeForProfile && !winning.unsafeForProfile) {
    const conflicts = losing.hardProfileConflicts.length ? losing.hardProfileConflicts : losing.profileConflicts;
    return profileReliefReason(winner, conflicts);
  }
  if (winning.recommendationRank !== losing.recommendationRank) {
    return `${sideDisplayName(winner)}是${winning.decision.recommendation}${winning.score}分，对方是${losing.decision.recommendation}${losing.score}分。`;
  }
  if (Math.abs(winning.score - losing.score) > 3) {
    return `${sideDisplayName(winner)}购买分更高：${winning.score}分 vs ${losing.score}分。`;
  }
  if (winning.riskWeight !== losing.riskWeight) return `${sideDisplayName(winner)}风险提醒更少或更轻。`;
  return `${sideDisplayName(winner)}关键营养数字更适合当前关注项。`;
}

function profileReliefReason(winner: Side, conflicts: string[]): string {
  const name = sideDisplayName(winner);
  const text = conflicts.join('、');
  if (/过敏|忌口/.test(text)) return `${name}没有命中当前过敏/忌口项，更适合继续核对。`;
  if (/控糖/.test(text)) return `${name}糖或碳水风险更低，更符合控糖关注项。`;
  if (/低钠/.test(text)) return `${name}钠或盐风险更低，更符合低钠关注项。`;
  if (/儿童/.test(text)) return `${name}儿童高频食用风险更少。`;
  if (/减脂/.test(text)) return `${name}能量或脂肪负担更低。`;
  return `${name}没有命中主要画像风险。`;
}

function comparisonReasonFor(winner: Side, kind: 'score' | 'risk'): string {
  if (!leftEvaluation.value || !rightEvaluation.value) return '两款接近';
  if (winner === 'tie') {
    if (kind === 'score') return `购买分接近：A ${leftEvaluation.value.score}分，B ${rightEvaluation.value.score}分`;
    return '风险提醒数量和严重度接近';
  }
  const winning = winner === 'left' ? leftEvaluation.value : rightEvaluation.value;
  const losing = winner === 'left' ? rightEvaluation.value : leftEvaluation.value;
  if (kind === 'score') return `${sideDisplayName(winner)}购买分更高：${winning.decision.recommendation}${winning.score}分 vs ${losing.decision.recommendation}${losing.score}分`;
  return `${sideDisplayName(winner)}风险提醒更少或更轻`;
}

function isRemoteComparisonAligned(comparison: ComparisonResult): boolean {
  if (sharedCommonAllergenText.value) return false;
  if (bothNotSuitableForProfile.value) return false;
  const remoteWinner = comparison.betterForProfile !== 'tie'
    ? comparison.betterForProfile
    : comparison.healthier !== 'tie' ? comparison.healthier : comparison.lowerRisk;
  return finalWinner.value === 'tie' || remoteWinner === 'tie' || remoteWinner === finalWinner.value;
}

function keyNutritionWinner(): Side {
  if (!leftReport.value || !rightReport.value) return 'tie';
  const keys = ['sugar', 'carbohydrate', 'sodium'];
  const wins = keys.map((key) => compareLower(nutritionNumber(leftReport.value as LabelReport, key), nutritionNumber(rightReport.value as LabelReport, key)));
  const leftWins = wins.filter((winner) => winner === 'left').length;
  const rightWins = wins.filter((winner) => winner === 'right').length;
  if (leftWins && rightWins) return 'tie';
  if (leftWins) return 'left';
  if (rightWins) return 'right';
  return 'tie';
}

function normalizedScore(value: number | undefined): number {
  const score = Number(value || 0);
  return Math.max(0, Math.min(100, score));
}

function decisionTone(value: string | undefined): 'recommend' | 'caution' | 'avoid' | 'unknown' {
  if (value === '推荐') return 'recommend';
  if (value === '谨慎') return 'caution';
  if (value === '不建议') return 'avoid';
  return 'unknown';
}

function scoreStyle(score: number) {
  return { width: `${score}%` };
}

function winnerDisplayLabel(side: Side): string {
  if (sharedCommonAllergenText.value) {
    if (side === 'left') return 'A 更低';
    if (side === 'right') return 'B 更低';
    return '先确认';
  }
  if (bothHaveHardProfileConflicts.value && side === 'tie') return '都不选';
  if (side === 'left') return 'A 胜出';
  if (side === 'right') return 'B 胜出';
  return '接近';
}

function sideDisplayName(side: Side): string {
  if (side === 'left') return productName(leftReport.value, 'A');
  if (side === 'right') return productName(rightReport.value, 'B');
  return '两款';
}

function productName(report: LabelReport | undefined, fallback: string): string {
  const name = report?.productName || report?.foodAnalysis?.productName || '';
  return name && !isGenericProductName(name) ? name : fallback;
}

function buildNutritionDifference(key: string, label: string): DifferenceRow | undefined {
  if (!leftReport.value || !rightReport.value) return undefined;
  const left = nutritionNumber(leftReport.value, key);
  const right = nutritionNumber(rightReport.value, key);
  if (left === null && right === null) return undefined;
  const winner = compareLower(left, right);
  return {
    key,
    label,
    leftValue: formatNutritionValue(left, key),
    rightValue: formatNutritionValue(right, key),
    winner,
    reason: winner === 'tie'
      ? `${label}差异不明显或数据不完整`
      : `${sideDisplayName(winner)}的${label}更低`
  };
}

function buildAllergenDifference(): DifferenceRow | undefined {
  if (!leftReport.value || !rightReport.value) return undefined;
  const leftHits = allergenHitsForCompare(leftReport.value);
  const rightHits = allergenHitsForCompare(rightReport.value);
  if (!leftHits.length && !rightHits.length) return undefined;
  const winner = compareLower(leftHits.length, rightHits.length);
  const label = attention.value.allergens.length ? '过敏原' : '常见过敏原';
  return {
    key: 'allergen',
    label,
    leftValue: leftHits.length ? leftHits.join('、') : '未命中',
    rightValue: rightHits.length ? rightHits.join('、') : '未命中',
    winner,
    reason: winner === 'tie'
      ? attention.value.allergens.length && leftHits.length && rightHits.length
        ? `两款都命中当前忌口，不能作为替代选择`
        : `${label}命中接近`
      : `${sideDisplayName(winner)}更少命中${attention.value.allergens.length ? '当前忌口' : '常见过敏原'}`
  };
}

function buildAdditiveDifference(): DifferenceRow | undefined {
  if (!leftReport.value || !rightReport.value) return undefined;
  const left = additiveEvidence(leftReport.value);
  const right = additiveEvidence(rightReport.value);
  if (!left.count && !right.count) return undefined;
  const winner = compareLower(left.count, right.count);
  return {
    key: 'additives',
    label: '添加剂/甜味剂',
    leftValue: formatAdditiveEvidence(left),
    rightValue: formatAdditiveEvidence(right),
    winner,
    reason: winner === 'tie' ? '添加剂线索接近' : `${sideDisplayName(winner)}添加剂线索更少`
  };
}

function toProfileBasisRow(row: DifferenceRow | undefined, source: string, reason?: string): ProfileBasisRow | undefined {
  if (!row) return undefined;
  return { ...row, source, reason: reason || row.reason };
}

function buildTermDifference(key: string, label: string, terms: string[], source: string): ProfileBasisRow | undefined {
  if (!leftReport.value || !rightReport.value) return undefined;
  const leftHits = matchedTerms(additiveSourceText(leftReport.value), terms);
  const rightHits = matchedTerms(additiveSourceText(rightReport.value), terms);
  if (!leftHits.length && !rightHits.length) return undefined;
  const winner = compareLower(leftHits.length, rightHits.length);
  return {
    key,
    label,
    source,
    leftValue: leftHits.length ? leftHits.join('、') : '未识别',
    rightValue: rightHits.length ? rightHits.join('、') : '未识别',
    winner,
    reason: winner === 'tie' ? `${label}线索接近` : `${sideDisplayName(winner)}的${label}更少`
  };
}

function matchedTerms(text: string, terms: string[]): string[] {
  return unique(terms.filter((term) => text.includes(term))).slice(0, 4);
}

function nutritionNumber(report: LabelReport, key: string): number | null {
  const field = report.nutritionSection.fields.find((item) => item.key === key);
  if (!field?.value) return null;
  const value = parseNumeric(field.value);
  if (value === null) return null;
  const unit = String(field.unit || field.value).toLowerCase();
  if (key === 'sodium' && /g|克/.test(unit) && !/mg|毫克/.test(unit)) return value * 1000;
  return value;
}

function configuredAllergenHits(report: LabelReport): string[] {
  const text = allergenSourceText(report);
  return allergenOptions
    .filter((option) => attention.value.allergens.includes(option.key))
    .filter((option) => option.keywords.some((keyword) => containsPositiveAllergenTerm(text, keyword)))
    .map((option) => allergenDisplayLabel(text, option.label, option.keywords))
    .slice(0, 3);
}

function hasConfiguredAllergenRisk(report: LabelReport, decision: PurchaseDecision): boolean {
  if (!attention.value.allergens.length) return false;
  return configuredAllergenHits(report).length > 0
    || decision.riskReasons.some((reason) => /你关注的过敏原|当前忌口|不建议食用|过敏\/忌口/.test(reason));
}

function allergenHitsForCompare(report: LabelReport): string[] {
  const configured = configuredAllergenHits(report);
  if (attention.value.allergens.length) return configured;
  return allergenKeysForCompare(report)
    .map((key) => {
      const option = allergenOptions.find((item) => item.key === key);
      return option ? allergenDisplayLabel(allergenSourceText(report), option.label, option.keywords) : '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

function allergenKeysForCompare(report: LabelReport): string[] {
  const text = allergenSourceText(report);
  return allergenOptions
    .filter((option) => option.keywords.some((keyword) => containsPositiveAllergenTerm(text, keyword)))
    .map((option) => option.key)
    .slice(0, 3);
}

function allergenSourceText(report: LabelReport): string {
  const source = report.analysisSource;
  return [
    source?.ingredientText,
    source?.allergenText,
    ...report.ingredientSection.items.map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' ');
}

function containsPositiveAllergenTerm(text: string, keyword: string): boolean {
  const term = String(keyword || '').trim();
  if (!text || !term) return false;
  let index = text.indexOf(term);
  while (index >= 0) {
    const before = text.slice(Math.max(0, index - 8), index);
    const after = text.slice(index + term.length, index + term.length + 6);
    if (!/(?:不含|未含|无|不添加|未添加|零|0)$/.test(before) && !/^(?:含量)?0(?:g|克|mg|毫克)?/.test(after)) return true;
    index = text.indexOf(term, index + term.length);
  }
  return false;
}

function allergenDisplayLabel(text: string, label: string, keywords: string[]): string {
  const maybeHit = keywords.some((keyword) => keyword && new RegExp(`可能(?:含有|含)?[^。；;，,]{0,12}${escapeRegExp(keyword)}`).test(text));
  return maybeHit ? `可能含${label}` : label;
}

function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function riskWeight(decision: PurchaseDecision): number {
  return decision.riskReasons.reduce((sum, reason) => sum + riskReasonWeight(reason), 0);
}

function riskReasonWeight(reason: string): number {
  if (/过敏|致敏|忌口|不建议/.test(reason)) return 5;
  if (/信息不足|补拍|失败|未完整/.test(reason)) return 4;
  if (/糖|碳水|钠|盐|反式|氢化|咖啡因|酒精/.test(reason)) return 3;
  if (/添加剂|甜味剂|色素|防腐剂/.test(reason)) return 2;
  return 1;
}

function riskSummary(decision: PurchaseDecision | undefined): string {
  if (!decision) return '未识别';
  const count = decision.riskReasons.length;
  const weight = riskWeight(decision);
  const level = weight >= 8 ? '高' : weight >= 4 ? '中' : '低';
  return `${count}项提醒 / ${level}`;
}

function additiveEvidence(report: LabelReport): AdditiveEvidence {
  const recognizedItems = recognizeAdditives({
    text: additiveSourceText(report),
    ingredients: report.ingredientSection.items,
    attention: attention.value
  });
  const names = unique([
    ...(report.additiveRecognition?.items || []).map((item) => item.name),
    ...recognizedItems.map((item) => item.name),
    ...report.additiveGroups.flatMap((group) => group.items.map(additiveNameFromMatch)),
    ...report.ingredientSection.items.filter((item) => item.isAdditive).map(additiveNameFromMatch)
  ]).slice(0, 8);
  const count = Math.max(report.ingredientSection.additiveCount || 0, report.additiveRecognition?.total || 0, recognizedItems.length, names.length);
  return { count, names };
}

function additiveNameFromMatch(item: LabelReport['ingredientSection']['items'][number]): string {
  return item.ingredientName || item.normalizedText || item.term || '';
}

function additiveSourceText(report: LabelReport): string {
  const source = report.analysisSource;
  return [
    source?.ingredientText,
    source?.ocrText,
    source?.frontClaimsText,
    report.rawText,
    ...report.ingredientSection.items.map((item) => `${item.normalizedText} ${item.ingredientName || ''} ${item.term || ''}`)
  ].join(' ');
}

function formatAdditiveEvidence(evidence: AdditiveEvidence): string {
  if (!evidence.count) return '未识别';
  if (!evidence.names.length) return `${evidence.count}项`;
  const visibleNames = evidence.names.slice(0, 3);
  const suffix = evidence.names.length > visibleNames.length || evidence.count > visibleNames.length ? '等' : '';
  return `${evidence.count}项：${visibleNames.join('、')}${suffix}`;
}

function compareLower(left: number | null, right: number | null): Side {
  if (left === null || right === null) return 'tie';
  if (Math.abs(left - right) <= 0.1) return 'tie';
  return left < right ? 'left' : 'right';
}

function parseNumeric(value: string): number | null {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function formatNutritionValue(value: number | null, key: string): string {
  if (value === null) return '未识别';
  const unit = key === 'sodium' ? 'mg' : 'g';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;
}

function formatReportDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}-${day}`;
}

function startCompareCapture(report = compareBaseReport.value) {
  comparisonNotice.value = '';
  if (!report || !isComparableReport(report)) {
    resetScanDraft();
    navigateToRoute(routes.capture);
    return;
  }
  startCompareDraft(report.id);
  navigateToRoute(routes.capture);
}

function openHistoryCandidate(candidate: LabelReport) {
  comparisonNotice.value = '';
  profileRefreshNotice.value = '';
  const base = compareBaseReport.value;
  if (!base || !isComparableReport(base)) {
    leftReport.value = candidate;
    rightReport.value = undefined;
    comparisonNotice.value = `已选 ${reportDisplayNameForCompare(candidate, '这款食品')} 作为 A 款，可以继续拍 B 款。`;
    return;
  }
  if (isSameProductForCompare(base, candidate)) {
    comparisonNotice.value = '这是同一款商品，请选择另一款历史报告或重新拍 B 款。';
    return;
  }
  const [left, right] = orderReportsForCompare(base, candidate);
  uni.redirectTo({
    url: `${routes.compare}?left=${encodeURIComponent(left.id)}&right=${encodeURIComponent(right.id)}`
  });
}

function scanMore() {
  startCompareCapture();
}

function syncReportsAfterRetention(updated?: LabelReport) {
  reports.value = getReports();
  if (!updated) return;
  if (leftReport.value?.id === updated.id) leftReport.value = getReportById(updated.id);
  if (rightReport.value?.id === updated.id) rightReport.value = getReportById(updated.id);
}

function saveWinner() {
  const target = winnerReport.value;
  if (!target) {
    comparisonNotice.value = '两款接近，先继续对比或按当前画像重算。';
    return;
  }
  const updated = toggleReportFavorite(target.id, true);
  syncReportsAfterRetention(updated);
  comparisonNotice.value = `${reportDisplayNameForCompare(updated || target, '胜出款')} 已收藏，可回首页“已保存”复查。`;
}

function avoidLoser() {
  const target = loserReport.value;
  if (!target) {
    comparisonNotice.value = '没有明确落败款，先继续对比或按当前画像重算。';
    return;
  }
  const updated = toggleReportAvoided(target.id, true);
  syncReportsAfterRetention(updated);
  comparisonNotice.value = `${reportDisplayNameForCompare(updated || target, '落败款')} 已加入避雷，可回首页“已保存”复查。`;
}

function applySharedAllergensAndRecalculate() {
  const keys = sharedCommonAllergenKeys.value;
  if (!keys.length) {
    comparisonNotice.value = '没有可自动加入的共同过敏原，请到关注项手动设置。';
    navigateToRoute(routes.attention);
    return;
  }
  attention.value = saveAttentionSettings({
    ...attention.value,
    allergens: unique([...attention.value.allergens, ...keys]),
    updatedAt: new Date().toISOString()
  });
  recalculateWithCurrentProfile();
  profileRefreshNotice.value = `已把${sharedCommonAllergenLabels.value.join('、') || '共同过敏原'}加入忌口，并按新画像重算对比。`;
}

function recalculateWithCurrentProfile() {
  const leftId = leftReport.value?.id;
  const rightId = rightReport.value?.id;
  attention.value = getAttentionSettings();
  reports.value = refreshReportsForCurrentProfile();
  leftReport.value = leftId ? reports.value.find((item) => item.id === leftId) : leftReport.value;
  rightReport.value = rightId ? reports.value.find((item) => item.id === rightId) : rightReport.value;
  remoteComparisonSummary.value = '';
  comparisonNotice.value = '';
  profileRefreshNotice.value = '已按当前画像重算已有报告和本次对比。';
}
</script>

<template>
  <view class="page page--compare">
    <view v-if="!hasComparisonPair" class="compare-stack">
      <EmptyState
        :title="emptyStateTitle"
        :description="emptyStateDescription"
        :action-label="primaryCompareActionLabel"
        icon="AB"
        @action="scanMore"
      />

      <AppCard v-if="compareBaseReport" class="compare-card compare-card--cta">
        <view class="cta-row">
          <view class="cta-copy">
            <text class="section-kicker">A/B 对比</text>
            <text class="cta-title">A 款：{{ compareBaseName }}</text>
            <text class="cta-desc">继续拍 B 款，识别完成后会自动进入对比；如果 B 款信息不足，会先给补拍建议。</text>
          </view>
          <AppButton @click="startCompareCapture()">{{ primaryCompareActionLabel }}</AppButton>
        </view>
      </AppCard>

      <AppCard v-if="historyCandidateCards.length" class="compare-card compare-card--history">
        <view class="comparison-head">
          <view class="comparison-title">
            <text class="metric-icon">历</text>
            <text class="comparison-label">用已有报告比较</text>
          </view>
        </view>
        <view class="history-list">
          <button
            v-for="item in historyCandidateCards"
            :key="item.report.id"
            class="history-candidate"
            @tap="openHistoryCandidate(item.report)"
          >
            <text class="history-candidate__name">{{ item.name }}</text>
            <text class="history-candidate__meta">{{ item.decision }} · {{ item.dateLabel }}</text>
          </button>
        </view>
        <text v-if="comparisonNotice" class="comparison-notice">{{ comparisonNotice }}</text>
      </AppCard>
    </view>

    <template v-else>
      <view class="compare-stack">
        <AppCard class="compare-card compare-card--summary">
          <view class="compare-hero">
            <view class="winner-mark" :class="`winner-mark--${finalVisual.tone}`">
              <text class="winner-mark__glyph">{{ finalVisual.glyph }}</text>
            </view>
            <view class="winner-copy">
              <text class="section-kicker">A vs B</text>
              <text class="summary-title">{{ finalText }}</text>
              <text class="winner-label">{{ finalVisual.label }}</text>
            </view>
          </view>
          <text v-if="primaryWhyText" class="decision-why">{{ primaryWhyText }}</text>
          <view v-if="hardAllergenStopText" class="allergen-stop-panel">
            <text class="allergen-stop-panel__label">过敏/忌口优先</text>
            <text class="allergen-stop-panel__text">{{ hardAllergenStopText }}</text>
          </view>
          <view v-else-if="sharedCommonAllergenText" class="allergen-stop-panel allergen-stop-panel--caution">
            <text class="allergen-stop-panel__label">常见过敏原</text>
            <text class="allergen-stop-panel__text">{{ sharedCommonAllergenText }}</text>
            <button class="allergen-stop-panel__action" @tap="applySharedAllergensAndRecalculate">一键设为忌口并重算</button>
          </view>
          <text v-if="remoteComparisonSummary" class="remote-summary">{{ remoteComparisonSummary }}</text>
          <text v-if="profileRefreshNotice" class="comparison-notice">{{ profileRefreshNotice }}</text>

          <view class="product-row">
            <view
              v-for="item in productCards"
              :key="item.side"
              class="product-cell"
              :class="{ 'product-cell--winner': finalWinner === item.side }"
            >
              <view class="product-cell__head">
                <text class="product-label">{{ item.label }}</text>
                <text class="product-decision" :class="`product-decision--${item.tone}`">{{ item.decision }}</text>
              </view>
              <text class="product-name">{{ item.name }}</text>
              <view class="product-meter">
                <view class="product-meter__fill" :style="scoreStyle(item.score)" />
              </view>
              <view class="product-stats">
                <text>{{ item.score }}分</text>
                <text>{{ item.riskLabel }}</text>
              </view>
            </view>
          </view>

          <view v-if="primaryDifferenceRows.length" class="summary-difference-list">
            <view v-for="row in primaryDifferenceRows" :key="`summary-${row.key}`" class="summary-difference-row">
              <text class="summary-difference-label">{{ row.label }}</text>
              <text class="summary-difference-values">A {{ row.leftValue }} / B {{ row.rightValue }}</text>
              <text class="summary-difference-winner">{{ winnerDisplayLabel(row.winner) }}</text>
            </view>
          </view>

          <view v-if="profileBasisRows.length" class="profile-basis-list">
            <view class="profile-basis-head">
              <text class="profile-basis-title">{{ profileBasisTitle }}</text>
              <text class="profile-basis-meta">按当前关注项</text>
            </view>
            <view v-for="row in profileBasisRows" :key="`profile-${row.key}`" class="profile-basis-row">
              <view class="profile-basis-row__head">
                <text class="profile-basis-label">{{ row.label }}</text>
                <text class="profile-basis-source">{{ row.source }}</text>
              </view>
              <text class="profile-basis-values">A {{ row.leftValue }} / B {{ row.rightValue }}</text>
              <text class="profile-basis-reason">{{ row.reason }}</text>
            </view>
          </view>

          <view class="summary-value-proof">
            <text class="summary-value-proof__title">比直接问 AI 省事</text>
            <view class="summary-value-proof__items">
              <text class="summary-value-proof__item">糖/碳水/钠同屏</text>
              <text class="summary-value-proof__item">{{ profileBasisTitle }}优先</text>
              <text class="summary-value-proof__item">包装实拍可核对</text>
            </view>
          </view>

          <view class="hero-actions">
            <AppButton @click="startCompareCapture()">{{ primaryCompareActionLabel }}</AppButton>
            <AppButton variant="secondary" @click="recalculateWithCurrentProfile">按当前画像重算</AppButton>
          </view>
          <view v-if="canSaveComparisonChoice" class="comparison-retention-actions">
            <button class="retention-action retention-action--save" @tap="saveWinner">{{ saveWinnerLabel }}</button>
            <button class="retention-action retention-action--avoid" @tap="avoidLoser">{{ avoidLoserLabel }}</button>
          </view>
        </AppCard>

        <AppCard class="compare-card compare-card--value">
          <view class="comparison-head">
            <view class="comparison-title">
              <text class="metric-icon">专</text>
              <text class="comparison-label">比直接问 AI 省事的地方</text>
            </view>
            <text class="comparison-winner">可复查</text>
          </view>
          <view class="comparison-value-list">
            <view v-for="item in comparisonValueRows" :key="item.id" class="comparison-value-row">
              <text class="comparison-value-label">{{ item.label }}</text>
              <text class="comparison-value-text">{{ item.text }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="differenceRows.length" class="compare-card">
          <view class="comparison-head">
            <view class="comparison-title">
              <text class="metric-icon">差</text>
              <text class="comparison-label">关键差异</text>
            </view>
            <text class="comparison-winner">{{ differenceSectionLabel }}</text>
          </view>
          <view class="difference-list">
            <view v-for="row in differenceRows" :key="row.key" class="difference-row">
              <view class="difference-row__head">
                <text class="difference-label">{{ row.label }}</text>
                <text class="difference-reason">{{ row.reason }}</text>
              </view>
              <view class="difference-values">
                <text class="difference-value" :class="{ 'difference-value--winner': row.winner === 'left' }">A {{ row.leftValue }}</text>
                <text class="difference-value" :class="{ 'difference-value--winner': row.winner === 'right' }">B {{ row.rightValue }}</text>
              </view>
              <view class="segment-strip" :class="`segment-strip--${row.winner}`">
                <view class="segment-strip__track">
                  <view class="segment-strip__fill" />
                </view>
                <text class="difference-result" :class="`difference-result--${row.winner}`">{{ winnerDisplayLabel(row.winner) }}</text>
              </view>
            </view>
          </view>
        </AppCard>

        <AppCard v-for="row in comparisonRows" :key="row.key" class="compare-card">
          <view class="comparison-head">
            <view class="comparison-title">
              <text class="metric-icon">{{ row.label.slice(1, 2) }}</text>
              <text class="comparison-label">{{ row.label }}</text>
            </view>
            <text class="comparison-winner">{{ winnerDisplayLabel(row.winner) }}</text>
          </view>
          <text class="comparison-reason">{{ row.reason }}</text>
        </AppCard>

        <AppCard v-if="historyCandidateCards.length" class="compare-card compare-card--history">
          <view class="comparison-head">
            <view class="comparison-title">
              <text class="metric-icon">历</text>
              <text class="comparison-label">换一款历史报告比较</text>
            </view>
            <text class="history-base">基于 {{ compareBaseName }}</text>
          </view>
          <view class="history-list">
            <button
              v-for="item in historyCandidateCards"
              :key="item.report.id"
              class="history-candidate"
              @tap="openHistoryCandidate(item.report)"
            >
              <text class="history-candidate__name">{{ item.name }}</text>
              <text class="history-candidate__meta">{{ item.decision }} · {{ item.dateLabel }}</text>
            </button>
          </view>
          <text v-if="comparisonNotice" class="comparison-notice">{{ comparisonNotice }}</text>
        </AppCard>
      </view>

      <view class="action-bar">
        <AppButton @click="scanMore">{{ primaryCompareActionLabel }}</AppButton>
        <AppButton variant="secondary" @click="navigateToRoute(routes.home)">回首页</AppButton>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page--compare {
  min-height: 100vh;
  padding-top: calc(28rpx + env(safe-area-inset-top));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  background: var(--bg);
}

.compare-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.compare-card {
  border-radius: 20rpx;
}

.compare-card--summary {
  border-color: rgba(18, 151, 128, 0.16);
  background: linear-gradient(135deg, rgba(238, 250, 245, 0.98), #ffffff);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.compare-card--cta,
.compare-card--history {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cta-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.cta-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cta-title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.3;
  word-break: break-word;
}

.cta-desc,
.decision-why,
.remote-summary,
.comparison-notice,
.history-base {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.5;
}

.compare-hero {
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr);
  gap: var(--space-md);
  align-items: center;
}

.winner-mark {
  width: 104rpx;
  height: 104rpx;
  border-radius: 999px;
  background: var(--primary-strong);
  box-shadow: 0 14rpx 30rpx rgba(8, 122, 104, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.winner-mark--tie {
  background: var(--muted);
  box-shadow: 0 14rpx 30rpx rgba(98, 111, 105, 0.16);
}

.winner-mark__glyph {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1;
}

.winner-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.section-kicker {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.summary-title {
  color: var(--text);
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.28;
}

.winner-label {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.allergen-stop-panel {
  border: 1px solid rgba(177, 52, 52, 0.22);
  border-radius: 16rpx;
  background: rgba(255, 246, 246, 0.96);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--space-sm);
}

.allergen-stop-panel--caution {
  border-color: rgba(190, 126, 18, 0.22);
  background: rgba(255, 250, 236, 0.96);
}

.allergen-stop-panel__label {
  color: #9f2f2f;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.allergen-stop-panel__text {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.45;
}

.allergen-stop-panel__action {
  border: 0;
  border-radius: 999px;
  background: #9f2f2f;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.25;
  min-height: 40px;
  padding: 8rpx 18rpx;
}

.allergen-stop-panel__action::after {
  border: 0;
}

.product-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.summary-difference-list {
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: var(--space-sm);
}

.summary-difference-row {
  display: grid;
  grid-template-columns: 88rpx minmax(0, 1fr) 96rpx;
  gap: var(--space-xs);
  align-items: center;
  min-height: 44rpx;
}

.summary-difference-label,
.summary-difference-winner {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
}

.summary-difference-values {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.summary-difference-winner {
  text-align: right;
}

.profile-basis-list {
  border: 1px solid rgba(216, 138, 36, 0.16);
  border-radius: 16rpx;
  background: rgba(255, 248, 236, 0.78);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--space-sm);
}

.profile-basis-head,
.profile-basis-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.profile-basis-title,
.profile-basis-label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.profile-basis-meta,
.profile-basis-source {
  color: var(--warning);
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.profile-basis-row {
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.76);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx;
}

.profile-basis-values,
.profile-basis-reason {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.profile-basis-reason {
  color: var(--muted);
}

.summary-value-proof {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 16rpx;
  background: rgba(238, 250, 245, 0.72);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 14rpx;
}

.summary-value-proof__title {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 950;
  line-height: 1.2;
}

.summary-value-proof__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.summary-value-proof__item {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 7rpx 10rpx;
}

.compare-card--value {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.comparison-value-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.comparison-value-row {
  min-height: 112rpx;
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 16rpx;
  background: rgba(238, 250, 245, 0.72);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--space-sm);
}

.comparison-value-label {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 950;
  line-height: 1.2;
}

.comparison-value-text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  word-break: break-word;
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.comparison-retention-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.retention-action {
  min-height: 88rpx;
  border: 1px solid rgba(18, 151, 128, 0.16);
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 12rpx 14rpx;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  word-break: break-word;
}

.retention-action::after {
  border: 0;
}

.retention-action--save {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.retention-action--avoid {
  background: rgba(177, 52, 52, 0.1);
  color: #9f2f2f;
}

.product-cell {
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.76);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  padding: var(--space-sm);
}

.product-cell--winner {
  border-color: rgba(18, 151, 128, 0.32);
  background: rgba(238, 250, 245, 0.92);
}

.product-cell__head,
.product-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
}

.product-label,
.product-decision {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.product-decision {
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.1);
  padding: 6rpx 12rpx;
}

.product-decision--caution {
  background: rgba(216, 138, 36, 0.12);
  color: var(--warning);
}

.product-decision--avoid {
  background: rgba(217, 107, 95, 0.12);
  color: var(--status-danger);
}

.product-decision--unknown {
  background: rgba(98, 111, 105, 0.12);
  color: var(--muted);
}

.product-name {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.4;
  word-break: break-word;
}

.product-meter {
  height: 14rpx;
  border-radius: 999px;
  background: rgba(6, 97, 82, 0.1);
  overflow: hidden;
}

.product-meter__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-strong);
}

.product-stats {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.comparison-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.comparison-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.metric-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1;
}

.comparison-label {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.3;
}

.comparison-winner {
  min-width: 112rpx;
  min-height: 44px;
  border-radius: 999px;
  background: var(--primary-strong);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 0 18rpx;
  text-align: center;
}

.comparison-reason {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.5;
  margin-top: 8rpx;
}

.difference-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.difference-row {
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--space-sm);
}

.difference-row__head,
.difference-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.difference-label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.25;
}

.difference-reason {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.3;
  text-align: right;
}

.difference-value {
  min-width: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--muted);
  flex: 1;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  padding: 8rpx 12rpx;
  text-align: center;
  word-break: break-word;
}

.difference-value--winner {
  background: rgba(18, 151, 128, 0.1);
  color: var(--primary-strong);
}

.segment-strip {
  align-self: flex-start;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.segment-strip__track {
  width: 86rpx;
  height: 12rpx;
  border-radius: 999px;
  background: rgba(98, 111, 105, 0.12);
  display: flex;
  align-items: center;
  padding: 2rpx;
}

.segment-strip__fill {
  width: 48%;
  height: 100%;
  border-radius: 999px;
  background: var(--primary-strong);
}

.segment-strip--right .segment-strip__fill {
  margin-left: auto;
}

.segment-strip--tie .segment-strip__fill {
  width: 30%;
  margin: 0 auto;
  background: var(--muted);
}

.difference-result {
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 7rpx 12rpx;
}

.difference-result--left,
.difference-result--right {
  background: rgba(18, 151, 128, 0.1);
  color: var(--primary-strong);
}

.difference-result--tie {
  background: rgba(98, 111, 105, 0.12);
  color: var(--muted);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.history-candidate {
  width: 100%;
  min-height: 76rpx;
  border: 1px solid rgba(18, 151, 128, 0.14);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin: 0;
  padding: 14rpx 18rpx;
  text-align: left;
}

.history-candidate::after {
  border: 0;
}

.history-candidate__name {
  min-width: 0;
  color: var(--text);
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.history-candidate__meta {
  color: var(--primary-strong);
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  border-top: 1px solid rgba(18, 151, 128, 0.12);
  background: linear-gradient(180deg, rgba(247, 248, 247, 0.86), #ffffff 42%);
  padding: var(--space-sm) 0 calc(var(--space-sm) + env(safe-area-inset-bottom));
}

@media (max-width: 380px) {
  .cta-row,
  .history-candidate {
    align-items: stretch;
    flex-direction: column;
  }

  .history-candidate__meta {
    align-self: flex-start;
  }

  .hero-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .comparison-retention-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .comparison-value-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .summary-difference-row {
    grid-template-columns: minmax(0, 1fr);
    align-items: flex-start;
    min-height: 0;
    padding: 6rpx 0;
  }

  .summary-difference-winner {
    text-align: left;
  }

  .comparison-head,
  .difference-row__head,
  .difference-values {
    align-items: stretch;
    flex-direction: column;
  }

  .comparison-winner {
    align-self: flex-start;
  }

  .difference-reason {
    text-align: left;
  }
}
</style>
