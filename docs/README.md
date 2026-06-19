# Documentation Index

本目录是 CompLens / 成分镜（CompCheck）文档入口。根目录只保留协作入口和任务控制类文件，专题文档放在 `docs/` 下，完整产品/设计/前端/数据规范集中在 [`product-blueprint/`](product-blueprint/README.md)。

## 阅读顺序

1. 项目入口：[`../README.md`](../README.md)
2. **产品方向（单一事实来源）**：[`product-blueprint/PRODUCT_DIRECTION_2026H2.md`](product-blueprint/PRODUCT_DIRECTION_2026H2.md)
3. 当前任务与阶段：[`../CODEX_TASKS.md`](../CODEX_TASKS.md)
4. 项目计划和进度：[`../PROJECT_PLAN.md`](../PROJECT_PLAN.md)
5. 常用命令：[`../COMMANDS.md`](../COMMANDS.md)
6. 数据来源和可信规则：[`../DATA_SOURCES.md`](../DATA_SOURCES.md)

## 文档分类

| 分类 | 文档 | 用途 |
|---|---|---|
| 项目入口 | [`../README.md`](../README.md) | 产品主路径、架构、快速开始、文档导航 |
| 产品方向 | [`product-blueprint/PRODUCT_DIRECTION_2026H2.md`](product-blueprint/PRODUCT_DIRECTION_2026H2.md) | 方向修订：定位、人群、优先级、三版路线、取舍、付费 |
| 产品蓝图 | [`product-blueprint/README.md`](product-blueprint/README.md) | 产品 / 消费者决策 / UI / 视觉 / 前端 / 跨端 / API / 数据可信 / 后台 / 隐私 / 测试验收完整规范集 |
| Agent 规则 | [`../AGENTS.md`](../AGENTS.md) | Codex / Claude 工作规范和强约束 |
| 任务计划 | [`../CODEX_TASKS.md`](../CODEX_TASKS.md)、[`../PROJECT_PLAN.md`](../PROJECT_PLAN.md) | 阶段、批次、阻塞项、进度 |
| 命令手册 | [`../COMMANDS.md`](../COMMANDS.md) | 本地启动、构建、校验、GB2760 数据命令 |
| 数据治理 | [`../DATA_SOURCES.md`](../DATA_SOURCES.md) | 官方来源、可信状态、GB2760 staging/promote 规则 |
| 数据库 | [`database.md`](database.md) | PostgreSQL 连接、表设计、字段含义、初始化 SQL 入口 |
| 部署 | [`deployment.md`](deployment.md) | 新机器从零部署 PostgreSQL、后端、前端和本机 OCR |
| 外部系统 | [`../INTEGRATIONS.md`](../INTEGRATIONS.md) | 数据库、OCR、AI、部署等外部组件目录、配置和命令 |
| 审查记录 | [`../AI_REVIEW.md`](../AI_REVIEW.md) | AI review 口径、近期批次风险和验证记录 |
| 平台能力 | [`platform/`](platform/) | 微信小程序（[`wechat-mini-program.md`](platform/wechat-mini-program.md)）、iOS（[`ios-plist-additions.md`](platform/ios-plist-additions.md)）、PWA 离线（[`pwa-offline-capability.md`](platform/pwa-offline-capability.md)） |
| 后端实现 | [`../backend/README.md`](../backend/README.md) | 后端 API、Docker、后端本地开发 |
| 源材料 | [`source-materials/`](source-materials/) | 官方 PDF / 公告原件（`source-materials-manifest.json` 为脚本读取的清单） |
| 历史任务 | [`codex-tasks/`](codex-tasks/) | 历史批次任务归档（如食品数据导入） |

## 更新规则

- 新增外部系统时，同步更新 [`../INTEGRATIONS.md`](../INTEGRATIONS.md)，记录目录、配置、启动命令、验证命令和生产替换方式。
- 新增或修改数据库表、字段、索引、迁移、seed 行为时，同步更新 [`database.md`](database.md)。
- 新机器部署步骤、端口、服务启动顺序或生产替换方式变化时，同步更新 [`deployment.md`](deployment.md)。
- 新增数据来源或可信状态时，同步更新 [`../DATA_SOURCES.md`](../DATA_SOURCES.md)。
- 新增命令或改变启动方式时，同步更新 [`../COMMANDS.md`](../COMMANDS.md)。

> 注：`docs/` 下的数据治理 / 数据质量 / 审查报告（覆盖率、冲突、待复核、download-report 等）由脚本本地生成，已在 `.gitignore` 中排除、不再入库；需要时运行对应脚本（见 [`../COMMANDS.md`](../COMMANDS.md)）在本地重新生成。
