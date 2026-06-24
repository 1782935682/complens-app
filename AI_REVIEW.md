# AI Review — 2026-06-21

## 本轮范围

本轮只收口 `user-uniapp` 消费端体验：

- 首页“拍包装”直接拉起相机，失败才进入拍照页。
- 拍食品标签页优化拍照、上传、扫条码/二维码、手动输入入口。
- 补充信息页减少说明文字，默认只突出配料表和营养数字。
- 顶部 toast 2.6 秒自动消失。
- 我的关注目标支持多选。
- 成分搜索把数据库结果与 AI / 公开网页补充入口并列展示，但单个成分只作名称参考。
- 条码 / 二维码扫码入口接入，并在没有配料/营养证据时生成信息不足报告。
- 报告页改为短结论、关键原因、建议关注人群、单列营养重点图、添加剂解释和识别详情；本期不展示历史 / 收藏 / 建议吃法入口。

本轮未提交任何真实 API Key。ChatGPT / DeepSeek 只读取本机环境变量；前端、小程序、文档和仓库均未写入密钥。

## 评审结果

### ChatGPT API Review

- 结果：`not_run`
- 原因：本机未配置 `OPENAI_API_KEY`
- 输出：`/tmp/complens-chatgpt-ui-review.json`

### ChatGPT 子 Agent Review

第一次子 agent review：

- verdict: `needs_changes`
- shipBlockers: `[]`
- 主要问题：营养重点图两列过密、一句话结论过长、信息不足页重复说明偏多。

已采纳：

- 报告结论拆成“建议关注 + 目标标签”。
- 营养重点图改为单列，每项显示名称、数值、状态、说明和进度条。
- 信息不足页保留一个主补拍 / 手动粘贴 CTA，报告卡内只展示已识别信息和原因。

最终子 agent 复审：

- verdict: `pass`
- shipBlockers: `[]`
- 剩余低优建议：首页留白偏大、成分搜索说明偏密，均不阻塞本轮。

### DeepSeek Review

第一次 DeepSeek review：

- verdict: `needs_changes`
- 输出：`/tmp/complens-deepseek-comprehensive-review.json`
- 可采纳问题：首页按钮偏大、信息不足原因不够明确、AI 提示偏长、历史 / 收藏阶段性取舍需文档同步。

已采纳：

- 缩小首页拍包装圆按钮。
- 信息不足页新增具体原因，例如“条码/二维码没有找到可用配料或营养证据”。
- AI 公开标签线索提示缩短为：“AI 仅提供公开标签线索，可能缺失或不准；不等同包装实拍、法规或医疗结论。请结合商品包装确认。”
- `PRODUCT_DIRECTION_2026H2.md`、`PAGE_STRUCTURE.md`、`FRONTEND_SPEC.md`、`QA_ACCEPTANCE_SPEC.md` 明确本轮不外露历史 / 收藏入口。

第二次 DeepSeek review：

- verdict: `needs_changes`
- shipBlockers 包含低置信确认页、AI 来源 URL 可访问验证、设计 token 一致性、真实包装 / 微信真机扫码验收。

本轮不采纳说明：

- **低置信确认页**：当前产品硬约束是识别后直接进入报告；低置信、失败或商品身份信息不足会生成“信息不足报告”，不输出正常消费结论，不回退到确认页。
- **AI URL 可访问验证**：当前后端已禁止主动抓取任意二维码网页内容，只允许带 URL / 域名 / Open Food Facts 等可核对摘要的 AI 结果进入参考报告；进一步 HEAD / DNS / 白名单验证涉及网络访问策略，作为后续后端安全任务处理。
- **设计 token 一致性**：`user-uniapp` 当前已使用产品蓝图 token；DeepSeek 提到的旧 `src` 深青绿 / 8px 属历史 Web 原型，不是本轮微信小程序验收目标。
- **真实包装 / 微信真机扫码**：确实未完成，继续列为人工 / 真机验收风险，不把 H5 smoke 或合成图片门禁表述为真机通过。

## 验证结果

已通过：

- `npm --prefix backend run typecheck`
- `npm --prefix user-uniapp run typecheck`
- `npm --prefix user-uniapp run lint`
- `npm --prefix user-uniapp run audit:product-output`
- `npm --prefix user-uniapp run regression:ocr-report`
- `npm --prefix user-uniapp run build:h5`
- `npm --prefix user-uniapp run visual:smoke`
- `git diff --check`

截图目录：

- `/tmp/complens-user-visual-smoke/home.png`
- `/tmp/complens-user-visual-smoke/capture-pick.png`
- `/tmp/complens-user-visual-smoke/capture.png`
- `/tmp/complens-user-visual-smoke/capture-filled.png`
- `/tmp/complens-user-visual-smoke/capture-optional.png`
- `/tmp/complens-user-visual-smoke/attention.png`
- `/tmp/complens-user-visual-smoke/search.png`
- `/tmp/complens-user-visual-smoke/report.png`
- `/tmp/complens-user-visual-smoke/report-nutrition.png`
- `/tmp/complens-user-visual-smoke/report-detail.png`
- `/tmp/complens-user-visual-smoke/report-insufficient.png`

## 剩余风险

- ChatGPT API review 因缺 `OPENAI_API_KEY` 未运行；本轮已用 ChatGPT 子 agent 作为替代审查。
- DeepSeek 仍给出 `needs_changes`，其中部分是后续安全 / 真机验收 / 历史原型问题，不阻塞本轮 H5 UI 收口。
- 微信开发者工具、微信真机相机、真机条码 / 二维码扫码、request 合法域名和生产后端配置仍需手动验收。
- AI 商品补全仍只能作为公开标签线索，不能替代包装实拍 OCR、法规来源或医疗结论。
