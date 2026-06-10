# AI Review

## 任务目标

将项目英文名统一改为 `CompCheck`，中文名统一改为 `成分小查`。

## 修改摘要

- 更新 `package.json` 和 `package-lock.json` 包名为 `compcheck`。
- 更新页面标题、meta 描述、导航品牌和品牌标记。
- 更新本地存储 key 前缀为 `compcheck:*`。
- 更新开发服务器启动日志。
- 同步更新 `.env.example`、`COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/index.html`
- `src/store/userStore.js`
- `scripts/dev-server.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run lint
npm run test
npm run build
npm run dev
curl -I http://127.0.0.1:5173/
```

## 验证结果

- `npm run lint`：通过，20 个 JavaScript 文件检查通过，22 个文本文件扫描完成。
- `npm run test`：通过，成分搜索、文本分析、AI/OCR 降级路径测试通过。
- `npm run build`：通过，构建产物输出到 `dist/`。
- `npm run dev`：通过，服务启动日志显示 `CompCheck dev server running at http://127.0.0.1:5173`。
- `curl -I http://127.0.0.1:5173/`：通过，返回 `HTTP/1.1 200 OK`。

## 风险点

- 本地存储 key 已从 `ingrelens:*` 改为 `compcheck:*`，旧浏览器本地收藏和历史不会自动迁移。
- 仓库目录名仍是 `ingreLens`，本轮只改应用项目名和展示名，不重命名本地文件夹。

## 本次 git diff 摘要

- 应用品牌从 IngreLens 改为 CompCheck（成分小查）。
- 文档同步记录新项目名。
