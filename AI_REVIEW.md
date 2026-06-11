# AI Review - Share Flow

## 任务目标

新增分享闭环，让用户在成分详情、分析报告和成分对比页面可以使用系统分享；桌面浏览器或不支持 Web Share 时，自动复制可读分享文本。

## 修改摘要

- 新增 `src/services/shareService.js`，统一构建成分详情、报告详情和成分对比分享 payload。
- 成分详情页新增分享按钮和状态反馈。
- 报告详情页新增分享报告按钮，保留原有 Markdown / JSON 导出。
- 成分对比页新增分享对比按钮，空对比状态不展示分享入口。
- 主入口新增 Web Share 调用和复制 fallback。
- PWA shell 缓存版本升到 `compcheck-shell-v13`，并预缓存分享服务。
- 补充分享 payload、页面入口、主事件和 service worker 缓存测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/services/shareService.js`
- `src/pages/detailPage.js`
- `src/pages/reportsPage.js`
- `src/pages/comparePage.js`
- `src/main.js`
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
- `npm run lint` 通过。
- `npm run test` 通过。
- `npm run build` 通过，构建产物输出到 `dist/`。
- `git diff --check` 通过。
- `curl -I http://127.0.0.1:5180/`、`/main.js`、`/pages/detailPage.js`、`/pages/reportsPage.js`、`/pages/comparePage.js`、`/services/shareService.js` 和 `/sw.js` 均返回 HTTP 200。

## 风险点

- Web Share 能力取决于浏览器和系统环境；已提供复制 fallback。
- 已按 Codex 审阅意见区分用户取消系统分享的 `AbortError`，取消时只提示状态，不再自动复制到剪贴板。
- 当前分享内容是文本和本地 hash 链接，不是服务端公开报告链接；跨设备打开仍依赖本机数据是否存在。
- 分享内容仍基于草稿数据集，不代表食品添加剂数据已完成正式审核。

## 本次 git diff 摘要

- 新增分享 payload 构建服务。
- 详情、报告、对比三条主流程新增分享入口。
- 主事件接入 Web Share 与复制 fallback。
- 更新 PWA 预缓存版本与测试覆盖。
