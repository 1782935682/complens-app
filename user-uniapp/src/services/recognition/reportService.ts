import type { AttentionSettings, IngredientMatch, LabelReport, NutritionField, ParsedIngredient, ReportAnalysisSource } from '@/types';
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
  const qualityWarnings: string[] = [];
  const nutrition = input.nutritionText?.trim()
    ? await parseNutritionWithAdapter(input.nutritionText)
    : localAnalysis.nutrition;
  let matches = localAnalysis.matches;
  if (localAnalysis.ingredients.length) {
    try {
      matches = await matchIngredientsByApi(localAnalysis.ingredients);
    } catch {
      qualityWarnings.push('成分库接口暂不可用，当前仅使用本地规则生成降级结果。');
      matches = localAnalysis.matches;
    }
  }
  if (matches.some((match) => match.sourceType === 'degraded_backend')) {
    qualityWarnings.push('成分库接口暂不可用，当前仅保留未确认配料线索。');
  }
  const sourceMeta = mergeQualityWarnings(localAnalysis.report.analysisSource, qualityWarnings);
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
    sourceMeta
  });
  return {
    ...localAnalysis,
    report,
    nutrition,
    matches
  };
}

function mergeQualityWarnings(sourceMeta: ReportAnalysisSource | undefined, warnings: string[]): ReportAnalysisSource | undefined {
  const uniqueWarnings = [...new Set(warnings.map((item) => String(item || '').trim()).filter(Boolean))];
  if (!uniqueWarnings.length || !sourceMeta) return sourceMeta;
  return {
    ...sourceMeta,
    qualityWarnings: [...new Set([...(sourceMeta.qualityWarnings || []), ...uniqueWarnings])]
  };
}
