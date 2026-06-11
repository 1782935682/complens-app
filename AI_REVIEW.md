# AI Review - Legal Center

## 任务目标

新增隐私与条款产品闭环，让用户能从设置页、会员中心、支持中心和页脚进入合规材料中心，查看隐私政策、服务条款、订阅说明、数据安全和内容来源边界，为 App Store / Google Play 上架材料提前建立应用内入口。

## 修改摘要

- 新增合规内容数据模型，覆盖隐私、服务条款、订阅、数据安全和内容来源说明。
- 新增 `/legal` 合规中心和 `/legal/:id` 单篇说明页面。
- 设置页新增隐私与条款入口。
- 会员中心权益边界新增订阅说明入口。
- 支持中心支持边界新增隐私说明入口。
- 页脚新增固定隐私与条款入口。
- 路由、页面标题、桌面设置 active 态和移动端“我的” active 态接入合规中心。
- 更新移动端样式和 PWA app shell 缓存清单，缓存版本升到 `compcheck-shell-v9`。
- 补充合规中心路由、渲染、入口和 service worker 缓存清单测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/data/legalContent.js`
- `src/pages/legalPage.js`
- `src/pages/settingsPage.js`
- `src/pages/membershipPage.js`
- `src/pages/supportPage.js`
- `src/router/router.js`
- `src/index.html`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，50 条食品添加剂记录校验成功。
- `npm run lint` 通过，44 个 JavaScript 文件和 50 个文本文件检查成功。
- `npm run test` 通过。
- `npm run build` 通过，构建产物输出到 `dist/`。
- `git diff --check` 通过。
- `curl -I http://127.0.0.1:5178/`、`/pages/legalPage.js`、`/data/legalContent.js` 和 `/sw.js` 均返回 HTTP 200。

## 风险点

- 当前合规材料仍是产品内草案，不构成正式法律文本；正式上线前必须结合真实服务商、SDK、后端、支付和平台表单复核。
- 订阅说明只描述当前未接入和未来要求，不代表 Apple IAP、Google Play Billing 或服务端 entitlement 已完成。
- 隐私和数据安全说明需要在接入账号、云同步、OCR、AI、客服工单、统计分析或崩溃监控后继续更新。

## 本次 git diff 摘要

- 新增隐私与条款用户流程入口。
- 新增合规内容模型和合规页面。
- 扩展设置页、会员中心、支持中心和页脚入口。
- 更新 PWA 预缓存与测试覆盖。
