# AI Review - 2026-06-12 M-B PWA 体验优化与离线能力

## 本轮目标

按 `CODEX_TASKS.md` 当前批次推进：

- Batch M-B：PWA 体验优化与离线能力

本批次不处理真实 OCR Key、真实 AI Key、生产数据库、自动部署、远程服务器操作、支付订阅、商店上架、iOS/Android 签名、官方数据逐条审核和生产图片/CDN 存储。

## 本轮完成

1. `public/manifest.webmanifest` 更新为“成分镜”安装信息，补 `id`、`display_override`、`orientation`、类别、语言方向、扫描/搜索快捷方式和 72-512 多尺寸 PNG 图标。
2. 基于现有 SVG 图标生成 `public/icons/icon-72.png`、`icon-96.png`、`icon-128.png`、`icon-144.png`、`icon-152.png`、`icon-192.png`、`icon-384.png`、`icon-512.png`。
3. `public/sw.js` 更新到 `compcheck-shell-v23`，区分 app shell、成分 API、用户 API、OCR API、图片/图标和其他请求策略，并在 install 阶段解析 `index.html` 预热 Vite 产物 JS/CSS；运行时刷新 HTML 前会先缓存新 HTML 引用的 Vite bundles，图片/图标请求可回退读取 shell 预缓存，避免首次离线启动只有 HTML、图标缺失或 hash bundle 缺失。
4. OCR API 保持 `network-only`，避免缓存识别图片或识别结果；登录态 auth/user API 同样不写入 Cache Storage，避免共享设备串读账号数据；成分 API 采用 network-first，并在离线时返回缓存或明确离线响应。
5. `src/index.html` 新增全局离线横幅、PWA 安装提示容器、iOS `black-translucent` 状态栏、`成分镜` Apple Web App 标题和 Apple touch icon。
6. `src/main.js` 新增 `navigator.onLine` 离线状态监听、离线横幅高度变量、`beforeinstallprompt` 捕获、第三次打开后的安装提示、iOS 添加到主屏幕指引和安装/关闭状态持久化。
7. `src/styles.css` 补 `100dvh` 高度兜底、顶部 safe-area 补偿、离线横幅/header sticky 遮挡修复、iOS 输入框 16px zoom 修复、安装提示和设置页离线能力列表样式。
8. `src/pages/settingsPage.js` 新增“离线与安装”区块，列出本机历史报告、收藏与本机档案、OCR、账号与云同步的离线/联网边界。
9. 新建 `docs/pwa-offline-capability.md`，说明离线能力矩阵、service worker 策略、安装提示和人工验收步骤。
10. `scripts/test.mjs` 补 manifest、iOS meta、safe-area、离线横幅/header offset、安装提示、service worker v23 策略、Vite bundle 预缓存、HTML 更新前 bundle 缓存、图片/图标 shell cache 回退、登录态 API 不缓存、设置页离线说明和 PWA 文档断言。
11. `CODEX_TASKS.md` 和 `PROJECT_PLAN.md` 已同步：M-B 标记完成，整体产品进度更新为 46%，下一项为等待 AI API Key 的 A-A。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| Lighthouse PWA 检查 | needs_browser_tooling | 在浏览器 Lighthouse 中确认 PWA 得分、manifest、service worker 和离线启动结果 |
| iPhone Safari 添加到主屏幕验收 | needs_manual_device | 真机截图或反馈，确认状态栏、`100dvh`、输入框 zoom、底部 tabbar 和安装后启动表现 |
| Android Chrome 安装与 shortcuts 验收 | needs_manual_device | 真机确认第三次打开后的安装提示、添加到主屏幕、长按图标快捷方式 |
| 离线/弱网浏览器验收 | needs_manual_or_tooling | DevTools offline/slow 3G 或真机弱网结果，确认历史/收藏可看、OCR 和云同步会提示联网 |
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
codex review --uncommitted
```

以上已通过。`codex review --uncommitted` 已发现并推动修复登录态 API 缓存隔离、iOS 顶部 safe-area、Vite bundle 首次离线预缓存、运行时 HTML 更新前 bundle 缓存、图片/图标 shell cache 回退、离线横幅遮挡 header 和 iOS 安装标题不一致问题；最终复跑结果为未发现 actionable correctness issue。本轮未运行 Lighthouse、真机安装、浏览器截图、axe 或完整 E2E 验收；这些仍需要人工或后续专项环境接入。

## 当前风险

1. M-B 只完成 Web/PWA 层面的安装和离线基础，不代表 iOS/Android 原生工程、签名或商店上架完成。
2. service worker 只为非登录态 GET 请求提供缓存兜底；离线写入、冲突解决和同步队列仍未实现。
3. 安装提示受浏览器限制，`beforeinstallprompt` 不一定每次触发；iOS 仍需要用户通过分享菜单手动添加到主屏幕。
4. PNG 图标基于当前 SVG 生成，可以满足 PWA 安装测试，但正式商店素材和 1024x1024 App Icon 仍需人工设计/验收。
5. OCR、AI、生产数据库、官方数据审核和跨设备图片恢复仍未完成。

## 下一步

当前没有无阻塞的 Codex 可直接执行批次。下一项 `Batch A-A：AI 解释层集成` 需要先人工提供 AI API Key 和成本边界。
