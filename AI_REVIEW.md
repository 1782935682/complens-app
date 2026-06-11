# AI Review - Ingredient Compare

## 任务目标

新增成分对比产品闭环，让用户能从搜索结果、详情页和收藏页把同类别成分加入本机对比列表，并在 `/compare` 页面横向比较关注等级、功能分类、使用提醒、过敏原和食品数据状态。

## 修改摘要

- 新增本机对比列表存储，最多保存同类别 4 个成分，并随本机数据快照导出、导入和清空。
- 新增 `compareService` 汇总对比数据，统一生成横向对比行。
- 新增 `/compare` 页面，支持空状态、单项提示、对比卡片、横向表格、移出和清空。
- 搜索结果、详情页和收藏页新增加入对比入口，并提供本页状态反馈。
- 路由、桌面导航、页面标题和移动端 active 态接入成分对比。
- 设置页本机数据摘要新增对比列表数量。
- 更新移动端样式和 PWA app shell 缓存清单，缓存版本升到 `compcheck-shell-v7`。
- 补充成分对比路由、渲染、存储、导出导入和 service worker 缓存清单测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/services/compareService.js`
- `src/pages/comparePage.js`
- `src/store/userStore.js`
- `src/pages/searchPage.js`
- `src/pages/detailPage.js`
- `src/pages/favoritesPage.js`
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

- `npm run validate:data`：通过，50 条食品添加剂数据校验通过。
- `npm run lint`：通过，39 个 JavaScript 文件和 45 个文本文件扫描通过。
- `npm run test`：通过。
- `npm run build`：通过，已生成 `dist/`。
- `git diff --check`：通过。
- `curl -I http://127.0.0.1:5173/`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/pages/comparePage.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/services/compareService.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/sw.js`：通过，返回 `HTTP/1.1 200 OK`。

## 风险点

- 当前对比列表只存储在 localStorage，不具备账号同步、跨设备恢复或服务端可信状态。
- 横向表格已做移动端横向滚动，但仍需要真机截图验收来确认小屏触控和动态字体下的体验。
- 对比维度来自现有成分字段，食品逐条限量和来源条款仍处于草稿数据阶段。
- 暂未提供拖拽排序、分享链接或报告化导出，后续可作为 Pro 报告或高级工具能力扩展。

## 本次 git diff 摘要

- 新增成分对比用户流程入口。
- 新增对比服务和对比页。
- 扩展本机数据快照和设置页摘要。
- 更新 PWA 预缓存与测试覆盖。
