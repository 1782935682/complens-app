# AI Review — 2026-06-18

## 食品成分官方材料管线加固

### 本轮范围

本轮只处理 `docs/source-materials/` 官方材料管线的错误隔离和回归测试。未修改小程序页面、现有查询 API、数据库 schema、导入数据计数、生产配置或用户端业务行为。

### 代码审查结论

- PR #116 已合并到 `main`，食品成分知识库扩展层已经落地。
- 合并后的 `buildPipelineSnapshot({ extract: true })` 已具备逐来源处理和 `extract-failures.json` 输出，但抽取失败和解析失败原先共用同一 catch 分支，后续排查会把解析问题误归因为 `pdftotext`。
- `pdftotext` 执行失败时原始异常信息偏底层，不利于人工补依赖或判断是否应使用已复核缓存文本。
- 数据准入边界保持不变：失败来源不能进入正式 verified 层，其他来源可继续解析并保留 `pending_review`。

### 已完成

- `backend/scripts/ingredient-official-data-pipeline.ts`
  - 将官方材料处理拆成抽取阶段和解析阶段两个失败分支。
  - 抽取失败标记 `parse_status=failed_extract`，失败记录 `stage=extract`。
  - 解析失败标记 `parse_status=failed_parse`，失败记录 `stage=parse`。
  - `pdftotext` 缺失时输出“安装 poppler-utils 或提供已复核缓存文本”的可执行说明。
  - `pdftotext` 处理损坏 PDF 失败时保留具体本地文件路径和首行错误。
- `backend/tests/ingredientKnowledge.test.ts`
  - 新增损坏 PDF 回归测试，确认单个文件抽取失败会写入 `snapshot.failed`，不会中断其他官方材料 staging 抽取。

### 数据边界

- 本轮没有新增、删除或提升任何成分数据。
- `ingredient_master=3041`、`ingredient_import_staging=462`、`nutrition_reference_values=32` 等 DB 口径未变化。
- 失败分层只影响后续 pipeline 报告和排查语义，不把 `pending_review` 改为 verified。

### 验证

已通过：

- `npm --prefix backend test -- tests/ingredientKnowledge.test.ts`：12 tests passed。
- `npm --prefix backend run typecheck`
- `npm run lint`
- `npm run ingredient:validate -- --no-db`
- `npm run ingredient:validate`
- `git diff --check`

未运行完整前端 build/test：本轮未触达前端页面、路由、构建入口或用户端业务逻辑。
