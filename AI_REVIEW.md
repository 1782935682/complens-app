# AI Review - PR #31 Review Fixes

## 任务目标

修复 PR #31 自动审查指出的两个问题：清空本机数据不应静默重新开启搜索历史记录；报告历史检索应能按 UI 展示的过敏原中文名称命中。

## 修改摘要

- `src/store/userStore.js`
  - `clearLocalUserData()` 不再写入 `historyRecordingEnabled=true`。
  - 用户已关闭搜索历史记录时，清空本机数据后仍保持关闭状态。
- `src/main.js`
  - 清空本机数据后按当前偏好同步设置页开关，而不是固定设置为开启。
- `src/pages/reportsPage.js`
  - 报告检索索引加入 `ingredientAllergenHits` 和 `textAllergenHits` 的过敏原 id。
  - 报告检索索引加入 `formatAllergenNames(getAllergensByIds(...))` 生成的中文展示名。
  - 匹配成分自身的 `allergenTypes` 也加入中文展示名，保证检索行为和 UI 文案一致。
- `scripts/test.mjs`
  - 覆盖关闭搜索历史后清空本机数据仍不记录新搜索。
  - 覆盖按“乳及乳制品”检索报告时能命中含牛奶过敏原的报告。
- `PROJECT_PLAN.md`
  - 同步 PR #31 修复记录。

## 修改文件

- `src/store/userStore.js`
- `src/main.js`
- `src/pages/reportsPage.js`
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

- 报告检索仍是前端字符串匹配，不是索引服务；大量报告时仍需后续分页或索引优化。
- 清空本机数据现在保留搜索历史记录偏好，这是隐私偏好的预期行为；如果未来要提供“恢复所有默认设置”，应做单独入口。

## 本次 git diff 摘要

- 修复清空数据导致隐私偏好被重置的问题。
- 修复报告历史检索不能按可见过敏原中文名称命中的问题。
- 补充回归测试和项目计划记录。
