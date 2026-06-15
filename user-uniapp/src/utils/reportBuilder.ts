import { attentionGoals } from '@/constants/attention';
import type { AttentionHit, AttentionSettings, IngredientMatch, LabelReport, LabelType, NutritionField, OcrResult, ParsedIngredient, ReportSource } from '@/types';

export function buildLabelReport(input: {
  productName: string;
  rawText: string;
  ingredients: ParsedIngredient[];
  matches: IngredientMatch[];
  nutrition: NutritionField[];
  attention: AttentionSettings;
  labelType?: LabelType;
  frontClaimsText?: string;
  ocr?: OcrResult;
}): LabelReport {
  const frontClaimsText = input.labelType === 'front_claims' ? normalizeReportText(input.frontClaimsText) : '';
  const reportMatches = input.matches.map(sanitizeReportMatch);
  const acceptedMatches = reportMatches.filter((match) => match.decision === 'confirmed');
  const attentionHits = buildAttentionHits(input);
  const focusItems = buildFocusItems(reportMatches, input.nutrition, attentionHits, frontClaimsText);
  const additiveItems = acceptedMatches.filter((match) => match.isAdditive);
  const unknownItems = reportMatches
    .filter((match) => match.dataStatus === 'unknown_from_ocr' || match.decision === 'rejected')
    .map((match) => match.normalizedText);
  const report: LabelReport = {
    id: createReportId(),
    title: '食品标签解读',
    productName: input.productName.trim() || '未命名食品',
    createdAt: new Date().toISOString(),
    summarySentence: buildSummarySentence(input, additiveItems.length, attentionHits, frontClaimsText),
    attentionHits,
    focusItems,
    ingredientSection: {
      total: input.ingredients.length,
      additiveCount: additiveItems.length,
      items: reportMatches
    },
    nutritionSection: {
      fields: input.nutrition,
      highlights: buildNutritionHighlights(input.nutrition, input.attention)
    },
    frontClaimsSection: {
      text: frontClaimsText,
      highlights: buildFrontClaimHighlights(frontClaimsText)
    },
    additiveGroups: groupAdditives(additiveItems),
    allergenHints: buildAllergenHints(reportMatches),
    unknownItems,
    sources: buildSources(acceptedMatches, { allMatches: reportMatches, ocr: input.ocr }),
    rawText: input.rawText
  };
  return report;
}

function sanitizeReportMatch(match: IngredientMatch): IngredientMatch {
  if (match.decision !== 'rejected') return match;
  const { ingredientId: _ingredientId, sourceName: _sourceName, sourceType: _sourceType, ...rest } = match;
  return {
    ...rest,
    dataStatus: 'unknown_from_ocr',
    dataStatusLabel: '暂未收录',
    confidence: 0,
    matchType: 'none',
    sourceNote: '用户已标为暂未收录，请以包装原文为准。',
    ingredientName: match.normalizedText,
    isAdditive: false
  };
}

function buildSummarySentence(input: { ingredients: ParsedIngredient[]; nutrition: NutritionField[] }, additiveCount: number, hits: AttentionHit[], frontClaimsText: string): string {
  const parts: string[] = [];
  if (input.ingredients.length) parts.push(`识别到 ${input.ingredients.length} 项配料`);
  if (!input.ingredients.length && !frontClaimsText) parts.push('未提供配料表');
  if (frontClaimsText) parts.push('包装正面文字已整理');
  if (additiveCount) parts.push(`其中 ${additiveCount} 项可能属于食品添加剂分组`);
  if (input.nutrition.some((field) => field.value)) parts.push('营养成分表已整理');
  if (hits.length) parts.push(`建议重点查看：${hits.map((hit) => hit.label).slice(0, 3).join('、')}`);
  return `${parts.join('，')}。信息不足时，建议结合包装原文确认。`;
}

function buildAttentionHits(input: {
  rawText: string;
  frontClaimsText?: string;
  matches: IngredientMatch[];
  nutrition: NutritionField[];
  attention: AttentionSettings;
}): AttentionHit[] {
  const text = [
    input.rawText,
    normalizeReportText(input.frontClaimsText),
    ...input.matches.map((match) => match.normalizedText),
    ...input.nutrition
      .filter(hasNutritionEvidence)
      .map((field) => `${field.label}${field.value}${field.unit}${normalizeReportText(field.sourceText)}`)
  ].join(' ');
  const customTerms = input.attention.customTerms.filter((term) => text.includes(term));
  const goalHits = attentionGoals
    .filter((goal) => input.attention.goals.includes(goal.key))
    .map((goal) => {
      const terms = [...goal.keywords, ...getSelectedDetailTermsForGoal(goal.keywords, input.attention.detailTerms)]
        .filter((term) => text.includes(term));
      if (!terms.length) return null;
      return {
        key: goal.key,
        label: goal.label,
        reason: `${goal.label}相关词已在标签文本中出现。`,
        terms: [...new Set(terms)]
      };
    })
    .filter(Boolean) as AttentionHit[];
  if (customTerms.length) {
    goalHits.push({
      key: 'custom',
      label: '自定义忌口',
      reason: '识别到你设置的自定义关注词。',
      terms: customTerms
    });
  }
  return goalHits;
}

function buildFocusItems(matches: IngredientMatch[], nutrition: NutritionField[], hits: AttentionHit[], frontClaimsText: string): string[] {
  const items = hits.map((hit) => `${hit.label}：${hit.terms.slice(0, 4).join('、')}`);
  const frontClaimHighlights = buildFrontClaimHighlights(frontClaimsText);
  if (frontClaimHighlights.length) items.push(...frontClaimHighlights.slice(0, 2));
  const sodium = nutrition.find((field) => field.key === 'sodium' && field.value);
  const sugar = nutrition.find((field) => field.key === 'sugar' && field.value);
  if (sodium) items.push(`钠：${sodium.value}${sodium.unit}${sodium.nrvPercent ? `，NRV ${sodium.nrvPercent}` : ''}`);
  if (sugar) items.push(`糖：${sugar.value}${sugar.unit}`);
  const pending = matches.filter((match) => ['mapped_candidate', 'pending_review', 'unknown_from_ocr', 'unverified'].includes(match.dataStatus));
  if (pending.length) items.push(`有 ${pending.length} 项需要结合包装原文或数据来源继续确认`);
  return [...new Set(items)].slice(0, 8);
}

function buildFrontClaimHighlights(text: string): string[] {
  if (!text) return [];
  const highlights: string[] = [];
  const matchedLabels = [
    { label: '糖相关声明', pattern: /0糖|零糖|无糖|低糖|少糖/ },
    { label: '脂肪相关声明', pattern: /0脂|零脂|低脂|脱脂|少油|非油炸/ },
    { label: '蛋白质相关声明', pattern: /高蛋白|蛋白质/ },
    { label: '钠/盐相关声明', pattern: /低钠|减盐|少盐/ },
    { label: '包装卖点声明', pattern: /无添加|不添加|粗粮|膳食纤维/ }
  ].filter((item) => item.pattern.test(text)).map((item) => item.label);
  if (matchedLabels.length) {
    highlights.push(`包装正面出现 ${[...new Set(matchedLabels)].join('、')}，建议结合配料表和营养成分表确认。`);
  } else {
    highlights.push('包装正面文字已保留，建议结合配料表和营养成分表确认。');
  }
  return highlights;
}

function buildNutritionHighlights(fields: NutritionField[], attention: AttentionSettings): string[] {
  const highlights: string[] = [];
  const hasGoal = (key: string) => attention.goals.includes(key);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  if (hasGoal('sugar_control')) addFieldHighlight(highlights, byKey.get('sugar'), '控糖');
  if (hasGoal('low_sodium')) addFieldHighlight(highlights, byKey.get('sodium'), '低钠');
  if (hasGoal('fat_control')) {
    addFieldHighlight(highlights, byKey.get('fat'), '减脂');
    addFieldHighlight(highlights, byKey.get('transFat'), '减脂');
  }
  if (hasGoal('high_protein')) addFieldHighlight(highlights, byKey.get('protein'), '高蛋白');
  if (!highlights.length && fields.some((field) => field.value)) highlights.push('营养字段已整理，请以包装标示为准。');
  return highlights;
}

function addFieldHighlight(target: string[], field: NutritionField | undefined, goalLabel: string) {
  if (!field?.value) return;
  target.push(`${goalLabel}关注项可查看 ${field.label}：${field.value}${field.unit}${field.nrvPercent ? `，NRV ${field.nrvPercent}` : ''}`);
}

function hasNutritionEvidence(field: NutritionField): boolean {
  return Boolean(normalizeReportText(field.value) || normalizeReportText(field.sourceText));
}

function groupAdditives(items: IngredientMatch[]): Array<{ label: string; items: IngredientMatch[] }> {
  const specificGroups = [
    { label: '防腐剂', test: (value: string) => /山梨酸|苯甲酸|防腐/.test(value) },
    { label: '甜味剂', test: (value: string) => /甜味|阿斯巴甜|三氯蔗糖|安赛蜜/.test(value) },
    { label: '色素', test: (value: string) => /色|胭脂红|柠檬黄|焦糖/.test(value) },
    { label: '食用香精', test: (value: string) => /香精|香料/.test(value) }
  ];
  const assignedIds = new Set<string>();
  const groups = specificGroups
    .map((group) => {
      const groupItems = items.filter((item) => !assignedIds.has(item.id) && group.test(item.normalizedText));
      groupItems.forEach((item) => assignedIds.add(item.id));
      return { label: group.label, items: groupItems };
    })
    .filter((group) => group.items.length);
  const otherItems = items.filter((item) => !assignedIds.has(item.id));
  return otherItems.length ? [...groups, { label: '其他食品添加剂', items: otherItems }] : groups;
}

function buildAllergenHints(matches: IngredientMatch[]): string[] {
  const text = matches.map((match) => match.normalizedText).join(' ');
  return allergenTerms
    .filter((item) => item.patterns.some((pattern) => text.includes(pattern)))
    .map((item) => `可能需要查看 ${item.label} 相关标示，请以包装过敏原提示和配料表为准。`);
}

function getSelectedDetailTermsForGoal(goalKeywords: string[], detailTerms: string[]): string[] {
  return detailTerms.filter((term) => goalKeywords.some((keyword) => keyword === term || keyword.includes(term) || term.includes(keyword)));
}

const allergenTerms = [
  { label: '乳', patterns: ['乳制品', '牛乳', '羊乳', '牛奶', '奶粉', '乳粉', '乳清', '乳糖', '炼乳', '奶油'] },
  { label: '大豆', patterns: ['大豆', '黄豆', '豆粉', '豆乳'] },
  { label: '坚果', patterns: ['坚果', '花生', '杏仁', '核桃', '腰果', '榛子', '开心果'] },
  { label: '麸质', patterns: ['麸质', '小麦', '麦麸', '面粉', '燕麦'] },
  { label: '蛋', patterns: ['鸡蛋', '蛋黄', '蛋清', '全蛋', '蛋粉', '蛋类'] },
  { label: '海鲜', patterns: ['海鲜', '虾', '蟹', '鱼', '贝类'] }
];

function buildSources(matches: IngredientMatch[], options: { allMatches?: IngredientMatch[]; ocr?: OcrResult } = {}): ReportSource[] {
  const allMatches = options.allMatches ?? matches;
  const sources: ReportSource[] = [
    {
      label: 'OCR / 手动确认文本',
      detail: '报告基于用户确认后的食品标签文本生成，OCR 原文不是权威来源。',
      sourceType: 'ocr_input'
    },
    {
      label: '我的关注项',
      detail: '关注项保存在本机，用于排序和提示，不作为医疗或营养建议。',
      sourceType: 'manual_input'
    }
  ];
  if (options.ocr?.mode === 'mock' || options.ocr?.provider === 'mock') {
    sources.push({
      label: 'mock only OCR',
      detail: '本次 OCR 文本来自 mock provider，仅用于开发或降级演示，报告需结合包装原文确认。',
      sourceType: 'mock_adapter'
    });
  }
  if (matches.some(isOfficialStandardMatch)) {
    sources.push({
      label: '官方标准数据',
      detail: '已验证法规项来自后端成分 API 中的官方标准来源；仅 verified_regulation 可作为官方标准依据展示。',
      sourceType: 'official_standard'
    });
  }
  if (matches.some((match) => match.dataStatus === 'verified_jecfa')) {
    sources.push({
      label: 'JECFA 评价数据库',
      detail: 'JECFA 评价项仅用于解释对应评价来源，不代表中国法规使用范围。',
      sourceType: 'safety_evaluation'
    });
  }
  if (matches.some((match) => match.dataStatus === 'common_ingredient')) {
    sources.push({
      label: '普通配料词库',
      detail: '普通配料词库仅用于标签可读性和匹配辅助，不作为法规结论。',
      sourceType: 'common_ingredient'
    });
  }
  if (allMatches.some(isPendingBackendMatch)) {
    sources.push({
      label: '待复核成分数据库',
      detail: '待复核、疑似匹配或未验证项仅作匹配线索，不作为官方或权威结论。',
      sourceType: 'manual_review'
    });
  }
  if (allMatches.some((match) => match.sourceNote.includes('后端不可用'))) {
    sources.push({
      label: 'mock only / 待后端实现',
      detail: '当前匹配服务不可用时仅保留暂未收录状态，不伪造成分来源。',
      sourceType: 'mock_adapter'
    });
  }
  return sources;
}

function isOfficialStandardMatch(match: IngredientMatch): boolean {
  return match.dataStatus === 'verified_regulation' && normalizeReportText(match.sourceType) === 'official_standard';
}

function isPendingBackendMatch(match: IngredientMatch): boolean {
  return match.decision !== 'rejected' && ['pending_review', 'mapped_candidate', 'unverified'].includes(match.dataStatus);
}

function createReportId(): string {
  return `label-report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReportText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
