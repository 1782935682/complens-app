# AGENTS.md

编码 Agent（Codex / Claude 等）在本仓库工作的强制规范。产品入口见 [`README.md`](./README.md)，**产品方向与优先级以 [`docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md`](./docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md) 为单一事实来源**，完整规范集见 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)，任务清单见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)。

> ⚠️ **方向修订（2026-06）：数据治理已降级。** GB2760 全量补齐 / 7 级可信治理 / admin 后台**暂停继续投入**；当前重心是消费端体验（拍照解读 + 添加剂大白话翻译 + 个性化关注 + 历史），第一版收敛为微信小程序单端。下方 §0「数据完整度优先」是历史阶段目标，**仅在用户明确重启数据治理任务时才适用**；与方向修订冲突时以方向文档为准。

---

## 0. （历史阶段目标，已降级）数据完整度、准确性和来源可追溯

> 本节为早期"数据底座优先"阶段的目标，现已按方向修订降级（见文首横幅）。保留作为数据治理任务**重启时**的口径；日常消费端开发不以本节为最高优先级。

本节描述的阶段目标是尽可能一次性补齐食品成分知识库，而不是只建立数据库结构或只导入少量官方数据。

在数据治理任务范围内，本节优先级高于后续数据相关章节。如果出现"完全禁止非官方来源"等冲突要求，以本节为准。

### 一、总体目标

按以下顺序执行：

1. 尽最大可能补齐数据库实际数据。
2. 优先使用中国官方标准、公告、目录和数据库。
3. 中国官方数据不存在或客观上不完整时，允许使用其他可靠来源补充。
4. 所有数据必须记录来源，不允许正式数据无来源。
5. 不同可信等级的数据必须明确区分。
6. 尽量在本次任务中完成下载、解析、导入、校验和报告，不得只建立空表后结束。
7. 无法确认的数据进入待复核层，不得伪装成已验证数据。

### 二、数据来源优先级

按以下层级选择数据：

#### S0：中国官方监管来源

最高优先级，包括：

- 国家卫生健康委员会
- 国家市场监督管理总局
- 国家标准相关官方平台
- 国家食品安全风险评估中心
- 中国政府网
- 其他中国国家机关正式发布的标准、公告、目录和附件

可用于确认：

- 中国境内监管状态
- 允许使用范围
- 最大使用量
- 食品分类
- 不适宜人群
- 食用量
- 标签要求
- 标准名称
- 公告新增、修改和废止关系

来源状态标记为：

- `verified_regulation`
- `verified_official_standard`
- `verified_official_catalog`

#### S1：国际官方或政府机构来源

例如：

- WHO
- FAO
- Codex Alimentarius
- USDA
- FDA
- EFSA
- 其他国家政府机构或政府数据库

可用于补充：

- 成分标准名称
- 英文名称
- 拉丁名称
- 化学名称
- 通用别名
- 营养成分基础信息
- 国际编码
- 基础分类信息

不得仅凭国际来源认定某成分在中国允许使用，也不得覆盖中国官方监管规则。

来源状态标记为：

- `verified_international_official`

#### S2：生产企业的一手资料

包括：

- 企业官方网站
- 企业正式数字标签
- 商品实体标签照片
- 企业正式产品说明书
- 企业公布的配料表
- 企业公布的营养成分表
- 企业公开的规格文件

主要用于补充：

- 普通食品原料
- 商品配料表
- 营养成分表
- 品牌和规格
- 成分实际标签写法
- 成分别名和常见标示形式

企业数据不得标记为国家官方监管数据。

来源状态标记为：

- `observed_digital_label`
- `observed_manufacturer_label`
- `verified_manufacturer_source`

#### S3：权威非官方数据

包括：

- 有明确编辑机构和版本的数据集
- 权威科研机构数据
- 同行评议论文的附属数据
- 正规行业协会公开数据
- 有清晰数据许可的开放数据库
- 有明确维护主体和更新记录的专业数据源

使用前必须确认：

- 发布机构
- 数据许可
- 更新时间
- 数据版本
- 原始来源
- 是否允许缓存和再分发

来源状态标记为：

- `verified_secondary`

#### S4：社区或众包数据

只在前面来源均无法覆盖时使用。

必须至少满足以下条件之一：

1. 有清晰的商品标签原图可以核对。
2. 有两个相互独立的数据来源能够交叉验证。
3. 能与企业官方信息或监管数据交叉验证。
4. 已经过人工复核。

未经验证的数据只能进入 staging 或待复核表。

来源状态标记为：

- `community_verified`
- `community_unverified`
- `unverified`

### 三、禁止使用的数据

以下数据不得进入正式表：

- 无法确定发布者的数据
- 没有来源地址的数据
- 搜索引擎摘要
- AI 自行推测的成分事实
- 无法确认版本的数据
- 明显由其他网站复制但找不到原始来源的数据
- 许可证明确禁止使用或缓存的数据
- 不同来源严重冲突且尚未解决的数据
- 只有营销描述而没有标签或技术依据的数据

### 四、非官方数据校验门槛

非官方数据不能仅因为"看起来合理"就进入正式库。

至少执行：

1. 名称归一化校验。
2. 来源真实性校验。
3. 发布时间和版本校验。
4. 与现有官方数据的冲突检查。
5. 重复数据检查。
6. 单位和数值合理性检查。
7. 至少一个独立来源交叉验证。
8. 重要字段尽量使用两个独立来源验证。
9. 商品级配料优先核对标签原图、数字标签或企业正式页面。
10. 无法达到正式数据门槛时保留在 staging。

建议置信度分级：

- 0.95-1.00：正式中国官方来源
- 0.90-0.99：其他官方来源或企业一手标签
- 0.80-0.94：两个可靠来源交叉验证
- 0.60-0.79：单一可靠非官方来源，等待复核
- 低于 0.60：不得提升为正式数据

置信度只是数据质量指标，不得伪装成监管结论。

### 五、每条数据必须保存的来源字段

正式数据和待复核数据至少保存：

- `source_tier`
- `source_status`
- `source_type`
- `source_org`
- `source_title`
- `source_url`
- `original_source_url`
- `publication_date`
- `retrieved_at`
- `source_version`
- `license`
- `local_file_path`
- `sha256`
- `page_number`
- `table_name`
- `row_reference`
- `evidence_summary`
- `verification_method`
- `verification_sources`
- `confidence_score`
- `review_status`
- `reviewed_by`
- `reviewed_at`

非官方数据必须在页面、接口或后台查询结果中能够识别其来源等级，不得显示为"官方数据"。

### 六、冲突处理

来源发生冲突时：

1. 不直接覆盖旧数据。
2. 保留双方原始记录。
3. 保存来源、版本和有效期。
4. 中国官方监管数据优先于其他来源的中国监管判断。
5. 更新版本优先于已失效版本，但必须保留历史。
6. 企业标签优先于众包数据库中的商品配料。
7. 两个非官方来源冲突且无法确定时，不提升为正式数据。
8. 生成冲突记录和人工确认事项。

### 七、一次性补齐要求

本次执行不能在完成数据库结构后立即结束。

必须继续完成：

1. 盘点现有数据。
2. 解析现有官方文档。
3. 搜索并下载缺失官方资料。
4. 导入官方数据。
5. 查找普通食品原料的可靠补充来源。
6. 补充名称、别名、编码和分类。
7. 补充过敏原关系。
8. 补充营养素和营养规则。
9. 补充新食品原料、食药物质和菌种。
10. 对非官方数据进行交叉验证。
11. 导入能够达到质量门槛的数据。
12. 将不确定数据保留在待复核层。
13. 输出真实覆盖率。
14. 列出仍然缺失的类别和数量。

不得因为不存在官方全量普通原料目录，就停止普通原料数据补充。

但不得声称已经达到绝对全量覆盖。

### 八、需要用户确认的事项

仅在以下情况需要用户抉择：

1. 需要购买付费数据源或 API。
2. 数据源许可证不明确。
3. 两个高可信来源存在重大冲突。
4. 需要进行破坏性数据库迁移。
5. 需要改变现有 API 或业务行为。
6. 需要决定是否导入低置信度数据。
7. 某一映射会影响大量现有数据。
8. 需要人工选择多个可能的规范名称。
9. 需要引入新的商业数据库。
10. 需要把非官方分析结论用于用户结果页。

当前使用 Codex exec 非交互执行，因此需要确认时：

1. 不得自行猜测。
2. 不得阻塞其他可以独立完成的工作。
3. 暂停受影响的数据分支。
4. 继续执行其他下载、解析、导入和测试。
5. 生成：

```text
/home/downloads/git/compcheck/docs/decision-required.md
```

每个待确认事项必须包含：

- 问题描述
- 涉及的数据量
- 选项 A
- 选项 B
- 其他可选项
- Codex 推荐选项
- 推荐理由
- 每个选项的影响
- 不选择时的默认安全处理
- 需要用户回复的明确问题

尽量集中一次询问，不要反复提出零散问题。

### 九、验收重点

验收时，数据完整度优先于单纯表结构完整度。

最终报告必须回答：

1. 实际新增了多少数据。
2. 官方数据占多少。
3. 企业一手数据占多少。
4. 非官方交叉验证数据占多少。
5. 未验证数据占多少。
6. 每类成分目前覆盖多少。
7. 哪些类别仍然明显缺失。
8. 哪些数据等待用户决策。
9. 哪些来源存在许可风险。
10. 数据是否能够重复更新。
11. 是否存在没有来源的正式数据。
12. 是否存在被错误标记为官方的数据。

正式表中不得存在无来源记录。

---

## 1. 项目主路径（不可偏离）

CompLens / 成分镜是**面向普通消费者的食品标签拍照解读与消费决策助手**。主路径：

```
拍食品标签 → 标签类型识别 → OCR 识别 → 文本确认修正
→ 配料拆分 / 营养字段解析 → 我的关注项 → 食品标签解读报告 → 历史
```

**OCR 拍照识别是核心主路径，成分搜索和专业法规查询只是辅助功能。** 不得把成分搜索写成主路径，不得把 OCR 写成附属功能。用户拍的不一定只有配料表，也可能是营养成分表或包装正面。当前阶段只做食品标签，不做化妆品、护肤品、药品。

---

## 2. 不得伪造与不得越界红线

1. **不得伪造数据**：AI 不能编造成分数据、法规来源、ADI、限量、条款编号、安全结论；GB2760 官方来源只用国家卫健委公告和食品安全国家标准数据检索平台。
2. **不得伪造 OCR**：无 Key 不返回假识别文字；`mock` 必须标注；无 Key 必须保留 manual 降级，不崩溃。
3. **AI 不是权威来源**：AI 只做总结、通俗解释、非医疗化提示；不替代 OCR/数据库；不给医疗诊断。
4. **不得把 seed 当完整库**：112 条基础库不是完整食品添加剂库。
5. **不得把不确定数据展示为结论**：`pending_review` / `unverified` / `mapped_candidate` 不能展示为已验证。
6. **不得给购买或医疗结论**：禁止输出可以买、不能买、健康、不健康、安全、有害、致癌、治疗、诊断、一定过敏；推荐“建议关注 / 更适合重点查看 / 部分人群可能需要留意 / 信息不足，建议结合包装原文确认 / 仅供标签信息参考，不构成医疗或营养诊断”。

违反任一条视为任务失败。

---

## 3. 执行流程

1. 改代码前先读：`CODEX_TASKS.md`（当前任务）、相关 page/service/schema、`DATA_SOURCES.md`（数据口径）。
2. 按 `CODEX_TASKS.md` 阶段顺序执行**当前最早未完成且未被阻塞**的 Batch。
3. 一次完成一个可验证的用户流程闭环（数据模型+逻辑+页面+路由+状态+移动端样式+错误/空状态+文档+验证），不只改一个组件就停。
4. 每个 Batch 一个 PR，禁止自动 push 到 `main`。
5. 完成后同步更新 `PROJECT_PLAN.md`、`AI_REVIEW.md`（覆盖式，仅本轮内容）；影响命令更新 `COMMANDS.md`，影响数据更新 `DATA_SOURCES.md`。

---

## 4. 人工阻塞跳过规则

遇到人工阻塞任务**不停止流程**：

```
标记 blocked_by_user → 记录原因 → 跳过 → 继续后续无需人工的任务
```

阻塞清单：生产 `DATABASE_URL`、OCR API Key、AI API Key、Apple Developer、Google Play、国内商店账号、支付/订阅账号、部署平台、隐私政策法律确认、软著/备案/商标、GB2760 人工复核。

阻塞项只阻塞其"真实产出"，不阻塞可先做的脚本/抽象/降级流程（例如：无 OCR Key 仍可做 manual/mock 闭环；无人工签核仍可做 promote 脚本与 pending_review 流程）。

---

## 5. 技术栈约束

- 正式用户端技术路线：`user-uniapp/`，uni-app + Vue3，目标支持 H5/PWA、微信小程序、Android、iOS。
- 当前 `src/` 纯 JS + Vite + hash 路由前端是历史 Web/PWA 原型和迁移来源；不得删除，也不得继续承载复杂新业务。旧 `src/` 内仍保持纯 JS ES2022+、JSDoc、无框架、单文件 `src/styles.css` + CSS 变量，不在旧原型内引入 Vue/React/Tailwind/状态库。
- 后台管理端技术路线：`admin-web/`，Vue3 + TDesign Web，单独建设；不与用户端强行共用页面代码，但共用 design tokens、数据状态、API 契约和文案规范。
- 后端：复用现有 `backend/`，Node.js 20 + TypeScript + Hono + Drizzle/PostgreSQL + Vitest。不要重复创建 Express/Nest/Fastify 第二套后端；若未来评估 Fastify，只能在现有后端规范化任务中做迁移方案。
- OCR 服务：Python FastAPI + RapidOCR，本地服务仅由后端 Provider 调用。目标地址 `http://127.0.0.1:18080/ocr`；当前代码仍使用 `OCR_SERVICE_URL`，变量统一需通过专门配置迁移完成。
- 图片存 IndexedDB；localStorage 只存元数据/索引/设置；禁止 base64 图片入 localStorage。
- 样式只用 CSS 变量，禁止内联颜色和魔法数字。
- 后端 API 是所有端唯一数据入口；用户端、小程序、App、后台均不得直连 OCR / AI / 数据库 / GB2760 导入脚本。
- API Key 只在后端环境变量；前端、小程序、App 不暴露 OCR Key / AI Key。
- 不允许自动部署生产；需要部署时由用户人工执行或明确授权具体命令。
- 优先使用本地/Oracle 部署组件；产品化上线时再评估正式服务器和商业服务。
- 支付、订阅、上架任务涉及 Apple Developer、Google Play、微信支付、国内安卓渠道、法务材料等人工账号配置时，标记 `blocked_by_user` 或 `[人工+Codex]`，不要阻塞其他任务，也不得伪造支付成功。

---

## 6. 每个 Batch 验收

按改动范围选择验证，**不要每次默认跑完整测试**：

- 纯文档修改：至少 `git diff --check`。
- 前端小改：优先 `npm run lint` + 相关现有测试；必要时再 `npm run test`。
- 触达构建入口、路由、PWA、跨端配置时：加 `npm run build`。
- 涉及后端：`cd backend && npm run typecheck` + 相关测试；必要时再 `npm test` / `npm run build`。
- 涉及 GB2760 数据准入：按任务要求运行 `npm run validate:gb2760` 或对应数据校验命令。

禁止为通过测试屏蔽错误、删除断言或用 mock 假装完成。每个页面必须有 loading/empty/error 三态。未运行某类验证时要说明原因。

---

## 7. 页面与体验要求

移动端优先；统一组件与 CSS 变量；loading/empty/error 不空白不丑陋；iPhone Safari/PWA 安全区适配；报告页不医疗化。禁止文案：`可以买/不能买/健康/不健康/安全/有害/致癌/治疗/诊断/一定过敏/绝对安全/绝对有害/一定致敏/一定不能吃/有毒`。

**产品蓝图规范（强制，详见 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)）：**

- 任何页面开发必须遵守 [`docs/product-blueprint/DESIGN_SYSTEM.md`](./docs/product-blueprint/DESIGN_SYSTEM.md)。
- 任何消费者决策体验必须遵守 [`docs/product-blueprint/CONSUMER_DECISION_SPEC.md`](./docs/product-blueprint/CONSUMER_DECISION_SPEC.md) 与 [`docs/product-blueprint/CONSUMER_UX_SPEC.md`](./docs/product-blueprint/CONSUMER_UX_SPEC.md)。
- 任何视觉开发必须遵守 [`docs/product-blueprint/VISUAL_STYLE_GUIDE.md`](./docs/product-blueprint/VISUAL_STYLE_GUIDE.md)。
- 任何前端开发必须遵守 [`docs/product-blueprint/FRONTEND_SPEC.md`](./docs/product-blueprint/FRONTEND_SPEC.md)。
- 任何新页面必须登记到 [`docs/product-blueprint/PAGE_STRUCTURE.md`](./docs/product-blueprint/PAGE_STRUCTURE.md)。
- 任何跨端能力必须遵守 [`docs/product-blueprint/CROSS_PLATFORM_SPEC.md`](./docs/product-blueprint/CROSS_PLATFORM_SPEC.md)。
- 任何接口变更必须同步 [`docs/product-blueprint/API_CONTRACT.md`](./docs/product-blueprint/API_CONTRACT.md)。
- 任何数据可信展示必须遵守 [`docs/product-blueprint/DATA_TRUST_SPEC.md`](./docs/product-blueprint/DATA_TRUST_SPEC.md)。
- 任何隐私/权限相关功能必须遵守 [`docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`](./docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md)。
- 任何功能完成后必须按 [`docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`](./docs/product-blueprint/QA_ACCEPTANCE_SPEC.md) 验收。

补充红线：不允许每个页面单独发明颜色、按钮、卡片、状态文案；不允许前端暴露 OCR Key / AI Key；不允许 OCR 结果跳过文本确认页；不允许 AI 生成权威结论；不允许提交字体文件；不允许把大图片存入 localStorage；不允许自动部署生产。

---

## 8. 输出格式

每轮任务完成后输出：完成内容、修改文件、验证结果（已执行命令+通过/失败+失败原因）、当前进度百分比、后续建议。不要只说"已完成"。
