# AI Review — 2026-06-15 PR #90 additive parsing fix

## 本轮目标

继续处理 PR #90 最新一轮 Codex Review 对提交 `9f0042f87e` 的两条非 outdated inline feedback：

1. `user-uniapp/src/utils/ingredientParser.ts` 没有把 `增味剂（谷氨酸钠）`、`抗结剂（二氧化硅）` 这类添加剂功能包装拆成具体成分，导致后端批量匹配收到 `增味剂 谷氨酸钠` 这样的组合词。
2. `user-uniapp/src/services/api/ingredients.ts` 的添加剂分类判定口径分散，容易漏掉后端返回的 GB 2760 功能类别，影响 `isAdditive`、报告 additiveCount 和分组。

本轮不改 GB2760 数据、不新增数据来源、不伪造成分匹配或 OCR 结果。

## 已检查文件

- `CODEX_TASKS.md`
- `DATA_SOURCES.md`
- `user-uniapp/src/utils/ingredientParser.ts`
- `user-uniapp/src/services/api/ingredients.ts`
- `user-uniapp/src/utils/reportBuilder.ts`
- `user-uniapp/src/types/index.ts`
- `src/data/foodAdditives.js`
- `src/data/gb2760OfficialReferenceTables.js`

## 已完成修复

1. 新增 `user-uniapp/src/constants/additiveFunctions.ts`，集中维护 GB 2760 附录 D 功能类别和兼容历史 seed 的 category 别名。
2. `ingredientParser` 改为通过共享 `isAdditiveWrapperLabel()` 判断括号父级，支持 `增味剂（谷氨酸钠）`、`抗结剂（二氧化硅）` 等纯包装标签拆分为具体配料。
3. 根据本地 review 反馈，解析侧只对“纯 wrapper 标签”或“安全修饰词 + wrapper 标签”触发拆分，支持 `复配甜味剂（赤藓糖醇、三氯蔗糖）`、`天然色素（胭脂树橙）`，同时避免 `着色剂胭脂红（以胭脂红计）`、`增稠剂黄原胶（又名汉生胶）` 这类真实成分名被误丢弃。
4. `ingredients` API mapper 改为通过共享 `hasAdditiveFunctionLabel()` 判定后端 category，避免 `增味剂`、`抗结剂`、`稳定剂和凝固剂`、`香料类`、`食品添加剂`、`添加剂` 等有效添加剂功能类别漏标；`其他` 作为 GB 2760 附录 D 功能类别仅按 exact category/wrapper 支持。

## 验证结果

- `cd user-uniapp && npm run lint`：通过。
- `cd user-uniapp && npm run typecheck`：通过。
- `cd user-uniapp && npm run build:h5`：通过。
- `cd user-uniapp && npm run build:mp-weixin`：通过。
- `git diff --check`：通过。
- 临时 bundled smoke check：通过，确认 `增味剂（谷氨酸钠）` / `抗结剂（二氧化硅）` / `其他（三聚磷酸钠）` / `复配甜味剂（赤藓糖醇、三氯蔗糖）` / `天然色素（胭脂树橙）` 被拆成具体成分，`着色剂胭脂红（以胭脂红计）` / `增稠剂黄原胶（又名汉生胶）` 不被误拆，并且 `增味剂` / `抗结剂` / `稳定剂和凝固剂` / `食品用香料` / `香料类` / `保湿剂` / `食品添加剂` / `添加剂` / `其他` 会被识别为添加剂 category。

## 剩余风险

1. 本轮覆盖的是解析和前端匹配标记口径；真实后端返回 category 的完整端到端表现仍建议在浏览器或小程序联调时走查。
2. `user-uniapp` 当前仍没有正式单元测试框架，本轮用 typecheck、双端构建和临时 bundled smoke check 覆盖关键行为。
