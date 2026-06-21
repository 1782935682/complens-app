# OCR Evaluation Report

Generated: 2026-06-21T10:58:46.378Z

Source: Open Food Facts public API and product image URLs

OCR service: http://127.0.0.1:8000

## Metrics

| Metric | Value |
| --- | ---: |
| totalSamples | 500 |
| passedSamples | 494 |
| failedSamples | 6 |
| overallPassRate | 98.8% |
| categoryCount | 38 |
| maturityStage | stable_500 |
| expansionReady | yes |
| finalTargetSamples | 500 |
| coreSamples | 300 |
| coreIngredientSamples | 150 |
| coreNutritionSamples | 150 |
| invalidSampleCount | 0 |
| weakOcrSampleCount | 0 |
| ingredientsAccuracy | 99.33% |
| nutritionAccuracy | 99.33% |
| coreIngredientsAccuracy | 99.33% |
| coreNutritionAccuracy | 99.33% |
| ingredientFalsePositiveRate | 0% |
| nutritionAsIngredientRate | 0.2% |
| otherAsIngredientRate | 0% |
| uncertainWithReasonRate | 100% |
| chatgptAverageScore | 92 |
| deepseekAverageScore | 90.6 |
| acceptancePass | yes |

## Failure Top 10

- ingredients_in_nutrition: 2
- ingredients_low_overlap: 1
- nutrition_in_ingredients: 1
- nutrition_missing: 1
- insufficient_ocr_text: 1

## Failed Samples

- 00825702-ingredients (biscuits_bread:ingredients): ingredients_low_overlap
- 00101622-nutrition (off_ingredients_selected:nutrition): ingredients_in_nutrition
- 0196633934901-nutrition (biscuits_bread:nutrition): ingredients_in_nutrition
- 0070662404027-nutrition (beverage:nutrition): nutrition_in_ingredients
- 4006952002013-nutrition (biscuits_bread:nutrition): nutrition_missing
- 0711535511571-front (beverage:front_or_claims): productName_missing, brand_missing, insufficient_ocr_text

## Sample Source Issues

- none
