# OCR Sample Cache Report

Generated: 2026-06-21T10:25:05.755Z

## Summary

- 目标缓存样本数：500
- manifest 样本数：499
- 本地缓存成功：500
- 本地缓存失败：0
- 覆盖类别数：38
- 是否达到后续 OCR 评测门槛：是

## Attempts

- round 1: candidates 499, cached 499, failed 0
- round 2: candidates 580, cached 500, failed 0

## Category Coverage

- beverage:ingredients: 35
- condiment:ingredients: 10
- ready_meal_curry:ingredients: 1
- puffed_snack:ingredients: 28
- dairy_yogurt:ingredients: 26
- off_ingredients_selected:ingredients: 17
- frozen_food:ingredients: 3
- off_nutrition_selected:ingredients: 8
- imported_food:ingredients: 3
- biscuits_bread:ingredients: 16
- mixed_language:ingredients: 1
- instant_noodle:ingredients: 1
- children_food:ingredients: 1
- beverage:nutrition: 40
- ready_meal_curry:nutrition: 1
- dairy_yogurt:nutrition: 21
- off_ingredients_selected:nutrition: 4
- off_nutrition_selected:nutrition: 8
- biscuits_bread:nutrition: 19
- imported_food:nutrition: 3
- puffed_snack:nutrition: 32
- condiment:nutrition: 13
- frozen_food:nutrition: 7
- instant_noodle:nutrition: 1
- mixed_language:nutrition: 1
- dairy_yogurt:front_or_claims: 34
- puffed_snack:front_or_claims: 31
- beverage:front_or_claims: 61
- off_ingredients_selected:front_or_claims: 14
- off_nutrition_selected:front_or_claims: 17
- frozen_food:front_or_claims: 1
- biscuits_bread:front_or_claims: 23
- condiment:front_or_claims: 10
- imported_food:front_or_claims: 5
- public_news:mixed_back_label: 1
- production_date:date_code_only: 1
- production_date:front_date: 1
- instant_noodle:front_or_claims: 1

## Failure Top 10

- none

## Failed Samples

- none

## Policy

- 只缓存公开可访问图片用于本地评测，不把版权不确定图片打包进正式产品。
- 后续 `npm run ocr:evaluate` 只应在本地缓存达到目标数量后执行。
- 若缓存不足 500，需要继续搜索公开样本并替换不可达 URL，不能用失败样本凑数。
