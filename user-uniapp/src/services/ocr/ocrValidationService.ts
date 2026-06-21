import type { OcrSectionClassification } from './ocrSectionClassifier';

export type OcrValidationIssueCode =
  | 'nutrition_in_ingredients'
  | 'ingredients_in_nutrition'
  | 'other_text_in_ingredients'
  | 'advertising_in_ingredients'
  | 'production_info_in_ingredients'
  | 'insufficient_ocr_text'
  | 'missing_structured_section'
  | 'uncertain_without_reason'
  | 'ai_source_not_marked'
  | 'ai_notice_missing'
  | 'ai_search_without_label_text';

export interface OcrValidationIssue {
  code: OcrValidationIssueCode;
  severity: 'high' | 'medium' | 'low';
  message: string;
  evidence: string;
}

export interface OcrValidationInput {
  classification: OcrSectionClassification;
  usedAiSearch?: boolean;
  aiNotice?: string;
  aiSearchSummary?: string;
  aiIngredientsText?: string;
  aiNutritionText?: string;
}

export interface OcrValidationResult {
  pass: boolean;
  issues: OcrValidationIssue[];
  uncertainReasons: string[];
}

export function validateOcrExtraction(input: OcrValidationInput): OcrValidationResult {
  const issues: OcrValidationIssue[] = [];
  const { classification } = input;
  const ingredientsText = classification.ingredientsText;
  const nutritionText = classification.nutritionText;
  const rawText = classification.layout.rawText;

  if (!rawText.trim()) {
    issues.push(issue('insufficient_ocr_text', 'high', 'OCR 没有返回可用文字，不能生成确定报告。', 'empty rawText'));
  }
  if (!ingredientsText && !nutritionText && !classification.normalizedCode) {
    issues.push(issue('missing_structured_section', 'medium', '未识别到配料表、营养成分表或商品编码。', rawText.slice(0, 120)));
  }
  if (ingredientsText && hasNutritionTableEvidence(ingredientsText)) {
    issues.push(issue('nutrition_in_ingredients', 'high', '营养成分表内容进入了配料表字段。', ingredientsText));
  }
  if (nutritionText && ingredientAnchorPattern.test(nutritionText)) {
    issues.push(issue('ingredients_in_nutrition', 'high', '配料表内容进入了营养字段。', evidence(nutritionText, ingredientAnchorPattern)));
  }
  if (ingredientsText && otherSignalPattern.test(ingredientsText)) {
    issues.push(issue('other_text_in_ingredients', 'medium', '生产、标准、厂商或食用方法进入了配料表字段。', evidence(ingredientsText, otherSignalPattern)));
  }
  if (ingredientsText && advertisingPattern.test(ingredientsText)) {
    issues.push(issue('advertising_in_ingredients', 'medium', '广告语或卖点文案进入了配料表字段。', evidence(ingredientsText, advertisingPattern)));
  }
  if (ingredientsText && productionPattern.test(ingredientsText)) {
    issues.push(issue('production_info_in_ingredients', 'medium', '生产日期或保质期进入了配料表字段。', evidence(ingredientsText, productionPattern)));
  }
  if (classification.uncertainText.length && !classification.reasons.some((reason) => reason.includes('uncertain') || reason.includes('detected_type'))) {
    issues.push(issue('uncertain_without_reason', 'low', '存在未确认线索，但没有记录明确原因。', classification.uncertainText.join('\n').slice(0, 120)));
  }
  if (input.usedAiSearch) {
    if (!input.aiNotice || !/AI|联网搜索|包装实物|实物标注/.test(input.aiNotice)) {
      issues.push(issue('ai_notice_missing', 'high', '使用 AI 联网搜索时缺少明显提示。', input.aiNotice || 'empty aiNotice'));
    }
    if ((input.aiIngredientsText || input.aiNutritionText) && !/AI|联网搜索|DeepSeek/.test(input.aiSearchSummary || input.aiNotice || '')) {
      issues.push(issue('ai_source_not_marked', 'high', 'AI 搜索补全的配料或营养信息没有明确标注来源。', input.aiSearchSummary || 'empty aiSearchSummary'));
    }
    if (!ingredientsText && !nutritionText && !input.aiIngredientsText && !input.aiNutritionText) {
      issues.push(issue('ai_search_without_label_text', 'medium', 'AI 搜索未补齐配料或营养表，报告必须提示信息不足。', input.aiSearchSummary || 'AI search used'));
    }
  }

  return {
    pass: !issues.some((item) => item.severity === 'high' || item.severity === 'medium'),
    issues,
    uncertainReasons: classification.uncertainText.length
      ? ['未匹配到配料、营养、商品编码、商品信息或明确生产/广告类字段。']
      : []
  };
}

function issue(code: OcrValidationIssueCode, severity: OcrValidationIssue['severity'], message: string, evidenceText: string): OcrValidationIssue {
  return {
    code,
    severity,
    message,
    evidence: evidenceText.slice(0, 180)
  };
}

function evidence(text: string, pattern: RegExp): string {
  const line = String(text || '').split(/\r?\n/).find((item) => pattern.test(item));
  return line || text.slice(0, 180);
}

function hasNutritionTableEvidence(value: string): boolean {
  const text = String(value || '');
  if (/营养成分|NRV|营养素参考值|nutrition\s*(?:facts|information)|每\s*100\s*(?:g|克|ml|毫升)|amount\s+per\s+serving/i.test(text)) return true;
  const nutrientLines = text.split(/\r?\n/)
    .filter((line) => /(能量|蛋白质|脂肪|碳水化合物|钠|energy|calories|sodium|carbohydrate|sugars?|dietary\s*fiber|saturated\s*fat|trans\s*fat)[^\n]{0,24}\d+(?:\.\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|%)/i.test(line));
  if (nutrientLines.length >= 2) return true;
  const compact = text.replace(/\s+/g, ' ');
  const nutrientHits = ['能量', '蛋白质', '脂肪', '碳水化合物', '钠', 'energy', 'calories', 'sodium', 'carbohydrate', 'sugar', 'fat']
    .filter((keyword) => compact.toLowerCase().includes(keyword.toLowerCase())).length;
  return nutrientHits >= 3 && /\d+(?:\.\d+)?\s*(?:kJ|kj|KJ|kcal|g|mg|克|毫克|%)/i.test(compact);
}

const ingredientAnchorPattern = /配\s*料\s*(?:表|衰)?|食品配料|原料|ingredients?/i;
const otherSignalPattern = /执行标准|食品生产许可证|生产商|制造商|经销商|地址|电话|贮存|储存|食用方法|注意事项|产地|净含量|规格/i;
const advertisingPattern = /0蔗糖|零蔗糖|0糖|零糖|低脂|高钙|高蛋白|非油炸|甄选原料|营养美味|新鲜|天然|美味|活动/i;
const productionPattern = /生产日期|制造日期|保质期|批号|见喷码|见包装|有效期/i;
