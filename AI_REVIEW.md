# AI Review - Native Mobile Adapters

## 任务目标

完成 `CODEX_TASKS.md` Batch 2-C：为现有 Vite + Capacitor 基座接入原生相机/相册、系统分享、移动端安全区和 iOS 权限说明，同时保证 Web/桌面环境继续走现有降级路径。

## 修改摘要

- 安装 `@capacitor/camera`、`@capacitor/filesystem`、`@capacitor/share`，并锁定在 Capacitor 7.x 兼容范围。
- 新增 `src/services/nativeBridgeService.js`，集中封装 `Capacitor.isNativePlatform()`、`Camera.getPhoto()` 和 `Share.share()`，非 native 环境直接返回降级结果。
- 扫描页新增“系统相机/相册”入口；native 环境调用 Camera，Web 或异常时自动触发现有文件输入。
- 分享链路从页面内逻辑迁移到 `shareService`，按原生分享、Web Share API、复制文本三层降级。
- 将 viewport 改为 `viewport-fit=cover`，并用 `max(env(safe-area-inset-bottom, 0px), 1rem)` 加强移动端底部安全区。
- 新增 `docs/ios-plist-additions.md`，记录 iOS Info.plist 中相机和相册权限描述。
- 更新 `public/sw.js` 到 `compcheck-shell-v17`，避免移动 shell 静态资源缓存旧版本。
- 补充测试覆盖 Capacitor 插件主版本、非 native Camera/Share fallback、viewport、安全区和 iOS 权限文档。
- 同步更新 `COMMANDS.md`、`CODEX_TASKS.md` 和 `PROJECT_PLAN.md`，当前最早未完成任务推进到 Batch 2-D 人工 iOS 工程配置。

## 修改文件

- `package.json`
- `package-lock.json`
- `src/services/nativeBridgeService.js`
- `src/services/shareService.js`
- `src/pages/scanPage.js`
- `src/main.js`
- `src/index.html`
- `src/styles.css`
- `public/sw.js`
- `docs/ios-plist-additions.md`
- `scripts/test.mjs`
- `COMMANDS.md`
- `CODEX_TASKS.md`
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

- native Camera 和 Share 逻辑目前只能在真机或模拟器中完整验收；Node 测试覆盖的是非 native 降级路径。
- `@capacitor/filesystem` 已安装但本批次尚未消费，后续报告文件、离线包或本地导出能力接入时再使用。
- iOS 权限描述已写入文档，真正写入 Info.plist 仍属于 Batch 2-D 人工 Xcode 配置。

## 本次 git diff 摘要

- 原生平台能力被封装为可降级服务，扫描和分享页面逻辑保持向后兼容。
- 移动端 viewport、安全区和 PWA shell 缓存随原生适配一起更新。
- 测试和文档同步记录 Batch 2-C 完成状态和下一步人工任务。
