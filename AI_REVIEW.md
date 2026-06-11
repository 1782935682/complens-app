# AI Review - 本地报告历史检索闭环

## 任务目标

补齐本地分析报告的历史检索能力：用户可以在报告列表按关键词查找旧报告，并通过 URL 保留当前检索状态，便于返回、刷新或分享当前本机视图。

## 修改摘要

- `src/pages/reportsPage.js`
  - 报告列表新增“检索历史报告”表单。
  - 支持按报告标题、摘要、原始文本、暂未收录项、解读文案、匹配成分、别名、类别和过敏原类型检索。
  - 检索结果展示当前命中数 / 总报告数。
  - 空结果提供可继续换关键词的提示。
- `src/router/router.js`
  - `/reports?q=...` 读取并保留报告检索关键词。
  - 报告列表标题在检索状态下展示为“关键词 报告检索”。
- `src/main.js`
  - 绑定报告检索表单提交。
  - 空关键词提交会回到当前类别报告列表。
- `src/styles.css`
  - 新增报告检索表单和小屏单列布局样式。
- `src/sw.js`
  - 报告页、路由、入口脚本和样式属于 PWA app shell 预缓存资源，本轮同步提升缓存版本。
- `scripts/test.mjs`
  - 覆盖报告检索路由解析、页面标题、列表命中、空结果和缓存版本断言。
- `COMMANDS.md`
  - 补充本地报告历史检索测试覆盖说明。
- `PROJECT_PLAN.md`
  - 同步报告历史检索、测试覆盖、报告模块进度和最近修改记录。

## 修改文件

- `src/pages/reportsPage.js`
- `src/router/router.js`
- `src/main.js`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run test
npm run lint
npm run validate:data
npm run build
git diff --check
```

## 验证结果

- `npm run test`：通过。
- `npm run lint`：通过。
- `npm run validate:data`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。

## 风险点

- 当前检索只在本机已保存报告中做前端字符串匹配，不是全文索引；大量报告时需要再加索引或分页。
- 检索范围基于当前本地库解析匹配成分；如果本地库改名，旧报告的检索命中可能随当前库变化。
- 该功能不涉及云同步，跨设备报告检索仍依赖后续账号和后端报告能力。

## 本次 git diff 摘要

- 报告列表新增关键词检索入口和空结果状态。
- 路由、标题、事件绑定、样式、PWA 缓存版本和测试同步更新。
- 命令文档、项目计划和审查记录已按本轮闭环更新。
