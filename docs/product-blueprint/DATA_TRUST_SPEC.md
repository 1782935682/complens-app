# 数据可信规范（DATA_TRUST_SPEC）

> 本文件属于 `docs/product-blueprint/` 蓝图集，是 CompLens/成分镜 **面向展示层（前端 / API 返回 / 报告渲染）的数据可信规范**。
>
> 关联文档：
> - 根目录 `DATA_SOURCES.md`：数据治理细节（来源原则、staging/verified 区别、硬性规则）的**权威依据**。**本文件与 `DATA_SOURCES.md` 冲突时，以 `DATA_SOURCES.md` 为准。**
> - `docs/product-blueprint/PRODUCT_SPEC.md`：产品规格蓝图。
> - `docs/product-blueprint/CONSUMER_DECISION_SPEC.md`：消费者食品标签解读与消费决策规范。
> - `docs/product-blueprint/CONSUMER_UX_SPEC.md`：消费者体验与话术规范。
> - `docs/product-blueprint/DESIGN_SYSTEM.md`：颜色变量等设计令牌定义。
> - `docs/product-blueprint/API_CONTRACT.md`：接口返回字段与错误约定。
> - 数据状态枚举的代码权威来源：`src/utils/dataStatus.js`。
>
> 本规范只规定"展示层如何忠实呈现可信状态"，不新增数据库不存在的状态，不替代数据治理流程。
> 消费者报告默认展示普通人能理解的标签解读，专业证据保留在“数据来源和查看依据”中逐层展开。

---

## 1. 数据来源类型

来源类型对齐项目真实 `sourceScope` / `sourceType` 口径。展示层在标注来源时必须使用以下归一类型，不得编造来源链接或来源名称。

| 归一来源类型 | 当前代码/数据映射 | 含义 | 权威性边界 |
|---|---|---|---|
| `official_standard` | `official_standard` / `gb_2760_regulation` | GB 2760-2024 官方标准。权威来源**仅**使用国家卫生健康委公告 + 食品安全国家标准数据检索平台 | 可作官方法规结论展示（须已满足正式库准入规则）。第三方网站只能作辅助检索线索，不得作为 `official_standard` 来源 |
| `safety_evaluation` | `jecfa_safety_evaluation` | JECFA 等安全评价 | **仅安全评价**。不得写中国法规使用范围；不得把 JECFA 反推为 GB 2760 使用范围 |
| `manual_review` | `manual_review` / 审核审计字段 | 人工复核 | 复核签核记录，配合审计字段使用 |
| `common_ingredient` | `common_ingredient_lexicon` / `common_ingredient` | 普通配料词库 | 仅用于可读性 / 配料识别，非法规结论 |
| `ocr_input` | OCR 请求/用户确认文本 | OCR 用户输入 | **不是权威数据源**，必须用户确认 |
| `product_catalog` | 后续 GTIN 商品条码查询结果 | 商品/配料线索来源 | 需进入成分归一化和官方知识库匹配；不能直接作为官方法规结论 |
| `digital_label` | 后续数字标签二维码页面解析结果 | 商品标签页面来源 | 需保留页面 URL / 抓取时间 / 解析置信度；不能替代官方成分知识库 |
| `ai_generated` | AI 解释结果 | AI 生成 | **仅解释层**，不得作为成分 / 法规事实来源 |
| `user_feedback` | 用户反馈记录 | 用户反馈 | 反馈输入，非权威结论 |

---

## 2. 数据状态（dataStatus）

### 2.1 真实状态枚举（权威：`src/utils/dataStatus.js`）

以下 7 个为项目**真实存在**的 `dataStatus`，不得新增数据库不存在的状态。

| dataStatus | 文案 | 颜色变量 | 能否权威展示 |
|---|---|---|---|
| `verified_regulation` | 官方标准已验证 | `--color-risk-low` | ✅ 可作官方规则展示 |
| `verified_jecfa` | 安全评价已匹配（非中国法规范围） | `--color-watch` | ⚠️ 仅安全评价 |
| `pending_review` | 待复核来源数据 | `--color-unverified` | ❌ |
| `mapped_candidate` | 疑似匹配，待确认 | `--color-risk-medium` | ❌ |
| `common_ingredient` | 普通配料 | `--color-risk-low` | ⚠️ 仅可读性 |
| `unverified` | 未验证 | `--color-unverified` | ❌ |
| `unknown_from_ocr` | 暂未收录 | `--color-unknown` | ❌ 运行时状态，进人工校验队列 |

代码层补充事实（来自 `src/utils/dataStatus.js`）：
- `pending_review`、`mapped_candidate`、`unverified` 同属"待定（pending）"集合（`pendingDataStatuses`），展示上一律不得作为权威结论。
- 未知 / 非法状态经 `normalizeDataStatus` 默认归一为 `unverified`，展示层不应自行发明新枚举。

### 2.2 产品讨论中出现但非独立数据状态的概念

以下名词在讨论中出现过，但**不是数据库已有的独立 `dataStatus`**，文档与展示层不得将其当作独立状态：

| 名词 | 真实对应 | 说明 |
|---|---|---|
| `verified_safety` | ≈ 本项目 `verified_jecfa` | 产品/跨端规范可用的安全评价语义名；当前代码与数据库统一使用 `verified_jecfa`，API 如新增别名必须同时返回映射关系 |
| `low_confidence` | 运行时匹配置信度 `matchConfidence`（约 0.55–0.79） | 是匹配置信度数值，**不是**独立 `dataStatus` |
| `attention` / 重点关注 | 报告展示概念 | 属报告渲染层的呈现概念，**不是** `dataStatus` |

---

## 3. GB2760 规则

### 3.1 流程

GB 2760-2024 官方 PDF
→ **staging 全量承接**（`gb2760_official_pages` 264 页全文 + `gb2760_official_records` 表 A.1 2404 行 + `gb2760_official_reference_rows` 参考表 2800 行）
→ 高置信度 **promote** 到正式库（`ingredients` / `additive_usage_rules`）
→ 低置信度保持 **`pending_review`**
→ **人工复核**。

> staging 与 verified 有本质区别：staging 只代表原文 / 页码 / 限量已进入数据库，**不是已核验法规结论**；正式库只接收满足下方准入规则的高置信、可追溯数据。

### 3.2 当前真实规模（快照）

- `gb2760_official_records` 表 A.1 staging：2391 行已人工签核并 promoted。
- `additive_usage_rules`：2391 行正式规则。
- `ingredients`：329 条，其中 `verified_regulation` 308、`verified_jecfa` 1、`common_ingredient` 12、`unverified` 8。
- 源文件静态 seed：112 条。

> 这**不是**完整成分库，也**不是**完整 GB2760 法规库。展示层不得把样本 seed 当作完整数据库，也不得暗示已覆盖全部配料 / 法规。

### 3.3 正式库准入规则（promote 时须**全部满足**）

- 添加剂名称明确；
- CNS/INS 可解析或原文可追溯；
- 功能类别明确；
- 食品分类号 / 适用范围明确；
- 最大使用量 / 残留量或"按生产需要适量使用"明确；
- 备注完整保留；
- 有 `rawSourceText`；
- 有 `sourcePage`；
- 有 `sourceTable`；
- 有 `sourceHash`；
- DB staging 行已由内部 reviewer approved/promoted 且有签核审计；
- 无跨页错配 / 错行 / 漏备注。

### 3.4 禁止事项（`validate:gb2760` 强制）

- 不允许 AI 猜数据；
- 不允许把 JECFA 反推 GB2760 使用范围；
- 不允许把 `pending_review` 当 `verified`；
- 不允许丢失备注；
- 不允许把"按生产需要适量使用"改写为数值；
- 不允许伪造导入成功；
- 不允许把样本 seed 当完整数据库。

### 3.5 可信字段

`dataStatus`、`matchConfidence`、`sourceScope`、`sourceName`、`sourceVersion`、`sourceUrl`、`regulatoryBasis`、`rawSourceText`、`lastReviewedAt`、`reviewNote`、`isVerified`。

---

## 4. OCR 规则

- OCR 是**用户输入来源**，不是权威数据源。
- 结果**必须由用户确认**。
- 未识别 / 低置信内容**必须保留**，不得静默丢弃。
- OCR 未匹配的运行时记为 `unknown_from_ocr`（文案"暂未收录"），进**人工校验队列**。
- 展示层不得把 OCR 原始结果呈现为权威结论。

---

## 5. AI 规则

AI **只能**在已有可信数据基础上做：解释 / 摘要 / 格式转换 / 风险边界提示。

AI **不能**：
- 编造成分数据、GB2760 结论、ADI、限量、条款编号、安全结论、来源链接；
- 替代 OCR / 数据库匹配；
- 给出医疗诊断。

### 文案红线

- **禁止文案**：可以买 / 不能买 / 健康 / 不健康 / 安全 / 有害 / 致癌 / 治疗 / 诊断 / 一定过敏 / 绝对安全 / 绝对有害 / 一定致敏 / 一定不能吃 / 有毒。
- **推荐文案**：建议关注 / 更适合重点查看 / 部分人群可能需要留意 / 信息不足，建议结合包装原文确认 / 仅供标签信息参考，不构成医疗或营养诊断。

---

## 6. 前端展示规则

### 6.0 消费者报告的信息层级

食品标签解读报告应先服务消费者决策，再提供专业依据：

1. 默认展示：我的关注项、购买前建议关注、配料数量、添加剂数量、糖/钠/脂肪/蛋白质等标签信息、暂未识别/暂未收录提示。
2. 折叠展示：GB2760 依据、JECFA 安全评价、sourceHash、sourcePage、rawSourceText、导入批次、人工复核记录。
3. 所有折叠专业信息仍必须可追溯，不能因为默认隐藏而丢失来源字段。
4. 营养成分表和包装正面卖点来自 OCR/用户确认文本，属于标签信息来源，不等同官方数据库结论。

消费者报告禁止输出“可以买 / 不能买 / 健康 / 不健康 / 安全 / 有害 / 致癌 / 治疗 / 诊断 / 一定过敏”。推荐使用“建议关注 / 更适合重点查看 / 部分人群可能需要留意 / 信息不足，建议结合包装原文确认 / 仅供标签信息参考，不构成医疗或营养诊断”。

### 6.1 各状态展示约定

颜色变量定义见 `DESIGN_SYSTEM.md`；展示文案以 `src/utils/dataStatus.js` 为准。

| dataStatus | 展示文案 | 颜色变量 | 展示要点 |
|---|---|---|---|
| `verified_regulation` | 官方标准已验证 | `--color-risk-low` | 可作官方规则展示；须附 `sourceName`/`sourceVersion`/`regulatoryBasis` 等可信字段 |
| `verified_jecfa` | 安全评价已匹配（非中国法规范围） | `--color-watch` | **特殊展示**：必须明确标注"非中国法规范围 / 仅 JECFA 安全评价"，不得呈现为 GB 2760 使用范围或中国法规结论 |
| `pending_review` | 待复核来源数据 | `--color-unverified` | **不得**作为权威 / 已验证结论展示 |
| `mapped_candidate` | 疑似匹配，待确认 | `--color-risk-medium` | 标注"疑似匹配，待确认"，不得作为权威结论 |
| `common_ingredient` | 普通配料 | `--color-risk-low` | 仅用于可读性 / 配料识别，**不**等于法规已验证 |
| `unverified` | 未验证 | `--color-unverified` | 明确标"未验证"，不得作权威结论 |
| `unknown_from_ocr` | 暂未收录 | `--color-unknown` | 标"暂未收录"；提示已进入人工校验队列 |

### 6.2 强制禁令

- **明令禁止**把 `pending_review`、`mapped_candidate`、`unverified`、`unknown_from_ocr`、OCR 原始结果、AI 生成内容展示为**权威 / 已验证结论**。
- `common_ingredient` 不得展示为"已通过 GB 2760 法规核验"。
- `verified_jecfa` 不得展示为中国法规使用范围；必须带"非中国法规范围"标注。
- 展示来源时使用真实 `sourceScope` / `sourceName`，不得伪造来源链接。
- 遇未知状态按归一化结果（`unverified`）保守展示，不得自创新状态标签。

---

*本规范随 `src/utils/dataStatus.js` 与 `DATA_SOURCES.md` 演进；规模数字为快照，以数据库实时为准。*
