# AI Review - 2026-06-12 M-A 首页与导航重构

## 本轮目标

按 `CODEX_TASKS.md` 当前最早可执行的 Codex 批次推进：

- Batch M-A：首页与导航重构 + 设计系统落地

本批次不处理真实 OCR Key、真实 AI Key、生产数据库、支付订阅、商店上架、iOS/Android 签名、官方数据逐条审核和生产图片/CDN 存储。

## 本轮完成

1. 首页新增“成分镜” appbar 和设置入口，设置入口补 `aria-label`。
2. 首页首屏突出全宽“拍照识别配料表”主 CTA，并保留类别切换、首次设置提示和食品数据状态。
3. 首页新增本机状态摘要、最近分析产品、独立成分搜索分区和热门类别分区。
4. 首页热门成分、最近查询、分类缺数据时改为统一 empty state，并提供下一步操作。
5. 收藏、历史、报告列表、产品档案、支持中心和数据治理页的页面级空态改为统一 `empty-state` 结构。
6. 搜索页和详情页后端 loading 状态补 skeleton；后端失败状态改为统一 `error-state`，并提供可重新触发当前路由请求的重试按钮。
7. 底部导航改为首页 / 识别 / 搜索 / 历史 / 我的，保留 `nav` + link 语义，通过 `aria-current="page"` 标识当前入口，并突出中间“识别”入口。
8. `src/styles.css` 补设计系统变量、skeleton 动画、页面级 empty/error 状态、移动 tabbar 状态色和 `page-enter` 页面进入动画。
9. PWA cache 更新到 `compcheck-shell-v22`，避免旧 app shell 继续缓存旧首页和底部导航。
10. `scripts/test.mjs` 补首页结构、mobile nav 子路由 active、skeleton、error retry、page-enter、service worker 版本和设计变量断言。
11. `CODEX_TASKS.md` 和 `PROJECT_PLAN.md` 已同步：M-A 标记完成，下一批 Codex 任务为 M-B，整体产品进度更新为 45%。
12. `CODEX_TASKS.md` 新增“部署资源、成本控制与人工部署原则”，明确当前阶段优先使用已有 Oracle Cloud 服务器、禁止未授权自动部署和新增付费云资源。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| iPhone Safari 底部 Tab 验收 | needs_manual_device | 真机或模拟器截图，确认底部 Tab 不被 Home Bar 遮挡，中间“识别”入口不压住内容 |
| 基础 Accessibility 检查 | needs_manual_or_tooling | 浏览器/axe 检查结果，重点看 mobile nav 语义、焦点顺序、错误重试按钮和动态状态朗读 |
| 设计视觉验收 | needs_manual_review | 小屏和桌面首页截图，确认首页信息密度、主 CTA、热门类别和空态视觉是否符合预期 |
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| 生产图片/CDN 存储 | blocked_by_user | 对象存储/CDN 方案、上传 API、安全策略和缩略图 URL 策略 |

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
codex review --uncommitted
```

均已通过。`codex review --uncommitted` 首轮发现移动底栏 404 路由不应高亮首页，已修复并复跑通过。本轮未运行真机、浏览器截图、axe 或完整 E2E 验收；这些仍需要人工或后续专项环境接入。

## 当前风险

1. M-A 只完成移动 Web 信息架构和状态组件，不能视为 iOS/Android 真机体验已完成。
2. 页面级空态已统一；详情字段级“暂无信息”仍保留轻量文本占位，后续可在设计走查中决定是否继续组件化。
3. 现有 CSS 历史代码仍有部分旧颜色字面量；本批新增设计系统已尽量通过变量驱动，但不是全量样式重构。
4. 本地 Codex review 要求底部导航保留导航链接语义；因此未按早期任务草案使用 `role="tablist"` / `role="tab"` 伪装 tab widget。
5. 真实 OCR、AI、生产数据库、官方数据审核和跨设备生产图片恢复仍未完成。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch M-B：PWA 体验优化与离线能力`。
