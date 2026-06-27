# OCR Evaluation Report

Generated: 2026-06-27T01:57:56.537Z

Source: Open Food Facts public API and product image URLs

OCR service: http://127.0.0.1:8000

## Metrics

| Metric | Value |
| --- | ---: |
| totalSamples | 100 |
| passedSamples | 99 |
| failedSamples | 1 |
| overallPassRate | 99% |
| categoryCount | 11 |
| maturityStage | build_100_gold |
| expansionReady | no |
| finalTargetSamples | 500 |
| coreSamples | 100 |
| coreIngredientSamples | 100 |
| coreNutritionSamples | 0 |
| invalidSampleCount | 0 |
| weakOcrSampleCount | 0 |
| ingredientsAccuracy | 99% |
| nutritionAccuracy | 100% |
| coreIngredientsAccuracy | 99% |
| coreNutritionAccuracy | 100% |
| ingredientFalsePositiveRate | 100% |
| nutritionAsIngredientRate | 0% |
| otherAsIngredientRate | 0% |
| uncertainWithReasonRate | 100% |
| chatgptAverageScore | skipped |
| deepseekAverageScore | skipped |
| acceptancePass | no |

## Failure Top 10

- ingredients_low_overlap: 1

## Failed Samples

- 00825702-ingredients (biscuits_bread:ingredients): ingredients_low_overlap

## Sample Source Issues

- none
