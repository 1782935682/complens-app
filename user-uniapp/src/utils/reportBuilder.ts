import { allergenOptions, childrenModeKeywords, primaryGoalOptions } from '@/constants/attention';
import type {
  AttentionHit,
  AttentionSettings,
  IngredientMatch,
  LabelReport,
  LabelType,
  NutritionField,
  NutritionIngredientCheck,
  OcrResult,
  ParsedIngredient,
  ReportAnalysisSource,
  ReportSource
} from '@/types';
import { enrichReportDecision } from './decisionRules';

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
  sourceMeta?: ReportAnalysisSource;
}): LabelReport {
  const frontClaimsText = normalizeReportText(input.frontClaimsText);
  const reportMatches = input.matches.map(sanitizeReportMatch);
  const acceptedMatches = reportMatches.filter((match) => match.decision === 'confirmed');
  const attentionHits = buildAttentionHits(input);
  const nutritionIngredientChecks = buildNutritionIngredientChecks(input.ingredients, input.nutrition);
  const focusItems = buildFocusItems(reportMatches, input.nutrition, attentionHits, frontClaimsText);
  const additiveItems = acceptedMatches.filter(isConfirmedDisplayAdditive);
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
    nutritionIngredientChecks,
    frontClaimsSection: {
      text: frontClaimsText,
      highlights: buildFrontClaimHighlights(frontClaimsText)
    },
    additiveGroups: groupAdditives(additiveItems),
    allergenHints: buildAllergenHints(reportMatches),
    unknownItems,
    analysisSource: input.sourceMeta,
    sources: buildSources(acceptedMatches, { allMatches: reportMatches, ocr: input.ocr, sourceMeta: input.sourceMeta }),
    rawText: input.rawText
  };
  return enrichReportDecision(report, input.attention);
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
    sourceNote: '用户已标为暂未收录，已保留为未确认线索。',
    ingredientName: match.normalizedText,
    isAdditive: false
  };
}

function buildSummarySentence(input: { ingredients: ParsedIngredient[]; nutrition: NutritionField[] }, additiveCount: number, hits: AttentionHit[], frontClaimsText: string): string {
  const parts: string[] = [];
  const visibleHits = hits.filter((hit) => hit.key !== 'daily');
  const nutritionCount = countEffectiveNutritionValues(input.nutrition);
  if (input.ingredients.length) parts.push(`识别到 ${input.ingredients.length} 项配料`);
  if (!input.ingredients.length && !frontClaimsText && nutritionCount === 0) {
    parts.push('未识别到可分析的配料表或营养成分表');
  } else if (!input.ingredients.length && !frontClaimsText) {
    parts.push('未提供配料表');
  }
  if (frontClaimsText) parts.push('包装声明已整理');
  if (additiveCount) parts.push(`看到 ${additiveCount} 种常见食品添加剂`);
  if (nutritionCount >= 2) parts.push(`营养数字已整理 ${nutritionCount} 项`);
  if (nutritionCount === 1) parts.push('只识别到 1 项营养数字，需补拍确认');
  if (visibleHits.length) parts.push(`建议重点查看：${visibleHits.map((hit) => hit.label).slice(0, 3).join('、')}`);
  return parts.length ? `${parts.join('，')}。` : '未识别到可分析的配料表或营养成分表。';
}

function countEffectiveNutritionValues(fields: NutritionField[]): number {
  return fields.filter((field) => !['perUnit', 'servingSize', 'nrvPercent'].includes(field.key) && Boolean(String(field.value || '').trim())).length;
}

function buildAttentionHits(input: {
  ingredients?: ParsedIngredient[];
  sourceMeta?: ReportAnalysisSource;
  frontClaimsText?: string;
  matches: IngredientMatch[];
  nutrition: NutritionField[];
  attention: AttentionSettings;
}): AttentionHit[] {
  const text = [
    input.sourceMeta?.ingredientText,
    input.sourceMeta?.allergenText,
    normalizeReportText(input.frontClaimsText),
    ...(input.ingredients || []).map((item) => item.normalizedText),
    ...input.matches.map((match) => match.normalizedText),
    ...input.nutrition
      .filter(hasNutritionEvidence)
      .map((field) => `${field.label}${field.value}${field.unit}${normalizeReportText(field.sourceText)}`)
  ].join(' ');
  const hits: AttentionHit[] = [];
  selectedPrimaryGoals(input.attention).forEach((primaryGoal) => {
    const primaryTerms = primaryGoal.keywords.filter((term) => text.includes(term));
    if (!primaryTerms.length) return;
    hits.push({
      key: primaryGoal.key,
      label: primaryGoal.label,
      reason: `${primaryGoal.label}相关词已在标签文本中出现。`,
      terms: [...new Set(primaryTerms)]
    });
  });
  if (selectedGoals(input.attention).includes('children')) {
    const childrenTerms = childrenModeKeywords.filter((term) => text.includes(term));
    if (childrenTerms.length) {
      hits.push({
        key: 'children',
        label: '儿童模式',
        reason: '儿童模式关注词已在标签文本中出现。',
        terms: [...new Set(childrenTerms)]
      });
    }
  }
  const allergenHits = allergenOptions
    .filter((option) => input.attention.allergens.includes(option.key))
    .map((option) => ({
      label: option.label,
      terms: option.keywords.filter((term) => text.includes(term))
    }))
    .filter((item) => item.terms.length);
  if (allergenHits.length) {
    hits.push({
      key: 'allergen',
      label: '过敏/忌口',
      reason: '识别到你设置的过敏或忌口关注词。',
      terms: [...new Set(allergenHits.flatMap((item) => item.terms.length ? [item.label] : []))]
    });
  }
  return hits;
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
  if (pending.length) items.push(`有 ${pending.length} 项暂未收录或待确认，已保留为配料线索`);
  return [...new Set(items)].slice(0, 8);
}

function buildNutritionIngredientChecks(ingredients: ParsedIngredient[], nutrition: NutritionField[]): NutritionIngredientCheck[] {
  const ingredientText = normalizeReportText(ingredients.map((item) => item.normalizedText).join(' ')).toLowerCase();
  const sugarMatchedSignals = findMatches(ingredientText, sugarNutritionSignals);
  const sodiumMatchedSignals = findMatches(ingredientText, sodiumNutritionSignals);
  const sugarField = nutrition.find((field) => field.key === 'sugar');
  const sodiumField = nutrition.find((field) => field.key === 'sodium');
  return [
    buildNutritionIngredientCheck({
      key: 'sugar',
      title: '糖',
      nutritionField: sugarField,
      ingredientSignals: sugarMatchedSignals
    }),
    buildNutritionIngredientCheck({
      key: 'sodium',
      title: '钠',
      nutritionField: sodiumField,
      ingredientSignals: sodiumMatchedSignals
    })
  ];
}

function buildNutritionIngredientCheck(options: {
  key: 'sugar' | 'sodium';
  title: string;
  nutritionField?: NutritionField;
  ingredientSignals: string[];
}): NutritionIngredientCheck {
  const valueText = (options.nutritionField?.value || '').trim();
  const hasNutrition = Boolean(valueText);
  const hasSignal = options.ingredientSignals.length > 0;
  const unit = options.nutritionField?.unit || '';
  if (!hasNutrition && !hasSignal) {
    return {
      key: options.key,
      title: `${options.title}线索`,
      nutritionValue: '未抓取到',
      nutritionUnit: '',
      ingredientSignals: [],
      state: 'insufficient_data',
      summary: `没有看到${options.title}相关数字或配料线索。`
    };
  }
  if (!hasNutrition || !hasSignal) {
    return {
      key: options.key,
      title: `${options.title}线索`,
      nutritionValue: hasNutrition ? valueText : '未抓取到',
      nutritionUnit: hasNutrition ? unit : '',
      ingredientSignals: options.ingredientSignals,
      state: 'insufficient_data',
      summary: hasNutrition
        ? `包装上写了${options.title} ${valueText}${unit}，但配料表里没有明显对应词。`
        : `配料表里看到${options.title}相关词：${options.ingredientSignals.join('、')}，但没有看到${options.title}数字。`
    };
  }

  const numericValue = parseNutritionValue(valueText, unit, options.key);
  const threshold = options.key === 'sugar' ? 10 : 300;
  if (numericValue > threshold) {
    return {
      key: options.key,
      title: `${options.title}线索`,
      nutritionValue: valueText,
      nutritionUnit: unit,
      ingredientSignals: [...new Set(options.ingredientSignals)],
      state: 'possible_issue',
      summary: `包装上写了${options.title} ${valueText}${unit}，配料表也看到 ${options.ingredientSignals.join('、')}。`
    };
  }

  return {
    key: options.key,
    title: `${options.title}线索`,
    nutritionValue: valueText,
    nutritionUnit: unit,
    ingredientSignals: [...new Set(options.ingredientSignals)],
    state: 'no_obvious_issue',
    summary: `包装上写了${options.title} ${valueText}${unit}，配料表也看到 ${options.ingredientSignals.join('、')}。`
  };
}

function isConfirmedDisplayAdditive(match: IngredientMatch): boolean {
  return match.isAdditive
    && !['pending_review', 'mapped_candidate', 'unverified', 'unknown_from_ocr'].includes(match.dataStatus);
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
    highlights.push(`包装正面出现 ${[...new Set(matchedLabels)].join('、')}，已和配料表、营养成分表一起整理。`);
  } else {
    highlights.push('包装正面文字已保留，已和配料表、营养成分表一起整理。');
  }
  return highlights;
}

function buildNutritionHighlights(fields: NutritionField[], attention: AttentionSettings): string[] {
  const highlights: string[] = [];
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const goals = selectedGoals(attention);
  if (goals.includes('sugar')) addFieldHighlight(highlights, byKey.get('sugar'), '控糖');
  if (goals.includes('lowSodium')) addFieldHighlight(highlights, byKey.get('sodium'), '低钠');
  if (goals.includes('fatLoss')) {
    addFieldHighlight(highlights, byKey.get('fat'), '减脂');
    addFieldHighlight(highlights, byKey.get('transFat'), '减脂');
  }
  if (goals.includes('children')) {
    addFieldHighlight(highlights, byKey.get('sugar'), '儿童模式');
    addFieldHighlight(highlights, byKey.get('sodium'), '儿童模式');
  }
  if (!highlights.length && fields.some((field) => field.value)) highlights.push('营养数字已整理。');
  return highlights;
}

function addFieldHighlight(target: string[], field: NutritionField | undefined, goalLabel: string) {
  if (!field?.value) return;
  target.push(`${goalLabel}关注项可查看 ${field.label}：${field.value}${field.unit}${field.nrvPercent ? `，NRV ${field.nrvPercent}` : ''}`);
}

function selectedPrimaryGoals(attention: AttentionSettings) {
  const goals = selectedGoals(attention).filter((goal) => goal !== 'children');
  if (!goals.length) return [primaryGoalOptions[0]];
  return goals
    .map((goal) => primaryGoalOptions.find((item) => item.key === goal))
    .filter((item): item is typeof primaryGoalOptions[number] => Boolean(item));
}

function selectedGoals(attention: AttentionSettings): NonNullable<AttentionSettings['targetGoals']> {
  if (Array.isArray(attention.targetGoals) && attention.targetGoals.length) return attention.targetGoals;
  return [
    attention.primaryGoal !== 'daily' ? attention.primaryGoal : undefined,
    attention.isChildrenMode ? 'children' : undefined
  ].filter((item): item is NonNullable<AttentionSettings['targetGoals']>[number] => Boolean(item));
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
  return otherItems.length ? [...groups, { label: '其他添加剂', items: otherItems }] : groups;
}

function buildAllergenHints(matches: IngredientMatch[]): string[] {
  const text = matches.map((match) => match.normalizedText).join(' ');
  return allergenTerms
    .filter((item) => item.patterns.some((pattern) => text.includes(pattern)))
    .map((item) => `识别到 ${item.label} 相关标示，已列为过敏原线索。`);
}

const allergenTerms = [
  { label: '乳', patterns: ['乳制品', '牛乳', '羊乳', '牛奶', '奶粉', '乳粉', '乳清', '乳糖', '炼乳', '奶油'] },
  { label: '大豆', patterns: ['大豆', '黄豆', '豆粉', '豆乳'] },
  { label: '坚果', patterns: ['坚果', '花生', '杏仁', '核桃', '腰果', '榛子', '开心果'] },
  { label: '麸质', patterns: ['麸质', '小麦', '麦麸', '面粉', '燕麦'] },
  { label: '蛋', patterns: ['鸡蛋', '蛋黄', '蛋清', '全蛋', '蛋粉', '蛋类'] },
  { label: '海鲜', patterns: ['海鲜', '虾', '蟹', '鱼', '贝类'] }
];

function buildSources(matches: IngredientMatch[], options: { allMatches?: IngredientMatch[]; ocr?: OcrResult; sourceMeta?: ReportAnalysisSource } = {}): ReportSource[] {
  const allMatches = options.allMatches ?? matches;
  const sources: ReportSource[] = [];
  if (options.sourceMeta?.sourceType === 'ai_search_product_label') {
    sources.push({
      label: 'AI 联网公开标签线索',
      detail: options.sourceMeta.aiNotice || 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
      sourceType: 'ai_search'
    });
  } else if (options.sourceMeta?.sourceType === 'product_identity') {
    const hasIdentitySource = hasProductIdentitySource(options.sourceMeta);
    sources.push({
      label: hasIdentitySource ? '商品身份线索' : '识别信息不足',
      detail: hasIdentitySource
        ? '本次只识别到商品名、品牌、商品码或二维码等身份线索，未获得可用配料表或营养成分表。'
        : '本次未识别到可用标签文字或商品身份线索，已按信息不足处理。',
      sourceType: hasIdentitySource
        ? options.sourceMeta.qrContent ? 'qr_recognition' : 'barcode_recognition'
        : 'recognition_insufficient'
    });
  } else if (options.sourceMeta?.sourceType === 'manual_input') {
    sources.push({
      label: '手动输入内容',
      detail: '结果基于用户手动输入或粘贴的食品标签文字生成，未替代包装原文。',
      sourceType: 'manual_input'
    });
  } else if (options.sourceMeta?.sourceType === 'demo_sample') {
    sources.push({
      label: '示例标签文本',
      detail: '结果基于内置示例文本生成，不代表真实商品。',
      sourceType: 'mock_adapter'
    });
  } else {
    sources.push({
      label: '包装 OCR 识别文本',
      detail: '结果基于本次拍照识别出的食品标签文字生成，OCR 识别文字不是权威来源，请结合包装文字确认。',
      sourceType: 'ocr_input'
    });
  }
  sources.push(
    {
      label: '我的关注项',
      detail: '关注项保存在本机，用于排序和提示，不作为医疗或营养建议。',
      sourceType: 'manual_input'
    }
  );
  if (options.ocr?.mode === 'mock' || options.ocr?.provider === 'mock') {
    sources.push({
      label: 'mock only OCR',
      detail: '本次 OCR 文本来自 mock provider，仅用于开发或降级演示。',
      sourceType: 'mock_adapter'
    });
  }
  if (options.sourceMeta?.recognition?.normalizedCode) {
    sources.push({
      label: '商品条码 / 编码',
      detail: `已记录商品身份编码 ${options.sourceMeta.recognition.normalizedCode}，用于历史复用，不替代包装配料表。`,
      sourceType: 'barcode_recognition'
    });
  }
  if (options.sourceMeta?.recognition?.qrContent) {
    sources.push({
      label: '包装二维码',
      detail: '已保存二维码原始内容，二维码页面信息只作为商品线索，不替代包装实拍文字。',
      sourceType: 'qr_recognition'
    });
  }
  if (options.sourceMeta?.recognitionSources?.includes('历史缓存')) {
    sources.push({
      label: '历史缓存',
      detail: '本机已确认信息用于补全同一商品标签线索。',
      sourceType: 'product_cache'
    });
  }
  if (options.sourceMeta?.usedAiSearch) {
    sources.push({
      label: 'DeepSeek 联网搜索',
      detail: options.sourceMeta.aiNotice || 'AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。',
      sourceType: 'ai_search'
    });
  }
  if (options.sourceMeta?.aiSearchErrorCode) {
    sources.push({
      label: 'DeepSeek 联网搜索',
      detail: `AI 搜索未获取到完整标签信息（${options.sourceMeta.aiSearchErrorCode}），请补拍配料表 / 营养表或手动补充。`,
      sourceType: 'ai_search'
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
      label: '后端暂不可用（降级）',
      detail: '匹配服务不可用时仅保留暂未收录状态，不伪造成分来源。',
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

function hasProductIdentitySource(sourceMeta: ReportAnalysisSource): boolean {
  return Boolean(
    sourceMeta.productNameText?.trim()
    || sourceMeta.brand?.trim()
    || sourceMeta.normalizedCode?.trim()
    || sourceMeta.qrContent?.trim()
    || sourceMeta.recognition?.productName?.trim()
    || sourceMeta.recognition?.brand?.trim()
    || sourceMeta.recognition?.normalizedCode?.trim()
    || sourceMeta.recognition?.qrContent?.trim()
  );
}

function createReportId(): string {
  return `label-report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReportText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const sugarNutritionSignals = ['麦芽糖浆', '果葡糖浆', '浓缩果汁', '高果糖', '葡萄糖', '果糖浆', '果葡糖'];
const sodiumNutritionSignals = ['谷氨酸钠', '味精', '盐替代', '低钠盐', '氯化钠', '碳酸氢钠', '亚硝酸钠'];

function findMatches(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(normalizeTerm(term)));
}

function normalizeTerm(value: string): string {
  return normalizeReportText(value).toLowerCase();
}

function parseNutritionValue(value: string, unit: string, key: 'sugar' | 'sodium'): number {
  const valueText = value.replace(/,/g, '').trim();
  const match = valueText.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return 0;

  const normalizedUnit = normalizeNutritionUnit(String(unit || '').toLowerCase());
  if (key === 'sodium') {
    if (normalizedUnit === 'g') {
      return numeric * 1000;
    }
    if (normalizedUnit === 'ug') {
      return numeric / 1000;
    }
    return numeric;
  }

  if (key === 'sugar') {
    if (normalizedUnit === 'mg') {
      return numeric / 1000;
    }
    if (normalizedUnit === 'ug') {
      return numeric / 1000000;
    }
    return numeric;
  }

  if (normalizedUnit === 'kcal' || valueText.includes('kcal')) {
    return numeric * 4.184;
  }

  return numeric;
}

function normalizeNutritionUnit(unit: string): string {
  const compactUnit = String(unit || '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (!compactUnit) return '';
  if (compactUnit.includes('kcal') || compactUnit.includes('cal') || compactUnit.includes('千卡') || compactUnit.includes('大卡')) return 'kcal';
  if (compactUnit.includes('kj')) return 'kj';
  if (compactUnit.includes('ug') || compactUnit.includes('μg') || compactUnit.includes('微克')) return 'ug';
  if (compactUnit.includes('mg') || compactUnit.includes('毫克')) return 'mg';
  if (compactUnit.includes('g') || compactUnit.includes('克')) return 'g';
  return compactUnit;
}
