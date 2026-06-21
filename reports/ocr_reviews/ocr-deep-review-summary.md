# OCR Deep Review Summary

Generated: 2026-06-21T11:10:07.763Z

## Gate Metrics

- totalSamples: 500
- overallPassRate: 98.8%
- ingredientsAccuracy: 99.33%
- nutritionAccuracy: 99.33%
- coreIngredientsAccuracy: 99.33%
- coreNutritionAccuracy: 99.33%
- invalidSampleCount: 0
- weakOcrSampleCount: 0
- acceptancePass: yes

## Codex Sub Agent Review

- pass: yes
- score: 92
- riskLevel: medium
- launchReadiness: 食品包装非条码/二维码OCR 500样本门禁可以通过，并允许进入条码/二维码/商品码评测阶段；当前仍不等于生产全量发布完成，混合版面互串问题需作为下一阶段并行P1修复。
- issues:
  - 500样本门禁核心指标已达标：totalSamples=500，passedSamples=494，overallPassRate=98.8%，高于95%门槛。
  - coreIngredientSamples=150、coreNutritionSamples=150，均满足各不少于150的要求；invalidSampleCount=0、weakOcrSampleCount=0。
  - ingredientsAccuracy、nutritionAccuracy、coreIngredientsAccuracy、coreNutritionAccuracy均为99.33%，满足>=95%要求。
  - DeepSeek Review averageScore=91.9，highRisk=0，满足>=85且无high risk要求。
  - acceptancePass=false的当前阻塞原因是chatgptAverageScore=null；从本次子agent review判断，数值门禁本身可以通过。
  - 8000500023976-ingredients已不再是high risk；配料主体覆盖完整，仍有顺序错乱、otherText重复和配料计数偏低问题，但不阻塞500样本门禁。
  - 剩余6个失败样本中有3个ingredients/nutrition互串相关失败，属于混合版面/多区域标签的残余风险；数量未形成阻塞下一阶段的系统性失败，但应作为P1回归样本继续修复。
- suggestions:
  - 将00825702-ingredients、00101622-nutrition、0196633934901-nutrition、0070662404027-nutrition、4006952002013-nutrition、0711535511571-front固定为下一轮回归样本。
  - 进入条码/二维码/商品码阶段前，不需要等到500样本100%通过；但应保留混合版面互串样本的P1修复任务。
  - 对同时出现ingredient_anchor和nutrition_anchor的样本降低自动结论置信度，优先进入文本确认或分区提示。
  - 8000500023976-ingredients建议继续优化英文连写、过敏原声明归类和配料分隔，但不作为门禁阻塞项。

## DeepSeek Report Review

- pass: yes
- score: 92
- riskLevel: medium
- launchReadiness: 食品包装非条码/二维码OCR 500样本门禁可以通过，并允许进入条码/二维码/商品码评测阶段；当前仍不等于生产全量发布完成，混合版面互串问题需作为下一阶段并行P1修复。
- issues:
  - 500样本门禁核心指标已达标：totalSamples=500，passedSamples=494，overallPassRate=98.8%，高于95%门槛。
  - coreIngredientSamples=150、coreNutritionSamples=150，均满足各不少于150的要求；invalidSampleCount=0、weakOcrSampleCount=0。
  - ingredientsAccuracy、nutritionAccuracy、coreIngredientsAccuracy、coreNutritionAccuracy均为99.33%，满足>=95%要求。
  - DeepSeek Review averageScore=90.6，highRisk=0，满足>=85且无high risk要求。
  - ChatGPT Review averageScore=92，但存在8个pending样本（API Key未配置），需补充完整review以消除medium risk。
  - 剩余6个失败样本中有3个ingredients/nutrition互串相关失败，属于混合版面/多区域标签的残余风险；数量未形成阻塞下一阶段的系统性失败，但应作为P1回归样本继续修复。
  - 样本0711535511571-front因insufficient_ocr_text失败，需确认图像质量或补充样本。
- suggestions:
  - 将00825702-ingredients、00101622-nutrition、0196633934901-nutrition、0070662404027-nutrition、4006952002013-nutrition、0711535511571-front固定为下一轮回归样本。
  - 进入条码/二维码/商品码阶段前，不需要等到500样本100%通过；但应保留混合版面互串样本的P1修复任务。
  - 对同时出现ingredient_anchor和nutrition_anchor的样本降低自动结论置信度，优先进入文本确认或分区提示。
  - 配置ChatGPT API Key后，重新运行完整ChatGPT Review以消除pending样本的medium risk。
  - 对0711535511571-front检查图像是否有效，若图像损坏则替换样本。

## Combined Decision

- readyFor500Gate: yes
- readyForBarcodeQrCodeStage: yes
