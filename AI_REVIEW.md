# AI Review — 2026-06-20

## 本轮范围

继续收口成分镜消费端主路径：拍食品包装后直接给购买/食用决策，而不是把结果页做成 OCR 文本或成分百科。

本轮未提交任何真实 API Key。DeepSeek / Aliyun 凭证只从后端环境变量读取；前端、小程序、文档和仓库未写入密钥。

## 已完成

- Aliyun OCR provider 已接入后端：`OCR_PROVIDER=aliyun` 时使用后端 `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET`（兼容 `OCR_API_KEY` / `OCR_API_SECRET`）发起签名请求。
- OCR 无 Key/Secret、超时、上游不可达或响应异常时返回明确错误，前端进入 manual/fallback，不返回假识别结果。
- DeepSeek 默认模型为 `deepseek-v4-flash`，DeepSeek Provider 默认走 `/chat/completions`。
- AI Prompt 收紧为“规则先决策，AI 只做通俗解释”，禁止编造成分、法规、医疗或权威结论，并过滤低价值兜底话。
- `POST /api/food/analyze` 继续保持规则优先，AI 失败时自动降级到 mock/rule-only，不影响报告生成。
- 后端结构化识别补齐商品名、食品类型、配料表、营养表、生产日期、包装声明、未确认线索。
- 首页保持无页面内标题，主动作是居中“拍包装”，成分搜索只保留小辅助入口。
- 拍照流程维持首页点击后直调相机；OCR 成功自动生成报告，失败或信息不足才进入手动补充。
- 手动补充页改为“补充信息”，按配料表、营养数字、致敏原提示、宣传语或声称、生产日期分区输入，并提供更明显的“重新拍”入口。
- 报告页按顺序展示：一句话结论、关键原因、适合谁 / 不适合谁、添加剂解释、建议吃法、识别详情。
- 报告页进一步减量：首屏改为“一句话结论 + 你的关注短标签 + 为什么 / 谁少吃 / 怎么吃”决策卡；关键原因只放前 3 条优先级判断，完整营养判断用低/中/高营养重点图展示；识别详情默认折叠，反馈入口放到底部小链接。
- 信息不足报告不硬凑结论，首屏前置“补拍配料/营养表”和“手动粘贴文字”，并用拍摄建议标签替代长段说明。
- 历史页卡片优先展示结论标签和关键原因，筛选项改为“全部 / 收藏 / 有提醒”。
- 成分搜索弱化为辅助入口，结果状态改为“名称参考”，并提示单个成分不能替代整包包装报告。
- 新增 `user-uniapp/scripts/deepseek-comprehensive-review.mjs` 和根目录 `user:review:deepseek`，用于功能、UI、产品、文档、设计综合复审。

## 真实 AI Smoke

已做 DeepSeek 低频 smoke、AI 报告增强和综合 UI/产品/文档评审调用：

- provider: `deepseek`
- report model: `deepseek-v4-flash`
- review model: `deepseek-chat`（可由 `DEEPSEEK_MODEL` 覆盖）
- AI 报告增强：可返回大众化 `summary`、`mainReasons`、`eatingAdvice`，规则结果仍保留最终决策边界。
- UI/产品/文档评审：多轮提交当前页面功能、截图观察、用户目标和文档/脚本摘要，按反馈继续修改。

调用只用于 smoke/评审，不做高频测试，不输出或保存 API Key。

## AI UI 评审闭环

评审范围覆盖：首页、补充页空白态、补充页已填写态、补充页可选字段、报告首屏、营养图、报告详情、信息不足报告、历史页、我的页、成分搜索，以及 11 个网络食品包装样本的 RapidOCR 识别结果。

主要修改点：

- 报告页：合并重复结论，首屏新增“为什么 / 谁少吃 / 怎么吃”决策闭环；个人关注压缩为短标签；关键原因优先级列表 + 营养重点图，识别详情默认折叠。
- 手动页：从“错误页”收敛为补充信息页，提示“补一项即可生成初步结果”，并用“优先补：配料表文字 / 营养表数字”弱化大表单感。
- 首页：保持拍包装为唯一主动作，包装正面 / 配料表 / 营养表用短标签说明可拍内容，查单个成分降为小文字入口。
- 历史页：去掉重复大标题，卡片优先展示结论标签、关键原因和识别完整度。
- 成分搜索：弱化权威感，保留辅助查询定位，并明确不能替代整包包装报告。

最终 ChatGPT 会话子评审：

- verdict: `pass`
- shipBlockers: `[]`
- summary: 后端 `foodAnalyze`、AI prompt、AI sanitizer、mock fallback 和 visual fixture 已去掉旧“可以吃 / 可以偶尔吃 / 不建议购买”输出口径；生产路径旧 High 已解除。剩余建议为后续增加真实样本 API replay、继续扩展过敏提示/油炸零食样本。

最终 DeepSeek 网络样本复评：

- verdict: `needs_changes`
- 采纳并已处理：报告首屏关键原因排序，钠、反式脂肪、添加剂优先进入前三；信息不足文案改为明确补拍配料表 / 营养成分表数字 / 过敏原提示；“更要控量”改为“建议关注”。
- 不采纳或后续处理：配料表照片未拍到商品名时不使用样本 manifest 填充，避免伪造 OCR 结果；`vita-nutrition` 只识别到 1 个营养数字时继续降级为补拍/手动确认，不用猜测缺失营养值；`谷氨酸` 缺少“钠”字时保留为未确认线索，不擅自补成谷氨酸钠。
- 剩余非阻断风险：真实样本仍缺独立过敏提示、油炸零食背标、更多饮料正面声明；生产报告样本 smoke 后续应补 `/api/food/analyze` replay。
- 截图目录：`/tmp/complens-user-visual-smoke`

真实网络样本 OCR smoke：

- 样本数：11
- 来源：OpenFoodFacts 商品页与光明网新闻图片；图片仅下载到 `/tmp/complens-real-packaging-samples/images`，不进入仓库。
- 结果：`reportReady=6`、`manualOrRetake=5`、`ocrFailed=0`、`needsFix=0`、`highIssue=0`、`mediumIssue=1`。
- 唯一 medium：`vita-nutrition` 营养表 OCR 只解析到很少数字，按预期进入补拍 / 手动确认。
- 报告输出：`/tmp/complens-real-packaging-samples/report.json`，摘要：`/tmp/complens-real-packaging-samples/summary.md`。

## ChatGPT 评审入口

已新增 `user-uniapp/scripts/chatgpt-ui-review.mjs`，供真实 OpenAI API 复评使用：

- 命令：`npm --prefix user-uniapp run review:chatgpt`
- 输入：`/tmp/complens-user-visual-smoke` 下的首页、补充页多态、报告、营养图、报告详情、信息不足报告、历史、我的、成分搜索截图。
- 模型：默认 `gpt-5.4-mini`，可通过 `CHATGPT_MODEL` 或 `OPENAI_MODEL` 覆盖。
- 输出：`/tmp/complens-chatgpt-ui-review.json`。
- 密钥：只读取运行环境里的 `OPENAI_API_KEY`，不写入前端、文档或仓库。

当前机器未配置 `OPENAI_API_KEY`，因此 ChatGPT API 评审未实际运行。脚本已明确写出：

```json
{
  "verdict": "not_run",
  "error": "missing_openai_api_key"
}
```

本轮实际使用当前 ChatGPT 会话子 agent 做多轮截图评审，最终 verdict 为 `pass`，`shipBlockers=[]`。真实 OpenAI API 版脚本因本机未配置 `OPENAI_API_KEY` 未运行，不伪造结果。

## 验证

已通过：

- `npm --prefix backend run typecheck`
- `npm --prefix backend test -- tests/foodAnalyze.test.ts tests/nutrition.test.ts tests/ocr.test.ts tests/aiFoodExplanation.test.ts`
- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run audit:product-output`
- `npm --prefix user-uniapp run regression:ocr-report`
- `npm run user:sample:real-packaging`
- `npm --prefix user-uniapp run build:h5`
- `npm --prefix user-uniapp run visual:smoke`
- `node --check user-uniapp/scripts/chatgpt-ui-review.mjs`
- `node --check user-uniapp/scripts/deepseek-comprehensive-review.mjs`
- `npm run user:review:deepseek:samples`
- `npm --prefix user-uniapp run build:mp-weixin`
- `git diff --check`

已执行但因缺少本机 OpenAI Key 预期失败：

- `npm --prefix user-uniapp run review:chatgpt` → `missing_openai_api_key`

## 剩余风险

- 真机相机、微信开发者工具导入和后端域名配置仍需在微信环境验收。
- Aliyun OCR provider 已实现，但生产真云端 smoke 需要用户在后端环境配置 AccessKeyId/Secret。
- ChatGPT UI 评审入口已实现；真实 OpenAI API 复评需要在运行环境配置 `OPENAI_API_KEY`。
- 本轮真实 AI 只做低频 smoke 和 UI 评审，不代表生产监控、成本统计或限流已完成。
- OCR 对整包小字、反光包装和多面包装的识别率仍取决于本机 RapidOCR/生产 OCR 服务质量；无 OCR Key 或服务失败时仍进入手动补充，不返回假识别结果。
