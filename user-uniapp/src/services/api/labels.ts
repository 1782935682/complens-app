import type { LabelClassification } from '@/types';
import { classifyLabelText } from '@/utils/labelClassifier';

export async function classifyLabelWithAdapter(text: string): Promise<LabelClassification> {
  const localResult = classifyLabelText(text);
  return {
    ...localResult,
    mockOnly: true,
    reasons: [
      ...localResult.reasons,
      'mock only：后端 POST /api/labels/classify 尚未实现，当前为前端本地判断。'
    ]
  };
}
