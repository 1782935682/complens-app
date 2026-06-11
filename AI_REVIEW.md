# AI Review - Membership Center

## 任务目标

新增会员中心前端闭环，让用户能查看当前 Free 套餐、Pro 规划、本机用量、购买/恢复/管理订阅状态，并明确真实订阅支付与服务端权益校验尚未接入。

## 修改摘要

- 新增 `/membership` 路由、页面标题、桌面导航入口和移动端“我的”active 态。
- 新增会员套餐数据和权益占位服务，区分当前 Free 与规划中的 CompCheck Pro。
- 会员中心展示当前套餐、本机报告/历史/OCR/同步用量、套餐对比和订阅操作。
- 购买、恢复购买、管理订阅和客服按钮只返回未接入提示，不模拟购买成功或订阅状态。
- 设置页新增会员中心入口，按当前类别跳转。
- 更新移动端样式和 PWA app shell 缓存清单，缓存版本升到 `compcheck-shell-v6`。
- 补充会员中心路由、导航、渲染、服务和 service worker 缓存清单测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/data/membershipPlans.js`
- `src/services/membershipService.js`
- `src/pages/membershipPage.js`
- `src/pages/settingsPage.js`
- `src/router/router.js`
- `src/index.html`
- `src/main.js`
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

- `npm run validate:data`：通过。
- `npm run lint`：通过。
- `npm run test`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。
- `curl -I http://127.0.0.1:5173/`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/pages/membershipPage.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/services/membershipService.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/sw.js`：通过，返回 `HTTP/1.1 200 OK`。

## 风险点

- 当前只是前端会员中心信息架构，不具备真实 Apple IAP、Google Play Billing、恢复购买或服务端 entitlement 能力。
- 套餐价格、免费额度和 Pro 权益仍是产品草案，后续需要和真实订阅 SKU、退款策略、商店审核说明对齐。
- 本机用量来自 localStorage，不等同于跨设备、跨平台的可信用量统计。
- 仍需要移动端真机视觉验收，确认会员中心在小屏、动态字体和安全区下无遮挡。

## 本次 git diff 摘要

- 新增会员中心用户流程入口。
- 新增会员套餐与权益占位服务。
- 明确订阅操作未接入，不产生虚假付费状态。
- 更新 PWA 预缓存与测试覆盖。
