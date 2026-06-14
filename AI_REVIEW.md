# AI Review — 2026-06-15 消费者食品标签解读文档优化

## 本轮目标

作为 CompLens / 成分镜 项目的二次审查与文档优化 Agent，继续审查和优化产品蓝图，使产品从偏专业的食品法规 / 数据库工具，调整为面向普通消费者的食品标签拍照解读与消费决策助手。

本轮只修改文档和任务清单，不修改业务代码，不运行部署，不导入 GB2760 PDF，不安装新依赖。

## 已检查文件

- `docs/product-blueprint/README.md`
- `docs/product-blueprint/PRODUCT_SPEC.md`
- `docs/product-blueprint/CONSUMER_DECISION_SPEC.md`
- `docs/product-blueprint/CONSUMER_UX_SPEC.md`
- `docs/product-blueprint/DESIGN_SYSTEM.md`
- `docs/product-blueprint/VISUAL_STYLE_GUIDE.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/DATA_TRUST_SPEC.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `docs/product-blueprint/ADMIN_CONSOLE_SPEC.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `AGENTS.md`
- `README.md` / `readme.md`
- `docs/README.md`
- `COMMANDS.md`
- `DATA_SOURCES.md`
- `package.json`
- `backend/package.json`

## 修复的问题

1. 新增 `CONSUMER_DECISION_SPEC.md`，把产品统一为“食品标签拍照解读 + 消费决策助手”，补齐超市购买前、控糖、低钠、给孩子买零食、过敏 / 忌口、少添加和两款商品对比场景。
2. 新增 `CONSUMER_UX_SPEC.md`，明确普通消费者默认视图、我的关注项、食品标签解读报告和禁止购买 / 医疗化结论的 UX 规则。
3. 将 MVP 从“配料表识别 + 添加剂查询”调整为“拍食品标签 → 识别配料表 / 营养成分表 → 我的关注项 → 普通人报告 → 保存历史”。
4. 将拍照对象从单一配料表扩展为配料表、营养成分表、包装正面卖点、条形码 / 产品名（后续）和未知标签。
5. 在 `API_CONTRACT.md` 补充标签扫描、标签分类、营养解析、包装卖点解析、食品标签报告、商品对比和用户关注项计划 API，并标记未实现状态。
6. 在 `CODEX_TASKS.md` 新增“消费者食品标签解读”阶段，拆分标签类型识别、营养表结构化、我的关注项、食品标签解读报告、包装卖点核对和商品对比任务。
7. 同步 `PRODUCT_SPEC.md`、`PAGE_STRUCTURE.md`、`FRONTEND_SPEC.md`、`DATA_TRUST_SPEC.md`、`UI_ROADMAP.md`、`QA_ACCEPTANCE_SPEC.md`、`PROJECT_PLAN.md`、`AGENTS.md` 和入口 README 的定位、红线文案和后续边界。

## 仍有风险

1. 当前代码层尚未实现营养成分表解析、标签类型识别、我的关注项本地设置和食品标签解读报告新结构。
2. 包装正面卖点核对、两款商品对比、扫码、云同步、AI 总结、小程序 / App、订阅 / 支付已后置，不能在核心闭环前抢占实现顺序。
3. 旧代码中已有历史功能名和页面名，后续实现时需要按新文档逐步重命名或兼容，不应一次性大重构。
4. 本轮未运行 build/test/lint，原因是用户要求只做文档优化且不改业务代码；合并前只做文档级检查。

## 建议 Codex 下一步

1. 先提交本轮消费者定位与文档同步 PR。
2. PR 合并后优先执行 `CONSUMER-LABEL-A`：标签类型识别与用户手动选择，不跳过文本确认。
3. 之后执行 `CONSUMER-LABEL-B/C/D`：营养表结构化、我的关注项本地设置、食品标签解读报告。
