# AI Review — 2026-06-15 user-uniapp 用户端迁移

## 本轮目标

作为 CompLens / 成分镜 前端迁移主 Agent，本轮实际创建正式用户端 `user-uniapp/`，将食品标签拍照解读主流程迁移到 uni-app + Vue3，目标覆盖 H5/PWA、微信小程序、Android、iOS。

旧 `src/` Web/PWA 原型保留为历史原型和迁移来源；本轮不删除旧前端、不重构后端、不部署生产、不修改生产数据库、不伪造 OCR 或数据来源。

## 已检查文件

- `README.md`
- `readme.md`
- `AGENTS.md`
- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `COMMANDS.md`
- `AI_REVIEW.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/README.md`
- `docs/product-blueprint/PRODUCT_SPEC.md`
- `docs/product-blueprint/DESIGN_SYSTEM.md`
- `docs/product-blueprint/VISUAL_STYLE_GUIDE.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/PAGE_STRUCTURE.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/API_CONTRACT.md`
- `docs/product-blueprint/DATA_TRUST_SPEC.md`
- `docs/product-blueprint/CONSUMER_UX_SPEC.md`
- `docs/product-blueprint/CONSUMER_DECISION_SPEC.md`
- `docs/product-blueprint/UI_ROADMAP.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `package.json`
- `backend/package.json`

本轮用户指定的必读文档均存在；未发现缺失项。

## 已完成迁移

1. 新增 `user-uniapp/`，使用 uni-app + Vue3 + TypeScript，保留旧 `src/` 不删除。
2. 新增页面：首页、拍照/上传、OCR、标签类型、文本确认、配料拆分、营养解析、匹配确认、食品标签解读报告、历史、我的关注项、成分搜索、数据说明、隐私说明。
3. 新增基础组件：Button、Card、StatusTag、SourceBadge、ConfidenceBadge、ImageUploader、StepIndicator、IngredientChip、ReportSummaryCard、BottomNav、Toast、Modal、LoadingState、EmptyState、ErrorState。
4. 新增 `user-uniapp/src/styles/tokens.css`，按产品蓝图落地薄荷绿主色、16px 圆角、44px 点击区域、安全区和三态样式。
5. 新增集中 API client：`user-uniapp/src/services/api/`，统一 baseURL、timeout、错误处理和后端 API 调用边界。
6. 新增平台适配层：`camera`、`file`、`storage`、`share`；前端不直连 OCR / AI / 数据库 / GB2760 导入脚本，不暴露 Key。
7. OCR 调用只走后端 `/api/ocr`；失败时进入重试或手动输入，不返回假识别文字。
8. 缺失后端接口使用明确标注的本地 parser 或 `mockOnly` adapter，不展示为真实权威来源。
9. 本地关注项、扫描草稿和历史报告使用 `uni` storage 保存小型元数据；H5 `File` 对象不持久化，图片二进制不写入 localStorage。
10. 同步 `COMMANDS.md`、`PROJECT_PLAN.md`、`CODEX_TASKS.md`、`readme.md`、`README.md` 和产品蓝图文档状态。

## 验证结果

- `cd user-uniapp && npm install`：通过。最初 DCloud `vue3` alpha 标签依赖缺包，已改为 npm 可解析的同版本稳定组合。
- `cd user-uniapp && npm run lint`：通过。
- `cd user-uniapp && npm run typecheck`：通过。期间修复 uni-app 路由、chooseImage、request method 类型问题。
- `cd user-uniapp && npm run build:h5`：通过。期间修复 DCloud Vite 插件 CommonJS 导出兼容问题。
- `cd user-uniapp && npm run build:mp-weixin`：通过，产物位于 `user-uniapp/dist/build/mp-weixin`，仍需微信开发者工具导入和真机验收。

后端代码未改动，未运行后端 typecheck/test/build。GB2760 数据未改动，未运行数据导入或 promote。

## 仍有风险

1. `POST /api/labels/classify`、`POST /api/nutrition/parse`、`POST /api/reports/label` 等后端正式接口仍未实现；当前 `user-uniapp` 使用本地 parser / mock-only adapter 完成 MVP 闭环。
2. 生产 OCR、AI、生产数据库、登录云同步、支付订阅和上架均需要人工账号、Key、法务或部署材料，继续标记为后置或 `blocked_by_user`。
3. H5 和微信小程序构建已通过，但 iPhone Safari、微信开发者工具、Android/iOS 真机拍照/相册/文件缓存/权限仍需人工验收。
4. 报告页文案已避开绝对购买或医疗化结论，但仍建议产品人工走查普通消费者可读性。
5. `admin-web/` 后台管理端仍未创建，本轮仅迁移用户端。

## 建议下一步

1. 补后端正式标签扫描、分类、营养解析、报告生成 API，逐步替换前端本地 adapter。
2. 用微信开发者工具导入 `user-uniapp/dist/build/mp-weixin`，补真机相机、相册、文件缓存和隐私权限验收。
3. 对 `user-uniapp` 报告页、关注项命中和数据来源说明做一次产品文案走查。
