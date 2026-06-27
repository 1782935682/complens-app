# eval:all report

- product: 成分镜
- iterationId: chengfenjing-iteration-0080
- finishedAt: 2026-06-27T02:33:26.109Z
- resumedFromCheckpoint: true
- reviewAgent: passed
- iterationReport: reports/evaluation/iterations/chengfenjing-iteration-0080.md

## Metrics

| metric | value |
| --- | ---: |
| ocrAccuracy | 0.99 |
| ocrStrictAccuracy | 0.99 |
| ingredientRecognitionAccuracy | 0.99 |
| ingredientStrictAccuracy | 0.99 |
| nutritionParsingAccuracy | 1 |
| nutritionStrictAccuracy | 1 |
| barcodeQrAccuracy | 1 |
| decisionConsistency | 1 |
| evaluationCasePassRate | 1 |
| comparisonMatchRate | 1 |
| userBehaviorMatchRate | 1 |
| stability_score | 1 |
| regression_detection | 1 |
| decision_quality_score | 1 |
| ui_clarity_score | 1 |

## Failed Tasks

- none

## UI Changes

- home remains one photo-recognition entry
- result page keeps conclusion/risk/alternative three-card decision UI
- risk card uses nutrition tiles and risk-meter visuals instead of long analysis
- result page supports save recommendation / avoid-list behavior
- compare page keeps visual A/B status badges and segmented winners

## Function Changes

- review-agent added to backend agent trace
- comparison evaluation cases added for sugar, children, and allergy profiles
- eval:all now records stability_score, regression_detection, decision_quality_score, and ui_clarity_score
- checkpoint now records iteration_id, ui_state, decision_quality, failed_cases, and next_actions

## Next Tasks

- continue UI-first decision visualization
- keep fixing blocking OCR samples without weakening decision quality