# AI Review — 2026-06-15 PR #90 latest review fix

## 本轮目标

继续处理 PR #90 最新一轮 Codex Review 未解决 inline feedback。GitHub Actions checks 已确认全绿，剩余问题集中在 `user-uniapp/` OCR 主路径：

1. 文本确认页编辑 OCR 文本后，不应丢失 mock OCR provider/mode 来源标记。
2. 标签类型页选择“重新拍”时，必须清空旧扫描草稿，避免 tab 保活后复用旧图片。

本轮不改生产部署、不改后端、不改 GB2760 数据、不伪造 OCR 或数据来源。

## 已检查文件

- `CODEX_TASKS.md`
- `DATA_SOURCES.md`
- `docs/product-blueprint/FRONTEND_SPEC.md`
- `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`
- `docs/product-blueprint/DATA_TRUST_SPEC.md`
- `docs/product-blueprint/QA_ACCEPTANCE_SPEC.md`
- `user-uniapp/src/pages/confirm-text/index.vue`
- `user-uniapp/src/pages/label-type/index.vue`
- `user-uniapp/src/pages/capture/index.vue`
- `user-uniapp/src/stores/scanStore.ts`
- `user-uniapp/src/utils/reportBuilder.ts`

## 已完成修复

1. `confirm-text` 保存用户修正后的确认文本时，继续保留原 OCR 结果的 provider/mode provenance，使 mock OCR 报告仍能展示 `mock only OCR` 来源说明。
2. `confirm-text` 的“重新上传”入口先调用 `resetScanDraft()`，再切回拍照页，避免旧草稿继续影响下一次扫描。
3. `label-type` 选择 `unknown_label` 重新拍摄时复用相同的 reset 路径，清空当前扫描草稿。
4. `capture` 页面在 `onShow` 时从草稿重新同步图片引用；当其他页面已清空草稿后，保活的 tab 页面不会继续显示或提交旧图片。

## 验证结果

- `cd user-uniapp && npm run lint`：通过。
- `cd user-uniapp && npm run typecheck`：通过。
- `cd user-uniapp && npm run build:h5`：通过。
- `cd user-uniapp && npm run build:mp-weixin`：通过。
- `git diff --check`：通过。
- `codex review --uncommitted`：第一轮指出 H5 预览被持久化元数据覆盖、`ocr.text` 未同步两处回归风险；已修复后重跑，未发现离散 correctness 问题。

## 剩余风险

1. H5、微信小程序和 App 的拍照/相册真机行为仍需后续人工验收。
2. 本轮只处理当前未解决 review threads；后续若再次触发 `@codex review`，需要继续按最新线程处理。
