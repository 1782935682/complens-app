# Product Code Image-Level Evaluation

Generated: 2026-06-21T11:31:40.546Z

Scope: 条形码 / 二维码图片级合成样本解码评测，并链接商品数字码 500 解析级门禁

Activation: 食品包装 OCR 500 样本稳定且商品码解析级门禁通过后执行。

## Metrics

- totalImageCases: 1000
- passedImageCases: 983
- failedImageCases: 17
- imageAccuracy: 98.3%
- targetCasesPerImageType: 500
- targetAccuracy: 95%
- syntheticImageGatePass: yes
- printedCodeParsingPass: yes
- combinedBarcodeQrPrintedGatePass: yes
- realDeviceImageGatePass: no

## By Image Type

- barcode_image: 500/500, accuracy 100%
- qrcode_image: 483/500, accuracy 96.6%

## Linked Printed Code Parsing

- sourceReport: reports/ocr/product-code-evaluation-report.json
- printed_code: 500/500, accuracy 100%

## Environment

- qrencodeAvailable: yes
- browserBarcodeDetectorAvailable: no
- nativeOcrAvailable: no

## Limitations

- 本报告使用可重复生成的 PNG 图片样本验证图片级解码链路，不等同于微信真机扫码或真实包装照片验收。
- 当前 Chromium 环境没有 BarcodeDetector，本脚本使用本地 PNG 读码器验证生成图片；微信小程序原生扫码 Provider 仍需真机补充。
- 本机 RapidOCR / tesseract 不可用时，包装印刷商品数字码的图片 OCR 不在本报告内声明通过；其 500 门禁继续引用 product-code:evaluate 的文本解析结果。

## Failed Cases

- qrcode-image-47: expected {"kind":"qrcode","normalizedCode":"6916000000473","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-57: expected {"kind":"qrcode","normalizedCode":"6916000000572","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error"]
- qrcode-image-72: expected {"kind":"qrcode","normalizedCode":"6916000000725","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error locator degree does not match number of roots"]
- qrcode-image-162: expected {"kind":"qrcode","normalizedCode":"6916000001623","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error.checkAndNudgePoints "]
- qrcode-image-168: expected {"kind":"qrcode","normalizedCode":"","contentType":"text"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Couldn't find enough finder patterns:2 patterns found"]
- qrcode-image-222: expected {"kind":"qrcode","normalizedCode":"6916000002224","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error"]
- qrcode-image-237: expected {"kind":"qrcode","normalizedCode":"6916000002378","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error readFormatInformation"]
- qrcode-image-267: expected {"kind":"qrcode","normalizedCode":"6916000002675","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error"]
- qrcode-image-386: expected {"kind":"qrcode","normalizedCode":"6916000003863","contentType":"product_code"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-387: expected {"kind":"qrcode","normalizedCode":"6916000003870","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error"]
- qrcode-image-388: expected {"kind":"qrcode","normalizedCode":"","contentType":"text"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error"]
- qrcode-image-430: expected {"kind":"qrcode","normalizedCode":"6916000004303","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-453: expected {"kind":"qrcode","normalizedCode":"","contentType":"text"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-455: expected {"kind":"qrcode","normalizedCode":"6916000004556","contentType":"url"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-463: expected {"kind":"qrcode","normalizedCode":"","contentType":"text"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-474: expected {"kind":"qrcode","normalizedCode":"","contentType":"text"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
- qrcode-image-496: expected {"kind":"qrcode","normalizedCode":"6916000004969","contentType":"product_code"}, actual {"kind":"unknown","normalizedCode":"","contentType":"unknown"}, errors ["Error getVersionForNumber"]
