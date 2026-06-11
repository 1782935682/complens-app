# AI Review - Native Share URL Follow-up

## 任务目标

处理 PR #47 合并后通过 `@codex review` 发现的 follow-up 问题：native Capacitor 环境分享时不能把 `capacitor://localhost`、`https://localhost` 或 hash/相对路径这类应用内部 URL 发给用户。

## 修改摘要

- `sharePayloadWithFallback()` 在调用 native share 前会生成 native 专用 payload。
- 新增 `sanitizeNativeSharePayload()`，在 native 分享路径清理内部 URL。
- 清理范围覆盖 `capacitor://...`、`localhost`、`127.0.0.1`、`0.0.0.0`、hash-only 和相对路径。
- 公共 URL 或后续配置的非内部 deep link 不会被清理。
- `shareWithNative()` 只有在 URL 非空时才传给 `Share.share()`。
- Web Share 和复制 fallback 仍保持原有 Web URL 行为；native share 失败后若继续 fallback，会使用清理后的 payload，避免复制内部链接。
- 补充回归测试覆盖内部 URL 清理、公共 URL 保留和 native share 注入路径。

## 修改文件

- `src/services/shareService.js`
- `src/services/nativeBridgeService.js`
- `scripts/test.mjs`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
npx cap sync
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，100 条食品添加剂记录校验成功。
- `npm run lint` 通过，47 个 JavaScript 文件和 53 个文本文件扫描成功。
- `npm run test` 通过。
- `npm run build` 通过，生成 Vite 生产产物。
- `npx cap sync` 通过，Android 和 iOS 均识别 `@capacitor/camera@7.0.5`、`@capacitor/filesystem@7.1.8`、`@capacitor/share@7.0.4`。
- `git diff --check` 通过。

## 风险点

- 当前没有正式公网 Web 域名或 app deep link 配置，因此 native share 会省略内部 URL，只分享标题和文本。
- 后续如果接入正式 Web 域名或 deep link，需要将 payload base URL 改为正式地址，并保留本次内部 URL 防护。

## 本次 git diff 摘要

- native 分享不会泄露 Capacitor/localhost 内部 URL。
- 分享 fallback 继续保留桌面 Web 的正常链接。
- 回归测试固定内部 URL 清理行为。
