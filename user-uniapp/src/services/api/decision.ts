import type { AttentionSettings, ComparisonResult, LabelReport } from '@/types';
import { requestJson } from './client';

type DecisionSide = 'left' | 'right' | 'tie';

type DecisionCompareResponse = {
  schemaVersion?: string;
  healthier?: DecisionSide;
  lowerRisk?: DecisionSide;
  betterForProfile?: DecisionSide;
  summary?: string;
  reasons?: string[];
};

export async function compareReportsWithAdapter(
  left: LabelReport,
  right: LabelReport,
  attention: AttentionSettings
): Promise<ComparisonResult | null> {
  try {
    const response = await requestJson<DecisionCompareResponse>('/decision/compare', {
      method: 'POST',
      authMode: 'none',
      timeoutMs: 12000,
      data: {
        left: buildDecisionInput(left),
        right: buildDecisionInput(right),
        userProfile: buildDecisionUserProfile(attention)
      }
    });
    return normalizeComparisonResponse(response);
  } catch {
    return null;
  }
}

function buildDecisionInput(report: LabelReport): { labelText: string; productName?: string } {
  const source = report.analysisSource;
  const ingredientText = source?.ingredientText || report.ingredientSection.items
    .map((item) => item.ingredientName || item.normalizedText)
    .filter(Boolean)
    .join('、');
  const nutritionText = source?.nutritionText || report.nutritionSection.fields
    .filter((item) => item.value.trim())
    .map((item) => `${item.label}${item.value}${item.unit}`)
    .join(' ');
  const labelText = [
    report.rawText,
    source?.productNameText,
    source?.foodTypeText,
    ingredientText ? `配料表：${ingredientText}` : '',
    nutritionText ? `营养成分表：${nutritionText}` : '',
    source?.allergenText,
    source?.frontClaimsText,
    source?.productionDateText
  ].filter(Boolean).join('\n').trim() || report.summarySentence || report.title || report.productName;
  return {
    labelText,
    productName: report.productName || source?.productNameText || undefined
  };
}

function buildDecisionUserProfile(attention: AttentionSettings) {
  const goals = attention.targetGoals.length
    ? attention.targetGoals
    : attention.primaryGoal === 'daily' ? [] : [attention.primaryGoal];
  return {
    goals,
    allergens: attention.allergens,
    forChild: attention.isChildrenMode || goals.includes('children')
  };
}

function normalizeComparisonResponse(response: DecisionCompareResponse): ComparisonResult {
  return {
    healthier: normalizeSide(response.healthier),
    lowerRisk: normalizeSide(response.lowerRisk),
    betterForProfile: normalizeSide(response.betterForProfile),
    summary: String(response.summary || '').trim() || '两款接近，优先看糖、钠、脂肪和过敏项。',
    reasons: Array.isArray(response.reasons)
      ? response.reasons.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : []
  };
}

function normalizeSide(value: unknown): DecisionSide {
  return value === 'left' || value === 'right' || value === 'tie' ? value : 'tie';
}
