# AI Review — 2026-06-15 PR #90 H5 image persistence fix

## 本轮目标

继续处理 PR #90 最新一轮 Codex Review 未解决 inline feedback。当前 GitHub Actions checks 全绿，最新非 outdated 未解决线程集中在 `user-uniapp/src/stores/scanStore.ts`：

1. H5 普通上传保留了 `File` 和 `blob:` 临时路径，但持久化草稿时直接丢弃 `file`。
2. 刷新或 WebView 进程恢复后，草稿只剩过期 `blob:` URL，OCR 无法读取原图并降级到手动输入。
3. 按仓库规范，H5/PWA 图片必须进入 `compcheck-images` / `scan-images` IndexedDB，uni storage 只保存元数据。

本轮不改生产部署、不改后端、不改 GB2760 数据、不伪造 OCR 或数据来源。

## 已检查文件

- `CODEX_TASKS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/PRIVACY_AND_COMPLIANCE_SPEC.md`
- `user-uniapp/src/platform/imageStore.ts`
- `user-uniapp/src/stores/scanStore.ts`
- `user-uniapp/src/platform/file.ts`
- `user-uniapp/src/platform/camera.ts`
- `user-uniapp/src/pages/capture/index.vue`
- `user-uniapp/src/services/api/ocr.ts`
- `user-uniapp/src/types/index.ts`

## 已完成修复

1. `imageStore` 新增 H5 `File` / `Blob` 保存路径，复用现有 `compcheck-images` / `scan-images` IndexedDB 和内存 fallback。
2. `scanStore` 持久化草稿时先把 H5 `File` 存入图片存储，再从 uni storage 草稿中移除 `file` 和可过期 `blob:` 路径，只保留图片 id、名称、mime、大小等元数据。
3. 保留原 `data:image` 路径的 IndexedDB 保存逻辑，继续避免 base64 图片写入本地小型存储。
4. 现有 `readImageAsBase64` 继续通过图片 id 从 `imageStore` 读取，刷新后的 OCR 恢复路径不依赖 stale blob URL。

## 验证结果

- `cd user-uniapp && npm run lint`：通过。
- `cd user-uniapp && npm run typecheck`：通过。
- `cd user-uniapp && npm run build:h5`：通过。
- `cd user-uniapp && npm run build:mp-weixin`：通过。
- `git diff --check`：通过。
- `codex review --uncommitted`：通过；未发现离散 correctness 问题，并确认本轮改动避免将临时 file/blob 数据写入 uni storage。

## 剩余风险

1. H5 IndexedDB 写入可由本地构建和类型检查覆盖到接口层，真实浏览器刷新恢复仍建议人工走查。
2. 微信小程序和 App 图片缓存策略仍需后续真机验收；本轮只修 H5 `File`/`Blob` 持久化路径。
