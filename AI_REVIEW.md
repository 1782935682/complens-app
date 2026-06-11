# AI Review - Support Center

## 任务目标

新增支持中心产品闭环，让用户能从设置页和会员中心进入 `/support`，记录订阅权益、数据纠错、扫描分析、隐私数据和功能问题，并把反馈记录纳入本机数据导出、导入和清空流程。

## 修改摘要

- 新增支持主题数据模型和支持记录 Markdown 复制服务。
- 新增本机支持记录存储，支持保存、读取、删除、按类别清空和本机快照导出导入。
- 新增 `/support` 页面，包含问题类型、标题、描述、联系方式、本机保存边界确认、最近反馈、复制、删除、清空和空状态。
- 设置页新增联系支持入口，并在本机数据摘要中展示反馈记录数量。
- 会员中心的“联系客服”改为跳转支持中心，不再停留在未接入提示。
- 路由、页面标题、桌面设置 active 态和移动端“我的” active 态接入支持中心。
- 更新移动端样式和 PWA app shell 缓存清单，缓存版本升到 `compcheck-shell-v8`。
- 补充支持中心路由、渲染、存储、导出导入、复制内容、删除清空和 service worker 缓存清单测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/data/supportTopics.js`
- `src/services/supportService.js`
- `src/pages/supportPage.js`
- `src/store/userStore.js`
- `src/pages/settingsPage.js`
- `src/pages/membershipPage.js`
- `src/router/router.js`
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

- `npm run validate:data`：通过，50 条食品添加剂数据校验通过。
- `npm run lint`：通过，42 个 JavaScript 文件和 48 个文本文件扫描通过。
- `npm run test`：通过。
- `npm run build`：通过，已生成 `dist/`。
- `git diff --check`：通过。
- `curl -I http://127.0.0.1:5177/`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5177/pages/supportPage.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5177/services/supportService.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5177/data/supportTopics.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5177/sw.js`：通过，返回 `HTTP/1.1 200 OK`。

## 风险点

- 当前支持记录只保存在 localStorage，不会真正提交到客服后台，也不具备跨设备同步。
- 复制反馈内容依赖浏览器剪贴板能力；不支持时只能显示失败状态，后续需要结合真实客服入口或邮件入口。
- 支持中心已加入本机数据导出/导入/清空，但还没有账号删除、服务端工单状态和客服 SLA。

## 本次 git diff 摘要

- 新增支持中心用户流程入口。
- 新增支持主题、支持记录服务和支持页。
- 扩展本机数据快照、设置页摘要和会员中心客服入口。
- 更新 PWA 预缓存与测试覆盖。
