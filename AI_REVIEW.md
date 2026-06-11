# AI Review - Capacitor Scaffold

## 任务目标

完成 `CODEX_TASKS.md` Batch 2-B：为现有 Vite Web 应用补齐 Capacitor 项目脚手架，让后续 iOS/Android 原生权限、同步和人工平台配置可以在明确命令下继续推进。

## 修改摘要

- 安装 `@capacitor/core`、`@capacitor/cli`、`@capacitor/ios`、`@capacitor/android`，并更新锁文件。
- 按 PR review 反馈将 Capacitor 固定在 7.x，避免 Capacitor 8 的 Node 22+ engine 要求和仓库 Node 20.19 口径冲突。
- 新增 `capacitor.config.json`，固定 `appId`、`appName`、`webDir` 和 Android scheme。
- 增加 `cap:sync`、`cap:open:ios`、`cap:open:android` 命令。
- 在 `.gitignore` 忽略本机生成的 `ios/` 和 `android/` 平台目录，仅保留 Capacitor 配置入库。
- `scripts/test.mjs` 增加 Capacitor 依赖主版本、CLI Node engine、脚本、配置和忽略规则断言，避免脚手架后续被误删或误升主版本。
- 同步更新 `COMMANDS.md`、`CODEX_TASKS.md` 和 `PROJECT_PLAN.md`，当前最早未完成任务推进到 Batch 2-C。

## 修改文件

- `capacitor.config.json`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `scripts/test.mjs`
- `CODEX_TASKS.md`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run build && npx cap sync
npx cap doctor
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

## 验证结果

- `npm run build` 通过，生成 `dist/` 产物。
- `npx cap add ios` 通过，已生成本机 `ios/` 平台目录并同步 Web 产物。
- `npx cap add android` 通过，已生成本机 `android/` 平台目录并同步 Web 产物。
- `npm run cap:sync` 通过，Vite 构建和 Capacitor 两端同步均成功。
- `npm view @capacitor/cli@7 version engines` 确认 Capacitor 7.x CLI 要求 `node >=20.0.0`，最新 7.x 为 7.6.6。
- `npx cap doctor` 检测到已安装 Capacitor 7.6.6 依赖，Android 状态正常；因本机未安装 Xcode 返回非零状态，属于本批次允许的本机 IDE 缺失提示。
- `npm run validate:data` 通过，100 条食品添加剂记录校验成功。
- `npm run lint` 通过，46 个 JavaScript 文件和 53 个文本文件扫描成功。
- `npm run test` 通过。
- `npm run build` 通过。
- `git diff --check` 通过。

## 风险点

- `npx cap add ios` 和 `npx cap add android` 会生成本机平台目录；本批次按任务要求将 `ios/`、`android/` 放入 `.gitignore`，因此 PR 中不提交原生工程模板。
- `npx cap doctor` 在没有 Xcode、Android Studio 或 SDK 的机器上可能提示本机环境缺失；只要 Capacitor 配置本身无报错，本批次仍可验收。
- 还没有接入 Capacitor Camera / Share / Filesystem 插件，扫描和分享仍使用 Web 逻辑；原生权限与降级逻辑留给 Batch 2-C。

## 本次 git diff 摘要

- 新增 Capacitor 配置和移动端同步/打开命令。
- 锁定 Capacitor 7.x 依赖并增加配置与 Node engine 回归断言。
- 同步任务清单、命令文档和项目进度到 Batch 2-C / 25%。
