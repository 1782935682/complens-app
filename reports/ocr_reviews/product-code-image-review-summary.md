# Product Code Image-Level Deep Review Summary

Generated: 2026-06-21T12:09:23.229Z

## Gate Metrics

- totalImageCases: 1000
- passedImageCases: 983
- failedImageCases: 17
- imageAccuracy: 98.3%
- syntheticImageGatePass: yes
- printedCodeParsingPass: yes
- combinedBarcodeQrPrintedGatePass: yes
- realDeviceImageGatePass: no

## By Image Type

- barcode_image: 500/500, accuracy 100%
- qrcode_image: 483/500, accuracy 96.6%

## Codex Sub Agent Review

- pass: yes
- score: 92
- riskLevel: medium
- readyForSyntheticImageGate: yes
- readyForRealDeviceImageGate: no
- readyForProductCodeStage: yes
- launchReadiness: 工程门禁可判定通过：barcode_image=500 PNG、qrcode_image=500 PNG，整体准确率98.3%，barcode_image准确率100%，qrcode_image准确率96.6%，均达到95%；linked printed_code 500解析门禁也已通过。但真实设备扫码未完成，realDeviceImageGatePass=false，因此不能作为真实包装照片或微信真机扫码上线验收通过。
- issues:
  - [medium] reports/ocr_reviews/product-code-review-summary.md: 汇总报告生成时间早于图片级评测报告，仍停留在“图片级扫码识别未证明”的旧结论；如果它被作为最终汇总，会漏掉后续 synthetic PNG image gate 已通过的信息。
  - [medium] reports/ocr/product-code-image-evaluation-report.json: realDeviceImageGatePass=false，真实包装照片和微信真机扫码验收仍未完成；本阶段只能判定可重复合成 PNG 图片级工程门禁通过，不能判定真实设备图片门禁或上线扫码验收完成。
- suggestions:
  - 更新 product-code-review-summary.md，使其同时表达：synthetic image gate 已通过，real device image gate 未通过。
  - 继续补充微信真机扫码、真实包装照片、反光、模糊、倾斜、局部遮挡、低光等真实场景样本。
  - 保持来源边界：二维码 URL 和 GTIN 只作为商品身份线索，不作为包装实拍 OCR、官方法规、配料或营养证据。

## DeepSeek Report Review

- pass: yes
- score: 98
- riskLevel: low
- readyForSyntheticImageGate: yes
- readyForRealDeviceImageGate: no
- readyForProductCodeStage: yes
- launchReadiness: synthetic_image_gate_passed
- issues:
  - qrcode_image 准确率 96.6% 虽超过 95% 门槛，但仍有 17 个失败案例，需排查解码器兼容性问题
  - 报告明确标注合成 PNG 不等同于微信真机扫码或真实包装照片验收，但未提及真实设备扫码门禁的后续计划
- suggestions:
  - 修复 qrcode 解码器对特定版本/纠错级别的兼容性，减少失败案例
  - 补充真实设备扫码门禁的测试计划和时间表

## Combined Decision

- readyForSyntheticImageGate: yes
- readyForRealDeviceImageGate: no
- readyForProductCodeStage: yes
