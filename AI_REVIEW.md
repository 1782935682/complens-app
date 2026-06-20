# AI Review — 2026-06-20

## AI Provider 与消费决策结果页

### 本轮范围

本轮按用户最新方向，把“只展示 OCR/配料表”升级为“直接给普通用户购买/食用决策”。实现重点是后端先用本地规则给出 `decision`、`riskLevel` 和营养判断，再让 AI Provider 只做大白话解释。

未提交真实 API Key，未自动部署，未让小程序直连 DeepSeek / OpenAI / Claude / Gemini。

### 已完成

- 新增 `AiProvider` 抽象、`AiProviderRegistry`、`MockProvider`、`OpenAICompatibleProvider`、`DeepSeekProvider`。
- 预留 Claude / Gemini Provider 结构，当前返回未实现状态。
- 新增 `AiFoodExplanationService`，支持 rule-only、mock、Provider 失败降级和进程内缓存。
- 新增 `FoodAnalyzeService` 和 `POST /api/food/analyze`。
- 本地规则已能从 OCR 文本抽取：
  - 商品名、类型、生产日期。
  - 配料表。
  - 能量、蛋白质、脂肪、碳水、钠、反式脂肪。
  - 糖、油脂、盐/钠、常见添加剂和小麦等过敏线索。
- 小麻花样例回归通过，输出：
  - `decision=caution`
  - `decisionText=谨慎购买｜偶尔吃可以`
  - 热量偏高、脂肪偏高、碳水较高、钠偏高、含添加糖来源。
  - 减脂、控糖、控盐和小麦过敏/麸质敏感人群提醒。
  - 半包以内、别当正餐、当天少叠加油炸甜食重口味。
- 小程序结果页新增：
  - 一句话结论。
  - 关键原因。
  - 适合谁 / 不适合谁。
  - 建议吃法。
  - 识别详情：商品、类型、生产日期、配料表、营养表。
- 移除小程序页面清单中的“设置与说明”，视觉烟测不再把 settings 当页面验收。

### 评审结论

这轮修正了产品核心价值：用户拍到整包食品标签后，不应只看到“识别到配料表”，而应马上得到“能不能买 / 能不能吃 / 为什么 / 怎么吃”的结果。

当前实现仍保留边界：AI 不作为权威数据源，不覆盖本地规则判断，不生成医疗诊断；真实模型不可用时结果页仍展示规则结果。

### 验证

已通过：

- `npm.cmd --prefix backend run typecheck`
- `npm.cmd --prefix backend test -- tests/aiFoodExplanation.test.ts tests/foodAnalyze.test.ts`
- `npm.cmd --prefix backend test -- tests/foodAnalyze.test.ts tests/reports.test.ts tests/ocr.test.ts`
- `npm.cmd --prefix user-uniapp run typecheck`
- `npm.cmd --prefix user-uniapp run lint`
- `npm.cmd --prefix user-uniapp run audit:product-output`
- `npm.cmd --prefix user-uniapp run regression:ocr-report`
- `npm.cmd --prefix user-uniapp run build:mp-weixin`
- `npm.cmd --prefix user-uniapp run build:h5`
- `npm.cmd --prefix user-uniapp run visual:smoke`
- `git diff --check`：仅 CRLF 提示。

### 剩余风险

- 真实 DeepSeek / OpenAI-compatible 调用需要用户提供服务端 Key 后才能验收。
- 第一版规则阈值为保守消费提示，不替代专业营养评估。
- OCR 对整包小字图片的识别率仍需微信开发者工具/真机 + 本地 RapidOCR 联调确认。

### 2026-06-20 追加评审：OCR 配置与识别页

- 后端已优先读取 `OCR_LOCAL_URL`，旧 `OCR_SERVICE_URL` 仅作为兼容 fallback，避免按新文档配置时 OCR 完全不可用。
- 识别确认页新增轻量质量提示，只在识别缺配料表、只有营养表、包装声明-only 或噪音较多时出现，不恢复大块“本次识别提示”。
- 用户要求真实 AI 对接完成后继续逐页把功能交给 AI 审查 UI/交互，再按审查结果继续优化；当前真实 AI Key 未配置，先保留为后续验收项。
- 当前机器 `http://127.0.0.1:18080/health` 无法连接，不能声称真实图片 OCR 识别率已经完成验收。
