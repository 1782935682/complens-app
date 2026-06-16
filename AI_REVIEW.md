# AI Review — 2026-06-16

## README 合并整理

### 本轮目标

合并根目录同时存在的 `README.md` 与 `readme.md`，保留一个标准大小写入口，避免新成员、文档索引和 Agent 规则在两个入口之间跳转。

### 已检查并修改的文件

- `README.md`
- `readme.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/product-blueprint/README.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

### 已完成修改

1. 将原 `readme.md` 的完整产品与协作入口内容迁移为标准根目录 `README.md`。
2. 删除原 14 行薄入口 `README.md` 与小写 `readme.md` 的双入口结构，保留一个根目录 README。
3. 修正 `AGENTS.md`、`docs/README.md` 和产品蓝图文档中指向小写 `readme.md` 的引用。
4. 在 `PROJECT_PLAN.md` 最近修改记录中补充本轮文档整理记录。

### 影响范围与风险

- 仅文档入口和内部链接调整，不改变前端、后端、数据、命令或构建配置。
- `COMMANDS.md` 无需更新：本轮未新增或改变命令。
- `DATA_SOURCES.md` 无需更新：本轮未改变数据来源、数据状态或 GB2760 口径。

### 验证

- `git diff --check`（通过）
