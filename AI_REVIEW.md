# AI Review — 2026-06-21

## 本轮范围

优化“识别商品”主流程：用户仍只从首页点击“拍包装”，系统自动判断图片内容属于条形码、二维码、数字编码、配料表、营养成分表或未知图片，并输出统一的商品分析报告。

本轮未提交任何真实 API Key。DeepSeek 只通过后端环境变量或已有后端配置调用；前端、小程序、文档和仓库均未写入密钥。

## OCR Review 门禁规则

- ChatGPT Review：如果运行环境配置了 `OPENAI_API_KEY`，通过统一 AI Review provider 调用 ChatGPT；如果没有 `OPENAI_API_KEY`，必须使用当前 Codex 会话子 agent 作为 `chatgpt-subagent` 替代审查方。子 agent 需要审查 `reports/ocr/ocr-evaluation-report.json` 和 `reports/ocr_reviews/ocr-review-summary.md`，输出严格 JSON 到 `reports/ocr_reviews/chatgpt-subagent-review.json`，再用 `OCR_EVAL_INCLUDE_CHATGPT_SUBAGENT=1 npm run ocr:evaluate` 纳入汇总。
- DeepSeek Review：只要本机/后端运行环境提供 `DEEPSEEK_API_KEY`，OCR 成熟度评测必须执行 DeepSeek 深度 Review，检查配料表、营养成分表、otherText、报告来源标注、AI 搜索提示和过度推断风险。DeepSeek 平均分低于 85 或存在高风险问题时，不得声明进入下一阶段。
- 两类 Review 都不得伪造结果；缺 Key、网络失败或子 agent 未执行时，报告必须标注 skipped/pending/blocker。
- 当前结果：食品包装非条码 / 二维码 OCR 500 样本门禁已通过；随后启动二维码、条形码、商品数字码各 500 用例解析级评测并通过；条码 / 二维码合成 PNG 图片级工程门禁也已通过。真实包装照片、微信真机扫码和小程序原生扫码 Provider 仍需单独验收，不能把合成图片门禁表述为真机上线验收通过。

## OCR / 商品码门禁结果

- 食品包装 OCR：`494/500` 通过，通过率 `98.8%`，`maturityStage=stable_500`，`acceptancePass=true`；`invalidSampleCount=0`、`weakOcrSampleCount=0`，核心配料 / 营养样本各 `150`。
- OCR AI Review：Codex 子 agent `pass=true`、`score=92`、`riskLevel=medium`；DeepSeek 样本平均分 `90.6`；DeepSeek 报告级 Review `pass=true`、`score=92`、`riskLevel=medium`。
- 商品码解析级评测：`1500/1500` 通过，总准确率 `100%`；条码 `500/500`、二维码 `500/500`、商品数字码 `500/500`。
- 商品码 AI Review：Codex 子 agent `pass=true`、`score=100`、`riskLevel=low`；DeepSeek 报告级 Review `pass=true`、`score=100`、`riskLevel=low`。
- 商品码合成图片级工程评测：`983/1000` 通过，总准确率 `98.3%`；条码图片 `500/500`、二维码图片 `483/500`、并链接商品数字码解析 `500/500`。
- 商品码图片级 AI Review：Codex 子 agent `pass=true`、`score=92`、`riskLevel=medium`；DeepSeek 报告级 Review `pass=true`、`score=98`、`riskLevel=low`。
- 结论边界：商品码解析门禁和合成 PNG 图片级工程门禁已通过；`readyForRealDeviceImageGate=false`，真实包装照片 / 微信真机扫码仍不能声明完成。
- 后续 P1 回归：混合配料表 / 营养表同图互串、`00825702-ingredients` 等 6 个 OCR 残余失败样本、真实模糊 / 倾斜 / 反光 / 局部遮挡条码二维码图片样本、二维码图片级 17 个失败样本。

## 已完成

- 新增前端识别服务分层：`imageRecognitionService`、`barcodeService`、`ocrService`、`productLookupService`、`aiSearchService`、`reportService`，页面不直接承载条码、二维码、OCR、AI 搜索和报告编排逻辑。
- 新增后端 `POST /api/products/lookup` 和 `productLookupService`，仅在缺少包装实拍配料、营养信息时，按商品码、二维码、数字编码、商品名或包装正面线索调用 DeepSeek 查公开标签信息。
- DeepSeek 搜索结果不伪装成包装 OCR：商品名/品牌可作为线索；AI 返回的公开配料表或营养表只有在后端拿到 URL、域名或 Open Food Facts 等可核对公开来源摘要时才可用于参考报告，必须标注为“AI 公开标签线索”，不得显示成包装实拍 OCR、成分事实、法规或医疗结论。AI 搜索写入的历史记录不复用配料 / 营养；只有非 AI 的包装 OCR / 手动输入历史确认文本可复用。
- 报告顶部新增统一识别信息卡，展示识别类型、原始内容摘要、标准化编码、内容类型、商品名、品牌、数据来源和识别时间。
- 使用 DeepSeek 联网搜索时，报告识别卡展示“AI 公开标签线索”标签，并明显展示固定提示：“部分商品信息来自 AI 联网搜索，可能存在过期、缺失或不准确；仅作公开标签线索，不作为包装实拍 OCR、成分事实、法规或医疗结论，请以商品包装实物标注为准。”
- 信息不足报告不硬凑结论，首屏展示已识别到的商品、品牌、商品码、类型或“未识别到可用内容”，再给“补拍配料/营养表”和“手动粘贴文字”两个动作。
- 报告首屏结论改成关注人群口径，例如“控糖人群建议关注糖、碳水｜建议关注份量”或“建议关注钠、热量、脂肪｜建议关注份量”，下面继续用“为什么 / 谁少吃 / 怎么吃”完成决策闭环。
- 首页保持单入口，不新增扫码、条码、二维码、手动编码按钮；删掉多余说明文案，只保留居中“拍包装”、可拍区域短标签和小号“查单个成分”入口。
- 识别历史新增并保存 `imageId`、`detectedType`、`rawContent`、`ocrText`、`normalizedCode`、`qrContent`、`productName`、`brand`、`ingredientsText`、`nutritionText`、`source`、`reportSummary`、`usedAiSearch`、`aiNotice`、`createdAt`；按商品码、二维码和非泛化商品名合并，避免“未命名食品”等泛化名误合并。
- 二维码 URL 补全不再由后端主动抓取任意网页内容，避免 SSRF / DNS rebinding / 大响应体风险；二维码原文只作为 DeepSeek 查询线索和报告识别信息展示。
- 识别结束流程改为直接生成报告：清晰可生成的 OCR 结果直接生成报告；只有商品名、品牌、商品码或二维码时先经 AI 搜索公开标签线索，搜到可核对来源的配料/营养则生成带来源标注的参考报告；搜不到、低置信、OCR 失败或未知图片时生成信息不足报告，不再落到确认页。手动输入或用户从报告主动补充时进入 `manualInput` 文本补充页。`ocr-report-regression` 已固定自动生成策略场景、AI 搜索合并边界、AI 历史缓存不复用配料 / 营养、后端成功旧 OCR source 替换、空识别信息不足报告和 capture 接线断言。

## 评审闭环

ChatGPT 会话子 agent 深度复审：

- verdict: `pass`
- shipBlockers: `none`
- 必须修：无
- 后续增强：DNS pin / egress 策略、微信真机条码/二维码图片解码 Provider、正式 GTIN/数字标签数据源授权。

DeepSeek 综合复审：

- 已采纳修改：AI 搜索免责声明强化为“公开标签线索，不作为包装实拍 OCR、成分事实、法规或医疗结论”；低置信 / identity-only / 识别失败统一生成信息不足报告而不是确认页；AI 搜索失败会在报告顶部提示补拍或手动补充；报告 headline 改成“建议关注 / 建议关注份量”口径；后端 AI 商品补全只有 URL / 域名 / Open Food Facts 等可核对来源摘要才放行配料 / 营养；AI 历史缓存不复用配料 / 营养。
- 当前最新综合复审：`verdict=needs_changes`。仍列出的 ship blockers 主要把 `manualInput` 手动输入状态误判为识别后补充页，并提出首页间距、结论个性化、设计 token、添加剂词表等 broader 产品 / UI 项；本轮代码级 Codex 子 agent 门禁以最终结果为准。
- 输出：`/tmp/complens-deepseek-comprehensive-review.json`。

Codex 子 agent 最终 PR 门禁：

- provider: `codex-subagent-final-narrow-review`
- pass: `true`
- score: `9.4/10`
- riskLevel: `low`
- readyForPr: `true`
- 结论：后端 AI 商品补全不再放行中文泛泛来源摘要，仅按 URL / 域名 / Open Food Facts 等可核对来源摘要放行配料 / 营养；AI 历史缓存不复用配料 / 营养，后续非 AI 已确认文本可覆盖并恢复复用；`buildLabelReportWithAdapter` 后端成功路径会过滤旧 “OCR / 手动确认文本” 和“用户确认后的食品标签文本”，自动 OCR 报告来源替换为“包装 OCR 识别文本”；回归脚本固定上述防线。

视觉截图证据：

- `/tmp/complens-user-visual-smoke/home.png`
- `/tmp/complens-user-visual-smoke/report.png`
- `/tmp/complens-user-visual-smoke/report-insufficient.png`
- 完整目录：`/tmp/complens-user-visual-smoke`

## 真实网络样本

已用本机 RapidOCR 跑 11 个网络真实包装样本，图片只下载到 `/tmp`，不进入仓库。

- 样本数：11
- 可生成报告：6
- 需要补拍/手动补充：5
- OCR 失败：0
- 需要修复：0
- 高优问题：0
- 中优问题：1

唯一中优问题是 `vita-nutrition` 只解析到很少营养数字，当前按预期进入补拍/手动确认，不猜测缺失营养值。

来源包括：

- Open Food Facts 商品页与图片：`4891028706656`、`6902265210504`、`6936749501109`、`6922577790068`
- 光明网新闻图片：`https://m.gmw.cn/2025-04/14/content_1304015064.htm`

输出：

- `/tmp/complens-real-packaging-samples/report.json`
- `/tmp/complens-real-packaging-samples/summary.md`

## 验证

已通过：

- `npm --prefix backend run typecheck`
- `npm --prefix backend test -- tests/productLookup.test.ts`（10 个用例）
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run lint`
- `npm run user:audit:product-output`
- `npm --prefix user-uniapp run regression:ocr-report`
- `npm run user:build:h5`
- `npm run user:visual:smoke`
- `npm run user:build:mp-weixin`
- `npm run user:sample:real-packaging`
- `npm run user:review:deepseek`
- `OCR_LOCAL_URL=http://127.0.0.1:8000 OCR_EVAL_TARGET=500 OCR_EVAL_DISABLE_NETWORK_SAMPLES=1 OCR_EVAL_INCLUDE_CHATGPT_SUBAGENT=1 npm run ocr:evaluate`
- `npm run ocr:sample-quality`
- `npm run ocr:review-report`
- `npm run product-code:evaluate`
- `npm run product-code:review-report`
- `npm run product-code:image-evaluate`
- `npm run product-code:image-review-report`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run regression:ocr-report`（34 个场景）
- `npm --prefix user-uniapp run build:h5`
- `git diff --check`

## 剩余风险

- 微信真机条形码/二维码图片解码 Provider 仍是后续增强；当前环境 Chromium 无 `BarcodeDetector`，合成 PNG 图片级门禁已通过，但微信端仍依赖 OCR 数字编码或后续接入平台解码能力。
- 商品码解析级三类各 500 已通过，条码 / 二维码合成 PNG 图片级门禁已通过，但真实包装照片和微信真机扫码尚未验收。
- 正式 GTIN 商品库、数字标签页面解析和数据授权仍未接入；DeepSeek 搜索只能作为公开信息线索，不能替代包装实拍 OCR。
- 二维码 URL 后端任意网页抓取已禁用；生产若要重新启用数字标签页面抓取，仍需 egress 白名单 / IP pin / 响应大小限制和数据授权评估。
- 真机相机、微信开发者工具导入、request 合法域名和生产后端配置仍需在真实微信环境验收。
