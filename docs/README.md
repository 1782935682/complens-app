# Documentation Index

本目录是 CompLens / 成分镜（CompCheck）文档入口。根目录保留协作入口和任务控制文件，专题文档放在 `docs/` 下，避免 README、命令、数据来源和外部系统说明混在一起。

## 阅读顺序

1. 项目入口：[`../README.md`](../README.md)
2. 当前任务与阶段：[`../CODEX_TASKS.md`](../CODEX_TASKS.md)
3. 项目计划和进度：[`../PROJECT_PLAN.md`](../PROJECT_PLAN.md)
4. 常用命令：[`../COMMANDS.md`](../COMMANDS.md)
5. 数据来源和可信规则：[`../DATA_SOURCES.md`](../DATA_SOURCES.md)

## 文档分类

| 分类 | 文档 | 用途 |
|---|---|---|
| 项目入口 | [`../README.md`](../README.md) | 产品主路径、快速开始、历史协作说明 |
| Agent 规则 | [`../AGENTS.md`](../AGENTS.md) | Codex / Claude 工作规范和强约束 |
| 任务计划 | [`../CODEX_TASKS.md`](../CODEX_TASKS.md)、[`../PROJECT_PLAN.md`](../PROJECT_PLAN.md) | 阶段、批次、阻塞项、进度 |
| 产品蓝图 | [`product-blueprint/README.md`](product-blueprint/README.md) | 产品 / 消费者决策 / UI / 视觉 / 前端 / 跨端 / API / 数据可信 / 后台 / 隐私 / 测试验收完整规范集 |
| 部署 | [`deployment.md`](deployment.md) | 新机器从零部署 PostgreSQL、后端、前端和本机 OCR |
| 命令手册 | [`../COMMANDS.md`](../COMMANDS.md) | 本地启动、构建、校验、GB2760 数据命令 |
| 数据治理 | [`../DATA_SOURCES.md`](../DATA_SOURCES.md) | 官方来源、可信状态、GB2760 staging/promote 规则 |
| 数据库 | [`database.md`](database.md) | PostgreSQL 连接、表设计、字段含义、初始化 SQL 入口 |
| 外部系统 | [`../INTEGRATIONS.md`](../INTEGRATIONS.md) | 数据库、OCR、AI、部署等外部组件目录、配置和命令 |
| 审查记录 | [`../AI_REVIEW.md`](../AI_REVIEW.md) | AI review 口径、近期批次风险和验证记录 |
| 平台能力 | [`pwa-offline-capability.md`](pwa-offline-capability.md)、[`ios-plist-additions.md`](ios-plist-additions.md) | PWA / iOS 平台补充说明 |
| 后端实现 | [`../backend/README.md`](../backend/README.md) | 后端 API、Docker、后端本地开发 |

## 更新规则

- 新增外部系统时，同步更新 [`../INTEGRATIONS.md`](../INTEGRATIONS.md)，记录目录、配置、启动命令、验证命令和生产替换方式。
- 新增或修改数据库表、字段、索引、迁移、seed 行为时，同步更新 [`database.md`](database.md)。
- 新机器部署步骤、端口、服务启动顺序或生产替换方式变化时，同步更新 [`deployment.md`](deployment.md)。
- 新增数据来源或可信状态时，同步更新 [`../DATA_SOURCES.md`](../DATA_SOURCES.md)。
- 新增命令或改变启动方式时，同步更新 [`../COMMANDS.md`](../COMMANDS.md)。
