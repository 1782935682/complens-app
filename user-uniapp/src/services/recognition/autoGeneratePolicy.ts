import type { OcrResult } from '@/types';
import type { LabelTextConfidence, LabelTextSourceType } from '@/utils/labelTextExtractor';

interface AutoGenerateRecognitionInput {
  enabled: boolean;
  canGenerate: boolean;
  hasAnyLabelText: boolean;
  hasRecognizedIdentity: boolean;
  hasAiSearchLabelText: boolean;
  isNutritionOnly: boolean;
  isFrontOnly: boolean;
  confidence: LabelTextConfidence;
  sourceType: LabelTextSourceType;
  ocrMode?: OcrResult['mode'];
}

export function shouldAutoGenerateRecognitionResult(input: AutoGenerateRecognitionInput): boolean {
  if (!input.enabled || !input.canGenerate) return false;
  if (input.sourceType === 'manual') return false;
  if (!input.hasAnyLabelText && !input.hasRecognizedIdentity) return false;
  if (input.ocrMode === 'fallback' && !input.hasAiSearchLabelText) return false;
  if (input.confidence === 'low') {
    return input.hasAiSearchLabelText;
  }
  return true;
}
