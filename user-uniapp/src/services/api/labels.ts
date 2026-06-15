import { labelTypeLabels } from '@/constants/labelTypes';
import type { LabelClassification } from '@/types';
import { classifyLabelText } from '@/utils/labelClassifier';
import { requestJson } from './client';

type LabelClassifyResponse = Partial<LabelClassification>;

export async function classifyLabelWithAdapter(text: string): Promise<LabelClassification> {
  try {
    const response = await requestJson<LabelClassifyResponse>('/labels/classify', {
      method: 'POST',
      authMode: 'none',
      data: { text },
      timeoutMs: 5000
    });
    return normalizeClassificationResponse(response);
  } catch {
    const localResult = classifyLabelText(text);
    return {
      ...localResult,
      fallbackOnly: true,
      reasons: [
        ...localResult.reasons,
        '后端标签分类暂不可用，当前使用本地规则辅助判断。'
      ]
    };
  }
}

function normalizeClassificationResponse(response: LabelClassifyResponse): LabelClassification {
  const fallback = classifyLabelText('');
  return {
    labelType: normalizeLabelType(response.labelType, fallback.labelType),
    confidence: clampConfidence(response.confidence),
    requiresUserSelection: Boolean(response.requiresUserSelection),
    reasons: Array.isArray(response.reasons) && response.reasons.length
      ? response.reasons.map((reason) => String(reason || '').trim()).filter(Boolean)
      : fallback.reasons
  };
}

function normalizeLabelType(value: unknown, fallback: LabelClassification['labelType']): LabelClassification['labelType'] {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(labelTypeLabels, value)
    ? value as LabelClassification['labelType']
    : fallback;
}

function clampConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}
