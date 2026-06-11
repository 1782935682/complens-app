# AI Review - Search Spelling Assist

## 任务目标

新增搜索拼音与纠错辅助闭环，让用户在食品添加剂或化妆品成分搜索中输入拼音、首字母、常见误写或轻微错字时，仍能得到可点击的候选成分和可验证的搜索结果。

## 修改摘要

- 新增 `src/data/searchAliases.js`，维护食品添加剂和化妆品常见成分的拼音、首字母和常见写法辅助索引。
- 搜索服务接入辅助索引，`searchIngredients()` 和 `getSearchSuggestions()` 支持拼音、首字母、常见误写和近似匹配。
- 搜索页在辅助命中时展示“可能相关”候选，候选可直接进入详情页。
- 补充搜索辅助区域和移动端布局样式。
- PWA shell 缓存版本升到 `compcheck-shell-v12`，并预缓存搜索辅助索引。
- 补充拼音、首字母、常见误写、近似匹配、页面渲染和 service worker 缓存测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/data/searchAliases.js`
- `src/services/ingredientService.js`
- `src/pages/searchPage.js`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，50 条食品添加剂记录校验成功。
- `npm run lint` 通过。
- `npm run test` 通过。
- `npm run build` 通过，构建产物输出到 `dist/`。
- `git diff --check` 通过。
- `curl -I http://127.0.0.1:5179/`、`/main.js`、`/pages/searchPage.js`、`/services/ingredientService.js`、`/data/searchAliases.js` 和 `/sw.js` 均返回 HTTP 200。

## 风险点

- 当前拼音索引是本地维护的 MVP 辅助索引，不是完整中文分词或全量拼音库；后续大规模数据接入时需要生成式索引或离线构建脚本。
- 近似匹配只允许短距离编辑差异，避免过度召回；真实搜索日志上线前仍需根据用户输入校准阈值。
- 搜索结果仍基于草稿数据集，辅助命中不代表数据已完成正式审核。

## 本次 git diff 摘要

- 新增搜索辅助索引数据模型。
- 搜索服务增加拼音、首字母、常见误写和近似匹配。
- 搜索页展示辅助候选并补充移动端样式。
- 更新 PWA 预缓存版本与测试覆盖。
