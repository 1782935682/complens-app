# AI Review — 2026-06-15 PR #90 review fix

## 本轮目标

处理 PR #90 当前仍未解决的 Codex Review inline feedback。GitHub Actions checks 已确认全绿，剩余问题集中在 `user-uniapp/` 的两个 review blocker：

1. 营养成分表空字段不应触发“控糖 / 低钠”等关注项命中。
2. H5/PWA 的 `data:image` 图片不能只放模块级内存，也不能写入 uni storage；草稿只应保存元数据，图片二进制应进入 IndexedDB。

本轮不改生产部署、不改后端、不改 GB2760 数据、不伪造 OCR 或数据来源。

## 已检查文件

- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `user-uniapp/src/utils/reportBuilder.ts`
- `user-uniapp/src/stores/scanStore.ts`
- `user-uniapp/src/platform/file.ts`
- `user-uniapp/src/platform/imageStore.ts`
- `user-uniapp/src/types/index.ts`
- `user-uniapp/src/utils/nutritionParser.ts`
- `user-uniapp/src/pages/report/index.vue`

## 已完成修复

1. `buildAttentionHits()` 只把有 `value` 或 `sourceText` 的营养字段加入关注项匹配文本，避免 `getEditableNutritionFields()` 自动补齐的空白“糖 / 钠”字段误触发默认关注项。
2. 新增 `user-uniapp/src/platform/imageStore.ts`，H5/PWA 图片使用 IndexedDB `compcheck-images` / `scan-images` 存储 blob，并保留内存 fallback。
3. `scanStore` 持久化草稿时剥离 `File` 和 `data:image`，只保存 image id、mime、name、size 等元数据，不把 base64 写入 uni storage。
4. `readImageAsBase64()` 在读取临时路径失败或路径为空时，可按 image id 从 IndexedDB / 内存缓存回读图片，保证刷新或 WebView 恢复后 OCR 仍有可读图片来源。

## 验证结果

- `cd user-uniapp && npm run lint`：通过。
- `cd user-uniapp && npm run typecheck`：通过。
- `cd user-uniapp && npm run build:h5`：通过。
- `cd user-uniapp && npm run build:mp-weixin`：通过。
- `git diff --check`：通过。
- `codex review --uncommitted`：未发现离散问题；自审过程中复跑了 `lint`、`typecheck`、`build:h5` 和 `git diff --check`，均通过。

## 剩余风险

1. IndexedDB 不可用时只能使用内存 fallback，该 fallback 不承诺跨刷新恢复；这符合当前规范中的降级边界。
2. H5 和微信小程序构建已通过，但微信开发者工具、iPhone Safari、Android/iOS 真机图片缓存和 OCR 读取仍需后续人工验收。
3. 本轮只处理当前未解决 review threads；后续若再次触发 `@codex review`，需要继续按最新线程处理。
