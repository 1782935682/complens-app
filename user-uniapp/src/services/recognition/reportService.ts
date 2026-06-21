import type { AttentionSettings, IngredientMatch, LabelReport, NutritionField, ParsedIngredient } from '@/types';
import { matchIngredientsByApi } from '@/services/api/ingredients';
import { buildLabelReportWithAdapter, parseNutritionWithAdapter } from '@/services/api/labels';
import {
  buildLocalLabelAnalysis,
  type LocalLabelAnalysisInput,
  type LocalLabelAnalysisResult
} from '@/utils/localLabelAnalysis';

export interface ProductAnalysisResult extends LocalLabelAnalysisResult {
  report: LabelReport;
  nutrition: NutritionField[];
  matches: IngredientMatch[];
  ingredients: ParsedIngredient[];
}

export async function buildProductAnalysisReport(input: LocalLabelAnalysisInput & { attention: AttentionSettings }): Promise<ProductAnalysisResult> {
  const localAnalysis = buildLocalLabelAnalysis(input);
  const nutrition = input.nutritionText?.trim()
    ? await parseNutritionWithAdapter(input.nutritionText)
    : localAnalysis.nutrition;
  let matches = localAnalysis.matches;
  if (localAnalysis.ingredients.length) {
    try {
      matches = await matchIngredientsByApi(localAnalysis.ingredients);
    } catch {
      matches = localAnalysis.matches;
    }
  }
  const report = await buildLabelReportWithAdapter({
    productName: input.productName || '',
    rawText: localAnalysis.confirmedText,
    ingredients: localAnalysis.ingredients,
    matches,
    nutrition,
    attention: input.attention,
    labelType: localAnalysis.labelType,
    frontClaimsText: input.frontClaimsText || '',
    ocr: input.ocr,
    sourceMeta: localAnalysis.report.analysisSource
  });
  return {
    ...localAnalysis,
    report,
    nutrition,
    matches
  };
}
