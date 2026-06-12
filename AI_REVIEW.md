# AI Review - 2026-06-12 OCR/解析/匹配自动化批次

## 本轮目标

按 `CODEX_TASKS.md` 自动推进所有无需人工介入的任务，跳过人工阻塞项。优先完成：

- Batch O-A：拍照/上传入口与产品质量体验
- Batch O-D：图片预处理服务（EXIF 修正 + 压缩 + IndexedDB）
- Batch O-B：OCR 服务抽象层与模式切换
- Batch O-C：识别文本确认与修正页
- Batch P-A：配料表文本解析增强
- Batch P-B：数据库批量成分匹配

## 本轮完成

1. 首页主入口突出“拍照识别食品配料表”，成分搜索降为辅助入口。
2. 扫描页支持拍照、相册、Web 文件选择降级、图片预览、图片大小/类型校验、重选、拍摄技巧和底部安全区。
3. 新增 `imageProcessor`，支持 JPEG EXIF Orientation 手动解析、canvas 方向修正和压缩；无 canvas 时降级保留原图，不伪造处理结果。
4. 新增 `imageStoreService`，图片和 blob 存入 IndexedDB；IndexedDB 不可用时使用会话内存 fallback。localStorage 只保存图片 id、元数据、确认文本和设置。
5. OCR 服务升级为 v2，提供 real/manual/fallback 三模式。无登录或无 OCR Key 时进入 manual/fallback，不返回伪造 OCR 文本。
6. 后端新增 `POST /api/ocr` 鉴权占位；无 `OCR_API_KEY` 返回 503，供应商未实现返回 501。
7. 新增确认页 `/ocr-confirm`，用户可编辑识别/手输文本、填写产品名、查看配料数量后进入分析。
8. `parseIngredientList` 支持 OCR 噪声修正、配料前缀、复配括号、E-number、顺序、重复标记、未知项保留。
9. 新增 `ingredientMatchService` 和后端 `POST /api/ingredients/batch-search`，支持 E-number、精确、别名和模糊匹配；低置信和未匹配项保留展示。
10. 分析页新增数据库匹配摘要，明确展示 matched / low confidence / unmatched，以及 `unverified / isVerified false` 数据状态。

## 人工阻塞

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台和连接串 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商和服务端 API Key |
| AI API Key | blocked_by_user | 选定 AI 供应商和服务端 API Key |

## 验证结果

```bash
npm install
npm run validate:data
npm run lint
npm run test
npm run build

cd backend
npm install
npm run typecheck
npm test
npm run db:migrate
npm run db:seed
```

全部通过。`db:seed` 结果为 `Seeded 100 ingredients`，仍是本地 seed 数据，不是完整生产数据集。

## 当前风险

1. 真实 OCR 尚未接入；当前只能保证 manual/fallback 主路径和后端安全占位。
2. 100 条食品添加剂 seed 全部仍是 `confidenceLevel: "unverified"`、`isVerified: false`。
3. 批量匹配已可用，但匹配质量仍依赖现有 seed 数据和后续人工审核。
4. R-A 食品配料分析报告页尚未完成，当前分析页只展示基础匹配摘要。
5. 未做浏览器 E2E 和真机相机权限验收。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch R-A：食品配料分析报告页`。
