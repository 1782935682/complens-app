# AI Review — 2026-06-18

## 单一拍照入口自动识别分流规划

### 本轮目标

记录后续条码和数字标签能力的产品规划，并按最新口径修正为：

```text
一个拍照入口
  → 后端自动识别：商品条码 / 数字标签二维码 / 配料表 OCR / 营养表 OCR / 未知
  → 各分支独立取数
  → 成分归一化
  → 官方成分知识库匹配
  → 成分分析
```

原有首页 / 拍照页 UI 不需要改成三个入口；本轮只更新规划文档，不实现扫码、二维码解析或 UI 改版。

### 已完成修改

1. `CODEX_TASKS.md` 新增后续 `CONSUMER-LABEL-G`，明确保持单一拍照入口，由后端自动识别条码、数字标签二维码、配料表 / 营养成分表。
2. `PROJECT_PLAN.md` 同步路线图、未完成项、下一步和最近修改记录，标明本轮只做规划，不改现有 UI。
3. `docs/product-blueprint/PRODUCT_SPEC.md`、`CONSUMER_DECISION_SPEC.md`、`CONSUMER_UX_SPEC.md` 改为“单一拍照入口自动识别分流”模型，避免后续把条码、二维码和 OCR 做成三个外露入口或串行流程。
4. `docs/product-blueprint/API_CONTRACT.md` 保留后续条码 / 数字标签服务接口规划，但明确它们是统一扫描链路识别后的后端分支能力，不是前端新增主入口。
5. `DATA_SOURCES.md` 与 `docs/product-blueprint/DATA_TRUST_SPEC.md` 增加 `product_catalog` 和 `digital_label` 来源边界：商品条码和数字标签只能作为商品/标签线索来源，必须进入成分归一化和官方知识库匹配，不能直接作为官方法规结论。
6. `CODEX_TASKS.md` 将后续 `CONSUMER-LABEL-G` 标为 `blocked_by_user`，避免后续自动执行时误把 P1/P2 条码 / 数字标签能力当作当前可执行 Batch。
7. `CONSUMER_DECISION_SPEC.md`、`API_CONTRACT.md`、`FRONTEND_SPEC.md`、`QA_ACCEPTANCE_SPEC.md` 明确数字标签二维码不属于当前已实现 `labelType` 枚举；后续需通过独立 `scanObjectType` 或 schema 迁移表达。

### 风险与边界

- 商品条码数据源、数字标签标准/域名白名单、第三方数据授权和隐私合规仍需人工确认。
- 条码商品库和数字标签页面不得直接生成 `verified_regulation`、GB 2760 使用范围、限量、ADI 或安全结论。
- 识别分支信息不足时，只提示用户重新拍摄包装其他区域或手动补充，不自动跳转其他分支，不伪造配料。

### 验证

已通过：

- `git diff --check`
