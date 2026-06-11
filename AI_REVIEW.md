# AI Review - PR #31 Defensive Fixes

## 任务目标

继续修复 PR #31 新增审查反馈：导入报告 ID 不能携带可注入字符；AI 协议 fallback 与报告检索需要兼容旧数据和异常对象边界。

## 修改摘要

- `src/store/userStore.js`
  - 导入 / 读取报告时将 `report.id` 归一化为安全 slug。
  - 含引号、空格、尖括号等不安全字符的报告 ID 会重新生成。
  - 保留 `legacy-report` 这类旧版安全 ID，避免破坏旧报告兼容。
- `src/pages/reportsPage.js`
  - 报告检索构建索引时，对 `matchedIngredientIds`、`highlightIngredientIds`、`ingredientAllergenHits`、`textAllergenHits`、`unknownItems`、`insights` 做数组兜底。
  - 保留按过敏原中文展示名检索的能力，同时避免旧版报告字段缺失时报错。
- `src/services/aiAnalysisService.js`
  - `buildAIAnalysisRequest()` 对本地分析结果的 `ingredients`、`highlights`、`unknownItems` 做兜底。
  - `buildAIAnalysisFallback()` 对缺失或非法 `category` 默认回落到 `food`，避免错误套用化妆品文案。
  - `countRisks()` 接受非数组输入时返回空风险计数。
- `scripts/test.mjs`
  - 覆盖 sparse AI fallback 仍使用食品添加剂边界文案。
  - 覆盖导入恶意报告 ID 后会生成安全 ID，报告列表不会渲染注入属性。
- `PROJECT_PLAN.md`
  - 同步 PR #31 防御性修复记录。

## 修改文件

- `src/store/userStore.js`
- `src/pages/reportsPage.js`
- `src/services/aiAnalysisService.js`
- `scripts/test.mjs`
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

- 不安全报告 ID 会在归一化时被重新生成，因此手工篡改快照中的旧链接不会被保留；这是为了避免属性注入风险。
- 报告检索仍是本机字符串匹配，不是全文索引。
- AI fallback 仍是本地降级结果，不代表真实服务端 AI 输出。

## 本次 git diff 摘要

- 修复导入报告 ID 注入风险。
- 补强 AI fallback 与报告检索对旧数据/异常对象的防御。
- 补充回归测试和项目计划记录。
