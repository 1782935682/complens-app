<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Toast from '@/components/Toast.vue';
import { allergenOptions } from '@/constants/attention';
import { routes, navigateToRoute } from '@/constants/routes';
import { writeString } from '@/platform/storage';
import { buildReportShareMessage, enableWeixinShareMenu, shareReport } from '@/platform/share';
import { getAttentionSettings, saveAttentionSettings } from '@/stores/attentionStore';
import { getReportById, getReports, resetScanDraft, saveReportFeedback, saveScanDraft, toggleReportAvoided, toggleReportFavorite } from '@/stores/scanStore';
import type { AttentionSettings, LabelReport, PurchaseDecision, ReportFeedbackReason, ReportSource } from '@/types';
import { buildPurchaseDecision } from '@/utils/decisionRules';
import { extractOcrTextSnippet, normalizeOcrEvidenceText } from '@/utils/ocrAdapter';
import { comparableProductName, isGenericProductName, isSameProductForCompare, orderReportsForCompare } from '@/utils/reportIdentity';

type PurchaseTone = 'recommend' | 'caution' | 'avoid' | 'unknown';
type VisualTone = PurchaseTone | 'neutral';
type TextEvidenceRow = {
  id: string;
  label: string;
  text: string;
};
type RiskEvidenceRow = {
  id: string;
  label: string;
  risk: string;
  source: string;
  snippet: string;
  tone: VisualTone;
  found: boolean;
};
type DecisionProofRow = {
  id: string;
  label: string;
  text: string;
  source: string;
  snippet: string;
  tone: VisualTone;
  found: boolean;
};
type PackageEvidenceBadge = {
  id: string;
  label: string;
  text: string;
  tone: VisualTone;
};
type MissingChecklistRow = {
  id: string;
  label: string;
  status: string;
  detail: string;
  tone: VisualTone;
};
type AlternativeRow = {
  id: string;
  tag: string;
  text: string;
};
type ValueProofRow = {
  id: string;
  label: string;
  text: string;
};
type TaskClosureAction = 'retake' | 'manual' | 'compare' | 'profile' | 'allergen' | 'save' | 'value';
type TaskClosureRow = {
  id: string;
  label: string;
  text: string;
  action: TaskClosureAction;
  tone: VisualTone;
};
type RetakeTarget = 'ingredient' | 'nutrition' | 'allergen';

const HOME_LIST_MODE_KEY = 'complens:home-list-mode';

const report = ref<LabelReport | undefined>();
const attentionSettings = ref(getAttentionSettings());
const message = ref('');
const feedbackOpen = ref(false);
const feedbackReason = ref<ReportFeedbackReason>('unclear_explanation');
const feedbackNote = ref('');
const rawTextOpen = ref(false);

const feedbackOptions: Array<{ value: ReportFeedbackReason; label: string; detail: string }> = [
  { value: 'unclear_explanation', label: '结论不清楚', detail: '不知道最后该不该买。' },
  { value: 'missing_text', label: '理由缺失', detail: '风险、适合人群或替代建议不够。' },
  { value: 'ocr_wrong', label: '结果不准', detail: '与包装实际内容不一致。' },
  { value: 'other', label: '其他问题', detail: '还有别的问题。' }
];

const purchaseDecision = computed<PurchaseDecision | undefined>(() => {
  if (!report.value) return undefined;
  return buildPurchaseDecision(report.value, attentionSettings.value);
});

const productTitle = computed(() => {
  const name = report.value?.productName || report.value?.foodAnalysis?.productName || report.value?.title || '';
  return name && !isGenericProductName(name) ? name : '这款食品';
});

const purchaseTone = computed<PurchaseTone>(() => {
  const recommendation = purchaseDecision.value?.recommendation;
  if (recommendation === '推荐') return 'recommend';
  if (recommendation === '谨慎') return 'caution';
  if (recommendation === '不建议') return 'avoid';
  return 'unknown';
});
const isInformationInsufficient = computed(() => purchaseDecision.value?.recommendation === '信息不足');

const conclusionLine = computed(() => {
  const recommendation = purchaseDecision.value?.recommendation || '信息不足';
  if (configuredAllergenRisk.value) return `命中${configuredAllergenTerms.value || '过敏/忌口项'}，不要购买。`;
  if (recommendation === '推荐' && hasAllergenSignal.value) return '普通人可按份量选择；如你或家人过敏，先设忌口重算。';
  if (recommendation === '推荐') return '适合按正常份量选择。';
  if (recommendation === '谨慎' && hasAllergenSignal.value) return '含常见过敏原；如你或家人过敏，先设忌口重算。';
  if (recommendation === '谨慎') return '可以考虑，但先看下面风险。';
  if (recommendation === '不建议') return '建议换一款更稳妥的同类产品。';
  return '先按下一步补拍缺失标签，再做购买判断。';
});

const sourceStatusText = computed(() => {
  const source = report.value?.analysisSource;
  const warning = source?.qualityWarnings?.find((item) => isInformationInsufficient.value || !/补拍|信息不足|缺少|未识别|不够清楚/.test(item));
  if (warning) return publicSourceDetail(warning);
  if (source?.sourceType === 'product_identity' && isInformationInsufficient.value) return '缺少配料表或营养成分表，本次只保留商品身份线索。';
  if (source?.usedAiSearch || source?.sourceType === 'ai_search_product_label') return '包含公开资料线索，请以包装实拍文字为准。';
  if (purchaseDecision.value?.recommendation === '信息不足') return '需要补拍包装标签后再给购买建议。';
  return '';
});

const decisionVisual = computed(() => {
  if (purchaseTone.value === 'recommend') return { glyph: 'OK', action: '适合', label: '购买分' };
  if (purchaseTone.value === 'caution') return { glyph: '!', action: '先看风险', label: '谨慎分' };
  if (purchaseTone.value === 'avoid') return { glyph: 'NO', action: '换一款', label: '避坑分' };
  return { glyph: '?', action: '补拍', label: '信息分' };
});
const conclusionKicker = computed(() => isInformationInsufficient.value ? '补拍后判断' : '该不该买');

const scorePercent = computed(() => {
  const score = Number(purchaseDecision.value?.score || 0);
  return Math.max(0, Math.min(100, score));
});

const scoreStyle = computed(() => ({ width: `${scorePercent.value}%` }));
const insufficientPanelText = computed(() => buildInsufficientPanelText(report.value, attentionSettings.value));
const insufficientChecklistRows = computed(() => buildInsufficientChecklistRows(report.value, attentionSettings.value));
const primaryRecoveryTarget = computed<RetakeTarget>(() => resolvePrimaryRecoveryTarget(report.value, attentionSettings.value));
const primaryRecoveryLabel = computed(() => retakeTargetLabel(primaryRecoveryTarget.value));
const primaryRecoveryDescription = computed(() => recoveryDescriptionForTarget(primaryRecoveryTarget.value));

const riskReasons = computed(() => normalizeDecisionList(purchaseDecision.value?.riskReasons, ['信息不足，需要补拍或补充标签文字'])
  .map(sanitizeUserFacingRisk)
  .filter(uniqueValue)
  .slice(0, 3));
const configuredAllergenRisk = computed(() => riskReasons.value.find(isConfiguredAllergenRiskText) || '');
const configuredAllergenTerms = computed(() => configuredAllergenRisk.value
  .replace(/^已命中你设置的过敏原\/忌口项[：:]/u, '')
  .replace(/^已命中你设置的过敏\/忌口关注词[：:]/u, '')
  .replace(/^命中你的过敏\/忌口项[：:]/u, '')
  .replace(/^含有你关注的过敏原[：:]/u, '')
  .replace(/。来源.*$/u, '')
  .replace(/。按.*$/u, '')
  .trim());
const hasAllergenSignal = computed(() => riskReasons.value.some((item) => /过敏|致敏|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜/.test(item))
  || unsuitableFor.value.some((item) => /过敏|忌口|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜/.test(item)));
const generalAllergenRisk = computed(() => riskReasons.value.find((item) => /常见过敏原提醒|包装文字出现常见过敏原|致敏/.test(item) && !isConfiguredAllergenRiskText(item)) || '');
const generalAllergenTerms = computed(() => extractAllergenTerms(generalAllergenRisk.value));
const generalAllergenKeys = computed(() => matchedAllergenKeysForCurrentReport());
const suitableFor = computed(() => {
  if (configuredAllergenRisk.value || generalAllergenRisk.value) return [];
  return normalizeDecisionList(purchaseDecision.value?.suitableFor, ['普通成年人按份量选择']).slice(0, 3);
});
const unsuitableFor = computed(() => {
  const base = normalizeDecisionList(purchaseDecision.value?.unsuitableFor, ['对特定成分敏感的人']);
  const allergenLabel = generalAllergenTerms.value ? `对${generalAllergenTerms.value}过敏或严格忌口的人` : '';
  return [
    allergenLabel,
    ...base
  ].filter(Boolean).filter(uniqueValue).slice(0, configuredAllergenRisk.value || generalAllergenRisk.value ? 4 : 3);
});
const alternatives = computed(() => normalizeDecisionList(purchaseDecision.value?.alternatives, ['同类产品中优先选择配料更短、糖钠脂更低的一款。']).slice(0, 3));
const riskRows = computed(() => riskReasons.value.map((item, index) => ({
  id: `${index}-${item}`,
  tag: riskTagFor(item),
  text: item,
  tone: riskToneFor(item),
  dots: buildRiskDots(riskStrengthFor(item)),
  sourceBadge: sourceBadgeForRisk(item),
  sourceNote: sourceNoteForRisk(item)
})));
const nutritionSignals = computed(() => prioritizeNutritionSignals(report.value?.nutritionSnapshot || [])
  .filter((item) => item.level !== '未识别')
  .slice(0, 3)
  .map((item) => ({
    id: item.key,
    label: item.label,
    value: formatNutritionSignalValue(item.valueText),
    level: item.level,
    tone: dataToneFor(item.level),
    style: { width: `${Math.max(8, Math.min(100, item.percent))}%` }
  })));
const audienceChips = computed(() => [
  ...suitableFor.value.slice(0, 2).map((item) => ({ id: `yes-${item}`, label: '适合', text: item, tone: 'recommend' as VisualTone })),
  ...unsuitableFor.value.slice(0, 2).map((item) => ({ id: `no-${item}`, label: '不适合', text: item, tone: 'caution' as VisualTone }))
]);
const priorityFacts = computed(() => buildPriorityFacts(report.value, riskReasons.value).slice(0, 4));
const allergenSafetyText = computed(() => {
  if (!configuredAllergenRisk.value || isInformationInsufficient.value) return '';
  return `已命中过敏/忌口${configuredAllergenTerms.value ? `：${configuredAllergenTerms.value}` : ''}。不建议食用，请换包装未标示该过敏原的同类产品。`;
});
const generalAllergenAlertText = computed(() => {
  if (!generalAllergenRisk.value || configuredAllergenRisk.value || isInformationInsufficient.value) return '';
  const terms = generalAllergenTerms.value || '常见过敏原';
  return `包装文字含${terms}。如你或家人对它过敏，请先设为忌口并重算；未过敏则继续看糖、钠和添加剂。`;
});
const alternativeRows = computed<AlternativeRow[]>(() => buildAlternativeRows(report.value, alternatives.value, riskReasons.value).slice(0, 3));
const valueProofRows = computed<ValueProofRow[]>(() => {
  if (isInformationInsufficient.value) {
    return [
      { id: 'no-guess', label: '不硬判', text: '缺配料表或营养表时先提示补拍，不把包装正面当购买结论。' },
      { id: 'next-step', label: '下一步', text: primaryRecoveryDescription.value },
      { id: 'source', label: '可核对', text: '只保留本次识别到的线索，避免把公开资料当包装实拍。' }
    ];
  }
  const rows: ValueProofRow[] = [
    { id: 'package-source', label: '包装实拍', text: '结论绑定本次标签文字、配料表、营养表和致敏提示。' },
    { id: 'profile-recalc', label: '按关注项', text: `${profileContextText.value}，风险按当前画像重排。` },
    { id: 'compare-ready', label: '同类对比', text: hasComparisonCandidate.value ? '已有同类报告，可直接查看两款差异。' : '继续拍第二款，会比较糖、钠、过敏原和添加剂。' }
  ];
  if (configuredAllergenRisk.value) {
    rows[1] = { id: 'allergen-stop', label: '过敏优先', text: `已命中${configuredAllergenTerms.value || '当前忌口'}，不会用糖钠差异抵消过敏风险。` };
  }
  return rows;
});
const evidenceRows = computed(() => buildEvidenceRows(report.value?.sources || []));
const evidenceSummaryChips = computed(() => buildEvidenceSummaryChips(report.value));
const fullOcrText = computed(() => isInformationInsufficient.value ? buildInsufficientEvidenceText(report.value) : buildFullOcrText(report.value));
const fullOcrPreview = computed(() => fullOcrText.value
  ? extractOcrTextSnippet(fullOcrText.value, riskReasons.value.flatMap((item) => buildRiskEvidenceTerms(item, report.value)), 120)
  : '未保留完整标签文字。');
const textEvidenceRows = computed(() => isInformationInsufficient.value ? buildInsufficientTextEvidenceRows(report.value) : buildTextEvidenceRows(report.value));
const riskEvidenceRows = computed(() => buildRiskEvidenceRows(report.value, riskReasons.value));
const evidenceChainStatus = computed(() => isInformationInsufficient.value ? '需补拍' : fullOcrText.value ? '文本可核对' : '缺少文本');
const evidenceSummaryLine = computed(() => evidenceSummaryChips.value
  .map((item) => `${item.label}：${item.text}`)
  .join(' · '));
const decisionProofRows = computed<DecisionProofRow[]>(() => {
  const rows: Array<DecisionProofRow & { group: string }> = riskRows.value.map((item, index) => {
    const evidence = riskEvidenceRows.value[index];
    return {
      id: `risk-${item.id}`,
      label: item.tag,
      text: formatProofRiskText(item.text),
      source: evidence?.found ? evidence.source : item.sourceBadge,
      snippet: compactProofText(evidence?.snippet || item.sourceNote || '', 92),
      tone: item.tone,
      found: Boolean(evidence?.found),
      group: proofGroupForText(item.text)
    };
  });

  priorityFacts.value.forEach((item) => {
    if (rows.length >= 3) return;
    rows.push({
      id: `fact-${item.label}-${item.value}`,
      label: item.label,
      text: item.value,
      source: item.label === '过敏原' ? '配料/致敏提示' : '营养成分表',
      snippet: '',
      tone: item.tone,
      found: true,
      group: `fact-${item.label}`
    });
  });

  const seenGroups = new Set<string>();
  return rows
    .filter((item) => item.text)
    .filter((item) => {
      if (seenGroups.has(item.group)) return false;
      seenGroups.add(item.group);
      return true;
    })
    .filter((item, index, values) => values.findIndex((candidate) => `${candidate.label}:${candidate.text}` === `${item.label}:${item.text}`) === index)
    .slice(0, 3)
    .map(({ group: _group, ...item }) => item);
});
const packageImagePath = computed(() => report.value?.analysisSource?.imagePath || '');
const packageEvidenceCaption = computed(() => {
  if (packageImagePath.value) return '本次拍摄图片';
  if (report.value?.analysisSource?.fromManualInput) return '手动标签文字';
  if (report.value?.analysisSource?.usedAiSearch || report.value?.analysisSource?.sourceType === 'ai_search_product_label') return '公开资料线索';
  return '本次标签文字';
});
const packageEvidenceBadges = computed(() => buildPackageEvidenceBadges(report.value));

const sharePoints = computed(() => riskReasons.value.map((item) => `风险：${item}`).slice(0, 3));
const comparisonCandidate = computed(() => report.value
  ? getReports().find((item) => item.id !== report.value?.id
    && buildPurchaseDecision(item, attentionSettings.value).recommendation !== '信息不足'
    && comparableProductName(item)
    && !isSameProductForCompare(report.value, item))
  : undefined);
const hasComparisonCandidate = computed(() => !isInformationInsufficient.value && Boolean(comparisonCandidate.value));
const compareActionLabel = computed(() => isInformationInsufficient.value ? '补拍标签' : '拍第二款对比');
const historyCompareActionLabel = computed(() => {
  const name = comparisonCandidate.value ? reportDisplayName(comparisonCandidate.value) : '';
  const compact = name.length > 8 ? `${name.slice(0, 8)}...` : name;
  return compact ? `对比${compact}` : '从历史对比';
});
const savedListActionLabel = computed(() => report.value?.isAvoided ? '查看避雷' : '查看已保存');
const hasSavedOrAvoided = computed(() => Boolean(report.value?.isFavorite || report.value?.isAvoided));
const saveReportActionLabel = computed(() => purchaseTone.value === 'avoid' || configuredAllergenRisk.value ? '加入避雷' : '保存报告');
const favoriteActionLabel = computed(() => {
  if (isInformationInsufficient.value) return '暂不保存';
  if (report.value?.isFavorite) return '已保存 · 撤销';
  if (report.value?.isAvoided) return '改为保存（移出避雷）';
  return '保存报告';
});
const avoidActionLabel = computed(() => {
  if (report.value?.isAvoided) return '已避雷 · 撤销';
  if (report.value?.isFavorite) return '改为避雷（移出保存）';
  return '加入避雷';
});
const retentionState = computed(() => {
  if (isInformationInsufficient.value) {
    return {
      tone: 'unknown' as VisualTone,
      label: '暂不保存',
      detail: '信息不足的报告不保存或加入避雷，避免以后误用旧判断。',
      hint: '补拍后再保存'
    };
  }
  if (report.value?.isFavorite) {
    return {
      tone: 'recommend' as VisualTone,
      label: '已保存',
      detail: '已放入普通保存；改为避雷会自动移出保存列表。',
      hint: '保存中'
    };
  }
  if (report.value?.isAvoided) {
    return {
      tone: 'avoid' as VisualTone,
      label: '已避雷',
      detail: '已放入不买清单；改为保存会自动移出避雷列表。',
      hint: '避雷中'
    };
  }
  return {
    tone: 'neutral' as VisualTone,
    label: '未保存',
    detail: '保存用于复查；避雷用于不想再买，二者互斥不重复计数。',
    hint: '二选一'
  };
});
const profileContextText = computed(() => {
  const allergenLabels = profileAllergenLabels();
  const goals = [
    allergenLabels.length ? `忌口${allergenLabels.join('、')}` : '',
    attentionSettings.value.isChildrenMode || attentionSettings.value.targetGoals.includes('children') ? '儿童' : '',
    attentionSettings.value.primaryGoal === 'sugar' || attentionSettings.value.targetGoals.includes('sugar') ? '控糖' : '',
    attentionSettings.value.primaryGoal === 'fatLoss' || attentionSettings.value.targetGoals.includes('fatLoss') ? '减脂' : '',
    attentionSettings.value.primaryGoal === 'lowSodium' || attentionSettings.value.targetGoals.includes('lowSodium') ? '低钠' : ''
  ].filter(Boolean);
  return `按${goals.length ? goals.join(' / ') : '默认关注'}判断`;
});
const nutritionBasisText = computed(() => resolveNutritionBasis(report.value));
const recoveryActionLabel = computed(() => isInformationInsufficient.value ? primaryRecoveryLabel.value : compareActionLabel.value);
const evidenceRetakeActionLabel = computed(() => isInformationInsufficient.value ? '按缺失项补拍' : '重新拍照重算');
const evidenceCorrectionRetakeLabel = computed(() => isInformationInsufficient.value ? '重新拍标签' : '重新拍照');
const evidenceCorrectionText = computed(() => isInformationInsufficient.value
  ? '补拍或手动修改标签文字后，可以重新生成报告。'
  : '如果标签文字和实物不一致，可以重新拍摄或手动修改后重算。');
const taskClosureRows = computed<TaskClosureRow[]>(() => {
  if (isInformationInsufficient.value) {
    return [
      { id: 'retake', label: '补拍标签', text: '先补齐配料表、营养成分表或致敏提示，再生成购买判断。', action: 'retake', tone: 'caution' },
      { id: 'manual', label: '手动补充', text: '包装文字能看清但 OCR 不完整时，直接粘贴或输入标签文字。', action: 'manual', tone: 'neutral' },
      { id: 'value', label: '为什么不硬判', text: '成分镜会把缺失字段挡住，不用聊天式猜测替你下结论。', action: 'value', tone: 'unknown' }
    ];
  }
  if (configuredAllergenRisk.value) {
    return [
      { id: 'save', label: report.value?.isAvoided ? '查看避雷' : '加入避雷', text: `命中${configuredAllergenTerms.value || '当前忌口'}，保存为下次不买的依据。`, action: 'save', tone: 'avoid' },
      { id: 'compare', label: '换一款对比', text: '继续拍无对应致敏提示的同类产品，过敏命中会优先于糖钠优势。', action: 'compare', tone: 'neutral' },
      { id: 'profile', label: '调整忌口', text: '如果过敏项不对，先修改忌口后重算这份报告。', action: 'profile', tone: 'neutral' },
      { id: 'value', label: '为什么不直接问 AI', text: '这里把忌口、包装原文和对比规则固定下来，不让低糖优势抵消过敏风险。', action: 'value', tone: 'caution' }
    ];
  }
  if (generalAllergenRisk.value && !attentionSettings.value.allergens.length) {
    return [
      { id: 'allergen', label: `一键设为忌口`, text: `如果你或家人对${generalAllergenTerms.value || '这些成分'}过敏，点一下重算；命中后直接变成不建议。`, action: 'allergen', tone: 'caution' },
      { id: 'compare', label: '拍第二款对比', text: '同类商品会直接进入 A/B，对糖、碳水、钠、过敏原和添加剂给出差异。', action: 'compare', tone: 'recommend' },
      { id: 'save', label: '保存记录', text: report.value?.isAvoided ? '已在避雷中，可回首页复查不想再买的原因。' : '保存或避雷后，回首页已保存列表复查。', action: 'save', tone: 'neutral' },
      { id: 'value', label: '比直接问 AI 省事', text: '这里固定展示包装实拍证据、规则阈值、画像理由和同类比较，不需要反复追问。', action: 'value', tone: 'caution' }
    ];
  }
  return [
    { id: 'compare', label: '拍第二款对比', text: '同类商品会直接进入 A/B，对糖、碳水、钠、过敏原和添加剂给出差异。', action: 'compare', tone: 'recommend' },
    { id: 'profile', label: '切换画像重算', text: `${profileContextText.value}；控糖、儿童或忌口会改变排序和提醒优先级。`, action: 'profile', tone: 'neutral' },
    { id: 'save', label: '保存记录', text: report.value?.isAvoided ? '已在避雷中，可回首页复查不想再买的原因。' : '保存或避雷后，回首页已保存列表复查。', action: 'save', tone: 'neutral' },
    { id: 'value', label: '比直接问 AI 省事', text: '这里固定展示包装实拍证据、规则阈值、画像理由和同类比较，不需要反复追问。', action: 'value', tone: 'caution' }
  ];
});
const topTaskActions = computed(() => taskClosureRows.value.slice(0, 2));

onLoad((query) => {
  enableWeixinShareMenu();
  attentionSettings.value = getAttentionSettings();
  rawTextOpen.value = false;
  const id = String(query?.id || '');
  report.value = id ? getReportById(id) : undefined;
  if (query?.profileUpdated && report.value) {
    message.value = '已按新画像重算这份报告。';
  }
});

onShareAppMessage(() => buildReportShareMessage(report.value));

function normalizeDecisionList(value: string[] | undefined, fallback: string[]): string[] {
  const items = (value || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter(uniqueValue);
  return items.length ? items : fallback;
}

function uniqueValue(value: string, index: number, values: string[]): boolean {
  return values.indexOf(value) === index;
}

function sanitizeUserFacingRisk(value: string): string {
  const text = normalizeOcrEvidenceText(value).replace(/\s+/g, ' ').trim();
  if (/AI|公开标签|联网|未完整|未获取/.test(text)) return '公开资料没有补全配料表或营养表，仍需拍包装标签确认。';
  if (/接口|降级|数据源|后端|不可用/.test(text)) return '成分库暂未补全，本次只按包装文字和本地规则判断。';
  if (/没有识别到可用于查看的包装文字/.test(text)) return '没有看到配料表或营养成分表。';
  if (/包装文字出现常见过敏原/.test(text)) {
    return text
      .replace(/^包装文字出现常见过敏原：/u, '常见过敏原提醒：')
      .replace(/。默认按谨慎提醒.*$/u, '。仅对相关过敏或严格忌口者作为重点。');
  }
  return text;
}

function isConfiguredAllergenRiskText(value: string): boolean {
  return /已命中你设置的过敏|含有你关注的过敏原|你关注的.*(?:过敏|忌口).*词/.test(value);
}

function extractAllergenTerms(value: string): string {
  return normalizeOcrEvidenceText(value)
    .replace(/^.*?(?:常见过敏原提醒|包装文字出现常见过敏原|常见过敏原|过敏原\/忌口项|过敏\/忌口关注词|过敏原|忌口项)[：:]?/u, '')
    .replace(/。.*$/u, '')
    .replace(/来源.*$/u, '')
    .replace(/^[：:，,\s/]+/u, '')
    .trim();
}

function matchedAllergenKeysForCurrentReport(): string[] {
  const current = report.value;
  const text = [
    generalAllergenRisk.value,
    current?.analysisSource?.ingredientText,
    current?.analysisSource?.allergenText,
    current?.analysisSource?.ocrText,
    current?.rawText,
    ...(current?.ingredientSection.items || []).map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' ');
  return allergenOptions
    .filter((option) => option.keywords.some((keyword) => containsAllergenTerm(text, keyword)))
    .map((option) => option.key)
    .slice(0, 3);
}

function containsAllergenTerm(text: string, keyword: string): boolean {
  const normalizedText = normalizeOcrEvidenceText(text).toLowerCase();
  const normalizedKeyword = normalizeOcrEvidenceText(keyword).toLowerCase();
  if (!normalizedText || !normalizedKeyword) return false;
  return normalizedText.includes(normalizedKeyword);
}

function profileAllergenLabels(): string[] {
  return allergenOptions
    .filter((option) => attentionSettings.value.allergens.includes(option.key))
    .map((option) => option.label)
    .slice(0, 3);
}

function riskTagFor(value: string): string {
  if (/接口|降级|数据源|AI|公开资料|成分库/.test(value)) return '来源';
  if (/常见过敏原提醒|包装文字出现常见过敏原/.test(value)) return '提醒';
  if (/过敏|忌口|乳糖|乳/.test(value)) return '忌口';
  if (/糖|碳水/.test(value)) return '糖';
  if (/脂肪|热量|油/.test(value)) return '脂';
  if (/钠|盐/.test(value)) return '钠';
  if (/甜味剂/.test(value)) return '甜味剂';
  if (/儿童|咖啡因|色素/.test(value)) return '儿童';
  if (/信息|补拍/.test(value)) return '补拍';
  return '风险';
}

function riskToneFor(value: string): VisualTone {
  if (/常见过敏原提醒|包装文字出现常见过敏原/.test(value)) return 'caution';
  if (/过敏|忌口|乳糖|不建议/.test(value)) return 'avoid';
  if (/接口|降级|数据源|AI/.test(value)) return 'caution';
  if (/信息|补拍/.test(value)) return 'unknown';
  if (/糖|脂肪|热量|钠|盐|儿童|咖啡因|色素/.test(value)) return 'caution';
  return 'neutral';
}

function riskStrengthFor(value: string): number {
  if (/常见过敏原提醒|包装文字出现常见过敏原/.test(value)) return 2;
  if (/过敏|忌口|乳糖|不建议/.test(value)) return 3;
  if (/糖|脂肪|热量|钠|盐|儿童|咖啡因|色素/.test(value)) return 2;
  return 1;
}

function buildRiskDots(strength: number) {
  return [1, 2, 3].map((level) => ({
    level,
    active: level <= strength
  }));
}

function sourceNoteForRisk(value: string): string {
  const current = report.value;
  if (!current) return '';
  const ingredientText = compactEvidenceText(current.analysisSource?.ingredientText || current.rawText || '');
  const allergenText = compactEvidenceText(current.analysisSource?.allergenText || '');
  const nutritionText = compactEvidenceText(current.analysisSource?.nutritionText || '');
  if (/过敏|致敏|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜|忌口/.test(value)) {
    const source = allergenText || ingredientText;
    return source ? `包装原文：${source}` : '来源：包装配料或致敏原文字；请以实物标签确认。';
  }
  if (/糖|碳水|钠|盐|脂肪|热量|能量/.test(value)) {
    const source = nutritionText || ingredientText;
    return source ? `营养/配料原文：${source}` : `单位口径：${nutritionBasisText.value}；请以包装营养表确认。`;
  }
  if (/添加剂|甜味剂|色素|防腐剂/.test(value)) {
    const rule = '规则：配料表添加剂标注达到3个进入少添加提醒；5类或8种以上为重点提醒。';
    return ingredientText ? `配料原文：${ingredientText}。${rule}` : `来源：配料表词库匹配；${rule}`;
  }
  if (/信息不足|补拍|未识别|缺少|不够清楚|无法判断/.test(value)) {
    return isInformationInsufficient.value ? '下一步：补拍配料表、营养成分表或过敏原提示。' : '';
  }
  return '';
}

function sourceBadgeForRisk(value: string): string {
  if (/接口|降级|数据源|成分库/.test(value)) return '数据来源';
  if (/AI|公开资料/.test(value)) return '公开资料';
  if (/糖|碳水|钠|盐|脂肪|热量|能量/.test(value)) return '营养表';
  if (/过敏|致敏|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜|忌口/.test(value)) return report.value?.analysisSource?.allergenText ? '致敏提示' : '配料表';
  if (/添加剂|甜味剂|色素|防腐剂/.test(value)) return '配料表';
  if (/信息不足|补拍|未识别|缺少|不够清楚|无法判断/.test(value)) return '识别状态';
  return '本地规则';
}

function compactEvidenceText(value: string): string {
  return stripNonLabelEvidenceText(String(value || '')).replace(/\s+/g, ' ').trim().slice(0, 80);
}

function hasUsableLabelSectionText(value: string | undefined, section: 'ingredient' | 'nutrition'): boolean {
  const text = normalizeOcrEvidenceText(value || '').replace(/\s+/g, '');
  if (!text) return false;
  const label = section === 'ingredient' ? '配料表' : '营养成分表';
  const negativePattern = new RegExp(`(?:没有|无|未展示|未提供|未拍到|未看到|未获取|未识别到|缺少|缺失)(?:完整)?(?:的)?${label}`, 'u');
  if (negativePattern.test(text)) return false;
  if (/纯色包装正面|只有包装正面|未展示配料表或营养成分表/.test(text)) return false;
  return true;
}

function compactProofText(value: string, maxLength = 80): string {
  const text = stripNonLabelEvidenceText(normalizeOcrEvidenceText(value)).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatProofRiskText(value: string): string {
  const original = normalizeOcrEvidenceText(value).replace(/\s+/g, ' ').trim();
  if (isConfiguredAllergenRiskText(original)) {
    const terms = original
      .replace(/^.*?(?:过敏原\/忌口项|过敏\/忌口关注词|过敏原|忌口项)[：:]?/u, '')
      .replace(/。.*$/u, '')
      .replace(/来源.*$/u, '')
      .replace(/^[：:，,\s/]+/u, '')
      .trim();
    return terms ? `命中你的过敏/忌口项：${terms}` : '命中你的过敏/忌口项';
  }
  if (/常见过敏原提醒|包装文字出现常见过敏原/.test(original)) {
    const terms = original
      .replace(/^.*?(?:常见过敏原提醒|常见过敏原)[：:]?/u, '')
      .replace(/。.*$/u, '')
      .replace(/^[：:，,\s/]+/u, '')
      .trim();
    return terms ? `常见过敏原：${terms}` : '常见过敏原提醒';
  }
  if (/糖|碳水/.test(original)) {
    const valueText = original.match(/(?:糖|碳水化合物)[^0-9]*([0-9.]+\s*g)/u)?.[1] || '';
    const threshold = original.match(/阈值\s*([0-9.]+\s*g)/u)?.[1] || '';
    if (valueText && threshold) return `糖/碳水 ${valueText}，高于提醒阈值 ${threshold}`;
  }
  if (/钠|盐/.test(original)) {
    const valueText = original.match(/(?:钠|盐)[^0-9]*([0-9.]+\s*mg)/u)?.[1] || '';
    if (valueText) return `钠 ${valueText}，需要看一份吃多少`;
  }
  if (/添加剂/.test(original)) {
    const count = original.match(/([0-9]+)\s*(?:个|种)/u)?.[1] || '';
    if (count) return `添加剂 ${count} 个；3个及以上进入少添加提醒`;
    return '添加剂已按配料表和本地阈值整理';
  }
  return compactProofText(
    original
      .replace(/来源[：:].*?(。|；|;|$)/gu, '')
      .replace(/按保守规则不建议食用，?除非包装明确排除对应致敏风险。?/gu, '')
      .replace(/控糖或减脂时要看一份吃多少。?/gu, '')
      .trim(),
    64
  );
}

function proofGroupForText(value: string): string {
  if (/过敏|致敏|牛奶|牛乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜|忌口/.test(value)) return 'allergen';
  if (/糖|碳水/.test(value)) return 'sugar';
  if (/钠|盐/.test(value)) return 'sodium';
  if (/脂肪|热量|能量|反式/.test(value)) return 'fat';
  if (/添加剂|甜味剂|色素|防腐剂/.test(value)) return 'additive';
  if (/信息|补拍|未识别|缺少|不够清楚|无法判断/.test(value)) return 'information';
  return value.slice(0, 18);
}

function resolveNutritionBasis(value: LabelReport | undefined): string {
  const field = value?.nutritionSection.fields.find((item) => item.key === 'perUnit' || item.key === 'servingSize');
  const text = `${field?.sourceText || ''} ${field?.value || ''} ${value?.analysisSource?.nutritionText || ''}`;
  if (/每\s*100\s*(?:ml|毫升)|per\s*100\s*ml/i.test(text)) return '每100ml';
  if (/每\s*100\s*(?:g|克)|per\s*100\s*g/i.test(text)) return '每100g';
  if (/每份|份量|per\s*serving/i.test(text)) return '每份';
  return '单位口径未识别';
}

function formatNutritionSignalValue(value: string): string {
  const basis = nutritionBasisText.value;
  if (!value || basis === '单位口径未识别' || value.includes('/')) return value;
  return `${value}/${basis}`;
}

function dataToneFor(level: string): VisualTone {
  if (level === '较高') return 'caution';
  if (level === '较低') return 'recommend';
  return 'neutral';
}

function alternativeTagFor(value: string): string {
  if (/补拍|配料表|营养/.test(value)) return '拍清';
  if (/无乳糖|植物基/.test(value)) return '替换';
  if (/糖|钠|脂肪|能量/.test(value)) return '低负担';
  if (/儿童/.test(value)) return '少添加';
  return '同类替代';
}

function buildEvidenceRows(sources: ReportSource[]) {
  const seen = new Set<string>();
  return sources
    .filter((source) => !/^Top risk \d+ source line$/u.test(source.label))
    .filter((source) => !/Crop placeholder|Source line/u.test(source.detail))
    .map((source) => ({
      id: `${source.sourceType}-${source.label}`,
      label: publicSourceLabel(source.label),
      detail: publicSourceDetail(source.detail),
      tone: sourceToneFor(source.sourceType)
    }))
    .filter((source) => {
      const key = `${source.label}:${source.detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function publicSourceLabel(value: string): string {
  return value
    .replace(/包装 OCR 识别文本|OCR 识别文本/gu, '包装实拍标签')
    .replace(/完整 OCR \/ 标签文本/gu, '完整标签文字')
    .replace(/完整手动标签文本/gu, '手动标签文字')
    .replace(/AI 公开标签线索|AI公开线索/gu, '公开资料线索')
    .replace(/后端暂不可用（降级）/gu, '成分库暂未补全');
}

function publicSourceDetail(value: string): string {
  const photoLabelPattern = new RegExp('结果基于本次拍照识别出的食品标签文字生成，OCR\\s*' + '识别' + '文字不是权威来源，请结合包装文字确认。', 'gu');
  return value
    .replace(photoLabelPattern, '结果基于本次拍到的包装标签文字生成，请结合实物包装核对。')
    .replace(/结果基于用户手动输入或粘贴的食品标签文字生成，未替代包装原文。/gu, '结果基于手动补充的标签文字，请结合实物包装核对。')
    .replace(/AI 公开标签线索未完整返回/gu, '公开资料没有补全标签')
    .replace(/AI 未获取到完整标签信息/gu, '公开资料没有补全标签')
    .replace(/请补拍配料表\s*\/\s*营养表或手动补充。/gu, '请按下一步补拍缺失标签或手动补充。')
    .replace(/成分库接口暂不可用|接口暂不可用|匹配服务不可用/gu, '成分库暂未补全')
    .replace(/本次配料匹配处于降级状态/gu, '本次只按包装文字和本地规则判断')
    .replace(/降级/gu, '需核对')
    .replace(/OCR\/标签文本|OCR \/ 标签文本/gu, '标签文字')
    .replace(/OCR/gu, '标签文字')
    .replace(new RegExp('识别' + '文字', 'gu'), '标签文字')
    .replace(/标签文字\s*标签文字不是权威来源/gu, '识别文本不是权威来源')
    .replace(/标签文字\s*标签文字/gu, '标签文字');
}

function buildPackageEvidenceBadges(value: LabelReport | undefined): PackageEvidenceBadge[] {
  if (!value) return [];
  const source = value.analysisSource;
  const hasIngredientText = hasUsableLabelSectionText(source?.ingredientText, 'ingredient');
  const hasNutritionText = hasUsableLabelSectionText(source?.nutritionText, 'nutrition');
  if (isInformationInsufficient.value) {
    const rows: PackageEvidenceBadge[] = [
      {
        id: 'ingredient',
        label: '配料',
        text: hasIngredientText ? '不完整' : '未读到',
        tone: 'unknown'
      },
      {
        id: 'nutrition',
        label: '营养',
        text: hasNutritionText ? '不完整' : '未读到',
        tone: 'unknown'
      }
    ];
    if (attentionSettings.value.allergens.length || source?.allergenText) {
      rows.push({
        id: 'allergen',
        label: '致敏',
        text: source?.allergenText ? '需核对' : '缺少',
        tone: 'unknown'
      });
    }
    const code = source?.normalizedCode || source?.recognition?.normalizedCode || '';
    if (code) rows.push({ id: 'code', label: '条码', text: code, tone: 'neutral' });
    return rows.slice(0, 4);
  }
  const rows: PackageEvidenceBadge[] = [
    {
      id: 'ingredient',
      label: '配料',
      text: hasIngredientText ? '已读取' : '缺少',
      tone: hasIngredientText ? 'recommend' : 'unknown'
    },
    {
      id: 'nutrition',
      label: '营养',
      text: hasNutritionText ? nutritionBasisText.value : '缺少',
      tone: hasNutritionText ? 'neutral' : 'unknown'
    }
  ];
  if (source?.allergenText || hasAllergenSignal.value) {
    rows.push({
      id: 'allergen',
      label: '致敏',
      text: source?.allergenText ? '有提示' : '配料命中',
      tone: 'caution'
    });
  }
  const code = source?.normalizedCode || source?.recognition?.normalizedCode || '';
  if (code) {
    rows.push({
      id: 'code',
      label: '条码',
      text: code,
      tone: 'neutral'
    });
  }
  return rows.slice(0, 4);
}

function buildInsufficientPanelText(value: LabelReport | undefined, attention: AttentionSettings): string {
  const missing = missingLabelSections(value, attention);
  const detected = detectedIdentityClues(value);
  const missingText = missing.length ? `缺少${missing.join('、')}` : '标签信息不完整';
  const detectedText = detected.length ? `，只识别到${detected.join('、')}` : '';
  return `${missingText}${detectedText}。请补拍清晰标签后再生成购买结论。`;
}

function resolvePrimaryRecoveryTarget(value: LabelReport | undefined, attention: AttentionSettings): RetakeTarget {
  const source = value?.analysisSource;
  if (!hasUsableLabelSectionText(source?.ingredientText, 'ingredient')) return 'ingredient';
  if (!hasUsableLabelSectionText(source?.nutritionText, 'nutrition')) return 'nutrition';
  if (attention.allergens.length && !source?.allergenText) return 'allergen';
  return 'ingredient';
}

function retakeTargetLabel(target: RetakeTarget): string {
  if (target === 'nutrition') return '补拍营养表';
  if (target === 'allergen') return '补拍致敏提示';
  return '补拍配料表';
}

function recoveryDescriptionForTarget(target: RetakeTarget): string {
  if (target === 'nutrition') return '下一步拍清营养成分表；如果配料表也没拍全，补拍时一起带上。';
  if (target === 'allergen') return '下一步只需要拍清“致敏原提示/含有”区域，补齐后按当前忌口重算。';
  return '下一步拍清完整配料表；如果营养成分表也缺失，下一张一起补齐。';
}

function missingLabelSections(value: LabelReport | undefined, attention: AttentionSettings): string[] {
  const source = value?.analysisSource;
  const missing = [
    hasUsableLabelSectionText(source?.ingredientText, 'ingredient') ? '' : '配料表',
    hasUsableLabelSectionText(source?.nutritionText, 'nutrition') ? '' : '营养成分表',
    attention.allergens.length && !source?.allergenText ? '致敏提示' : ''
  ].filter(Boolean);
  return missing.length ? missing : ['完整标签'];
}

function buildInsufficientChecklistRows(value: LabelReport | undefined, attention: AttentionSettings): MissingChecklistRow[] {
  const source = value?.analysisSource;
  const hasIngredientText = hasUsableLabelSectionText(source?.ingredientText, 'ingredient');
  const hasNutritionText = hasUsableLabelSectionText(source?.nutritionText, 'nutrition');
  const qualityText = [
    source?.confidence || '',
    ...(source?.qualityWarnings || [])
  ].join(' ');
  const lowQuality = !source || source.confidence === 'low' || /模糊|反光|倾斜|不清楚|无法识别|文字偏少|清晰/.test(qualityText);
  const hasBarcode = Boolean(source?.normalizedCode || source?.recognition?.normalizedCode);
  const needAllergen = attention.allergens.length > 0 || Boolean(source?.allergenText) || hasAllergenSignal.value;
  return [
    {
      id: 'ingredient',
      label: '配料表',
      status: hasIngredientText ? '已读到' : '未获得可用配料表',
      detail: hasIngredientText ? '已保留配料线索，仍需营养表一起判断。' : '拍包装背面的完整配料表，尽量包含从第一项到最后一项。',
      tone: hasIngredientText ? 'neutral' : 'unknown'
    },
    {
      id: 'nutrition',
      label: '营养成分表',
      status: hasNutritionText ? '已读到' : '未获得可用营养表',
      detail: hasNutritionText ? `已读到${nutritionBasisText.value}口径，仍需配料表一起判断。` : '拍营养成分表，尤其是能量、碳水、糖、钠和每100g/ml口径。',
      tone: hasNutritionText ? 'neutral' : 'unknown'
    },
    {
      id: 'allergen',
      label: '致敏提示',
      status: source?.allergenText ? '已读到' : needAllergen ? '建议补拍' : '可选',
      detail: source?.allergenText ? '已保留致敏提示。' : needAllergen ? '有过敏、儿童或严格忌口时，补拍“致敏原提示/含有”区域。' : '普通日常可先不拍；给儿童或过敏者建议补拍。',
      tone: source?.allergenText ? 'neutral' : needAllergen ? 'caution' : 'neutral'
    },
    {
      id: 'quality',
      label: '清晰度',
      status: lowQuality ? '需要重拍' : '基本可用',
      detail: lowQuality ? '让标签平放、避开反光，配料表和营养表各拍一张更稳。' : '文字清晰时再生成购买结论。',
      tone: lowQuality ? 'caution' : 'neutral'
    },
    {
      id: 'barcode',
      label: '条码',
      status: hasBarcode ? '已读到' : '只能辅助',
      detail: hasBarcode ? '条码可帮助识别商品身份，但不能替代配料表和营养表。' : '条码不是必须；它只能辅助找商品，不能单独生成购买建议。',
      tone: hasBarcode ? 'neutral' : 'unknown'
    }
  ];
}

function detectedIdentityClues(value: LabelReport | undefined): string[] {
  const source = value?.analysisSource;
  const name = value?.productName || value?.foodAnalysis?.productName || '';
  return [
    name && !isGenericProductName(name) ? '商品名' : '',
    source?.frontClaimsText ? '正面文案' : '',
    source?.normalizedCode || source?.recognition?.normalizedCode ? '条码' : ''
  ].filter(Boolean).slice(0, 3);
}

function buildInsufficientEvidenceText(value: LabelReport | undefined): string {
  if (!value) return '';
  const source = value.analysisSource;
  const name = value.productName || value.foodAnalysis?.productName || '';
  return uniqueEvidenceTexts([
    name && !isGenericProductName(name) ? `商品名：${name}` : '',
    source?.frontClaimsText ? `包装正面：${source.frontClaimsText}` : '',
    source?.normalizedCode || source?.recognition?.normalizedCode ? `条码：${source.normalizedCode || source.recognition?.normalizedCode}` : '',
    source?.qualityWarnings?.length ? `缺失说明：${source.qualityWarnings.join('；')}` : '缺失说明：未获得完整配料表、营养成分表或致敏提示。'
  ]).join('\n\n');
}

function buildInsufficientTextEvidenceRows(value: LabelReport | undefined): TextEvidenceRow[] {
  if (!value) return [];
  const source = value.analysisSource;
  return [
    { id: 'missing', label: '缺少内容', text: missingLabelSections(value, attentionSettings.value).join('、') },
    { id: 'detected', label: '已识别线索', text: detectedIdentityClues(value).join('、') || '未识别到可用于购买判断的标签线索' },
    { id: 'next', label: '下一步', text: primaryRecoveryDescription.value },
    { id: 'front', label: '包装正面', text: source?.frontClaimsText || '' },
    { id: 'code', label: '条码', text: source?.normalizedCode || source?.recognition?.normalizedCode || '' }
  ]
    .map((item) => ({ ...item, text: compactLongEvidenceText(item.text, 180) }))
    .filter((item) => item.text);
}

function buildEvidenceSummaryChips(value: LabelReport | undefined) {
  if (!value) return [];
  const source = value.analysisSource;
  const sourceLabel = source?.fromManualInput
    ? '手动输入'
    : source?.usedAiSearch || source?.sourceType === 'ai_search_product_label'
      ? '公开资料'
    : source?.sourceType === 'product_identity'
      ? '身份线索'
        : '包装实拍';
  const confidence = source?.confidence === 'high' ? '清晰'
    : source?.confidence === 'medium' ? '基本可用'
      : source?.confidence === 'low' ? '需核对'
        : '需核对';
  if (isInformationInsufficient.value) {
    return [
      { id: 'source', label: '来源', text: sourceLabel, tone: sourceLabel === '公开资料' || sourceLabel === '身份线索' ? 'caution' as VisualTone : 'neutral' as VisualTone },
      { id: 'missing', label: '缺少', text: missingLabelSections(value, attentionSettings.value).join('、'), tone: 'unknown' as VisualTone },
      { id: 'next', label: '下一步', text: primaryRecoveryLabel.value, tone: 'caution' as VisualTone }
    ];
  }
  const labelCoverage = [
    hasUsableLabelSectionText(source?.ingredientText, 'ingredient') ? '配料' : '',
    hasUsableLabelSectionText(source?.nutritionText, 'nutrition') ? '营养' : '',
    source?.allergenText ? '致敏' : ''
  ].filter(Boolean).join('、') || '缺标签';
  return [
    { id: 'source', label: '来源', text: sourceLabel, tone: sourceLabel === '公开资料' || sourceLabel === '身份线索' ? 'caution' as VisualTone : 'recommend' as VisualTone },
    { id: 'confidence', label: '置信度', text: confidence, tone: confidence === '需核对' ? 'caution' as VisualTone : 'neutral' as VisualTone },
    { id: 'coverage', label: '已用', text: labelCoverage, tone: labelCoverage === '缺标签' ? 'unknown' as VisualTone : 'neutral' as VisualTone },
    { id: 'basis', label: '口径', text: nutritionBasisText.value, tone: nutritionBasisText.value === '单位口径未识别' ? 'caution' as VisualTone : 'neutral' as VisualTone }
  ];
}

function buildFullOcrText(value: LabelReport | undefined): string {
  if (!value) return '';
  const source = value.analysisSource;
  return uniqueEvidenceTexts([
    source?.ocrText,
    value.rawText,
    source?.recognition?.ocrText,
    source?.ingredientText ? `配料表：${source.ingredientText}` : '',
    source?.nutritionText ? `营养成分表：${source.nutritionText}` : '',
    prefixedEvidenceText('致敏原提示', source?.allergenText),
    source?.frontClaimsText ? `包装声明：${source.frontClaimsText}` : '',
    source?.unconfirmedText?.length ? `需核对文字：${source.unconfirmedText.join('；')}` : ''
  ]).join('\n\n');
}

function buildTextEvidenceRows(value: LabelReport | undefined): TextEvidenceRow[] {
  if (!value) return [];
  const source = value.analysisSource;
  return [
    { id: 'ingredient', label: '配料表原文', text: source?.ingredientText || '' },
    { id: 'nutrition', label: '营养表原文', text: source?.nutritionText || '' },
    { id: 'allergen', label: '致敏提示原文', text: stripEvidencePrefix('致敏原提示', source?.allergenText || '') },
    { id: 'front', label: '包装声明原文', text: source?.frontClaimsText || '' },
    { id: 'unconfirmed', label: '需核对文字', text: source?.unconfirmedText?.join('；') || '' }
  ]
    .map((item) => ({
      ...item,
      text: compactLongEvidenceText(item.text, 180)
    }))
    .filter((item) => item.text);
}

function prefixedEvidenceText(label: string, value: unknown): string {
  const text = stripEvidencePrefix(label, value);
  return text ? `${label}：${text}` : '';
}

function stripEvidencePrefix(label: string, value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`^(?:${escaped}|致敏提示|过敏原提示|过敏提示)[：:\\s]+`, 'u'), '')
    .trim();
}

function buildRiskEvidenceRows(value: LabelReport | undefined, risks: string[]): RiskEvidenceRow[] {
  if (!value) return [];
  const fullText = isInformationInsufficient.value ? buildInsufficientEvidenceText(value) : buildFullOcrText(value);
  return risks.slice(0, 3).map((risk, index) => {
    const source = chooseRiskEvidenceSource(value, risk);
    const baseText = source.text || fullText;
    const terms = buildRiskEvidenceTerms(risk, value);
    const found = hasEvidenceTerm(baseText, terms);
    const snippet = baseText
      ? extractOcrTextSnippet(baseText, terms, 132)
      : '没有可核对的标签文字，需补拍或手动补充后重算。';
    return {
      id: `${index}-${risk}`,
      label: riskTagFor(risk),
      risk,
      source: source.label,
      snippet: found ? snippet : snippet || '未在标签文字中定位到对应原文。',
      tone: found ? riskToneFor(risk) : 'unknown',
      found
    };
  });
}

function chooseRiskEvidenceSource(value: LabelReport, risk: string): { label: string; text: string } {
  const source = value.analysisSource;
  if (isInformationInsufficient.value || /信息|补拍/.test(risk)) {
    return { label: '缺失说明', text: buildInsufficientEvidenceText(value) };
  }
  if (/过敏|致敏|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜|忌口/.test(risk)) {
    if (source?.allergenText) return { label: '致敏提示', text: source.allergenText };
    if (source?.ingredientText) return { label: '配料表', text: source.ingredientText };
  }
  if (/糖|碳水|钠|盐|脂肪|热量|能量|反式/.test(risk)) {
    if (source?.nutritionText) return { label: '营养成分表', text: source.nutritionText };
    if (source?.ingredientText) return { label: '配料表', text: source.ingredientText };
  }
  if (/添加剂|甜味剂|色素|防腐剂/.test(risk) && source?.ingredientText) {
    return { label: '配料表', text: source.ingredientText };
  }
  if (/接口|降级|数据源|AI/.test(risk)) {
    return {
      label: '识别/数据源说明',
      text: [
        source?.description,
        source?.aiNotice,
        ...(source?.qualityWarnings || [])
      ].filter(Boolean).join('；')
    };
  }
  return {
    label: source?.fromManualInput ? '手动标签文字' : '完整标签文字',
    text: source?.ocrText || source?.recognition?.ocrText || value.rawText
  };
}

function buildRiskEvidenceTerms(risk: string, value: LabelReport | undefined): string[] {
  const terms: string[] = [];
  risk
    .replace(/来源.*$/u, '')
    .split(/[，。；：:、\s/]+/u)
    .forEach((term) => appendEvidenceTerm(terms, term));
  if (/过敏|致敏|牛奶|牛乳|生牛乳|羊乳|乳制品|大豆|花生|坚果|麸质|鸡蛋|海鲜|忌口/.test(risk)) {
    ['致敏', '过敏', '牛奶', '牛乳', '生牛乳', '乳粉', '乳糖', '大豆', '花生', '坚果', '小麦', '麸质', '鸡蛋', '虾', '蟹', '鱼'].forEach((term) => appendEvidenceTerm(terms, term));
  }
  if (/糖|碳水/.test(risk)) {
    ['糖', '碳水', '白砂糖', '果葡糖浆', '葡萄糖', '麦芽糖', '蔗糖'].forEach((term) => appendEvidenceTerm(terms, term));
    addNutritionFieldTerms(terms, value, ['sugar', 'carbohydrate']);
  }
  if (/钠|盐/.test(risk)) {
    ['钠', '盐', '食盐', '氯化钠', '谷氨酸钠'].forEach((term) => appendEvidenceTerm(terms, term));
    addNutritionFieldTerms(terms, value, ['sodium']);
  }
  if (/脂肪|热量|能量|反式/.test(risk)) {
    ['脂肪', '反式脂肪', '能量', '热量', '植物油', '氢化'].forEach((term) => appendEvidenceTerm(terms, term));
    addNutritionFieldTerms(terms, value, ['fat', 'transFat', 'energy']);
  }
  if (/添加剂|甜味剂|色素|防腐剂/.test(risk)) {
    ['添加剂', '甜味剂', '色素', '防腐剂', '阿斯巴甜', '安赛蜜', '三氯蔗糖', '赤藓糖醇', '山梨酸', '苯甲酸'].forEach((term) => appendEvidenceTerm(terms, term));
  }
  return uniqueEvidenceTexts(terms);
}

function addNutritionFieldTerms(terms: string[], value: LabelReport | undefined, keys: string[]) {
  keys.forEach((key) => {
    const field = value?.nutritionSection.fields.find((item) => item.key === key);
    appendEvidenceTerm(terms, field?.label);
    appendEvidenceTerm(terms, field?.sourceText);
    appendEvidenceTerm(terms, field?.value);
    if (field?.value && field.unit) appendEvidenceTerm(terms, `${field.value}${field.unit}`);
  });
}

function appendEvidenceTerm(target: string[], value: unknown) {
  const text = normalizeOcrEvidenceText(value).replace(/\s+/g, ' ').trim();
  if (text.length >= 2 && text.length <= 36) target.push(text);
}

function hasEvidenceTerm(text: string, terms: string[]): boolean {
  const normalized = normalizeOcrEvidenceText(text).toLowerCase();
  return Boolean(normalized && terms.some((term) => normalized.includes(term.toLowerCase())));
}

function uniqueEvidenceTexts(values: Array<unknown>): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => normalizeOcrEvidenceText(value))
    .map(stripNonLabelEvidenceText)
    .filter(Boolean)
    .filter((value) => {
      const key = value.replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function stripNonLabelEvidenceText(value: string): string {
  return String(value || '')
    .replace(/此样本[^。；;\n]*[。；;]?/giu, '')
    .replace(/用于观察[^。；;\n]*[。；;]?/giu, '')
    .replace(/测试样本[^。；;\n]*[。；;]?/giu, '')
    .replace(/fixture[^。；;\n]*[。；;]?/giu, '')
    .replace(/sample-[^。；;\n\s]*[。；;]?/giu, '')
    .replace(/round-\d+[^。；;\n]*[。；;]?/giu, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/(?:此样本|测试样本|用于观察|失败恢复|fixture|sample-|round-\d+)/i.test(line))
    .join('\n')
    .trim();
}

function compactLongEvidenceText(value: string, maxLength: number): string {
  const text = stripNonLabelEvidenceText(normalizeOcrEvidenceText(value)).replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function buildPriorityFacts(value: LabelReport | undefined, risks: string[]) {
  if (!value) return [];
  const sourceText = [
    value.analysisSource?.ingredientText,
    value.analysisSource?.allergenText,
    ...value.ingredientSection.items.map((item) => `${item.normalizedText}${item.ingredientName || ''}`)
  ].join(' ');
  const facts = [
    allergenFact(value, risks, sourceText),
    nutritionFact(value, 'sugar', '糖'),
    nutritionFact(value, 'carbohydrate', '碳水'),
    nutritionFact(value, 'sodium', '钠'),
    /甜味剂|阿斯巴甜|安赛蜜|三氯蔗糖|赤藓糖醇|木糖醇|糖精钠|甜蜜素/.test(sourceText)
      ? { label: '甜味剂', value: matchedText(sourceText, ['阿斯巴甜', '安赛蜜', '三氯蔗糖', '赤藓糖醇', '木糖醇', '糖精钠', '甜蜜素', '甜味剂']), tone: 'caution' as VisualTone }
      : undefined,
    risks.some((item) => /含有你关注的过敏原/.test(item))
      ? { label: '过敏', value: risks.find((item) => /含有你关注的过敏原/.test(item))?.replace(/^含有你关注的过敏原：/, '').replace(/。来源.*$/u, '') || '命中关注项', tone: 'avoid' as VisualTone }
      : undefined
  ].filter((item): item is { label: string; value: string; tone: VisualTone } => Boolean(item));
  return uniqueFactRows(facts);
}

function allergenFact(value: LabelReport, risks: string[], sourceText: string) {
  const configured = risks.find((item) => /含有你关注的过敏原/.test(item));
  if (configured) {
    return {
      label: '过敏原',
      value: configured.replace(/^含有你关注的过敏原：/, '').replace(/。来源.*$/u, ''),
      tone: 'avoid' as VisualTone
    };
  }
  const labels = [
    /牛奶|牛乳|生牛乳|羊乳|乳粉|乳清|乳糖|奶油|乳制品/.test(sourceText) ? '牛奶/乳制品' : '',
    /大豆|黄豆|豆粉|豆乳/.test(sourceText) ? '大豆' : '',
    /花生/.test(sourceText) ? '花生' : '',
    /坚果|杏仁|核桃|腰果|榛子|开心果/.test(sourceText) ? '坚果' : '',
    /小麦|麸质|面粉/.test(sourceText) ? '麸质' : '',
    /鸡蛋|蛋黄|蛋清|蛋粉/.test(sourceText) ? '鸡蛋' : '',
    /虾|蟹|鱼|贝类/.test(sourceText) ? '海鲜' : ''
  ].filter(Boolean);
  if (!labels.length) return undefined;
  return { label: '过敏原', value: labels.slice(0, 3).join('、'), tone: 'caution' as VisualTone };
}

function nutritionFact(value: LabelReport, key: string, label: string) {
  const field = value.nutritionSection.fields.find((item) => item.key === key);
  if (!field?.value) return undefined;
  const unit = field.unit || (key === 'sodium' ? 'mg' : 'g');
  const text = `${field.value}${String(field.value).includes(String(unit)) ? '' : unit}`;
  const riskText = riskReasons.value.join(' ');
  const tone: VisualTone = riskText.includes(label) || (key === 'sodium' && /钠|盐/.test(riskText)) ? 'caution' : 'neutral';
  return { label, value: text, tone };
}

function matchedText(text: string, terms: string[]): string {
  return terms.filter((term) => text.includes(term)).slice(0, 2).join('、') || '已识别';
}

function uniqueFactRows(rows: Array<{ label: string; value: string; tone: VisualTone }>) {
  const seen = new Set<string>();
  return rows.filter((item) => {
    const key = `${item.label}:${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prioritizeNutritionSignals<T extends { key: string; label: string }>(items: T[]): T[] {
  const priority = nutritionPriorityKeys();
  return [...items].sort((left, right) => {
    const leftPriority = priority.indexOf(left.key);
    const rightPriority = priority.indexOf(right.key);
    const normalizedLeft = leftPriority >= 0 ? leftPriority : priority.length;
    const normalizedRight = rightPriority >= 0 ? rightPriority : priority.length;
    return normalizedLeft - normalizedRight;
  });
}

function nutritionPriorityKeys(): string[] {
  const goals = attentionSettings.value;
  if (goals.primaryGoal === 'sugar' || goals.targetGoals.includes('sugar')) return ['sugar', 'carbohydrate', 'sodium', 'energy', 'fat', 'transFat', 'protein'];
  if (goals.primaryGoal === 'lowSodium' || goals.targetGoals.includes('lowSodium')) return ['sodium', 'salt', 'sugar', 'carbohydrate', 'energy', 'fat', 'protein'];
  if (goals.primaryGoal === 'fatLoss' || goals.targetGoals.includes('fatLoss')) return ['energy', 'fat', 'transFat', 'sugar', 'carbohydrate', 'sodium', 'protein'];
  if (goals.isChildrenMode || goals.targetGoals.includes('children')) return ['sugar', 'sodium', 'carbohydrate', 'fat', 'energy', 'protein'];
  return ['sugar', 'sodium', 'fat', 'energy', 'carbohydrate', 'protein'];
}

function buildAlternativeRows(current: LabelReport | undefined, baseAlternatives: string[], risks: string[]): AlternativeRow[] {
  const rows = buildConcreteAlternativeRows(current);
  buildShelfActionRows(risks).forEach((item) => {
    if (!rows.some((row) => row.text === item.text)) rows.push(item);
  });
  const profileText = profileAlternativeText(risks);
  if (profileText) {
    rows.push({
      id: 'scan-next-profile',
      tag: '再拍一款',
      text: profileText
    });
  }
  baseAlternatives
    .map((item, index) => ({
      id: `rule-${index}-${item}`,
      tag: alternativeTagFor(item),
      text: simplifyAlternativeText(item)
    }))
    .forEach((item) => {
      if (!rows.some((row) => row.text === item.text)) rows.push(item);
    });
  return rows.length ? rows : [{
    id: 'default-next',
    tag: '同类替代',
    text: '再拍一款同类商品，优先比较糖、碳水、钠、过敏原和添加剂后再选。'
  }];
}

function buildShelfActionRows(risks: string[]): AlternativeRow[] {
  const text = risks.join(' ');
  const rows: AlternativeRow[] = [];
  if (configuredAllergenRisk.value) {
    rows.push({
      id: 'shelf-allergen',
      tag: '先排除',
      text: `货架上先找致敏提示和配料表都没有 ${configuredAllergenTerms.value || '当前忌口项'} 的同类；不确定就不要买。`
    });
  } else if (/常见过敏原|致敏|牛奶|大豆|花生|坚果|鸡蛋|麸质|海鲜/.test(text)) {
    rows.push({
      id: 'shelf-common-allergen',
      tag: '先确认',
      text: '如果你或家人过敏，先找无对应致敏提示的同类，再比较糖、钠和添加剂。'
    });
  }
  if (/糖|碳水|甜味剂/.test(text) || attentionSettings.value.primaryGoal === 'sugar' || attentionSettings.value.targetGoals.includes('sugar')) {
    rows.push({
      id: 'shelf-sugar',
      tag: '控糖筛选',
      text: '先找糖≤5g/100ml（固体≤8g/100g）、碳水≤8g/100ml，且白砂糖/糖浆不在配料前三位。'
    });
  }
  if (/儿童|色素|咖啡因|甜味剂/.test(text) || attentionSettings.value.isChildrenMode) {
    rows.push({
      id: 'shelf-children',
      tag: '儿童筛选',
      text: '给儿童高频吃，先排除咖啡因/酒精/多种色素和甜味剂，再看糖≤5g/100ml或≤8g/100g。'
    });
  }
  if (/钠|盐/.test(text) || attentionSettings.value.primaryGoal === 'lowSodium' || attentionSettings.value.targetGoals.includes('lowSodium')) {
    rows.push({
      id: 'shelf-sodium',
      tag: '低钠筛选',
      text: '优先找钠≤300mg/100g；儿童或控盐更严格时看≤120mg/100g，并让食盐/味精靠后。'
    });
  }
  if (!rows.length) {
    rows.push({
      id: 'shelf-default',
      tag: '货架筛选',
      text: '下一款先看配料更短、糖钠脂更低、添加剂更少；拍第二款后成分镜会直接 A/B 对齐。'
    });
  }
  return rows.slice(0, 2);
}

function buildConcreteAlternativeRows(current: LabelReport | undefined): AlternativeRow[] {
  if (!current || isInformationInsufficient.value) return [];
  const currentScore = purchaseDecision.value?.score || 0;
  return getReports()
    .filter((item) => item.id !== current.id && !item.isAvoided)
    .map((item) => ({ item, decision: buildPurchaseDecision(item, attentionSettings.value) }))
    .filter(({ decision }) => decision.recommendation !== '信息不足')
    .filter(({ decision }) => decision.recommendation === '推荐' || decision.score > currentScore)
    .sort((left, right) => right.decision.score - left.decision.score)
    .slice(0, 2)
    .map(({ item, decision }) => ({
      id: `candidate-${item.id}`,
      tag: '可复查',
      text: `${reportDisplayName(item)}：${decision.recommendation}${decision.score}分，${alternativeKeyFacts(item).join('、') || '可打开核对依据'}。`
    }));
}

function reportDisplayName(value: LabelReport): string {
  const name = value.productName || value.foodAnalysis?.productName || value.title || '';
  return name && !isGenericProductName(name) ? name : '历史商品';
}

function alternativeKeyFacts(value: LabelReport): string[] {
  return [
    fieldFact(value, 'sugar', '糖'),
    fieldFact(value, 'carbohydrate', '碳水'),
    fieldFact(value, 'sodium', '钠')
  ].filter(Boolean).slice(0, 2);
}

function fieldFact(value: LabelReport, key: string, label: string): string {
  const field = value.nutritionSection.fields.find((item) => item.key === key);
  if (!field?.value) return '';
  const unit = field.unit || (key === 'sodium' ? 'mg' : 'g');
  return `${label}${field.value}${String(field.value).includes(unit) ? '' : unit}`;
}

function profileAlternativeText(risks: string[]): string {
  const text = risks.join(' ');
  if (configuredAllergenRisk.value) return `拍第二款时保留忌口条件，命中 ${configuredAllergenTerms.value || '已设置忌口项'} 的商品会直接排除。`;
  if (/糖|碳水|甜味剂/.test(text) || attentionSettings.value.primaryGoal === 'sugar' || attentionSettings.value.targetGoals.includes('sugar')) return '拍第二款同类后，会直接比较糖、碳水、甜味剂和糖浆位置，给出更适合控糖的一款。';
  if (/钠|盐/.test(text) || attentionSettings.value.primaryGoal === 'lowSodium' || attentionSettings.value.targetGoals.includes('lowSodium')) return '拍第二款同类后，会直接比较钠、食盐/味精位置和购买分。';
  if (/儿童|色素|咖啡因|甜味剂/.test(text) || attentionSettings.value.isChildrenMode) return '拍第二款同类后，会优先比较糖、色素、甜味剂、咖啡因和添加剂数量。';
  return '再拍一款同类商品，成分镜会直接比较糖、钠、过敏原和添加剂差异。';
}

function simplifyAlternativeText(value: string): string {
  return value
    .replace(/同类产品中优先选择/u, '货架上优先选')
    .replace(/已整理同类商品可比较的/u, '对比时看')
    .trim();
}

function sourceToneFor(sourceType: ReportSource['sourceType']): VisualTone {
  if (sourceType === 'official_standard' || sourceType === 'safety_evaluation') return 'recommend';
  if (sourceType === 'recognition_insufficient') return 'unknown';
  if (sourceType === 'ai_search' || sourceType === 'mock_adapter' || sourceType === 'manual_review') return 'caution';
  return 'neutral';
}

function retryScan() {
  resetScanDraft();
  navigateToRoute(routes.capture);
}

function runPrimaryAction() {
  if (isInformationInsufficient.value) {
    retakePackagePhoto(primaryRecoveryTarget.value);
    return;
  }
  scanForComparison();
}

function runTaskClosureAction(action: TaskClosureAction) {
  if (action === 'retake') {
    retakePackagePhoto(primaryRecoveryTarget.value);
    return;
  }
  if (action === 'manual') {
    manualSupplement();
    return;
  }
  if (action === 'compare') {
    scanForComparison();
    return;
  }
  if (action === 'profile') {
    adjustProfileForReport();
    return;
  }
  if (action === 'allergen') {
    applyDetectedAllergenAndRecalculate();
    return;
  }
  if (action === 'save') {
    if (!report.value) return;
    if (report.value.isFavorite || report.value.isAvoided) {
      openSavedList(report.value.isAvoided ? 'avoid' : 'saved');
      return;
    }
    if (configuredAllergenRisk.value || purchaseTone.value === 'avoid') {
      saveCurrentAvoided();
      return;
    }
    saveCurrentFavorite();
    return;
  }
  message.value = '成分镜把包装实拍证据、规则阈值、画像和同类对比固定成可复查流程。';
}

function adjustProfileForReport() {
  if (!report.value) {
    navigateToRoute(routes.attention);
    return;
  }
  navigateToRoute(`${routes.attention}?return=report&id=${encodeURIComponent(report.value.id)}`);
}

function applyDetectedAllergenAndRecalculate() {
  if (!report.value) {
    adjustProfileForReport();
    return;
  }
  const keys = generalAllergenKeys.value;
  if (!keys.length) {
    message.value = '没有自动匹配到具体忌口项，请手动选择后重算。';
    adjustProfileForReport();
    return;
  }
  const next = saveAttentionSettings({
    ...attentionSettings.value,
    allergens: [...new Set([...attentionSettings.value.allergens, ...keys])],
    updatedAt: new Date().toISOString()
  });
  attentionSettings.value = next;
  report.value = getReportById(report.value.id) || report.value;
  const labels = allergenOptions
    .filter((option) => keys.includes(option.key))
    .map((option) => option.label)
    .join('、');
  message.value = `已把${labels || '识别出的过敏原'}加入忌口，并按新画像重算。`;
}

function openCompare() {
  if (!report.value || !comparisonCandidate.value || isInformationInsufficient.value) {
    message.value = '先补拍标签后再比较。';
    return;
  }
  if (isSameProductForCompare(report.value, comparisonCandidate.value)) {
    message.value = '这是同一款商品，请再拍另一款同类产品。';
    return;
  }
  const [left, right] = orderReportsForCompare(comparisonCandidate.value, report.value);
  uni.navigateTo({
    url: `${routes.compare}?left=${encodeURIComponent(left.id)}&right=${encodeURIComponent(right.id)}`
  });
}

function goHome() {
  navigateToRoute(routes.home);
}

function openSavedList(mode?: 'saved' | 'avoid') {
  writeString(HOME_LIST_MODE_KEY, mode || (report.value?.isAvoided ? 'avoid' : 'saved'));
  goHome();
}

function retakePackagePhoto(target: 'ingredient' | 'nutrition' | 'allergen' = 'ingredient') {
  resetScanDraft();
  saveScanDraftForRecovery();
  navigateToRoute(`${routes.capture}?target=${target}`);
}

function retakeForCorrection() {
  if (isInformationInsufficient.value) {
    retakePackagePhoto(primaryRecoveryTarget.value);
    return;
  }
  resetScanDraft();
  if (report.value && !isInformationInsufficient.value) {
    saveScanDraft({
      productName: productTitle.value !== '这款食品' ? productTitle.value : '',
      confirmedText: fullOcrText.value,
      labelType: 'unknown_label'
    });
  }
  navigateToRoute(routes.capture);
}

function manualSupplement() {
  resetScanDraft();
  saveScanDraftForRecovery(true);
  navigateToRoute(`${routes.capture}?mode=manual`);
}

function saveScanDraftForRecovery(asManual = false) {
  const current = report.value;
  if (!current) return;
  const source = current.analysisSource;
  const existingText = buildRecoverySeedText(current);
  saveScanDraft({
    productName: productTitle.value !== '这款食品' ? productTitle.value : '',
    confirmedText: existingText,
    foodTypeText: current.foodAnalysis?.category || '',
    frontClaimsText: source?.frontClaimsText || '',
    labelType: 'unknown_label',
    ocr: asManual && existingText ? {
      text: existingText,
      confidence: 0.88,
      blocks: [],
      mode: 'manual',
      provider: 'manual',
      requiresUserConfirmation: true
    } : undefined
  });
}

function buildRecoverySeedText(current: LabelReport): string {
  const source = current.analysisSource;
  return uniqueEvidenceTexts([
    source?.ingredientText ? `配料表：${source.ingredientText}` : '',
    source?.nutritionText ? `营养成分表：${source.nutritionText}` : '',
    prefixedEvidenceText('致敏原提示', source?.allergenText),
    source?.frontClaimsText ? `包装正面：${source.frontClaimsText}` : '',
    source?.normalizedCode || source?.recognition?.normalizedCode ? `条码：${source.normalizedCode || source.recognition?.normalizedCode}` : ''
  ]).join('\n');
}

function scanForComparison() {
  if (!report.value || isInformationInsufficient.value) {
    retakePackagePhoto(primaryRecoveryTarget.value);
    return;
  }
  resetScanDraft();
  saveScanDraft({ compareBaseReportId: report.value.id });
  navigateToRoute(`${routes.capture}?compareBase=${encodeURIComponent(report.value.id)}`);
}

async function shareCurrentReport() {
  if (!report.value || !purchaseDecision.value) return;
  message.value = (await shareReport(report.value, {
    title: productTitle.value,
    headline: `购买建议：${purchaseDecision.value.recommendation}`,
    points: sharePoints.value,
    meta: alternatives.value[0] || ''
  })) ? '结果已复制。' : '暂时无法分享，可以稍后重试。';
}

function copyFullOcrText() {
  if (!fullOcrText.value) {
    message.value = '这份报告没有可复制的标签文字。';
    return;
  }
  uni.setClipboardData({
    data: fullOcrText.value,
    success: () => {
      message.value = '已复制完整标签文字。';
    },
    fail: () => {
      message.value = '复制失败，可以展开后手动核对。';
    }
  });
}

function openOcrFeedback() {
  feedbackReason.value = 'ocr_wrong';
  feedbackOpen.value = true;
  message.value = '已打开反馈，可补充哪段标签文字或判断不准。';
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
  message.value = '已记录，会用于后续改进购买建议。';
}

function saveCurrentFavorite() {
  if (!report.value) return;
  if (isInformationInsufficient.value) {
    message.value = '信息不足时先补拍，暂不保存或加入避雷。';
    return;
  }
  const wasAvoided = Boolean(report.value.isAvoided);
  const updated = toggleReportFavorite(report.value.id, true);
  if (!updated) return;
  report.value = updated;
  message.value = wasAvoided
    ? '已改为保存记录，并从避雷移出。'
    : '已保存，首页已保存会显示这条购买理由。';
}

function saveCurrentAvoided() {
  if (!report.value) return;
  if (isInformationInsufficient.value) {
    message.value = '信息不足时先补拍，暂不加入避雷。';
    return;
  }
  const wasFavorite = Boolean(report.value.isFavorite);
  const updated = toggleReportAvoided(report.value.id, true);
  if (!updated) return;
  report.value = updated;
  message.value = wasFavorite
    ? '已加入避雷，并从普通保存移出。'
    : '已加入避雷，首页避雷会显示不再买的理由。';
}

function toggleCurrentFavorite() {
  if (!report.value) return;
  if (isInformationInsufficient.value) {
    message.value = '信息不足时先补拍，暂不保存或加入避雷。';
    return;
  }
  const wasAvoided = Boolean(report.value.isAvoided);
  const updated = toggleReportFavorite(report.value.id);
  if (!updated) return;
  report.value = updated;
  message.value = updated.isFavorite
    ? wasAvoided ? '已改为保存记录，并从避雷移出；再次点击可撤销保存。' : '已保存，可在首页已保存查看；再次点击可撤销。'
    : '已取消保存，首页保存列表不再显示。';
}

function toggleCurrentAvoided() {
  if (!report.value) return;
  if (isInformationInsufficient.value) {
    message.value = '信息不足时先补拍，暂不加入避雷。';
    return;
  }
  const wasFavorite = Boolean(report.value.isFavorite);
  const updated = toggleReportAvoided(report.value.id);
  if (!updated) return;
  report.value = updated;
  message.value = updated.isAvoided
    ? wasFavorite ? '已加入避雷，并从普通保存移出；再次点击可撤销避雷。' : '已加入避雷，可在首页避雷查看；再次点击可撤销。'
    : '已移出避雷，首页避雷不再显示。';
}
</script>

<template>
  <view class="page page--report">
    <Toast :message="message" tone="success" @dismiss="message = ''" />

    <EmptyState
      v-if="!report"
      title="没有找到结果"
      description="可能已被删除，或本机没有对应结果。"
      action-label="回到首页"
      @action="navigateToRoute(routes.home)"
    />

    <template v-else>
      <view class="report-stack">
        <AppCard class="decision-card decision-card--conclusion" :class="`decision-card--${purchaseTone}`">
          <view class="decision-hero">
            <view class="status-mark" :class="`status-mark--${purchaseTone}`">
              <text class="status-mark__glyph">{{ decisionVisual.glyph }}</text>
            </view>
            <view class="decision-main">
              <view class="conclusion-head">
                <text class="section-kicker">{{ conclusionKicker }}</text>
                <text class="decision-badge">{{ purchaseDecision?.recommendation || '信息不足' }}</text>
              </view>
              <text class="product-title">{{ productTitle }}</text>
              <text class="conclusion-line">{{ conclusionLine }}</text>
              <text class="profile-context">{{ profileContextText }}</text>
              <text v-if="sourceStatusText" class="source-status">{{ sourceStatusText }}</text>
              <text v-if="evidenceSummaryLine" class="evidence-summary-line">{{ evidenceSummaryLine }}</text>
              <text v-if="allergenSafetyText" class="allergen-alert">{{ allergenSafetyText }}</text>
              <text v-if="generalAllergenAlertText" class="allergen-alert allergen-alert--caution" @tap="adjustProfileForReport">{{ generalAllergenAlertText }}</text>
            </view>
          </view>

          <view v-if="!isInformationInsufficient" class="fast-summary-panel">
            <view class="fast-summary-head">
              <view class="fast-score">
                <text class="fast-score__label">{{ decisionVisual.label }}</text>
                <text class="fast-score__value">{{ scorePercent }}</text>
                <text class="fast-score__action">{{ decisionVisual.action }}</text>
              </view>
              <text class="fast-summary-profile">{{ profileContextText }}</text>
            </view>
            <view class="fast-summary-list">
              <view v-for="item in decisionProofRows" :key="`fast-${item.id}`" class="fast-summary-row" :class="`fast-summary-row--${item.tone}`">
                <text class="fast-summary-row__tag">{{ item.label }}</text>
                <view class="fast-summary-row__copy">
                  <text class="fast-summary-row__text">{{ item.text }}</text>
                  <text v-if="item.snippet" class="fast-summary-row__source">{{ item.source }}：{{ item.snippet }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="insufficient-panel">
            <text class="insufficient-panel__title">还不能下购买结论</text>
            <text class="insufficient-panel__text">{{ insufficientPanelText }}</text>
            <view class="insufficient-next-step">
              <text class="insufficient-next-step__label">下一步</text>
              <text class="insufficient-next-step__text">{{ primaryRecoveryDescription }}</text>
            </view>
            <view class="missing-checklist">
              <view
                v-for="item in insufficientChecklistRows"
                :key="item.id"
                class="missing-checklist__row"
                :class="`missing-checklist__row--${item.tone}`"
              >
                <view class="missing-checklist__head">
                  <text class="missing-checklist__label">{{ item.label }}</text>
                  <text class="missing-checklist__status">{{ item.status }}</text>
                </view>
                <text class="missing-checklist__detail">{{ item.detail }}</text>
              </view>
            </view>
          </view>

          <view v-if="isInformationInsufficient" class="top-action-row top-action-row--insufficient">
            <text class="top-action" @tap="retakePackagePhoto(primaryRecoveryTarget)">{{ primaryRecoveryLabel }}</text>
          </view>
          <view v-else class="top-action-row top-action-row--decision">
            <text
              v-for="item in topTaskActions"
              :key="`top-${item.id}`"
              class="top-action"
              :class="`top-action--${item.tone}`"
              @tap="runTaskClosureAction(item.action)"
            >
              {{ item.label }}
            </text>
          </view>
        </AppCard>

        <AppCard class="decision-card">
          <view class="section-head">
            <view class="section-title-wrap">
              <text class="section-icon section-icon--evidence">文</text>
              <text class="section-title">可核对证据</text>
            </view>
            <text class="section-count">{{ evidenceChainStatus }}</text>
          </view>

          <view class="evidence-check-panel">
            <view class="package-evidence">
              <view class="package-evidence__visual">
                <image v-if="packageImagePath" class="package-evidence__image" :src="packageImagePath" mode="aspectFill" />
                <view v-else class="package-evidence__placeholder">
                  <text class="package-evidence__placeholder-title">包装标签</text>
                  <text class="package-evidence__placeholder-text">{{ packageEvidenceCaption }}</text>
                </view>
              </view>
              <view class="package-evidence__body">
                <view v-if="packageEvidenceBadges.length" class="package-evidence__badges">
                  <view
                    v-for="item in packageEvidenceBadges"
                    :key="item.id"
                    class="package-evidence__badge"
                    :class="`package-evidence__badge--${item.tone}`"
                  >
                    <text class="package-evidence__badge-label">{{ item.label }}</text>
                    <text class="package-evidence__badge-text">{{ item.text }}</text>
                  </view>
                </view>
                <view class="package-evidence__lines">
                  <view v-for="item in decisionProofRows" :key="`evidence-${item.id}`" class="package-evidence__line">
                    <text class="package-evidence__line-label">{{ item.source }}</text>
                    <text class="package-evidence__line-text">{{ item.snippet || item.text }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="evidence-check-panel__head">
              <view class="evidence-check-copy">
                <text class="evidence-check-title">完整标签文字</text>
                <text class="evidence-check-preview">{{ fullOcrPreview }}</text>
              </view>
              <text class="evidence-check-action" @tap="rawTextOpen = !rawTextOpen">
                {{ rawTextOpen ? '收起' : '查看' }}
              </text>
            </view>
            <view class="evidence-check-actions">
              <text class="evidence-mini-link" :class="{ 'evidence-mini-link--disabled': !fullOcrText }" @tap="copyFullOcrText">复制完整文本</text>
              <text class="evidence-mini-link" @tap="manualSupplement">纠错后重算</text>
              <text class="evidence-mini-link" @tap="retakeForCorrection">{{ evidenceRetakeActionLabel }}</text>
            </view>
            <scroll-view v-if="rawTextOpen && fullOcrText" scroll-y class="raw-text-box">
              <text class="raw-text-box__text">{{ fullOcrText }}</text>
            </scroll-view>
            <text v-else-if="rawTextOpen" class="evidence-empty">这份报告没有保留可展开的标签文字。</text>
            <view v-if="rawTextOpen && textEvidenceRows.length" class="text-evidence-list">
              <view v-for="item in textEvidenceRows" :key="item.id" class="text-evidence-row">
                <text class="text-evidence-label">{{ item.label }}</text>
                <text class="text-evidence-text">{{ item.text }}</text>
              </view>
            </view>
            <text class="evidence-disclaimer">只展示本次识别到的标签文字和来源；请以实物包装为准。</text>
          </view>

          <view class="evidence-correction">
            <text class="evidence-correction__title">纠错 / 重算</text>
            <text class="evidence-correction__text">{{ evidenceCorrectionText }}</text>
            <view class="evidence-correction__actions">
              <button class="mini-action" @tap="retakeForCorrection">{{ evidenceCorrectionRetakeLabel }}</button>
              <button class="mini-action" @tap="manualSupplement">手动纠错</button>
              <button class="mini-action mini-action--muted" @tap="openOcrFeedback">标记不准</button>
            </view>
          </view>
        </AppCard>

        <AppCard class="decision-card">
          <view class="section-title-wrap">
            <text class="section-icon section-icon--alt">→</text>
            <text class="section-title">替代推荐</text>
          </view>
          <view class="alternative-list">
            <view v-for="item in alternativeRows" :key="item.id" class="alternative-row">
              <text class="alternative-tag">{{ item.tag }}</text>
              <text class="alternative-text">{{ item.text }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="evidenceRows.length" class="decision-card">
          <view class="section-title-wrap">
            <text class="section-icon section-icon--source">i</text>
            <text class="section-title">依据来源</text>
          </view>
          <view class="source-list">
            <view v-for="item in evidenceRows" :key="item.id" class="source-row">
              <text class="source-label" :class="`source-label--${item.tone}`">{{ item.label }}</text>
              <text class="source-detail">{{ item.detail }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard class="decision-card decision-card--value">
          <view class="section-title-wrap">
            <text class="section-icon section-icon--alt">AI</text>
            <text class="section-title">比直接问 AI 省事的地方</text>
          </view>
          <view class="value-proof-list">
            <view v-for="item in valueProofRows" :key="item.id" class="value-proof-row">
              <text class="value-proof-label">{{ item.label }}</text>
              <text class="value-proof-text">{{ item.text }}</text>
            </view>
          </view>
        </AppCard>

        <AppCard v-if="feedbackOpen" class="decision-card">
          <text class="section-title">反馈</text>
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
            placeholder="可补充一句。"
            auto-height
          />
          <AppButton variant="secondary" @click="submitFeedback">提交反馈</AppButton>
        </AppCard>
      </view>

      <view class="action-bar">
        <AppButton @click="runPrimaryAction">{{ recoveryActionLabel }}</AppButton>
        <AppButton v-if="isInformationInsufficient" variant="secondary" @click="manualSupplement">手动补充</AppButton>
        <AppButton v-else-if="hasSavedOrAvoided" variant="secondary" @click="openSavedList(report?.isAvoided ? 'avoid' : 'saved')">{{ savedListActionLabel }}</AppButton>
        <AppButton v-else variant="secondary" @click="configuredAllergenRisk || purchaseTone === 'avoid' ? saveCurrentAvoided() : saveCurrentFavorite()">{{ saveReportActionLabel }}</AppButton>
        <view v-if="!isInformationInsufficient" class="retention-state" :class="`retention-state--${retentionState.tone}`">
          <view class="retention-state__copy">
            <text class="retention-state__label">{{ retentionState.label }}</text>
            <text class="retention-state__detail">{{ retentionState.detail }}</text>
          </view>
          <text class="retention-state__hint">{{ retentionState.hint }}</text>
        </view>
        <view class="action-links">
          <text v-if="isInformationInsufficient" class="link link--disabled">补拍后再对比</text>
          <text v-if="isInformationInsufficient" class="link link--disabled">未保存</text>
          <text v-if="!isInformationInsufficient && hasComparisonCandidate && hasSavedOrAvoided" class="link link--subtle" @tap="openSavedList(report?.isAvoided ? 'avoid' : 'saved')">{{ savedListActionLabel }}</text>
          <text v-if="!isInformationInsufficient" class="link link--subtle" @tap="toggleCurrentFavorite">{{ favoriteActionLabel }}</text>
          <text v-if="!isInformationInsufficient" class="link link--subtle" @tap="toggleCurrentAvoided">{{ avoidActionLabel }}</text>
          <text class="link link--subtle" @tap="goHome">回首页</text>
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
  padding-bottom: calc(260rpx + env(safe-area-inset-bottom));
  background: var(--bg);
}

.report-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.decision-card {
  border-radius: 20rpx;
}

.decision-card--conclusion {
  border-color: rgba(18, 151, 128, 0.16);
  background: linear-gradient(135deg, rgba(238, 250, 245, 0.98), #ffffff);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.decision-card--caution {
  border-color: rgba(216, 138, 36, 0.24);
  background: linear-gradient(135deg, #fff8ec, #ffffff);
}

.decision-card--avoid {
  border-color: rgba(221, 76, 76, 0.24);
  background: linear-gradient(135deg, #fff1f1, #ffffff);
}

.decision-card--unknown {
  border-color: rgba(111, 122, 117, 0.2);
  background: linear-gradient(135deg, #f7f8f7, #ffffff);
}

.decision-card--task-hub {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.task-hub-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.task-hub-row {
  min-height: 112rpx;
  border: 1px solid rgba(22, 42, 36, 0.1);
  border-radius: 16rpx;
  background: var(--surface);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  padding: var(--space-sm);
  text-align: left;
}

.task-hub-row::after {
  display: none;
}

.task-hub-row--recommend {
  border-color: rgba(18, 151, 128, 0.22);
  background: rgba(238, 250, 245, 0.78);
}

.task-hub-row--caution {
  border-color: rgba(216, 138, 36, 0.22);
  background: #fff8ec;
}

.task-hub-row--unknown {
  border-color: rgba(111, 122, 117, 0.2);
  background: #f7f8f7;
}

.task-hub-row__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.task-hub-row__label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 950;
  line-height: 1.2;
}

.task-hub-row__text {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  word-break: break-word;
}

.task-hub-row__arrow {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1;
}

.decision-hero {
  display: grid;
  grid-template-columns: 112rpx minmax(0, 1fr);
  gap: var(--space-md);
  align-items: center;
}

.status-mark {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999px;
  background: var(--primary-strong);
  box-shadow: 0 14rpx 30rpx rgba(8, 122, 104, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-mark--caution {
  background: var(--warning);
  box-shadow: 0 14rpx 30rpx rgba(216, 138, 36, 0.2);
}

.status-mark--avoid {
  background: var(--status-danger);
  box-shadow: 0 14rpx 30rpx rgba(217, 107, 95, 0.2);
}

.status-mark--unknown {
  background: var(--muted);
  box-shadow: 0 14rpx 30rpx rgba(98, 111, 105, 0.16);
}

.status-mark__glyph {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.decision-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.conclusion-head,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.section-kicker,
.section-count {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.decision-badge {
  border-radius: 999px;
  background: var(--primary-strong);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.25;
  padding: 8rpx 18rpx;
}

.decision-card--caution .decision-badge {
  background: var(--warning);
}

.decision-card--avoid .decision-badge {
  background: var(--status-danger);
}

.decision-card--unknown .decision-badge {
  background: var(--muted);
}

.product-title {
  color: var(--text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.conclusion-line {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.35;
}

.source-status {
  border: 1px solid rgba(216, 138, 36, 0.2);
  border-radius: 12rpx;
  background: rgba(255, 248, 236, 0.88);
  color: var(--warning);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
  padding: 8rpx 12rpx;
}

.evidence-summary-line {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
  word-break: break-word;
}

.evidence-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8rpx;
}

.evidence-chip {
  border: 1px solid rgba(98, 111, 105, 0.12);
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.68);
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
  padding: 8rpx 10rpx;
}

.evidence-chip--recommend {
  border-color: rgba(18, 151, 128, 0.14);
  background: rgba(238, 250, 245, 0.88);
}

.evidence-chip--caution {
  border-color: rgba(216, 138, 36, 0.16);
  background: rgba(255, 248, 236, 0.88);
}

.evidence-chip--unknown {
  border-color: rgba(98, 111, 105, 0.14);
  background: rgba(247, 248, 247, 0.92);
}

.evidence-chip__label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.evidence-chip__text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.allergen-alert {
  border: 1px solid rgba(217, 107, 95, 0.2);
  border-radius: 12rpx;
  background: rgba(255, 241, 241, 0.92);
  color: var(--status-danger);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.4;
  padding: 8rpx 12rpx;
}

.profile-context {
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.35;
}

.fast-summary-panel {
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: var(--space-sm);
}

.fast-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.fast-score {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.fast-score__label,
.fast-summary-profile,
.fast-score__action {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
}

.fast-score__value {
  color: var(--text);
  font-size: 34rpx;
  font-weight: 950;
  line-height: 1;
}

.fast-score__action {
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.1);
  color: var(--primary-strong);
  padding: 6rpx 10rpx;
  white-space: nowrap;
}

.fast-summary-profile {
  color: var(--primary-strong);
  text-align: right;
  word-break: break-word;
}

.fast-summary-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.fast-summary-row {
  border-radius: 14rpx;
  background: rgba(98, 111, 105, 0.08);
  display: grid;
  grid-template-columns: 72rpx minmax(0, 1fr);
  gap: 10rpx;
  min-height: 68rpx;
  padding: 10rpx 12rpx;
}

.fast-summary-row--recommend {
  background: rgba(18, 151, 128, 0.08);
}

.fast-summary-row--caution {
  background: rgba(216, 138, 36, 0.12);
}

.fast-summary-row--avoid {
  background: rgba(217, 107, 95, 0.12);
}

.fast-summary-row--unknown {
  background: rgba(247, 248, 247, 0.94);
}

.fast-summary-row__tag {
  min-width: 0;
  height: 40rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.1;
  padding: 0 8rpx;
  text-align: center;
}

.fast-summary-row--caution .fast-summary-row__tag {
  color: var(--warning);
}

.fast-summary-row--avoid .fast-summary-row__tag {
  color: var(--status-danger);
}

.fast-summary-row--unknown .fast-summary-row__tag {
  color: var(--muted);
}

.fast-summary-row__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.fast-summary-row__text {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.28;
  word-break: break-word;
}

.fast-summary-row__source {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.28;
  word-break: break-word;
}

.score-panel {
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm);
}

.score-copy {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.score-label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.score-value {
  color: var(--text);
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1;
}

.score-track {
  height: 18rpx;
  border-radius: 999px;
  background: rgba(6, 97, 82, 0.1);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-strong);
}

.score-fill--caution {
  background: var(--warning);
}

.score-fill--avoid {
  background: var(--status-danger);
}

.score-fill--unknown {
  background: var(--muted);
}

.score-action {
  min-width: 88rpx;
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.1);
  color: var(--primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  padding: 8rpx 12rpx;
  text-align: center;
}

.insufficient-panel {
  border: 1px solid rgba(98, 111, 105, 0.18);
  border-radius: 16rpx;
  background: rgba(247, 248, 247, 0.92);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--space-sm);
}

.insufficient-panel__title {
  color: var(--text);
  font-size: var(--font-size-base);
  font-weight: 900;
  line-height: 1.3;
}

.insufficient-panel__text {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
}

.insufficient-next-step {
  border: 1px solid rgba(18, 151, 128, 0.18);
  border-radius: 14rpx;
  background: rgba(238, 250, 245, 0.9);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: center;
  padding: 10rpx 12rpx;
}

.insufficient-next-step__label {
  border-radius: 999px;
  background: var(--surface);
  color: var(--primary-strong);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
  padding: 5rpx 9rpx;
  white-space: nowrap;
}

.insufficient-next-step__text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.4;
}

.missing-checklist {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 4rpx;
}

.missing-checklist__row {
  border: 1px solid rgba(98, 111, 105, 0.12);
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 10rpx 12rpx;
}

.missing-checklist__row--unknown {
  border-color: rgba(98, 111, 105, 0.2);
  background: rgba(247, 248, 247, 0.98);
}

.missing-checklist__row--caution {
  border-color: rgba(216, 138, 36, 0.22);
  background: rgba(255, 250, 236, 0.96);
}

.missing-checklist__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.missing-checklist__label {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
}

.missing-checklist__status {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--primary-strong);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
  padding: 5rpx 9rpx;
  white-space: nowrap;
}

.missing-checklist__row--caution .missing-checklist__status {
  color: var(--warning);
}

.missing-checklist__detail {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.4;
}

.decision-proof-panel {
  border: 1px solid rgba(98, 111, 105, 0.12);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm);
}

.decision-proof-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.decision-proof-title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.decision-proof-meta {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
}

.decision-proof-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.decision-proof-row {
  border-radius: 14rpx;
  background: rgba(98, 111, 105, 0.08);
  display: grid;
  grid-template-columns: 72rpx minmax(0, 1fr);
  gap: var(--space-sm);
  min-height: 82rpx;
  padding: 12rpx;
}

.decision-proof-row--recommend {
  background: rgba(18, 151, 128, 0.08);
}

.decision-proof-row--caution {
  background: rgba(216, 138, 36, 0.12);
}

.decision-proof-row--avoid {
  background: rgba(217, 107, 95, 0.12);
}

.decision-proof-row--unknown {
  background: rgba(247, 248, 247, 0.94);
}

.decision-proof-tag {
  min-width: 0;
  height: 44rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.1;
  padding: 0 8rpx;
  text-align: center;
}

.decision-proof-row--caution .decision-proof-tag {
  color: var(--warning);
}

.decision-proof-row--avoid .decision-proof-tag {
  color: var(--status-danger);
}

.decision-proof-row--unknown .decision-proof-tag {
  color: var(--muted);
}

.decision-proof-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.decision-proof-text {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.decision-proof-source {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.decision-proof-source__label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.decision-proof-source__text {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.4;
  word-break: break-word;
}

.priority-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.priority-fact {
  border-radius: 16rpx;
  background: rgba(98, 111, 105, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
  padding: 12rpx 14rpx;
}

.priority-fact--caution {
  background: rgba(216, 138, 36, 0.12);
}

.priority-fact--avoid {
  background: rgba(217, 107, 95, 0.12);
}

.priority-fact__label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.priority-fact__value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.top-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
}

.top-action-row--insufficient .top-action {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.top-action-row--insufficient {
  grid-template-columns: minmax(0, 1fr);
}

.top-action-row--insufficient .top-action--muted {
  background: var(--surface);
  border-color: rgba(98, 111, 105, 0.16);
  color: var(--muted);
}

.top-action-row--decision {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.top-action {
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  min-height: 44px;
  padding: 10rpx 8rpx;
  text-align: center;
}

.top-action::after {
  border: 0;
}

.top-action--muted {
  color: var(--muted);
}

.top-action--recommend {
  background: var(--primary-strong);
  color: #ffffff;
}

.top-action--caution {
  background: #fff8ec;
  border-color: rgba(216, 138, 36, 0.24);
  color: var(--warning);
}

.top-action--avoid {
  background: rgba(217, 107, 95, 0.12);
  border-color: rgba(217, 107, 95, 0.2);
  color: var(--status-danger);
}

.top-action--unknown,
.top-action--neutral {
  background: var(--surface);
  border-color: rgba(98, 111, 105, 0.14);
  color: var(--muted);
}

.retention-state {
  border: 1px solid rgba(98, 111, 105, 0.14);
  border-radius: 16rpx;
  background: rgba(247, 248, 247, 0.92);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-sm);
  align-items: center;
  padding: var(--space-sm);
}

.retention-state--recommend {
  border-color: rgba(18, 151, 128, 0.18);
  background: rgba(238, 250, 245, 0.92);
}

.retention-state--avoid {
  border-color: rgba(217, 107, 95, 0.18);
  background: rgba(255, 241, 241, 0.92);
}

.retention-state__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.retention-state__label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.retention-state__detail {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
}

.retention-state__hint {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  min-height: 44px;
  padding: 8rpx 12rpx;
  text-align: center;
  white-space: nowrap;
}

.retention-state--avoid .retention-state__hint {
  color: var(--status-danger);
}

.decision-card--caution .score-action {
  background: rgba(216, 138, 36, 0.12);
  color: var(--warning);
}

.decision-card--avoid .score-action {
  background: rgba(217, 107, 95, 0.12);
  color: var(--status-danger);
}

.decision-card--unknown .score-action {
  background: rgba(98, 111, 105, 0.12);
  color: var(--muted);
}

.audience-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.audience-chip {
  max-width: 100%;
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.1);
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
}

.audience-chip--caution {
  background: rgba(216, 138, 36, 0.12);
}

.audience-chip__label {
  color: var(--primary-strong);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.audience-chip--caution .audience-chip__label {
  color: var(--warning);
}

.audience-chip__text,
.risk-text,
.alternative-text {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.5;
}

.risk-source-note {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
}

.risk-source-badge {
  align-self: flex-start;
  border-radius: 999px;
  background: rgba(98, 111, 105, 0.1);
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
  padding: 6rpx 12rpx;
}

.section-title {
  color: var(--text);
  font-size: var(--font-size-lg);
  font-weight: 900;
  line-height: 1.3;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999px;
  background: rgba(216, 138, 36, 0.12);
  color: var(--warning);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1;
}

.section-icon--alt {
  background: rgba(18, 151, 128, 0.1);
  color: var(--primary-strong);
}

.section-icon--source {
  background: rgba(98, 111, 105, 0.1);
  color: var(--muted);
}

.section-icon--evidence {
  background: rgba(6, 97, 82, 0.1);
  color: var(--primary-strong);
}

.link--disabled {
  color: var(--muted);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.risk-list,
.alternative-list,
.source-list,
.value-proof-list,
.text-evidence-list,
.risk-evidence-list,
.feedback-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.nutrition-snapshot {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.nutrition-snapshot__title {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
}

.data-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}

.data-tile {
  min-width: 0;
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--space-sm);
}

.data-tile--recommend {
  background: rgba(18, 151, 128, 0.08);
}

.data-tile--caution {
  background: rgba(216, 138, 36, 0.12);
}

.data-tile__head {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.data-label,
.data-level {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.data-value {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.2;
  word-break: break-word;
}

.data-track {
  height: 10rpx;
  border-radius: 999px;
  background: rgba(6, 97, 82, 0.1);
  overflow: hidden;
}

.data-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-strong);
}

.data-tile--caution .data-fill {
  background: var(--warning);
}

.risk-row {
  display: grid;
  grid-template-columns: 86rpx minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: start;
  min-height: 72rpx;
}

.risk-index {
  min-width: 72rpx;
  min-height: 44rpx;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.15;
  padding: 0 10rpx;
}

.risk-index--caution {
  background: rgba(216, 138, 36, 0.12);
  color: var(--warning);
}

.risk-index--avoid {
  background: rgba(217, 107, 95, 0.12);
  color: var(--status-danger);
}

.risk-index--unknown {
  background: rgba(98, 111, 105, 0.12);
  color: var(--muted);
}

.risk-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.risk-meter {
  display: grid;
  grid-template-columns: repeat(3, 34rpx);
  gap: 6rpx;
}

.risk-dot {
  height: 10rpx;
  border-radius: 999px;
  background: rgba(6, 97, 82, 0.1);
}

.risk-dot--active {
  background: var(--primary-strong);
}

.risk-meter--caution .risk-dot--active {
  background: var(--warning);
}

.risk-meter--avoid .risk-dot--active {
  background: var(--status-danger);
}

.risk-meter--unknown .risk-dot--active {
  background: var(--muted);
}

.alternative-row {
  display: grid;
  grid-template-columns: 112rpx minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: center;
  min-height: 72rpx;
}

.alternative-tag {
  min-height: 44rpx;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.15;
  padding: 0 10rpx;
}

.source-row {
  border: 1px solid var(--line);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--space-sm);
}

.source-label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.source-label--recommend {
  color: var(--primary-strong);
}

.source-label--caution {
  color: var(--warning);
}

.source-label--unknown {
  color: var(--muted);
}

.source-detail {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.45;
  word-break: break-word;
}

.value-proof-row {
  display: grid;
  grid-template-columns: 128rpx minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: start;
  border: 1px solid rgba(18, 151, 128, 0.12);
  border-radius: 16rpx;
  background: rgba(238, 250, 245, 0.72);
  padding: var(--space-sm);
}

.value-proof-label {
  min-height: 44rpx;
  border-radius: 999px;
  background: rgba(18, 151, 128, 0.12);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.15;
  padding: 0 10rpx;
}

.value-proof-text {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 800;
  line-height: 1.45;
  word-break: break-word;
}

.package-evidence {
  display: grid;
  grid-template-columns: 164rpx minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: stretch;
}

.package-evidence__visual {
  min-height: 184rpx;
  border-radius: 16rpx;
  background: #ffffff;
  overflow: hidden;
}

.package-evidence__image {
  width: 100%;
  height: 100%;
}

.package-evidence__placeholder {
  height: 100%;
  min-height: 184rpx;
  border: 1px dashed rgba(6, 97, 82, 0.24);
  border-radius: 16rpx;
  background:
    linear-gradient(90deg, rgba(6, 97, 82, 0.08) 0 18%, transparent 18% 100%),
    repeating-linear-gradient(0deg, rgba(98, 111, 105, 0.08) 0 2rpx, transparent 2rpx 24rpx),
    #ffffff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
  padding: var(--space-sm);
}

.package-evidence__placeholder-title {
  color: var(--primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.25;
}

.package-evidence__placeholder-text {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.35;
}

.package-evidence__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.package-evidence__badges {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8rpx;
}

.package-evidence__badge {
  border-radius: 12rpx;
  background: rgba(98, 111, 105, 0.08);
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
  padding: 8rpx 10rpx;
}

.package-evidence__badge--recommend {
  background: rgba(18, 151, 128, 0.1);
}

.package-evidence__badge--caution {
  background: rgba(216, 138, 36, 0.12);
}

.package-evidence__badge--unknown {
  background: rgba(247, 248, 247, 0.96);
}

.package-evidence__badge-label {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.package-evidence__badge-text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.package-evidence__lines {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.package-evidence__line {
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  padding: 8rpx 10rpx;
}

.package-evidence__line-label {
  color: var(--primary-strong);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
}

.package-evidence__line-text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.4;
  word-break: break-word;
}

.evidence-check-panel {
  border: 1px solid rgba(6, 97, 82, 0.12);
  border-radius: 16rpx;
  background: rgba(238, 250, 245, 0.72);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm);
}

.evidence-check-panel__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-sm);
  align-items: start;
}

.evidence-check-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.evidence-check-title,
.text-evidence-label,
.risk-evidence-label,
.evidence-correction__title {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.3;
}

.evidence-check-preview,
.text-evidence-text,
.risk-evidence-risk,
.risk-evidence-snippet,
.evidence-correction__text,
.evidence-empty,
.evidence-disclaimer {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.5;
  word-break: break-word;
}

.evidence-check-action,
.evidence-mini-link {
  color: var(--primary-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.3;
  min-height: 44px;
}

.evidence-check-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.evidence-mini-link {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 8rpx 14rpx;
}

.evidence-mini-link--disabled {
  color: var(--muted);
}

.raw-text-box {
  max-height: 360rpx;
  border: 1px solid rgba(98, 111, 105, 0.14);
  border-radius: 14rpx;
  background: #ffffff;
  box-sizing: border-box;
  padding: var(--space-sm);
}

.raw-text-box__text {
  color: var(--text);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.evidence-disclaimer {
  color: var(--warning);
}

.text-evidence-row,
.risk-evidence-row,
.evidence-correction {
  border: 1px solid var(--line);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--space-sm);
}

.risk-evidence-row--caution {
  border-color: rgba(216, 138, 36, 0.22);
  background: rgba(255, 248, 236, 0.82);
}

.risk-evidence-row--avoid {
  border-color: rgba(217, 107, 95, 0.2);
  background: rgba(255, 241, 241, 0.82);
}

.risk-evidence-row--unknown {
  border-style: dashed;
  background: rgba(247, 248, 247, 0.92);
}

.risk-evidence-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.risk-evidence-source {
  color: var(--muted);
  font-size: 20rpx;
  font-weight: 900;
  line-height: 1.2;
  text-align: right;
}

.risk-evidence-snippet {
  color: var(--text);
}

.evidence-correction {
  background: rgba(255, 255, 255, 0.72);
}

.evidence-correction__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
  margin-top: 4rpx;
}

.mini-action {
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 900;
  line-height: 1.2;
  min-height: 44px;
  padding: 10rpx 8rpx;
  text-align: center;
}

.mini-action::after {
  border: 0;
}

.mini-action--muted {
  background: rgba(98, 111, 105, 0.1);
  color: var(--muted);
}

.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10rpx;
  margin-top: var(--space-lg);
  border-top: 1px solid rgba(18, 151, 128, 0.12);
  background: linear-gradient(180deg, rgba(247, 248, 247, 0.86), #ffffff 42%);
  box-shadow: 0 -10rpx 28rpx rgba(17, 24, 39, 0.08);
  padding: 10rpx 0 calc(12rpx + env(safe-area-inset-bottom));
}

.action-links {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: nowrap;
  gap: 6rpx;
  justify-content: center;
  overflow-x: auto;
  padding-bottom: 2rpx;
}

.link {
  color: var(--primary-strong);
  font-size: var(--font-size-sm);
  font-weight: 900;
  line-height: 1.5;
}

.link--subtle {
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 4rpx 12rpx;
  white-space: nowrap;
}

.link--disabled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 4rpx 12rpx;
  white-space: nowrap;
}

.feedback-option {
  border: 1px solid var(--line);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-height: 96rpx;
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
  min-height: 100rpx;
  border: 1px solid var(--line);
  border-radius: 16rpx;
  background: var(--surface-subtle);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  padding: var(--space-sm);
}

@media screen and (max-width: 360px) {
  .decision-hero {
    grid-template-columns: 88rpx minmax(0, 1fr);
  }

  .status-mark {
    width: 88rpx;
    height: 88rpx;
  }

  .score-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .fast-summary-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .fast-summary-profile {
    text-align: left;
  }

  .retention-state {
    grid-template-columns: minmax(0, 1fr);
  }

  .retention-state__hint {
    justify-self: flex-start;
    white-space: normal;
  }

  .task-hub-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .data-strip {
    grid-template-columns: minmax(0, 1fr);
  }

  .package-evidence {
    grid-template-columns: minmax(0, 1fr);
  }

  .package-evidence__visual,
  .package-evidence__placeholder {
    min-height: 150rpx;
  }

  .package-evidence__badges {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
