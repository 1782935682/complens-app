# AI Review - 2026-06-12 Data Foundation Layer

## 本轮目标

本轮目标不是一次性补齐所有食品配料，而是建立可用的基础权威数据底座：

- 不让 AI 编造食品成分数据、法规来源、ADI、限量或安全结论。
- 不把 JECFA 数据当成 GB 2760 中国法规使用范围。
- 不强行补齐全部食品配料。
- 建立 `verified_regulation` / `verified_jecfa` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 分层。

## 本轮完成

1. 数据模型新增或贯穿以下字段：`dataStatus`、`matchConfidence`、`sourceScope`、`sourceName`、`sourceVersion`、`sourceUrl`、`regulatoryBasis`、`rawSourceText`、`lastReviewedAt`、`reviewNote`、`isVerified`。
2. 食品基础库当前 112 条：
   - `verified_regulation`: 0 条
   - `verified_jecfa`: 32 条
   - `mapped_candidate`: 0 条静态数据；运行时低置信匹配会显示为候选
   - `common_ingredient`: 12 条
   - `unverified`: 68 条
   - `unknown_from_ocr`: 0 条静态数据；OCR 未匹配时运行时记录
3. JECFA 32 条只标记为 `sourceScope: 'jecfa_safety_evaluation'`，不写入 GB 2760 使用范围或限量。
4. 常见普通食品配料新增为独立词库，仅用于分析覆盖和过敏原提示，不作为法规或安全评价来源。
5. 分析报告、报告详情和导出展示已匹配数量、待确认数量、暂未收录数量、每个配料的数据状态、数据来源和低置信度提示。
6. 后端 `ingredients` schema、seed、列表 API 增加数据状态字段和 `dataStatus` 筛选。
7. 数据治理页新增“人工校验队列”，汇总本机 OCR 未收录项、低置信候选和静态未验证数据，并通过数据纠错表单提交校验线索。
8. `DATA_SOURCES.md`、`PROJECT_PLAN.md`、`CODEX_TASKS.md` 已同步新口径：基础权威库 + 持续扩充 + 人工校验队列。

## 已验证与未验证

| 范围 | 当前状态 | 说明 |
|---|---:|---|
| GB 2760 官方法规依据 | 0 条已验证 | 尚未导入条款级官方法规依据；不得展示为 GB 2760 已验证 |
| JECFA 安全评价 | 32 条已匹配 | 可作为安全评价来源；不得当作中国使用限制 |
| 常见普通配料 | 12 条词库命中 | 来自项目样例标签词库；不是法规来源 |
| 未验证食品添加剂 | 68 条 | 保留 seed reference 和来源线索，等待人工核验 |
| OCR 未匹配 | 运行时记录 | 不直接写入权威库，后续进入人工校验队列 |

全部食品记录当前仍为 `isVerified: false`。

## 明确不做的事

- 不新增 AI 生成的食品成分、法规结论、限量或来源链接。
- 不把 JECFA ADI 或安全评价写成 GB 2760 允许使用范围。
- 不为无法可靠结构化的法规文本编造食品类别、最大使用量或条款编号。
- 不把 common ingredient 词库展示为官方法规数据。
- 不承诺一次性补齐全部食品配料。

## 需要后续人工确认

| 阻塞项 | 需要确认 |
|---|---|
| GB 2760 官方文件 | 标准版本、条款编号、食品类别、最大使用量、原文片段 |
| 分组/拆分规则 | 焦糖色、糖精类、胡萝卜素、苹果酸、Nisin 等是否拆分 |
| 未验证 68 条添加剂 | 是否可匹配 JECFA、GB 2760 或其他官方依据 |
| OCR 未匹配队列 | 是否为普通配料、添加剂、错字、噪声或需新增条目 |
| 普通配料词库扩展 | 来源词表、标签样本、过敏原标注和命名规范 |

## 本轮新增队列边界

- `unknown_from_ocr` 只来自运行时 OCR 来源报告的未匹配条目，不写入静态权威库。
- 人工校验队列是只读入口：可以聚合 OCR 未收录、低置信候选和静态未验证数据，但不能自动升级为 `verified_regulation` 或 `isVerified: true`。
- 任何升级仍需要人工补充官方来源、原文片段、条款编号、适用范围或拆分/归并说明。

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
cd backend && npm run db:generate
cd backend && npm run db:migrate
cd backend && npm run db:seed -- --version food-authority-foundation-v1 --reviewed-by codex --change-note "foundation data status layer"
```

以上已通过。`npm run validate:data` 输出：112 条食品记录；`verified_regulation=0`、`verified_jecfa=32`、`common_ingredient=12`、`unverified=68`、`unknown_from_ocr=0`、`missingSourceFields=0`、`missingUsageLimits=100`。`db:generate` 结果为 no schema changes，`db:migrate` applied successfully，seed 写入 112 条。
